import React, { useState, useEffect } from 'react';
import { Technician, TimeLog } from '../types.ts';
import { SidePanel } from './SidePanel.tsx';

interface TimeLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    technicians: Technician[];
    onLogTime: (log: Omit<TimeLog, 'log_id'>) => void;
    currentUser: Technician;
}

export const TimeLogModal: React.FC<TimeLogModalProps> = ({ isOpen, onClose, technicians, onLogTime, currentUser }) => {
    const [technicianId, setTechnicianId] = useState(currentUser.id);
    const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
    const [endTime, setEndTime] = useState('');
    const [isBillable, setIsBillable] = useState(true);
    const [notes, setNotes] = useState('');
    
    useEffect(() => {
        if(isOpen) {
            setTechnicianId(currentUser.id);
            setStartTime(new Date().toISOString().slice(0, 16));
            setEndTime('');
            setIsBillable(true);
            setNotes('');
        }
    }, [isOpen, currentUser.id]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogTime({
            technician_id: technicianId,
            start_time: new Date(startTime).toISOString(),
            end_time: endTime ? new Date(endTime).toISOString() : undefined,
            is_billable: isBillable,
            notes: notes,
        });
        onClose();
    };
    
    const canSelectTechnician = currentUser.role === 'Admin' || currentUser.role === 'Lead Technician';

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Log Time Manually"
            footer={
                <>
                    <div /> {/* Spacer for justify-between */}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" form="time-log-form" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">Log Time</button>
                    </div>
                </>
            }
        >
            <form id="time-log-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="technician" className="block text-sm font-medium text-slate-300">Technician</label>
                    <select 
                        id="technician" 
                        value={technicianId} 
                        onChange={e => setTechnicianId(e.target.value)} 
                        disabled={!canSelectTechnician}
                        className="mt-1 block w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3 text-sm disabled:bg-slate-800 disabled:text-slate-400"
                    >
                        {canSelectTechnician ? (
                            technicians.map(tech => <option key={tech.id} value={tech.id}>{tech.name}</option>)
                         ) : (
                            <option value={currentUser.id}>{currentUser.name}</option>
                         )}
                    </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="startTime" className="block text-sm font-medium text-slate-300">Start Time</label>
                        <input type="datetime-local" id="startTime" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3 text-sm" required />
                    </div>
                    <div>
                        <label htmlFor="endTime" className="block text-sm font-medium text-slate-300">End Time (Optional)</label>
                        <input type="datetime-local" id="endTime" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3 text-sm" />
                    </div>
                </div>
                 <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-300">Notes</label>
                    <textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                    <input id="isBillable" type="checkbox" checked={isBillable} onChange={e => setIsBillable(e.target.checked)} className="h-4 w-4 rounded border-slate-500 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="isBillable" className="text-sm font-medium text-slate-300">Is this time billable?</label>
                </div>
            </form>
        </SidePanel>
    );
};

export default TimeLogModal;
