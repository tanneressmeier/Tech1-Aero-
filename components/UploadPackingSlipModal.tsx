import React, { useState, useCallback } from 'react';
import { ParsedPOHeader, ParsedPackingSlipItem } from '../types.ts';
import { analyzePackingSlip } from '../services/geminiService.ts';
import { XMarkIcon, ArrowUpTrayIcon } from './icons.tsx';

interface UploadPackingSlipModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCommit: (header: ParsedPOHeader, items: ParsedPackingSlipItem[]) => void;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

export const UploadPackingSlipModal: React.FC<UploadPackingSlipModalProps> = ({ isOpen, onClose, onCommit }) => {
    const [header, setHeader] = useState<ParsedPOHeader | null>(null);
    const [items, setItems]   = useState<ParsedPackingSlipItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]   = useState<string | null>(null);

    const reset = useCallback(() => { setHeader(null); setItems([]); setIsLoading(false); setError(null); }, []);
    const handleClose = () => { reset(); onClose(); };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        reset();
        setIsLoading(true);
        try {
            const b64 = await blobToBase64(file);
            // analyzePackingSlip returns ParsedPackingSlipItem[] — build a synthetic header
            const parsed = await analyzePackingSlip(b64, file.type);
            setHeader({ supplierName: 'Unknown Supplier', poNumber: 'SCAN-' + Date.now(), orderDate: new Date().toISOString().split('T')[0], estimatedTotal: 0 });
            setItems(parsed);
        } catch (err: any) {
            setError(err.message || 'Unexpected error.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCommit = () => {
        if (!header || !items.length) return;
        onCommit(header, items);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 backdrop-blur-sm" onClick={handleClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Process Packing Slip</h2>
                        <p className="text-slate-400 text-sm mt-1">Upload an image to auto-extract line items.</p>
                    </div>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-slate-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {!header && !isLoading && (
                        <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-700/50">
                            <ArrowUpTrayIcon className="w-8 h-8 mb-3 text-slate-400" />
                            <p className="text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF</p>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                    )}
                    {isLoading && <p className="text-center py-10 text-slate-300">Analyzing document with AI…</p>}
                    {error   && <div className="bg-red-500/20 text-red-300 p-3 rounded-md text-center">{error}</div>}

                    {header && items.length > 0 && (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-900/50 rounded-lg text-sm text-slate-300 space-y-1">
                                <p><strong>PO #:</strong> {header.poNumber}</p>
                                <p><strong>Supplier:</strong> {header.supplierName}</p>
                                <p><strong>Date:</strong> {header.orderDate}</p>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="p-2 text-slate-400">Part #</th>
                                        <th className="p-2 text-slate-400">Description</th>
                                        <th className="p-2 text-center text-slate-400">Qty</th>
                                        <th className="p-2 text-center text-slate-400">Unit Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i} className="border-t border-slate-700">
                                            <td className="p-2 font-mono text-sky-300 text-xs">{item.partNumber}</td>
                                            <td className="p-2 text-slate-200">{item.description}</td>
                                            <td className="p-2 text-center text-slate-300">{item.quantityShipped}</td>
                                            <td className="p-2 text-center text-slate-300">${item.unitCost.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-5 bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={handleClose} className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-md text-sm">Cancel</button>
                    <button onClick={handleCommit} disabled={!items.length || isLoading}
                        className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:text-slate-400 text-white py-2 px-4 rounded-md text-sm font-medium">
                        {isLoading ? 'Processing…' : 'Commit to Inventory'}
                    </button>
                </div>
            </div>
        </div>
    );
};
