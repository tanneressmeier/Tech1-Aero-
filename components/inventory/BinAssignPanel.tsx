import React, { useState } from 'react';
import { InventoryItem, Form8130 } from '../../types.ts';
import { ActionButton } from '../ui.tsx';
import { CheckBadgeIcon, PrinterIcon } from '../icons.tsx';

interface BinAssignPanelProps {
    form:      Form8130;
    allParts:  InventoryItem[];
    onAssign:  (form: Form8130, item: Partial<InventoryItem>) => void;
    onPrint:   (partId: string) => void;
    onDismiss: () => void;
}

export const BinAssignPanel: React.FC<BinAssignPanelProps> = ({ form, allParts, onAssign, onPrint, onDismiss }) => {
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
