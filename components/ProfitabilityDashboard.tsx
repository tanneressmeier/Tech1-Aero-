// =============================================================================
// ProfitabilityDashboard — fleet-wide real-time labor-to-revenue dashboard.
// New view mounted under Analytics nav for board-room-ready margin visibility.
// =============================================================================
import React, { useMemo, useState } from 'react';
import { WorkOrder, RepairOrder, InventoryItem, Aircraft } from '../types.ts';
import { useSettings } from '../contexts/SettingsContext.tsx';
import { computeProfitability, fmtUsd, ProfitabilityMetrics } from '../utils/profitabilityEngine.ts';
import {
    CurrencyDollarIcon, ExclamationTriangleIcon, ChartBarIcon, CheckBadgeIcon,
    ClockIcon, ChevronRightIcon,
} from './icons.tsx';

interface Props {
    workOrders:   WorkOrder[];
    repairOrders: RepairOrder[];
    inventory:    InventoryItem[];
    aircraftList: Aircraft[];
    onNavigateToOrder: (view: 'work_orders' | 'repair_orders', orderId: string) => void;
}

type OrderRow = {
    order: WorkOrder | RepairOrder;
    type:  'WO' | 'RO';
    id:    string;
    m:     ProfitabilityMetrics;
};

type StatusFilter = 'all' | 'critical' | 'warning' | 'healthy' | 'complete';
type SortKey = 'margin' | 'burn' | 'completion' | 'id';

export const ProfitabilityDashboard: React.FC<Props> = ({
    workOrders, repairOrders, inventory, aircraftList, onNavigateToOrder,
}) => {
    const { settings } = useSettings();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortKey,     setSortKey]       = useState<SortKey>('margin');

    // ── Compute all rows with metrics ──
    const rows: OrderRow[] = useMemo(() => {
        const woRows: OrderRow[] = workOrders.map(o => ({
            order: o, type: 'WO' as const, id: o.wo_id,
            m: computeProfitability(o, inventory, settings),
        }));
        const roRows: OrderRow[] = repairOrders.map(o => ({
            order: o, type: 'RO' as const, id: o.ro_id,
            m: computeProfitability(o, inventory, settings),
        }));
        return [...woRows, ...roRows];
    }, [workOrders, repairOrders, inventory, settings]);

    // ── Fleet-wide KPIs ──
    const kpis = useMemo(() => {
        const active = rows.filter(r => r.m.status !== 'complete');
        const critical = rows.filter(r => r.m.status === 'critical').length;
        const warning  = rows.filter(r => r.m.status === 'warning').length;
        const totalRevenue = rows.reduce((s, r) => s + r.m.quotedLaborRevenue + r.m.quotedPartsRevenue, 0);
        const totalCost    = rows.reduce((s, r) => s + r.m.actualLaborCost    + r.m.actualPartsCost,    0);
        const avgMarginPct = active.length > 0
            ? active.reduce((s, r) => s + r.m.projectedMarginPct, 0) / active.length
            : 0;
        const totalActualHours = rows.reduce((s, r) => s + r.m.actualHours, 0);
        const totalQuotedHours = rows.reduce((s, r) => s + r.m.quotedHours, 0);
        return {
            openOrders: active.length,
            critical, warning,
            totalRevenue, totalCost,
            avgMarginPct,
            totalActualHours, totalQuotedHours,
        };
    }, [rows]);

    // ── Filter + sort ──
    const visibleRows = useMemo(() => {
        let filtered = rows;
        if (statusFilter !== 'all') filtered = rows.filter(r => r.m.status === statusFilter);
        const sorted = [...filtered].sort((a, b) => {
            switch (sortKey) {
                case 'margin':     return a.m.projectedMarginPct - b.m.projectedMarginPct;
                case 'burn':       return b.m.burnRate           - a.m.burnRate;
                case 'completion': return a.m.completionPercent  - b.m.completionPercent;
                case 'id':         return a.id.localeCompare(b.id);
            }
        });
        return sorted;
    }, [rows, statusFilter, sortKey]);

    const ratioColor = kpis.totalRevenue > 0 && kpis.totalCost / kpis.totalRevenue > 0.9 ? 'text-red-300'
                     : kpis.totalRevenue > 0 && kpis.totalCost / kpis.totalRevenue > 0.8 ? 'text-amber-300'
                     : 'text-emerald-300';

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex justify-between items-end border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-3xl font-light tracking-wide text-white uppercase">Profitability</h2>
                    <p className="text-sm text-slate-400 mt-2 font-mono">
                        Real-time labor-to-revenue ratio · Burdened rate {fmtUsd(
                            settings.financials.laborRate * (1 + (settings.financials.benefitsLoad ?? 0) / 100) +
                            (settings.financials.hangarOverhead ?? 0))}/hr
                    </p>
                </div>
                <div className="flex gap-2">
                    <StatusPill label="Critical" count={kpis.critical} active={statusFilter === 'critical'}
                        onClick={() => setStatusFilter(statusFilter === 'critical' ? 'all' : 'critical')} tone="red" />
                    <StatusPill label="Warning"  count={kpis.warning}  active={statusFilter === 'warning'}
                        onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')}   tone="amber" />
                </div>
            </div>

            {/* ── Fleet KPIs ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={<ChartBarIcon className="w-5 h-5" />}
                    label="Active Orders"
                    value={kpis.openOrders.toString()}
                    subtext={`${kpis.critical} critical · ${kpis.warning} warning`}
                    tone={kpis.critical > 0 ? 'red' : kpis.warning > 0 ? 'amber' : 'slate'}
                />
                <KpiCard
                    icon={<ClockIcon className="w-5 h-5" />}
                    label="Hours — Actual / Quoted"
                    value={`${kpis.totalActualHours.toFixed(0)} / ${kpis.totalQuotedHours.toFixed(0)}`}
                    subtext={kpis.totalQuotedHours > 0 ? `${((kpis.totalActualHours / kpis.totalQuotedHours) * 100).toFixed(0)}% utilised` : 'No quotes set'}
                    tone="sky"
                />
                <KpiCard
                    icon={<CurrencyDollarIcon className="w-5 h-5" />}
                    label="Revenue / Cost"
                    value={fmtUsd(kpis.totalRevenue)}
                    subtext={`Cost to date: ${fmtUsd(kpis.totalCost)}`}
                    tone={ratioColor === 'text-red-300' ? 'red' : ratioColor === 'text-amber-300' ? 'amber' : 'emerald'}
                />
                <KpiCard
                    icon={<CheckBadgeIcon className="w-5 h-5" />}
                    label="Avg Projected Margin"
                    value={`${kpis.avgMarginPct.toFixed(1)}%`}
                    subtext="Across active orders"
                    tone={kpis.avgMarginPct < 0 ? 'red' : kpis.avgMarginPct < 10 ? 'amber' : 'emerald'}
                />
            </div>

            {/* ── Sort / filter bar ── */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Sort by</span>
                {[
                    { key: 'margin',     label: 'Margin (worst first)' },
                    { key: 'burn',       label: 'Burn Rate' },
                    { key: 'completion', label: 'Completion' },
                    { key: 'id',         label: 'Order ID' },
                ].map(({ key, label }) => (
                    <button key={key} onClick={() => setSortKey(key as SortKey)}
                        className={`px-2.5 py-1 rounded text-xs transition-colors ${
                            sortKey === key
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}>
                        {label}
                    </button>
                ))}
                {statusFilter !== 'all' && (
                    <button onClick={() => setStatusFilter('all')}
                        className="ml-auto text-xs text-sky-400 hover:text-sky-300 underline">
                        Clear filter
                    </button>
                )}
            </div>

            {/* ── Order rows ── */}
            <div className="space-y-3">
                {visibleRows.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 text-sm">
                        No orders match the current filter.
                    </div>
                ) : visibleRows.map(row => {
                    const aircraft = aircraftList.find(a => a.id === row.order.aircraft_id);
                    return (
                        <OrderRowCard key={row.id} row={row} aircraft={aircraft}
                            onClick={() => onNavigateToOrder(row.type === 'WO' ? 'work_orders' : 'repair_orders', row.id)} />
                    );
                })}
            </div>
        </div>
    );
};

// ── Sub-components ──────────────────────────────────────────────────────────

const KpiCard: React.FC<{
    icon: React.ReactNode; label: string; value: string; subtext: string;
    tone: 'red' | 'amber' | 'emerald' | 'sky' | 'slate';
}> = ({ icon, label, value, subtext, tone }) => {
    const toneMap = {
        red:     'text-red-300',
        amber:   'text-amber-300',
        emerald: 'text-emerald-300',
        sky:     'text-sky-300',
        slate:   'text-slate-200',
    };
    const iconToneMap = {
        red:     'bg-red-500/10     text-red-400',
        amber:   'bg-amber-500/10   text-amber-400',
        emerald: 'bg-emerald-500/10 text-emerald-400',
        sky:     'bg-sky-500/10     text-sky-400',
        slate:   'bg-white/5        text-slate-400',
    };
    return (
        <div className="bg-white/3 border border-white/5 rounded-xl p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${iconToneMap[tone]}`}>
                {icon}
            </div>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-light mt-1 ${toneMap[tone]}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1">{subtext}</p>
        </div>
    );
};

const StatusPill: React.FC<{
    label: string; count: number; active: boolean; onClick: () => void;
    tone: 'red' | 'amber';
}> = ({ label, count, active, onClick, tone }) => {
    const styles = tone === 'red'
        ? active ? 'bg-red-500/20 text-red-200 border-red-500/40' : 'bg-red-500/5  text-red-400 border-red-500/20 hover:bg-red-500/10'
        : active ? 'bg-amber-500/20 text-amber-200 border-amber-500/40' : 'bg-amber-500/5 text-amber-400 border-amber-500/20 hover:bg-amber-500/10';
    return (
        <button onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${styles}`}>
            {count} {label}
        </button>
    );
};

const OrderRowCard: React.FC<{ row: OrderRow; aircraft?: Aircraft; onClick: () => void }> = ({ row, aircraft, onClick }) => {
    const { m } = row;
    const statusBorder = {
        healthy:  'border-emerald-500/20 hover:border-emerald-500/40',
        warning:  'border-amber-500/30   hover:border-amber-500/50',
        critical: 'border-red-500/40     hover:border-red-500/60',
        complete: 'border-white/10       hover:border-white/20',
    }[m.status];

    const statusDot = {
        healthy:  'bg-emerald-400',
        warning:  'bg-amber-400',
        critical: 'bg-red-400',
        complete: 'bg-sky-400',
    }[m.status];

    return (
        <button onClick={onClick}
            className={`w-full text-left bg-white/3 border ${statusBorder} rounded-xl p-4 transition-all group flex items-center gap-5`}>
            <div className={`w-1 h-14 rounded-full ${statusDot} flex-shrink-0`} />
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                <div className="min-w-0">
                    <p className="text-sm font-mono text-sky-300 group-hover:text-sky-200">{row.id}</p>
                    <p className="text-xs text-slate-400 truncate">
                        {row.order.aircraft_tail_number}
                        {aircraft && <span className="text-slate-600"> · {aircraft.make} {aircraft.model}</span>}
                    </p>
                </div>
                <Metric label="Hours"     value={`${m.actualHours.toFixed(1)} / ${m.quotedHours.toFixed(1)}`} />
                <Metric label="Complete"  value={`${m.completionPercent}%`} progress={m.completionPercent} />
                <Metric label="Margin"    value={`${m.projectedMarginPct.toFixed(1)}%`}
                    valueTone={m.projectedMarginPct < 0 ? 'red' : m.projectedMarginPct < 10 ? 'amber' : 'emerald'} />
                <Metric label="Status"    value={m.statusReason} wide />
            </div>
            {m.isOverBurning && (
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <ChevronRightIcon className="w-4 h-4 text-slate-500 group-hover:text-white flex-shrink-0" />
        </button>
    );
};

const Metric: React.FC<{
    label: string; value: string;
    progress?: number; valueTone?: 'red' | 'amber' | 'emerald';
    wide?: boolean;
}> = ({ label, value, progress, valueTone, wide }) => {
    const toneClass = valueTone === 'red' ? 'text-red-300'
                    : valueTone === 'amber' ? 'text-amber-300'
                    : valueTone === 'emerald' ? 'text-emerald-300'
                    : 'text-slate-200';
    return (
        <div className={wide ? 'md:col-span-1 min-w-0' : 'min-w-0'}>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-sm ${toneClass} truncate`}>{value}</p>
            {progress !== undefined && (
                <div className="mt-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                </div>
            )}
        </div>
    );
};
