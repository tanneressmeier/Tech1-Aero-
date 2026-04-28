// =============================================================================
// LabelPrinter.tsx — Bin Label Designer & Batch Printer
// Matches Elevate MRO reference style.
// All fields are always editable inline.
// Batch print via hidden iframe — no popup blocker.
// =============================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { InventoryItem, Form8130 } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';
import { ActionButton } from './ui.tsx';
import { PrinterIcon, PencilIcon, PlusIcon, TrashIcon } from './icons.tsx';
import { useSettings } from '../contexts/SettingsContext.tsx';

// ── Embedded ELEVATE MRO logo ─────────────────────────────────────────────────
// Replace LOGO_DATA_URL with a new base64 string to update the logo
const LOGO_DATA_URL = "data:image/png;base64,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";

interface LabelPrinterProps {
    isOpen:      boolean;
    onClose:     () => void;
    parts:       InventoryItem[];
    forms:       Form8130[];
    selectedIds: string[];
}

interface LabelData {
    id:          string;
    partNumber:  string;
    description: string;
    location:    string;
    condition:   string;
    qty:         string;
}

function partToLabel(part: InventoryItem): LabelData {
    return {
        id:          part.id,
        partNumber:  part.part_no        || '',
        description: part.description    || '',
        location:    part.shelf_location || '',
        condition:   part.condition      || '',
        qty:         part.qty_on_hand != null ? `${part.qty_on_hand} ${part.unit || 'EA'}`.trim() : '',
    };
}

// ── Shared label CSS for preview + print ─────────────────────────────────────
const LABEL_CSS = `
.label-card {
    width: 3.8in; min-height: 2.1in;
    background: #fff; border: 1.5px solid #222; border-radius: 4px;
    font-family: Arial, sans-serif; page-break-inside: avoid; break-inside: avoid;
    overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column;
}
.label-header { background: #fff; padding: 0; overflow: hidden; }
.label-header img { width: 100%; height: auto; display: block; object-fit: contain; max-height: 64px; }
.label-divider { height: 1px; background: #bbb; flex-shrink: 0; }
.label-field { padding: 4px 10px; }
.label-field-name { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #555; margin-bottom: 1px; }
.label-value { font-size: 13px; font-weight: 600; color: #111; line-height: 1.2; }
.label-value-large { font-size: 20px; font-weight: 900; letter-spacing: 0.02em; font-family: monospace; }
.label-row { display: flex; }
.label-row .label-field { flex: 1; border-right: 1px solid #e0e0e0; }
.label-row .label-field:last-child { border-right: none; }
`;

const PRINT_PAGE_CSS = `
@page { margin: 0.3in; size: letter; }
body { margin: 0; padding: 0; background: #fff; }
.labels-grid { display: grid; grid-template-columns: repeat(2, 3.8in); gap: 0.18in; }
`;

// ── Single editable label preview ────────────────────────────────────────────
const LabelCard: React.FC<{
    label:     LabelData;
    orgName:   string;
    showExtra: boolean;
    onChange:  (id: string, field: keyof LabelData, val: string) => void;
    onDuplicate: (id: string) => void;
    onRemove:    (id: string) => void;
}> = ({ label, orgName, showExtra, onChange, onDuplicate, onRemove }) => {

    const inputCls = "w-full bg-transparent border-0 border-b border-slate-300 focus:border-sky-400 focus:outline-none text-[#111] py-0.5 text-sm";
    const inputLargeCls = `${inputCls} font-mono text-xl font-black`;

    return (
        <div className="relative bg-white border-2 border-slate-300 rounded overflow-hidden shadow-sm"
            style={{ fontFamily: 'Arial, sans-serif', minHeight: '2.1in', width: '100%' }}>

            {/* Header logo */}
            <div className="bg-white border-b border-slate-200">
                <img src={LOGO_DATA_URL} alt="ELEVATE MRO"
                    className="w-full object-contain" style={{ maxHeight: 64 }} />
            </div>
            <div className="h-px bg-slate-300" />

            {/* Part Number */}
            <div className="px-2.5 py-1">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Part Number</p>
                <input
                    value={label.partNumber}
                    onChange={e => onChange(label.id, 'partNumber', e.target.value)}
                    placeholder="e.g. MS29513-222"
                    className={inputLargeCls}
                />
            </div>
            <div className="h-px bg-slate-300" />

            {/* Description */}
            <div className="px-2.5 py-1">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Description</p>
                <input
                    value={label.description}
                    onChange={e => onChange(label.id, 'description', e.target.value)}
                    placeholder="Part description"
                    className={inputCls}
                />
            </div>
            <div className="h-px bg-slate-300" />

            {/* Location */}
            <div className="px-2.5 py-1">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Location</p>
                <input
                    value={label.location}
                    onChange={e => onChange(label.id, 'location', e.target.value.toUpperCase())}
                    placeholder="e.g. BJC01A02"
                    className={inputLargeCls}
                />
            </div>

            {/* Optional condition + qty */}
            {showExtra && (
                <>
                    <div className="h-px bg-slate-300" />
                    <div className="flex">
                        <div className="flex-1 px-2.5 py-1 border-r border-slate-200">
                            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Condition</p>
                            <input value={label.condition}
                                onChange={e => onChange(label.id, 'condition', e.target.value)}
                                placeholder="New / OH"
                                className={inputCls}
                            />
                        </div>
                        <div className="flex-1 px-2.5 py-1">
                            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Qty</p>
                            <input value={label.qty}
                                onChange={e => onChange(label.id, 'qty', e.target.value)}
                                placeholder="24 EA"
                                className={inputCls}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Card toolbar */}
            <div className="absolute top-1 right-1 flex gap-1">
                <button onClick={() => onDuplicate(label.id)}
                    className="w-5 h-5 rounded bg-slate-100 hover:bg-sky-100 text-slate-500 hover:text-sky-600 flex items-center justify-center transition-colors"
                    title="Duplicate label">
                    <PlusIcon className="w-3 h-3" />
                </button>
                <button onClick={() => onRemove(label.id)}
                    className="w-5 h-5 rounded bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors"
                    title="Remove">
                    <TrashIcon className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
export const LabelPrinter: React.FC<LabelPrinterProps> = ({
    isOpen, onClose, parts, forms, selectedIds,
}) => {
    const { settings } = useSettings();
    const orgName = settings.organization?.name ?? 'Tech1 Aero';

    const [labels,    setLabels]    = useState<LabelData[]>([]);
    const [showExtra, setShowExtra] = useState(true);
    const printFrameRef = useRef<HTMLIFrameElement>(null);

    // Initialise / refresh labels whenever modal opens or parts/selectedIds change
    useEffect(() => {
        if (!isOpen) return;
        if (selectedIds.length === 0) { setLabels([]); return; }

        const matched = parts.filter(p => selectedIds.includes(p.id));
        if (matched.length > 0) {
            setLabels(matched.map(partToLabel));
            return;
        }
        // Part may not be in props yet (just added) — set placeholders with IDs
        // so user sees the modal and can fill in manually; auto-updates when part arrives
        setLabels(selectedIds.map(id => ({
            id, partNumber: '', description: '', location: '', condition: '', qty: '',
        })));
    }, [isOpen, selectedIds, parts]);

    const updateField = useCallback((id: string, field: keyof LabelData, val: string) => {
        setLabels(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
    }, []);

    const duplicateLabel = (id: string) => setLabels(prev => {
        const idx  = prev.findIndex(l => l.id === id);
        const copy = { ...prev[idx], id: `${id}-copy-${Date.now()}` };
        const next = [...prev];
        next.splice(idx + 1, 0, copy);
        return next;
    });

    const removeLabel = (id: string) => setLabels(prev => prev.filter(l => l.id !== id));

    const addBlank = () => setLabels(prev => [...prev, {
        id: `manual-${Date.now()}`, partNumber: '', description: '', location: '', condition: '', qty: '',
    }]);

    // ── Print via hidden iframe ───────────────────────────────────────────────
    const handlePrint = () => {
        const labelsHtml = labels.map(l => `
            <div class="label-card">
                <div class="label-header"><img src="${LOGO_DATA_URL}" alt="ELEVATE MRO" /></div>
                <div class="label-divider"></div>
                <div class="label-field">
                    <div class="label-field-name">Part Number</div>
                    <div class="label-value label-value-large">${l.partNumber || '—'}</div>
                </div>
                <div class="label-divider"></div>
                <div class="label-field">
                    <div class="label-field-name">Description</div>
                    <div class="label-value">${l.description || '—'}</div>
                </div>
                <div class="label-divider"></div>
                <div class="label-field">
                    <div class="label-field-name">Location</div>
                    <div class="label-value label-value-large">${l.location || '—'}</div>
                </div>
                ${showExtra && (l.condition || l.qty) ? `
                <div class="label-divider"></div>
                <div class="label-row">
                    ${l.condition ? `<div class="label-field"><div class="label-field-name">Condition</div><div class="label-value">${l.condition}</div></div>` : ''}
                    ${l.qty       ? `<div class="label-field"><div class="label-field-name">Qty</div><div class="label-value">${l.qty}</div></div>` : ''}
                </div>` : ''}
            </div>
        `).join('');

        const html = `<!DOCTYPE html><html><head><title>${orgName} — Labels</title>
            <style>${LABEL_CSS}${PRINT_PAGE_CSS}</style>
        </head><body><div class="labels-grid">${labelsHtml}</div></body></html>`;

        const frame = printFrameRef.current;
        if (!frame) return;
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (!doc) return;
        doc.open(); doc.write(html); doc.close();
        setTimeout(() => frame.contentWindow?.print(), 500);
    };

    if (!isOpen) return null;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose}
            title={`Print Labels${labels.length > 0 ? ` — ${labels.length}` : ''}`}
            size="3xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                            <input type="checkbox" checked={showExtra} onChange={e => setShowExtra(e.target.checked)}
                                className="accent-sky-500" />
                            Show Condition &amp; Qty
                        </label>
                        <button onClick={addBlank}
                            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                            <PlusIcon className="w-3.5 h-3.5" /> Add blank label
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose}
                            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <ActionButton onClick={handlePrint} variant="primary" disabled={labels.length === 0}
                            icon={<PrinterIcon className="w-3.5 h-3.5" />}>
                            Print {labels.length > 0 ? `${labels.length} Label${labels.length !== 1 ? 's' : ''}` : ''}
                        </ActionButton>
                    </div>
                </div>
            }>

            <iframe ref={printFrameRef} title="print-frame"
                style={{ display: 'none', position: 'absolute', width: 0, height: 0 }} />

            <div className="space-y-4">
                <p className="text-xs text-slate-500">
                    All fields are editable — click any field to update before printing.
                    Use <span className="font-mono bg-white/5 px-1 rounded">+</span> to duplicate a label for multiple bins.
                </p>

                {labels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-600">
                        <PrinterIcon className="w-8 h-8 mb-1" />
                        <p className="text-sm">No labels queued.</p>
                        <button onClick={addBlank} className="text-xs text-sky-400 hover:text-sky-300 underline transition-colors">
                            Add a blank label
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {labels.map(label => (
                            <LabelCard key={label.id}
                                label={label}
                                orgName={orgName}
                                showExtra={showExtra}
                                onChange={updateField}
                                onDuplicate={duplicateLabel}
                                onRemove={removeLabel}
                            />
                        ))}
                    </div>
                )}
            </div>
        </BaseModal>
    );
};
