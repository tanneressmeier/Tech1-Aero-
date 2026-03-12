import React, { useState, useMemo, useEffect } from 'react';
import { Tool } from '../types.ts';
import { WrenchIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, CheckBadgeIcon, ExclamationTriangleIcon, DocumentArrowDownIcon } from './icons.tsx';
import { ToolEditModal } from './ToolEditModal.tsx';
import { DashboardHeader } from './DashboardHeader.tsx';
import { SearchIntent } from '../services/geminiService.ts';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ToolingReportModal } from './ToolingReportModal.tsx';
import { FilterPanel, FilterConfig, FilterValue } from './FilterPanel.tsx';

interface ToolingDashboardProps {
    tools: Tool[];
    onAddTool: (tool: Omit<Tool, 'id'>) => void;
    onUpdateTool: (tool: Tool) => void;
    onDeleteTool: (toolId: string) => void;
    initialFilters: SearchIntent['filters'] | null;
}

type SortKey = keyof Tool | 'calibrationStatus';

const getCalibrationStatus = (tool: Tool): 'valid' | 'due_soon' | 'overdue' | 'n/a' => {
    if (!tool.calibrationRequired || !tool.calibrationDueDate) return 'n/a';
    const dueDate = new Date(tool.calibrationDueDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    if (dueDate < today) return 'overdue';
    if (dueDate <= thirtyDaysFromNow) return 'due_soon';
    return 'valid';
};

const CalibrationStatusBadge: React.FC<{ status: 'valid' | 'due_soon' | 'overdue' | 'n/a' }> = ({ status }) => {
    switch (status) {
        case 'valid': return <span className="flex items-center gap-1 text-green-400"><CheckBadgeIcon className="w-4 h-4" /> Valid</span>;
        case 'due_soon': return <span className="flex items-center gap-1 text-yellow-400"><ExclamationTriangleIcon className="w-4 h-4" /> Due Soon</span>;
        case 'overdue': return <span className="flex items-center gap-1 text-red-400"><ExclamationTriangleIcon className="w-4 h-4" /> Overdue</span>;
        case 'n/a': return <span className="text-slate-500">N/A</span>;
    }
};

const initialFilterState = {
    searchTerm: '',
    calibrationStatus: 'all',
    make: 'all',
};

const filterLabels: Record<string, string> = {
    calibrationStatus: 'Cal. Status',
    make: 'Make',
};

export const ToolingDashboard: React.FC<ToolingDashboardProps> = ({ tools, onAddTool, onUpdateTool, onDeleteTool, initialFilters }) => {
    const [filters, setFilters] = useState<Record<string, FilterValue>>(initialFilterState);
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);

     useEffect(() => {
        if (initialFilters) {
            const newFilters: any = { ...initialFilterState };
            newFilters.searchTerm = initialFilters.searchTerm || '';
            if(initialFilters.calibrationStatus === 'overdue' || initialFilters.calibrationStatus === 'due_soon') {
                newFilters.calibrationStatus = 'needs_calibration';
            } else if (initialFilters.calibrationStatus === 'valid') {
                newFilters.calibrationStatus = 'calibrated';
            }
            setFilters(newFilters);
        }
    }, [initialFilters]);

    const filteredAndSortedTools = useMemo(() => {
        const lowerSearch = (filters.searchTerm as string).toLowerCase();
        const filtered = tools.filter(tool => {
            const matchesSearch = tool.name.toLowerCase().includes(lowerSearch) ||
                tool.description.toLowerCase().includes(lowerSearch) ||
                (tool.serial && tool.serial.toLowerCase().includes(lowerSearch));
            
            if (!matchesSearch) return false;

            const calStatus = filters.calibrationStatus as string;
            if (calStatus !== 'all') {
                const status = getCalibrationStatus(tool);
                if (calStatus === 'calibrated' && status !== 'valid') return false;
                if (calStatus === 'needs_calibration' && (status !== 'due_soon' && status !== 'overdue')) return false;
            }

            const make = filters.make as string;
            if (make !== 'all' && tool.make !== make) return false;
            
            return true;
        });

        return filtered.sort((a, b) => {
            const aVal = sortKey === 'calibrationStatus' ? getCalibrationStatus(a) : a[sortKey];
            const bVal = sortKey === 'calibrationStatus' ? getCalibrationStatus(b) : b[sortKey];
            let comparison = 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                comparison = aVal.localeCompare(bVal);
            } else if (Number(aVal) > Number(bVal)) {
                comparison = 1;
            } else if (Number(aVal) < Number(bVal)) {
                comparison = -1;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [tools, filters, sortKey, sortDirection]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };
    
    const handleFilterChange = (name: string, value: FilterValue) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleClearFilter = (name: string) => {
        setFilters(prev => ({...prev, [name]: initialFilterState[name as keyof typeof initialFilterState]}));
    }

    const handleSaveTool = (toolData: Omit<Tool, 'id'> | Tool) => {
        if ('id' in toolData) {
            onUpdateTool(toolData);
        } else {
            onAddTool(toolData);
        }
        setIsEditModalOpen(false);
    };
    
    const handleDeleteTool = (toolId: string) => {
        if (window.confirm('Are you sure you want to delete this tool?')) {
            onDeleteTool(toolId);
            setIsEditModalOpen(false);
        }
    };

    const handleEditTool = (tool: Tool) => {
        setEditingTool(tool);
        setIsEditModalOpen(true);
    };
    
    const handleAddNew = () => {
        setEditingTool(null);
        setIsEditModalOpen(true);
    };

    const filterConfig: FilterConfig[] = useMemo(() => [
        { name: 'calibrationStatus', label: 'Calibration Status', type: 'select', options: [
            { value: 'all', label: 'All Statuses' },
            { value: 'calibrated', label: 'Calibration Valid' },
            { value: 'needs_calibration', label: 'Needs Calibration' },
        ]},
        { name: 'make', label: 'Make', type: 'select', options: [
            { value: 'all', label: 'All Makes' },
            ...Array.from(new Set(tools.map(t => t.make).filter(Boolean))).sort().map(make => ({ value: make!, label: make! }))
        ]},
    ], [tools]);

    const SortableHeader: React.FC<{ sortKey: SortKey, label: string }> = ({ sortKey: key, label }) => (
        <div onClick={() => handleSort(key)} className="flex items-center gap-1 cursor-pointer hover:text-white">
            {label}
            {sortKey === key && (sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>)}
        </div>
    );
    
    const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
        const tool = filteredAndSortedTools[index];
        const status = getCalibrationStatus(tool);
        return (
            <div
                style={style}
                onClick={() => handleEditTool(tool)}
                className="grid grid-cols-[minmax(0,_2fr)_minmax(0,_3fr)_minmax(0,_1.5fr)_minmax(0,_1fr)_minmax(0,_1fr)] gap-x-4 items-center px-3 py-3 border-t border-slate-700 hover:bg-slate-800 cursor-pointer"
            >
                <div className="text-sm text-white font-semibold truncate" title={tool.name}>{tool.name}</div>
                <div className="text-sm text-slate-300 truncate" title={tool.description}>{tool.description}</div>
                <div className="text-sm text-slate-400 truncate" title={tool.serial || ''}>{tool.serial || 'N/A'}</div>
                <div className="text-sm text-slate-400">{tool.calibrationDueDate ? new Date(tool.calibrationDueDate).toLocaleDateString() : 'N/A'}</div>
                <div className="text-sm"><CalibrationStatusBadge status={status} /></div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
            <DashboardHeader 
                icon={<WrenchIcon className="w-8 h-8 text-cyan-400"/>} 
                title="Tooling Inventory"
                onShowFilters={() => setIsFilterPanelOpen(true)}
                activeFilters={filters}
                onFilterClear={handleClearFilter}
                filterLabels={filterLabels}
            >
                <input
                    type="text"
                    placeholder="Search tools..."
                    value={filters.searchTerm as string}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-sm"
                />
                <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-3 rounded-lg text-sm">
                    <DocumentArrowDownIcon className="w-4 h-4" /> Export
                </button>
                <button onClick={handleAddNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-sm">
                    <PlusIcon className="w-4 h-4"/> Add Tool
                </button>
            </DashboardHeader>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 flex-grow flex flex-col overflow-hidden">
                 <div className="grid grid-cols-[minmax(0,_2fr)_minmax(0,_3fr)_minmax(0,_1.5fr)_minmax(0,_1fr)_minmax(0,_1fr)] gap-x-4 px-3 py-3 bg-slate-900/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <SortableHeader sortKey="name" label="Tool #" />
                    <SortableHeader sortKey="description" label="Description" />
                    <SortableHeader sortKey="serial" label="Serial #" />
                    <SortableHeader sortKey="calibrationDueDate" label="Cal. Due" />
                    <SortableHeader sortKey="calibrationStatus" label="Status" />
                </div>
                <div className="flex-grow">
                    <AutoSizer>
                        {({ height, width }) => (
                            filteredAndSortedTools.length > 0 ? (
                                <List
                                    height={height}
                                    itemCount={filteredAndSortedTools.length}
                                    itemSize={45}
                                    width={width}
                                >
                                    {Row}
                                </List>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500">
                                    No tools match the current filters.
                                </div>
                            )
                        )}
                    </AutoSizer>
                </div>
            </div>
            <ToolEditModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                tool={editingTool}
                onSave={handleSaveTool}
                onDelete={handleDeleteTool}
            />
            <ToolingReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                tools={tools}
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