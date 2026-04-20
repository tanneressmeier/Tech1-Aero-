// =============================================================================
// utils/profitabilityEngine.ts
// Real-time labor-to-revenue ratio and burdened cost calculator.
// Computes live metrics per WorkOrder/RepairOrder with zero API calls.
// =============================================================================

import { WorkOrder, RepairOrder, InventoryItem, Technician, AppSettings } from '../types.ts';

export interface ProfitabilityMetrics {
    /** Total labor hours originally quoted to customer */
    quotedHours:        number;
    /** Actual hours clocked against all squawks */
    actualHours:        number;
    /** Burdened labor rate used ($/hr, includes benefits + overhead) */
    burdenedRate:       number;
    /** Fully-loaded labor cost to date ($) */
    actualLaborCost:    number;
    /** What that labor would sell for at the quoted price */
    quotedLaborRevenue: number;
    /** Cost of parts consumed to date */
    actualPartsCost:    number;
    /** Quoted parts revenue (falls back to actual if not quoted) */
    quotedPartsRevenue: number;
    /** Weighted completion % across all squawks */
    completionPercent:  number;
    /** Hours utilization: actualHours / quotedHours */
    burnRate:           number;
    /** TRUE when burn rate outpaces completion by > 10 % — scope creep alert */
    isOverBurning:      boolean;
    /** Current projected margin at completion */
    projectedMargin:    number;
    /** Projected margin as percentage of revenue */
    projectedMarginPct: number;
    /** Status classification for UI */
    status: 'healthy' | 'warning' | 'critical' | 'complete';
    /** Human-readable reason for the status classification */
    statusReason:       string;
}

/**
 * Compute the burdened labor rate.
 * burdenedRate = baseLaborRate × (1 + benefitsLoad/100) + hangarOverhead
 */
export function calculateBurdenedRate(
    settings: AppSettings,
    orderOverride?: number
): number {
    if (typeof orderOverride === 'number' && orderOverride > 0) return orderOverride;
    const base      = settings.financials.laborRate;
    const benefits  = settings.financials.benefitsLoad ?? 0;
    const overhead  = settings.financials.hangarOverhead ?? 0;
    return base * (1 + benefits / 100) + overhead;
}

/**
 * Convert a time_logs entry to elapsed hours (handles open logs as 0).
 */
function logHours(log: { start_time: string; end_time?: string }): number {
    if (!log.end_time) return 0;
    return (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 3_600_000;
}

/**
 * Compute live profitability metrics for a single order.
 */
export function computeProfitability(
    order: WorkOrder | RepairOrder,
    inventory: InventoryItem[],
    settings: AppSettings
): ProfitabilityMetrics {
    const squawks = order.squawks;

    // ── Hours ────────────────────────────────────────────────────────────
    const quotedHours =
        order.quoted_labor_hours ??
        squawks.reduce((s, sq) => s + (sq.hours_estimate ?? 0), 0);

    const actualHours = squawks.reduce(
        (s, sq) => s + sq.time_logs.reduce((ls, log) => ls + logHours(log), 0),
        0
    );

    // ── Rates & labor cost ───────────────────────────────────────────────
    const burdenedRate       = calculateBurdenedRate(settings, order.burdened_labor_rate);
    const actualLaborCost    = actualHours * burdenedRate;
    const quotedLaborRevenue = quotedHours * settings.financials.laborRate;

    // ── Parts ────────────────────────────────────────────────────────────
    const partCosts = squawks.flatMap(sq =>
        sq.used_parts.map(up => {
            const item = inventory.find(p => p.id === up.inventory_item_id);
            const unit = item?.suppliers[0]?.cost ?? 0;
            return unit * up.quantity_used;
        })
    );
    const actualPartsCost    = partCosts.reduce((s, n) => s + n, 0);
    const quotedPartsRevenue = order.quoted_parts_total ?? actualPartsCost;

    // ── Completion % (weighted by estimated hours) ───────────────────────
    const totalEstHours = squawks.reduce((s, sq) => s + (sq.hours_estimate ?? 0), 0);
    const weightedPct   = totalEstHours > 0
        ? squawks.reduce((s, sq) => {
              const w = (sq.hours_estimate ?? 0) / totalEstHours;
              const pct = sq.status === 'completed'
                  ? 100
                  : (sq.completion_percentage ?? 0);
              return s + w * pct;
          }, 0)
        : 0;

    const completionPercent = Math.round(weightedPct);

    // ── Burn rate & over-burn detection ──────────────────────────────────
    const burnRate = quotedHours > 0 ? actualHours / quotedHours : 0;
    // "Over-burning" = labor burn rate outpaces completion rate by > 10 %
    const completionRatio = completionPercent / 100;
    const isOverBurning = completionRatio > 0 &&
                          burnRate > completionRatio * 1.1 &&
                          completionPercent < 100;

    // ── Projected final numbers ──────────────────────────────────────────
    // Project actual hours to completion using current burn-rate-per-percent
    const projectedFinalHours = completionPercent > 0 && completionPercent < 100
        ? actualHours / (completionPercent / 100)
        : Math.max(actualHours, quotedHours);

    const projectedLaborCost = projectedFinalHours * burdenedRate;
    const projectedRevenue   = quotedLaborRevenue + quotedPartsRevenue;
    const projectedMargin    = projectedRevenue - projectedLaborCost - actualPartsCost;
    const projectedMarginPct = projectedRevenue > 0 ? (projectedMargin / projectedRevenue) * 100 : 0;

    // ── Status classification ────────────────────────────────────────────
    let status: ProfitabilityMetrics['status'] = 'healthy';
    let statusReason = 'On budget';

    if (order.status === 'Completed' || completionPercent === 100) {
        status = 'complete';
        statusReason = `Closed — final margin ${projectedMarginPct.toFixed(1)}%`;
    } else if (projectedMarginPct < 0) {
        status = 'critical';
        statusReason = 'Projected loss — immediate review required';
    } else if (isOverBurning) {
        status = 'critical';
        const hoursOver = actualHours - completionRatio * quotedHours;
        statusReason = `Scope creep: ${hoursOver.toFixed(1)}h ahead of completion`;
    } else if (burnRate > 0.9 && completionPercent < 90) {
        status = 'warning';
        statusReason = `${Math.round(burnRate * 100)}% of quoted hours used, ${completionPercent}% complete`;
    } else if (projectedMarginPct < 10) {
        status = 'warning';
        statusReason = `Thin margin projected: ${projectedMarginPct.toFixed(1)}%`;
    } else {
        statusReason = `${completionPercent}% complete, ${(burnRate * 100).toFixed(0)}% of hours used`;
    }

    return {
        quotedHours, actualHours, burdenedRate,
        actualLaborCost, quotedLaborRevenue,
        actualPartsCost, quotedPartsRevenue,
        completionPercent, burnRate, isOverBurning,
        projectedMargin, projectedMarginPct,
        status, statusReason,
    };
}

/**
 * Format currency for display.
 */
export function fmtUsd(n: number): string {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

/**
 * Format currency with cents for detail views.
 */
export function fmtUsdCents(n: number): string {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
