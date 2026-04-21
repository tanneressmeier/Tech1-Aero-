import React, { useState, useEffect } from 'react';
import { Squawk, WorkOrder, RepairOrder, Aircraft, Technician, InventoryItem, Tool, Signature, SquawkStage, TimeLog } from '../types.ts';
import {
    ClockIcon, CogIcon, UserGroupIcon, WrenchIcon, BeakerIcon, PencilIcon, PlusIcon,
    CheckBadgeIcon, LockClosedIcon, SparklesIcon, TrashIcon, ExclamationTriangleIcon,
    ChartBarIcon,
} from './icons.tsx';
import TimeLogModal from './TimeLogModal.tsx';
import AssignPartModal from './AssignPartModal.tsx';
import AssignToolModal from './AssignToolModal.tsx';
import { AssignTechnicianModal } from './AssignTechnicianModal.tsx';
import { SquawkAdminModal } from './SquawkAdminModal.tsx';
import { SignatureConfirmationModal } from './SignatureConfirmationModal.tsx';
import { TroubleshootingGuideModal } from './TroubleshootingGuideModal.tsx';
import { SidePanel } from './SidePanel.tsx';
import { StatusBadge, AlertBanner, ActionButton } from './ui.tsx';
import { Permissions } from '../hooks/usePermissions.ts';
import { predictToolsFromJob } from '../services/geminiService.ts';
import { useToast } from '../contexts/ToastContext.tsx';

interface SquawkDetailViewProps {
    squawk:     Squawk;
    order:      WorkOrder | RepairOrder;
    aircraft:   Aircraft;
    technicians:Technician[];
    inventory:  InventoryItem[];
    tools:      Tool[];
    onUpdateOrder:       (updatedOrder: WorkOrder | RepairOrder) => void;
    permissions:         Permissions;
    // Time tracking — shop-level active logs passed from App state
    activeTimeLogs?:     TimeLog[];
    onClockInToTask?:    (log: Omit<TimeLog, 'log_id'>) => void;
    onClockOutOfTask?:   (logId: string, endTime: string) => void;
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
    squawk, order, aircraft, technicians, inventory, tools, onUpdateOrder, permissions,
    activeTimeLogs = [], onClockInToTask, onClockOutOfTask,
}) => {
    const { showToast } = useToast();
    const [isTimeLogPanelOpen,    setIsTimeLogPanelOpen]    = useState(false);
    const [isAssignPartPanelOpen, setIsAssignPartPanelOpen] = useState(false);
    const [isAssignToolPanelOpen, setIsAssignToolPanelOpen] = useState(false);
    const [isAssignTechPanelOpen, setIsAssignTechPanelOpen] = useState(false);
    const [isSquawkAdminModalOpen,setIsSquawkAdminModalOpen]= useState(false);
    const [isSignatureModalOpen,  setIsSignatureModalOpen]  = useState<keyof Squawk['signatures'] | null>(null);
    const [isTroubleshootingModalOpen, setIsTroubleshootingModalOpen] = useState(false);
    const [troubleshootingGuide,  setTroubleshootingGuide]  = useState('');
    const [isTroubleshootingLoading, setIsTroubleshootingLoading] = useState(false);
    const [isSuggestingTools,     setIsSuggestingTools]     = useState(false);
    // Local draft for completion slider — only commits to state on pointer-up (prevents toast spam)
    const [draftPct, setDraftPct] = useState<number>(squawk.completion_percentage ?? 0);
    // Sync draft when squawk identity changes (switching between squawks)
    useEffect(() => { setDraftPct(squawk.completion_percentage ?? 0); }, [squawk.squawk_id, squawk.completion_percentage]);

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

    const handleAssignTech = (techId: string) => {
        if (squawk.assigned_technician_ids.includes(techId)) return;
        handleUpdateSquawk({ ...squawk, assigned_technician_ids: [...squawk.assigned_technician_ids, techId] });
    };

    const handleUnassignTech = (techId: string) => {
        handleUpdateSquawk({ ...squawk, assigned_technician_ids: squawk.assigned_technician_ids.filter(id => id !== techId) });
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

    // ── Panel open state for progressive disclosure ─────────────────────────
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const orderId   = 'wo_id' in order ? order.wo_id : order.ro_id;
    const pct       = squawk.status === 'completed' ? 100 : (squawk.completion_percentage ?? 0);
    const hasIssues = assignedTools.some(t => t.calibrationRequired && ((t.calibrationDueDays ?? 999) < 0));

    const STAGE_COLOURS: Record<string, string> = {
        'Teardown':      'bg-slate-500/15 text-slate-300 border-slate-500/25',
        'Inspection':    'bg-sky-500/15   text-sky-300   border-sky-500/25',
        'Parts Pending': 'bg-amber-500/15 text-amber-300 border-amber-500/25',
        'Reassembly':    'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
        'Testing':       'bg-purple-500/15 text-purple-300 border-purple-500/25',
        'Complete':      'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    };

    return (
        <>
            {/* ── Compact summary card ── */}
            <div className={`group rounded-xl border transition-all duration-150 ${
                hasIssues
                    ? 'bg-red-500/5 border-red-500/15 hover:border-red-500/30'
                    : squawk.status === 'completed'
                        ? 'bg-emerald-500/5 border-emerald-500/15'
                        : 'bg-white/3 border-white/8 hover:border-white/15'
            }`}>
                <button
                    className="w-full text-left px-4 py-3.5 flex items-center gap-4"
                    onClick={() => setIsPanelOpen(true)}
                >
                    {/* Completion indicator */}
                    <div className="relative flex-shrink-0 w-9 h-9">
                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3"/>
                            <circle cx="18" cy="18" r="14" fill="none"
                                stroke={pct === 100 ? '#34d399' : pct > 60 ? '#38bdf8' : pct > 30 ? '#fbbf24' : '#64748b'}
                                strokeWidth="3"
                                strokeDasharray={`${pct * 0.879} 87.9`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-semibold text-slate-300">
                            {pct}%
                        </span>
                    </div>

                    {/* Description + meta */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-medium ${squawk.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>
                                {squawk.description}
                            </p>
                            {squawk.stage && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STAGE_COLOURS[squawk.stage] ?? 'bg-white/5 text-slate-400 border-white/10'}`}>
                                    {squawk.stage}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-500">{squawk.hours_estimate}h est.</span>
                            {assignedTechs.length > 0 && (
                                <span className="text-xs text-slate-500">
                                    {assignedTechs.map(t => t.name.split(' ')[0]).join(', ')}
                                </span>
                            )}
                            {assignedTools.length > 0 && (
                                <span className="text-xs text-slate-500">{assignedTools.length} tool{assignedTools.length > 1 ? 's' : ''}</span>
                            )}
                            {usedPartItems.length > 0 && (
                                <span className="text-xs text-slate-500">{usedPartItems.length} part{usedPartItems.length > 1 ? 's' : ''}</span>
                            )}
                            {totalLoggedHours > 0 && (
                                <span className="text-xs text-emerald-400 font-mono">{totalLoggedHours.toFixed(1)}h logged</span>
                            )}
                        </div>
                    </div>

                    {/* Right side: priority + status */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {squawk.priority !== 'routine' && (
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                squawk.priority === 'aog' ? 'bg-red-500/15 text-red-300 border-red-500/25' : 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                            }`}>{squawk.priority}</span>
                        )}
                        <StatusBadge status={squawk.status.replace('_', ' ') as any} dot={false} />
                        {hasIssues && <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                        <span className="text-slate-600 text-xs ml-1 group-hover:text-slate-400 transition-colors">→</span>
                    </div>
                </button>

                {/* Active clock-in indicator */}
                {(() => {
                    const activeLog = (activeTimeLogs ?? []).find(
                        l => l.technician_id === currentUser?.id &&
                             l.squawk_id     === squawk.squawk_id &&
                             !l.end_time
                    );
                    if (!activeLog) return null;
                    return (
                        <div className="px-4 pb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                            <span className="text-xs text-emerald-300">
                                Clocked in since {new Date(activeLog.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button
                                onClick={() => {
                                    onClockOutOfTask?.(activeLog.log_id, new Date().toISOString());
                                    showToast({ message: 'Clocked out of task.', type: 'info' });
                                }}
                                className="ml-auto text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-2 py-0.5 rounded transition-colors"
                            >
                                Clock Out
                            </button>
                        </div>
                    );
                })()}
            </div>

            {/* ── Full edit SidePanel ── */}
            <SidePanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                title={squawk.description}
                size="xl"
                footer={
                    <div className="flex justify-between items-center w-full">
                        <button onClick={() => setIsPanelOpen(false)}
                            className="text-sm text-slate-400 hover:text-white transition-colors">
                            Close
                        </button>
                        <div className="flex items-center gap-2">
                            {permissions.canEditBilling && (
                                <ActionButton size="sm" variant="ghost"
                                    onClick={() => setIsSquawkAdminModalOpen(true)}
                                    icon={<CogIcon className="w-3.5 h-3.5" />}>
                                    Admin
                                </ActionButton>
                            )}
                            <ActionButton size="sm" variant="ghost"
                                onClick={handleGenerateTroubleshootingGuide}
                                icon={<SparklesIcon className="w-3.5 h-3.5" />}>
                                AI Assist
                            </ActionButton>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Stage + completion */}
                    <div className="space-y-4">
                        {/* Stage */}
                        <div>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Stage</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(['Teardown','Inspection','Parts Pending','Reassembly','Testing','Complete'] as SquawkStage[]).map(stage => {
                                    const active = squawk.stage === stage;
                                    return (
                                        <button key={stage} onClick={() => handleUpdateSquawk({ ...squawk, stage })}
                                            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                                                active
                                                    ? (STAGE_COLOURS[stage] ?? 'bg-white/10 text-white border-white/20')
                                                    : 'text-slate-500 border-white/8 hover:border-white/15 hover:text-slate-300'
                                            }`}>
                                            {stage}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Completion slider */}
                        {squawk.status !== 'completed' && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Completion</p>
                                    <span className="text-xs font-mono font-semibold text-sky-300">{draftPct}%</span>
                                </div>
                                <input type="range" min={0} max={100} step={5}
                                    value={draftPct}
                                    onChange={e => setDraftPct(parseInt(e.target.value))}
                                    onPointerUp={e => handleUpdateSquawk({ ...squawk, completion_percentage: parseInt((e.target as HTMLInputElement).value) })}
                                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                                />
                            </div>
                        )}

                        {/* Required Skills */}
                        <SkillRequirementsEditor squawk={squawk} onUpdate={handleUpdateSquawk} />
                    </div>

                    {/* Resolution notes */}
                    <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Resolution Notes</p>
                        <textarea
                            value={squawk.resolution}
                            onChange={e => handleUpdateSquawk({ ...squawk, resolution: e.target.value })}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500/50 resize-none"
                            placeholder="Describe work performed…"
                        />
                    </div>

                    {/* 3-column resources */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Techs */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <UserGroupIcon className="w-3 h-3" /> Assigned Techs
                                </p>
                                <button onClick={() => setIsAssignTechPanelOpen(true)}
                                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 transition-colors">
                                    <PlusIcon className="w-3 h-3" /> Assign
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                {assignedTechs.length === 0
                                    ? <p className="text-xs text-slate-600 italic">None assigned</p>
                                    : assignedTechs.map(tech => (
                                        <div key={tech.id} className="flex items-center justify-between bg-white/3 rounded-lg px-2.5 py-1.5">
                                            <div>
                                                <p className="text-xs text-slate-200 font-medium">{tech.name}</p>
                                                <p className="text-[10px] text-slate-500">{tech.certifications.join(', ')}</p>
                                            </div>
                                            <button onClick={() => handleUnassignTech(tech.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Tools */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <WrenchIcon className="w-3 h-3" /> Tools
                                </p>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleSuggestTools} disabled={isSuggestingTools}
                                        className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 transition-colors disabled:opacity-40">
                                        <SparklesIcon className="w-3 h-3" /> {isSuggestingTools ? '…' : 'AI'}
                                    </button>
                                    <button onClick={() => setIsAssignToolPanelOpen(true)}
                                        className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 transition-colors">
                                        <PlusIcon className="w-3 h-3" /> Add
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                {assignedTools.length === 0
                                    ? <p className="text-xs text-slate-600 italic">No tools logged</p>
                                    : assignedTools.map(tool => {
                                        const overdue = tool.calibrationRequired &&
                                            (tool.calibrationDueDays ?? (tool.calibrationDueDate
                                                ? Math.round((new Date(tool.calibrationDueDate).getTime() - Date.now()) / 86400000)
                                                : 999)) < 0;
                                        return (
                                            <div key={tool.id} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${overdue ? 'bg-red-500/8 border border-red-500/15' : 'bg-white/3'}`}>
                                                <div>
                                                    <p className="text-xs text-slate-200 font-medium">{tool.name}</p>
                                                    {overdue && <p className="text-[10px] text-red-400">Cal overdue</p>}
                                                </div>
                                                <button onClick={() => handleRemoveTool(tool.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                                                    <TrashIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>

                        {/* Parts */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <BeakerIcon className="w-3 h-3" /> Parts
                                </p>
                                <button onClick={() => setIsAssignPartPanelOpen(true)}
                                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5 transition-colors">
                                    <PlusIcon className="w-3 h-3" /> Add
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                {usedPartItems.length === 0
                                    ? <p className="text-xs text-slate-600 italic">No parts logged</p>
                                    : usedPartItems.map(({ part, quantity, inventoryItemId }) => (
                                        <div key={inventoryItemId} className="flex items-center justify-between bg-white/3 rounded-lg px-2.5 py-1.5">
                                            <div>
                                                <p className="text-xs text-slate-200 font-medium truncate max-w-[160px]">{part?.description ?? inventoryItemId}</p>
                                                <p className="text-[10px] text-slate-500 font-mono">{part?.part_no ?? '—'} × {quantity}</p>
                                            </div>
                                            <button onClick={() => handleRemovePart(inventoryItemId)} className="text-slate-600 hover:text-red-400 transition-colors">
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>

                    {/* Time tracking */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <ClockIcon className="w-3 h-3" /> Time — {totalLoggedHours.toFixed(1)}h billable
                            </p>
                        </div>
                        {/* Task clock in/out */}
                        {(() => {
                            const isAssigned = squawk.assigned_technician_ids.includes(currentUser?.id ?? '');
                            const activeLog  = (activeTimeLogs ?? []).find(
                                l => l.technician_id === currentUser?.id && l.squawk_id === squawk.squawk_id && !l.end_time
                            );
                            const isClockedIn = !!activeLog;
                            const thisOrderId = 'wo_id' in order ? order.wo_id : order.ro_id;
                            const orderType   = ('wo_id' in order ? 'WO' : 'RO') as 'WO' | 'RO';
                            return (
                                <div className={`mb-3 px-3 py-2.5 rounded-xl border ${isClockedIn ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-white/3 border-white/8'}`}>
                                    {isClockedIn ? (
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <span className="text-xs text-emerald-300">Clocked in — {new Date(activeLog.start_time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                                            </div>
                                            <button onClick={() => { onClockOutOfTask?.(activeLog.log_id, new Date().toISOString()); showToast({ message: 'Clocked out.', type: 'info' }); }}
                                                className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-2 py-0.5 rounded transition-colors">
                                                Clock Out
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] text-slate-500">
                                                {isAssigned ? 'Clock in to charge billable time' : 'Assign yourself to clock in'}
                                            </p>
                                            <button disabled={!isAssigned || squawk.status === 'completed'}
                                                onClick={() => { onClockInToTask?.({ technician_id: currentUser!.id, start_time: new Date().toISOString(), is_billable: true, squawk_id: squawk.squawk_id, order_id: thisOrderId, order_type: orderType }); showToast({ message: `Clocked in to task`, type: 'success' }); }}
                                                className="text-xs text-sky-300 hover:text-sky-200 border border-sky-500/20 px-2 py-0.5 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                                Clock In
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {squawk.time_logs.length === 0
                                ? <p className="text-xs text-slate-600 italic">No time logged</p>
                                : squawk.time_logs.map(log => {
                                    const tech = technicians.find(t => t.id === log.technician_id);
                                    const hrs  = log.end_time ? ((new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 3600000).toFixed(2) : '…';
                                    return (
                                        <div key={log.log_id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                            <span className="text-slate-400">{tech?.name ?? 'Unknown'}</span>
                                            <span className={`font-mono ${log.is_billable ? 'text-emerald-400' : 'text-slate-500'}`}>{hrs}h</span>
                                        </div>
                                    );
                                })
                            }
                        </div>
                        {permissions.canEditBilling && (
                            <button onClick={() => setIsTimeLogPanelOpen(true)}
                                className="mt-2 w-full text-xs text-slate-500 hover:text-slate-300 border border-white/8 hover:border-white/15 rounded-lg py-1.5 transition-colors">
                                + Manual Log Entry
                            </button>
                        )}
                    </div>

                    {/* Signatures */}
                    <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <LockClosedIcon className="w-3 h-3" /> Sign-off
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <SignatureButton type="work_complete"     label="Work Complete" />
                            <SignatureButton type="operational_check" label="Op Check" />
                            <SignatureButton type="inspector"         label="Inspector"
                                disabled={!permissions.canSignInspector}
                                disabledReason="Requires Lead or Admin" />
                            <SignatureButton type="return_to_service" label="Return to Svc"
                                disabled={!permissions.canSignReturnToService}
                                disabledReason="Requires IA cert" />
                        </div>
                    </div>
                </div>
            </SidePanel>

            {/* Modals */}
            <TimeLogModal isOpen={isTimeLogPanelOpen} onClose={() => setIsTimeLogPanelOpen(false)} technicians={technicians} onLogTime={handleLogTime} currentUser={currentUser} />
            <AssignPartModal isOpen={isAssignPartPanelOpen} onClose={() => setIsAssignPartPanelOpen(false)} inventory={inventory} onAssignPart={handleAssignPart} />
            <AssignToolModal isOpen={isAssignToolPanelOpen} onClose={() => setIsAssignToolPanelOpen(false)} tools={tools} onAssignTool={handleAssignTool} />
            <AssignTechnicianModal isOpen={isAssignTechPanelOpen} onClose={() => setIsAssignTechPanelOpen(false)} technicians={technicians} assignedIds={squawk.assigned_technician_ids} squawk={squawk} onAssign={handleAssignTech} onUnassign={handleUnassignTech} />
            <SquawkAdminModal isOpen={isSquawkAdminModalOpen} onClose={() => setIsSquawkAdminModalOpen(false)} squawk={squawk} onSave={handleUpdateSquawk} />
            {isSignatureModalOpen && (
                <SignatureConfirmationModal isOpen={!!isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(null)} onConfirm={() => handleSign(isSignatureModalOpen)} signatureTypeLabel={isSignatureModalOpen.replace(/_/g, ' ')} />
            )}
            <TroubleshootingGuideModal isOpen={isTroubleshootingModalOpen} onClose={() => setIsTroubleshootingModalOpen(false)} isLoading={isTroubleshootingLoading} guideContent={troubleshootingGuide} />
        </>
    );
};


// ── SkillRequirementsEditor ────────────────────────────────────────────────────
// Inline chip editor for required_certifications and required_training on a squawk.
// Leads/Admins set these; they gate technician assignment via AssignTechnicianModal.

const COMMON_CERTS     = ['A&P', 'IA', 'Avionics', 'A&P + IA'];
const COMMON_TRAININGS = [
    'Fuel Cell Inspection', 'Composite Repair', 'RII Authorization',
    'Hydraulic Systems', 'Glass Cockpit Upgrade', 'ADS-B Installation',
    'NDT Level II', 'Oxygen Systems', 'Paint & Surface',
];

const SkillRequirementsEditor: React.FC<{
    squawk:   Squawk;
    onUpdate: (s: Squawk) => void;
}> = ({ squawk, onUpdate }) => {
    const [open, setOpen]       = React.useState(false);
    const [newCert, setNewCert] = React.useState('');
    const [newTrain, setNewTrain] = React.useState('');

    const certs    = squawk.required_certifications ?? [];
    const training = squawk.required_training       ?? [];
    const hasAny   = certs.length > 0 || training.length > 0;

    const removeCert  = (c: string) => onUpdate({ ...squawk, required_certifications: certs.filter(x => x !== c) });
    const removeTrain = (t: string) => onUpdate({ ...squawk, required_training:       training.filter(x => x !== t) });

    const addCert  = (c: string) => {
        const v = c.trim();
        if (!v || certs.includes(v)) return;
        onUpdate({ ...squawk, required_certifications: [...certs, v] });
        setNewCert('');
    };
    const addTrain = (t: string) => {
        const v = t.trim();
        if (!v || training.includes(v)) return;
        onUpdate({ ...squawk, required_training: [...training, v] });
        setNewTrain('');
    };

    return (
        <div>
            <button onClick={() => setOpen(p => !p)}
                className="w-full flex items-center justify-between font-mono text-xs text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors mb-1">
                <span className="flex items-center gap-2">
                    <LockClosedIcon className="w-3 h-3" />
                    Required Skills
                    {hasAny && (
                        <span className="text-sky-400 font-medium normal-case tracking-normal">
                            {certs.length + training.length} requirement{certs.length + training.length !== 1 ? 's' : ''} set
                        </span>
                    )}
                </span>
                <span className="text-slate-600">{open ? '▲' : '▼'}</span>
            </button>

            {!open && hasAny && (
                <div className="flex flex-wrap gap-1 mb-1">
                    {certs.map(c    => <span key={c} className="text-[10px] px-1.5 py-0.5 rounded border bg-sky-500/20 text-sky-200 border-sky-500/30">Cert: {c}</span>)}
                    {training.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-500/20 text-purple-200 border-purple-500/30">Training: {t}</span>)}
                </div>
            )}

            {open && (
                <div className="mt-2 space-y-3 px-3 py-3 bg-white/3 border border-white/8 rounded-xl">
                    {/* Certifications */}
                    <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Certifications required</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {certs.map(c => (
                                <span key={c} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-sky-500/20 text-sky-200 border-sky-500/30">
                                    {c}
                                    <button onClick={() => removeCert(c)} className="text-sky-400 hover:text-red-400 ml-0.5 transition-colors">×</button>
                                </span>
                            ))}
                            {certs.length === 0 && <span className="text-[10px] text-slate-600 italic">None</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                            {COMMON_CERTS.filter(c => !certs.includes(c)).map(c => (
                                <button key={c} onClick={() => addCert(c)}
                                    className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400 hover:border-sky-500/40 hover:text-sky-300 transition-colors">
                                    + {c}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1">
                            <input value={newCert} onChange={e => setNewCert(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (addCert(newCert), e.preventDefault())}
                                placeholder="Custom cert…"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500" />
                            <button onClick={() => addCert(newCert)}
                                className="px-2.5 py-1 text-xs rounded-lg bg-sky-600/50 hover:bg-sky-600 text-white transition-colors">Add</button>
                        </div>
                    </div>

                    {/* Training */}
                    <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Named training required</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {training.map(t => (
                                <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-purple-500/20 text-purple-200 border-purple-500/30">
                                    {t}
                                    <button onClick={() => removeTraining(t)} className="text-purple-400 hover:text-red-400 ml-0.5 transition-colors">×</button>
                                </span>
                            ))}
                            {training.length === 0 && <span className="text-[10px] text-slate-600 italic">None</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                            {COMMON_TRAININGS.filter(t => !training.includes(t)).map(t => (
                                <button key={t} onClick={() => addTrain(t)}
                                    className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400 hover:border-purple-500/40 hover:text-purple-300 transition-colors">
                                    + {t}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1">
                            <input value={newTrain} onChange={e => setNewTrain(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (addTrain(newTrain), e.preventDefault())}
                                placeholder="Custom training…"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500" />
                            <button onClick={() => addTrain(newTrain)}
                                className="px-2.5 py-1 text-xs rounded-lg bg-purple-600/50 hover:bg-purple-600 text-white transition-colors">Add</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    function removeTraining(t: string) {
        onUpdate({ ...squawk, required_training: training.filter(x => x !== t) });
    }
};
