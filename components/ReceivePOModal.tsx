import React, { useState, useEffect, useMemo } from 'react';
import { PurchaseOrder, PurchaseOrderItem, WorkOrder, RepairOrder } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';
import { ShoppingCartIcon } from './icons.tsx';

type CategorizedItem = PurchaseOrderItem & { category: 'part' | 'consumable' | 'tool' | 'unassigned' };

interface ReceivePOModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseOrder: PurchaseOrder | null;
    workOrders: WorkOrder[];
    repairOrders: RepairOrder[];
    onConfirm: (
        po: PurchaseOrder,
        items: CategorizedItem[],
        squawkId?: string
    ) => void;
}

export const ReceivePOModal: React.FC<ReceivePOModalProps> = ({
    isOpen,
    onClose,
    purchaseOrder,
    workOrders,
    repairOrders,
    onConfirm,
}) => {
    const [categorizedItems, setCategorizedItems] = useState<CategorizedItem[]>([]);
    const [selectedSquawkId, setSelectedSquawkId] = useState<string>('');

    useEffect(() => {
        if (purchaseOrder) {
            setCategorizedItems(purchaseOrder.items.map(item => ({ ...item, category: 'unassigned' })));
            setSelectedSquawkId('');
        }
    }, [purchaseOrder]);

    const allSquawks = useMemo(() => {
        const squawks = [];
        for (const wo of workOrders) {
            if (wo.status === 'In Progress' || wo.status === 'Pending') {
                 for (const sq of wo.squawks) {
                    squawks.push({ id: sq.squawk_id, label: `${wo.wo_id} / ${sq.squawk_id}: ${sq.description}` });
                }
            }
        }
        for (const ro of repairOrders) {
             if (ro.status === 'In Progress' || ro.status === 'Pending') {
                for (const sq of ro.squawks) {
                    squawks.push({ id: sq.squawk_id, label: `${ro.ro_id} / ${sq.squawk_id}: ${sq.description}` });
                }
            }
        }
        return squawks;
    }, [workOrders, repairOrders]);

    if (!isOpen || !purchaseOrder) return null;

    const handleCategoryChange = (index: number, category: CategorizedItem['category']) => {
        setCategorizedItems(prev => prev.map((item, i) => (i === index ? { ...item, category } : item)));
    };

    const handleConfirm = () => {
        onConfirm(purchaseOrder, categorizedItems, selectedSquawkId || undefined);
        onClose();
    };
    
    const canConfirm = categorizedItems.length > 0 && categorizedItems.every(item => item.category !== 'unassigned');

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Receive Items for PO #${purchaseOrder.po_id}`}
            size="3xl"
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button onClick={handleConfirm} disabled={!canConfirm} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md">
                        Confirm & Add to Inventory
                    </button>
                </>
            }
        >
            <div className="space-y-6">
                <div>
                    <h3 className="font-semibold text-white mb-2">Categorize Received Items</h3>
                    <p className="text-sm text-slate-400 mb-4">Select a category for each item to add it to the correct inventory.</p>
                     <div className="overflow-x-auto border border-slate-700 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50">
                                <tr>
                                    <th className="p-3">Part #</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3 text-center">Qty</th>
                                    <th className="p-3">Categorize As</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {categorizedItems.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="p-3 font-semibold">{item.name}</td>
                                        <td className="p-3">{item.description}</td>
                                        <td className="p-3 text-center">{item.quantityToOrder}</td>
                                        <td className="p-3">
                                            <select
                                                value={item.category}
                                                onChange={e => handleCategoryChange(index, e.target.value as CategorizedItem['category'])}
                                                className="w-full bg-slate-700 p-2 rounded-md border border-slate-600 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="unassigned">-- Select --</option>
                                                <option value="part">Part</option>
                                                <option value="consumable">Consumable</option>
                                                <option value="tool">Tool</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                 <div>
                    <h3 className="font-semibold text-white mb-2">Reserve Parts for a Task (Optional)</h3>
                    <p className="text-sm text-slate-400 mb-2">If these parts are for a specific task, select it here to reserve them.</p>
                    <select
                        value={selectedSquawkId}
                        onChange={(e) => setSelectedSquawkId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">-- No specific task --</option>
                        {allSquawks.map(sq => (
                            <option key={sq.id} value={sq.id}>{sq.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </BaseModal>
    );
};