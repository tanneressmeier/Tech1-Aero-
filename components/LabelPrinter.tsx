// =============================================================================
// LabelPrinter.tsx — Bin Label Designer & Batch Printer
//
// Label design matches industry standard (ref: Elevate MRO style):
//   • Company name header
//   • Part Number (large bold)
//   • Description
//   • Location / Bin ID
//   • Optional: Condition, Qty, Serial #
//
// Batch mode: select N parts → preview all → one print dialog, multiple
// labels arranged on the page (2 per row, 4 per page by default).
// Labels can be individually edited before printing.
// =============================================================================

import React, { useState, useCallback } from 'react';
import { InventoryItem, Form8130 } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';
import { ActionButton, SectionCard } from './ui.tsx';
import { PrinterIcon, PencilIcon, CheckIcon, PlusIcon, TrashIcon } from './icons.tsx';
import { useSettings } from '../contexts/SettingsContext.tsx';

interface LabelPrinterProps {
    isOpen:      boolean;
    onClose:     () => void;
    parts:       InventoryItem[];
    forms:       Form8130[];
    selectedIds: string[];
}

// ── Label data model ──────────────────────────────────────────────────────────
interface LabelData {
    id:          string;   // ties back to InventoryItem.id or 'manual-N'
    partNumber:  string;
    description: string;
    location:    string;
    condition?:  string;
    qty?:        string;
    serial?:     string;
    isEditing:   boolean;
}

function partToLabel(part: InventoryItem): LabelData {
    return {
        id:          part.id,
        partNumber:  part.part_no,
        description: part.description,
        location:    part.shelf_location,
        condition:   part.condition,
        qty:         `${part.qty_on_hand} ${part.unit}`.trim(),
        serial:      undefined,
        isEditing:   false,
    };
}

// ── Single label preview (HTML-rendered to exactly match the reference style) ─
const LabelPreview: React.FC<{
    label:    LabelData;
    orgName:  string;
    showExtra: boolean;
    onEdit?:  (id: string, field: keyof LabelData, value: string) => void;
    editable?: boolean;
}> = ({ label, orgName, showExtra, onEdit, editable = false }) => {

    const Field: React.FC<{
        label: string;
        value: string;
        field: keyof LabelData;
        large?: boolean;
        mono?:  boolean;
    }> = ({ label: fieldLabel, value, field, large, mono }) => (
        <div className="label-field">
            <div className="label-field-name">{fieldLabel}</div>
            {editable && onEdit ? (
                <input
                    value={value}
                    onChange={e => onEdit(label.id, field, e.target.value)}
                    className={`label-edit-input ${large ? 'label-edit-large' : ''} ${mono ? 'font-mono' : ''}`}
                />
            ) : (
                <div className={`label-field-value ${large ? 'label-value-large' : ''} ${mono ? 'font-mono' : ''}`}>
                    {value || <span className="label-empty">—</span>}
                </div>
            )}
        </div>
    );

    return (
        <div className="label-card">
            {/* Header */}
            <div className="label-header">
                <span className="label-company">{orgName.toUpperCase()}</span>
            </div>
            <div className="label-divider" />

            <Field label="Part Number" value={label.partNumber} field="partNumber" large mono />
            <div className="label-divider" />

            <Field label="Description"  value={label.description} field="description" />
            <div className="label-divider" />

            <Field label="Location"     value={label.location}    field="location" large mono />

            {showExtra && (label.condition || label.qty || label.serial) && (
                <>
                    <div className="label-divider" />
                    <div className="label-row">
                        {label.condition && (
                            <div className="label-field label-field-sm">
                                <div className="label-field-name">Condition</div>
                                <div className="label-field-value">{label.condition}</div>
                            </div>
                        )}
                        {label.qty && (
                            <div className="label-field label-field-sm">
                                <div className="label-field-name">Qty</div>
                                <div className="label-field-value">{label.qty}</div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// ── Label CSS (injected into print window and preview) ────────────────────────
const LABEL_CSS = `
    .label-card {
        width: 3.8in;
        min-height: 2.2in;
        background: #ffffff;
        border: 1.5px solid #222;
        border-radius: 4px;
        font-family: 'Arial', sans-serif;
        page-break-inside: avoid;
        break-inside: avoid;
        padding: 0;
        overflow: hidden;
        box-sizing: border-box;
    }
    .label-header {
        background: #111;
        padding: 6px 10px;
        text-align: center;
    }
    .label-company {
        color: #ffffff;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.18em;
    }
    .label-divider {
        height: 1px;
        background: #ccc;
    }
    .label-field {
        padding: 5px 10px 4px 10px;
    }
    .label-field-sm {
        flex: 1;
    }
    .label-row {
        display: flex;
        padding: 0;
    }
    .label-row .label-field {
        flex: 1;
        border-right: 1px solid #eee;
    }
    .label-row .label-field:last-child {
        border-right: none;
    }
    .label-field-name {
        font-size: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #666;
        margin-bottom: 2px;
    }
    .label-field-value {
        font-size: 13px;
        font-weight: 600;
        color: #111;
        line-height: 1.2;
    }
    .label-value-large {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0.02em;
    }
    .label-empty { color: #ccc; }
    .label-edit-input {
        border: 1px solid #ddd;
        border-radius: 3px;
        padding: 2px 5px;
        font-size: 13px;
        font-weight: 600;
        width: 100%;
        box-sizing: border-box;
        color: #111;
    }
    .label-edit-large {
        font-size: 18px;
        font-weight: 800;
    }
`;

const PRINT_PAGE_CSS = `
    @page { margin: 0.35in; size: letter; }
    body   { margin: 0; padding: 0; background: #fff; }
    .labels-grid {
        display: grid;
        grid-template-columns: repeat(2, 3.8in);
        gap: 0.2in;
        align-items: start;
    }
    @media print {
        .no-print { display: none !important; }
    }
`;

// ── Main component ────────────────────────────────────────────────────────────
export const LabelPrinter: React.FC<LabelPrinterProps> = ({
    isOpen, onClose, parts, forms, selectedIds,
}) => {
    const { settings } = useSettings();
    const orgName = settings.organization?.name ?? 'Tech1 Aero';

    const [labels, setLabels]     = useState<LabelData[]>([]);
    const [showExtra, setShowExtra] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Initialise labels from selected parts whenever modal opens
    React.useEffect(() => {
        if (isOpen) {
            const initial = parts
                .filter(p => selectedIds.includes(p.id))
                .map(partToLabel);
            // Allow duplicates for batch printing (user may want multiple copies)
            setLabels(initial);
            setEditingId(null);
        }
    }, [isOpen, selectedIds, parts]);

    const updateField = useCallback((id: string, field: keyof LabelData, value: string) => {
        setLabels(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    }, []);

    const removeLabel = (id: string) => {
        setLabels(prev => prev.filter(l => l.id !== id));
    };

    const duplicateLabel = (id: string) => {
        setLabels(prev => {
            const idx   = prev.findIndex(l => l.id === id);
            const copy  = { ...prev[idx], id: `${id}-copy-${Date.now()}` };
            const next  = [...prev];
            next.splice(idx + 1, 0, copy);
            return next;
        });
    };

    const addBlank = () => {
        setLabels(prev => [...prev, {
            id:          `manual-${Date.now()}`,
            partNumber:  '',
            description: '',
            location:    '',
            isEditing:   true,
        }]);
        setEditingId(`manual-${Date.now()}`);
    };

    // ── Build and open print window ────────────────────────────────────────
    const handlePrint = () => {
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;

        // Render all labels as HTML
        const labelsHtml = labels.map(l => `
            <div class="label-card">
                <div class="label-header">
                    <span class="label-company">${orgName.toUpperCase()}</span>
                </div>
                <div class="label-divider"></div>
                <div class="label-field">
                    <div class="label-field-name">Part Number</div>
                    <div class="label-field-value label-value-large" style="font-family:monospace">${l.partNumber || '—'}</div>
                </div>
                <div class="label-divider"></div>
                <div class="label-field">
                    <div class="label-field-name">Description</div>
                    <div class="label-field-value">${l.description || '—'}</div>
                </div>
                <div class="label-divider"></div>
                <div class="label-field">
                    <div class="label-field-name">Location</div>
                    <div class="label-field-value label-value-large" style="font-family:monospace">${l.location || '—'}</div>
                </div>
                ${showExtra && (l.condition || l.qty) ? `
                <div class="label-divider"></div>
                <div class="label-row">
                    ${l.condition ? `<div class="label-field label-field-sm"><div class="label-field-name">Condition</div><div class="label-field-value">${l.condition}</div></div>` : ''}
                    ${l.qty      ? `<div class="label-field label-field-sm"><div class="label-field-name">Qty</div><div class="label-field-value">${l.qty}</div></div>` : ''}
                </div>` : ''}
            </div>
        `).join('');

        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${orgName} — Part Labels (${labels.length})</title>
                <style>
                    ${LABEL_CSS}
                    ${PRINT_PAGE_CSS}
                </style>
            </head>
            <body>
                <div class="no-print" style="padding:12px 16px; background:#f5f5f5; border-bottom:1px solid #ddd; display:flex; align-items:center; gap:16px; font-family:Arial,sans-serif; font-size:13px;">
                    <strong>${labels.length} label${labels.length !== 1 ? 's' : ''}</strong>
                    <button onclick="window.print()" style="padding:7px 20px; background:#0284c7; color:#fff; border:none; border-radius:5px; cursor:pointer; font-size:13px; font-weight:600;">
                        🖨 Print Labels
                    </button>
                    <span style="color:#666;">2 per row · letter paper · Avery 5163 compatible</span>
                    <button onclick="window.close()" style="margin-left:auto; padding:6px 14px; background:#eee; border:1px solid #ccc; border-radius:5px; cursor:pointer; font-size:13px;">Close</button>
                </div>
                <div style="padding:0.35in;">
                    <div class="labels-grid">
                        ${labelsHtml}
                    </div>
                </div>
            </body>
            </html>
        `);
        win.document.close();
    };

    if (!isOpen) return null;

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Print Labels${labels.length > 0 ? ` — ${labels.length} label${labels.length !== 1 ? 's' : ''}` : ''}`}
            size="3xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                            <input type="checkbox" checked={showExtra} onChange={e => setShowExtra(e.target.checked)}
                                className="accent-sky-500 cursor-pointer" />
                            Show Condition &amp; Qty
                        </label>
                        <button onClick={addBlank}
                            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors">
                            <PlusIcon className="w-3.5 h-3.5" /> Add Blank Label
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <ActionButton onClick={onClose} variant="secondary">Cancel</ActionButton>
                        <ActionButton
                            onClick={handlePrint}
                            variant="primary"
                            disabled={labels.length === 0}
                            icon={<PrinterIcon className="w-3.5 h-3.5" />}>
                            Print {labels.length > 0 ? `${labels.length} Label${labels.length !== 1 ? 's' : ''}` : ''}
                        </ActionButton>
                    </div>
                </div>
            }
        >
            {/* Injected preview styles */}
            <style>{LABEL_CSS.replace(/input/g, 'NOOP')}</style>
            <style>{`
                .label-card { border-color: #374151 !important; }
                .label-header { background: #111827 !important; }
                .label-divider { background: #374151 !important; }
                .label-field-name { color: #9ca3af !important; }
                .label-field-value { color: #f9fafb !important; }
                .label-edit-input { background: rgba(255,255,255,0.07); color: #f9fafb !important; border-color: #374151 !important; }
                .label-empty { color: #4b5563 !important; }
            `}</style>

            <div className="space-y-4">
                {/* Info bar */}
                <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
                    <span>Click a label to edit its fields. Duplicate for multiple copies.</span>
                    <span className="ml-auto font-mono">{labels.length} label{labels.length !== 1 ? 's' : ''} · 2 per row · letter paper</span>
                </div>

                {labels.length === 0 ? (
                    <SectionCard padding="lg">
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                            <PrinterIcon className="w-8 h-8 text-slate-700" />
                            <p className="text-sm text-slate-500">No labels to print.</p>
                            <button onClick={addBlank}
                                className="text-xs text-sky-400 hover:text-sky-300 underline transition-colors">
                                Add a blank label
                            </button>
                        </div>
                    </SectionCard>
                ) : (
                    // Preview grid — 2 columns matching print layout
                    <div className="grid grid-cols-2 gap-4">
                        {labels.map(label => (
                            <div key={label.id} className="relative group">
                                {/* Action overlay */}
                                <div className="absolute top-1.5 right-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setEditingId(editingId === label.id ? null : label.id)}
                                        className={`p-1 rounded text-xs transition-colors ${editingId === label.id ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                        title={editingId === label.id ? 'Done editing' : 'Edit label'}>
                                        {editingId === label.id ? <CheckIcon className="w-3 h-3" /> : <PencilIcon className="w-3 h-3" />}
                                    </button>
                                    <button
                                        onClick={() => duplicateLabel(label.id)}
                                        className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                                        title="Duplicate (print multiple copies)">
                                        <PlusIcon className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => removeLabel(label.id)}
                                        className="p-1 rounded bg-slate-700 text-red-400 hover:bg-red-500/20 transition-colors"
                                        title="Remove from print queue">
                                        <TrashIcon className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Label preview */}
                                <LabelPreview
                                    label={label}
                                    orgName={orgName}
                                    showExtra={showExtra}
                                    editable={editingId === label.id}
                                    onEdit={updateField}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </BaseModal>
    );
};
