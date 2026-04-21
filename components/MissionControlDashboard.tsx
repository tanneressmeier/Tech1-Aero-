import React, { useMemo } from 'react';
import { Technician, Aircraft, WorkOrder, RepairOrder, Tool, Notification, View } from '../types.ts';
import { SearchIntent } from '../services/geminiService.ts';
import { compareToolsClientSide } from '../services/geminiService.ts';
import { analyzeOrderBottlenecks } from '../utils/skillsEngine.ts';
import { computeWoCompletion } from '../utils/ganttEngine.ts';
import {
    PlaneIcon, ClipboardListIcon, WrenchIcon, ExclamationTriangleIcon,
    CheckBadgeIcon, ClockIcon, CurrencyDollarIcon,
} from './icons.tsx';
import { PageHeader, StatusBadge, PriorityBadge, AlertBanner, SectionCard } from './ui.tsx';

interface MissionControlDashboardProps {
    currentUser:  Technician;
    aircraftList: Aircraft[];
    workOrders:   WorkOrder[];
    repairOrders: RepairOrder[];
    tools:        Tool[];
    notifications:Notification[];
    technicians:  Technician[];
    onNavigate:   (link: { view: View; orderId?: string }) => void;
    onNavigateToOrder: (view: 'work_orders' | 'repair_orders', orderId: string) => void;
    onNavigateWithFilters: (view: View, filters: SearchIntent['filters']) => void;
}

// ── KPI card ──────────────────────────────────────────────────────────────────
const KpiCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub:   string;
    tone:  'red' | 'amber' | 'sky' | 'emerald' | 'slate';
    onClick?: () => void;
}> = ({ icon, label, value, sub, tone, onClick }) => {
    const tones = {
        red:     { icon: 'text-red-400',     bg: 'bg-red-500/8',     border: 'border-red-500/15',    val: 'text-red-300'     },
        amber:   { icon: 'text-amber-400',   bg: 'bg-amber-500/8',   border: 'border-amber-500/15',  val: 'text-amber-200'   },
        sky:     { icon: 'text-sky-400',     bg: 'bg-sky-500/8',     border: 'border-sky-500/15',    val: 'text-sky-200'     },
        emerald: { icon: 'text-emerald-400', bg: 'bg-emerald-500/8', border: 'border-emerald-500/15',val: 'text-emerald-200' },
        slate:   { icon: 'text-slate-400',   bg: 'bg-white/3',       border: 'border-white/8',       val: 'text-white'       },
    };
    const t = tones[tone];
    return (
        <div onClick={onClick}
            className={`${t.bg} border ${t.border} rounded-xl p-5 ${onClick ? 'cursor-pointer hover:brightness-110' : ''} transition-all duration-150`}>
            <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">{label}</p>
                <span className={t.icon}>{icon}</span>
            </div>
            <p className={`text-3xl font-light ${t.val} mb-1`}>{value}</p>
            <p className="text-xs text-slate-500">{sub}</p>
        </div>
    );
};

export const MissionControlDashboard: React.FC<MissionControlDashboardProps> = ({
    currentUser, aircraftList, workOrders, repairOrders, tools,
    technicians, onNavigate, onNavigateToOrder, onNavigateWithFilters,
}) => {

    // ── KPI computations ───────────────────────────────────────────────────
    const aogCount = new Set([...workOrders, ...repairOrders]
        .filter(o => o.priority === 'aog' && o.status !== 'Completed' && o.status !== 'Cancelled')
        .map(o => o.aircraft_id)
    ).size;

    const activeOrders  = [...workOrders, ...repairOrders].filter(o =>
        o.status === 'In Progress' || o.status === 'Pending'
    );

    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const calDue = tools.filter(t =>
        t.calibrationRequired && t.calibrationDueDate &&
        new Date(t.calibrationDueDate) < thirtyDays
    ).length;

    // Avg completion across active orders
    const avgCompletion = useMemo(() => {
        const wos = workOrders.filter(o => o.status === 'In Progress');
        if (!wos.length) return null;
        const total = wos.reduce((s, o) => s + computeWoCompletion(o), 0);
        return Math.round(total / wos.length);
    }, [workOrders]);

    // ── System health — data-driven ────────────────────────────────────────
    const systemAlerts = useMemo(() => {
        const alerts: { severity: 'critical' | 'warning'; message: string }[] = [];
        if (aogCount > 0) alerts.push({ severity: 'critical', message: `${aogCount} aircraft AOG` });
        const overdueCal = tools.filter(t =>
            t.calibrationRequired &&
            (t.calibrationDueDays ?? (t.calibrationDueDate
                ? Math.round((new Date(t.calibrationDueDate).getTime() - Date.now()) / 86400000)
                : 999)) < 0
        ).length;
        if (overdueCal > 0) alerts.push({ severity: 'critical', message: `${overdueCal} tool${overdueCal > 1 ? 's' : ''} cal overdue` });
        if (calDue > 0) alerts.push({ severity: 'warning', message: `${calDue} tool${calDue > 1 ? 's' : ''} cal due <30d` });
        return alerts;
    }, [aogCount, tools, calDue]);

    const isHealthy = systemAlerts.length === 0;

    // ── Tool shortages ─────────────────────────────────────────────────────
    const toolShortages = useMemo(() => {
        return workOrders
            .filter(o => o.status !== 'Completed' && o.status !== 'Cancelled')
            .flatMap(wo => {
                const allIds = [...new Set(wo.squawks.flatMap(sq => sq.used_tool_ids))];
                if (!allIds.length) return [];
                const needed = allIds.map(id => tools.find(t => t.id === id)).filter(Boolean) as Tool[];
                const result = compareToolsClientSide(needed, tools);
                if (result.shortage.length === 0) return [];
                return [{ orderId: wo.wo_id, tail: wo.aircraft_tail_number, missing: result.shortage.length }];
            });
    }, [workOrders, tools]);

    // ── Labor bottlenecks across all active orders ─────────────────────────
    const laborIssues = useMemo(() => {
        return activeOrders
            .map(o => ({ order: o, issues: analyzeOrderBottlenecks(o, technicians) }))
            .filter(({ issues }) => issues.length > 0);
    }, [activeOrders, technicians]);

    // ── Priority feed ──────────────────────────────────────────────────────
    const priorityFeed = [...workOrders, ...repairOrders]
        .filter(o => (o.priority === 'aog' || o.priority === 'urgent') &&
                     o.status !== 'Completed' && o.status !== 'Cancelled')
        .sort((a, b) => ({ aog: 0, urgent: 1, routine: 2 }[a.priority] - { aog: 0, urgent: 1, routine: 2 }[b.priority]))
        .slice(0, 8);

    // ── Recent activity (last 5 orders by scheduled/created date) ─────────
    const recent = [...workOrders, ...repairOrders]
        .filter(o => o.status !== 'Cancelled')
        .sort((a, b) => {
            const da = 'scheduled_date' in a ? a.scheduled_date : a.created_date;
            const db = 'scheduled_date' in b ? b.scheduled_date : b.created_date;
            return new Date(db).getTime() - new Date(da).getTime();
        })
        .slice(0, 5);

    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <PageHeader
                title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${currentUser.name.split(' ')[0]}`}
                subtitle={`${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · ${settings.organization?.name ?? 'Tech1 Aero'}`}
                actions={
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isHealthy
                            ? 'bg-emerald-500/8 text-emerald-300 border-emerald-500/20'
                            : systemAlerts.some(a => a.severity === 'critical')
                                ? 'bg-red-500/8 text-red-300 border-red-500/20'
                                : 'bg-amber-500/8 text-amber-300 border-amber-500/20'
                    }`}>
                        {isHealthy
                            ? <><CheckBadgeIcon className="w-3.5 h-3.5" /> Systems Nominal</>
                            : <><ExclamationTriangleIcon className="w-3.5 h-3.5" /> {systemAlerts.length} Alert{systemAlerts.length > 1 ? 's' : ''}</>
                        }
                    </div>
                }
            />

            {/* System alerts — only shows when something is actually wrong */}
            {systemAlerts.length > 0 && (
                <div className="space-y-2">
                    {systemAlerts.map((a, i) => (
                        <AlertBanner key={i} severity={a.severity} title={a.message} compact />
                    ))}
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={<PlaneIcon className="w-5 h-5" />}
                    label="AOG Aircraft"
                    value={aogCount}
                    sub="Requiring immediate attention"
                    tone={aogCount > 0 ? 'red' : 'slate'}
                    onClick={() => onNavigateWithFilters('aircraft', { status: 'aog' })}
                />
                <KpiCard
                    icon={<ClipboardListIcon className="w-5 h-5" />}
                    label="Active Orders"
                    value={activeOrders.length}
                    sub={`${workOrders.filter(o => o.status === 'In Progress').length} WO · ${repairOrders.filter(o => o.status === 'In Progress').length} RO`}
                    tone="sky"
                    onClick={() => onNavigate({ view: 'work_orders' })}
                />
                <KpiCard
                    icon={<ClockIcon className="w-5 h-5" />}
                    label="Avg Completion"
                    value={avgCompletion !== null ? `${avgCompletion}%` : '—'}
                    sub="Across in-progress WOs"
                    tone={avgCompletion !== null && avgCompletion < 30 ? 'amber' : 'emerald'}
                />
                <KpiCard
                    icon={<WrenchIcon className="w-5 h-5" />}
                    label="Cal Due Soon"
                    value={calDue}
                    sub="Tools expiring within 30 days"
                    tone={calDue > 0 ? 'amber' : 'slate'}
                    onClick={() => onNavigateWithFilters('tooling', { calibrationStatus: 'due_soon' })}
                />
            </div>

            {/* Alert rows — tool shortages and labor issues */}
            {(toolShortages.length > 0 || laborIssues.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {toolShortages.length > 0 && (
                        <AlertBanner severity="warning" title={`Tool shortages — ${toolShortages.length} order${toolShortages.length > 1 ? 's' : ''}`}>
                            {toolShortages.map(s => (
                                <button key={s.orderId}
                                    onClick={() => onNavigateToOrder('work_orders', s.orderId)}
                                    className="block text-xs text-amber-200/70 hover:text-amber-200 text-left transition-colors w-full">
                                    {s.orderId} · {s.tail} — {s.missing} tool{s.missing > 1 ? 's' : ''} missing
                                </button>
                            ))}
                        </AlertBanner>
                    )}
                    {laborIssues.length > 0 && (
                        <AlertBanner severity="warning" title={`Labor gaps — ${laborIssues.length} order${laborIssues.length > 1 ? 's' : ''}`}>
                            {laborIssues.slice(0, 3).map(({ order, issues }) => {
                                const id = 'wo_id' in order ? order.wo_id : order.ro_id;
                                const view = 'wo_id' in order ? 'work_orders' : 'repair_orders';
                                return (
                                    <button key={id}
                                        onClick={() => onNavigateToOrder(view, id)}
                                        className="block text-xs text-amber-200/70 hover:text-amber-200 text-left transition-colors w-full">
                                        {id} · {issues[0].detail.split(':')[0]}
                                    </button>
                                );
                            })}
                        </AlertBanner>
                    )}
                </div>
            )}

            {/* Two-column: priority feed + recent */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Priority feed */}
                <SectionCard padding="none">
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
                        <h3 className="text-sm font-semibold text-white">Priority Orders</h3>
                        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                            {priorityFeed.length} item{priorityFeed.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {priorityFeed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-600 text-sm">
                            <CheckBadgeIcon className="w-8 h-8 mb-2 text-emerald-600/50" />
                            No priority items
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {priorityFeed.map(order => {
                                const isWO = 'wo_id' in order;
                                const id   = isWO ? order.wo_id : order.ro_id;
                                const desc = isWO ? order.visit_name : order.description;
                                const view = isWO ? 'work_orders' : 'repair_orders';
                                return (
                                    <button key={id} onClick={() => onNavigateToOrder(view, id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors text-left">
                                        <PriorityBadge priority={order.priority as any} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white font-medium truncate">{desc}</p>
                                            <p className="text-xs text-slate-500 font-mono">{id} · {order.aircraft_tail_number}</p>
                                        </div>
                                        <StatusBadge status={order.status as any} dot={false} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>

                {/* Fleet snapshot */}
                <SectionCard padding="none">
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/5">
                        <h3 className="text-sm font-semibold text-white">Fleet Snapshot</h3>
                        <button onClick={() => onNavigate({ view: 'aircraft' })}
                            className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                            View all →
                        </button>
                    </div>
                    <div className="divide-y divide-white/5">
                        {aircraftList.slice(0, 6).map(ac => {
                            const acOrders = [...workOrders, ...repairOrders].filter(
                                o => o.aircraft_id === ac.id && o.status !== 'Completed' && o.status !== 'Cancelled'
                            );
                            const isAog = acOrders.some(o => o.priority === 'aog');
                            const isActive = acOrders.length > 0;
                            return (
                                <div key={ac.id}
                                    className="flex items-center gap-3 px-4 py-3">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isAog ? 'bg-red-400' : isActive ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white font-medium">{ac.tail_number}</p>
                                        <p className="text-xs text-slate-500">{ac.make} {ac.model}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        {isAog ? (
                                            <span className="text-xs font-bold text-red-400">AOG</span>
                                        ) : isActive ? (
                                            <span className="text-xs text-amber-400">{acOrders.length} order{acOrders.length > 1 ? 's' : ''}</span>
                                        ) : (
                                            <span className="text-xs text-emerald-400">Airworthy</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};

// Settings reference for org name in header
const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
