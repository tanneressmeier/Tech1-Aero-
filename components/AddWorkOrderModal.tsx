import React, { useState } from 'react';
// FIX: Corrected import path for types by adding the file extension.
import { WorkOrder, Aircraft } from '../types.ts';
// FIX: Added .tsx extension to component import.
import { XMarkIcon } from './icons.tsx';

interface AddWorkOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    aircraftList: Aircraft[];
    onAdd: (newWorkOrder: Omit<WorkOrder, 'wo_id'>) => void;
}

export const AddWorkOrderModal: React.FC<AddWorkOrderModalProps> = ({ isOpen, onClose, aircraftList, onAdd }) => {
    const [aircraftId, setAircraftId] = useState(aircraftList[0]?.id || '');
    const [visitName, setVisitName] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const aircraft = aircraftList.find(ac => ac.id === aircraftId);
        if (!aircraft || !visitName.trim() || !scheduledDate.trim()) {
            alert('Please fill out all fields.');
            return;
        }

        const newWO: Omit<WorkOrder, 'wo_id'> = {
            aircraft_id: aircraft.id,
            aircraft_tail_number: aircraft.tail_number,
            visit_name: visitName.trim(),
            scheduled_date: scheduledDate,
            status: 'Pending',
            priority: 'routine',
            squawks: []
        };
        onAdd(newWO);
        onClose();
        setVisitName('');
        setScheduledDate('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold">New Work Order</h2>
                        <button type="button" onClick={onClose}><XMarkIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="p-4 space-y-4">
                         <div>
                            <label htmlFor="aircraft" className="block text-sm">Aircraft</label>
                            <select id="aircraft" value={aircraftId} onChange={e => setAircraftId(e.target.value)} className="mt-1 block w-full bg-slate-900 rounded-md p-2">
                                {aircraftList.map(ac => <option key={ac.id} value={ac.id}>{ac.tail_number}</option>)}
                            </select>
                        </div>
                        <div>
                             <label htmlFor="visitName" className="block text-sm">Visit Name</label>
                             <input type="text" id="visitName" value={visitName} onChange={e => setVisitName(e.target.value)} className="mt-1 block w-full bg-slate-900 rounded-md p-2" required />
                        </div>
                        <div>
                             <label htmlFor="scheduledDate" className="block text-sm">Scheduled Date</label>
                             <input type="date" id="scheduledDate" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="mt-1 block w-full bg-slate-900 rounded-md p-2" required />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 flex justify-end gap-3">
                        <button type="button" onClick={onClose}>Cancel</button>
                        <button type="submit">Create Order</button>
                    </div>
                </form>
            </div>
        </div>
    );
};