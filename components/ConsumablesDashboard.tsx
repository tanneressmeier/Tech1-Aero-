import React, { useState, useMemo, useCallback } from 'react';
// FIX: Corrected import paths for types and components by adding file extensions.
import { InventoryItem, PurchaseOrderItem } from '../types.ts';
import { BeakerIcon, ChevronUpIcon, ChevronDownIcon, ShoppingCartIcon } from './icons.tsx';
import { ConsumableEditModal } from './ConsumableEditModal.tsx';

interface ConsumablesDashboardProps {
    consumables: InventoryItem[];
    onUpdateConsumable: (consumable: InventoryItem) => void;
    onCreatePurchaseOrder: (items: PurchaseOrderItem[]) => void;
}

type SortKey = keyof InventoryItem;
type SortDirection = 'asc' | 'desc';

export const ConsumablesDashboard: React.FC<ConsumablesDashboardProps> = ({ consumables, onUpdateConsumable, onCreatePurchaseOrder }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('description');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConsumable, setEditingConsumable] = useState<InventoryItem | null>(null);
    const [expandedCabinets, setExpandedCabinets] = useState<Set<string>>(new Set(['Cabinet 1']));

    const handleSelectItem = (itemId: string) => {
        setSelectedItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const handleCreatePO = () => {
        const poItems: PurchaseOrderItem[] = [];
        selectedItemIds.forEach(id => {
            const consumable = consumables.find(p => p.id === id);
            if (consumable) {
                poItems.push({
                    id: consumable.id,
                    inventoryItemId: consumable.id,
                    name: consumable.part_no,
                    description: consumable.description,
                    quantityToOrder: consumable.reorder_level * 2 || 10, // Simple logic
                    costPerUnit: consumable.suppliers[0]?.cost || 0,
                    supplierName: consumable.suppliers[0]?.supplierName || 'N/A'
                });
            }
        });
        if (poItems.length > 0) {
            onCreatePurchaseOrder(poItems);
            setSelectedItemIds(new Set()); // Clear selection
        }
    };
    
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };
    
    const groupedAndSortedConsumables = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        const filtered = consumables.filter(c => 
            (c.description && c.description.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (c.part_no && c.part_no.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (c.shelf_location && c.shelf_location.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (c.storage_area && c.storage_area.toLowerCase().includes(lowerCaseSearchTerm))
        );
        
        const grouped = filtered.reduce((acc, item) => {
            const cabinet = item.storage_area || 'Uncategorized';
            const shelf = item.shelf_location || 'Unshelved';

            if (!acc[cabinet]) acc[cabinet] = {};
            if (!acc[cabinet][shelf]) acc[cabinet][shelf] = [];
            acc[cabinet][shelf].push(item);

            return acc;
        }, {} as Record<string, Record<string, InventoryItem[]>>);


        Object.keys(grouped).forEach(cabinet => {
            Object.keys(grouped[cabinet]).forEach(shelf => {
                grouped[cabinet][shelf].sort((a, b) => {
                    const aVal = a[sortKey];
                    const bVal = b[sortKey];
                    if (aVal === null || aVal === undefined) return 1;
                    if (bVal === null || bVal === undefined) return -1;
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
            });
             grouped[cabinet] = Object.fromEntries(Object.entries(grouped[cabinet]).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })));
        });

        return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })));

    }, [consumables, searchTerm, sortKey, sortDirection]);

    const handleToggleCabinet = (cabinet: string) => {
        setExpandedCabinets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cabinet)) {
                newSet.delete(cabinet);
            } else {
                newSet.add(cabinet);
            }
            return newSet;
        });
    };

    const handleEdit = (consumable: InventoryItem) => {
        setEditingConsumable(consumable);
        setIsModalOpen(true);
    };

    const handleSave = useCallback((consumableData: InventoryItem) => {
        if (consumableData.id) {
             onUpdateConsumable(consumableData);
        }
        // Add new consumable logic would go here if needed
        setIsModalOpen(false);
        setEditingConsumable(null);
    }, [onUpdateConsumable]);
    
    const SortableHeader: React.FC<{ sortKey: SortKey, label: string, className?: string }> = ({ sortKey: key, label, className }) => (
        <th onClick={() => handleSort(key)} className={`p-3 text-xs font-mono font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors ${className}`}>
            <div className="flex items-center gap-1">
                {label}
                {sortKey === key && (sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>)}
            </div>
        </th>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b border-white/5 pb-6 gap-4">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-lg text-sky-400 border border-white/10">
                        <BeakerIcon className="w-8 h-8"/>
                    </div>
                    <h2 className="text-3xl font-light tracking-wide text-white uppercase">Consumables Inventory</h2>
                </div>
                <div className="flex items-center gap-3">
                     <input
                        type="text"
                        placeholder="Search consumables..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                </div>
            </div>

            <div className="space-y-4">
                {Object.keys(groupedAndSortedConsumables).map(cabinet => (
                    <div key={cabinet} className="glass-panel rounded-xl overflow-hidden border border-white/5">
                        <button onClick={() => handleToggleCabinet(cabinet)} className="w-full p-4 bg-white/5 flex justify-between items-center text-left hover:bg-white/10 transition-colors">
                            <h3 className="text-lg font-light uppercase tracking-widest text-white">{cabinet}</h3>
                            <div className="text-slate-400">
                                {expandedCabinets.has(cabinet) ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                            </div>
                        </button>

                        {expandedCabinets.has(cabinet) && (
                           <div className="p-4 space-y-6">
                                {Object.keys(groupedAndSortedConsumables[cabinet]).map(shelf => (
                                    <div key={shelf}>
                                        <h4 className="font-mono text-xs font-medium text-sky-400 uppercase tracking-widest mb-3 pl-3 border-l-2 border-sky-500/50">{shelf}</h4>
                                         <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/5">
                                                        <th className="p-3 w-12"><input type="checkbox" disabled className="opacity-0"/></th>
                                                        <SortableHeader sortKey="part_no" label="Part #" />
                                                        <SortableHeader sortKey="description" label="Description" />
                                                        <SortableHeader sortKey="qty_on_hand" label="On Hand" className="text-center"/>
                                                        <SortableHeader sortKey="reorder_level" label="Reorder At" className="text-center"/>
                                                        <SortableHeader sortKey="expiration_date" label="Expires" />
                                                        <th className="p-3 w-20"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {groupedAndSortedConsumables[cabinet][shelf].map(item => {
                                                        const isLowStock = item.qty_on_hand <= item.reorder_level;
                                                        return (
                                                            <tr key={item.id} className={`hover:bg-white/5 ${isLowStock ? 'bg-amber-900/10' : ''} transition-colors duration-200`}>
                                                                <td className="p-3">
                                                                    <input type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => handleSelectItem(item.id)} className="bg-transparent border-slate-600 text-indigo-500 focus:ring-indigo-600 rounded-sm cursor-pointer"/>
                                                                </td>
                                                                <td className="p-3 text-sm font-mono text-white">{item.part_no}</td>
                                                                <td className="p-3 text-sm text-slate-400 max-w-xs truncate">{item.description}</td>
                                                                <td className={`p-3 text-sm text-center font-bold ${isLowStock ? 'text-amber-400' : 'text-slate-300'}`}>{item.qty_on_hand}</td>
                                                                <td className="p-3 text-sm text-slate-500 text-center">{item.reorder_level}</td>
                                                                <td className="p-3 text-sm text-slate-500">{item.expiration_date}</td>
                                                                <td className="p-3 text-right">
                                                                    <button onClick={() => handleEdit(item)} className="text-xs text-slate-500 hover:text-white font-medium px-2 py-1 hover:bg-white/10 rounded transition-colors">
                                                                        Edit
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                           </div>
                        )}
                    </div>
                ))}
                {Object.keys(groupedAndSortedConsumables).length === 0 && <div className="p-12 text-center text-slate-500 font-mono uppercase tracking-widest text-sm">No consumables found</div>}
            </div>

             <ConsumableEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                consumable={editingConsumable}
                onSave={handleSave}
            />
        </div>
    );
};