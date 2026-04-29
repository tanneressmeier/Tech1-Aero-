import React, { useState, useEffect } from 'react';
import { Technician, TrainingRecord, TrainingRequirement } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';
import { PlusIcon, TrashIcon, CheckBadgeIcon } from './icons.tsx';
import { AlertBanner, ActionButton } from './ui.tsx';

interface Props {
    isOpen:               boolean;
    onClose:              () => void;
    technician:           Technician | null;
    trainingRequirements: TrainingRequirement[];
    onUpdate:             (t: Technician) => void;
}

export const EditTechnicianModal: React.FC<Props> = ({
    isOpen, onClose, technician, trainingRequirements, onUpdate,
}) => {
    const [name,       setName]       = useState('');
    const [role,       setRole]       = useState<Technician['role']>('Technician');
    const [certs,      setCerts]      = useState('');
    const [efficiency, setEfficiency] = useState('85');
    const [vacDates,   setVacDates]   = useState<string[]>([]);
    const [newVacDate, setNewVacDate] = useState('');
    const [trainings,  setTrainings]  = useState<TrainingRecord[]>([]);

    // Add training form
    const [addMode,    setAddMode]    = useState<'catalog' | 'custom' | null>(null);
    const [selReqId,   setSelReqId]   = useState('');
    const [newTrain,   setNewTrain]   = useState<Partial<TrainingRecord & { recurrenceIntervalDays: number }>>({});

    useEffect(() => {
        if (technician && isOpen) {
            setName(technician.name);
            setRole(technician.role);
            setCerts(technician.certifications.join(', '));
            setEfficiency(technician.efficiency ? Math.round(technician.efficiency * 100).toString() : '85');
            setVacDates(technician.vacation_dates ?? []);
            setTrainings(technician.training_records ?? []);
            setNewVacDate(''); setAddMode(null); setSelReqId(''); setNewTrain({});
        }
    }, [technician, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!technician || !name.trim()) return;
        onUpdate({
            ...technician,
            name:             name.trim(),
            role,
            certifications:   certs.split(',').map(c => c.trim()).filter(Boolean),
            efficiency:       parseInt(efficiency, 10) / 100,
            vacation_dates:   vacDates.sort(),
            training_records: trainings,
        });
    };

    const addFromCatalog = () => {
        if (!selReqId || !newTrain.completedDate) return;
        const req = trainingRequirements.find(r => r.id === selReqId);
        if (!req) return;
        // Auto-compute expiry from completed date + interval
        let expiryDate: string | undefined;
        if (req.intervalDays > 0 && newTrain.completedDate) {
            const d = new Date(newTrain.completedDate);
            d.setDate(d.getDate() + req.intervalDays);
            expiryDate = d.toISOString().split('T')[0];
        }
        // Replace existing record for same requirement
        setTrainings(prev => {
            const filtered = prev.filter(t => t.requirementId !== req.id);
            return [...filtered, {
                name:                  req.name,
                completedDate:         newTrain.completedDate!,
                expiryDate,
                issuedBy:              newTrain.issuedBy || req.issuedBy,
                requirementId:         req.id,
                recurrenceIntervalDays:req.intervalDays > 0 ? req.intervalDays : undefined,
            }];
        });
        setAddMode(null); setSelReqId(''); setNewTrain({});
    };

    const addCustom = () => {
        if (!newTrain.name?.trim() || !newTrain.completedDate) return;
        setTrainings(prev => [...prev, {
            name:          newTrain.name!.trim(),
            completedDate: newTrain.completedDate!,
            expiryDate:    newTrain.expiryDate || undefined,
            issuedBy:      newTrain.issuedBy   || undefined,
        }]);
        setAddMode(null); setNewTrain({});
    };

    const iCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500";

    // Preview auto-expiry when catalog item selected
    const previewExpiry = (() => {
        if (!selReqId || !newTrain.completedDate) return null;
        const req = trainingRequirements.find(r => r.id === selReqId);
        if (!req || req.intervalDays === 0) return null;
        const d = new Date(newTrain.completedDate);
        d.setDate(d.getDate() + req.intervalDays);
        return d.toISOString().split('T')[0];
    })();

    if (!technician) return null;

    const today = new Date();
    const expiredTrainings  = trainings.filter(t => t.expiryDate && new Date(t.expiryDate) < today);
    const expiringTrainings = trainings.filter(t => t.expiryDate && new Date(t.expiryDate) >= today && Math.round((new Date(t.expiryDate).getTime() - today.getTime())/86400000) <= 30);

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={`Edit — ${technician.name}`} size="2xl"
            footer={
                <>
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg">Cancel</button>
                    <button type="submit" form="edit-tech-form" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg">Save Changes</button>
                </>
            }>
            <form id="edit-tech-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Core fields */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required className={iCls} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as Technician['role'])} className={iCls}>
                            <option value="Technician">Technician</option>
                            <option value="Lead Technician">Lead Technician</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Certifications (comma-separated)</label>
                        <input value={certs} onChange={e => setCerts(e.target.value)} placeholder="A&P, IA, Avionics" className={iCls} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Target Efficiency (%)</label>
                        <input type="number" min="0" max="100" value={efficiency} onChange={e => setEfficiency(e.target.value)} className={iCls} />
                    </div>
                </div>

                {/* Training alerts */}
                {expiredTrainings.length > 0 && (
                    <AlertBanner severity="critical" title={`${expiredTrainings.length} expired training${expiredTrainings.length>1?'s':''}`} compact>
                        {expiredTrainings.map((t,i) => <p key={i} className="text-xs text-red-200/60">{t.name} — expired {t.expiryDate}</p>)}
                    </AlertBanner>
                )}
                {expiringTrainings.length > 0 && (
                    <AlertBanner severity="warning" title={`${expiringTrainings.length} training${expiringTrainings.length>1?'s':''} expiring within 30 days`} compact>
                        {expiringTrainings.map((t,i) => <p key={i} className="text-xs text-amber-200/60">{t.name} — expires {t.expiryDate}</p>)}
                    </AlertBanner>
                )}

                {/* Training records */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Training Records ({trainings.length})</h4>
                        <div className="flex gap-1.5">
                            <ActionButton size="sm" variant={addMode==='catalog'?'primary':'secondary'} onClick={() => setAddMode(m => m==='catalog'?null:'catalog')}
                                icon={<CheckBadgeIcon className="w-3.5 h-3.5" />}>
                                From Catalog
                            </ActionButton>
                            <ActionButton size="sm" variant={addMode==='custom'?'primary':'secondary'} onClick={() => setAddMode(m => m==='custom'?null:'custom')}
                                icon={<PlusIcon className="w-3.5 h-3.5" />}>
                                Custom
                            </ActionButton>
                        </div>
                    </div>

                    {/* Add from catalog form */}
                    {addMode === 'catalog' && (
                        <div className="mb-3 p-3 bg-sky-500/8 border border-sky-500/20 rounded-xl space-y-3">
                            <p className="text-xs text-sky-300 font-medium">Add from Training Catalog — expiry date calculated automatically</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Training Type</label>
                                    <select value={selReqId} onChange={e => { setSelReqId(e.target.value); setNewTrain(p => ({...p, name: undefined})); }} className={`${iCls} mt-1`}>
                                        <option value="">Select training…</option>
                                        {(['Safety','Technical','Regulatory','Company'] as const).map(cat => (
                                            <optgroup key={cat} label={cat}>
                                                {trainingRequirements.filter(r => r.category === cat).map(r => (
                                                    <option key={r.id} value={r.id}>{r.name} ({r.intervalDays > 0 ? `every ${r.intervalDays}d` : 'one-time'})</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Completed Date</label>
                                    <input type="date" value={newTrain.completedDate ?? ''} onChange={e => setNewTrain(p => ({...p, completedDate: e.target.value}))} className={`${iCls} mt-1`} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Auto Expiry</label>
                                    <div className={`${iCls} mt-1 bg-white/3 text-slate-400 cursor-default`}>
                                        {previewExpiry ?? (selReqId && trainingRequirements.find(r=>r.id===selReqId)?.intervalDays === 0 ? 'No expiry (one-time)' : '—')}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Issued By (optional override)</label>
                                    <input value={newTrain.issuedBy ?? ''} onChange={e => setNewTrain(p => ({...p, issuedBy: e.target.value}))} className={`${iCls} mt-1`}
                                        placeholder={trainingRequirements.find(r=>r.id===selReqId)?.issuedBy ?? ''} />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <ActionButton size="sm" variant="secondary" onClick={() => { setAddMode(null); setSelReqId(''); setNewTrain({}); }}>Cancel</ActionButton>
                                <ActionButton size="sm" variant="primary" onClick={addFromCatalog} disabled={!selReqId || !newTrain.completedDate}>
                                    Add & Calculate Expiry
                                </ActionButton>
                            </div>
                        </div>
                    )}

                    {/* Custom training form */}
                    {addMode === 'custom' && (
                        <div className="mb-3 p-3 bg-white/3 border border-white/8 rounded-xl space-y-3">
                            <p className="text-xs text-slate-400 font-medium">Custom training record — manually set expiry date</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Training Name</label>
                                    <input value={newTrain.name ?? ''} onChange={e => setNewTrain(p => ({...p, name: e.target.value}))} className={`${iCls} mt-1`} placeholder="e.g. OJT — Citation X Fuel Cell" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Completed Date</label>
                                    <input type="date" value={newTrain.completedDate ?? ''} onChange={e => setNewTrain(p => ({...p, completedDate: e.target.value}))} className={`${iCls} mt-1`} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Expiry Date (optional)</label>
                                    <input type="date" value={newTrain.expiryDate ?? ''} onChange={e => setNewTrain(p => ({...p, expiryDate: e.target.value}))} className={`${iCls} mt-1`} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Issued By</label>
                                    <input value={newTrain.issuedBy ?? ''} onChange={e => setNewTrain(p => ({...p, issuedBy: e.target.value}))} className={`${iCls} mt-1`} placeholder="FAA, OEM, Tech1 Aero…" />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <ActionButton size="sm" variant="secondary" onClick={() => { setAddMode(null); setNewTrain({}); }}>Cancel</ActionButton>
                                <ActionButton size="sm" variant="primary" onClick={addCustom} disabled={!newTrain.name?.trim() || !newTrain.completedDate}>Add Record</ActionButton>
                            </div>
                        </div>
                    )}

                    {/* Training list */}
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {trainings.length === 0
                            ? <p className="text-xs text-slate-600 italic py-2">No training records</p>
                            : trainings
                                .sort((a, b) => {
                                    const getScore = (t: TrainingRecord) => {
                                        if (!t.expiryDate) return 2;
                                        const d = Math.round((new Date(t.expiryDate).getTime() - Date.now())/86400000);
                                        if (d < 0) return 0;
                                        if (d <= 30) return 1;
                                        return 2;
                                    };
                                    return getScore(a) - getScore(b);
                                })
                                .map((tr, i) => {
                                    const expired  = tr.expiryDate && new Date(tr.expiryDate) < today;
                                    const daysLeft = tr.expiryDate ? Math.round((new Date(tr.expiryDate).getTime() - today.getTime())/86400000) : null;
                                    const expiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                                    return (
                                        <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                                            expired  ? 'bg-red-500/10    border-red-500/20' :
                                            expiring ? 'bg-amber-500/10  border-amber-500/20' :
                                                       'bg-white/3       border-white/8'
                                        }`}>
                                            <div className="min-w-0 flex-1">
                                                <span className={`font-medium ${expired ? 'text-red-300' : expiring ? 'text-amber-300' : 'text-slate-200'}`}>{tr.name}</span>
                                                <span className="text-slate-500 text-xs ml-2">✓ {tr.completedDate}</span>
                                                {tr.expiryDate && (
                                                    <span className={`text-xs ml-2 ${expired ? 'text-red-400 font-semibold' : expiring ? 'text-amber-400' : 'text-slate-500'}`}>
                                                        {expired ? `Expired ${Math.abs(daysLeft!)}d ago` : `Exp. ${tr.expiryDate} (${daysLeft}d)`}
                                                    </span>
                                                )}
                                                {tr.issuedBy && <span className="text-slate-600 text-xs ml-2">· {tr.issuedBy}</span>}
                                            </div>
                                            <button type="button" onClick={() => setTrainings(prev => prev.filter((_, j) => j !== i))}
                                                className="text-slate-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })
                        }
                    </div>
                </div>

                {/* Vacation dates */}
                <div>
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Vacation / Unavailable Dates</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {vacDates.length === 0
                            ? <span className="text-xs text-slate-600 italic">No dates set</span>
                            : vacDates.map(d => (
                                <span key={d} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-600/30 border border-white/10 text-slate-300">
                                    {d}
                                    <button type="button" onClick={() => setVacDates(prev => prev.filter(x => x !== d))} className="text-slate-500 hover:text-red-400 ml-0.5">×</button>
                                </span>
                            ))
                        }
                    </div>
                    <div className="flex gap-2">
                        <input type="date" value={newVacDate} onChange={e => setNewVacDate(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                        <ActionButton size="sm" variant="secondary" onClick={() => { if (newVacDate && !vacDates.includes(newVacDate)) { setVacDates(p => [...p, newVacDate].sort()); setNewVacDate(''); } }}>
                            Add Date
                        </ActionButton>
                    </div>
                </div>
            </form>
        </BaseModal>
    );
};
