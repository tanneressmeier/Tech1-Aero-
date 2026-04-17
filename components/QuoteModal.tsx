import React, { useState, useEffect } from 'react';
import { WorkOrder, RepairOrder, Aircraft, InventoryItem, Quote } from '../types.ts';
import { generateQuoteForOrder } from '../services/geminiService.ts';
import { generateQuotePDF } from '../utils/pdfGenerator.ts';
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
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();

    useEffect(() => {
        if (isOpen) { setQuote(null); setError(null); setIsLoading(false); }
    }, [isOpen]);

    const handleGenerateQuote = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const rates = {
                laborRate:      settings.financials.laborRate,
                shopSupplyRate: settings.financials.shopSupplies / 100,
                taxRate:        settings.financials.taxRate / 100,
            };
            const result = await generateQuoteForOrder(order, aircraft, inventory, rates);
            setQuote(result);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
            showToast({ message: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportPDF = async () => {
        if (!quote) return;
        setIsExporting(true);
        try {
            await generateQuotePDF(
                quote, order, aircraft,
                settings.organization.name,
                settings.organization.repairStationNum
            );
            showToast({ message: 'Quote PDF exported successfully.', type: 'success' });
        } catch (err: any) {
            showToast({ message: `PDF export failed: ${err.message}`, type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    const orderId = 'wo_id' in order ? order.wo_id : order.ro_id;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Quote — ${orderId}`}
            size="3xl"
            footer={
                <>
                    <button type="button" onClick={onClose}
                        className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">
                        Close
                    </button>
                    <button onClick={handleExportPDF} disabled={!quote || isExporting}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:text-slate-400 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        <DocumentArrowDownIcon className="w-5 h-5" />
                        {isExporting ? 'Generating PDF…' : 'Export PDF'}
                    </button>
                </>
            }
        >
            {/* ── Pre-generate prompt ── */}
            {!quote && !isLoading && !error && (
                <div className="text-center p-8 space-y-5">
                    <p className="text-slate-400">Generate a professional customer-facing quote using AI.</p>
                    <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 text-sm text-slate-300 inline-block text-left space-y-1">
                        <p className="font-semibold text-slate-200 mb-2">Configured Rates</p>
                        <p>Labor: <span className="text-sky-300">${settings.financials.laborRate}/hr</span></p>
                        <p>Shop Supplies: <span className="text-sky-300">{settings.financials.shopSupplies}%</span></p>
                        <p>Tax: <span className="text-sky-300">{settings.financials.taxRate}%</span></p>
                    </div>
                    <div>
                        <button onClick={handleGenerateQuote}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 mx-auto transition-colors">
                            <SparklesIcon className="w-5 h-5" /> Generate Quote with AI
                        </button>
                    </div>
                </div>
            )}

            {/* ── Loading ── */}
            {isLoading && (
                <div className="text-center p-10 space-y-3">
                    <svg className="animate-spin h-8 w-8 text-cyan-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <p className="text-slate-300">AI is analyzing the order and generating your quote…</p>
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div className="text-center p-8 bg-red-900/30 rounded-lg border border-red-500/30 space-y-3">
                    <p className="text-red-300 font-semibold">Failed to generate quote</p>
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={handleGenerateQuote}
                        className="text-sm text-sky-400 hover:text-sky-300 underline">
                        Try again
                    </button>
                </div>
            )}

            {/* ── Quote display ── */}
            {quote && (
                <div className="space-y-6">
                    {/* Customer description */}
                    <div>
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2 text-sm">
                            <PencilIcon className="w-4 h-4" /> Customer-Facing Description
                        </h3>
                        <textarea
                            defaultValue={quote.customerDescription}
                            rows={4}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-sm text-slate-300 focus:ring-1 focus:ring-sky-500 focus:outline-none resize-none"
                        />
                    </div>

                    {/* Line items */}
                    <div>
                        <h3 className="font-semibold text-white mb-2 text-sm">Line Items</h3>
                        <div className="overflow-x-auto rounded-lg border border-slate-700">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-900/70">
                                    <tr>
                                        {['Description', 'Part #', 'Qty', 'Unit Price', 'Total'].map(h => (
                                            <th key={h} className="p-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide last:text-right">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {quote.lineItems.map((item, i) => (
                                        <tr key={i} className="hover:bg-white/3">
                                            <td className="p-2.5">
                                                <input type="text" defaultValue={item.description}
                                                    className="w-full bg-transparent rounded px-1 py-0.5 focus:bg-slate-700 focus:outline-none text-slate-200" />
                                            </td>
                                            <td className="p-2.5 text-slate-400 font-mono text-xs">{item.part_no || '—'}</td>
                                            <td className="p-2.5 text-center text-slate-300">{item.quantity}</td>
                                            <td className="p-2.5 text-right text-slate-300">${item.unitPrice.toFixed(2)}</td>
                                            <td className="p-2.5 text-right font-semibold text-slate-200">${item.total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-1.5 text-sm">
                            {[
                                { label: 'Labor',         value: quote.laborTotal },
                                { label: 'Parts',         value: quote.partsTotal },
                                { label: 'Shop Supplies', value: quote.shopSupplies },
                                { label: 'Subtotal',      value: quote.subtotal },
                                { label: 'Tax',           value: quote.tax },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between text-slate-400">
                                    <span>{label}</span>
                                    <span>${value.toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-lg border-t border-slate-600 pt-2 mt-2 font-bold text-white">
                                <span>Total Due</span>
                                <span>${quote.grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </BaseModal>
    );
};
