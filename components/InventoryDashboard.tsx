// =============================================================================
// InventoryDashboard.tsx — Parts & Warehouse Management Module
// Tabs: Inventory | Warehouse Map | Receiving | Archive | PDF Library | Consumables
// =============================================================================
import React, { useState } from 'react';
import { InventoryItem, PurchaseOrderItem, Technician, Form8130, CheckoutRecord } from '../types.ts';
import { PageHeader, TabBar, ActionButton, AlertBanner, SectionCard } from './ui.tsx';
import {
    CogIcon, DocumentTextIcon, CheckBadgeIcon, PrinterIcon, ArrowUpTrayIcon,
} from './icons.tsx';
import { WarehouseMap } from './WarehouseMap.tsx';
import { ReceivingModal } from './ReceivingModal.tsx';
import { FormArchive } from './FormArchive.tsx';
import { LabelPrinter } from './LabelPrinter.tsx';
import { LocalPdfLibrary } from './LocalPdfLibrary.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { BinAssignPanel }  from './inventory/BinAssignPanel.tsx';
import { InventoryTab }    from './inventory/InventoryTab.tsx';
import { ConsumablesTab }  from './inventory/ConsumablesTab.tsx';

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

// ── Main component ────────────────────────────────────────────────────────────
export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
    parts, consumables, forms8130, checkoutRecords, currentUser,
    onCreatePurchaseOrder, onUpdatePart, onUpdateConsumable, onReceive, onUpdateForm,
}) => {
    const { showToast } = useToast();
    const [tab,           setTab]           = useState<Tab>('inventory');
    const [receivingOpen, setReceivingOpen] = useState(false);
    // labelPrinter groups open + ids — they always change together when opening the printer
    const [labelPrinter,  setLabelPrinter]  = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
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

    const openPrintLabel = (ids: string[]) => setLabelPrinter({ open: true, ids });

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
                isOpen={labelPrinter.open}
                onClose={() => setLabelPrinter(p => ({ ...p, open: false }))}
                parts={allParts}
                forms={forms8130}
                selectedIds={labelPrinter.ids}
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
