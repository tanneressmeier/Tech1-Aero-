import React, { useState, useCallback } from 'react';
import { Form8130, InventoryItem, Technician } from '../types.ts';
import { analyze8130Form } from '../services/geminiService.ts';
import { BaseModal } from './BaseModal.tsx';
import { AlertBanner, ActionButton } from './ui.tsx';
import { ArrowUpTrayIcon, ShieldCheckIcon, CheckBadgeIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';

interface ReceivingModalProps {
    isOpen:      boolean;
    onClose:     () => void;
    currentUser: Technician;
    onReceive:   (form: Form8130, newItem: Partial<InventoryItem>) => void;
}

type Step = 'upload' | 'review' | 'inspect' | 'assign' | 'done';

const CONDITION_COLOURS: Record<string, string> = {
    'New':        'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    'Overhauled': 'bg-sky-500/15     text-sky-300     border-sky-500/25',
    'Repaired':   'bg-indigo-500/15  text-indigo-300  border-indigo-500/25',
    'Inspected':  'bg-slate-500/15   text-slate-300   border-slate-500/25',
    'Modified':   'bg-purple-500/15  text-purple-300  border-purple-500/25',
    'Unknown':    'bg-amber-500/15   text-amber-300   border-amber-500/25',
};

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onloadend = () => res((r.result as string).split(',')[1]);
        r.onerror   = rej;
        r.readAsDataURL(blob);
    });
}

export const ReceivingModal: React.FC<ReceivingModalProps> = ({
    isOpen, onClose, currentUser, onReceive,
}) => {
    const { showToast } = useToast();

    const [step,       setStep]       = useState<Step>('upload');
    const [isLoading,  setIsLoading]  = useState(false);
    const [error,      setError]      = useState<string | null>(null);

    // PDF state
    const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
    const [pdfB64,     setPdfB64]     = useState<string | null>(null);
    const [pdfMime,    setPdfMime]    = useState<string>('');

    // Extracted 8130 fields (editable)
    const [fields, setFields] = useState({
        block1_ship_from:   '',
        block2_ship_to:     '',
        block3_wo_number:   '',
        block5_tracking_no: '',
        block6_part_no:     '',
        block6_description: '',
        block7_serial_no:   '',
        block8_eligibility: 'Domestic' as 'Domestic' | 'Export' | 'Unknown',
        block9_quantity:    1,
        block10_batch_lot:  '',
        block11_condition:  'New' as Form8130['block11_condition'],
        block12_remarks:    '',
        block13a_agency:    '',
        block13b_cert_no:   '',
    });

    // Inspector sign-off
    const [inspectorCert, setInspectorCert] = useState('');
    const [inspNotes,     setInspNotes]     = useState('');

    // Bin assignment
    const [shelfLocation, setShelfLocation] = useState('');
    const [storageArea,   setStorageArea]   = useState('');

    // Checklist
    const [checks, setChecks] = useState({
        physicalMatch:   false,
        serialVerified:  false,
        quantityMatch:   false,
        noCorrosion:     false,
        tagReadable:     false,
    });
    const allChecked = Object.values(checks).every(Boolean);

    const reset = () => {
        setStep('upload'); setIsLoading(false); setError(null);
        setPdfDataUrl(null); setPdfB64(null); setPdfMime('');
        setInspectorCert(''); setInspNotes(''); setShelfLocation(''); setStorageArea('');
        setChecks({ physicalMatch: false, serialVerified: false, quantityMatch: false, noCorrosion: false, tagReadable: false });
    };

    const handleClose = () => { reset(); onClose(); };

    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoading(true); setError(null);
        try {
            const b64 = await blobToBase64(file);
            const dataUrl = URL.createObjectURL(file);
            setPdfDataUrl(dataUrl);
            setPdfB64(b64);
            setPdfMime(file.type);
            const extracted = await analyze8130Form(b64, file.type);
            setFields({
                block1_ship_from:   extracted.block1_ship_from   ?? '',
                block2_ship_to:     extracted.block2_ship_to     ?? '',
                block3_wo_number:   extracted.block3_wo_number   ?? '',
                block5_tracking_no: extracted.block5_tracking_no ?? '',
                block6_part_no:     extracted.block6_part_no     ?? '',
                block6_description: extracted.block6_description ?? '',
                block7_serial_no:   extracted.block7_serial_no   ?? '',
                block8_eligibility: extracted.block8_eligibility ?? 'Unknown',
                block9_quantity:    extracted.block9_quantity     ?? 1,
                block10_batch_lot:  extracted.block10_batch_lot  ?? '',
                block11_condition:  extracted.block11_condition  ?? 'Unknown',
                block12_remarks:    extracted.block12_remarks     ?? '',
                block13a_agency:    extracted.block13a_agency    ?? '',
                block13b_cert_no:   extracted.block13b_cert_no   ?? '',
            });
            setStep('review');
        } catch (err: any) {
            setError(err.message ?? 'AI extraction failed. Upload a clearer image.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleRelease = () => {
        if (!allChecked || !inspectorCert.trim() || !shelfLocation.trim()) return;

        const form: Form8130 = {
            id:              `f8130-${Date.now()}`,
            ...fields,
            received_date:   new Date().toISOString(),
            status:          'released',
            pdf_data_url:    pdfDataUrl ?? undefined,
            pdf_mime_type:   pdfMime,
            shelf_location:  shelfLocation,
            release_inspection: {
                inspector_name: currentUser.name,
                cert_number:    inspectorCert.trim(),
                timestamp:      new Date().toISOString(),
                notes:          inspNotes || undefined,
            },
            audit_log: [{
                user:      currentUser.name,
                timestamp: new Date().toISOString(),
                action:    'RECEIVED',
                detail:    `Received via 8130 scan. Inspector cert: ${inspectorCert}`,
            }],
        };

        const newItem: Partial<InventoryItem> = {
            id:              `part-${Date.now()}`,
            part_no:         fields.block6_part_no,
            sku:             fields.block6_part_no,
            description:     fields.block6_description,
            qty_on_hand:     fields.block9_quantity,
            qty_reserved:    0,
            reorder_level:   1,
            shelf_location:  shelfLocation,
            storage_area:    storageArea || 'General',
            procurement_lead_time: 7,
            unit:            'EA',
            suppliers:       [],
            quarantine_status: 'active',
            condition:        fields.block11_condition === 'Unknown' ? undefined : fields.block11_condition,
            form_tracking_no: fields.block5_tracking_no || undefined,
            form_8130_id:     form.id,
            certification: {
                type:     '8130-3',
                verified: true,
                number:   fields.block5_tracking_no || fields.block13b_cert_no || undefined,
            },
        };

        onReceive(form, newItem);
        showToast({ message: `${fields.block6_part_no} received — added to inventory at ${shelfLocation}`, type: 'success' });
        setStep('done');
    };

    const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; mono?: boolean; wide?: boolean }> =
        ({ label, value, onChange, mono, wide }) => (
            <div className={wide ? 'col-span-2' : ''}>
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</label>
                <input value={value} onChange={e => onChange(e.target.value)}
                    className={`w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 ${mono ? 'font-mono' : ''}`} />
            </div>
        );

    return (
        <BaseModal isOpen={isOpen} onClose={handleClose} title="Receive Parts — 8130-3 Ingestion"
            size="3xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <div className="flex gap-1.5">
                        {(['upload','review','inspect','assign'] as Step[]).map((s, i) => (
                            <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
                                step === s ? 'bg-sky-400' : ['review','inspect','assign','done'].indexOf(step) > i ? 'bg-emerald-400' : 'bg-white/10'
                            }`} />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {step === 'review' && (
                            <ActionButton onClick={() => setStep('inspect')} variant="primary">
                                Proceed to Inspection →
                            </ActionButton>
                        )}
                        {step === 'inspect' && (
                            <ActionButton onClick={() => setStep('assign')} variant="primary" disabled={!allChecked}>
                                Proceed to Bin Assignment →
                            </ActionButton>
                        )}
                        {step === 'assign' && (
                            <ActionButton
                                onClick={handleRelease}
                                variant="primary"
                                disabled={!allChecked || !inspectorCert.trim() || !shelfLocation.trim()}>
                                Release to Stock ✓
                            </ActionButton>
                        )}
                        {step === 'done' && (
                            <ActionButton onClick={handleClose} variant="primary">Done</ActionButton>
                        )}
                    </div>
                </div>
            }>

            {/* ── Step: Upload ── */}
            {step === 'upload' && (
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">Upload a scan of the FAA 8130-3 Authorized Release Certificate. Gemini AI will extract all form fields for your review.</p>
                    {error && <AlertBanner severity="critical" title={error} compact />}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                            <p className="text-sm text-slate-400">Analyzing 8130-3 with Gemini AI…</p>
                            <p className="text-xs text-slate-600">Extracting all 13 blocks</p>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-52 border-2 border-white/10 border-dashed rounded-xl cursor-pointer bg-white/3 hover:bg-white/5 transition-colors">
                            <ArrowUpTrayIcon className="w-8 h-8 mb-3 text-slate-500" />
                            <p className="text-sm text-slate-400"><span className="font-semibold text-sky-400">Click to upload</span> or drag & drop</p>
                            <p className="text-xs text-slate-600 mt-1">PDF, PNG, JPG — FAA 8130-3 forms</p>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                        </label>
                    )}
                </div>
            )}

            {/* ── Step: Review ── */}
            {step === 'review' && (
                <div className="flex gap-5 h-[60vh]">
                    {/* Left: editable fields */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        <AlertBanner severity="info" title="Review and correct the AI-extracted fields before inspection." compact />
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Part Number *"   value={fields.block6_part_no}     onChange={v => setFields(p=>({...p, block6_part_no: v}))}     mono />
                            <Field label="Description *"   value={fields.block6_description} onChange={v => setFields(p=>({...p, block6_description: v}))} />
                            <Field label="Form Tracking #" value={fields.block5_tracking_no} onChange={v => setFields(p=>({...p, block5_tracking_no: v}))} mono />
                            <Field label="Serial / Batch"  value={fields.block7_serial_no}   onChange={v => setFields(p=>({...p, block7_serial_no: v}))}   mono />
                            <div>
                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Quantity *</label>
                                <input type="number" min={1} value={fields.block9_quantity}
                                    onChange={e => setFields(p=>({...p, block9_quantity: parseInt(e.target.value)||1}))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Condition (Block 11) *</label>
                                <select value={fields.block11_condition}
                                    onChange={e => setFields(p=>({...p, block11_condition: e.target.value as any}))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500">
                                    {['New','Overhauled','Repaired','Inspected','Modified','Unknown'].map(c=>(
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <Field label="Ship From"        value={fields.block1_ship_from}   onChange={v => setFields(p=>({...p, block1_ship_from: v}))}   wide />
                            <Field label="Certifying Agency" value={fields.block13a_agency}   onChange={v => setFields(p=>({...p, block13a_agency: v}))}     />
                            <Field label="Cert Number"       value={fields.block13b_cert_no}  onChange={v => setFields(p=>({...p, block13b_cert_no: v}))}    mono />
                            <Field label="Remarks (Block 12 — life limits, TSN, TSO)" value={fields.block12_remarks} onChange={v => setFields(p=>({...p, block12_remarks: v}))} wide />
                        </div>
                        {/* Condition badge preview */}
                        <div className="flex items-center gap-2 pt-2">
                            <span className="text-xs text-slate-500">Condition preview:</span>
                            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${CONDITION_COLOURS[fields.block11_condition] ?? CONDITION_COLOURS.Unknown}`}>
                                {fields.block11_condition}
                            </span>
                        </div>
                    </div>
                    {/* Right: original PDF */}
                    <div className="w-72 flex-shrink-0 flex flex-col">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Original Document</p>
                        {pdfDataUrl ? (
                            <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden border border-white/10">
                                {pdfMime === 'application/pdf' ? (
                                    <iframe src={pdfDataUrl} className="w-full h-full" title="8130-3 PDF" />
                                ) : (
                                    <img src={pdfDataUrl} alt="8130-3 scan" className="w-full h-full object-contain" />
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 bg-white/3 rounded-xl border border-white/8 flex items-center justify-center text-slate-600 text-xs">
                                No document
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Step: Inspect ── */}
            {step === 'inspect' && (
                <div className="space-y-5">
                    <AlertBanner severity="warning" title="Physical inspection required before release to stock." compact />
                    <div className="grid grid-cols-1 gap-2.5">
                        {[
                            { key: 'physicalMatch',  label: 'Physical part matches Part Number on 8130-3' },
                            { key: 'serialVerified', label: 'Serial/Batch Number is legible and matches form' },
                            { key: 'quantityMatch',  label: 'Physical quantity matches Block 9 quantity' },
                            { key: 'noCorrosion',    label: 'No visible corrosion, damage, or improper storage' },
                            { key: 'tagReadable',    label: '8130-3 form is signed, dated, and stamp is legible' },
                        ].map(({ key, label }) => (
                            <label key={key}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    checks[key as keyof typeof checks]
                                        ? 'bg-emerald-500/8 border-emerald-500/20'
                                        : 'bg-white/3 border-white/8 hover:border-white/15'
                                }`}>
                                <input type="checkbox"
                                    checked={checks[key as keyof typeof checks]}
                                    onChange={e => setChecks(p => ({ ...p, [key]: e.target.checked }))}
                                    className="w-4 h-4 accent-emerald-500 flex-shrink-0" />
                                <span className={`text-sm ${checks[key as keyof typeof checks] ? 'text-emerald-200' : 'text-slate-300'}`}>{label}</span>
                                {checks[key as keyof typeof checks] && <CheckBadgeIcon className="w-4 h-4 text-emerald-400 ml-auto flex-shrink-0" />}
                            </label>
                        ))}
                    </div>
                    {allChecked && <AlertBanner severity="success" title="All inspection checks passed — proceed to bin assignment." compact />}
                </div>
            )}

            {/* ── Step: Assign ── */}
            {step === 'assign' && (
                <div className="space-y-5">
                    <div className="p-4 bg-white/3 border border-white/8 rounded-xl space-y-1 text-sm">
                        <p className="font-semibold text-white">{fields.block6_part_no}</p>
                        <p className="text-slate-400">{fields.block6_description}</p>
                        <p className="text-slate-500 font-mono text-xs">{fields.block9_quantity} × {fields.block11_condition}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Bin Location * (e.g. BJC01A02)</label>
                            <input value={shelfLocation} onChange={e => setShelfLocation(e.target.value.toUpperCase())}
                                placeholder="BJC01A02"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Storage Area</label>
                            <input value={storageArea} onChange={e => setStorageArea(e.target.value)}
                                placeholder="Hardware, Hydraulic, etc."
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 space-y-3">
                        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheckIcon className="w-3.5 h-3.5" /> Inspector Electronic Sign-Off
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Inspector: {currentUser.name}</label>
                                <input value={inspectorCert} onChange={e => setInspectorCert(e.target.value)}
                                    placeholder="A&P or IA cert number"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-sky-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Notes (optional)</label>
                                <input value={inspNotes} onChange={e => setInspNotes(e.target.value)}
                                    placeholder="Any discrepancy notes…"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step: Done ── */}
            {step === 'done' && (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                    <CheckBadgeIcon className="w-14 h-14 text-emerald-400" />
                    <div>
                        <p className="text-lg font-semibold text-white">Part Received Successfully</p>
                        <p className="text-sm text-slate-400 mt-1">{fields.block6_part_no} — {fields.block6_description}</p>
                        <p className="text-sm text-slate-400">{fields.block9_quantity} units assigned to bin <span className="font-mono text-sky-300">{shelfLocation}</span></p>
                    </div>
                    <p className="text-xs text-slate-600">8130-3 archived · Inspector: {currentUser.name} ({inspectorCert})</p>
                </div>
            )}
        </BaseModal>
    );
};
