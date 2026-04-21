// =============================================================================
// HangarFloorPlan.tsx — Phase 1: 2D Visual Hangar Bay Management
//
// Renders a top-down SVG floor plan of a hangar showing:
//   • Aircraft silhouettes scaled to real wingspan × length
//   • Height-gate blocking (red X, tooltip) for aircraft too tall for the door
//   • Footprint conflict highlighting (amber/red halos + tooltip)
//   • Drag-to-reposition within hangar bounds
//   • Utilisation badge (% of floor area used)
//   • Click aircraft → navigate to its work order
// =============================================================================

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Aircraft, HangarConfig, WorkOrder, RepairOrder } from '../types.ts';
import {
    resolveAircraftDimensions,
    checkHeightGate,
    detectConflicts,
    computeUtilisation,
    autoPlaceAircraft,
    HangarPlacement,
} from '../utils/hangarEngine.ts';
import { ExclamationTriangleIcon } from './icons.tsx';

interface HangarFloorPlanProps {
    hangar:      HangarConfig;
    aircraft:    Aircraft[];
    workOrders:  (WorkOrder | RepairOrder)[];
    onNavigateToOrder: (view: 'work_orders' | 'repair_orders', id: string) => void;
}

// ── SVG layout constants ───────────────────────────────────────────────────────
const SVG_W         = 900;
const SVG_H         = 600;
const MARGIN        = 40;   // px around the hangar outline
const DOOR_PX       = 24;   // depth of door marker at bottom
const LABEL_H       = 20;   // height reserved for tail number below aircraft
const SAFETY_BUFFER = 5;    // feet — passed to conflict detector

// ── Scale: map ft → SVG pixels ────────────────────────────────────────────────
function makeScale(hangar: HangarConfig) {
    const availW = SVG_W - MARGIN * 2;
    const availH = SVG_H - MARGIN * 2 - DOOR_PX;
    const scaleX = availW / hangar.width_ft;
    const scaleY = availH / hangar.depth_ft;
    const scale  = Math.min(scaleX, scaleY);  // uniform scale
    const offX   = MARGIN + (availW - hangar.width_ft * scale) / 2;
    const offY   = MARGIN;
    return {
        scale,
        ftToSvg: (x_ft: number, y_ft: number) => ({
            x: offX + x_ft * scale,
            y: offY + y_ft * scale,
        }),
        hangarW: hangar.width_ft * scale,
        hangarH: hangar.depth_ft * scale,
        offX, offY,
    };
}

// ── Aircraft silhouette path ───────────────────────────────────────────────────
// Top-down plan view: fuselage as thin ellipse + swept wings + h-stab.
function aircraftPath(cx: number, cy: number, wPx: number, lPx: number): string {
    const hw = wPx / 2;   // half wingspan in px
    const hl = lPx / 2;   // half length in px
    const fw = lPx * 0.1; // fuselage half-width

    // Nose at top (cy - hl), tail at bottom (cy + hl)
    const noseY  = cy - hl;
    const tailY  = cy + hl;
    const wingY  = cy - hl * 0.1;   // wings at ~45% from nose
    const stabY  = cy + hl * 0.65;  // horizontal stab 65% back

    return [
        // Fuselage
        `M ${cx - fw} ${noseY + lPx * 0.08}`,
        `Q ${cx} ${noseY} ${cx + fw} ${noseY + lPx * 0.08}`,
        `L ${cx + fw} ${tailY - lPx * 0.05}`,
        `Q ${cx} ${tailY + lPx * 0.04} ${cx - fw} ${tailY - lPx * 0.05}`,
        `Z`,
        // Left wing
        `M ${cx - fw} ${wingY + lPx * 0.08}`,
        `L ${cx - hw} ${wingY + lPx * 0.30}`,
        `L ${cx - hw * 0.25} ${wingY + lPx * 0.35}`,
        `Z`,
        // Right wing
        `M ${cx + fw} ${wingY + lPx * 0.08}`,
        `L ${cx + hw} ${wingY + lPx * 0.30}`,
        `L ${cx + hw * 0.25} ${wingY + lPx * 0.35}`,
        `Z`,
        // Left h-stab
        `M ${cx - fw * 0.8} ${stabY}`,
        `L ${cx - hw * 0.35} ${stabY + lPx * 0.08}`,
        `L ${cx - hw * 0.12} ${stabY + lPx * 0.09}`,
        `Z`,
        // Right h-stab
        `M ${cx + fw * 0.8} ${stabY}`,
        `L ${cx + hw * 0.35} ${stabY + lPx * 0.08}`,
        `L ${cx + hw * 0.12} ${stabY + lPx * 0.09}`,
        `Z`,
    ].join(' ');
}

// ── Main component ────────────────────────────────────────────────────────────
export const HangarFloorPlan: React.FC<HangarFloorPlanProps> = ({
    hangar, aircraft, workOrders, onNavigateToOrder,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);  // tail_number

    // Build active-WO aircraft list: only aircraft with an active order in this hangar
    const activeAcInHangar = useMemo(() => {
        const inHangar: { aircraft: Aircraft; workOrderId: string; orderId: string; orderType: 'work_orders' | 'repair_orders' }[] = [];
        for (const ac of aircraft) {
            const wo = workOrders.find(o =>
                o.aircraft_id === ac.id &&
                o.status !== 'Completed' && o.status !== 'Cancelled' &&
                (o.location === hangar.id || o.location === hangar.label)
            );
            if (wo) {
                inHangar.push({
                    aircraft: ac,
                    workOrderId: 'wo_id' in wo ? wo.wo_id : wo.ro_id,
                    orderId: 'wo_id' in wo ? wo.wo_id : wo.ro_id,
                    orderType: 'wo_id' in wo ? 'work_orders' : 'repair_orders',
                });
            }
        }
        return inHangar;
    }, [aircraft, workOrders, hangar]);

    // Initial auto-placement
    const [placements, setPlacements] = useState<HangarPlacement[]>(() =>
        autoPlaceAircraft(
            activeAcInHangar.map(({ aircraft: a, workOrderId }) => ({ aircraft: a, workOrderId })),
            hangar
        )
    );

    // Reset when hangar or aircraft list changes
    const lastHangarId = useRef(hangar.id);
    if (hangar.id !== lastHangarId.current) {
        lastHangarId.current = hangar.id;
        setTimeout(() => {
            setPlacements(autoPlaceAircraft(
                activeAcInHangar.map(({ aircraft: a, workOrderId }) => ({ aircraft: a, workOrderId })),
                hangar
            ));
        }, 0);
    }

    const gateResults = useMemo(() =>
        new Map(aircraft.map(a => [a.id, checkHeightGate(a, hangar)])),
        [aircraft, hangar]
    );

    const conflicts   = useMemo(() => detectConflicts(placements, SAFETY_BUFFER), [placements]);
    const utilisation = useMemo(() => computeUtilisation(placements, hangar), [placements, hangar]);
    const S           = useMemo(() => makeScale(hangar), [hangar]);

    const conflictIds = useMemo(() => {
        const ids = new Set<string>();
        conflicts.forEach(c => { ids.add(c.a.tail); ids.add(c.b.tail); });
        return ids;
    }, [conflicts]);

    // ── Drag handlers ──────────────────────────────────────────────────────
    const onMouseDown = useCallback((e: React.MouseEvent, tail: string) => {
        e.preventDefault();
        setDragging(tail);
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (!dragging || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const svgX = (e.clientX - rect.left) * (SVG_W / rect.width);
        const svgY = (e.clientY - rect.top)  * (SVG_H / rect.height);
        // Convert svg coords back to ft
        const x_ft = (svgX - S.offX) / S.scale;
        const y_ft = (svgY - S.offY) / S.scale;
        // Clamp inside hangar
        const p = placements.find(p => p.tail === dragging);
        if (!p) return;
        const hw = p.dims.wingspan_ft / 2;
        const hl = p.dims.length_ft   / 2;
        const clampedX = Math.max(hw, Math.min(hangar.width_ft - hw, x_ft));
        const clampedY = Math.max(hl, Math.min(hangar.depth_ft - hl, y_ft));
        setPlacements(prev => prev.map(pl =>
            pl.tail === dragging ? { ...pl, x_ft: clampedX, y_ft: clampedY } : pl
        ));
    }, [dragging, placements, S, hangar]);

    const onMouseUp = useCallback(() => setDragging(null), []);

    // ── Blocked aircraft (too tall) ────────────────────────────────────────
    const blockedAircraft = useMemo(() =>
        activeAcInHangar.filter(({ aircraft: a }) => !gateResults.get(a.id)?.allowed),
        [activeAcInHangar, gateResults]
    );

    // ── Render ─────────────────────────────────────────────────────────────
    const utilColour = utilisation.pct > 90 ? '#f87171' : utilisation.pct > 70 ? '#fbbf24' : '#34d399';

    return (
        <div className="relative select-none">
            {/* Conflict alerts */}
            {conflicts.length > 0 && (
                <div className="mb-3 flex items-start gap-2 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-sm">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-300 mb-1">
                            {conflicts.length} footprint conflict{conflicts.length > 1 ? 's' : ''} detected
                        </p>
                        {conflicts.map((c, i) => (
                            <p key={i} className="text-red-200/70 text-xs">{c.detail}</p>
                        ))}
                    </div>
                </div>
            )}

            {/* Height-gate blocked aircraft */}
            {blockedAircraft.length > 0 && (
                <div className="mb-3 flex items-start gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-sm">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-300 mb-1">
                            {blockedAircraft.length} aircraft cannot enter this hangar
                        </p>
                        {blockedAircraft.map(({ aircraft: a }) => {
                            const g = gateResults.get(a.id)!;
                            return (
                                <p key={a.id} className="text-amber-200/70 text-xs">
                                    {a.tail_number} ({a.make} {a.model}): {g.reason}
                                </p>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SVG floor plan */}
            <div className="relative bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    className="w-full"
                    style={{ cursor: dragging ? 'grabbing' : 'default', touchAction: 'none' }}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                >
                    {/* Background grid */}
                    <defs>
                        <pattern id="grid" width={S.scale * 10} height={S.scale * 10} patternUnits="userSpaceOnUse"
                            patternTransform={`translate(${S.offX},${S.offY})`}>
                            <path d={`M ${S.scale * 10} 0 L 0 0 0 ${S.scale * 10}`}
                                fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
                        </pattern>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="blur"/>
                            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                        </filter>
                    </defs>
                    <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

                    {/* Hangar outline */}
                    <rect
                        x={S.offX} y={S.offY}
                        width={S.hangarW} height={S.hangarH}
                        fill="rgba(15,23,42,0.8)"
                        stroke="rgba(148,163,184,0.3)" strokeWidth="1.5"
                        rx="2"
                    />

                    {/* Door marker at bottom */}
                    <rect
                        x={S.offX + (S.hangarW - (hangar.door_width_ft * S.scale)) / 2}
                        y={S.offY + S.hangarH - 3}
                        width={hangar.door_width_ft * S.scale}
                        height={6}
                        fill="rgba(56,189,248,0.5)" rx="2"
                    />
                    <text
                        x={S.offX + S.hangarW / 2}
                        y={S.offY + S.hangarH + 18}
                        textAnchor="middle" fontSize="11" fill="rgba(148,163,184,0.6)"
                        fontFamily="monospace"
                    >
                        DOOR — {hangar.door_width_ft}ft wide × {hangar.door_height_ft}ft tall
                    </text>

                    {/* Hangar label */}
                    <text
                        x={S.offX + 8} y={S.offY + 18}
                        fontSize="12" fill="rgba(148,163,184,0.5)"
                        fontFamily="monospace" fontWeight="bold"
                    >
                        {hangar.label.toUpperCase()}
                    </text>

                    {/* Dimension labels */}
                    <text x={S.offX + S.hangarW / 2} y={S.offY - 10} textAnchor="middle"
                        fontSize="10" fill="rgba(100,116,139,0.6)" fontFamily="monospace">
                        {hangar.width_ft}ft
                    </text>
                    <text x={S.offX - 10} y={S.offY + S.hangarH / 2} textAnchor="middle"
                        fontSize="10" fill="rgba(100,116,139,0.6)" fontFamily="monospace"
                        transform={`rotate(-90,${S.offX - 10},${S.offY + S.hangarH / 2})`}>
                        {hangar.depth_ft}ft
                    </text>

                    {/* Safety buffer zones (faint) */}
                    {placements.map(p => {
                        const { x, y } = S.ftToSvg(p.x_ft, p.y_ft);
                        const bufW = (p.dims.wingspan_ft + SAFETY_BUFFER * 2) * S.scale;
                        const bufL = (p.dims.length_ft   + SAFETY_BUFFER * 2) * S.scale;
                        const isConflicted = conflictIds.has(p.tail);
                        return (
                            <rect key={`buf-${p.tail}`}
                                x={x - bufW / 2} y={y - bufL / 2}
                                width={bufW} height={bufL}
                                fill="none"
                                stroke={isConflicted ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.08)'}
                                strokeWidth="1" strokeDasharray="4 3" rx="3"
                            />
                        );
                    })}

                    {/* Aircraft silhouettes */}
                    {placements.map(p => {
                        const { x, y } = S.ftToSvg(p.x_ft, p.y_ft);
                        const wPx = p.dims.wingspan_ft * S.scale;
                        const lPx = p.dims.length_ft   * S.scale;
                        const isConflicted = conflictIds.has(p.tail);
                        const acInfo = activeAcInHangar.find(a => a.aircraft.tail_number === p.tail);

                        return (
                            <g key={p.tail}
                                style={{ cursor: 'grab' }}
                                onMouseDown={e => onMouseDown(e, p.tail)}
                                onMouseEnter={e => {
                                    const gate = gateResults.get(p.aircraft.id);
                                    const conflictForThis = conflicts.filter(c => c.a.tail === p.tail || c.b.tail === p.tail);
                                    const lines = [
                                        `${p.aircraft.tail_number}  ${p.aircraft.make} ${p.aircraft.model}`,
                                        `Wingspan: ${p.dims.wingspan_ft}ft  Length: ${p.dims.length_ft}ft  Tail: ${p.dims.tail_height_ft}ft`,
                                        gate ? gate.reason : '',
                                        ...conflictForThis.map(c => `⚠ ${c.detail}`),
                                    ].filter(Boolean).join('\n');
                                    const svgRect = svgRef.current?.getBoundingClientRect();
                                    if (svgRect) setTooltip({ x: e.clientX - svgRect.left, y: e.clientY - svgRect.top, text: lines });
                                }}
                                onMouseLeave={() => setTooltip(null)}
                                onClick={() => {
                                    if (acInfo) onNavigateToOrder(acInfo.orderType, acInfo.orderId);
                                }}
                            >
                                {/* Conflict halo */}
                                {isConflicted && (
                                    <ellipse cx={x} cy={y}
                                        rx={wPx / 2 + 6} ry={lPx / 2 + 6}
                                        fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="2"
                                        filter="url(#glow)"
                                    />
                                )}

                                {/* Aircraft body */}
                                <path
                                    d={aircraftPath(x, y, wPx, lPx)}
                                    fill={isConflicted ? 'rgba(239,68,68,0.7)' : 'rgba(56,189,248,0.65)'}
                                    stroke={isConflicted ? 'rgba(239,68,68,0.9)' : 'rgba(56,189,248,0.9)'}
                                    strokeWidth="0.8"
                                />

                                {/* Tail number label */}
                                <text x={x} y={y + lPx / 2 + 14}
                                    textAnchor="middle" fontSize="10"
                                    fill={isConflicted ? '#fca5a5' : '#bae6fd'}
                                    fontFamily="monospace" fontWeight="600"
                                >
                                    {p.tail}
                                </text>
                                <text x={x} y={y + lPx / 2 + 25}
                                    textAnchor="middle" fontSize="9"
                                    fill="rgba(148,163,184,0.5)" fontFamily="monospace"
                                >
                                    {p.aircraft.model}
                                </text>
                            </g>
                        );
                    })}

                    {/* Utilisation badge */}
                    <g>
                        <rect x={SVG_W - 130} y={12} width={118} height={26} rx="6"
                            fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                        <text x={SVG_W - 71} y={30} textAnchor="middle"
                            fontSize="11" fontFamily="monospace" fontWeight="600" fill={utilColour}>
                            {utilisation.pct}% floor used
                        </text>
                    </g>

                    {/* Empty state */}
                    {placements.length === 0 && (
                        <text x={SVG_W / 2} y={SVG_H / 2}
                            textAnchor="middle" fontSize="14"
                            fill="rgba(100,116,139,0.5)" fontFamily="monospace">
                            No active aircraft assigned to this hangar
                        </text>
                    )}
                </svg>

                {/* Hover tooltip */}
                {tooltip && (
                    <div className="absolute z-20 pointer-events-none max-w-xs bg-slate-800/95 border border-white/15 rounded-xl px-3 py-2.5 shadow-2xl"
                        style={{ left: tooltip.x + 12, top: tooltip.y - 20 }}>
                        {tooltip.text.split('\n').map((line, i) => (
                            <p key={i} className={`text-xs font-mono ${i === 0 ? 'text-white font-semibold mb-1' : line.startsWith('⚠') ? 'text-red-300' : 'text-slate-300'}`}>
                                {line}
                            </p>
                        ))}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-5 text-xs text-slate-500 font-mono px-1">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-sky-400/60 border border-sky-400/80"/>
                    Active aircraft
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-400/60 border border-red-400/80"/>
                    Footprint conflict
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-6 h-px border-t border-dashed border-slate-500/50"/>
                    5ft safety zone
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-sm bg-sky-400/50"/>
                    Door
                </span>
                <span className="ml-auto">Drag to reposition • Click to open work order</span>
            </div>
        </div>
    );
};
