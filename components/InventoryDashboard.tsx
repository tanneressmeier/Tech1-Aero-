// =============================================================================
// InventoryDashboard.tsx — Parts & Warehouse Management Module
// Tabs: Inventory | Warehouse Map | Receiving | Archive | PDF Library | Consumables
// =============================================================================
import React, { useState, useMemo, useCallback } from 'react';
import { InventoryItem, PurchaseOrderItem, Technician, Form8130, CheckoutRecord } from '../types.ts';
import { PageHeader, TabBar, ActionButton, AlertBanner, SectionCard } from './ui.tsx';
import {
    CogIcon, ShoppingCartIcon, ShieldCheckIcon, DocumentTextIcon,
    CheckBadgeIcon, PlusIcon, PrinterIcon, ArrowUpTrayIcon,
    MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon,
    ExclamationTriangleIcon,
} from './icons.tsx';
import { WarehouseMap } from './WarehouseMap.tsx';
import { ReceivingModal } from './ReceivingModal.tsx';
import { FormArchive } from './FormArchive.tsx';
import { LabelPrinter } from './LabelPrinter.tsx';
import { LocalPdfLibrary } from './LocalPdfLibrary.tsx';
import { PartEditModal } from './PartEditModal.tsx';
import { FilterPanel, FilterConfig, FilterValue } from './FilterPanel.tsx';
import { useToast } from '../contexts/ToastContext.tsx';

interface InventoryDashboardProps {
    parts:               InventoryItem[];
    consumables:         InventoryItem[];
    forms8130:           Form8130[];
    checkoutRecords:     CheckoutRecord[];
    currentUser:         Technician;
    onCreatePurchaseOrder: (items: PurchaseOrderItem[]) => void;
    onUpdatePart:        (part: InventoryItem) => void;
    onUpdateConsumable:  (item: InventoryItem) => void;
    onReceive:           (form: Form8130, newItem: Partial<InventoryItem>) => void;
    onUpdateForm:        (form: Form8130) => void;
}

type Tab = 'inventory' | 'map' | 'receiving' | 'archive' | 'pdf_library' | 'consumables';

// ── BinAssignPanel ─────────────────────────────────────────────────────────────
// Shown after a form is scanned (from Archive or PDF Library).
// Lets the user assign a bin, then creates the InventoryItem and prints a label.
const BinAssignPanel: React.FC<{
    form:       Form8130;
    allParts:   InventoryItem[];
    onAssign:   (form: Form8130, item: Partial<InventoryItem>) => void;
    onPrint:    (partId: string) => void;
    onDismiss:  () => void;
}> = ({ form, allParts, onAssign, onPrint, onDismiss }) => {
    const [bin,   setBin]   = useState(form.shelf_location ?? '');
    const [area,  setArea]  = useState('');
    const [done,  setDone]  = useState(false);
    const [newId, setNewId] = useState('');

    const existingItem = allParts.find(p => p.form_8130_id === form.id);

    const handleAssign = () => {
        if (!bin.trim()) return;
        const id = `part-${Date.now()}`;
        setNewId(id);
        onAssign(form, {
            id,
            part_no:          form.block6_part_no,
            sku:              form.block6_part_no,
            description:      form.block6_description,
            qty_on_hand:      form.block9_quantity,
            qty_reserved:     0,
            reorder_level:    1,
            shelf_location:   bin.trim().toUpperCase(),
            storage_area:     area || 'General',
            procurement_lead_time: 7,
            unit:             'EA',
            suppliers:        [],
            quarantine_status:'active',
            condition:        form.block11_condition === 'Unknown' ? undefined : form.block11_condition as any,
            form_tracking_no: form.block5_tracking_no,
            form_8130_id:     form.id,
            certification:    { type: '8130-3', verified: true, number: form.block5_tracking_no || form.block13b_cert_no },
        });
        setDone(true);
    };

    if (existingItem && !done) {
        return (
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl text-sm">
                <span className="text-emerald-300 flex items-center gap-1.5">
                    <CheckBadgeIcon className="w-4 h-4" />
                    Assigned to bin <span className="font-mono font-semibold">{existingItem.shelf_location}</span>
                </span>
                <ActionButton size="sm" icon={<PrinterIcon className="w-3.5 h-3.5" />}
                    onClick={() => onPrint(existingItem.id)}>
                    Print Label
                </ActionButton>
            </div>
        );
    }

    if (done) {
        return (
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl text-sm">
                <span className="text-emerald-300 flex items-center gap-1.5">
                    <CheckBadgeIcon className="w-4 h-4" />
                    Part created in bin <span className="font-mono font-semibold">{bin.toUpperCase()}</span>
                </span>
                <ActionButton size="sm" icon={<PrinterIcon className="w-3.5 h-3.5" />}
                    onClick={() => onPrint(newId)}>
                    Print Label
                </ActionButton>
            </div>
        );
    }

    return (
        <div className="space-y-2 px-3 py-3 bg-sky-500/8 border border-sky-500/20 rounded-xl">
            <p className="text-xs font-semibold text-sky-300">Assign to Bin &amp; Create Inventory Record</p>
            <div className="flex items-center gap-2">
                <input
                    value={bin}
                    onChange={e => setBin(e.target.value.toUpperCase())}
                    placeholder="Bin ID e.g. BJC01A02"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-sky-500 uppercase"
                />
                <input
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    placeholder="Area (optional)"
                    className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
                <ActionButton size="sm" variant="primary" disabled={!bin.trim()} onClick={handleAssign}>
                    Assign
                </ActionButton>
                <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                    Skip
                </button>
            </div>
        </div>
    );
};

// ── Inventory Tab ─────────────────────────────────────────────────────────────
const InventoryTab: React.FC<{
    parts:        InventoryItem[];
    forms:        Form8130[];
    onCreatePO:   (items: PurchaseOrderItem[]) => void;
    onUpdatePart: (part: InventoryItem) => void;
    onPrintLabel: (ids: string[]) => void;
}> = ({ parts, forms, onCreatePO, onUpdatePart, onPrintLabel }) => {
    const [search,      setSearch]      = useState('');
    const [sortKey,     setSortKey]     = useState<keyof InventoryItem>('description');
    const [sortDir,     setSortDir]     = useState<'asc'|'desc'>('asc');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filterOpen,  setFilterOpen]  = useState(false);
    const [filters,     setFilters]     = useState<Record<string, FilterValue>>({ lowStock: 'all', storageArea: 'all', condition: 'all', quarantine: 'all' });
    const [editPart,    setEditPart]    = useState<InventoryItem | null>(null);
    const [viewFormId,  setViewFormId]  = useState<string | null>(null);

    const filtered = useMemo(() => {
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
            return true;
        }).sort((a, b) => {
            const av = a[sortKey], bv = b[sortKey];
            const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : (Number(av) > Number(bv) ? 1 : -1);
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [parts, search, filters, sortKey, sortDir]);

    const toggleSort = (k: keyof InventoryItem) => {
        if (sortKey === k) setSortDir(p => p === 'asc' ? 'desc' : 'asc');
        else { setSortKey(k); setSortDir('asc'); }
    };

    // ── FIXED: useCallback with selectedIds in deps to prevent stale closure ──
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
                <div className="text-slate-400 truncate text-xs font-mono">{p.shelf_location || <span className="text-slate-600 italic">no bin</span>}</div>
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
                        <button onClick={() => setViewFormId(form.id)}
                            className="p-1 text-sky-500 hover:text-sky-300 transition-colors" title="View 8130-3">
                            <DocumentTextIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button onClick={() => setEditPart(p)}
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
            {sortKey === k && (sortDir === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
        </div>
    );

    const filterConfig: FilterConfig[] = useMemo(() => [
        { name: 'lowStock',    label: 'Stock Level',  type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'yes', label: 'Low Stock Only' }] },
        { name: 'storageArea', label: 'Storage Area', type: 'select', options: [{ value: 'all', label: 'All' }, ...Array.from(new Set(parts.map(p => p.storage_area).filter(Boolean))).sort().map(a => ({ value: a!, label: a! }))] },
        { name: 'condition',   label: 'Condition',    type: 'select', options: [{ value: 'all', label: 'All' }, ...['New', 'Overhauled', 'Repaired', 'Inspected', 'Modified'].map(c => ({ value: c, label: c }))] },
        { name: 'quarantine',  label: 'Status',       type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'quarantined', label: 'Quarantine' }] },
    ], [parts]);

    return (
        <div className="h-full flex flex-col gap-3">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search parts…"
                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500" />
                </div>
                <ActionButton size="sm" onClick={() => setFilterOpen(true)} variant="secondary">Filters</ActionButton>

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
            <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
                {/* Header */}
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
                    <SortHdr k="part_no"       label="Part #" />
                    <SortHdr k="description"   label="Description" />
                    <div className="text-center">Cert</div>
                    <SortHdr k="qty_on_hand"   label="QOH"    cls="justify-center" />
                    <SortHdr k="reorder_level" label="Min"    cls="justify-center" />
                    <SortHdr k="shelf_location" label="Bin" />
                    <div className="text-center">Cond.</div>
                    <div className="text-center col-span-2">Actions</div>
                </div>

                {/* Virtualized rows */}
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 360px)' }}>
                    {filtered.length > 0
                        ? filtered.map(renderRow)
                        : <div className="flex items-center justify-center py-16 text-slate-600 text-sm italic">No parts match filters</div>
                    }
                </div>
            </div>

            {/* Modals */}
            <FilterPanel isOpen={filterOpen} onClose={() => setFilterOpen(false)}
                filters={filters} onFilterChange={(n, v) => setFilters(p => ({ ...p, [n]: v }))}
                filterConfig={filterConfig}
                onClearAll={() => setFilters({ lowStock: 'all', storageArea: 'all', condition: 'all', quarantine: 'all' })} />
            <PartEditModal isOpen={!!editPart} onClose={() => setEditPart(null)} part={editPart}
                onSave={p => { onUpdatePart(p); setEditPart(null); }} />

            {viewFormId && (
                <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-6"
                    onClick={() => setViewFormId(null)}>
                    <div className="bg-[#0d1220] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-5 py-4 border-b border-white/8">
                            <h3 className="text-base font-semibold text-white">FAA 8130-3 Viewer</h3>
                            <button onClick={() => setViewFormId(null)} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            <FormArchive forms={forms.filter(f => f.id === viewFormId)} checkouts={[]} parts={parts} onUpdate={() => {}} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Consumables tab ───────────────────────────────────────────────────────────
const ConsumablesTab: React.FC<{ items: InventoryItem[]; onUpdate: (i: InventoryItem) => void }> = ({ items }) => {
    const today  = new Date();
    const warn30 = new Date(); warn30.setDate(today.getDate() + 30);
    const sorted = [...items].sort((a, b) => {
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
    });
    const expired  = items.filter(i => i.expiration_date && new Date(i.expiration_date) < today);
    const expiring = items.filter(i => i.expiration_date && new Date(i.expiration_date) >= today && new Date(i.expiration_date) <= warn30);

    return (
        <div className="space-y-4">
            {expired.length  > 0 && <AlertBanner severity="critical" title={`${expired.length} expired consumable${expired.length > 1 ? 's' : ''} — remove from stock immediately`} />}
            {expiring.length > 0 && <AlertBanner severity="warning"  title={`${expiring.length} consumable${expiring.length > 1 ? 's' : ''} expiring within 30 days`} />}
            <div className="space-y-2">
                {sorted.map(item => {
                    const isExpired  = item.expiration_date && new Date(item.expiration_date) < today;
                    const isExpiring = item.expiration_date && new Date(item.expiration_date) >= today && new Date(item.expiration_date) <= warn30;
                    const daysLeft   = item.expiration_date ? Math.round((new Date(item.expiration_date).getTime() - today.getTime()) / 86400000) : null;
                    return (
                        <div key={item.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${isExpired ? 'bg-red-500/10 border-red-500/25' : isExpiring ? 'bg-amber-500/10 border-amber-500/25' : 'bg-white/3 border-white/8'}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-white truncate">{item.description}</span>
                                    <span className="text-[10px] font-mono text-slate-500">{item.part_no}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{item.shelf_location} · {item.qty_on_hand} {item.unit}{item.dom ? ` · DOM: ${item.dom}` : ''}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                {item.expiration_date ? (
                                    <>
                                        <p className={`text-xs font-semibold font-mono ${isExpired ? 'text-red-400' : isExpiring ? 'text-amber-400' : 'text-slate-300'}`}>
                                            {isExpired ? `Expired ${Math.abs(daysLeft!)}d ago` : `${daysLeft}d remaining`}
                                        </p>
                                        <p className="text-[10px] text-slate-600">{item.expiration_date}</p>
                                    </>
                                ) : (
                                    <p className="text-xs text-slate-600 italic">No expiry set</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
    parts, consumables, forms8130, checkoutRecords, currentUser,
    onCreatePurchaseOrder, onUpdatePart, onUpdateConsumable, onReceive, onUpdateForm,
}) => {
    const { showToast } = useToast();
    const [tab,           setTab]           = useState<Tab>('inventory');
    const [receivingOpen, setReceivingOpen] = useState(false);
    const [labelIds,      setLabelIds]      = useState<string[]>([]);
    const [labelOpen,     setLabelOpen]     = useState(false);
    const [dismissedBins, setDismissedBins] = useState<Set<string>>(new Set());

    const allParts = [...parts, ...consumables];
    const lowCount     = parts.filter(p => p.qty_on_hand <= p.reorder_level).length;
    const quarCount    = parts.filter(p => p.quarantine_status === 'quarantined').length;
    const expiredConsum= consumables.filter(i => i.expiration_date && new Date(i.expiration_date) < new Date()).length;
    // Forms scanned but not yet assigned to a bin
    const unassignedForms = forms8130.filter(f =>
        f.status === 'released' &&
        !parts.some(p => p.form_8130_id === f.id) &&
        !dismissedBins.has(f.id)
    );

    const openPrintLabel = (ids: string[]) => {
        setLabelIds(ids);
        setLabelOpen(true);
    };

    const handleBinAssign = (form: Form8130, newItem: Partial<InventoryItem>) => {
        onReceive(form, newItem);
        showToast({ message: `${form.block6_part_no} assigned to bin ${newItem.shelf_location}`, type: 'success' });
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <PageHeader
                title="Parts & Warehouse"
                subtitle={`${parts.length} parts · ${forms8130.length} 8130 forms`}
                icon={<CogIcon className="w-5 h-5" />}
                actions={
                    <ActionButton variant="primary" size="sm"
                        icon={<ArrowUpTrayIcon className="w-3.5 h-3.5" />}
                        onClick={() => setReceivingOpen(true)}>
                        Receive Parts
                    </ActionButton>
                }
            />

            {/* ── Scanned forms awaiting bin assignment ── */}
            {unassignedForms.length > 0 && (
                <div className="space-y-2 flex-shrink-0">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        {unassignedForms.length} scanned form{unassignedForms.length > 1 ? 's' : ''} awaiting bin assignment
                    </p>
                    {unassignedForms.map(form => (
                        <BinAssignPanel
                            key={form.id}
                            form={form}
                            allParts={allParts}
                            onAssign={handleBinAssign}
                            onPrint={id => openPrintLabel([id])}
                            onDismiss={() => setDismissedBins(prev => new Set(prev).add(form.id))}
                        />
                    ))}
                </div>
            )}

            <TabBar
                tabs={[
                    { id: 'inventory',   label: 'Inventory',    badge: lowCount || undefined },
                    { id: 'map',         label: 'Warehouse Map' },
                    { id: 'receiving',   label: 'Receiving',    badge: quarCount || undefined },
                    { id: 'archive',     label: '8130 Archive', badge: forms8130.length || undefined },
                    { id: 'pdf_library', label: 'PDF Library',  icon: <DocumentTextIcon className="w-3.5 h-3.5" /> },
                    { id: 'consumables', label: 'Consumables',  badge: expiredConsum || undefined },
                ]}
                active={tab}
                onChange={t => setTab(t as Tab)}
            />

            <div className="flex-1 min-h-0 overflow-y-auto">
                {tab === 'inventory' && (
                    <InventoryTab
                        parts={parts}
                        forms={forms8130}
                        onCreatePO={onCreatePurchaseOrder}
                        onUpdatePart={onUpdatePart}
                        onPrintLabel={openPrintLabel}
                    />
                )}

                {tab === 'map' && (
                    <WarehouseMap
                        parts={allParts}
                        forms={forms8130}
                        onViewForm={() => setTab('archive')}
                        onNavigateToPart={() => setTab('inventory')}
                    />
                )}

                {tab === 'receiving' && (
                    <div className="space-y-4">
                        {quarCount > 0 && (
                            <AlertBanner severity="warning"
                                title={`${quarCount} part${quarCount > 1 ? 's' : ''} in quarantine — pending inspection release`} />
                        )}
                        <div className="space-y-2">
                            {parts.filter(p => p.quarantine_status === 'quarantined').map(p => {
                                const form = p.form_8130_id ? forms8130.find(f => f.id === p.form_8130_id) : null;
                                return (
                                    <SectionCard key={p.id} padding="md">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-semibold text-sky-300">{p.part_no}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/25">Quarantine</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {form && (
                                                    <ActionButton size="sm" variant="ghost"
                                                        onClick={() => setTab('archive')}>
                                                        View 8130
                                                    </ActionButton>
                                                )}
                                                <ActionButton size="sm" variant="primary"
                                                    onClick={() => onUpdatePart({ ...p, quarantine_status: 'active' })}>
                                                    Release to Stock
                                                </ActionButton>
                                            </div>
                                        </div>
                                    </SectionCard>
                                );
                            })}
                            {quarCount === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                                    <CheckBadgeIcon className="w-10 h-10 mb-3 text-emerald-600/40" />
                                    <p className="text-sm">No parts in quarantine</p>
                                    <p className="text-xs mt-1">Use "Receive Parts" to ingest a new 8130-3</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tab === 'archive' && (
                    <FormArchive
                        forms={forms8130}
                        checkouts={checkoutRecords}
                        parts={parts}
                        onUpdate={onUpdateForm}
                    />
                )}

                {tab === 'pdf_library' && (
                    <LocalPdfLibrary
                        forms={forms8130}
                        currentUser={currentUser}
                        onNewForm={f => onUpdateForm({ ...f, status: 'released' })}
                        onUpdateForm={onUpdateForm}
                    />
                )}

                {tab === 'consumables' && (
                    <ConsumablesTab items={consumables} onUpdate={onUpdateConsumable} />
                )}
            </div>

            {/* Global label printer — accessible from any tab */}
            <LabelPrinter
                isOpen={labelOpen}
                onClose={() => setLabelOpen(false)}
                parts={allParts}
                forms={forms8130}
                selectedIds={labelIds}
            />

            <ReceivingModal
                isOpen={receivingOpen}
                onClose={() => setReceivingOpen(false)}
                currentUser={currentUser}
                onReceive={onReceive}
            />
        </div>
    );
};
