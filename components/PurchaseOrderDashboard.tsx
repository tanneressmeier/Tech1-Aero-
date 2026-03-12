import React, { useState, useMemo } from 'react';
// FIX: Corrected import path for types by adding file extension.
// FIX: Added 'PurchaseOrderItem' to import to fix type error.
import { PurchaseOrder, PurchaseOrderItem, InventoryItem, ParsedPOHeader, ParsedPackingSlipItem, WorkOrder, RepairOrder } from '../types.ts';
// FIX: Corrected import path for icons by adding file extension.
import { ShoppingCartIcon, ChevronUpIcon, ChevronDownIcon, ArrowUpTrayIcon } from './icons.tsx';
// FIX: Corrected import path for component by adding file extension.
import { PackingSlipModal } from './PackingSlipModal.tsx';
import { UploadPackingSlipModal } from './UploadPackingSlipModal.tsx';
import { ReceivePOModal } from './ReceivePOModal.tsx';


interface PurchaseOrderDashboardProps {
    purchaseOrders: PurchaseOrder[];
    inventory: InventoryItem[];
    workOrders: WorkOrder[];
    repairOrders: RepairOrder[];
    onUpdatePurchaseOrder: (updatedPO: PurchaseOrder) => void;
    onReceiveFromPackingSlip: (header: ParsedPOHeader, items: ParsedPackingSlipItem[]) => void;
    onConfirmReception: (
        po: PurchaseOrder,
        categorizedItems: (PurchaseOrderItem & { category: 'part' | 'consumable' | 'tool' | 'unassigned' })[],
        squawkId?: string
    ) => void;
}

export const PurchaseOrderDashboard: React.FC<PurchaseOrderDashboardProps> = ({ 
    purchaseOrders, 
    inventory, 
    onUpdatePurchaseOrder, 
    onReceiveFromPackingSlip,
    onConfirmReception,
    workOrders,
    repairOrders
}) => {
    const [sortKey, setSortKey] = useState<keyof PurchaseOrder>('created_date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [expandedPO, setExpandedPO] = useState<string | null>(null);
    const [packingSlipPO, setPackingSlipPO] = useState<PurchaseOrder | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);


    const sortedPOs = useMemo(() => {
        return [...purchaseOrders].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            let comparison = 0;
            if (aVal > bVal) comparison = 1;
            else if (aVal < bVal) comparison = -1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [purchaseOrders, sortKey, sortDirection]);

    const handleSort = (key: keyof PurchaseOrder) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };
    
    const statusColor = (status: PurchaseOrder['status']) => {
        switch (status) {
            case 'Draft': return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
            case 'Submitted': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
            case 'Partially Received': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
            case 'Received': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            case 'Cancelled': return 'bg-red-500/10 text-red-400 border border-red-500/20';
            default: return 'bg-slate-500/10 text-slate-400';
        }
    };
    
    const SortableHeader: React.FC<{ sortKey: keyof PurchaseOrder, label: string }> = ({ sortKey: key, label }) => (
        <th onClick={() => handleSort(key)} className="p-4 text-xs font-mono font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors">
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
                    <div className="p-3 bg-white/5 rounded-lg text-purple-400 border border-white/10">
                        <ShoppingCartIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-light tracking-wide text-white uppercase">Purchase Orders</h2>
                </div>
                 <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500/50 font-medium py-2 px-4 rounded-lg text-sm transition-all duration-300"
                >
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    Upload Packing Slip
                </button>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-4 w-12"></th>
                                <SortableHeader sortKey="po_id" label="PO #" />
                                <SortableHeader sortKey="supplierName" label="Supplier" />
                                <SortableHeader sortKey="created_date" label="Date Created" />
                                <SortableHeader sortKey="totalCost" label="Total" />
                                <SortableHeader sortKey="status" label="Status" />
                                <th className="p-4 text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedPOs.map(po => (
                                <React.Fragment key={po.po_id}>
                                    <tr className="hover:bg-white/5 transition-colors duration-200">
                                        <td className="p-4">
                                            <button onClick={() => setExpandedPO(p => p === po.po_id ? null : po.po_id)} className="text-slate-500 hover:text-white">
                                                {expandedPO === po.po_id ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                                            </button>
                                        </td>
                                        <td className="p-4 text-sm text-purple-300 font-mono">{po.po_id}</td>
                                        <td className="p-4 text-sm text-white font-medium">{po.supplierName}</td>
                                        <td className="p-4 text-sm text-slate-400 font-mono">{new Date(po.created_date).toLocaleDateString()}</td>
                                        <td className="p-4 text-sm text-white font-mono">${po.totalCost.toFixed(2)}</td>
                                        <td className="p-4 text-sm">
                                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusColor(po.status)}`}>{po.status}</span>
                                        </td>
                                        <td className="p-4 text-sm space-x-3">
                                            <button onClick={() => setPackingSlipPO(po)} className="font-medium text-sky-400 hover:text-sky-300 transition-colors">Slip</button>
                                            {po.status !== 'Received' && <button onClick={() => setReceivingPO(po)} className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">Receive</button>}
                                        </td>
                                    </tr>
                                    {expandedPO === po.po_id && (
                                        <tr className="bg-black/20">
                                            <td colSpan={7} className="p-6">
                                                <h4 className="font-mono text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Line Items</h4>
                                                <ul className="space-y-2 text-sm text-slate-300 pl-4 border-l border-white/10">
                                                    {po.items.map(item => (
                                                        <li key={item.id} className="flex justify-between max-w-md">
                                                            <span>{item.quantityToOrder}x <span className="font-semibold text-white">{item.name}</span> ({item.description})</span>
                                                            <span className="font-mono text-slate-500">@ ${item.costPerUnit.toFixed(2)} ea</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    {sortedPOs.length === 0 && <div className="p-12 text-center text-slate-500 font-mono uppercase tracking-widest text-sm">No purchase orders found</div>}
                </div>
            </div>
            {packingSlipPO && (
                <PackingSlipModal isOpen={!!packingSlipPO} onClose={() => setPackingSlipPO(null)} purchaseOrder={packingSlipPO} />
            )}
            <UploadPackingSlipModal 
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onCommit={onReceiveFromPackingSlip}
            />
            <ReceivePOModal
                isOpen={!!receivingPO}
                onClose={() => setReceivingPO(null)}
                purchaseOrder={receivingPO}
                onConfirm={onConfirmReception}
                workOrders={workOrders}
                repairOrders={repairOrders}
            />
        </div>
    );
};