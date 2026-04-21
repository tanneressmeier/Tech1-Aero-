import React, { useState, useMemo } from 'react';
import { WorkOrder, RepairOrder, Aircraft, Technician, InventoryItem, Tool, Squawk, Signature, TimeLog } from '../types.ts';
import { SquawkDetailView } from './SquawkDetailView.tsx';
import { SquawkKanbanBoard } from './SquawkKanbanBoard.tsx';
import { SquawkGantt } from './SquawkGantt.tsx';
import { Permissions } from '../hooks/usePermissions.ts';
import { QuoteModal } from './QuoteModal.tsx';
import { SignatureConfirmationModal } from './SignatureConfirmationModal.tsx';
import {
    CurrencyDollarIcon, ClipboardListIcon, CircleStackIcon, ChartBarIcon,
    WrenchIcon, CheckBadgeIcon, ExclamationTriangleIcon,
} from './icons.tsx';
import { compareToolsClientSide } from '../services/geminiService.ts';
import { ProfitabilityPanel } from './ProfitabilityPanel.tsx';
import { computeWoCompletion } from '../utils/ganttEngine.ts';
import { analyzeOrderBottlenecks } from '../utils/skillsEngine.ts';
import { StatusBadge, PriorityBadge, MetaGrid, AlertBanner, TabBar, ActionButton } from './ui.tsx';

interface WorkOrderDetailProps {
    order: WorkOrder;
    aircraft: Aircraft;
    technicians: Technician[];
    inventory: InventoryItem[];
    tools: Tool[];
    onBack: () => void;
    onUpdateOrder: (updatedOrder: WorkOrder) => void;
    permissions: Permissions;
    initialViewMode?: 'list' | 'board' | 'gantt';
    activeTimeLogs?: TimeLog[];
    onClockInToTask?: (log: Omit<TimeLog, 'log_id'>) => void;
    onClockOutOfTask?: (logId: string, endTime: string) => void;
}
const CURRENT_USER_ID = 'tech-1';

export const WorkOrderDetail: React.FC<WorkOrderDetailProps> = ({
    order, aircraft, technicians, inventory, tools, onBack, onUpdateOrder, permissions,
    initialViewMode = 'list', activeTimeLogs = [], onClockInToTask, onClockOutOfTask,
}) => {
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'gantt'>(initialViewMode);
    const [pendingCompletionSquawkId, setPendingCompletionSquawkId] = useState<string | null>(null);
    const [showToolPlan, setShowToolPlan] = useState(false);

    // ── Tool planning summary ─────────────────────────────────────────────
    const toolPlan = useMemo(() => {
        // Aggregate all unique tool IDs across all squawks in this WO
        const allToolIds = [...new Set(order.squawks.flatMap(sq => sq.used_tool_ids))];
        const neededTools = allToolIds.map(id => tools.find(t => t.id === id)).filter((t): t is Tool => !!t);
        const result = compareToolsClientSide(neededTools, tools);

        // Flag tools that are calibration overdue
        const overdueTools = neededTools.filter(t =>
            t.calibrationRequired &&
            (t.calibrationDueDays ?? (t.calibrationDueDate
                ? Math.round((new Date(t.calibrationDueDate).getTime() - Date.now()) / 86400000)
                : 999)) < 0
        );

        return {
            total:    neededTools.length,
            available:result.available.length,
            shortage: result.shortage.length,
            overdue:  overdueTools.length,
            details:  neededTools,
            overdueList: overdueTools,
        };
    }, [order.squawks, tools]);

    // ── Labor bottleneck analysis (Phase 2) ───────────────────────────────
    const laborBottlenecks = useMemo(
        () => analyzeOrderBottlenecks(order, technicians),
        [order, technicians]
    );

    const handleKanbanStatusUpdate = (squawkId: string, newStatus: Squawk['status']) => {
        onUpdateOrder({ ...order, squawks: order.squawks.map(s => s.squawk_id === squawkId ? { ...s, status: newStatus } : s) });
    };

    const handleKanbanCompleteRequest = (squawkId: string) => setPendingCompletionSquawkId(squawkId);

    const handleSignatureConfirm = () => {
        if (!pendingCompletionSquawkId) return;
        const newSig: Signature = { technician_id: CURRENT_USER_ID, signed_at: new Date().toISOString() };
        onUpdateOrder({
            ...order,
            squawks: order.squawks.map(s => s.squawk_id === pendingCompletionSquawkId
                ? { ...s, status: 'completed' as const, signatures: { ...s.signatures, work_complete: newSig } }
                : s
            ),
        });
        setPendingCompletionSquawkId(null);
    };

    return (
        <div className="flex flex-col h-full gap-5">
            {/* ── Back + Title row ── */}
            <div className="flex items-center justify-between flex-shrink-0">
                <button onClick={onBack}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
                    ← Work Orders
                </button>
                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <TabBar size="sm"
                        tabs={[
                            { id: 'list',  label: 'List',  icon: <ClipboardListIcon className="w-3.5 h-3.5" /> },
                            { id: 'board', label: 'Board', icon: <CircleStackIcon   className="w-3.5 h-3.5" /> },
                            { id: 'gantt', label: 'Gantt', icon: <ChartBarIcon      className="w-3.5 h-3.5" /> },
                        ]}
                        active={viewMode}
                        onChange={v => setViewMode(v as typeof viewMode)}
                    />
                    {permissions.canEditBilling && (
                        <ActionButton
                            size="sm"
                            icon={<CurrencyDollarIcon className="w-3.5 h-3.5" />}
                            onClick={() => setIsQuoteModalOpen(true)}
                        >
                            Quote
                        </ActionButton>
                    )}
                </div>
            </div>

            {/* ── Order header card ── */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-5 flex-shrink-0 space-y-4">
                {/* Title + status row */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-xl font-semibold text-white">{order.wo_id}</h2>
                            <PriorityBadge priority={order.priority as any} />
                            <StatusBadge   status={order.status as any} />
                        </div>
                        <p className="text-sm text-slate-400 mt-0.5">{order.visit_name}</p>
                    </div>

                    {/* Completion bar */}
                    {(() => {
                        const pct = computeWoCompletion(order);
                        return (
                            <div className="flex items-center gap-2.5 flex-shrink-0 min-w-[160px]">
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-700 ${
                                        pct === 100 ? 'bg-emerald-400' : pct > 60 ? 'bg-sky-400' : pct > 30 ? 'bg-amber-400' : 'bg-slate-600'
                                    }`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className={`text-xs font-mono font-semibold flex-shrink-0 ${
                                    pct === 100 ? 'text-emerald-400' : pct > 60 ? 'text-sky-300' : pct > 30 ? 'text-amber-300' : 'text-slate-500'
                                }`}>{pct}%</span>
                            </div>
                        );
                    })()}
                </div>

                {/* Meta grid */}
                <MetaGrid items={[
                    { label: 'Aircraft',   value: order.aircraft_tail_number, accent: true },
                    { label: 'Scheduled',  value: new Date(order.scheduled_date).toLocaleDateString() },
                    { label: 'Make/Model', value: `${aircraft.make} ${aircraft.model}` },
                    { label: 'Tasks',      value: `${order.squawks.filter(s => s.status === 'completed').length} / ${order.squawks.length} complete` },
                ]} cols={4} />

                {/* Consolidated alert row — labor + tools, all warnings in one place */}
                {(laborBottlenecks.length > 0 || toolPlan.overdue > 0 || toolPlan.shortage > 0) && (
                    <div className="space-y-2 pt-1">
                        {laborBottlenecks.length > 0 && (
                            <AlertBanner severity="warning"
                                title={`${laborBottlenecks.length} labor issue${laborBottlenecks.length > 1 ? 's' : ''} — ${laborBottlenecks[0].detail}`}
                                compact>
                                {laborBottlenecks.length > 1 && laborBottlenecks.slice(1).map((b, i) => (
                                    <p key={i} className="text-xs text-amber-200/60">{b.detail}</p>
                                ))}
                            </AlertBanner>
                        )}
                        {(toolPlan.overdue > 0 || toolPlan.shortage > 0) && (
                            <AlertBanner severity={toolPlan.overdue > 0 ? 'critical' : 'warning'}
                                title={[
                                    toolPlan.overdue  > 0 && `${toolPlan.overdue} tool${toolPlan.overdue > 1 ? 's' : ''} cal overdue`,
                                    toolPlan.shortage > 0 && `${toolPlan.shortage} tool${toolPlan.shortage > 1 ? 's' : ''} not in inventory`,
                                ].filter(Boolean).join(' · ')}
                                compact
                            />
                        )}
                    </div>
                )}

                {/* Admin-only financial details — collapsed by default */}
                {permissions.canEditBilling && (
                    <div className="pt-2 border-t border-white/5 space-y-2">
                        <QuoteBaselineEditor order={order} onUpdate={onUpdateOrder} />
                        <ProfitabilityPanel  order={order} inventory={inventory} />
                    </div>
                )}
            </div>

                        {/* Squawk views */}
            <div className="flex-1 min-h-0">
                {viewMode === 'list' && (
                    <div className="space-y-3 pb-10">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                                {order.squawks.length} task{order.squawks.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-slate-600">
                                {order.squawks.filter(s => s.status === 'completed').length} complete
                            </p>
                        </div>
                        {order.squawks.map(squawk => (
                            <SquawkDetailView key={squawk.squawk_id}
                                squawk={squawk} order={order} aircraft={aircraft}
                                technicians={technicians} inventory={inventory} tools={tools}
                                onUpdateOrder={onUpdateOrder} permissions={permissions}
                                activeTimeLogs={activeTimeLogs}
                                onClockInToTask={onClockInToTask}
                                onClockOutOfTask={onClockOutOfTask}
                            />
                        ))}
                    </div>
                )}
                {viewMode === 'board' && (
                    <SquawkKanbanBoard squawks={order.squawks} technicians={technicians}
                        onUpdateStatus={handleKanbanStatusUpdate} onComplete={handleKanbanCompleteRequest} />
                )}
                {viewMode === 'gantt' && <SquawkGantt workOrder={order} inventory={inventory} />}
            </div>

            <QuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)}
                order={order} aircraft={aircraft} inventory={inventory} />
            <SignatureConfirmationModal isOpen={!!pendingCompletionSquawkId}
                onClose={() => setPendingCompletionSquawkId(null)}
                onConfirm={handleSignatureConfirm} signatureTypeLabel="Work Complete" />
        </div>
    );
};

// ─── QuoteBaselineEditor ──────────────────────────────────────────────────────
// Inline collapsible section that lets Admins/Leads set the quoted hours,
// quoted revenue, and optional burdened-rate override for profitability tracking.
// Lives between the Tool Planning Summary and the ProfitabilityPanel.

const QuoteBaselineEditor: React.FC<{
    order: WorkOrder | RepairOrder;
    onUpdate: (order: WorkOrder | RepairOrder) => void;
}> = ({ order, onUpdate }) => {
    const [open, setOpen] = React.useState(false);
    const totalEstHours = order.squawks.reduce((s, sq) => s + (sq.hours_estimate ?? 0), 0);

    const field = (
        label: string,
        value: number | undefined,
        placeholder: string,
        onChange: (v: number | undefined) => void,
        hint: string,
    ) => (
        <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</label>
            <input
                type="number" min="0" step="any"
                value={value ?? ''}
                placeholder={placeholder}
                onChange={e => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
            />
            <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>
        </div>
    );

    return (
        <div className="mt-5 pt-4 border-t border-white/5">
            <button
                onClick={() => setOpen(p => !p)}
                className="w-full flex items-center justify-between text-xs font-mono text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors">
                <span className="flex items-center gap-2">
                    <CurrencyDollarIcon className="w-3.5 h-3.5" />
                    Quote Baseline
                    {order.quoted_labor_hours
                        ? <span className="text-sky-400 font-medium normal-case tracking-normal ml-1">
                            {order.quoted_labor_hours}h quoted · ${order.quoted_total?.toLocaleString() ?? '—'} total
                          </span>
                        : <span className="text-slate-600 font-normal normal-case tracking-normal ml-1">
                            not set — using estimate ({totalEstHours}h)
                          </span>
                    }
                </span>
                <span className="text-slate-600">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {field(
                        'Quoted Labor Hours',
                        order.quoted_labor_hours,
                        `${totalEstHours} (from estimates)`,
                        v => onUpdate({ ...order, quoted_labor_hours: v }),
                        'Hours sold to the customer at the base labor rate',
                    )}
                    {field(
                        'Quoted Revenue ($)',
                        order.quoted_total,
                        'e.g. 12500',
                        v => onUpdate({ ...order, quoted_total: v }),
                        'Total customer-facing price (labor + parts + fees)',
                    )}
                    {field(
                        'Burdened Rate Override ($/hr)',
                        order.burdened_labor_rate,
                        'Uses Settings default',
                        v => onUpdate({ ...order, burdened_labor_rate: v }),
                        'Override fully-burdened cost rate for this order only',
                    )}
                </div>
            )}
        </div>
    );
};
