
import React, { useState } from 'react';
// FIX: Corrected import path for types by adding the file extension.
import { Technician } from '../types.ts';
// FIX: Added .tsx extension to component import.
import { BaseModal } from './BaseModal.tsx';

interface AddTechnicianModalProps {
    isOpen: boolean;
    onClose: () => void;
    // FIX: Changed type to Omit 'role' as well, to match the parent component's callback signature.
    onAdd: (technician: Omit<Technician, 'id' | 'role'>) => void;
}

export const AddTechnicianModal: React.FC<AddTechnicianModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [certs, setCerts] = useState('');
    const [efficiency, setEfficiency] = useState('85');

    const handleClose = () => {
        setName('');
        setCerts('');
        setEfficiency('85');
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            return;
        }
        const newTechnician = {
            name: name.trim(),
            certifications: certs.split(',').map(c => c.trim()).filter(Boolean),
            efficiency: Math.max(0, Math.min(100, Number(efficiency))) / 100
        };
        onAdd(newTechnician);
        handleClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add New Technician"
            footer={
                <>
                    <button type="button" onClick={handleClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="add-tech-form" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Add Technician
                    </button>
                </>
            }
        >
            <form id="add-tech-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-300">Full Name</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        autoFocus
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="certs" className="block text-sm font-medium text-slate-300">Certifications</label>
                        <input
                            type="text"
                            id="certs"
                            value={certs}
                            onChange={(e) => setCerts(e.target.value)}
                            placeholder="e.g. A&P, IA"
                            className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
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
                <p className="text-xs text-slate-500">Note: Efficiency affects billable capacity planning. Standard is 85%.</p>
            </form>
        </BaseModal>
    );
};
