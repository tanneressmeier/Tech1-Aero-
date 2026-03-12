import React from 'react';
// FIX: Corrected import path for types by adding file extension.
import { PurchaseOrder } from '../types.ts';
// FIX: Corrected import path for icons by adding file extension.
import { XMarkIcon } from './icons.tsx';

interface PackingSlipModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchaseOrder: PurchaseOrder | null;
}

export const PackingSlipModal: React.FC<PackingSlipModalProps> = ({ isOpen, onClose, purchaseOrder }) => {
    if (!isOpen || !purchaseOrder) return null;

    const handlePrint = () => {
        const printContents = document.getElementById('packing-slip-content')?.innerHTML;
        const originalContents = document.body.innerHTML;
        if (printContents) {
            document.body.innerHTML = printContents;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload(); // To re-attach React
        }
    };
    
    const content = (
        <div>
             <h1 style={{fontSize: '24px', fontWeight: 'bold', color: '#1e293b', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '16px'}}>Packing Slip</h1>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                <div>
                    <p><strong>PO Number:</strong> {purchaseOrder.po_id}</p>
                    <p><strong>Order Date:</strong> {new Date(purchaseOrder.created_date).toLocaleDateString()}</p>
                </div>
                <div>
                    <p><strong>Supplier:</strong> {purchaseOrder.supplierName}</p>
                </div>
            </div>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead style={{backgroundColor: '#f1f5f9'}}>
                    <tr>
                        <th style={{border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left'}}>Part #</th>
                        <th style={{border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left'}}>Description</th>
                        <th style={{border: '1px solid #e2e8f0', padding: '8px', textAlign: 'right'}}>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    {purchaseOrder.items.map(item => (
                        <tr key={item.id}>
                            <td style={{border: '1px solid #e2e8f0', padding: '8px'}}>{item.name}</td>
                            <td style={{border: '1px solid #e2e8f0', padding: '8px'}}>{item.description}</td>
                            <td style={{border: '1px solid #e2e8f0', padding: '8px', textAlign: 'right'}}>{item.quantityToOrder}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                 <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Packing Slip</h2>
                        <p className="text-slate-400">PO: {purchaseOrder.po_id}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 bg-white text-slate-800 max-h-[70vh] overflow-y-auto" id="packing-slip-content">
                    {content}
                </div>
                <div className="p-6 bg-slate-900/50 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Close</button>
                    <button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">Print</button>
                </div>
            </div>
        </div>
    );
};
