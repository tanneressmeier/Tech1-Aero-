import React, { useState, useMemo, useEffect } from 'react';
import { RepairOrder, Aircraft } from '../types.ts';
import { WrenchScrewdriverIcon, PlusIcon } from './icons.tsx';
import { AddRepairOrderModal } from './AddRepairOrderModal.tsx';
import { DashboardHeader } from './DashboardHeader.tsx';
import { FilterPanel, FilterConfig, FilterValue } from './FilterPanel.tsx';
import { SearchIntent } from '../services/geminiService.ts';

interface RepairOrderDashboardProps {
    repairOrders: RepairOrder[];
    aircraftList: Aircraft[];
    onAddRepairOrder: (newRO: Omit<RepairOrder, 'ro_id' | 'created_date'>) => void;
    onSelectOrder: (orderId: string) => void;
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

export const RepairOrderDashboard: React.FC<RepairOrderDashboardProps> = ({ repairOrders, aircraftList, onAddRepairOrder, onSelectOrder, initialFilters }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const filteredRepairOrders = useMemo(() => {
        return repairOrders.filter(ro => {
            const { aircraftId, status, priority, dateRange, searchTerm } = filters;
            const search = (searchTerm as string).toLowerCase();

            if (search && !(ro.ro_id.toLowerCase().includes(search) || ro.description.toLowerCase().includes(search))) {
                return false;
            }
            if (aircraftId !== 'all' && ro.aircraft_id !== aircraftId) {
                return false;
            }
            if (status !== 'all' && ro.status !== status) {
                return false;
            }
            if (priority !== 'all' && ro.priority !== priority) {
                return false;
            }
            const dr = dateRange as { start: string, end: string };
            if (dr.start && new Date(ro.created_date) < new Date(dr.start)) {
                return false;
            }
            if (dr.end && new Date(ro.created_date) > new Date(dr.end)) {
                return false;
            }
            return true;
        });
    }, [repairOrders, filters]);

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
        { name: 'dateRange', label: 'Created Date', type: 'date-range' }
    ];

    return (
        <div className="space-y-6">
            <DashboardHeader
                icon={<WrenchScrewdriverIcon className="w-8 h-8 text-amber-400" />}
                title="Repair Orders"
                onShowFilters={() => setIsFilterPanelOpen(true)}
                activeFilters={filters}
                onFilterClear={handleClearFilter}
                filterLabels={filterLabels}
            >
                <input
                    type="text"
                    placeholder="Search RO# or description..."
                    value={filters.searchTerm as string}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-white border border-amber-500/20 hover:border-amber-500/50 font-medium py-2 px-4 rounded-lg text-sm transition-all duration-300"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Repair
                </button>
            </DashboardHeader>
            
            <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
                 <table className="min-w-full divide-y divide-white/5 text-left">
                    <thead>
                        <tr className="bg-white/5">
                            <th scope="col" className="py-4 pl-6 pr-3 text-xs font-mono text-slate-400 uppercase tracking-wider">RO #</th>
                            <th scope="col" className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Aircraft</th>
                            <th scope="col" className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-3 py-4 text-xs font-mono text-slate-400 uppercase tracking-wider">Status</th>
                            <th scope="col" className="relative py-4 pl-3 pr-6">
                                <span className="sr-only">View</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredRepairOrders.map((ro) => (
                            <tr key={ro.ro_id} className="hover:bg-white/5 transition-colors duration-200 group">
                                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-mono text-amber-400 group-hover:text-amber-300">{ro.ro_id}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-white">{ro.aircraft_tail_number}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400 truncate max-w-xs">{ro.description}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                        ro.priority === 'aog' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        ro.priority === 'urgent' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    }`}>
                                        {ro.priority.toUpperCase()}
                                    </span>
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                                    <button onClick={() => onSelectOrder(ro.ro_id)} className="text-slate-500 hover:text-white transition-colors">
                                        View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredRepairOrders.length === 0 && <div className="p-12 text-center text-slate-500 font-mono uppercase tracking-widest text-sm">No repair orders match the current filters</div>}
            </div>
            <AddRepairOrderModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                aircraftList={aircraftList}
                onAdd={onAddRepairOrder}
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