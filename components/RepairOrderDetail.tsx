import React, { useState, useMemo } from 'react';
import { RepairOrder, Aircraft, Technician, InventoryItem, Tool, TimeLog } from '../types.ts';
import { SquawkDetailView } from './SquawkDetailView.tsx';
import { Permissions } from '../hooks/usePermissions.ts';
import { QuoteModal } from './QuoteModal.tsx';
import { compareToolsClientSide } from '../services/geminiService.ts';
import { ProfitabilityPanel } from './ProfitabilityPanel.tsx';
import { computeWoCompletion } from '../utils/ganttEngine.ts';
import { analyzeOrderBottlenecks } from '../utils/skillsEngine.ts';
import { StatusBadge, PriorityBadge, MetaGrid, AlertBanner, ActionButton } from './ui.tsx';
import {
    CurrencyDollarIcon, WrenchIcon, CheckBadgeIcon, ExclamationTriangleIcon,
} from './icons.tsx';

interface RepairOrderDetailProps {
    order: RepairOrder;
    aircraft: Aircraft;
    technicians: Technician[];
    inventory: InventoryItem[];
    tools: Tool[];
    onBack: () => void;
    onUpdateOrder: (updatedOrder: RepairOrder) => void;
    permissions: Permissions;
    activeTimeLogs?: TimeLog[];
    onClockInToTask?: (log: Omit<TimeLog, 'log_id'>) => void;
    onClockOutOfTask?: (logId: string, endTime: string) => void;
}

// ── QuoteBaselineEditor ───────────────────────────────────────────────────────
const QuoteBaselineEditor: React.FC<{
    order: RepairOrder;
    onUpdate: (o: RepairOrder) => void;
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
                    {field('Quoted Labor Hours', order.quoted_labor_hours,
                        `${totalEstHours} (from estimates)`,
                        v => onUpdate({ ...order, quoted_labor_hours: v }),
                        'Hours sold to the customer at the base labor rate')}
                    {field('Quoted Revenue ($)', order.quoted_total,
                        'e.g. 8500',
                        v => onUpdate({ ...order, quoted_total: v }),
                        'Total customer-facing price (labor + parts + fees)')}
                    {field('Burdened Rate Override ($/hr)', order.burdened_labor_rate,
                        'Uses Settings default',
                        v => onUpdate({ ...order, burdened_labor_rate: v }),
                        'Override fully-burdened cost rate for this order only')}
                </div>
            )}
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
export const RepairOrderDetail: React.FC<RepairOrderDetailProps> = ({
    order, aircraft, technicians, inventory, tools, onBack, onUpdateOrder, permissions,
    activeTimeLogs = [], onClockInToTask, onClockOutOfTask,
}) => {
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

    const toolPlan = useMemo(() => {
        const allToolIds = [...new Set(order.squawks.flatMap(sq => sq.used_tool_ids))];
        const neededTools = allToolIds
            .map(id => tools.find(t => t.id === id))
            .filter((t): t is Tool => !!t);
        const result = compareToolsClientSide(neededTools, tools);
        const overdueTools = neededTools.filter(t =>
            t.calibrationRequired &&
            (t.calibrationDueDays ?? (t.calibrationDueDate
                ? Math.round((new Date(t.calibrationDueDate).getTime() - Date.now()) / 86400000)
                : 999)) < 0
        );
        return {
            total: neededTools.length, available: result.available.length,
            shortage: result.shortage.length, overdue: overdueTools.length,
            details: neededTools,
        };
    }, [order.squawks, tools]);

    const woCompletion = computeWoCompletion(order as any);
    const laborBottlenecks = analyzeOrderBottlenecks(order, technicians);

    return (
        <div className="flex flex-col h-full gap-5">
            {/* Back + actions */}
            <div className="flex items-center justify-between flex-shrink-0">
                <button onClick={onBack}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
                    ← Repair Orders
                </button>
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

            {/* Header card */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-5 flex-shrink-0 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-xl font-semibold text-white">{order.ro_id}</h2>
                            <PriorityBadge priority={order.priority as any} />
                            <StatusBadge   status={order.status as any} />
                        </div>
                        <p className="text-sm text-slate-400 mt-0.5">{order.description}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0 min-w-[160px]">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${
                                woCompletion === 100 ? 'bg-emerald-400' : woCompletion > 60 ? 'bg-sky-400' : woCompletion > 30 ? 'bg-amber-400' : 'bg-slate-600'
                            }`} style={{ width: `${woCompletion}%` }} />
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-400 flex-shrink-0">{woCompletion}%</span>
                    </div>
                </div>

                <MetaGrid items={[
                    { label: 'Aircraft',  value: order.aircraft_tail_number, accent: true },
                    { label: 'Created',   value: new Date(order.created_date).toLocaleDateString() },
                    { label: 'Make/Model',value: `${aircraft.make} ${aircraft.model}` },
                    { label: 'Tasks',     value: `${order.squawks.filter(s => s.status === 'completed').length} / ${order.squawks.length} complete` },
                ]} cols={4} />

                {/* Consolidated alerts */}
                {(laborBottlenecks.length > 0 || toolPlan.overdue > 0 || toolPlan.shortage > 0) && (
                    <div className="space-y-2 pt-1">
                        {laborBottlenecks.length > 0 && (
                            <AlertBanner severity="warning"
                                title={`${laborBottlenecks.length} labor issue${laborBottlenecks.length > 1 ? 's' : ''} — ${laborBottlenecks[0].detail}`}
                                compact />
                        )}
                        {(toolPlan.overdue > 0 || toolPlan.shortage > 0) && (
                            <AlertBanner severity={toolPlan.overdue > 0 ? 'critical' : 'warning'}
                                title={[
                                    toolPlan.overdue  > 0 && `${toolPlan.overdue} tool${toolPlan.overdue > 1 ? 's' : ''} cal overdue`,
                                    toolPlan.shortage > 0 && `${toolPlan.shortage} tool${toolPlan.shortage > 1 ? 's' : ''} not in inventory`,
                                ].filter(Boolean).join(' · ')}
                                compact />
                        )}
                    </div>
                )}

                {permissions.canEditBilling && (
                    <div className="pt-2 border-t border-white/5 space-y-2">
                        <QuoteBaselineEditor order={order} onUpdate={onUpdateOrder} />
                        <ProfitabilityPanel  order={order} inventory={inventory} />
                    </div>
                )}
            </div>

                        {/* ── Squawks ── */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                        {order.squawks.length} task{order.squawks.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-slate-600">
                        {order.squawks.filter(s => s.status === 'completed').length} complete
                    </p>
                </div>
                <div className="space-y-4 pb-10">
                    {order.squawks.map(squawk => (
                        <SquawkDetailView
                            key={squawk.squawk_id}
                            squawk={squawk} order={order} aircraft={aircraft}
                            technicians={technicians} inventory={inventory}
                            tools={tools} onUpdateOrder={onUpdateOrder}
                            permissions={permissions}
                            activeTimeLogs={activeTimeLogs}
                            onClockInToTask={onClockInToTask}
                            onClockOutOfTask={onClockOutOfTask}
                        />
                    ))}
                </div>
            </div>

            <QuoteModal
                isOpen={isQuoteModalOpen}
                onClose={() => setIsQuoteModalOpen(false)}
                order={order} aircraft={aircraft} inventory={inventory}
            />
        </div>
    );
};
