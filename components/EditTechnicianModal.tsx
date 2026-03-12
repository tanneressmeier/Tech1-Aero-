
import React, { useState, useEffect } from 'react';
import { Technician } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';

interface EditTechnicianModalProps {
    isOpen: boolean;
    onClose: () => void;
    technician: Technician | null;
    onUpdate: (technician: Technician) => void;
}

export const EditTechnicianModal: React.FC<EditTechnicianModalProps> = ({ isOpen, onClose, technician, onUpdate }) => {
    const [name, setName] = useState('');
    const [role, setRole] = useState<Technician['role']>('Technician');
    const [certs, setCerts] = useState('');
    const [efficiency, setEfficiency] = useState('85');

    useEffect(() => {
        if (technician) {
            setName(technician.name);
            setRole(technician.role);
            setCerts(technician.certifications.join(', '));
            setEfficiency(technician.efficiency ? Math.round(technician.efficiency * 100).toString() : '85');
        }
    }, [technician, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!technician || !name.trim()) return;

        const updatedTechnician: Technician = {
            ...technician,
            name: name.trim(),
            role: role,
            certifications: certs.split(',').map(c => c.trim()).filter(Boolean),
            efficiency: Math.max(0, Math.min(100, Number(efficiency))) / 100
        };
        onUpdate(updatedTechnician);
        onClose();
    };

    if (!isOpen || !technician) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Technician"
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="edit-tech-form" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Save Changes
                    </button>
                </>
            }
        >
            <form id="edit-tech-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-slate-300">Role</label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="Technician">Technician</option>
                            <option value="Lead Technician">Lead Technician</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="efficiency" className="block text-sm font-medium text-slate-300">Efficiency (%)</label>
                        <input
                            type="number"
                            id="efficiency"
                            min="0"
                            max="100"
                            value={efficiency}
                            onChange={(e) => setEfficiency(e.target.value)}
                            className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="certs" className="block text-sm font-medium text-slate-300">Certifications (comma separated)</label>
                    <input
                        type="text"
                        id="certs"
                        value={certs}
                        onChange={(e) => setCerts(e.target.value)}
                        className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                    <p className="text-xs text-amber-200">
                        <strong>Impact:</strong> Changing efficiency will immediately affect the available billable capacity in the Schedule View.
                    </p>
                </div>
            </form>
        </BaseModal>
    );
};
