import React, { useMemo } from 'react';
import { Technician, Aircraft, WorkOrder, RepairOrder, Tool, Notification, View } from '../types.ts';
import { SearchIntent } from '../services/geminiService.ts';
import { compareToolsClientSide } from '../services/geminiService.ts';
import {
    PlaneIcon, ClipboardListIcon, WrenchScrewdriverIcon, WrenchIcon,
    CalendarIcon, ShoppingCartIcon, ExclamationTriangleIcon, CheckBadgeIcon,
} from './icons.tsx';

interface MissionControlDashboardProps {
    currentUser: Technician;
    aircraftList: Aircraft[];
    workOrders: WorkOrder[];
    repairOrders: RepairOrder[];
    tools: Tool[];
    notifications: Notification[];
    onNavigate: (link: { view: View; orderId?: string }) => void;
    onNavigateToOrder: (view: 'work_orders' | 'repair_orders', orderId: string) => void;
    onNavigateWithFilters: (view: View, filters: SearchIntent['filters']) => void;
}

const KPI_Card: React.FC<{
    icon: React.ReactNode; title: string; value: string | number;
    subtext: string; accentColor: string; onClick?: () => void;
}> = ({ icon, title, value, subtext, accentColor, onClick }) => (
    <div onClick={onClick}
        className={`group relative overflow-hidden bg-white dark:bg-white/5 backdrop-blur-md rounded-lg p-6 border border-slate-200 dark:border-white/5 transition-all duration-500 hover:shadow-lg dark:hover:bg-white/10 dark:hover:border-white/20 hover:shadow-${accentColor}-500/10 ${onClick ? 'cursor-pointer' : ''}`}>
        <div className={`absolute top-0 left-0 w-1 h-full bg-${accentColor}-500 transition-all duration-500 group-hover:w-full group-hover:opacity-5 dark:group-hover:opacity-10`} />
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                <p className="text-4xl font-light text-slate-900 dark:text-white tracking-tight">{value}</p>
            </div>
            <div className={`p-2 rounded-md bg-${accentColor}-500/10 border border-${accentColor}-500/20 text-${accentColor}-600 dark:text-${accentColor}-400 group-hover:text-${accentColor}-700 dark:group-hover:text-white dark:group-hover:border-white/50 transition-colors duration-300`}>
                {icon}
            </div>
        </div>
        <p className="text-xs text-slate-500 mt-4 font-medium flex items-center gap-2 relative z-10">
            <span className={`w-2 h-2 rounded-full bg-${accentColor}-500 animate-pulse`} />
            {subtext}
        </p>
    </div>
);

const QuickActionButton: React.FC<{
    icon: React.ReactNode; label: string; onClick: () => void; color: string;
}> = ({ icon, label, onClick, color }) => (
    <button onClick={onClick}
        className={`group flex flex-col items-center justify-center p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg hover:shadow-md hover:border-${color}-500/50 dark:hover:bg-white/10 transition-all duration-300`}>
        <div className={`mb-3 p-3 rounded-full bg-slate-50 dark:bg-slate-900/50 text-${color}-500 dark:text-${color}-400 group-hover:scale-110 transition-all duration-500`}>
            {icon}
        </div>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 uppercase tracking-wider group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</span>
    </button>
);

export const MissionControlDashboard: React.FC<MissionControlDashboardProps> = ({
    currentUser, aircraftList, workOrders, repairOrders, tools,
    notifications, onNavigate, onNavigateToOrder, onNavigateWithFilters,
}) => {
    // ── KPI computations ─────────────────────────────────────────────────
    const aogAircraftCount = new Set([...workOrders, ...repairOrders]
        .filter(o => o.priority === 'aog' && o.status !== 'Completed' && o.status !== 'Cancelled')
        .map(o => o.aircraft_id)
    ).size;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const toolsNeedingCalibration = tools.filter(t => {
        if (!t.calibrationRequired || !t.calibrationDueDate) return false;
        const dueDate = new Date(t.calibrationDueDate);
        const today = new Date(); today.setHours(0,0,0,0);
        return dueDate < thirtyDaysFromNow;
    }).length;

    const activeWorkOrders  = workOrders.filter(wo => wo.status === 'In Progress').length;
    const activeRepairOrders = repairOrders.filter(ro => ro.status === 'In Progress').length;
    const totalActiveOrders = activeWorkOrders + activeRepairOrders;

    const urgentOrders = [...workOrders, ...repairOrders]
        .filter(o => (o.priority === 'aog' || o.priority === 'urgent') && o.status !== 'Completed' && o.status !== 'Cancelled')
        .sort((a, b) => ({ aog: 0, urgent: 1, routine: 2 }[a.priority] - { aog: 0, urgent: 1, routine: 2 }[b.priority]))
        .slice(0, 5);

    // ── Tool shortage alert (Phase 2) ─────────────────────────────────────
    const toolShortageAlert = useMemo(() => {
        const activeWOs = workOrders.filter(wo => wo.status !== 'Completed' && wo.status !== 'Cancelled');
        const issues: { orderId: string; tail: string; missingCount: number; overdueCount: number }[] = [];

        for (const wo of activeWOs) {
            const allToolIds = [...new Set(wo.squawks.flatMap(sq => sq.used_tool_ids))];
            if (!allToolIds.length) continue;

            const neededTools = allToolIds.map(id => tools.find(t => t.id === id)).filter((t): t is Tool => !!t);
            const result = compareToolsClientSide(neededTools, tools);

            const overdueCount = neededTools.filter(t =>
                t.calibrationRequired &&
                (t.calibrationDueDays ?? (t.calibrationDueDate
                    ? Math.round((new Date(t.calibrationDueDate).getTime() - Date.now()) / 86400000)
                    : 999)) < 0
            ).length;

            if (result.shortage.length > 0 || overdueCount > 0) {
                issues.push({
                    orderId:      wo.wo_id,
                    tail:         wo.aircraft_tail_number,
                    missingCount: result.shortage.length,
                    overdueCount,
                });
            }
        }
        return issues;
    }, [workOrders, tools]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-slate-200 dark:border-white/5 pb-6">
                <div>
                    <h2 className="text-3xl font-light tracking-wide text-slate-900 dark:text-white uppercase">Mission Control</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-mono">
                        Overview for {currentUser.name} // {new Date().toLocaleDateString()}
                    </p>
                </div>
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono uppercase tracking-widest">
                    System Optimal
                </span>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPI_Card icon={<PlaneIcon className="w-6 h-6"/>}         title="AOG Status"    value={aogAircraftCount}      subtext="Critical Priority"          accentColor="rose"   onClick={() => onNavigateWithFilters('aircraft', { status: 'aog' })} />
                <KPI_Card icon={<ClipboardListIcon className="w-6 h-6"/>} title="Active Maint"  value={totalActiveOrders}     subtext="WOs & ROs in progress"      accentColor="sky"    onClick={() => onNavigate({ view: 'work_orders' })} />
                <KPI_Card icon={<WrenchIcon className="w-6 h-6"/>}        title="Tool Calib"    value={toolsNeedingCalibration} subtext="Expiring < 30 days"       accentColor="amber"  onClick={() => onNavigateWithFilters('tooling', { calibrationStatus: 'due_soon' })} />
                <KPI_Card icon={<PlaneIcon className="w-6 h-6"/>}         title="Fleet Count"   value={aircraftList.length}   subtext="Managed Assets"             accentColor="indigo" onClick={() => onNavigate({ view: 'aircraft' })} />
            </div>

            {/* ── Tool shortage alert card (Phase 2) ── */}
            {toolShortageAlert.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wide">
                            Tool Readiness Issues — {toolShortageAlert.length} active work order{toolShortageAlert.length !== 1 ? 's' : ''}
                        </h3>
                    </div>
                    <div className="grid gap-2">
                        {toolShortageAlert.map(issue => (
                            <div key={issue.orderId}
                                onClick={() => onNavigateToOrder('work_orders', issue.orderId)}
                                className="flex items-center justify-between px-4 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-lg cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono text-sky-400 group-hover:text-sky-300">{issue.orderId}</span>
                                    <span className="text-sm text-slate-300">{issue.tail}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    {issue.missingCount > 0 && (
                                        <span className="text-amber-400">{issue.missingCount} tool{issue.missingCount !== 1 ? 's' : ''} not in inventory</span>
                                    )}
                                    {issue.overdueCount > 0 && (
                                        <span className="text-red-400 flex items-center gap-1">
                                            <ExclamationTriangleIcon className="w-3 h-3" />
                                            {issue.overdueCount} cal overdue
                                        </span>
                                    )}
                                    <span className="text-slate-500 group-hover:text-white">→</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => onNavigate({ view: 'tooling' })}
                        className="text-xs text-amber-400 hover:text-amber-300 underline transition-colors">
                        Go to Precision Tooling →
                    </button>
                </div>
            )}

            {/* Priority tasks + quick access */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-light text-slate-800 dark:text-white uppercase tracking-wider">Priority Tasks</h3>
                        <span className="text-xs text-slate-500 font-mono">LIVE FEED</span>
                    </div>
                    <div className="bg-white dark:bg-white/5 backdrop-blur-md rounded-lg border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                                    {['ID','Aircraft','Task','Status'].map(h => (
                                        <th key={h} className="py-3 px-6 text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {urgentOrders.length > 0 ? urgentOrders.map(order => {
                                    const isWo = 'wo_id' in order;
                                    const id   = isWo ? order.wo_id : order.ro_id;
                                    const desc = isWo ? order.visit_name : order.description;
                                    const view = isWo ? 'work_orders' : 'repair_orders';
                                    return (
                                        <tr key={id} onClick={() => onNavigateToOrder(view, id)}
                                            className="group hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                                            <td className="py-4 px-6 font-mono text-sky-600 dark:text-sky-400">{id}</td>
                                            <td className="py-4 px-6 text-slate-900 dark:text-white font-medium">{order.aircraft_tail_number}</td>
                                            <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{desc}</td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                                                    order.priority === 'aog'
                                                    ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                                                    : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                                                }`}>{order.priority}</span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={4} className="py-8 text-center text-slate-500 font-mono uppercase tracking-widest text-sm">No urgent items pending</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-light text-slate-800 dark:text-white uppercase tracking-wider mb-6">Quick Access</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <QuickActionButton color="sky"     icon={<ClipboardListIcon className="w-6 h-6"/>}    label="Work Orders" onClick={() => onNavigate({ view: 'work_orders' })} />
                        <QuickActionButton color="amber"   icon={<WrenchScrewdriverIcon className="w-6 h-6"/>} label="Repairs"    onClick={() => onNavigate({ view: 'repair_orders' })} />
                        <QuickActionButton color="indigo"  icon={<PlaneIcon className="w-6 h-6"/>}             label="Fleet"      onClick={() => onNavigate({ view: 'aircraft' })} />
                        <QuickActionButton color="emerald" icon={<CalendarIcon className="w-6 h-6"/>}          label="Schedule"   onClick={() => onNavigate({ view: 'calendar' })} />
                        <QuickActionButton color="rose"    icon={<WrenchIcon className="w-6 h-6"/>}            label="Tools"      onClick={() => onNavigate({ view: 'tooling' })} />
                        <QuickActionButton color="purple"  icon={<ShoppingCartIcon className="w-6 h-6"/>}      label="Purchase"   onClick={() => onNavigate({ view: 'purchase_orders' })} />
                    </div>
                </div>
            </div>
        </div>
    );
};
