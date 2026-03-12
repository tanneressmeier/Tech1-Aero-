
import React, { useState, useMemo } from 'react';
import { InventoryItem, PurchaseOrderItem } from '../types.ts';
import { CogIcon, ChevronUpIcon, ChevronDownIcon, ShoppingCartIcon, ShieldCheckIcon, DocumentTextIcon, PencilIcon, CheckBadgeIcon } from './icons.tsx';
import { DashboardHeader } from './DashboardHeader.tsx';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FilterPanel, FilterConfig, FilterValue } from './FilterPanel.tsx';
import { PartEditModal } from './PartEditModal.tsx';

interface InventoryDashboardProps {
    parts: InventoryItem[];
    onCreatePurchaseOrder: (items: PurchaseOrderItem[]) => void;
    onUpdatePart: (part: InventoryItem) => void;
}

type SortKey = keyof InventoryItem;

const initialFilterState = {
    searchTerm: '',
    lowStock: 'all', // 'all' | 'yes'
    storageArea: 'all',
};

const filterLabels: Record<string, string> = {
    lowStock: 'Stock Level',
    storageArea: 'Storage Area'
};


export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ parts, onCreatePurchaseOrder, onUpdatePart }) => {
    const [filters, setFilters] = useState<Record<string, FilterValue>>(initialFilterState);
    const [sortKey, setSortKey] = useState<SortKey>('description');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    
    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPart, setEditingPart] = useState<InventoryItem | null>(null);

    const filteredAndSortedParts = useMemo(() => {
        const lowerSearch = (filters.searchTerm as string).toLowerCase();
        const filtered = parts.filter(p => {
            if (lowerSearch && !(p.description.toLowerCase().includes(lowerSearch) || p.part_no.toLowerCase().includes(lowerSearch) || p.shelf_location.toLowerCase().includes(lowerSearch))) {
                return false;
            }

            if (filters.lowStock === 'yes' && p.qty_on_hand > p.reorder_level) {
                return false;
            }

            if (filters.storageArea !== 'all' && p.storage_area !== filters.storageArea) {
                return false;
            }
            
            return true;
        });

        return filtered.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            let comparison = 0;
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                comparison = aVal.localeCompare(bVal);
            } else if (Number(aVal) > Number(bVal)) {
                comparison = 1;
            } else if (Number(aVal) < Number(bVal)) {
                comparison = -1;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [parts, filters, sortKey, sortDirection]);

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

    const handleSelectItem = (partId: string) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(partId)) {
                newSet.delete(partId);
            } else {
                newSet.add(partId);
            }
            return newSet;
        });
    };

    const handleCreatePO = () => {
        const poItems: PurchaseOrderItem[] = [];
        selectedItemIds.forEach(id => {
            const part = parts.find(p => p.id === id);
            if (part) {
                poItems.push({
                    id: part.id,
                    inventoryItemId: part.id,
                    name: part.part_no,
                    description: part.description,
                    quantityToOrder: part.reorder_level * 2 || 10,
                    costPerUnit: part.suppliers[0]?.cost || 0,
                    supplierName: part.suppliers[0]?.supplierName || 'N/A'
                });
            }
        });
        if (poItems.length > 0) {
            onCreatePurchaseOrder(poItems);
            setSelectedItemIds(new Set());
        }
    };

    const handleEditPart = (part: InventoryItem) => {
        setEditingPart(part);
        setIsEditModalOpen(true);
    };

    const handleSavePart = (updatedPart: InventoryItem) => {
        onUpdatePart(updatedPart);
        setIsEditModalOpen(false);
        setEditingPart(null);
    };

    const filterConfig: FilterConfig[] = useMemo(() => [
        { name: 'lowStock', label: 'Stock Level', type: 'select', options: [
            { value: 'all', label: 'All Stock Levels'},
            { value: 'yes', label: 'Low Stock Only'},
        ]},
        { name: 'storageArea', label: 'Storage Area', type: 'select', options: [
            { value: 'all', label: 'All Areas'},
            ...Array.from(new Set(parts.map(p => p.storage_area).filter(Boolean))).sort().map(area => ({ value: area!, label: area!}))
        ]}
    ], [parts]);

    const SortableHeader: React.FC<{ sortKey: SortKey, label: string, className?: string }> = ({ sortKey: key, label, className='' }) => (
        <div onClick={() => handleSort(key)} className={`flex items-center gap-1 cursor-pointer hover:text-white transition-colors ${className}`}>
            {label}
            {sortKey === key && (sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>)}
        </div>
    );
    
    const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
        const part = filteredAndSortedParts[index];
        const isLowStock = part.qty_on_hand <= part.reorder_level;
        const cert = part.certification;

        return (
            <div
                style={style}
                className={`grid grid-cols-[48px_1.5fr_3fr_0.8fr_0.8fr_0.8fr_0.8fr_1.5fr_0.8fr] gap-x-3 items-center px-3 py-3 border-t border-white/5 hover:bg-white/5 transition-colors ${isLowStock ? 'bg-amber-900/10' : ''}`}
            >
                <div className="flex justify-center">
                    <input 
                        type="checkbox" 
                        checked={selectedItemIds.has(part.id)} 
                        onChange={() => handleSelectItem(part.id)} 
                        className="bg-transparent border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded-sm cursor-pointer"
                    />
                </div>
                <div className="text-sm text-sky-400 font-mono font-medium truncate" title={part.part_no}>{part.part_no}</div>
                <div className="text-sm text-slate-300 truncate" title={part.description}>{part.description}</div>
                <div className="flex justify-center">
                    {cert?.verified && cert.type === '8130-3' && (
                        <span title="8130-3 Verified">
                            <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
                        </span>
                    )}
                    {cert?.verified && cert.type === 'CoC' && (
                        <span title="CoC Verified">
                            <DocumentTextIcon className="w-5 h-5 text-blue-400" />
                        </span>
                    )}
                    {cert?.verified && cert.type !== '8130-3' && cert.type !== 'CoC' && (
                        <span title="Verified (Other)">
                            <CheckBadgeIcon className="w-5 h-5 text-slate-400" />
                        </span>
                    )}
                </div>
                <div className={`text-sm font-bold text-center ${isLowStock ? 'text-amber-400' : 'text-white'}`}>{part.qty_on_hand}</div>
                <div className="text-sm text-slate-500 text-center">{part.qty_reserved}</div>
                <div className="text-sm text-slate-500 text-center">{part.reorder_level}</div>
                <div className="text-sm text-slate-400 truncate">{part.storage_area} / {part.shelf_location}</div>
                <div className="flex justify-center">
                    <button 
                        onClick={() => handleEditPart(part)}
                        className="text-slate-500 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
                        title="Edit Part"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            <DashboardHeader 
                icon={<CogIcon className="w-8 h-8 text-cyan-400"/>} 
                title="Parts Inventory"
                onShowFilters={() => setIsFilterPanelOpen(true)}
                activeFilters={filters}
                onFilterClear={handleClearFilter}
                filterLabels={filterLabels}
            >
                 <input
                    type="text"
                    placeholder="Search parts..."
                    value={filters.searchTerm as string}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                    className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
                />
                <button 
                    onClick={handleCreatePO}
                    disabled={selectedItemIds.size === 0}
                    className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-indigo-400 hover:text-white border border-indigo-500/20 font-medium py-2 px-4 rounded-lg text-sm transition-all"
                >
                    <ShoppingCartIcon className="w-4 h-4"/>
                    Create PO ({selectedItemIds.size})
                </button>
            </DashboardHeader>
            <div className="glass-panel rounded-xl border border-white/5 flex-grow flex flex-col overflow-hidden">
                <div className="grid grid-cols-[48px_1.5fr_3fr_0.8fr_0.8fr_0.8fr_0.8fr_1.5fr_0.8fr] gap-x-3 px-3 py-4 bg-white/5 text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
                    <div className="flex justify-center"><input type="checkbox" disabled className="opacity-0 cursor-default" /></div>
                    <SortableHeader sortKey="part_no" label="Part #" />
                    <SortableHeader sortKey="description" label="Description" />
                    <div className="text-center">Cert</div>
                    <SortableHeader sortKey="qty_on_hand" label="On Hand" className="justify-center" />
                    <SortableHeader sortKey="qty_reserved" label="Reserved" className="justify-center" />
                    <SortableHeader sortKey="reorder_level" label="Reorder" className="justify-center" />
                    <SortableHeader sortKey="shelf_location" label="Location" />
                    <div className="text-center">Action</div>
                </div>
                 <div className="flex-grow">
                     <AutoSizer>
                        {({ height, width }) => (
                            filteredAndSortedParts.length > 0 ? (
                                <List
                                    height={height}
                                    itemCount={filteredAndSortedParts.length}
                                    itemSize={48}
                                    width={width}
                                >
                                    {Row}
                                </List>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500 font-mono uppercase tracking-widest text-sm">
                                    No parts match the current filters
                                </div>
                            )
                        )}
                    </AutoSizer>
                </div>
            </div>
            <FilterPanel 
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                filters={filters}
                onFilterChange={handleFilterChange}
                filterConfig={filterConfig}
                onClearAll={() => setFilters(initialFilterState)}
            />
            <PartEditModal 
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                part={editingPart}
                onSave={handleSavePart}
            />
        </div>
    );
};
