// =============================================================================
// AnalyticsDashboard.tsx — Shop Performance Analytics
//
// Tabs:
//   Operations  — order volume, cycle time, on-time rate, status breakdown
//   Financial   — revenue vs cost trend, margin by aircraft, scope creep
//   Tools       — calibration status, overdue/expiring, cal timeline
//   Efficiency  — shop utilisation trend (billable vs presence) — NO tech hours
//                 (tech hours lives in Personnel; this shows shop-wide efficiency)
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { WorkOrder, RepairOrder, Aircraft, InventoryItem, Tool, TimeLog, Technician } from '../types.ts';
import { PageHeader, TabBar, SectionCard, AlertBanner } from './ui.tsx';
import { ChartPieIcon, WrenchIcon, ClipboardListIcon, CurrencyDollarIcon, ClockIcon, ExclamationTriangleIcon } from './icons.tsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

interface AnalyticsDashboardProps {
    technicians:    Technician[];
    generalTimeLogs:TimeLog[];
    workOrders:     WorkOrder[];
    repairOrders:   RepairOrder[];
    aircraftList:   Aircraft[];
    partsInventory: InventoryItem[];
    tools:          Tool[];
}

type Tab      = 'operations' | 'financial' | 'tools' | 'efficiency';
type DateRange = '30d' | '90d' | '6m' | '1y' | 'all';

// ── Shared chart defaults ──────────────────────────────────────────────────────
const CHART_OPTS = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
    },
    scales: {
        x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    },
};

const STACKED_OPTS = {
    ...CHART_OPTS,
    scales: {
        ...CHART_OPTS.scales,
        x: { ...CHART_OPTS.scales.x, stacked: true },
        y: { ...CHART_OPTS.scales.y, stacked: true },
    },
};

const COLORS = {
    sky:     'rgba(56,189,248,0.75)',
    emerald: 'rgba(52,211,153,0.75)',
    amber:   'rgba(251,191,36,0.75)',
    red:     'rgba(248,113,113,0.75)',
    purple:  'rgba(167,139,250,0.75)',
    slate:   'rgba(148,163,184,0.4)',
};

// ── KPI card ───────────────────────────────────────────────────────────────────
const KPI: React.FC<{ label: string; value: string | number; sub?: string; tone?: 'sky'|'emerald'|'amber'|'red'|'slate' }> =
    ({ label, value, sub, tone = 'slate' }) => {
    const t = {
        sky:     'text-sky-300',
        emerald: 'text-emerald-300',
        amber:   'text-amber-300',
        red:     'text-red-300',
        slate:   'text-white',
    }[tone];
    return (
        <SectionCard padding="md">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-3xl font-light ${t}`}>{value}</p>
            {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
        </SectionCard>
    );
};

// ── Date helpers ──────────────────────────────────────────────────────────────
function cutoff(range: DateRange): Date | null {
    if (range === 'all') return null;
    const d = new Date();
    const days: Record<DateRange, number> = { '30d': 30, '90d': 90, '6m': 180, '1y': 365, 'all': 0 };
    d.setDate(d.getDate() - days[range]);
    return d;
}

function monthLabel(iso: string) {
    return new Date(iso + '-02').toLocaleString('default', { month: 'short', year: '2-digit' });
}

function lastNMonths(n: number): string[] {
    const months: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        months.push(d.toISOString().slice(0, 7));
    }
    return months;
}

// =============================================================================
// TAB: Operations
// =============================================================================
const OperationsTab: React.FC<{
    workOrders:  WorkOrder[];
    repairOrders:RepairOrder[];
    dateRange:   DateRange;
}> = ({ workOrders, repairOrders, dateRange }) => {
    const cut = cutoff(dateRange);
    const all = [...workOrders, ...repairOrders];

    const filtered = useMemo(() => cut
        ? all.filter(o => {
            const d = 'scheduled_date' in o ? o.scheduled_date : o.created_date;
            return new Date(d) >= cut;
        })
        : all,
    [all, cut]);

    // Status breakdown
    const statusCounts = useMemo(() => {
        const m: Record<string, number> = { 'Completed': 0, 'In Progress': 0, 'Pending': 0, 'On Hold': 0, 'Cancelled': 0 };
        filtered.forEach(o => { m[o.status] = (m[o.status] || 0) + 1; });
        return m;
    }, [filtered]);

    const completed  = statusCounts['Completed'] || 0;
    const active     = (statusCounts['In Progress'] || 0) + (statusCounts['Pending'] || 0);
    const aogOrders  = filtered.filter(o => o.priority === 'aog').length;

    // Avg cycle time (completed orders only — scheduled_date to... use squawk completion)
    const avgCycleDays = useMemo(() => {
        const completedOrders = filtered.filter(o => o.status === 'Completed' && 'scheduled_date' in o);
        if (!completedOrders.length) return null;
        // Approximate: count squawk time logs span
        const spans = completedOrders.map(o => {
            const logs = o.squawks.flatMap(s => s.time_logs).filter(l => l.end_time);
            if (!logs.length) return null;
            const start = Math.min(...logs.map(l => new Date(l.start_time).getTime()));
            const end   = Math.max(...logs.map(l => new Date(l.end_time!).getTime()));
            return (end - start) / 86400000;
        }).filter((v): v is number => v !== null);
        return spans.length ? (spans.reduce((a, b) => a + b, 0) / spans.length).toFixed(1) : null;
    }, [filtered]);

    // Orders by month (last 6)
    const months = lastNMonths(6);
    const monthlyVolume = useMemo(() => {
        const wo: Record<string, number> = {};
        const ro: Record<string, number> = {};
        months.forEach(m => { wo[m] = 0; ro[m] = 0; });
        workOrders.forEach(o => {
            const m = o.scheduled_date.slice(0, 7);
            if (wo[m] !== undefined) wo[m]++;
        });
        repairOrders.forEach(o => {
            const m = o.created_date.slice(0, 7);
            if (ro[m] !== undefined) ro[m]++;
        });
        return {
            labels: months.map(monthLabel),
            datasets: [
                { label: 'Work Orders',   data: months.map(m => wo[m]), backgroundColor: COLORS.sky },
                { label: 'Repair Orders', data: months.map(m => ro[m]), backgroundColor: COLORS.purple },
            ],
        };
    }, [workOrders, repairOrders, months]);

    // Priority breakdown
    const priorityData = useMemo(() => {
        const counts = { aog: 0, urgent: 0, routine: 0 };
        filtered.forEach(o => { counts[o.priority as keyof typeof counts]++; });
        return {
            labels: ['AOG', 'Urgent', 'Routine'],
            datasets: [{
                data: [counts.aog, counts.urgent, counts.routine],
                backgroundColor: [COLORS.red, COLORS.amber, COLORS.slate],
                borderWidth: 0,
            }],
        };
    }, [filtered]);

    // Stage distribution across active squawks
    const stageData = useMemo(() => {
        const stages: Record<string, number> = {};
        all.filter(o => o.status === 'In Progress').forEach(o =>
            o.squawks.forEach(s => {
                const stage = s.stage || 'Unset';
                stages[stage] = (stages[stage] || 0) + 1;
            })
        );
        const entries = Object.entries(stages).sort((a, b) => b[1] - a[1]);
        return {
            labels: entries.map(e => e[0]),
            datasets: [{
                label: 'Active Squawks',
                data: entries.map(e => e[1]),
                backgroundColor: [COLORS.sky, COLORS.purple, COLORS.amber, COLORS.emerald, COLORS.red, COLORS.slate],
            }],
        };
    }, [all]);

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="Total Orders"    value={filtered.length}  sub="in selected range" />
                <KPI label="Completed"       value={completed}        sub={`${filtered.length ? Math.round(completed/filtered.length*100) : 0}% completion rate`} tone="emerald" />
                <KPI label="Active"          value={active}           sub="In Progress + Pending" tone="sky" />
                <KPI label="AOG Orders"      value={aogOrders}        sub="Requiring priority attention" tone={aogOrders > 0 ? 'red' : 'slate'} />
            </div>

            {avgCycleDays && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <KPI label="Avg Cycle Time" value={`${avgCycleDays}d`} sub="Completed orders" tone="sky" />
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <SectionCard padding="md" className="lg:col-span-2">
                    <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Monthly Order Volume</h4>
                    <div style={{ height: 260 }}><Bar data={monthlyVolume} options={STACKED_OPTS as any} /></div>
                </SectionCard>
                <SectionCard padding="md">
                    <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Priority Breakdown</h4>
                    <div style={{ height: 260 }}><Doughnut data={priorityData} options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { ...CHART_OPTS.plugins.legend, position: 'bottom' as const } } } as any} /></div>
                </SectionCard>
            </div>

            <SectionCard padding="md">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Active Squawk Stage Distribution</h4>
                <div style={{ height: 220 }}><Bar data={stageData} options={{ ...CHART_OPTS, indexAxis: 'y' } as any} /></div>
            </SectionCard>
        </div>
    );
};

// =============================================================================
// TAB: Financial
// =============================================================================
const FinancialTab: React.FC<{
    workOrders:  WorkOrder[];
    repairOrders:RepairOrder[];
    aircraftList:Aircraft[];
    dateRange:   DateRange;
}> = ({ workOrders, repairOrders, aircraftList, dateRange }) => {
    const cut  = cutoff(dateRange);
    const all  = [...workOrders, ...repairOrders];
    const filtered = cut ? all.filter(o => {
        const d = 'scheduled_date' in o ? o.scheduled_date : o.created_date;
        return new Date(d) >= cut;
    }) : all;

    const withQuotes = filtered.filter(o => (o.quoted_total ?? 0) > 0);

    // Revenue KPIs
    const totalQuoted  = withQuotes.reduce((s, o) => s + (o.quoted_total ?? 0), 0);
    const completedRev = withQuotes.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.quoted_total ?? 0), 0);
    const avgOrderVal  = withQuotes.length ? totalQuoted / withQuotes.length : 0;

    const fmtUsd = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

    // Monthly revenue trend (last 8 months)
    const months = lastNMonths(8);
    const revTrend = useMemo(() => {
        const quoted:    Record<string, number> = {};
        const completed: Record<string, number> = {};
        const parts:     Record<string, number> = {};
        months.forEach(m => { quoted[m] = 0; completed[m] = 0; parts[m] = 0; });
        all.forEach(o => {
            const m = ('scheduled_date' in o ? o.scheduled_date : o.created_date).slice(0, 7);
            if (quoted[m] !== undefined) {
                quoted[m]    += o.quoted_total       ?? 0;
                parts[m]     += o.quoted_parts_total ?? 0;
                if (o.status === 'Completed') completed[m] += o.quoted_total ?? 0;
            }
        });
        return {
            labels: months.map(monthLabel),
            datasets: [
                { label: 'Quoted Revenue',    data: months.map(m => quoted[m]),    borderColor: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)',   fill: true, tension: 0.3 },
                { label: 'Completed Revenue', data: months.map(m => completed[m]), borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)',   fill: false, tension: 0.3 },
                { label: 'Parts Cost',        data: months.map(m => parts[m]),     borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)',  fill: false, tension: 0.3, borderDash: [4, 4] },
            ],
        };
    }, [all, months]);

    // Revenue by aircraft (top 5)
    const byAircraft = useMemo(() => {
        const m: Record<string, number> = {};
        all.forEach(o => {
            m[o.aircraft_id] = (m[o.aircraft_id] || 0) + (o.quoted_total ?? 0);
        });
        return Object.entries(m)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([id, val]) => {
                const ac = aircraftList.find(a => a.id === id);
                return { label: ac?.tail_number ?? id, value: val };
            });
    }, [all, aircraftList]);

    const byAircraftChart = {
        labels: byAircraft.map(x => x.label),
        datasets: [{ label: 'Quoted Revenue', data: byAircraft.map(x => x.value), backgroundColor: COLORS.sky, borderRadius: 4 }],
    };

    // Scope creep: orders where actual > quoted
    const scopeCreep = withQuotes.filter(o => {
        const logHrs = o.squawks.flatMap(s => s.time_logs).filter(l => l.end_time && l.is_billable)
            .reduce((s, l) => s + (new Date(l.end_time!).getTime() - new Date(l.start_time).getTime()) / 3600000, 0);
        return logHrs > (o.quoted_labor_hours ?? 999);
    });

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="Pipeline Value"  value={fmtUsd(totalQuoted)}  sub={`${withQuotes.length} quoted orders`} tone="sky" />
                <KPI label="Completed Rev."  value={fmtUsd(completedRev)} sub="This period" tone="emerald" />
                <KPI label="Avg Order Value" value={fmtUsd(avgOrderVal)}  sub="Across all quoted" />
                <KPI label="Scope Creep"     value={scopeCreep.length}    sub="Orders exceeding quoted hrs" tone={scopeCreep.length > 0 ? 'amber' : 'slate'} />
            </div>

            {scopeCreep.length > 0 && (
                <AlertBanner severity="warning" title={`${scopeCreep.length} order${scopeCreep.length > 1 ? 's' : ''} have logged more billable hours than quoted`}>
                    {scopeCreep.slice(0, 3).map(o => {
                        const id = 'wo_id' in o ? o.wo_id : o.ro_id;
                        return <p key={id} className="text-xs text-amber-200/60">{id} · {o.aircraft_tail_number}</p>;
                    })}
                </AlertBanner>
            )}

            {/* Revenue trend */}
            <SectionCard padding="md">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Revenue Trend — Monthly</h4>
                <div style={{ height: 280 }}><Line data={revTrend} options={CHART_OPTS as any} /></div>
            </SectionCard>

            {/* Revenue by aircraft */}
            <SectionCard padding="md">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Revenue by Aircraft (Top 6)</h4>
                <div style={{ height: 220 }}><Bar data={byAircraftChart} options={CHART_OPTS as any} /></div>
            </SectionCard>
        </div>
    );
};

// =============================================================================
// TAB: Tool Calibration
// =============================================================================
const ToolsTab: React.FC<{ tools: Tool[] }> = ({ tools }) => {
    const today = new Date();

    const withCal = tools.filter(t => t.calibrationRequired);
    const overdue = withCal.filter(t => {
        if (!t.calibrationDueDate) return false;
        return new Date(t.calibrationDueDate) < today;
    });
    const due30 = withCal.filter(t => {
        if (!t.calibrationDueDate) return false;
        const d = new Date(t.calibrationDueDate);
        const diff = (d.getTime() - today.getTime()) / 86400000;
        return diff >= 0 && diff <= 30;
    });
    const due90 = withCal.filter(t => {
        if (!t.calibrationDueDate) return false;
        const d = new Date(t.calibrationDueDate);
        const diff = (d.getTime() - today.getTime()) / 86400000;
        return diff > 30 && diff <= 90;
    });
    const current = withCal.filter(t => {
        if (!t.calibrationDueDate) return false;
        const diff = (new Date(t.calibrationDueDate).getTime() - today.getTime()) / 86400000;
        return diff > 90;
    });
    const noDue = withCal.filter(t => !t.calibrationDueDate);

    // Cal status donut
    const statusChart = {
        labels: ['Overdue', 'Due < 30d', 'Due < 90d', 'Current', 'No Date'],
        datasets: [{
            data: [overdue.length, due30.length, due90.length, current.length, noDue.length],
            backgroundColor: [COLORS.red, COLORS.amber, COLORS.sky, COLORS.emerald, COLORS.slate],
            borderWidth: 0,
        }],
    };

    // Tool cal timeline — next 90 days by month
    const months = lastNMonths(3).concat([
        new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 7),
        new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString().slice(0, 7),
        new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().slice(0, 7),
    ]);
    const calTimeline = useMemo(() => {
        const m: Record<string, number> = {};
        months.forEach(mo => { m[mo] = 0; });
        withCal.forEach(t => {
            if (t.calibrationDueDate) {
                const mo = t.calibrationDueDate.slice(0, 7);
                if (m[mo] !== undefined) m[mo]++;
            }
        });
        const isOverdue = (mo: string) => mo < today.toISOString().slice(0, 7);
        return {
            labels: months.map(monthLabel),
            datasets: [{
                label: 'Cal Due',
                data: months.map(mo => m[mo] || 0),
                backgroundColor: months.map(mo =>
                    isOverdue(mo) ? COLORS.red :
                    mo === today.toISOString().slice(0, 7) ? COLORS.amber : COLORS.sky
                ),
                borderRadius: 4,
            }],
        };
    }, [withCal, months]);

    // Tool category breakdown
    const byCategory = useMemo(() => {
        const m: Record<string, number> = {};
        tools.forEach(t => {
            const cat = (t as any).category || 'Uncategorised';
            m[cat] = (m[cat] || 0) + 1;
        });
        const entries = Object.entries(m).sort((a, b) => b[1] - a[1]);
        return {
            labels: entries.map(e => e[0]),
            datasets: [{ label: 'Tools', data: entries.map(e => e[1]), backgroundColor: COLORS.sky, borderRadius: 4 }],
        };
    }, [tools]);

    return (
        <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="Requires Cal."  value={withCal.length}  sub={`of ${tools.length} total tools`} />
                <KPI label="Overdue"        value={overdue.length}  sub="Past calibration date" tone={overdue.length > 0 ? 'red' : 'slate'} />
                <KPI label="Due < 30 Days"  value={due30.length}    sub="Immediate action needed" tone={due30.length > 0 ? 'amber' : 'slate'} />
                <KPI label="Due < 90 Days"  value={due90.length}    sub="Schedule soon" tone={due90.length > 0 ? 'sky' : 'slate'} />
            </div>

            {overdue.length > 0 && (
                <AlertBanner severity="critical" title={`${overdue.length} tool${overdue.length > 1 ? 's' : ''} past calibration date — remove from service`}>
                    {overdue.slice(0, 5).map(t => (
                        <p key={t.id} className="text-xs text-red-200/60">{t.name} · {t.serialNumber || 'No S/N'} · Due: {t.calibrationDueDate}</p>
                    ))}
                </AlertBanner>
            )}
            {due30.length > 0 && (
                <AlertBanner severity="warning" title={`${due30.length} tool${due30.length > 1 ? 's' : ''} due for calibration within 30 days`}>
                    {due30.slice(0, 3).map(t => (
                        <p key={t.id} className="text-xs text-amber-200/60">{t.name} · Due: {t.calibrationDueDate}</p>
                    ))}
                </AlertBanner>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <SectionCard padding="md">
                    <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Calibration Status</h4>
                    <div style={{ height: 240 }}>
                        <Doughnut data={statusChart} options={{
                            ...CHART_OPTS,
                            plugins: { ...CHART_OPTS.plugins, legend: { ...CHART_OPTS.plugins.legend, position: 'bottom' as const } },
                        } as any} />
                    </div>
                </SectionCard>
                <SectionCard padding="md" className="lg:col-span-2">
                    <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Calibration Due Timeline</h4>
                    <div style={{ height: 240 }}><Bar data={calTimeline} options={CHART_OPTS as any} /></div>
                </SectionCard>
            </div>

            {/* Overdue detail table */}
            {overdue.length > 0 && (
                <SectionCard padding="none">
                    <div className="px-4 pt-3 pb-1">
                        <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider">Overdue Tool Detail</h4>
                    </div>
                    <div className="divide-y divide-white/5">
                        {overdue.map(t => {
                            const days = Math.abs(Math.round((new Date(t.calibrationDueDate!).getTime() - today.getTime()) / 86400000));
                            return (
                                <div key={t.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{t.name}</p>
                                        <p className="text-xs text-slate-500">{t.serialNumber || 'No S/N'} · {(t as any).category || 'Uncategorised'}</p>
                                    </div>
                                    <span className="text-xs font-mono text-red-400">{days}d overdue</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/25">Remove from service</span>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            )}

            {/* Tool inventory by category */}
            <SectionCard padding="md">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Tooling Inventory by Category</h4>
                <div style={{ height: 200 }}><Bar data={byCategory} options={{ ...CHART_OPTS, indexAxis: 'y' } as any} /></div>
            </SectionCard>
        </div>
    );
};

// =============================================================================
// TAB: Shop Efficiency  (shop-wide only — tech-level detail is in Personnel)
// =============================================================================
const EfficiencyTab: React.FC<{
    generalTimeLogs: TimeLog[];
    technicians:     Technician[];
    workOrders:      WorkOrder[];
    dateRange:       DateRange;
}> = ({ generalTimeLogs, technicians, workOrders, dateRange }) => {
    const cut = cutoff(dateRange);
    const logs = cut
        ? generalTimeLogs.filter(l => new Date(l.start_time) >= cut)
        : generalTimeLogs;

    const months = lastNMonths(6);

    // Shop-wide billable vs presence by month
    const efficiencyTrend = useMemo(() => {
        const presence: Record<string, number> = {};
        const billable:  Record<string, number> = {};
        months.forEach(m => { presence[m] = 0; billable[m] = 0; });
        logs.forEach(l => {
            if (!l.end_time) return;
            const m    = l.start_time.slice(0, 7);
            const hrs  = (new Date(l.end_time).getTime() - new Date(l.start_time).getTime()) / 3600000;
            if (presence[m] !== undefined) {
                presence[m] += hrs;
                if (l.is_billable) billable[m] += hrs;
            }
        });
        const efficiency = months.map(m => presence[m] > 0 ? Math.round(billable[m] / presence[m] * 100) : 0);
        return {
            labels: months.map(monthLabel),
            datasets: [
                { label: 'Presence Hours',  data: months.map(m => +presence[m].toFixed(1)), backgroundColor: COLORS.slate, borderRadius: 3 },
                { label: 'Billable Hours',  data: months.map(m => +billable[m].toFixed(1)),  backgroundColor: COLORS.sky,   borderRadius: 3 },
                { label: 'Efficiency %',    data: efficiency, type: 'line' as const, borderColor: COLORS.emerald, backgroundColor: 'transparent', yAxisID: 'y1', tension: 0.3 },
            ],
        };
    }, [logs, months]);

    const effOpts = {
        ...STACKED_OPTS,
        scales: {
            ...STACKED_OPTS.scales,
            y:  { ...STACKED_OPTS.scales.y, stacked: true },
            y1: { position: 'right' as const, ticks: { color: '#64748b', callback: (v: number) => `${v}%` }, grid: { display: false } },
        },
    };

    // Overall KPIs
    const totalPresence = logs.filter(l => l.end_time).reduce((s, l) =>
        s + (new Date(l.end_time!).getTime() - new Date(l.start_time).getTime()) / 3600000, 0);
    const totalBillable = logs.filter(l => l.end_time && l.is_billable).reduce((s, l) =>
        s + (new Date(l.end_time!).getTime() - new Date(l.start_time).getTime()) / 3600000, 0);
    const overallEff = totalPresence > 0 ? Math.round(totalBillable / totalPresence * 100) : 0;

    // WO completion rate
    const completedWO = workOrders.filter(o => o.status === 'Completed').length;
    const completionRate = workOrders.length > 0 ? Math.round(completedWO / workOrders.length * 100) : 0;

    return (
        <div className="space-y-5">
            <div className="flex items-start gap-3 px-4 py-3 bg-sky-500/5 border border-sky-500/15 rounded-xl text-xs text-slate-400">
                <ClockIcon className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                Shop-wide efficiency. Individual technician breakdown is in <strong className="text-slate-300 ml-0.5">Personnel → Technician Hours</strong>.
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI label="Billable Efficiency" value={`${overallEff}%`} sub="Billable / Presence hrs" tone={overallEff >= 75 ? 'emerald' : overallEff >= 55 ? 'sky' : 'amber'} />
                <KPI label="Total Billable"   value={`${totalBillable.toFixed(0)}h`}  sub="In selected range" tone="sky" />
                <KPI label="Total Presence"   value={`${totalPresence.toFixed(0)}h`}  sub="Shop-floor time" />
                <KPI label="WO Completion"    value={`${completionRate}%`} sub={`${completedWO} of ${workOrders.length} orders`} tone={completionRate >= 70 ? 'emerald' : 'amber'} />
            </div>

            <SectionCard padding="md">
                <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4">Monthly Shop Efficiency</h4>
                <div style={{ height: 300 }}><Bar data={efficiencyTrend} options={effOpts as any} /></div>
            </SectionCard>
        </div>
    );
};

// =============================================================================
// Main component
// =============================================================================
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    technicians, generalTimeLogs, workOrders, repairOrders, aircraftList, partsInventory, tools,
}) => {
    const [tab,       setTab]       = useState<Tab>('operations');
    const [dateRange, setDateRange] = useState<DateRange>('90d');

    const overdueCount = tools.filter(t => t.calibrationRequired && t.calibrationDueDate && new Date(t.calibrationDueDate) < new Date()).length;

    return (
        <div className="space-y-5 max-w-7xl">
            <PageHeader
                title="Analytics"
                icon={<ChartPieIcon className="w-5 h-5" />}
                actions={
                    <select value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500">
                        <option value="30d"  className="bg-slate-900">Last 30 days</option>
                        <option value="90d"  className="bg-slate-900">Last 90 days</option>
                        <option value="6m"   className="bg-slate-900">Last 6 months</option>
                        <option value="1y"   className="bg-slate-900">Last year</option>
                        <option value="all"  className="bg-slate-900">All time</option>
                    </select>
                }
            />

            <TabBar
                tabs={[
                    { id: 'operations', label: 'Operations',    icon: <ClipboardListIcon className="w-3.5 h-3.5" /> },
                    { id: 'financial',  label: 'Financial',     icon: <CurrencyDollarIcon className="w-3.5 h-3.5" /> },
                    { id: 'tools',      label: 'Tool Cal.',     icon: <WrenchIcon className="w-3.5 h-3.5" />, badge: overdueCount || undefined },
                    { id: 'efficiency', label: 'Efficiency',    icon: <ClockIcon className="w-3.5 h-3.5" /> },
                ]}
                active={tab}
                onChange={t => setTab(t as Tab)}
            />

            {tab === 'operations' && <OperationsTab workOrders={workOrders} repairOrders={repairOrders} dateRange={dateRange} />}
            {tab === 'financial'  && <FinancialTab  workOrders={workOrders} repairOrders={repairOrders} aircraftList={aircraftList} dateRange={dateRange} />}
            {tab === 'tools'      && <ToolsTab tools={tools} />}
            {tab === 'efficiency' && <EfficiencyTab generalTimeLogs={generalTimeLogs} technicians={technicians} workOrders={workOrders} dateRange={dateRange} />}
        </div>
    );
};
