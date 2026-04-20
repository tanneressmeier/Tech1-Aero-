import React, { useState, useEffect } from 'react';
import { Technician, TrainingRecord } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';
import { PlusIcon, TrashIcon } from './icons.tsx';

interface EditTechnicianModalProps {
    isOpen:      boolean;
    onClose:     () => void;
    technician:  Technician | null;
    onUpdate:    (technician: Technician) => void;
}

export const EditTechnicianModal: React.FC<EditTechnicianModalProps> = ({
    isOpen, onClose, technician, onUpdate,
}) => {
    const [name,       setName]       = useState('');
    const [role,       setRole]       = useState<Technician['role']>('Technician');
    const [certs,      setCerts]      = useState('');
    const [efficiency, setEfficiency] = useState('85');
    const [vacDates,   setVacDates]   = useState<string[]>([]);
    const [newVacDate, setNewVacDate] = useState('');
    const [trainings,  setTrainings]  = useState<TrainingRecord[]>([]);
    const [newTrain,   setNewTrain]   = useState<Partial<TrainingRecord>>({});

    useEffect(() => {
        if (technician && isOpen) {
            setName(technician.name);
            setRole(technician.role);
            setCerts(technician.certifications.join(', '));
            setEfficiency(technician.efficiency ? Math.round(technician.efficiency * 100).toString() : '85');
            setVacDates(technician.vacation_dates ?? []);
            setTrainings(technician.training_records ?? []);
            setNewVacDate('');
            setNewTrain({});
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
        onClose();
    };

    const addVacDate = () => {
        if (!newVacDate || vacDates.includes(newVacDate)) return;
        setVacDates(prev => [...prev, newVacDate].sort());
        setNewVacDate('');
    };

    const addTraining = () => {
        if (!newTrain.name?.trim() || !newTrain.completedDate) return;
        setTrainings(prev => [...prev, {
            name:          newTrain.name!.trim(),
            completedDate: newTrain.completedDate!,
            expiryDate:    newTrain.expiryDate || undefined,
            issuedBy:      newTrain.issuedBy   || undefined,
        }]);
        setNewTrain({});
    };

    if (!technician) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Edit — ${technician.name}`}
            size="2xl"
            footer={
                <>
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg">
                        Cancel
                    </button>
                    <button type="submit" form="edit-tech-form"
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg">
                        Save Changes
                    </button>
                </>
            }>
            <form id="edit-tech-form" onSubmit={handleSubmit} className="space-y-6">

                {/* ── Core fields ── */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as Technician['role'])}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500">
                            <option value="Technician">Technician</option>
                            <option value="Lead Technician">Lead Technician</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Certifications (comma-separated)</label>
                        <input value={certs} onChange={e => setCerts(e.target.value)} placeholder="A&P, IA, Avionics"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Target Efficiency (%)</label>
                        <input type="number" min="0" max="100" value={efficiency} onChange={e => setEfficiency(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                    </div>
                </div>

                {/* ── Vacation dates ── */}
                <div>
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Vacation / Unavailable Dates</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {vacDates.length === 0
                            ? <span className="text-xs text-slate-600 italic">No dates set</span>
                            : vacDates.map(d => (
                                <span key={d} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-600/30 border border-white/10 text-slate-300">
                                    {d}
                                    <button type="button" onClick={() => setVacDates(prev => prev.filter(x => x !== d))}
                                        className="text-slate-500 hover:text-red-400 transition-colors ml-0.5">×</button>
                                </span>
                            ))
                        }
                    </div>
                    <div className="flex gap-2">
                        <input type="date" value={newVacDate} onChange={e => setNewVacDate(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                        <button type="button" onClick={addVacDate}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-slate-600/50 hover:bg-slate-600 text-white transition-colors">
                            <PlusIcon className="w-3.5 h-3.5" /> Add
                        </button>
                    </div>
                </div>

                {/* ── Training records ── */}
                <div>
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Training Records</h4>
                    <div className="space-y-1.5 mb-3">
                        {trainings.length === 0
                            ? <span className="text-xs text-slate-600 italic">No training records</span>
                            : trainings.map((tr, i) => {
                                const expired = tr.expiryDate && new Date(tr.expiryDate) < new Date();
                                return (
                                    <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${expired ? 'bg-red-500/10 border-red-500/20' : 'bg-white/3 border-white/8'}`}>
                                        <div>
                                            <span className={`font-medium ${expired ? 'text-red-300' : 'text-slate-200'}`}>{tr.name}</span>
                                            <span className="text-slate-500 text-xs ml-2">Completed {tr.completedDate}</span>
                                            {tr.expiryDate && <span className={`text-xs ml-2 ${expired ? 'text-red-400 font-semibold' : 'text-amber-400'}`}>Expires {tr.expiryDate}</span>}
                                            {tr.issuedBy && <span className="text-slate-600 text-xs ml-2">by {tr.issuedBy}</span>}
                                        </div>
                                        <button type="button" onClick={() => setTrainings(prev => prev.filter((_, j) => j !== i))}
                                            className="text-slate-600 hover:text-red-400 transition-colors ml-2">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })
                        }
                    </div>

                    {/* Add new training record */}
                    <div className="grid grid-cols-2 gap-2 p-3 bg-white/3 border border-white/8 rounded-xl">
                        <div className="col-span-2">
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Training Name</label>
                            <input value={newTrain.name ?? ''} onChange={e => setNewTrain(p => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Fuel Cell Inspection"
                                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Completed Date</label>
                            <input type="date" value={newTrain.completedDate ?? ''} onChange={e => setNewTrain(p => ({ ...p, completedDate: e.target.value }))}
                                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Expiry Date (optional)</label>
                            <input type="date" value={newTrain.expiryDate ?? ''} onChange={e => setNewTrain(p => ({ ...p, expiryDate: e.target.value }))}
                                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Issued By (optional)</label>
                            <input value={newTrain.issuedBy ?? ''} onChange={e => setNewTrain(p => ({ ...p, issuedBy: e.target.value }))} placeholder="FAA, OEM…"
                                className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <button type="button" onClick={addTraining}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-sky-600/50 hover:bg-sky-600 text-white transition-colors">
                                <PlusIcon className="w-3.5 h-3.5" /> Add Training Record
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </BaseModal>
    );
};
