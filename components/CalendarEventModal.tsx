
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal.tsx';
import { WorkOrder, RepairOrder, Technician } from '../types.ts';
import { UserPlusIcon, ChartBarIcon } from './icons.tsx';

interface CalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: WorkOrder | RepairOrder | null;
    technicians: Technician[];
    onSaveAssignments: (orderType: 'WO' | 'RO', orderId: string, technicianIds: string[]) => void;
    onUpdateOrder: (order: WorkOrder | RepairOrder) => void;
    onNavigateToOrder: (view: 'work_orders' | 'repair_orders', orderId: string, initialView?: 'list' | 'board' | 'gantt') => void;
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({ isOpen, onClose, order, technicians, onSaveAssignments, onUpdateOrder, onNavigateToOrder }) => {
    const [selectedTechIds, setSelectedTechIds] = useState<Set<string>>(new Set());
    const [newDate, setNewDate] = useState('');

    useEffect(() => {
        if (order) {
            // Initialize with technicians from the first squawk as a baseline
            setSelectedTechIds(new Set(order.squawks[0]?.assigned_technician_ids || []));
            // Initialize date
            const currentDate = 'scheduled_date' in order ? order.scheduled_date : order.created_date;
            setNewDate(currentDate.split('T')[0]);
        } else {
            setSelectedTechIds(new Set());
            setNewDate('');
        }
    }, [order]);

    if (!order) return null;
    
    const handleToggleTechnician = (techId: string) => {
        setSelectedTechIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(techId)) {
                newSet.delete(techId);
            } else {
                newSet.add(techId);
            }
            return newSet;
        });
    };

    const handleSaveChanges = () => {
        const orderType = 'wo_id' in order ? 'WO' : 'RO';
        const orderId = 'wo_id' in order ? order.wo_id : order.ro_id;
        
        // Save technician assignments
        onSaveAssignments(orderType, orderId, Array.from(selectedTechIds));

        // Save date change
        const updatedOrder = 'wo_id' in order
            ? { ...order, scheduled_date: newDate }
            : { ...order, created_date: newDate }; // Note: updating created_date for ROs
        onUpdateOrder(updatedOrder as WorkOrder | RepairOrder);

        onClose();
    };

    const handleOpenGantt = () => {
        const orderId = 'wo_id' in order ? order.wo_id : order.ro_id;
        const view = 'wo_id' in order ? 'work_orders' : 'repair_orders';
        onNavigateToOrder(view, orderId, 'gantt');
        onClose();
    }

    const orderType = 'wo_id' in order ? 'Work Order' : 'Repair Order';
    const orderDescription = 'visit_name' in order ? order.visit_name : order.description;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Edit Schedule - ${order.aircraft_tail_number}`}
            footer={
                 <>
                    <button type="button" onClick={handleOpenGantt} className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 font-bold py-2 px-4 rounded-md transition-colors flex items-center gap-2 mr-auto">
                        <ChartBarIcon className="w-4 h-4" /> Open Gantt Chart
                    </button>
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSaveChanges} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Save Changes
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <p className="text-sm text-slate-400">{orderType}</p>
                    <p className="font-semibold text-lg text-white">{orderDescription}</p>
                </div>

                <div>
                    <label htmlFor="scheduledDate" className="block text-sm font-medium text-slate-300">Scheduled Date</label>
                    <input 
                        type="date" 
                        id="scheduledDate" 
                        value={newDate} 
                        onChange={(e) => setNewDate(e.target.value)}
                        className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <h4 className="font-semibold text-slate-300 mb-2 flex items-center gap-2"><UserPlusIcon className="w-5 h-5" /> Available Technicians</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-slate-900/50 rounded-md">
                        {technicians.map(tech => (
                            <div key={tech.id} className="flex items-center">
                                <input 
                                    type="checkbox"
                                    id={`tech-${tech.id}`}
                                    checked={selectedTechIds.has(tech.id)}
                                    onChange={() => handleToggleTechnician(tech.id)}
                                    className="h-4 w-4 rounded border-slate-500 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor={`tech-${tech.id}`} className="ml-3 block text-sm text-slate-200">
                                    {tech.name} <span className="text-xs text-slate-400">({tech.certifications.join(', ')})</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="text-xs text-slate-500">Note: Assigning technicians here will apply them to all tasks within this order.</p>
            </div>
        </BaseModal>
    );
};
