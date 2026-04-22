// =============================================================================
// InventoryDashboard.tsx — Parts & Warehouse Management Module
// Tabs: Inventory | Warehouse Map | Receiving | Archive | Consumables
// =============================================================================
import React, { useState, useMemo } from 'react';
import { InventoryItem, PurchaseOrderItem, Technician, Form8130, CheckoutRecord } from '../types.ts';
import { PageHeader, TabBar, ActionButton, AlertBanner, SectionCard, StatusBadge } from './ui.tsx';
import {
    CogIcon, ShoppingCartIcon, ShieldCheckIcon, DocumentTextIcon,
    CheckBadgeIcon, PlusIcon, PrinterIcon, ArrowUpTrayIcon,
    MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon,
    ExclamationTriangleIcon, ClockIcon,
} from './icons.tsx';
import { WarehouseMap } from './WarehouseMap.tsx';
import { ReceivingModal } from './ReceivingModal.tsx';
import { FormArchive } from './FormArchive.tsx';
import { LabelPrinter } from './LabelPrinter.tsx';
import { PartEditModal } from './PartEditModal.tsx';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FilterPanel, FilterConfig, FilterValue } from './FilterPanel.tsx';

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

type Tab = 'inventory' | 'map' | 'receiving' | 'archive' | 'consumables';

// ── Inventory tab ─────────────────────────────────────────────────────────────
const InventoryTab: React.FC<{
    parts: InventoryItem[];
    forms: Form8130[];
    onCreatePO: (items: PurchaseOrderItem[]) => void;
    onUpdatePart: (part: InventoryItem) => void;
}> = ({ parts, forms, onCreatePO, onUpdatePart }) => {
    const [search,       setSearch]      = useState('');
    const [sortKey,      setSortKey]     = useState<keyof InventoryItem>('description');
    const [sortDir,      setSortDir]     = useState<'asc'|'desc'>('asc');
    const [selectedIds,  setSelectedIds] = useState<Set<string>>(new Set());
    const [filterOpen,   setFilterOpen]  = useState(false);
    const [filters,      setFilters]     = useState<Record<string, FilterValue>>({ lowStock: 'all', storageArea: 'all', condition: 'all', quarantine: 'all' });
    const [editPart,     setEditPart]    = useState<InventoryItem | null>(null);
    const [labelParts,   setLabelParts]  = useState<string[]>([]);
    const [labelOpen,    setLabelOpen]   = useState(false);
    const [viewFormId,   setViewFormId]  = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return parts.filter(p => {
            if (q && !(p.part_no.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.shelf_location.toLowerCase().includes(q))) return false;
            if (filters.lowStock     === 'yes' && p.qty_on_hand > p.reorder_level) return false;
            if (filters.storageArea  !== 'all' && p.storage_area !== filters.storageArea) return false;
            if (filters.condition    !== 'all' && p.condition    !== filters.condition) return false;
            if (filters.quarantine   !== 'all') {
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

    const SortHdr: React.FC<{ k: keyof InventoryItem; label: string; cls?: string }> = ({ k, label, cls='' }) => (
        <div onClick={() => toggleSort(k)} className={`flex items-center gap-1 cursor-pointer hover:text-white transition-colors ${cls}`}>
            {label}
            {sortKey === k && (sortDir === 'asc' ? <ChevronUpIcon className="w-3 h-3"/> : <ChevronDownIcon className="w-3 h-3"/>)}
        </div>
    );

    const filterConfig: FilterConfig[] = useMemo(() => [
        { name: 'lowStock',   label: 'Stock Level', type: 'select', options: [{value:'all',label:'All'},{value:'yes',label:'Low Stock Only'}] },
        { name: 'storageArea',label: 'Storage Area',type: 'select', options: [{value:'all',label:'All'},...Array.from(new Set(parts.map(p=>p.storage_area).filter(Boolean))).sort().map(a=>({value:a!,label:a!}))] },
        { name: 'condition',  label: 'Condition',   type: 'select', options: [{value:'all',label:'All'},  ...['New','Overhauled','Repaired','Inspected','Modified'].map(c=>({value:c,label:c}))] },
        { name: 'quarantine', label: 'Status',      type: 'select', options: [{value:'all',label:'All'},{value:'active',label:'Active'},{value:'quarantined',label:'Quarantine'}] },
    ], [parts]);

    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const p = filtered[index];
        const isLow   = p.qty_on_hand <= p.reorder_level;
        const isQuar  = p.quarantine_status === 'quarantined';
        const form    = p.form_8130_id ? forms.find(f => f.id === p.form_8130_id) : null;

        return (
            <div style={style}
                className={`grid grid-cols-[36px_1.4fr_2.5fr_0.8fr_0.6fr_0.7fr_0.7fr_1.2fr_0.8fr_0.8fr] gap-x-2 items-center px-3 border-t border-white/5 hover:bg-white/3 transition-colors text-sm
                    ${isQuar ? 'bg-amber-500/5' : isLow ? 'bg-orange-500/5' : ''}`}>
                <div className="flex justify-center">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => {
                        setSelectedIds(prev => { const n=new Set(prev); n.has(p.id)?n.delete(p.id):n.add(p.id); return n; });
                    }} className="accent-sky-500 cursor-pointer" />
                </div>
                <div className="font-mono text-sky-300 font-medium truncate" title={p.part_no}>{p.part_no}</div>
                <div className="text-slate-300 truncate" title={p.description}>{p.description}</div>
                <div className="flex items-center gap-1 justify-center">
                    {p.certification?.verified && p.certification.type === '8130-3' &&
                        <ShieldCheckIcon className="w-4 h-4 text-emerald-400" title="8130-3 verified" />}
                    {isQuar && <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" title="Quarantine" />}
                </div>
                <div className={`font-semibold font-mono text-center ${isLow ? 'text-orange-400' : 'text-white'}`}>{p.qty_on_hand}</div>
                <div className="text-slate-500 font-mono text-center">{p.qty_reserved}</div>
                <div className="text-slate-500 font-mono text-center">{p.reorder_level}</div>
                <div className="text-slate-400 truncate text-xs font-mono">{p.shelf_location}</div>
                <div className="text-center">
                    {p.condition && (
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                            p.condition === 'New'        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' :
                            p.condition === 'Overhauled' ? 'bg-sky-500/15     text-sky-300     border-sky-500/20'     :
                                                           'bg-slate-500/15   text-slate-300   border-slate-500/20'
                        }`}>{p.condition}</span>
                    )}
                </div>
                <div className="flex items-center gap-1 justify-center">
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
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-3">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search parts…"
                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500" />
                </div>
                <ActionButton size="sm" onClick={() => setFilterOpen(true)} variant="secondary">Filters</ActionButton>
                {selectedIds.size > 0 && (
                    <>
                        <ActionButton size="sm" variant="secondary"
                            icon={<PrinterIcon className="w-3.5 h-3.5" />}
                            onClick={() => { setLabelParts([...selectedIds]); setLabelOpen(true); }}>
                            Print Labels ({selectedIds.size})
                        </ActionButton>
                        <ActionButton size="sm" variant="secondary"
                            icon={<ShoppingCartIcon className="w-3.5 h-3.5" />}
                            onClick={() => {
                                const items: PurchaseOrderItem[] = [...selectedIds].map(id => {
                                    const p = parts.find(x => x.id === id)!;
                                    return { id: p.id, inventoryItemId: p.id, name: p.part_no, description: p.description, quantityToOrder: p.reorder_level*2||10, costPerUnit: p.suppliers[0]?.cost||0, supplierName: p.suppliers[0]?.supplierName||'N/A' };
                                });
                                onCreatePO(items);
                                setSelectedIds(new Set());
                            }}>
                            Create PO
                        </ActionButton>
                    </>
                )}
                <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                    <span>{filtered.length} / {parts.length} parts</span>
                    {parts.filter(p => p.qty_on_hand <= p.reorder_level).length > 0 && (
                        <span className="text-orange-400">▼ {parts.filter(p => p.qty_on_hand <= p.reorder_level).length} low stock</span>
                    )}
                    {parts.filter(p => p.quarantine_status === 'quarantined').length > 0 && (
                        <span className="text-amber-400">⚠ {parts.filter(p => p.quarantine_status === 'quarantined').length} quarantined</span>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden flex-1 flex flex-col">
                <div className="grid grid-cols-[36px_1.4fr_2.5fr_0.8fr_0.6fr_0.7fr_0.7fr_1.2fr_0.8fr_0.8fr] gap-x-2 px-3 py-3 bg-white/5 text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">
                    <div/>
                    <SortHdr k="part_no"     label="Part #" />
                    <SortHdr k="description" label="Description" />
                    <div className="text-center">Cert</div>
                    <SortHdr k="qty_on_hand"   label="On Hand" cls="justify-center" />
                    <SortHdr k="qty_reserved"  label="Rsv" cls="justify-center" />
                    <SortHdr k="reorder_level" label="Reorder" cls="justify-center" />
                    <SortHdr k="shelf_location" label="Bin" />
                    <div className="text-center">Cond.</div>
                    <div className="text-center">Actions</div>
                </div>
                <div className="flex-1">
                    <AutoSizer>
                        {({ height, width }) => filtered.length > 0 ? (
                            <List height={height} itemCount={filtered.length} itemSize={44} width={width}>{Row}</List>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-600 text-sm italic">No parts match filters</div>
                        )}
                    </AutoSizer>
                </div>
            </div>

            <FilterPanel isOpen={filterOpen} onClose={() => setFilterOpen(false)} filters={filters}
                onFilterChange={(n,v) => setFilters(p=>({...p,[n]:v}))} filterConfig={filterConfig}
                onClearAll={() => setFilters({ lowStock:'all', storageArea:'all', condition:'all', quarantine:'all' })} />
            <PartEditModal isOpen={!!editPart} onClose={() => setEditPart(null)} part={editPart} onSave={p => { onUpdatePart(p); setEditPart(null); }} />
            <LabelPrinter isOpen={labelOpen} onClose={() => setLabelOpen(false)} parts={parts} forms={forms} selectedIds={labelParts} />
            {/* 8130 quick-view — re-uses FormArchive in a modal mode */}
            {viewFormId && (
                <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-6"
                    onClick={() => setViewFormId(null)}>
                    <div className="bg-[#0d1220] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-5 py-4 border-b border-white/8">
                            <h3 className="text-base font-semibold text-white">FAA 8130-3 Form</h3>
                            <button onClick={() => setViewFormId(null)} className="text-slate-400 hover:text-white text-xl">×</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            <FormArchive forms={forms.filter(f=>f.id===viewFormId)} checkouts={[]} parts={parts} onUpdate={() => {}} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Consumables tab ───────────────────────────────────────────────────────────
const ConsumablesTab: React.FC<{ items: InventoryItem[]; onUpdate: (i: InventoryItem) => void }> = ({ items, onUpdate }) => {
    const today = new Date();
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
            {expired.length > 0 && (
                <AlertBanner severity="critical" title={`${expired.length} expired consumable${expired.length>1?'s':''} — remove from stock immediately`} />
            )}
            {expiring.length > 0 && (
                <AlertBanner severity="warning" title={`${expiring.length} consumable${expiring.length>1?'s':''} expiring within 30 days`} />
            )}
            <div className="space-y-2">
                {sorted.map(item => {
                    const isExpired  = item.expiration_date && new Date(item.expiration_date) < today;
                    const isExpiring = item.expiration_date && new Date(item.expiration_date) >= today && new Date(item.expiration_date) <= warn30;
                    const daysLeft   = item.expiration_date
                        ? Math.round((new Date(item.expiration_date).getTime() - today.getTime()) / 86400000)
                        : null;
                    return (
                        <div key={item.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${
                            isExpired  ? 'bg-red-500/10    border-red-500/25' :
                            isExpiring ? 'bg-amber-500/10  border-amber-500/25' :
                                         'bg-white/3       border-white/8'
                        }`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-white truncate">{item.description}</span>
                                    <span className="text-[10px] font-mono text-slate-500">{item.part_no}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {item.shelf_location} · {item.qty_on_hand} {item.unit}
                                    {item.dom && ` · DOM: ${item.dom}`}
                                </p>
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
    const [tab,             setTab]             = useState<Tab>('inventory');
    const [receivingOpen,   setReceivingOpen]   = useState(false);
    const [viewFormId,      setViewFormId]      = useState<string | null>(null);

    const lowCount      = parts.filter(p => p.qty_on_hand <= p.reorder_level).length;
    const quarCount     = parts.filter(p => p.quarantine_status === 'quarantined').length;
    const expiredConsum = consumables.filter(i => i.expiration_date && new Date(i.expiration_date) < new Date()).length;

    return (
        <div className="h-full flex flex-col gap-5">
            <PageHeader
                title="Parts & Warehouse"
                subtitle={`${parts.length} parts · ${forms8130.length} 8130 forms · ${checkoutRecords.length} checkout records`}
                icon={<CogIcon className="w-5 h-5" />}
                actions={
                    <ActionButton
                        variant="primary" size="sm"
                        icon={<ArrowUpTrayIcon className="w-3.5 h-3.5" />}
                        onClick={() => setReceivingOpen(true)}>
                        Receive Parts
                    </ActionButton>
                }
            />

            <TabBar
                tabs={[
                    { id: 'inventory',   label: 'Inventory',       badge: lowCount || undefined },
                    { id: 'map',         label: 'Warehouse Map' },
                    { id: 'receiving',   label: 'Receiving',        badge: quarCount || undefined },
                    { id: 'archive',     label: '8130 Archive',     badge: forms8130.length || undefined },
                    { id: 'consumables', label: 'Consumables',      badge: expiredConsum || undefined },
                ]}
                active={tab}
                onChange={t => setTab(t as Tab)}
            />

            <div className="flex-1 min-h-0 overflow-y-auto">
                {tab === 'inventory' && (
                    <InventoryTab parts={parts} forms={forms8130} onCreatePO={onCreatePurchaseOrder} onUpdatePart={onUpdatePart} />
                )}

                {tab === 'map' && (
                    <WarehouseMap
                        parts={[...parts, ...consumables]}
                        forms={forms8130}
                        onViewForm={setViewFormId}
                        onNavigateToPart={() => setTab('inventory')}
                    />
                )}

                {tab === 'receiving' && (
                    <div className="space-y-4">
                        {quarCount > 0 && (
                            <AlertBanner severity="warning"
                                title={`${quarCount} part${quarCount>1?'s':''} in quarantine — pending inspection release`} />
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
                                                {form?.received_date && <p className="text-[10px] text-slate-600">Received: {new Date(form.received_date).toLocaleDateString()}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                {form && (
                                                    <ActionButton size="sm" variant="ghost"
                                                        onClick={() => setViewFormId(form.id)}>
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

                {tab === 'consumables' && (
                    <ConsumablesTab items={consumables} onUpdate={onUpdateConsumable} />
                )}
            </div>

            {/* Receiving modal (triggered from header or Receive Parts button) */}
            <ReceivingModal
                isOpen={receivingOpen}
                onClose={() => setReceivingOpen(false)}
                currentUser={currentUser}
                onReceive={onReceive}
            />

            {/* 8130 quick-view from map / receiving tab */}
            {viewFormId && (
                <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-6"
                    onClick={() => setViewFormId(null)}>
                    <div className="bg-[#0d1220] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center px-5 py-4 border-b border-white/8">
                            <h3 className="text-base font-semibold text-white">FAA 8130-3 — Form Viewer</h3>
                            <button onClick={() => setViewFormId(null)} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
                        </div>
                        <div className="flex-1 overflow-hidden p-5">
                            <FormArchive forms={forms8130.filter(f=>f.id===viewFormId)} checkouts={checkoutRecords} parts={parts} onUpdate={onUpdateForm} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
