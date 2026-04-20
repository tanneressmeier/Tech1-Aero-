// =============================================================================
// SquawkGantt.tsx — Phase 3: Living Gantt Chart
//
// Features:
//   • Dependency-aware scheduling (topological sort via ganttEngine)
//   • Parts cascade: squawks shift right when required parts are on backorder
//   • SHIFTED badge with tooltip showing which part caused the delay
//   • Stage badges per row (Teardown → Inspection → Parts Pending → ...)
//   • Dependency-blocked indicator when predecessors are incomplete
//   • % to Completion bar in the footer driven by weighted squawk progress
//   • Projected completion date computed from the schedule
//   • Drag bars to override offsets (preserved as local UI state)
// =============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WorkOrder, InventoryItem, SquawkStage } from '../types.ts';
import {
    computeGanttSchedule,
    computeWoCompletion,
    computeProjectedEndDate,
    ScheduledSquawk,
} from '../utils/ganttEngine.ts';
import { ExclamationTriangleIcon, CheckBadgeIcon, ClockIcon } from './icons.tsx';

interface SquawkGanttProps {
    workOrder:   WorkOrder;
    inventory?:  InventoryItem[];  // optional — needed for parts cascade
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PX_PER_HOUR   = 64;
const ROW_H         = 52;
const LABEL_W       = 260;
const TICK_INTERVAL = 4;   // show tick every N hours

// ── Stage badge colours ───────────────────────────────────────────────────────
const STAGE_STYLES: Record<SquawkStage | 'default', string> = {
    'Teardown':      'bg-slate-500/20 text-slate-300 border-slate-500/30',
    'Inspection':    'bg-sky-500/20   text-sky-300   border-sky-500/30',
    'Parts Pending': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Reassembly':    'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'Testing':       'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Complete':      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'default':       'bg-white/5 text-slate-400 border-white/10',
};

const BAR_COLOURS = {
    aog:     'bg-red-500/80   border-red-400/60',
    urgent:  'bg-amber-500/80 border-amber-400/60',
    routine: 'bg-sky-500/80   border-sky-400/60',
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative group/tip inline-flex">
        {children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 hidden group-hover/tip:block
                        w-56 bg-slate-800 border border-white/20 rounded-lg px-3 py-2 text-xs text-slate-200 shadow-xl pointer-events-none">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const SquawkGantt: React.FC<SquawkGanttProps> = ({ workOrder, inventory = [] }) => {
    // Computed base schedule from engine
    const baseSchedule = useMemo(
        () => computeGanttSchedule(workOrder, inventory),
        [workOrder, inventory]
    );

    // Local drag overrides (hour offsets keyed by squawk_id)
    const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});

    // Reset overrides when WO changes
    useEffect(() => { setDragOffsets({}); }, [workOrder.wo_id]);

    // Merge base schedule with drag overrides
    const schedule: ScheduledSquawk[] = useMemo(() =>
        baseSchedule.map(s => ({
            ...s,
            startHour: dragOffsets[s.squawk.squawk_id] ?? s.startHour,
            endHour:   (dragOffsets[s.squawk.squawk_id] ?? s.startHour) + s.durationHours,
        })),
        [baseSchedule, dragOffsets]
    );

    const totalHours = useMemo(() =>
        Math.max(...schedule.map(s => s.endHour), 24) + 8,
        [schedule]
    );

    const woCompletion      = useMemo(() => computeWoCompletion(workOrder),  [workOrder]);
    const projectedEnd      = useMemo(() => computeProjectedEndDate(workOrder, schedule), [workOrder, schedule]);
    const hasPartsDelays    = schedule.some(s => s.isShifted);
    const hasDependencyGaps = schedule.some(s => s.isDependencyBlocked);

    // ── Drag handling ─────────────────────────────────────────────────────────
    const dragging = useRef<{ id: string; startX: number; startOffset: number } | null>(null);

    const onMouseDown = (e: React.MouseEvent, id: string, currentOffset: number) => {
        e.preventDefault();
        dragging.current = { id, startX: e.clientX, startOffset: currentOffset };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup',   onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!dragging.current) return;
        const { id, startX, startOffset } = dragging.current;
        const delta  = (e.clientX - startX) / PX_PER_HOUR;
        const newOff = Math.max(0, Math.round((startOffset + delta) * 4) / 4); // snap to 0.25h
        setDragOffsets(prev => ({ ...prev, [id]: newOff }));
    };

    const onMouseUp = () => {
        dragging.current = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup',   onMouseUp);
    };

    const resetOverrides = () => setDragOffsets({});

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">

            {/* ── Status banner ── */}
            {(hasPartsDelays || hasDependencyGaps) && (
                <div className="flex items-center gap-4 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs">
                    {hasPartsDelays && (
                        <span className="flex items-center gap-1.5 text-amber-300">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                            Parts delays are shifting tasks — see SHIFTED badges
                        </span>
                    )}
                    {hasDependencyGaps && (
                        <span className="flex items-center gap-1.5 text-sky-300">
                            <ClockIcon className="w-3.5 h-3.5" />
                            Some tasks blocked by incomplete predecessors
                        </span>
                    )}
                </div>
            )}

            {/* ── Main scrollable canvas ── */}
            <div className="flex-1 overflow-auto select-none">
                <div style={{ width: `${LABEL_W + totalHours * PX_PER_HOUR}px`, minWidth: '100%' }}>

                    {/* ── Time header ── */}
                    <div className="sticky top-0 z-20 flex bg-slate-800/95 backdrop-blur border-b border-white/10"
                        style={{ height: 40 }}>
                        {/* Label column spacer */}
                        <div className="sticky left-0 z-30 bg-slate-800/95 border-r border-white/10 flex-shrink-0"
                            style={{ width: LABEL_W }} />
                        {/* Hour ticks */}
                        {Array.from({ length: Math.ceil(totalHours) }).map((_, i) => (
                            <div key={i}
                                className="flex-shrink-0 border-l border-white/5 flex items-end pb-1 relative"
                                style={{ width: PX_PER_HOUR }}>
                                {i % TICK_INTERVAL === 0 && (
                                    <span className="absolute left-1 bottom-1 text-[10px] font-mono text-slate-500">
                                        +{i}h
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ── Grid + rows ── */}
                    <div className="relative">
                        {/* Background vertical grid lines */}
                        <div className="absolute inset-0 flex pointer-events-none" style={{ marginLeft: LABEL_W }}>
                            {Array.from({ length: Math.ceil(totalHours) }).map((_, i) => (
                                <div key={i}
                                    className={`flex-shrink-0 border-l h-full ${i % TICK_INTERVAL === 0 ? 'border-white/10' : 'border-white/5'}`}
                                    style={{ width: PX_PER_HOUR }} />
                            ))}
                        </div>

                        {/* ── Squawk rows ── */}
                        {schedule.map((s, idx) => {
                            const { squawk, startHour, durationHours, isShifted, shiftReasonParts, isDependencyBlocked } = s;
                            const barLeft  = LABEL_W + startHour * PX_PER_HOUR;
                            const barWidth = Math.max(durationHours * PX_PER_HOUR, 24);
                            const barCol   = BAR_COLOURS[squawk.priority] ?? BAR_COLOURS.routine;
                            const stageKey = (squawk.stage ?? 'default') as SquawkStage | 'default';
                            const stageStyle = STAGE_STYLES[stageKey] ?? STAGE_STYLES.default;

                            // Completion fill width
                            const pct = squawk.status === 'completed' ? 100 : (squawk.completion_percentage ?? 0);

                            return (
                                <div key={squawk.squawk_id}
                                    className={`relative flex items-center border-b border-white/5 hover:bg-white/3 transition-colors`}
                                    style={{ height: ROW_H }}>

                                    {/* ── Label ── */}
                                    <div className="sticky left-0 z-10 flex-shrink-0 bg-slate-900/95 backdrop-blur border-r border-white/10 h-full flex flex-col justify-center px-3 gap-0.5"
                                        style={{ width: LABEL_W }}>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-mono text-slate-600">#{idx + 1}</span>
                                            <span className="text-xs text-slate-200 truncate max-w-[160px]" title={squawk.description}>
                                                {squawk.description}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {/* Stage badge */}
                                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${stageStyle}`}>
                                                {squawk.stage ?? 'No stage'}
                                            </span>
                                            {/* Dependency blocked */}
                                            {isDependencyBlocked && (
                                                <Tooltip text={`Waiting on ${squawk.dependencies?.length ?? 0} predecessor task(s) to complete`}>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded border bg-sky-500/10 text-sky-400 border-sky-500/20 flex items-center gap-0.5">
                                                        <ClockIcon className="w-2.5 h-2.5" /> Blocked
                                                    </span>
                                                </Tooltip>
                                            )}
                                            {/* Parts shifted */}
                                            {isShifted && (
                                                <Tooltip text={shiftReasonParts.map(r =>
                                                    `${r.partDescription} (${r.partNo}) — ${r.delayDays}d delay, ETA ${r.expectedDate}`
                                                ).join(' · ')}>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-0.5 cursor-help">
                                                        <ExclamationTriangleIcon className="w-2.5 h-2.5" /> SHIFTED
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Bar ── */}
                                    <div
                                        className={`absolute rounded-md border cursor-grab active:cursor-grabbing overflow-hidden shadow-lg
                                                    group/bar transition-shadow hover:shadow-sky-500/20 ${barCol}`}
                                        style={{ left: barLeft, width: barWidth, height: 34, top: '50%', transform: 'translateY(-50%)' }}
                                        onMouseDown={e => onMouseDown(e, squawk.squawk_id, startHour)}>

                                        {/* Progress fill */}
                                        <div className="absolute inset-0 bg-white/20 origin-left transition-transform duration-500"
                                            style={{ transform: `scaleX(${pct / 100})` }} />

                                        {/* Label */}
                                        <div className="relative z-10 h-full flex items-center justify-between px-2 gap-1">
                                            <span className="text-[10px] font-semibold text-white drop-shadow truncate">
                                                {squawk.description.length > 20
                                                    ? squawk.description.slice(0, 18) + '…'
                                                    : squawk.description}
                                            </span>
                                            <span className="text-[10px] text-white/70 flex-shrink-0">
                                                {durationHours}h · {pct}%
                                            </span>
                                        </div>

                                        {/* Resize nub */}
                                        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/20 rounded-r-md" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="flex-shrink-0 border-t border-white/10 bg-slate-800/80 px-4 py-3 space-y-2">
                {/* % to Completion bar */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest w-28 flex-shrink-0">
                        % to Completion
                    </span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${
                                woCompletion === 100 ? 'bg-emerald-400'
                                : woCompletion > 60  ? 'bg-sky-400'
                                : woCompletion > 30  ? 'bg-amber-400'
                                : 'bg-red-400'}`}
                            style={{ width: `${woCompletion}%` }}
                        />
                    </div>
                    <span className={`text-sm font-medium w-10 text-right flex-shrink-0 ${
                        woCompletion === 100 ? 'text-emerald-400'
                        : woCompletion > 60  ? 'text-sky-300'
                        : woCompletion > 30  ? 'text-amber-300'
                        : 'text-red-300'}`}>
                        {woCompletion}%
                    </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                        <span>Start: <span className="text-slate-400 font-mono">{workOrder.scheduled_date}</span></span>
                        <span>Proj. end: <span className={`font-mono ${hasPartsDelays ? 'text-amber-400' : 'text-slate-400'}`}>{projectedEnd}</span></span>
                        {hasPartsDelays && (
                            <span className="text-amber-400 flex items-center gap-1">
                                <ExclamationTriangleIcon className="w-3 h-3" />
                                Parts delays extend timeline
                            </span>
                        )}
                        {woCompletion === 100 && (
                            <span className="text-emerald-400 flex items-center gap-1">
                                <CheckBadgeIcon className="w-3 h-3" /> All tasks complete
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {Object.keys(dragOffsets).length > 0 && (
                            <button onClick={resetOverrides}
                                className="text-sky-400 hover:text-sky-300 underline text-xs">
                                Reset manual overrides
                            </button>
                        )}
                        <span>Drag bars to adjust sequencing</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
