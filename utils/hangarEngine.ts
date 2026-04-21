// =============================================================================
// utils/hangarEngine.ts
// 2D hangar bay management engine — pure geometry, zero API calls.
//
// Responsibilities:
//   1. Resolve aircraft dimensions (explicit fields or lookup table fallback)
//   2. Height-gate check — blocks aircraft whose tail exceeds door height
//   3. Footprint conflict detection — rectangle intersection with safety buffer
//   4. Floor utilisation calculation
// =============================================================================

import { Aircraft, HangarConfig } from '../types.ts';
import { AircraftDimensions, lookupDimensions } from '../data/aircraftDimensions.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ResolvedDimensions extends AircraftDimensions {
    source: 'explicit' | 'lookup' | 'default';
}

export interface HangarPlacement {
    aircraft:   Aircraft;
    workOrderId:string;
    tail:       string;
    x_ft:       number;   // centre of aircraft from left wall
    y_ft:       number;   // centre of aircraft from door (0 = at door, + = deeper in)
    dims:       ResolvedDimensions;
}

export interface HeightGateResult {
    allowed:      boolean;
    aircraft_height_ft: number;
    door_height_ft:     number;
    clearance_ft:       number;   // positive = clears, negative = blocked
    reason:       string;
}

export interface FootprintConflict {
    a:            HangarPlacement;
    b:            HangarPlacement;
    overlapType:  'wingtip' | 'nose_tail' | 'full';
    penetration_ft: number;   // how far inside the safety buffer
    detail:       string;
}

// ── Dimension resolver ────────────────────────────────────────────────────────

const DEFAULT_DIMS: AircraftDimensions = {
    wingspan_ft:    50,
    length_ft:      45,
    tail_height_ft: 15,
};

export function resolveAircraftDimensions(aircraft: Aircraft): ResolvedDimensions {
    if (aircraft.wingspan_ft && aircraft.length_ft && aircraft.tail_height_ft) {
        return {
            wingspan_ft:    aircraft.wingspan_ft,
            length_ft:      aircraft.length_ft,
            tail_height_ft: aircraft.tail_height_ft,
            source: 'explicit',
        };
    }
    const looked = lookupDimensions(aircraft.make, aircraft.model);
    if (looked) {
        return { ...looked, source: 'lookup' };
    }
    return { ...DEFAULT_DIMS, source: 'default' };
}

// ── Height gate ───────────────────────────────────────────────────────────────

export function checkHeightGate(aircraft: Aircraft, hangar: HangarConfig): HeightGateResult {
    const dims = resolveAircraftDimensions(aircraft);
    const clearance = hangar.door_height_ft - dims.tail_height_ft;
    const allowed   = clearance >= 0;
    return {
        allowed,
        aircraft_height_ft: dims.tail_height_ft,
        door_height_ft:     hangar.door_height_ft,
        clearance_ft:       clearance,
        reason: allowed
            ? `Clears door by ${clearance.toFixed(1)}ft (tail ${dims.tail_height_ft}ft, door ${hangar.door_height_ft}ft)`
            : `BLOCKED — tail height ${dims.tail_height_ft}ft exceeds ${hangar.door_height_ft}ft door by ${Math.abs(clearance).toFixed(1)}ft`,
    };
}

// ── Footprint conflict detection ──────────────────────────────────────────────

/**
 * Rectangle intersection test.
 * Each aircraft occupies a rectangle centred at (x, y) with
 * half-widths (wingspan/2 + buffer) and half-depths (length/2 + buffer).
 */
function getAABB(p: HangarPlacement, bufferFt: number) {
    return {
        left:   p.x_ft - p.dims.wingspan_ft / 2 - bufferFt,
        right:  p.x_ft + p.dims.wingspan_ft / 2 + bufferFt,
        top:    p.y_ft - p.dims.length_ft    / 2 - bufferFt,
        bottom: p.y_ft + p.dims.length_ft    / 2 + bufferFt,
    };
}

export function detectConflicts(
    placements: HangarPlacement[],
    safetyBufferFt = 5
): FootprintConflict[] {
    const conflicts: FootprintConflict[] = [];

    for (let i = 0; i < placements.length; i++) {
        for (let j = i + 1; j < placements.length; j++) {
            const a = placements[i];
            const b = placements[j];
            const boxA = getAABB(a, safetyBufferFt);
            const boxB = getAABB(b, safetyBufferFt);

            const overlapX = Math.min(boxA.right, boxB.right) - Math.max(boxA.left, boxB.left);
            const overlapY = Math.min(boxA.bottom, boxB.bottom) - Math.max(boxA.top, boxB.top);

            if (overlapX > 0 && overlapY > 0) {
                const penetration = Math.min(overlapX, overlapY);
                const overlapType = overlapX < overlapY ? 'wingtip' : overlapY < overlapX ? 'nose_tail' : 'full';
                conflicts.push({
                    a, b, overlapType, penetration_ft: penetration,
                    detail: `${a.tail} ↔ ${b.tail}: ${overlapType.replace('_', ' ')} overlap — ${penetration.toFixed(1)}ft inside ${safetyBufferFt}ft safety zone`,
                });
            }
        }
    }
    return conflicts;
}

// ── Floor utilisation ─────────────────────────────────────────────────────────

export function computeUtilisation(
    placements: HangarPlacement[],
    hangar: HangarConfig
): { usedSqFt: number; totalSqFt: number; pct: number } {
    const totalSqFt = hangar.width_ft * hangar.depth_ft;
    const usedSqFt  = placements.reduce(
        (sum, p) => sum + p.dims.wingspan_ft * p.dims.length_ft,
        0
    );
    return {
        usedSqFt,
        totalSqFt,
        pct: totalSqFt > 0 ? Math.min(100, Math.round((usedSqFt / totalSqFt) * 100)) : 0,
    };
}

// ── Default placement helper ──────────────────────────────────────────────────

/**
 * Auto-place aircraft side-by-side nose-in, evenly spaced across hangar width.
 * Returns a sensible starting layout — user can drag from here.
 */
export function autoPlaceAircraft(
    aircraft: { aircraft: Aircraft; workOrderId: string }[],
    hangar: HangarConfig,
    safetyBufferFt = 5
): HangarPlacement[] {
    const placements: HangarPlacement[] = [];
    const eligible = aircraft.filter(({ aircraft: a }) => checkHeightGate(a, hangar).allowed);

    const n = eligible.length;
    if (n === 0) return [];

    const spacing = hangar.width_ft / (n + 1);

    eligible.forEach(({ aircraft: a, workOrderId }, idx) => {
        const dims = resolveAircraftDimensions(a);
        placements.push({
            aircraft: a,
            workOrderId,
            tail:  a.tail_number,
            x_ft:  spacing * (idx + 1),
            y_ft:  hangar.depth_ft / 2,
            dims,
        });
    });

    return placements;
}
