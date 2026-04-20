// =============================================================================
// ProfitabilityPanel — inline panel embedded in WorkOrderDetail & RepairOrderDetail
// Shows live burn rate, completion %, margin projection, and scope-creep alerts.
// =============================================================================
import React, { useState, useMemo } from 'react';
import { WorkOrder, RepairOrder, InventoryItem } from '../types.ts';
import { useSettings } from '../contexts/SettingsContext.tsx';
import { computeProfitability, fmtUsd } from '../utils/profitabilityEngine.ts';
import {
    CurrencyDollarIcon, ExclamationTriangleIcon, CheckBadgeIcon, ClockIcon,
} from './icons.tsx';

interface Props {
    order:     WorkOrder | RepairOrder;
    inventory: InventoryItem[];
}

export const ProfitabilityPanel: React.FC<Props> = ({ order, inventory }) => {
    const { settings } = useSettings();
    const [expanded, setExpanded] = useState(false);

    const m = useMemo(
        () => computeProfitability(order, inventory, settings),
        [order, inventory, settings]
    );

    const statusStyles = {
        healthy:  { bg: 'bg-emerald-500/5  border-emerald-500/20', icon: <CheckBadgeIcon          className="w-3.5 h-3.5 text-emerald-400" />, text: 'text-emerald-400' },
        warning:  { bg: 'bg-amber-500/5    border-amber-500/20',   icon: <ClockIcon               className="w-3.5 h-3.5 text-amber-400" />,   text: 'text-amber-400' },
        critical: { bg: 'bg-red-500/10     border-red-500/30',     icon: <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400" />,     text: 'text-red-400' },
        complete: { bg: 'bg-sky-500/5      border-sky-500/20',     icon: <CheckBadgeIcon          className="w-3.5 h-3.5 text-sky-400" />,     text: 'text-sky-400' },
    } as const;

    const s = statusStyles[m.status];

    // Don't render the panel at all if there's absolutely no data
    if (m.quotedHours === 0 && m.actualHours === 0) return null;

    return (
        <div className="mt-5 pt-4 border-t border-white/5">
            <button
                onClick={() => setExpanded(p => !p)}
                className="w-full flex items-center justify-between text-sm hover:text-white transition-colors">
                <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-slate-500">
                    <CurrencyDollarIcon className="w-3.5 h-3.5" />
                    Profitability — {m.completionPercent}% complete · {m.actualHours.toFixed(1)}h of {m.quotedHours.toFixed(1)}h quoted
                </span>
                <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-xs ${s.text}`}>
                        {s.icon}{m.statusReason}
                    </span>
                    <span className="text-slate-500 text-xs">{expanded ? '▲' : '▼'}</span>
                </div>
            </button>

            {expanded && (
                <div className="mt-3 space-y-3">
                    {/* ── Top metric cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard
                            label="Hours"
                            primary={`${m.actualHours.toFixed(1)} / ${m.quotedHours.toFixed(1)}`}
                            secondary={`${(m.burnRate * 100).toFixed(0)}% used`}
                            tone={m.burnRate > 1 ? 'red' : m.burnRate > 0.85 ? 'amber' : 'slate'}
                        />
                        <MetricCard
                            label="Completion"
                            primary={`${m.completionPercent}%`}
                            secondary="weighted by hours"
                            tone={m.completionPercent === 100 ? 'emerald' : 'sky'}
                            progress={m.completionPercent}
                        />
                        <MetricCard
                            label="Labor Cost"
                            primary={fmtUsd(m.actualLaborCost)}
                            secondary={`@ ${fmtUsd(m.burdenedRate)}/hr burdened`}
                            tone="slate"
                        />
                        <MetricCard
                            label="Proj. Margin"
                            primary={`${m.projectedMarginPct.toFixed(1)}%`}
                            secondary={fmtUsd(m.projectedMargin)}
                            tone={m.projectedMarginPct < 0 ? 'red' : m.projectedMarginPct < 10 ? 'amber' : 'emerald'}
                        />
                    </div>

                    {/* ── Banner if over-burning ── */}
                    {m.isOverBurning && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${s.bg} border`}>
                            <ExclamationTriangleIcon className={`w-4 h-4 flex-shrink-0 ${s.text}`} />
                            <span className={s.text}>
                                <strong>Scope Creep Alert:</strong> {(m.burnRate * 100).toFixed(0)}% of hours used but only {m.completionPercent}% complete.
                                {' '}Review scope or technician efficiency before margin is lost.
                            </span>
                        </div>
                    )}

                    {/* ── Detailed breakdown ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <BreakdownBlock title="Revenue (quoted)" rows={[
                            ['Labor',             fmtUsd(m.quotedLaborRevenue)],
                            ['Parts',             fmtUsd(m.quotedPartsRevenue)],
                            ['Total Revenue',     fmtUsd(m.quotedLaborRevenue + m.quotedPartsRevenue)],
                        ]} />
                        <BreakdownBlock title="Cost (actual / projected)" rows={[
                            ['Labor to date',     fmtUsd(m.actualLaborCost)],
                            ['Parts to date',     fmtUsd(m.actualPartsCost)],
                            ['Projected margin',  fmtUsd(m.projectedMargin)],
                        ]} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Sub-components ──────────────────────────────────────────────────────────

const MetricCard: React.FC<{
    label:     string;
    primary:   string;
    secondary: string;
    tone:      'red' | 'amber' | 'emerald' | 'sky' | 'slate';
    progress?: number;
}> = ({ label, primary, secondary, tone, progress }) => {
    const toneMap = {
        red:     'text-red-300',
        amber:   'text-amber-300',
        emerald: 'text-emerald-300',
        sky:     'text-sky-300',
        slate:   'text-slate-200',
    };
    const barToneMap = {
        red:     'bg-red-400',
        amber:   'bg-amber-400',
        emerald: 'bg-emerald-400',
        sky:     'bg-sky-400',
        slate:   'bg-slate-400',
    };
    return (
        <div className="bg-white/3 border border-white/5 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-light mt-0.5 ${toneMap[tone]}`}>{primary}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{secondary}</p>
            {progress !== undefined && (
                <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${barToneMap[tone]} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                </div>
            )}
        </div>
    );
};

const BreakdownBlock: React.FC<{ title: string; rows: [string, string][] }> = ({ title, rows }) => (
    <div className="bg-white/3 border border-white/5 rounded-lg px-3 py-2.5">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">{title}</p>
        <div className="space-y-1">
            {rows.map(([label, value], i) => (
                <div key={label} className={`flex justify-between ${i === rows.length - 1 ? 'pt-1 border-t border-white/5 text-slate-200 font-medium' : 'text-slate-400'}`}>
                    <span>{label}</span>
                    <span className="font-mono">{value}</span>
                </div>
            ))}
        </div>
    </div>
);
