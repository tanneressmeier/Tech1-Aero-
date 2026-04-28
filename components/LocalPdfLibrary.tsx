// =============================================================================
// LocalPdfLibrary.tsx
// Auto-discovers all PDFs in public/8130s/ and presents them as a master
// library with inline viewing, AI extraction, and Form8130 linking.
//
// HOW IT WORKS:
//   import.meta.glob scans /public/8130s/*.pdf at build time and generates
//   a map of { path → url } for every PDF in the folder.
//   Dropping a PDF into public/8130s/ and refreshing the browser is all
//   a user needs to do — no upload, no config.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { Form8130, Technician } from '../types.ts';
import { analyze8130Form } from '../services/geminiService.ts';
import { AlertBanner, ActionButton, SectionCard } from './ui.tsx';
import {
    DocumentTextIcon, SparklesIcon, CheckBadgeIcon,
    MagnifyingGlassIcon, ArrowUpTrayIcon, FolderOpenIcon,
} from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';

// ── Auto-discover PDFs via Vite glob ─────────────────────────────────────────
// This map is built at startup. Adding a file to public/8130s/ and refreshing
// the browser adds it here automatically.
const PDF_GLOB = import.meta.glob('/public/8130s/*.pdf', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>;

// Convert glob paths to clean filenames and URLs
// Vite serves /public/* at root, so strip the /public prefix from the URL
function buildPdfCatalog(): { filename: string; url: string }[] {
    return Object.entries(PDF_GLOB).map(([path, url]) => ({
        filename: path.split('/').pop() ?? path,
        // Strip leading /public so the URL resolves to /8130s/file.pdf
        url: (url as string).replace(/^\/public\//, '/'),
    })).sort((a, b) => a.filename.localeCompare(b.filename));
}

// ── Link status ───────────────────────────────────────────────────────────────
type LinkStatus = 'linked' | 'unlinked' | 'processing';

interface PdfEntry {
    filename:  string;
    url:       string;
    status:    LinkStatus;
    form?:     Form8130;
}

interface LocalPdfLibraryProps {
    forms:       Form8130[];
    currentUser: Technician;
    onNewForm:   (form: Form8130) => void;
    onUpdateForm:(form: Form8130) => void;
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<LinkStatus, string> = {
    linked:     'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    unlinked:   'bg-amber-500/15   text-amber-300   border-amber-500/25',
    processing: 'bg-sky-500/15     text-sky-300     border-sky-500/25',
};

export const LocalPdfLibrary: React.FC<LocalPdfLibraryProps> = ({
    forms, currentUser, onNewForm, onUpdateForm,
}) => {
    const { showToast } = useToast();
    const [search,      setSearch]      = useState('');
    const [selected,    setSelected]    = useState<PdfEntry | null>(null);
    const [processing,  setProcessing]  = useState<Set<string>>(new Set());
    const [editingLink, setEditingLink] = useState<string | null>(null); // filename → link to existing form
    const catalog = useMemo(() => buildPdfCatalog(), []);

    // Build enriched entries — match PDFs to Form8130 records by pdf_data_url or filename hints
    const entries: PdfEntry[] = useMemo(() => {
        return catalog.map(({ filename, url }) => {
            // Try to find a matching form by filename or url
            const matchedForm = forms.find(f =>
                f.pdf_data_url === url ||
                (f.pdf_data_url && f.pdf_data_url.includes(filename.replace('.pdf', ''))) ||
                (f.block5_tracking_no && filename.includes(f.block5_tracking_no)) ||
                (f.block6_part_no     && filename.includes(f.block6_part_no))
            );
            const isProcessing = processing.has(filename);
            return {
                filename,
                url,
                status: isProcessing ? 'processing' : matchedForm ? 'linked' : 'unlinked',
                form: matchedForm,
            };
        });
    }, [catalog, forms, processing]);

    const filtered = useMemo(() => {
        if (!search.trim()) return entries;
        const q = search.toLowerCase();
        return entries.filter(e =>
            e.filename.toLowerCase().includes(q) ||
            (e.form?.block6_part_no ?? '').toLowerCase().includes(q) ||
            (e.form?.block6_description ?? '').toLowerCase().includes(q)
        );
    }, [entries, search]);

    const linkedCount   = entries.filter(e => e.status === 'linked').length;
    const unlinkedCount = entries.filter(e => e.status === 'unlinked').length;

    // ── AI scan a PDF ─────────────────────────────────────────────────────────
    const handleAIScan = async (entry: PdfEntry) => {
        setProcessing(prev => new Set(prev).add(entry.filename));
        try {
            // Fetch the PDF as base64
            const resp = await fetch(entry.url);
            const blob = await resp.blob();
            const b64  = await new Promise<string>((res, rej) => {
                const r = new FileReader();
                r.onloadend = () => res((r.result as string).split(',')[1]);
                r.onerror   = rej;
                r.readAsDataURL(blob);
            });

            const extracted = await analyze8130Form(b64, 'application/pdf');

            const newForm: Form8130 = {
                id:               `f8130-local-${Date.now()}`,
                block1_ship_from:  extracted.block1_ship_from,
                block2_ship_to:    extracted.block2_ship_to,
                block3_wo_number:  extracted.block3_wo_number,
                block5_tracking_no:extracted.block5_tracking_no,
                block6_part_no:    extracted.block6_part_no   || entry.filename.replace('.pdf',''),
                block6_description:extracted.block6_description || 'Extracted from local PDF',
                block7_serial_no:  extracted.block7_serial_no,
                block8_eligibility:extracted.block8_eligibility,
                block9_quantity:   extracted.block9_quantity   || 1,
                block10_batch_lot: extracted.block10_batch_lot,
                block11_condition: extracted.block11_condition || 'Unknown',
                block12_remarks:   extracted.block12_remarks,
                block13a_agency:   extracted.block13a_agency,
                block13b_cert_no:  extracted.block13b_cert_no,
                received_date:     new Date().toISOString(),
                status:            'released',
                pdf_data_url:      entry.url,  // store the local URL
                pdf_mime_type:     'application/pdf',
                audit_log: [{
                    user:      currentUser.name,
                    timestamp: new Date().toISOString(),
                    action:    'AI_SCAN',
                    detail:    `Extracted from local file: ${entry.filename}`,
                }],
            };
            onNewForm(newForm);
            showToast({ message: `AI extracted: ${newForm.block6_part_no}`, type: 'success' });
        } catch (err: any) {
            showToast({ message: `AI scan failed: ${err.message}`, type: 'error' });
        } finally {
            setProcessing(prev => { const n = new Set(prev); n.delete(entry.filename); return n; });
        }
    };

    // ── Print handler ─────────────────────────────────────────────────────────
    const handlePrint = (entry: PdfEntry) => {
        const win = window.open(entry.url, '_blank');
        if (win) {
            win.onload = () => win.print();
        }
    };

    return (
        <div className="space-y-5">
            {/* Header + stats */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <FolderOpenIcon className="w-4 h-4 text-sky-400" />
                        Local PDF Library
                        <span className="text-xs font-normal text-slate-500 font-mono">public/8130s/</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        {catalog.length} PDF{catalog.length !== 1 ? 's' : ''} found · {linkedCount} linked · {unlinkedCount} unlinked
                    </p>
                </div>
                {unlinkedCount > 0 && (
                    <AlertBanner severity="info"
                        title={`${unlinkedCount} PDF${unlinkedCount > 1 ? 's' : ''} not yet linked — run AI Scan to extract form data`}
                        compact />
                )}
            </div>

            {/* How to add */}
            <div className="flex items-start gap-3 px-4 py-3 bg-white/3 border border-white/8 rounded-xl text-xs text-slate-500">
                <FolderOpenIcon className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                    <span className="font-semibold text-slate-400">To add a form:</span>
                    {' '}Drop any PDF scan into <span className="font-mono text-sky-400">Tech1-Aero-/public/8130s/</span> and refresh the browser.
                    {' '}It appears here automatically. Naming tip: use the Form Tracking Number as the filename (e.g. <span className="font-mono">FAA-2024-12345.pdf</span>).
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by filename, part number, description…"
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500" />
            </div>

            {catalog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <FolderOpenIcon className="w-10 h-10 text-slate-700" />
                    <p className="text-sm text-slate-500">No PDFs found in <span className="font-mono text-sky-400">public/8130s/</span></p>
                    <p className="text-xs text-slate-600">Drop your scanned 8130-3 files into that folder and refresh the browser.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Left: file list */}
                    <div className="space-y-1.5">
                        {filtered.map(entry => (
                            <button key={entry.filename}
                                onClick={() => setSelected(entry)}
                                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                                    selected?.filename === entry.filename
                                        ? 'bg-sky-500/10 border-sky-500/25'
                                        : 'bg-white/3 border-white/8 hover:border-white/15'
                                }`}>
                                <DocumentTextIcon className={`w-5 h-5 flex-shrink-0 ${
                                    entry.status === 'linked' ? 'text-emerald-400' : 'text-amber-400'
                                }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-mono text-slate-200 truncate">{entry.filename}</p>
                                    {entry.form ? (
                                        <p className="text-[10px] text-slate-500 truncate">
                                            {entry.form.block6_part_no} — {entry.form.block6_description}
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-slate-600 italic">Not yet scanned</p>
                                    )}
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${STATUS_STYLE[entry.status]}`}>
                                    {entry.status === 'processing' ? 'Scanning…' : entry.status}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Right: viewer + actions */}
                    {selected ? (
                        <div className="flex flex-col gap-3">
                            {/* Action bar */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-mono text-white flex-1 truncate">{selected.filename}</p>
                                <ActionButton size="sm" variant="secondary"
                                    onClick={() => handlePrint(selected)}
                                    icon={<ArrowUpTrayIcon className="w-3.5 h-3.5 rotate-180" />}>
                                    Print
                                </ActionButton>
                                {selected.status === 'unlinked' && (
                                    <ActionButton size="sm" variant="primary"
                                        onClick={() => handleAIScan(selected)}
                                        icon={<SparklesIcon className="w-3.5 h-3.5" />}>
                                        AI Scan
                                    </ActionButton>
                                )}
                                {selected.status === 'linked' && selected.form && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                                        <CheckBadgeIcon className="w-3.5 h-3.5" />
                                        Linked to {selected.form.block6_part_no}
                                    </span>
                                )}
                            </div>

                            {/* Extracted data summary if linked */}
                            {selected.form && (
                                <SectionCard padding="sm">
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        {[
                                            ['Part #',     selected.form.block6_part_no],
                                            ['Description',selected.form.block6_description],
                                            ['Tracking #', selected.form.block5_tracking_no ?? '—'],
                                            ['Condition',  selected.form.block11_condition],
                                            ['Quantity',   String(selected.form.block9_quantity)],
                                            ['Agency',     selected.form.block13a_agency ?? '—'],
                                        ].map(([label, val]) => (
                                            <div key={label}>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                                                <p className="text-slate-200 font-medium">{val}</p>
                                            </div>
                                        ))}
                                    </div>
                                </SectionCard>
                            )}

                            {/* PDF viewer */}
                            <div className="flex-1 bg-slate-900 rounded-xl border border-white/10 overflow-hidden" style={{ minHeight: 400 }}>
                                <iframe
                                    src={`${selected.url}#toolbar=1&navpanes=0`}
                                    className="w-full h-full"
                                    style={{ minHeight: 400 }}
                                    title={selected.filename}
                                />
                            </div>

                            <p className="text-[10px] text-slate-600 text-center">
                                Can't see the PDF? <a href={selected.url} target="_blank" rel="noopener noreferrer"
                                    className="text-sky-400 hover:text-sky-300 underline">Open in new tab ↗</a>
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-600 text-sm">
                            <DocumentTextIcon className="w-8 h-8 mb-2" />
                            Select a PDF to preview
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
