import React, { useState } from 'react';
// FIX: Corrected import path for types by adding the file extension.
import { RepairOrder, Aircraft, Squawk } from '../types.ts';
// FIX: Added .tsx extension to component import.
import { XMarkIcon } from './icons.tsx';

interface AddRepairOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    aircraftList: Aircraft[];
    onAdd: (newRepairOrder: Omit<RepairOrder, 'ro_id' | 'created_date'>) => void;
}

export const AddRepairOrderModal: React.FC<AddRepairOrderModalProps> = ({ isOpen, onClose, aircraftList, onAdd }) => {
    const [aircraftId, setAircraftId] = useState(aircraftList[0]?.id || '');
    const [description, setDescription] = useState('');
    const [squawkText, setSquawkText] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const aircraft = aircraftList.find(ac => ac.id === aircraftId);
        if (!aircraft || !description.trim() || !squawkText.trim()) {
            alert('Please fill out all fields.');
            return;
        }

        const newRO: Omit<RepairOrder, 'ro_id' | 'created_date'> = {
            aircraft_id: aircraft.id,
            aircraft_tail_number: aircraft.tail_number,
            description: description.trim(),
            status: 'Pending',
            priority: 'routine',
            squawks: squawkText.split('\n').filter(line => line.trim() !== '').map((line, index): Squawk => ({
                squawk_id: `sq-${Date.now()}-${index}`,
                description: line.trim(),
                status: 'open',
                priority: 'routine',
                time_logs: [],
                category: 'Maintenance',
                rii_inspection_enabled: false,
                notes: '',
                always_show_notes: false,
                created_by: 'System',
                created_at: new Date().toISOString(),
                owner_auth: false,
                hours_estimate: 0,
                department: 'Maintenance',
                billing_method: 'Hourly',
                billing_customer: 'Elevate MRO',
                ship_in_charge: 0,
                use_flat_part_charge: false,
                do_not_bill: false,
                do_not_tax_shop_labor: false,
                logbook_category_airframe: true,
                logbook_category_powerplant: false,
                assigned_technician_ids: [],
                used_tool_ids: [],
                used_parts: [],
                resolution: '',
                // FIX: Added missing signatures property to conform to the Squawk type.
                signatures: {
                    work_complete: null,
                    operational_check: null,
                    inspector: null,
                    return_to_service: null,
                },
            }))
        };
        onAdd(newRO);
        onClose();
        // Reset form
        setDescription('');
        setSquawkText('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                         <h2 className="text-2xl font-bold text-white">New Repair Order</h2>
                         <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><XMarkIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                         <div>
                            <label htmlFor="aircraft" className="block text-sm font-medium text-slate-300">Aircraft</label>
                            <select id="aircraft" value={aircraftId} onChange={e => setAircraftId(e.target.value)} className="mt-1 block w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3">
                                {aircraftList.map(ac => <option key={ac.id} value={ac.id}>{ac.tail_number} ({ac.model})</option>)}
                            </select>
                        </div>
                        <div>
                             <label htmlFor="description" className="block text-sm font-medium text-slate-300">Description</label>
                             <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3" required />
                        </div>
                         <div>
                            <label htmlFor="squawks" className="block text-sm font-medium text-slate-300">Tasks / Squawks</label>
                            <textarea id="squawks" rows={4} value={squawkText} onChange={e => setSquawkText(e.target.value)} placeholder="Enter each task on a new line" className="mt-1 block w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3" required />
                        </div>
                    </div>
                    <div className="p-6 bg-slate-900/50 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">Create Order</button>
                    </div>
                </form>
            </div>
        </div>
    );
};