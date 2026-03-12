import React, { useState, useMemo, useEffect } from 'react';
import { WorkOrder, Aircraft } from '../types.ts';
import { ClipboardListIcon, PlusIcon } from './icons.tsx';
import { AddWorkOrderModal } from './AddWorkOrderModal.tsx';
import { DashboardHeader } from './DashboardHeader.tsx';
import { FilterPanel, FilterConfig, FilterValue } from './FilterPanel.tsx';
import { SearchIntent } from '../services/geminiService.ts';

interface WorkOrderDashboardProps {
    workOrders: WorkOrder[];
    aircraftList: Aircraft[];
    onSelectOrder: (orderId: string) => void;
    onAddWorkOrder: (newWorkOrder: Omit<WorkOrder, 'wo_id'>) => void;
    initialFilters?: SearchIntent['filters'] | null;
}

const initialFilterState = {
    aircraftId: 'all',
    status: 'all',
    priority: 'all',
    dateRange: { start: '', end: '' },
    searchTerm: '',
};

const filterLabels: Record<string, string> = {
    aircraftId: 'Aircraft',
    status: 'Status',
    priority: 'Priority',
    dateRange: 'Date'
};


export const WorkOrderDashboard: React.FC<WorkOrderDashboardProps> = ({ workOrders, aircraftList, onSelectOrder, onAddWorkOrder, initialFilters }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filters, setFilters] = useState<Record<string, FilterValue>>(initialFilterState);

     useEffect(() => {
        if (initialFilters) {
            const newFilters: any = { ...initialFilterState };
            if (initialFilters.aircraftTail) {
                const aircraft = aircraftList.find(ac => ac.tail_number === initialFilters.aircraftTail);
                if (aircraft) newFilters.aircraftId = aircraft.id;
            }
            if (initialFilters.status) {
                 // Ensure status matches the expected format (e.g., 'Pending', not 'pending')
                const formattedStatus = initialFilters.status.charAt(0).toUpperCase() + initialFilters.status.slice(1);
                newFilters.status = formattedStatus;
            }
            if (initialFilters.searchTerm) {
                newFilters.searchTerm = initialFilters.searchTerm;
            }
            setFilters(newFilters);
        }
    }, [initialFilters, aircraftList]);

    const handleFilterChange = (name: string, value: FilterValue) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleClearFilter = (name: string) => {
        setFilters(prev => ({...prev, [name]: initialFilterState[name as keyof typeof initialFilterState]}));
    }

    const filteredWorkOrders = useMemo(() => {
        return workOrders.filter(wo => {
            const { aircraftId, status, priority, dateRange, searchTerm } = filters;
            const search = (searchTerm as string).toLowerCase();
            
            if (search && !(wo.wo_id.toLowerCase().includes(search) || wo.visit_name.toLowerCase().includes(search))) {
                return false;
            }
            if (aircraftId !== 'all' && wo.aircraft_id !== aircraftId) {
                return false;
            }
            if (status !== 'all' && wo.status !== status) {
                return false;
            }
            if (priority !== 'all' && wo.priority !== priority) {
                return false;
            }
            const dr = dateRange as { start: string, end: string };
            if (dr.start && new Date(wo.scheduled_date) < new Date(dr.start)) {
                return false;
            }
            if (dr.end && new Date(wo.scheduled_date) > new Date(dr.end)) {
                return false;
            }
            return true;
        });
    }, [workOrders, filters]);

    const filterConfig: FilterConfig[] = [
        { name: 'aircraftId', label: 'Aircraft', type: 'select', options: [
            { value: 'all', label: 'All Aircraft' },
            ...aircraftList.map(ac => ({ value: ac.id, label: `${ac.tail_number} (${ac.model})`}))
        ]},
        { name: 'status', label: 'Status', type: 'select', options: [
            { value: 'all', label: 'All Statuses' },
            { value: 'Pending', label: 'Pending' },
            { value: 'In Progress', label: 'In Progress' },
            { value: 'Completed', label: 'Completed' },
            { value: 'On Hold', label: 'On Hold' },
            { value: 'Cancelled', label: 'Cancelled' },
        ]},
        { name: 'priority', label: 'Priority', type: 'select', options: [
            { value: 'all', label: 'All Priorities' },
            { value: 'routine', label: 'Routine' },
            { value: 'urgent', label: 'Urgent' },
            { value: 'aog', label: 'AOG' },
        ]},
        { name: 'dateRange', label: 'Scheduled Date', type: 'date-range' }
    ];

    return (
        <div className="space-y-6">
            <DashboardHeader 
                icon={<ClipboardListIcon className="w-8 h-8 text-cyan-400" />} 
                title="Work Orders"
                onShowFilters={() => setIsFilterPanelOpen(true)}
                activeFilters={filters}
                onFilterClear={handleClearFilter}
                filterLabels={filterLabels}
            >
                <input
                    type="text"
                    placeholder="Search WO# or visit..."
                    value={filters.searchTerm as string}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                />
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500/50 font-medium py-2 px-4 rounded-lg text-sm transition-all duration-300"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Order
                </button>
            </DashboardHeader>
            
            <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
                <table className="min-w-full divide-y divide-white/5 text-left">
                    <thead>
                        <tr className="bg-white/5">
                            <th scope="col" className="py-4 pl-6 pr-3 text-xs font-mono text-slate-400 uppercase tracking-wider">WO #</th>
                            <th scope="col" className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Aircraft</th>
                            <th scope="col" className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Visit Name</th>
                            <th scope="col" className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Date</th>
                            <th scope="col" className="relative py-4 pl-3 pr-6">
                                <span className="sr-only">View</span>
                            </th>
                        </tr>
                    </thead>
                     <tbody className="divide-y divide-white/5">
                        {filteredWorkOrders.map((wo) => (
                            <tr key={wo.wo_id} className="hover:bg-white/5 transition-colors duration-200 group">
                                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-mono text-sky-400 group-hover:text-sky-300">{wo.wo_id}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-white">{wo.aircraft_tail_number}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400">{wo.visit_name}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                        wo.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        wo.status === 'In Progress' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                        wo.status === 'Pending' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                                        'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {wo.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400 font-mono">{new Date(wo.scheduled_date).toLocaleDateString()}</td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                                    <button onClick={() => onSelectOrder(wo.wo_id)} className="text-slate-500 hover:text-white transition-colors">
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredWorkOrders.length === 0 && <div className="p-12 text-center text-slate-500 font-mono uppercase tracking-widest text-sm">No work orders found</div>}
            </div>
            <AddWorkOrderModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                aircraftList={aircraftList}
                onAdd={onAddWorkOrder}
            />
            <FilterPanel 
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                filters={filters}
                onFilterChange={handleFilterChange}
                filterConfig={filterConfig}
                onClearAll={() => setFilters(initialFilterState)}
            />
        </div>
    );
};