import React, { useState, useMemo, useCallback } from 'react';
import { InventoryItem, PurchaseOrderItem, Form8130 } from '../../types.ts';
import { ActionButton, SectionCard } from '../ui.tsx';
import {
    ShieldCheckIcon, DocumentTextIcon, ShoppingCartIcon,
    MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon,
    PrinterIcon, ExclamationTriangleIcon,
} from '../icons.tsx';
import { PartEditModal } from '../PartEditModal.tsx';
import { FilterPanel, FilterConfig, FilterValue } from '../FilterPanel.tsx';
import { FormArchive } from '../FormArchive.tsx';

interface InventoryTabProps {
    parts:        InventoryItem[];
    forms:        Form8130[];
    onCreatePO:   (items: PurchaseOrderItem[]) => void;
    onUpdatePart: (part: InventoryItem) => void;
    onPrintLabel: (ids: string[]) => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({ parts, forms, onCreatePO, onUpdatePart, onPrintLabel }) => {
    const [filterSort, setFilterSort] = useState<{
        search:  string;
        sortKey: keyof InventoryItem;
        sortDir: 'asc' | 'desc';
        filters: Record<string, FilterValue>;
    }>({ search: '', sortKey: 'description', sortDir: 'asc', filters: { lowStock: 'all', storageArea: 'all', condition: 'all', quarantine: 'all', bin: 'all' } });

    const [filterOpen,  setFilterOpen]  = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editState,   setEditState]   = useState<{
        editPart:   InventoryItem | null;
        viewFormId: string | null;
        binId:      string | null;
        binDraft:   string;
    }>({ editPart: null, viewFormId: null, binId: null, binDraft: '' });

    const filtered = useMemo(() => {
        const { search, sortKey, sortDir, filters } = filterSort;
        const q = search.toLowerCase();
        return parts.filter(p => {
            if (q && !(p.part_no.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.shelf_location.toLowerCase().includes(q))) return false;
            if (filters.lowStock    === 'yes' && p.qty_on_hand > p.reorder_level) return false;
            if (filters.storageArea !== 'all' && p.storage_area !== filters.storageArea) return false;
            if (filters.condition   !== 'all' && p.condition    !== filters.condition) return false;
            if (filters.quarantine  !== 'all') {
                if (filters.quarantine === 'quarantined' && p.quarantine_status !== 'quarantined') return false;
                if (filters.quarantine === 'active'      && p.quarantine_status === 'quarantined') return false;
            }
            if (filters.bin === 'unassigned' && p.shelf_location) return false;
            return true;
        }).sort((a, b) => {
            const av = a[sortKey], bv = b[sortKey];
            const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (Number(av) > Number(bv) ? 1 : -1);
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [parts, filterSort]);

    const toggleSort = (k: keyof InventoryItem) => {
        setFilterSort(p => ({
            ...p,
            sortKey: k,
            sortDir: p.sortKey === k ? (p.sortDir === 'asc' ? 'desc' : 'asc') : 'asc',
        }));
    };

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    }, []);

    const renderRow = (p: InventoryItem) => {
        const isLow  = p.qty_on_hand <= p.reorder_level;
        const isQuar = p.quarantine_status === 'quarantined';
        const form   = p.form_8130_id ? forms.find(f => f.id === p.form_8130_id) : null;
        const isSel  = selectedIds.has(p.id);
        return (
            <div key={p.id}
                className={`grid grid-cols-[36px_1.4fr_2.5fr_0.6fr_0.55fr_0.55fr_0.9fr_0.8fr_1fr] gap-x-2 items-center px-3 py-2.5 border-t border-white/5 text-sm cursor-pointer transition-colors
                    ${isSel  ? 'bg-sky-500/8' : ''}
                    ${isQuar ? 'bg-amber-500/5' : isLow ? 'bg-orange-500/5' : 'hover:bg-white/3'}`}
                onClick={() => toggleSelect(p.id)}
            >
                <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)}
                        className="accent-sky-500 cursor-pointer w-3.5 h-3.5" />
                </div>
                <div className="font-mono text-sky-300 font-medium truncate">{p.part_no}</div>
                <div className="text-slate-300 truncate">{p.description}</div>
                <div className="flex items-center gap-1 justify-center">
                    {p.certification?.verified && <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" title="8130-3 verified" />}
                    {isQuar && <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-400" title="Quarantine" />}
                </div>
                <div className={`font-semibold font-mono text-center ${isLow ? 'text-orange-400' : 'text-white'}`}>{p.qty_on_hand}</div>
                <div className="text-slate-500 font-mono text-center">{p.reorder_level}</div>
                <div className="text-slate-400 truncate text-xs font-mono"
                    onClick={e => e.stopPropagation()}>
                    {editState.binId === p.id ? (
                        <input
                            autoFocus
                            value={editState.binDraft}
                            onChange={e => setEditState(s => ({ ...s, binDraft: e.target.value.toUpperCase() }))}
                            onBlur={() => {
                                if (editState.binDraft.trim()) onUpdatePart({ ...p, shelf_location: editState.binDraft.trim() });
                                setEditState(s => ({ ...s, binId: null }));
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    if (editState.binDraft.trim()) onUpdatePart({ ...p, shelf_location: editState.binDraft.trim() });
                                    setEditState(s => ({ ...s, binId: null }));
                                }
                                if (e.key === 'Escape') setEditState(s => ({ ...s, binId: null }));
                            }}
                            className="w-full bg-sky-500/10 border border-sky-500/40 rounded px-1.5 py-0.5 text-xs font-mono text-sky-200 focus:outline-none"
                            placeholder="e.g. BJC01A02"
                        />
                    ) : (
                        <button
                            onClick={() => setEditState(s => ({ ...s, binId: p.id, binDraft: p.shelf_location || '' }))}
                            className={`w-full text-left px-1 py-0.5 rounded transition-colors hover:bg-white/8 ${
                                p.shelf_location ? 'text-slate-400' : 'text-amber-500/70 italic'
                            }`}
                            title="Click to set bin location"
                        >
                            {p.shelf_location || '+ assign bin'}
                        </button>
                    )}
                </div>
                <div className="text-center">
                    {p.condition && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                            p.condition === 'New'        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' :
                            p.condition === 'Overhauled' ? 'bg-sky-500/15     text-sky-300     border-sky-500/20'     :
                                                           'bg-slate-500/15   text-slate-300   border-slate-500/20'
                        }`}>{p.condition}</span>
                    )}
                </div>
                <div className="flex items-center gap-1 justify-center" onClick={e => e.stopPropagation()}>
                    {form && (
                        <button onClick={() => setEditState(s => ({ ...s, viewFormId: form.id }))}
                            className="p-1 text-sky-500 hover:text-sky-300 transition-colors" title="View 8130-3">
                            <DocumentTextIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button onClick={() => setEditState(s => ({ ...s, editPart: p }))}
                        className="p-1 text-slate-500 hover:text-white transition-colors" title="Edit">
                        <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onPrintLabel([p.id])}
                        className="p-1 text-slate-500 hover:text-amber-300 transition-colors" title="Print label">
                        <PrinterIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    };

    const SortHdr: React.FC<{ k: keyof InventoryItem; label: string; cls?: string }> = ({ k, label, cls = '' }) => (
        <div onClick={() => toggleSort(k)} className={`flex items-center gap-1 cursor-pointer hover:text-white transition-colors select-none ${cls}`}>
            {label}
            {filterSort.sortKey === k && (filterSort.sortDir === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
        </div>
    );

    const filterConfig: FilterConfig[] = useMemo(() => [
        { name: 'lowStock',    label: 'Stock Level',  type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'yes', label: 'Low Stock Only' }] },
        { name: 'storageArea', label: 'Storage Area', type: 'select', options: [{ value: 'all', label: 'All' }, ...Array.from(new Set(parts.map(p => p.storage_area).filter(Boolean))).sort().map(a => ({ value: a!, label: a! }))] },
        { name: 'condition',   label: 'Condition',    type: 'select', options: [{ value: 'all', label: 'All' }, ...['New', 'Overhauled', 'Repaired', 'Inspected', 'Modified'].map(c => ({ value: c, label: c }))] },
        { name: 'quarantine',  label: 'Status',       type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'quarantined', label: 'Quarantine' }] },
        { name: 'bin',         label: 'Bin Location', type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'unassigned', label: 'No Bin Assigned' }] },
    ], [parts]);

    return (
        <div className="h-full flex flex-col gap-3">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input value={filterSort.search} onChange={e => setFilterSort(p => ({ ...p, search: e.target.value }))}
                        placeholder="Search parts…"
                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500" />
                </div>
                <ActionButton size="sm" onClick={() => setFilterOpen(true)} variant="secondary">Filters</ActionButton>
                {parts.filter(p => !p.shelf_location).length > 0 && (
                    <button
                        onClick={() => setFilterSort(p => ({ ...p, filters: { ...p.filters, bin: p.filters.bin === 'unassigned' ? 'all' : 'unassigned' } }))}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all font-medium ${
                            filterSort.filters.bin === 'unassigned'
                                ? 'bg-amber-500/15 text-amber-200 border-amber-500/30'
                                : 'text-amber-500/70 border-amber-500/25 hover:bg-amber-500/10'
                        }`}
                    >
                        {filterSort.filters.bin === 'unassigned' ? '✕ ' : ''}No Bin ({parts.filter(p => !p.shelf_location).length})
                    </button>
                )}

                {selectedIds.size > 0 && (
                    <>
                        <ActionButton size="sm" variant="primary"
                            icon={<PrinterIcon className="w-3.5 h-3.5" />}
                            onClick={() => onPrintLabel([...selectedIds])}>
                            Print {selectedIds.size} Label{selectedIds.size > 1 ? 's' : ''}
                        </ActionButton>
                        <ActionButton size="sm" variant="secondary"
                            icon={<ShoppingCartIcon className="w-3.5 h-3.5" />}
                            onClick={() => {
                                const items: PurchaseOrderItem[] = [...selectedIds].map(id => {
                                    const p = parts.find(x => x.id === id)!;
                                    return { id: p.id, inventoryItemId: p.id, name: p.part_no, description: p.description, quantityToOrder: p.reorder_level * 2 || 10, costPerUnit: p.suppliers[0]?.cost || 0, supplierName: p.suppliers[0]?.supplierName || 'N/A' };
                                });
                                onCreatePO(items);
                                setSelectedIds(new Set());
                            }}>
                            Create PO
                        </ActionButton>
                        <button onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                            Clear
                        </button>
                    </>
                )}

                <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                    {selectedIds.size > 0 && <span className="text-sky-400">{selectedIds.size} selected</span>}
                    <span>{filtered.length}/{parts.length}</span>
                    {parts.filter(p => p.qty_on_hand <= p.reorder_level).length > 0 && (
                        <span className="text-orange-400">▼ {parts.filter(p => p.qty_on_hand <= p.reorder_level).length} low</span>
                    )}
                    {parts.filter(p => p.quarantine_status === 'quarantined').length > 0 && (
                        <span className="text-amber-400">⚠ {parts.filter(p => p.quarantine_status === 'quarantined').length} quarantine</span>
                    )}
                    {parts.filter(p => !p.shelf_location).length > 0 && (
                        <span className="text-slate-600">{parts.filter(p => !p.shelf_location).length} unassigned</span>
                    )}
                </div>
            </div>

            {/* Table */}
            <SectionCard padding="none" className="overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="grid grid-cols-[36px_1.4fr_2.5fr_0.6fr_0.55fr_0.55fr_0.9fr_0.8fr_1fr] gap-x-2 px-3 py-3 bg-white/5 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0 border-b border-white/5">
                    <div className="flex justify-center">
                        <input type="checkbox"
                            checked={selectedIds.size === filtered.length && filtered.length > 0}
                            onChange={() => {
                                if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                                else setSelectedIds(new Set(filtered.map(p => p.id)));
                            }}
                            className="accent-sky-500 cursor-pointer w-3.5 h-3.5" />
                    </div>
                    <SortHdr k="part_no"        label="Part #" />
                    <SortHdr k="description"    label="Description" />
                    <div className="text-center">Cert</div>
                    <SortHdr k="qty_on_hand"    label="QOH"  cls="justify-center" />
                    <SortHdr k="reorder_level"  label="Min"  cls="justify-center" />
                    <SortHdr k="shelf_location" label="Bin" />
                    <div className="text-center">Cond.</div>
                    <div className="text-center col-span-2">Actions</div>
                </div>

                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 360px)' }}>
                    {filtered.length > 0
                        ? filtered.map(renderRow)
                        : <div className="flex items-center justify-center py-16 text-slate-600 text-sm italic">No parts match filters</div>
                    }
                </div>
            </SectionCard>

            {/* Modals */}
            <FilterPanel isOpen={filterOpen} onClose={() => setFilterOpen(false)}
                filters={filterSort.filters} onFilterChange={(n, v) => setFilterSort(p => ({ ...p, filters: { ...p.filters, [n]: v } }))}
                filterConfig={filterConfig}
                onClearAll={() => setFilterSort(p => ({ ...p, filters: { lowStock: 'all', storageArea: 'all', condition: 'all', quarantine: 'all', bin: 'all' } }))} />
            <PartEditModal isOpen={!!editState.editPart} onClose={() => setEditState(s => ({ ...s, editPart: null }))} part={editState.editPart}
                onSave={p => { onUpdatePart(p); setEditState(s => ({ ...s, editPart: null })); }} />

            {editState.viewFormId && (
                <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-6"
                    onClick={() => setEditState(s => ({ ...s, viewFormId: null }))}>
                    <div className="bg-[#0d1220] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-5 py-4 border-b border-white/8">
                            <h3 className="text-base font-semibold text-white">FAA 8130-3 Viewer</h3>
                            <button onClick={() => setEditState(s => ({ ...s, viewFormId: null }))} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            <FormArchive forms={forms.filter(f => f.id === editState.viewFormId)} checkouts={[]} parts={parts} onUpdate={() => {}} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
