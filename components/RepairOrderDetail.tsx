import React, { useState, useMemo } from 'react';
import { RepairOrder, Aircraft, Technician, InventoryItem, Tool } from '../types.ts';
import { SquawkDetailView } from './SquawkDetailView.tsx';
import { Permissions } from '../hooks/usePermissions.ts';
import { QuoteModal } from './QuoteModal.tsx';
import { compareToolsClientSide } from '../services/geminiService.ts';
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
}

export const RepairOrderDetail: React.FC<RepairOrderDetailProps> = ({
    order, aircraft, technicians, inventory, tools, onBack, onUpdateOrder, permissions,
}) => {
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [showToolPlan, setShowToolPlan] = useState(false);

    // ── Tool planning summary (mirrors WorkOrderDetail) ───────────────────
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
            total:       neededTools.length,
            available:   result.available.length,
            shortage:    result.shortage.length,
            overdue:     overdueTools.length,
            details:     neededTools,
        };
    }, [order.squawks, tools]);

    const priorityColors: Record<string, string> = {
        aog:     'text-red-400 bg-red-500/10 border-red-500/30',
        urgent:  'text-amber-400 bg-amber-500/10 border-amber-500/30',
        routine: 'text-slate-400 bg-white/5 border-white/10',
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <button onClick={onBack}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors w-fit flex items-center gap-1">
                &larr; Back to Repair Orders
            </button>

            {/* ── RO header ── */}
            <div className="glass-panel rounded-xl p-6 border border-white/5 flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
                    <div>
                        <h2 className="text-3xl font-light text-white tracking-wide">
                            RO: <span className="font-mono font-normal text-amber-400">{order.ro_id}</span>
                        </h2>
                        <p className="text-slate-400 mt-1">{order.description}</p>
                    </div>
                    {permissions.canEditBilling && (
                        <button onClick={() => setIsQuoteModalOpen(true)}
                            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium py-2 px-4 rounded-lg text-sm transition-all">
                            <CurrencyDollarIcon className="w-4 h-4" /> Generate Quote
                        </button>
                    )}
                </div>

                {/* Meta */}
                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    {[
                        { label: 'Aircraft', value: order.aircraft_tail_number },
                        { label: 'Created',  value: new Date(order.created_date).toLocaleDateString() },
                        { label: 'Status',   value: order.status },
                        { label: 'Priority', value: order.priority.toUpperCase() },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                            <p className={`text-xl font-light ${label === 'Priority' ? (priorityColors[order.priority] || 'text-white') : 'text-white'}`}>
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ── Tool Planning Summary ── */}
                {toolPlan.total > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/5">
                        <button onClick={() => setShowToolPlan(p => !p)}
                            className="w-full flex items-center justify-between text-sm text-slate-300 hover:text-white transition-colors">
                            <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-slate-500">
                                <WrenchIcon className="w-3.5 h-3.5" />
                                Tool Planning — {toolPlan.total} tool{toolPlan.total !== 1 ? 's' : ''} required
                            </span>
                            <div className="flex items-center gap-3">
                                {toolPlan.overdue > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-red-400">
                                        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                        {toolPlan.overdue} cal overdue
                                    </span>
                                )}
                                {toolPlan.shortage > 0 && (
                                    <span className="text-xs text-amber-400">{toolPlan.shortage} not in inventory</span>
                                )}
                                {toolPlan.shortage === 0 && toolPlan.overdue === 0 && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                                        <CheckBadgeIcon className="w-3.5 h-3.5" /> All tools available
                                    </span>
                                )}
                                <span className="text-slate-500 text-xs">{showToolPlan ? '▲' : '▼'}</span>
                            </div>
                        </button>

                        {showToolPlan && (
                            <div className="mt-3 grid gap-1.5 max-h-48 overflow-y-auto">
                                {toolPlan.details.map(tool => {
                                    const days = tool.calibrationDueDays ?? (tool.calibrationDueDate
                                        ? Math.round((new Date(tool.calibrationDueDate).getTime() - Date.now()) / 86400000)
                                        : undefined);
                                    const isOverdue = tool.calibrationRequired && days !== undefined && days < 0;
                                    const isDueSoon = tool.calibrationRequired && days !== undefined && days >= 0 && days < 30;
                                    return (
                                        <div key={tool.id}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm
                                                ${isOverdue  ? 'bg-red-500/10 border border-red-500/20'
                                                : isDueSoon  ? 'bg-amber-500/10 border border-amber-500/20'
                                                : 'bg-white/3 border border-white/5'}`}>
                                            <div>
                                                <span className="text-slate-200">{tool.name}</span>
                                                <span className="text-slate-500 text-xs font-mono ml-2">{tool.id}</span>
                                            </div>
                                            <div className="text-xs">
                                                {isOverdue  && <span className="text-red-400 font-semibold">Cal overdue {Math.abs(days!)}d</span>}
                                                {isDueSoon  && <span className="text-amber-400">Cal due {days}d</span>}
                                                {!isOverdue && !isDueSoon && tool.calibrationRequired && <span className="text-emerald-400">Cal OK</span>}
                                                {!tool.calibrationRequired && <span className="text-slate-600">No cal required</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Squawks ── */}
            <div>
                <h3 className="text-lg font-light text-white uppercase tracking-wider mb-4">Tasks / Squawks</h3>
                <div className="space-y-4 pb-10">
                    {order.squawks.map(squawk => (
                        <SquawkDetailView
                            key={squawk.squawk_id}
                            squawk={squawk}
                            order={order}
                            aircraft={aircraft}
                            technicians={technicians}
                            inventory={inventory}
                            tools={tools}
                            onUpdateOrder={onUpdateOrder}
                            permissions={permissions}
                        />
                    ))}
                </div>
            </div>

            <QuoteModal
                isOpen={isQuoteModalOpen}
                onClose={() => setIsQuoteModalOpen(false)}
                order={order}
                aircraft={aircraft}
                inventory={inventory}
            />
        </div>
    );
};
