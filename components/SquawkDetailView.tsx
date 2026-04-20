import React, { useState } from 'react';
import { Squawk, WorkOrder, RepairOrder, Aircraft, Technician, InventoryItem, Tool, Signature } from '../types.ts';
import {
    ClockIcon, CogIcon, UserGroupIcon, WrenchIcon, BeakerIcon, PencilIcon, PlusIcon,
    CheckBadgeIcon, LockClosedIcon, SparklesIcon, TrashIcon, ExclamationTriangleIcon,
    ChartBarIcon,
} from './icons.tsx';
import TimeLogModal from './TimeLogModal.tsx';
import AssignPartModal from './AssignPartModal.tsx';
import AssignToolModal from './AssignToolModal.tsx';
import { SquawkAdminModal } from './SquawkAdminModal.tsx';
import { SignatureConfirmationModal } from './SignatureConfirmationModal.tsx';
import { TroubleshootingGuideModal } from './TroubleshootingGuideModal.tsx';
import { Permissions } from '../hooks/usePermissions.ts';
import { predictToolsFromJob } from '../services/geminiService.ts';
import { useToast } from '../contexts/ToastContext.tsx';

interface SquawkDetailViewProps {
    squawk: Squawk;
    order: WorkOrder | RepairOrder;
    aircraft: Aircraft;
    technicians: Technician[];
    inventory: InventoryItem[];
    tools: Tool[];
    onUpdateOrder: (updatedOrder: WorkOrder | RepairOrder) => void;
    permissions: Permissions;
}

const CURRENT_USER_ID = 'tech-1';

// ── Calibration status pill used in the tools list ──────────────────────────
const CalPill: React.FC<{ tool: Tool }> = ({ tool }) => {
    if (!tool.calibrationRequired) return null;
    const days = tool.calibrationDueDays ?? (tool.calibrationDueDate
        ? Math.round((new Date(tool.calibrationDueDate).getTime() - Date.now()) / 86400000)
        : undefined);
    if (days === undefined) return <span className="text-[10px] text-amber-400 ml-1">(cal unknown)</span>;
    if (days < 0)  return <span className="text-[10px] font-semibold text-red-400 ml-1">(overdue {Math.abs(days)}d)</span>;
    if (days < 30) return <span className="text-[10px] text-amber-400 ml-1">(due {days}d)</span>;
    return <span className="text-[10px] text-emerald-400 ml-1">(cal ok)</span>;
};

export const SquawkDetailView: React.FC<SquawkDetailViewProps> = ({
    squawk, order, aircraft, technicians, inventory, tools, onUpdateOrder, permissions
}) => {
    const { showToast } = useToast();
    const [isTimeLogPanelOpen,    setIsTimeLogPanelOpen]    = useState(false);
    const [isAssignPartPanelOpen, setIsAssignPartPanelOpen] = useState(false);
    const [isAssignToolPanelOpen, setIsAssignToolPanelOpen] = useState(false);
    const [isSquawkAdminModalOpen,setIsSquawkAdminModalOpen]= useState(false);
    const [isSignatureModalOpen,  setIsSignatureModalOpen]  = useState<keyof Squawk['signatures'] | null>(null);
    const [isTroubleshootingModalOpen, setIsTroubleshootingModalOpen] = useState(false);
    const [troubleshootingGuide,  setTroubleshootingGuide]  = useState('');
    const [isTroubleshootingLoading, setIsTroubleshootingLoading] = useState(false);
    const [isSuggestingTools,     setIsSuggestingTools]     = useState(false);

    const currentUser = technicians.find(t => t.id === CURRENT_USER_ID)!;

    // Resolved objects for display
    const assignedTools = squawk.used_tool_ids
        .map(id => tools.find(t => t.id === id))
        .filter((t): t is Tool => !!t);

    const assignedTechs = squawk.assigned_technician_ids
        .map(id => technicians.find(t => t.id === id))
        .filter((t): t is Technician => !!t);

    const usedPartItems = squawk.used_parts.map(up => ({
        part: inventory.find(p => p.id === up.inventory_item_id),
        quantity: up.quantity_used,
        inventoryItemId: up.inventory_item_id,
    }));

    const totalLoggedHours = squawk.time_logs.reduce((sum, log) => {
        if (!log.end_time) return sum;
        return sum + (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 3600000;
    }, 0);

    // ── Handlers ────────────────────────────────────────────────────────────
    const handleUpdateSquawk = (updatedSquawk: Squawk) => {
        const updatedSquawks = order.squawks.map(s =>
            s.squawk_id === updatedSquawk.squawk_id ? updatedSquawk : s
        );
        onUpdateOrder({ ...order, squawks: updatedSquawks });
    };

    const handleLogTime = (log: Omit<typeof squawk.time_logs[0], 'log_id'>) => {
        handleUpdateSquawk({ ...squawk, time_logs: [...squawk.time_logs, { ...log, log_id: `log-${Date.now()}` }] });
    };

    const handleAssignPart = (partId: string, quantity: number) => {
        handleUpdateSquawk({ ...squawk, used_parts: [...squawk.used_parts, { inventory_item_id: partId, quantity_used: quantity }] });
        setIsAssignPartPanelOpen(false);
    };

    const handleAssignTool = (toolId: string) => {
        if (squawk.used_tool_ids.includes(toolId)) {
            showToast({ message: 'Tool already assigned to this squawk.', type: 'info' });
            setIsAssignToolPanelOpen(false);
            return;
        }
        handleUpdateSquawk({ ...squawk, used_tool_ids: [...squawk.used_tool_ids, toolId] });
        setIsAssignToolPanelOpen(false);
        showToast({ message: `Tool assigned to squawk.`, type: 'success' });
    };

    const handleRemoveTool = (toolId: string) => {
        handleUpdateSquawk({ ...squawk, used_tool_ids: squawk.used_tool_ids.filter(id => id !== toolId) });
    };

    const handleRemovePart = (inventoryItemId: string) => {
        handleUpdateSquawk({ ...squawk, used_parts: squawk.used_parts.filter(p => p.inventory_item_id !== inventoryItemId) });
    };

    const handleSign = (signatureType: keyof Squawk['signatures']) => {
        const newSignature: Signature = { technician_id: currentUser.id, signed_at: new Date().toISOString() };
        handleUpdateSquawk({ ...squawk, signatures: { ...squawk.signatures, [signatureType]: newSignature } });
        setIsSignatureModalOpen(null);
    };

    // ── AI: suggest tools from squawk description ────────────────────────────
    const handleSuggestTools = async () => {
        if (!squawk.description.trim()) return;
        setIsSuggestingTools(true);
        try {
            const predicted = await predictToolsFromJob(
                `${squawk.description} on ${aircraft.make} ${aircraft.model}`,
                tools
            );
            // Add predicted tools that exist in the master inventory by name match
            const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.]/g, '');
            let added = 0;
            const newIds = [...squawk.used_tool_ids];
            for (const pred of predicted) {
                const match = tools.find(t =>
                    norm(t.name).includes(norm(pred.name)) ||
                    norm(pred.name).includes(norm(t.name))
                );
                if (match && !newIds.includes(match.id)) {
                    newIds.push(match.id);
                    added++;
                }
            }
            if (added > 0) {
                handleUpdateSquawk({ ...squawk, used_tool_ids: newIds });
                showToast({ message: `AI matched ${added} tool${added > 1 ? 's' : ''} from inventory.`, type: 'success' });
            } else {
                showToast({ message: 'No inventory matches found for predicted tools. Try adding manually.', type: 'info' });
            }
        } catch (err: any) {
            showToast({ message: `AI error: ${err.message}`, type: 'error' });
        } finally {
            setIsSuggestingTools(false);
        }
    };

    const handleGenerateTroubleshootingGuide = async () => {
        setIsTroubleshootingModalOpen(true);
        setIsTroubleshootingLoading(true);
        await new Promise(res => setTimeout(res, 1800));
        setTroubleshootingGuide(
            `## Troubleshooting: ${squawk.description}\n\n` +
            `Based on **${aircraft.make} ${aircraft.model}** and reported issue:\n\n` +
            `1. **Visual Inspection** — Check for obvious signs of wear, damage, or loose connections.\n` +
            `2. **Check Circuit Breakers** — Ensure all relevant circuit breakers are engaged.\n` +
            `3. **Consult AMM** — Refer to the maintenance manual diagnostic flow charts.\n` +
            `4. **Operational Check** — Follow the AMM procedure to test component functionality.\n\n` +
            `**Common Causes:**\n- Faulty wiring harness connector\n- Internal component failure\n- Software configuration issue`
        );
        setIsTroubleshootingLoading(false);
    };

    // ── Signature button sub-component ──────────────────────────────────────
    const SignatureButton: React.FC<{ type: keyof Squawk['signatures']; label: string; disabled?: boolean; disabledReason?: string }> = ({ type, label, disabled = false, disabledReason }) => {
        const sig = squawk.signatures[type];
        const tech = sig ? technicians.find(t => t.id === sig.technician_id) : null;
        if (sig && tech) {
            return (
                <div className="text-sm text-center p-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                    <p className="font-semibold text-emerald-400 flex items-center justify-center gap-1"><CheckBadgeIcon className="w-4 h-4" />{label}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{tech.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{new Date(sig.signed_at).toLocaleString()}</p>
                </div>
            );
        }
        return (
            <button onClick={() => setIsSignatureModalOpen(type)} disabled={disabled} title={disabled ? disabledReason : `Sign off: ${label}`}
                className="w-full text-xs font-medium uppercase tracking-wider bg-white/5 hover:bg-white/10 p-2 rounded-md border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {label}
            </button>
        );
    };

    return (
        <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center gap-3">
                <h4 className="font-medium text-white text-sm">{squawk.description}</h4>
                <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-white/10 text-white rounded border border-white/10">
                    {squawk.status.replace('_', ' ')}
                </span>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Main content ── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Resolution Notes */}
                    <div>
                        <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <PencilIcon className="w-3 h-3" /> Resolution Notes
                        </h5>
                        <textarea
                            value={squawk.resolution}
                            onChange={e => handleUpdateSquawk({ ...squawk, resolution: e.target.value })}
                            rows={3}
                            className="w-full bg-[#0B0F17]/50 border border-white/10 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500/50 resize-none"
                            placeholder="Describe work performed…"
                        />
                    </div>

                    {/* Completion percentage slider */}
                    <div>
                        <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <ChartBarIcon className="w-3 h-3" /> Task Completion
                            </span>
                            <span className={`font-mono text-sm font-semibold ${
                                (squawk.completion_percentage ?? 0) === 100 ? 'text-emerald-400'
                                : (squawk.completion_percentage ?? 0) >= 50 ? 'text-sky-400'
                                : 'text-slate-400'
                            }`}>
                                {squawk.status === 'completed' ? '100' : (squawk.completion_percentage ?? 0)}%
                            </span>
                        </h5>
                        {squawk.status !== 'completed' ? (
                            <div className="space-y-1.5">
                                <input
                                    type="range"
                                    min={0} max={100} step={5}
                                    value={squawk.completion_percentage ?? 0}
                                    onChange={e => handleUpdateSquawk({
                                        ...squawk,
                                        completion_percentage: parseInt(e.target.value),
                                    })}
                                    className="w-full accent-sky-500"
                                />
                                <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                                </div>
                            </div>
                        ) : (
                            <div className="h-1.5 bg-emerald-500/30 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400 w-full" />
                            </div>
                        )}
                    </div>

                    {/* 3-column resource grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                        {/* Assigned Techs */}
                        <div className="space-y-2">
                            <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <UserGroupIcon className="w-3 h-3" /> Assigned Techs
                            </h5>
                            {assignedTechs.length === 0
                                ? <p className="text-xs text-slate-600 italic">None assigned</p>
                                : assignedTechs.map(tech => (
                                    <div key={tech.id} className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-1.5">
                                        <div>
                                            <p className="text-xs text-slate-200 font-medium">{tech.name}</p>
                                            <p className="text-[10px] text-slate-500">{tech.role}</p>
                                        </div>
                                        <span className="text-[10px] text-sky-400 font-mono">{tech.certifications.join(', ')}</span>
                                    </div>
                                ))
                            }
                        </div>

                        {/* Used Tools */}
                        <div className="space-y-2">
                            <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                <span className="flex items-center gap-2"><WrenchIcon className="w-3 h-3" /> Used Tools</span>
                                <button onClick={handleSuggestTools} disabled={isSuggestingTools}
                                    title="AI: suggest tools from squawk description"
                                    className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors">
                                    <SparklesIcon className="w-3 h-3" />
                                    {isSuggestingTools ? 'Thinking…' : 'AI Suggest'}
                                </button>
                            </h5>
                            {assignedTools.length === 0
                                ? <p className="text-xs text-slate-600 italic">No tools logged</p>
                                : assignedTools.map(tool => {
                                    const isOverdue = tool.calibrationRequired &&
                                        (tool.calibrationDueDays ?? (tool.calibrationDueDate
                                            ? Math.round((new Date(tool.calibrationDueDate).getTime() - Date.now()) / 86400000)
                                            : 999)) < 0;
                                    return (
                                        <div key={tool.id} className={`flex items-start justify-between rounded-lg px-2.5 py-1.5 ${isOverdue ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5'}`}>
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-200 font-medium truncate">{tool.name}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">
                                                    {tool.id}
                                                    <CalPill tool={tool} />
                                                </p>
                                                {isOverdue && (
                                                    <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                                        <ExclamationTriangleIcon className="w-3 h-3" /> Cal overdue — verify before use
                                                    </p>
                                                )}
                                            </div>
                                            <button onClick={() => handleRemoveTool(tool.id)} className="ml-2 flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors">
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })
                            }
                            <button onClick={() => setIsAssignToolPanelOpen(true)}
                                className="w-full flex items-center justify-center text-xs font-medium uppercase tracking-wider gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded transition-colors">
                                <PlusIcon className="w-3 h-3" /> Add Tool
                            </button>
                        </div>

                        {/* Used Parts */}
                        <div className="space-y-2">
                            <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <BeakerIcon className="w-3 h-3" /> Used Parts
                            </h5>
                            {usedPartItems.length === 0
                                ? <p className="text-xs text-slate-600 italic">No parts logged</p>
                                : usedPartItems.map(({ part, quantity, inventoryItemId }) => (
                                    <div key={inventoryItemId} className="flex items-start justify-between bg-white/5 rounded-lg px-2.5 py-1.5">
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-200 font-medium truncate">{part?.description ?? inventoryItemId}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">
                                                {part?.part_no ?? '—'} · qty {quantity}
                                            </p>
                                        </div>
                                        <button onClick={() => handleRemovePart(inventoryItemId)} className="ml-2 flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors">
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            }
                            <button onClick={() => setIsAssignPartPanelOpen(true)}
                                className="w-full flex items-center justify-center text-xs font-medium uppercase tracking-wider gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded transition-colors">
                                <PlusIcon className="w-3 h-3" /> Add Part
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Sidebar ── */}
                <div className="space-y-5 pl-0 lg:pl-5 lg:border-l border-white/5">

                    {/* Time Logs */}
                    <div>
                        <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2"><ClockIcon className="w-3 h-3" /> Time Logs</span>
                            <span className="text-sky-400 font-mono">{totalLoggedHours.toFixed(1)}h</span>
                        </h5>
                        <div className="space-y-1.5 mb-2 max-h-36 overflow-y-auto">
                            {squawk.time_logs.length === 0
                                ? <p className="text-xs text-slate-600 italic">No time logged</p>
                                : squawk.time_logs.map(log => {
                                    const tech = technicians.find(t => t.id === log.technician_id);
                                    const hrs = log.end_time
                                        ? ((new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 3600000).toFixed(1)
                                        : '…';
                                    return (
                                        <div key={log.log_id} className="flex items-center justify-between bg-white/5 rounded px-2 py-1.5">
                                            <div>
                                                <p className="text-xs text-slate-300">{tech?.name ?? 'Unknown'}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">
                                                    {new Date(log.start_time).toLocaleDateString()}
                                                    {log.is_billable && <span className="ml-1.5 text-emerald-500">billable</span>}
                                                </p>
                                            </div>
                                            <span className="text-xs font-mono text-sky-400">{hrs}h</span>
                                        </div>
                                    );
                                })
                            }
                        </div>
                        <button onClick={() => setIsTimeLogPanelOpen(true)}
                            className="w-full flex items-center justify-center text-xs font-medium uppercase tracking-wider gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded transition-colors">
                            <PlusIcon className="w-3 h-3" /> Log Time
                        </button>
                    </div>

                    {/* Signatures */}
                    <div>
                        <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <LockClosedIcon className="w-3 h-3" /> Signatures
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                            <SignatureButton type="work_complete"     label="Work Complete" />
                            <SignatureButton type="operational_check" label="Op Check" />
                            <SignatureButton type="inspector"         label="Inspector"
                                disabled={!permissions.canSignInspector}
                                disabledReason="Requires Lead or Admin role" />
                            <SignatureButton type="return_to_service" label="Return to Svc"
                                disabled={!permissions.canSignReturnToService}
                                disabledReason="Requires IA Certification" />
                        </div>
                    </div>

                    {/* Admin */}
                    <div>
                        <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <CogIcon className="w-3 h-3" /> Admin
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                            {permissions.canEditBilling && (
                                <button onClick={() => setIsSquawkAdminModalOpen(true)}
                                    className="w-full text-xs font-medium uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded transition-colors">
                                    Settings
                                </button>
                            )}
                            <button onClick={handleGenerateTroubleshootingGuide}
                                className="w-full text-xs font-medium uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 p-2 rounded flex items-center justify-center gap-1 transition-colors">
                                <SparklesIcon className="w-3 h-3" /> AI Assist
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TimeLogModal isOpen={isTimeLogPanelOpen} onClose={() => setIsTimeLogPanelOpen(false)} technicians={technicians} onLogTime={handleLogTime} currentUser={currentUser} />
            <AssignPartModal isOpen={isAssignPartPanelOpen} onClose={() => setIsAssignPartPanelOpen(false)} inventory={inventory} onAssignPart={handleAssignPart} />
            <AssignToolModal isOpen={isAssignToolPanelOpen} onClose={() => setIsAssignToolPanelOpen(false)} tools={tools} onAssignTool={handleAssignTool} />
            <SquawkAdminModal isOpen={isSquawkAdminModalOpen} onClose={() => setIsSquawkAdminModalOpen(false)} squawk={squawk} onSave={handleUpdateSquawk} />
            {isSignatureModalOpen && (
                <SignatureConfirmationModal
                    isOpen={!!isSignatureModalOpen}
                    onClose={() => setIsSignatureModalOpen(null)}
                    onConfirm={() => handleSign(isSignatureModalOpen)}
                    signatureTypeLabel={isSignatureModalOpen.replace(/_/g, ' ')}
                />
            )}
            <TroubleshootingGuideModal
                isOpen={isTroubleshootingModalOpen}
                onClose={() => setIsTroubleshootingModalOpen(false)}
                isLoading={isTroubleshootingLoading}
                guideContent={troubleshootingGuide}
            />
        </div>
    );
};
