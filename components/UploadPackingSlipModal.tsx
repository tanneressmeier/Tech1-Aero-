import React, { useState, useCallback } from 'react';
import { ParsedPOHeader, ParsedPackingSlipItem } from '../types.ts';
import { parsePackingSlipWithAI } from '../services/geminiService.ts';
import { XMarkIcon, ArrowUpTrayIcon } from './icons.tsx';

interface UploadPackingSlipModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCommit: (header: ParsedPOHeader, items: ParsedPackingSlipItem[]) => void;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const UploadPackingSlipModal: React.FC<UploadPackingSlipModalProps> = ({ isOpen, onClose, onCommit }) => {
    const [header, setHeader] = useState<ParsedPOHeader | null>(null);
    const [items, setItems] = useState<ParsedPackingSlipItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const resetState = useCallback(() => {
        setHeader(null);
        setItems([]);
        setIsLoading(false);
        setError(null);
        setFile(null);
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        resetState();
        setFile(selectedFile);
        setIsLoading(true);

        try {
            const imageBase64 = await blobToBase64(selectedFile);
            const result = await parsePackingSlipWithAI(imageBase64, selectedFile.type);
            setHeader(result.header);
            setItems(result.items.map(item => ({ ...item, category: 'unassigned' })));
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCategoryChange = (index: number, category: ParsedPackingSlipItem['category']) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, category } : item));
    };

    const handleCommit = () => {
        if (!header || items.length === 0) return;
        onCommit(header, items);
        handleClose();
    };
    
    const canCommit = items.length > 0 && items.every(item => item.category !== 'unassigned');

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={handleClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-3xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Process Packing Slip</h2>
                        <p className="text-slate-400">Upload an image to automatically add items to inventory.</p>
                    </div>
                    <button type="button" onClick={handleClose} className="p-1 rounded-full hover:bg-slate-700"><XMarkIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {!header && !isLoading && (
                         <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-900/50 hover:bg-slate-700/50">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <ArrowUpTrayIcon className="w-8 h-8 mb-4 text-slate-400" />
                                <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-slate-500">PNG, JPG, or GIF</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                    )}
                   
                    {isLoading && <p className="text-center p-8 text-slate-300">Analyzing document with AI...</p>}
                    {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md text-center">{error}</div>}

                    {header && items.length > 0 && (
                        <div>
                            <div className="mb-4 p-4 bg-slate-900/50 rounded-lg">
                                <p><strong>PO #:</strong> {header.po_number}</p>
                                <p><strong>Supplier:</strong> {header.supplier_name}</p>
                                <p><strong>Date:</strong> {header.order_date}</p>
                            </div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="p-2">Model #</th>
                                        <th className="p-2">Description</th>
                                        <th className="p-2 text-center">Qty</th>
                                        <th className="p-2">Categorize As</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className="border-t border-slate-700">
                                            <td className="p-2 font-semibold">{item.model_number}</td>
                                            <td className="p-2">{item.description}</td>
                                            <td className="p-2 text-center">{item.quantity}</td>
                                            <td className="p-2">
                                                <select
                                                    value={item.category}
                                                    onChange={e => handleCategoryChange(index, e.target.value as ParsedPackingSlipItem['category'])}
                                                    className="w-full bg-slate-700 p-1 rounded-md border border-slate-600 focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    <option value="unassigned">-- Select --</option>
                                                    <option value="consumable">Consumable</option>
                                                    <option value="part">Part</option>
                                                    <option value="tool">Tool</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
                    <button type="button" onClick={handleClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button onClick={handleCommit} disabled={!canCommit || isLoading} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:text-slate-400 text-white font-bold py-2 px-4 rounded-md">
                        {isLoading ? 'Processing...' : 'Commit to Inventory'}
                    </button>
                </div>
            </div>
        </div>
    );
};