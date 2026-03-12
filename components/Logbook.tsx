import React, { useState } from 'react';
// FIX: Corrected import paths for types and App constants by adding file extensions.
import { Aircraft, LogbookEntry, Technician } from '../types.ts';
// FIX: Added .tsx extension to component import.
import { PlusIcon } from './icons.tsx';

interface LogbookProps {
    aircraft: Aircraft;
    onUpdateAircraft: (updatedAircraft: Aircraft) => void;
    technicians: Technician[];
}

export const Logbook: React.FC<LogbookProps> = ({ aircraft, onUpdateAircraft, technicians }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEntry, setNewEntry] = useState('');
    const [flightHoursAdded, setFlightHoursAdded] = useState(0);
    const [technicianId, setTechnicianId] = useState(technicians[0]?.id || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const tech = technicians.find(t => t.id === technicianId);
        if (!newEntry.trim() || !tech) return;

        const newLog: LogbookEntry = {
            entry_id: `log-${Date.now()}`,
            aircraft_id: aircraft.id,
            entry_date: new Date().toISOString(),
            description: newEntry.trim(),
            flight_hours: Number(flightHoursAdded) || 0,
            recorded_by: tech.id,
        };

        const updatedAircraft: Aircraft = {
            ...aircraft,
            hours_total: aircraft.hours_total + (Number(flightHoursAdded) || 0),
            logbook_entries: [newLog, ...aircraft.logbook_entries],
        };

        onUpdateAircraft(updatedAircraft);

        // Reset form
        setShowAddForm(false);
        setNewEntry('');
        setFlightHoursAdded(0);
        setTechnicianId(technicians[0]?.id || '');
    };

    return (
        <div className="mt-4 space-y-4">
            {!showAddForm && (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors"
                >
                    <PlusIcon className="w-4 h-4" /> Add Logbook Entry
                </button>
            )}

            {showAddForm && (
                <form onSubmit={handleSubmit} className="p-4 bg-slate-900/50 rounded-lg space-y-3">
                    <div>
                        <label htmlFor="entry" className="block text-sm font-medium text-slate-300">Entry Details</label>
                        <textarea
                            id="entry"
                            rows={3}
                            value={newEntry}
                            onChange={(e) => setNewEntry(e.target.value)}
                            className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="flightHours" className="block text-sm font-medium text-slate-300">Flight Hours Added</label>
                            <input
                                type="number"
                                id="flightHours"
                                step="0.1"
                                value={flightHoursAdded}
                                onChange={(e) => setFlightHoursAdded(Number(e.target.value))}
                                className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="technician" className="block text-sm font-medium text-slate-300">Technician</label>
                            <select
                                id="technician"
                                value={technicianId}
                                onChange={(e) => setTechnicianId(e.target.value)}
                                className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddForm(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm">Cancel</button>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors text-sm">Save Entry</button>
                    </div>
                </form>
            )}

            <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                {aircraft.logbook_entries.slice().sort((a,b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()).map(log => (
                    <div key={log.entry_id} className="bg-slate-800 p-3 rounded-md">
                        <p className="text-slate-300 text-sm">{log.description}</p>
                        <div className="text-xs text-slate-400 mt-2 flex justify-between">
                            <span>{technicians.find(t=>t.id === log.recorded_by)?.name} on {new Date(log.entry_date).toLocaleDateString()}</span>
                            {log.flight_hours && log.flight_hours > 0 && <span className="font-semibold text-cyan-400">+{log.flight_hours.toFixed(1)} hrs</span>}
                        </div>
                    </div>
                ))}
                {aircraft.logbook_entries.length === 0 && (
                    <p className="text-center text-slate-500 italic py-4">No logbook entries yet.</p>
                )}
            </div>
        </div>
    );
};