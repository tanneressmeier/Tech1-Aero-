
import React, { useState, useEffect } from 'react';
import { WorkOrder, RepairOrder, Aircraft, InventoryItem, Quote } from '../types.ts';
import { generateQuoteForOrder } from '../services/geminiService.ts';
import { BaseModal } from './BaseModal.tsx';
import { SparklesIcon, DocumentArrowDownIcon, PencilIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { useSettings } from '../contexts/SettingsContext.tsx';

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: WorkOrder | RepairOrder;
    aircraft: Aircraft;
    inventory: InventoryItem[];
}

export const QuoteModal: React.FC<QuoteModalProps> = ({ isOpen, onClose, order, aircraft, inventory }) => {
    const [quote, setQuote] = useState<Quote | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();

    useEffect(() => {
        // Reset state when modal is opened for a new order
        if (isOpen) {
            setQuote(null);
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleGenerateQuote = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const rates = {
                laborRate: settings.financials.laborRate,
                shopSupplyRate: settings.financials.shopSupplies / 100,
                taxRate: settings.financials.taxRate / 100
            };
            const result = await generateQuoteForOrder(order, aircraft, inventory, rates);
            setQuote(result);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred.");
            showToast({ message: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportPDF = async () => {
        if (!quote) return;
        showToast({ message: 'Generating PDF...', type: 'info' });
        // TODO: In a real implementation, this would call a utility function
        // like `generateQuotePDF(quote, order, aircraft)`
        alert("PDF export functionality is not fully implemented in this version.");
    };
    
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Quote for ${'wo_id' in order ? order.wo_id : order.ro_id}`}
            size="3xl"
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Close</button>
                    <button onClick={handleExportPDF} disabled={!quote} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-md">
                        <DocumentArrowDownIcon className="w-5 h-5"/> Export PDF
                    </button>
                </>
            }
        >
            {!quote && !isLoading && !error && (
                <div className="text-center p-8">
                    <p className="text-slate-400 mb-4">Generate a customer-facing quote for this order using AI.</p>
                    <div className="mb-6 p-4 bg-slate-900 rounded border border-slate-700 text-sm text-slate-300 inline-block text-left">
                        <p><strong>Configured Rates:</strong></p>
                        <ul className="list-disc pl-5 mt-1">
                            <li>Labor: ${settings.financials.laborRate}/hr</li>
                            <li>Supplies: {settings.financials.shopSupplies}%</li>
                            <li>Tax: {settings.financials.taxRate}%</li>
                        </ul>
                    </div>
                    <br/>
                    <button onClick={handleGenerateQuote} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 mx-auto">
                        <SparklesIcon className="w-5 h-5"/> Generate Quote with AI
                    </button>
                </div>
            )}
            {isLoading && (
                 <div className="text-center p-8">
                    <div className="flex justify-center items-center">
                        <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <p className="text-slate-300 mt-4">AI is analyzing the order and generating a quote...</p>
                 </div>
            )}
             {error && (
                 <div className="text-center p-8 bg-red-900/50 rounded-lg">
                    <p className="text-red-300 font-semibold">Failed to generate quote</p>
                    <p className="text-red-400 text-sm mt-2">{error}</p>
                 </div>
            )}
            {quote && (
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><PencilIcon className="w-4 h-4"/> Customer-Facing Description</h3>
                        <textarea
                            defaultValue={quote.customerDescription}
                            rows={4}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-sm text-slate-300 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <h3 className="font-semibold text-white mb-2">Line Items</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="p-2">Description</th>
                                        <th className="p-2 text-right">Qty</th>
                                        <th className="p-2 text-right">Unit Price</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quote.lineItems.map((item, index) => (
                                        <tr key={index} className="border-t border-slate-700">
                                            <td className="p-2"><input type="text" defaultValue={item.description} className="w-full bg-transparent p-1 rounded-md focus:bg-slate-700 focus:outline-none" /></td>
                                            <td className="p-2 text-right"><input type="number" defaultValue={item.quantity} className="w-20 bg-transparent p-1 text-right rounded-md focus:bg-slate-700 focus:outline-none" /></td>
                                            <td className="p-2 text-right"><input type="number" defaultValue={item.unitPrice.toFixed(2)} className="w-24 bg-transparent p-1 text-right rounded-md focus:bg-slate-700 focus:outline-none" /></td>
                                            <td className="p-2 text-right font-semibold">${item.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Subtotal:</span>
                                <span className="font-semibold text-white">${quote.subtotal.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-slate-400">Tax:</span>
                                <span className="font-semibold text-white">${quote.tax.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between text-lg border-t border-slate-600 pt-2 mt-2">
                                <span className="font-bold text-white">Total:</span>
                                <span className="font-bold text-white">${quote.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </BaseModal>
    );
};
