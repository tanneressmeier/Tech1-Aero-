import React from 'react';
import { Squawk, Technician } from '../types.ts';
import { UserCircleIcon, ExclamationCircleIcon, CheckBadgeIcon, ClockIcon, WrenchIcon } from './icons.tsx';

interface SquawkKanbanBoardProps {
    squawks: Squawk[];
    technicians: Technician[];
    onUpdateStatus: (squawkId: string, newStatus: Squawk['status']) => void;
    onComplete: (squawkId: string) => void;
}

const COLUMNS: { id: Squawk['status'] | 'inspection'; label: string; color: string }[] = [
    { id: 'open', label: 'Open', color: 'border-slate-500' },
    { id: 'in_progress', label: 'In Progress', color: 'border-blue-500' },
    { id: 'inspection', label: 'Inspection', color: 'border-yellow-500' }, // Mapping 'on_hold' to Inspection for this view
    { id: 'completed', label: 'Complete', color: 'border-green-500' },
];

export const SquawkKanbanBoard: React.FC<SquawkKanbanBoardProps> = ({ squawks, technicians, onUpdateStatus, onComplete }) => {

    const handleDragStart = (e: React.DragEvent, squawkId: string) => {
        e.dataTransfer.setData('text/plain', squawkId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
        e.preventDefault();
        const squawkId = e.dataTransfer.getData('text/plain');
        
        if (!squawkId) return;

        // Determine the new status based on the column ID
        let newStatus: Squawk['status'];
        if (targetColumnId === 'inspection') {
            newStatus = 'on_hold';
        } else if (targetColumnId === 'completed') {
            // Special handling for completion to trigger signature
            onComplete(squawkId);
            return;
        } else {
            newStatus = targetColumnId as Squawk['status'];
        }

        // Only update if it's a status change
        const squawk = squawks.find(s => s.squawk_id === squawkId);
        if (squawk && squawk.status !== newStatus) {
            onUpdateStatus(squawkId, newStatus);
        }
    };

    const getColumnSquawks = (columnId: string) => {
        return squawks.filter(s => {
            if (columnId === 'inspection') return s.status === 'on_hold';
            if (columnId === 'completed') return s.status === 'completed';
            return s.status === columnId;
        });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'aog': return 'border-l-4 border-red-500';
            case 'urgent': return 'border-l-4 border-orange-500';
            default: return 'border-l-4 border-slate-600';
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 h-full overflow-x-auto pb-4">
            {COLUMNS.map(column => (
                <div 
                    key={column.id} 
                    className="flex-1 min-w-[280px] bg-slate-800/30 rounded-lg border border-slate-700/50 flex flex-col"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.id)}
                >
                    <div className={`p-3 font-bold text-slate-200 border-b border-slate-700 flex justify-between items-center ${column.color.replace('border', 'border-b-2')}`}>
                        {column.label}
                        <span className="bg-slate-700 text-xs px-2 py-0.5 rounded-full text-slate-300">
                            {getColumnSquawks(column.id).length}
                        </span>
                    </div>
                    <div className="p-2 flex-1 space-y-2 overflow-y-auto min-h-[150px]">
                        {getColumnSquawks(column.id).map(squawk => (
                            <div
                                key={squawk.squawk_id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, squawk.squawk_id)}
                                className={`bg-slate-800 p-3 rounded shadow-sm cursor-grab active:cursor-grabbing hover:bg-slate-750 transition-colors ${getPriorityColor(squawk.priority)}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-slate-400 font-mono">{squawk.squawk_id.split('-').pop()}</span>
                                    {squawk.priority !== 'routine' && (
                                        <span className="text-xs font-bold text-orange-400 uppercase">{squawk.priority}</span>
                                    )}
                                </div>
                                <p className="text-sm text-white font-medium mb-3 line-clamp-3">{squawk.description}</p>
                                
                                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {squawk.assigned_technician_ids.length > 0 ? (
                                            squawk.assigned_technician_ids.map(techId => {
                                                const tech = technicians.find(t => t.id === techId);
                                                return (
                                                    <div key={techId} className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-800 bg-slate-600 flex items-center justify-center text-[10px] text-white font-bold" title={tech?.name}>
                                                        {tech?.name.charAt(0)}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <span className="text-xs text-slate-500 italic">Unassigned</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 text-slate-500">
                                        {squawk.time_logs.length > 0 && <ClockIcon className="w-4 h-4 text-blue-400" />}
                                        {squawk.used_parts.length > 0 && <WrenchIcon className="w-4 h-4 text-yellow-400" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};