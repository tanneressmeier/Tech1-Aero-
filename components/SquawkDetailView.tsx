// FIX: Replaced placeholder content with a functional component.
import React, { useState } from 'react';
import { Squawk, WorkOrder, RepairOrder, Aircraft, Technician, InventoryItem, Tool, Signature } from '../types.ts';
import {
    ClockIcon, CogIcon, UserGroupIcon, WrenchIcon, BeakerIcon, PencilIcon, PlusIcon,
    CheckBadgeIcon, LockClosedIcon, SparklesIcon
} from './icons.tsx';
import TimeLogModal from './TimeLogModal.tsx';
import AssignPartModal from './AssignPartModal.tsx';
import AssignToolModal from './AssignToolModal.tsx';
import { SquawkAdminModal } from './SquawkAdminModal.tsx';
import { SignatureConfirmationModal } from './SignatureConfirmationModal.tsx';
import { TroubleshootingGuideModal } from './TroubleshootingGuideModal.tsx';
import { Permissions } from '../hooks/usePermissions.ts';

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

// Dummy user for demo purposes
const CURRENT_USER_ID = 'tech-1';

export const SquawkDetailView: React.FC<SquawkDetailViewProps> = ({
    squawk, order, aircraft, technicians, inventory, tools, onUpdateOrder, permissions
}) => {
    const [isTimeLogPanelOpen, setIsTimeLogPanelOpen] = useState(false);
    const [isAssignPartPanelOpen, setIsAssignPartPanelOpen] = useState(false);
    const [isAssignToolPanelOpen, setIsAssignToolPanelOpen] = useState(false);
    const [isSquawkAdminModalOpen, setIsSquawkAdminModalOpen] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<keyof Squawk['signatures'] | null>(null);
    const [isTroubleshootingModalOpen, setIsTroubleshootingModalOpen] = useState(false);
    const [troubleshootingGuide, setTroubleshootingGuide] = useState('');
    const [isTroubleshootingLoading, setIsTroubleshootingLoading] = useState(false);

    const currentUser = technicians.find(t => t.id === CURRENT_USER_ID)!;

    const handleUpdateSquawk = (updatedSquawk: Squawk) => {
        const updatedSquawks = order.squawks.map(s => s.squawk_id === updatedSquawk.squawk_id ? updatedSquawk : s);
        onUpdateOrder({ ...order, squawks: updatedSquawks });
    };

    const handleLogTime = (log: Omit<typeof squawk.time_logs[0], 'log_id'>) => {
        const newLog = { ...log, log_id: `log-${Date.now()}` };
        const updatedSquawk = { ...squawk, time_logs: [...squawk.time_logs, newLog] };
        handleUpdateSquawk(updatedSquawk);
    };
    
    const handleAssignPart = (partId: string, quantity: number) => {
         const updatedSquawk = { ...squawk, used_parts: [...squawk.used_parts, { inventory_item_id: partId, quantity_used: quantity }] };
        handleUpdateSquawk(updatedSquawk);
        setIsAssignPartPanelOpen(false);
    };
    
    const handleAssignTool = (toolId: string) => {
        const updatedSquawk = { ...squawk, used_tool_ids: [...squawk.used_tool_ids, toolId] };
        handleUpdateSquawk(updatedSquawk);
        setIsAssignToolPanelOpen(false);
    };

    const handleSign = (signatureType: keyof Squawk['signatures']) => {
        const newSignature: Signature = {
            technician_id: currentUser.id,
            signed_at: new Date().toISOString(),
        };
        const updatedSquawk: Squawk = {
            ...squawk,
            signatures: {
                ...squawk.signatures,
                [signatureType]: newSignature,
            },
        };
        handleUpdateSquawk(updatedSquawk);
        setIsSignatureModalOpen(null);
    };
    
    const handleGenerateTroubleshootingGuide = async () => {
        setIsTroubleshootingModalOpen(true);
        setIsTroubleshootingLoading(true);
        // In a real app, this would be a Gemini API call
        await new Promise(res => setTimeout(res, 2000));
        const guide = `## Troubleshooting: ${squawk.description}\n\nBased on aircraft model ${aircraft.model} and reported issue, follow these steps:\n\n* 1. **Visual Inspection**: Check for obvious signs of wear, damage, or loose connections related to the component.\n* 2. **Check Circuit Breakers**: Ensure all relevant circuit breakers are engaged.\n* 3. **Consult Maintenance Manual**: Refer to section 34-12-05 of the AMM for diagnostic flow charts.\n* 4. **Perform Operational Check**: Follow the procedure in the AMM to test the component's functionality.\n\n**Common Causes:**\n- Faulty wiring harness connector\n- Internal component failure\n- Software configuration issue`;
        setTroubleshootingGuide(guide);
        setIsTroubleshootingLoading(false);
    };


    const SignatureButton: React.FC<{ type: keyof Squawk['signatures'], label: string, disabled?: boolean, disabledReason?: string }> = ({ type, label, disabled = false, disabledReason }) => {
        const signature = squawk.signatures[type];
        const tech = signature ? technicians.find(t => t.id === signature.technician_id) : null;
        if (signature && tech) {
            return (
                <div className="text-sm text-center p-2 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                    <p className="font-semibold text-emerald-400 flex items-center justify-center gap-1"><CheckBadgeIcon className="w-4 h-4" />{label}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{tech.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{new Date(signature.signed_at).toLocaleString()}</p>
                </div>
            );
        }
        return (
            <button 
                onClick={() => setIsSignatureModalOpen(type)} 
                disabled={disabled}
                title={disabled ? disabledReason : `Sign off for ${label}`}
                className="w-full text-xs font-medium uppercase tracking-wider bg-white/5 hover:bg-white/10 p-2 rounded-md border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
                {label}
            </button>
        );
    };


    return (
        <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/5">
                <div className="flex justify-between items-start">
                    <h4 className="font-medium text-white">{squawk.description}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-white/10 text-white rounded border border-white/10">{squawk.status.replace('_', ' ')}</span>
                </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><PencilIcon className="w-3 h-3"/> Resolution Notes</h5>
                        <textarea
                            value={squawk.resolution}
                            onChange={(e) => handleUpdateSquawk({ ...squawk, resolution: e.target.value })}
                            rows={4}
                            className="w-full bg-[#0B0F17]/50 border border-white/10 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                            placeholder="Describe work performed..."
                        />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                             <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2"><UserGroupIcon className="w-3 h-3"/> Assigned Techs</h5>
                             {/* List assigned techs here */}
                        </div>
                         <div className="space-y-2">
                             <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2"><WrenchIcon className="w-3 h-3"/> Used Tools</h5>
                             {/* List used tools here */}
                             <button onClick={() => setIsAssignToolPanelOpen(true)} className="w-full flex items-center justify-center text-xs font-medium uppercase tracking-wider gap-2 bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded transition-colors"><PlusIcon className="w-3 h-3"/> Add Tool</button>
                        </div>
                         <div className="space-y-2">
                             <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2"><BeakerIcon className="w-3 h-3"/> Used Parts</h5>
                             {/* List used parts here */}
                             <button onClick={() => setIsAssignPartPanelOpen(true)} className="w-full flex items-center justify-center text-xs font-medium uppercase tracking-wider gap-2 bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded transition-colors"><PlusIcon className="w-3 h-3"/> Add Part</button>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6 pl-0 lg:pl-6 lg:border-l border-white/5">
                    <div>
                        <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><ClockIcon className="w-3 h-3"/> Time Logs</h5>
                        {/* List time logs here */}
                        <button onClick={() => setIsTimeLogPanelOpen(true)} className="w-full flex items-center justify-center text-xs font-medium uppercase tracking-wider gap-2 bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded transition-colors"><PlusIcon className="w-3 h-3"/> Log Time</button>
                    </div>

                    <div>
                         <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><LockClosedIcon className="w-3 h-3"/> Signatures</h5>
                         <div className="grid grid-cols-2 gap-2">
                            <SignatureButton type="work_complete" label="Work Complete" />
                            <SignatureButton type="operational_check" label="Op Check" />
                            <SignatureButton type="inspector" label="Inspector" disabled={!permissions.canSignInspector} disabledReason="Requires Lead or Admin role" />
                            <SignatureButton type="return_to_service" label="Return to Service" disabled={!permissions.canSignReturnToService} disabledReason="Requires IA Certification"/>
                         </div>
                    </div>
                     <div>
                        <h5 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><CogIcon className="w-3 h-3"/> Admin</h5>
                        <div className="grid grid-cols-2 gap-2">
                            {permissions.canEditBilling && (
                                <button onClick={() => setIsSquawkAdminModalOpen(true)} className="w-full text-xs font-medium uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded transition-colors">Settings</button>
                            )}
                            <button onClick={handleGenerateTroubleshootingGuide} className="w-full text-xs font-medium uppercase tracking-wider bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 p-2 rounded flex items-center justify-center gap-1 transition-colors"><SparklesIcon className="w-3 h-3"/> AI Assist</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals & Panels */}
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