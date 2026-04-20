// =============================================================================
// utils/ganttEngine.ts
// Dependency-aware, parts-integrated Gantt scheduling engine.
//
// Algorithm:
//   1. Topological sort squawks by their dependency graph.
//   2. For each squawk, start = max(finish of all dependencies, earliest parts
//      availability date derived from backorder expected_delivery_dates).
//   3. Return per-squawk schedule with shift reasons for UI badges.
// =============================================================================

import { Squawk, WorkOrder, InventoryItem } from '../types.ts';

export interface ScheduledSquawk {
    squawk:          Squawk;
    startHour:       number;   // hours offset from WO start (day 0, 08:00)
    durationHours:   number;
    endHour:         number;
    isShifted:       boolean;  // true if parts delay pushed this task
    shiftReasonParts: ShiftReason[];
    isDependencyBlocked: boolean; // waiting on an unfinished predecessor
}

export interface ShiftReason {
    partDescription: string;
    partNo:          string;
    expectedDate:    string;   // ISO date
    delayDays:       number;
}

/**
 * Convert a calendar date to an hour offset from the WO start date (08:00).
 * Returns the number of 8-hour working days × 8 hours.
 */
function dateToWorkingHours(woStartDate: string, targetDate: string): number {
    const start  = new Date(woStartDate + 'T08:00:00');
    const target = new Date(targetDate  + 'T08:00:00');
    const msPerDay   = 86_400_000;
    const calDays    = Math.max(0, Math.ceil((target.getTime() - start.getTime()) / msPerDay));
    // Treat weekends as non-working (skip Sat/Sun)
    let workingDays = 0;
    const cursor = new Date(start);
    for (let d = 0; d < calDays; d++) {
        cursor.setDate(cursor.getDate() + 1);
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) workingDays++;
    }
    return workingDays * 8;
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns squawk IDs in dependency order. Cycles are broken by original order.
 */
function topoSort(squawks: Squawk[]): string[] {
    const idSet  = new Set(squawks.map(s => s.squawk_id));
    const inDeg  = new Map<string, number>();
    const adj    = new Map<string, string[]>();

    squawks.forEach(s => {
        inDeg.set(s.squawk_id, 0);
        adj.set(s.squawk_id, []);
    });

    squawks.forEach(s => {
        (s.dependencies ?? []).forEach(dep => {
            if (!idSet.has(dep)) return; // ignore refs to squawks not in this WO
            adj.get(dep)!.push(s.squawk_id);
            inDeg.set(s.squawk_id, (inDeg.get(s.squawk_id) ?? 0) + 1);
        });
    });

    const queue  = squawks.filter(s => (inDeg.get(s.squawk_id) ?? 0) === 0).map(s => s.squawk_id);
    const result: string[] = [];

    while (queue.length) {
        const id = queue.shift()!;
        result.push(id);
        (adj.get(id) ?? []).forEach(next => {
            const deg = (inDeg.get(next) ?? 1) - 1;
            inDeg.set(next, deg);
            if (deg === 0) queue.push(next);
        });
    }

    // Append any remaining (cycle members) in original order
    squawks.forEach(s => {
        if (!result.includes(s.squawk_id)) result.push(s.squawk_id);
    });

    return result;
}

/**
 * Compute the full schedule for a WorkOrder.
 */
export function computeGanttSchedule(
    order: WorkOrder,
    inventory: InventoryItem[]
): ScheduledSquawk[] {
    const { squawks, scheduled_date } = order;
    if (!squawks.length) return [];

    const invMap = new Map(inventory.map(i => [i.id, i]));
    const sorted = topoSort(squawks);
    const squawkMap = new Map(squawks.map(s => [s.squawk_id, s]));

    // finish[id] = endHour of that squawk (once computed)
    const finish = new Map<string, number>();
    const result: ScheduledSquawk[] = [];

    for (const id of sorted) {
        const sq = squawkMap.get(id)!;
        const duration = Math.max(sq.hours_estimate ?? 1, 0.5);

        // ── Earliest start from dependencies ──────────────────────────────
        let earliestStart = 0;
        let isDependencyBlocked = false;
        for (const depId of sq.dependencies ?? []) {
            const depFinish = finish.get(depId);
            if (depFinish !== undefined && depFinish > earliestStart) {
                earliestStart = depFinish;
            }
            // If dep squawk is not completed, flag blocked
            const depSq = squawkMap.get(depId);
            if (depSq && depSq.status !== 'completed') isDependencyBlocked = true;
        }

        // ── Parts availability check ──────────────────────────────────────
        const shiftReasonParts: ShiftReason[] = [];
        let partsStartHour = 0;

        for (const usedPart of sq.used_parts) {
            const item = invMap.get(usedPart.inventory_item_id);
            if (!item) continue;

            const available = item.qty_on_hand - item.qty_reserved;
            if (available >= usedPart.quantity_used) continue; // enough stock

            // Not enough stock — check expected delivery
            if (item.expected_delivery_date) {
                const deliveryHour = dateToWorkingHours(scheduled_date, item.expected_delivery_date);
                if (deliveryHour > partsStartHour) {
                    partsStartHour = deliveryHour;
                    const calStart  = new Date(scheduled_date + 'T08:00:00');
                    const calTarget = new Date(item.expected_delivery_date + 'T08:00:00');
                    const delayDays = Math.ceil((calTarget.getTime() - calStart.getTime()) / 86_400_000);
                    shiftReasonParts.push({
                        partDescription: item.description,
                        partNo:          item.part_no,
                        expectedDate:    item.expected_delivery_date,
                        delayDays,
                    });
                }
            } else {
                // Out of stock with no ETA — use procurement_lead_time
                const leadHours = (item.procurement_lead_time ?? 14) * 8;
                if (leadHours > partsStartHour) {
                    partsStartHour = leadHours;
                    const eta = new Date(scheduled_date + 'T08:00:00');
                    eta.setDate(eta.getDate() + (item.procurement_lead_time ?? 14));
                    shiftReasonParts.push({
                        partDescription: item.description,
                        partNo:          item.part_no,
                        expectedDate:    eta.toISOString().split('T')[0],
                        delayDays:       item.procurement_lead_time ?? 14,
                    });
                }
            }
        }

        const startHour   = Math.max(earliestStart, partsStartHour);
        const endHour     = startHour + duration;
        const isShifted   = partsStartHour > earliestStart;

        finish.set(id, endHour);

        result.push({
            squawk: sq,
            startHour,
            durationHours: duration,
            endHour,
            isShifted,
            shiftReasonParts,
            isDependencyBlocked,
        });
    }

    // Return in original squawk order for stable row rendering
    return squawks.map(sq => result.find(r => r.squawk.squawk_id === sq.squawk_id)!);
}

/**
 * Compute overall WO % completion weighted by hours.
 */
export function computeWoCompletion(order: WorkOrder): number {
    const squawks = order.squawks;
    const totalHours = squawks.reduce((s, sq) => s + (sq.hours_estimate ?? 0), 0);
    if (totalHours === 0) return 0;

    const weightedPct = squawks.reduce((s, sq) => {
        const w   = (sq.hours_estimate ?? 0) / totalHours;
        const pct = sq.status === 'completed' ? 100 : (sq.completion_percentage ?? 0);
        return s + w * pct;
    }, 0);

    return Math.round(weightedPct);
}

/**
 * Compute projected end date of the work order from the gantt schedule.
 * Returns an ISO date string.
 */
export function computeProjectedEndDate(
    order: WorkOrder,
    schedule: ScheduledSquawk[]
): string {
    const maxEndHour = schedule.reduce((m, s) => Math.max(m, s.endHour), 0);
    const workDays   = Math.ceil(maxEndHour / 8);
    const start      = new Date(order.scheduled_date + 'T08:00:00');
    let   added      = 0;
    const cursor     = new Date(start);
    while (added < workDays) {
        cursor.setDate(cursor.getDate() + 1);
        if (cursor.getDay() !== 0 && cursor.getDay() !== 6) added++;
    }
    return cursor.toISOString().split('T')[0];
}
