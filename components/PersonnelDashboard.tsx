
// FIX: Implemented the PersonnelDashboard component to resolve module import errors.
import React, { useState, useMemo } from 'react';
import { Technician, TimeLog, WorkOrder, RepairOrder } from '../types.ts';
import { UsersIcon, ClockIcon, UserPlusIcon, PencilIcon } from './icons.tsx';
import { DashboardHeader } from './DashboardHeader.tsx';
import { AddTechnicianModal } from './AddTechnicianModal.tsx';
import { EditTechnicianModal } from './EditTechnicianModal.tsx';
import { HoursChart } from './HoursChart.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';

// Type definition for the hours chart
export interface TechnicianHours {
    technicianId: string;
    technicianName: string;
    totalHours: number;
    billableHours: number;
}

interface PersonnelDashboardProps {
    technicians: Technician[];
    workOrders: WorkOrder[];
    repairOrders: RepairOrder[];
    generalTimeLogs: TimeLog[];
    activeTimeLogs: TimeLog[];
    currentUser: Technician;
    onAddTechnician: (technician: Omit<Technician, 'id' | 'role'>) => void;
    onUpdateTechnician: (technician: Technician) => void;
    onClockIn: (technicianId: string) => void;
    onClockOut: (technicianId: string) => void;
}

export const PersonnelDashboard: React.FC<PersonnelDashboardProps> = ({
    technicians,
    generalTimeLogs,
    activeTimeLogs,
    currentUser,
    onAddTechnician,
    onUpdateTechnician,
    onClockIn,
    onClockOut,
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTechnician, setEditingTechnician] = useState<Technician | null>(null);
    const permissions = usePermissions(currentUser);

    const activeTechIds = useMemo(() => new Set(activeTimeLogs.map(log => log.technician_id)), [activeTimeLogs]);

    const techHoursData: TechnicianHours[] = useMemo(() => {
        const hoursMap: Record<string, { total: number, billable: number }> = {};
        technicians.forEach(t => hoursMap[t.id] = { total: 0, billable: 0 });

        generalTimeLogs.forEach(log => {
            if (log.end_time && hoursMap[log.technician_id]) {
                const duration = (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / (1000 * 60 * 60);
                hoursMap[log.technician_id].total += duration;
                if (log.is_billable) {
                    hoursMap[log.technician_id].billable += duration;
                }
            }
        });

        const data: TechnicianHours[] = technicians.map(t => ({
            technicianId: t.id,
            technicianName: t.name,
            totalHours: hoursMap[t.id].total,
            billableHours: hoursMap[t.id].billable,
        }));
        
        return data.sort((a, b) => b.totalHours - a.totalHours);

    }, [technicians, generalTimeLogs]);

    const handleEditClick = (tech: Technician) => {
        setEditingTechnician(tech);
    };

    return (
        <div className="space-y-8">
            <DashboardHeader icon={<UsersIcon className="w-8 h-8 text-cyan-400" />} title="Personnel Management">
                {permissions.canAddPersonnel && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500/50 font-medium py-2 px-4 rounded-lg text-sm transition-all duration-300"
                    >
                        <UserPlusIcon className="w-4 h-4" />
                        Add Technician
                    </button>
                )}
            </DashboardHeader>

            <div>
                <h3 className="text-lg font-light text-white uppercase tracking-wider mb-4">Technician Hours Analysis</h3>
                <HoursChart data={techHoursData} />
            </div>

            <div>
                <h3 className="text-lg font-light text-white uppercase tracking-wider mb-4">Technician Status</h3>
                <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
                    <table className="min-w-full divide-y divide-white/5 text-left">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="py-4 pl-6 pr-3 text-xs font-mono text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Role</th>
                                <th className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Certifications</th>
                                <th className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Efficiency</th>
                                <th className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="relative py-4 pl-3 pr-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {technicians.map(tech => {
                                const isClockedIn = activeTechIds.has(tech.id);
                                return (
                                    <tr key={tech.id} className="hover:bg-white/5 transition-colors duration-200">
                                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-white">{tech.name}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400">{tech.role}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400 font-mono text-xs">{tech.certifications.join(', ')}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm font-mono">
                                            {(() => {
                                                const hrs = techHoursData.find(h => h.technicianId === tech.id);
                                                const total    = hrs?.totalHours    ?? 0;
                                                const billable = hrs?.billableHours ?? 0;
                                                const ratio    = total > 0 ? billable / total : null;
                                                const colour   = ratio === null ? 'text-slate-500'
                                                    : ratio >= 0.75 ? 'text-emerald-400'
                                                    : ratio >= 0.5  ? 'text-amber-400'
                                                    : 'text-red-400';
                                                return (
                                                    <div>
                                                        <span className={colour}>
                                                            {ratio !== null ? `${Math.round(ratio * 100)}%` : '—'}
                                                        </span>
                                                        <p className="text-[10px] text-slate-600 font-normal">
                                                            {billable.toFixed(1)}h bill / {total.toFixed(1)}h total
                                                        </p>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            {isClockedIn ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                                    <ClockIcon className="w-3 h-3 mr-1.5"/> Clocked In
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400 border border-slate-500/20">
                                                    Clocked Out
                                                </span>
                                            )}
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium flex items-center justify-end gap-3">
                                            {permissions.canAddPersonnel && (
                                                <button 
                                                    onClick={() => handleEditClick(tech)}
                                                    className="text-slate-500 hover:text-white transition-colors p-1"
                                                    title="Edit Technician"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            {tech.id === currentUser.id && (
                                                isClockedIn ? (
                                                    <button onClick={() => onClockOut(tech.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-1 px-3 rounded-md text-xs transition-all">Clock Out</button>
                                                ) : (
                                                    <button onClick={() => onClockIn(tech.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-1 px-3 rounded-md text-xs transition-all">Clock In</button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <AddTechnicianModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={onAddTechnician}
            />
            <EditTechnicianModal
                isOpen={!!editingTechnician}
                onClose={() => setEditingTechnician(null)}
                technician={editingTechnician}
                onUpdate={onUpdateTechnician}
            />
        </div>
    );
};
