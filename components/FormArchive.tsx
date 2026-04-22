import React, { useState, useMemo } from 'react';
import { Form8130, CheckoutRecord, InventoryItem } from '../types.ts';
import { SectionCard, AlertBanner, StatusBadge, ActionButton } from './ui.tsx';
import { MagnifyingGlassIcon, ShieldCheckIcon, DocumentTextIcon } from './icons.tsx';

interface FormArchiveProps {
    forms:    Form8130[];
    checkouts: CheckoutRecord[];
    parts:    InventoryItem[];
    onUpdate: (form: Form8130) => void;
}

const STATUS_STYLE = {
    quarantined: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    released:    'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    consumed:    'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

const CONDITION_STYLE: Record<string, string> = {
    'New':        'text-emerald-300',
    'Overhauled': 'text-sky-300',
    'Repaired':   'text-indigo-300',
    'Inspected':  'text-slate-300',
    'Modified':   'text-purple-300',
    'Unknown':    'text-amber-300',
};

export const FormArchive: React.FC<FormArchiveProps> = ({
    forms, checkouts, parts, onUpdate,
}) => {
    const [search,      setSearch]      = useState('');
    const [statusFilter,setStatusFilter]= useState<'all' | Form8130['status']>('all');
    const [selected,    setSelected]    = useState<Form8130 | null>(null);
    const [editMode,    setEditMode]    = useState(false);
    const [draft,       setDraft]       = useState<Form8130 | null>(null);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return forms.filter(f => {
            if (statusFilter !== 'all' && f.status !== statusFilter) return false;
            if (!q) return true;
            return (
                f.block6_part_no.toLowerCase().includes(q) ||
                f.block6_description.toLowerCase().includes(q) ||
                (f.block5_tracking_no ?? '').toLowerCase().includes(q) ||
                (f.block7_serial_no   ?? '').toLowerCase().includes(q)
            );
        }).sort((a,b) => new Date(b.received_date).getTime() - new Date(a.received_date).getTime());
    }, [forms, search, statusFilter]);

    const openForm = (f: Form8130) => {
        setSelected(f);
        setDraft({ ...f });
        setEditMode(false);
    };

    const saveEdit = () => {
        if (!draft) return;
        onUpdate({
            ...draft,
            audit_log: [
                ...draft.audit_log,
                { user: 'Current User', timestamp: new Date().toISOString(), action: 'EDITED', detail: 'Fields updated via Form Archive' },
            ],
        });
        setSelected(draft);
        setEditMode(false);
    };

    const formCheckouts = selected ? checkouts.filter(c => c.form_8130_id === selected.id) : [];

    const EditField: React.FC<{ label: string; field: keyof Form8130; mono?: boolean }> = ({ label, field, mono }) => {
        if (!draft) return null;
        const val = draft[field] as string ?? '';
        return (
            <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                {editMode ? (
                    <input value={val} onChange={e => setDraft(p => p ? { ...p, [field]: e.target.value } : p)}
                        className={`w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-sky-500 ${mono ? 'font-mono' : ''}`} />
                ) : (
                    <p className={`text-sm ${val ? (mono ? 'font-mono text-slate-200' : 'text-slate-200') : 'text-slate-600 italic'}`}>
                        {val || 'Not recorded'}
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="flex gap-5 h-full min-h-[500px]">
            {/* Left: form list */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-3">
                {/* Filters */}
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search P/N, serial, tracking #…"
                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {(['all','quarantined','released','consumed'] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                                statusFilter === s
                                    ? 'bg-sky-500/15 text-sky-200 border-sky-500/25'
                                    : 'text-slate-500 border-white/8 hover:border-white/15'
                            }`}>
                            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
                {/* Form list */}
                <div className="flex-1 overflow-y-auto space-y-1.5">
                    {filtered.length === 0 ? (
                        <p className="text-xs text-slate-600 text-center py-8 italic">No forms match filters</p>
                    ) : filtered.map(f => (
                        <button key={f.id} onClick={() => openForm(f)}
                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                                selected?.id === f.id
                                    ? 'bg-sky-500/10 border-sky-500/25'
                                    : 'bg-white/3 border-white/8 hover:border-white/15'
                            }`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-mono font-semibold text-sky-300 truncate">{f.block6_part_no}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{f.block6_description}</p>
                                    <p className="text-[10px] text-slate-600 font-mono">{new Date(f.received_date).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${STATUS_STYLE[f.status]}`}>
                                    {f.status}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-slate-600 text-center">{filtered.length} of {forms.length} forms</p>
            </div>

            {/* Right: form detail / viewer */}
            {selected && draft ? (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="text-lg font-semibold text-white font-mono">{selected.block6_part_no}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_STYLE[selected.status]}`}>
                                    {selected.status}
                                </span>
                                {selected.block11_condition !== 'Unknown' && (
                                    <span className={`text-xs font-medium ${CONDITION_STYLE[selected.block11_condition] ?? 'text-slate-300'}`}>
                                        {selected.block11_condition}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5">{selected.block6_description}</p>
                        </div>
                        <div className="flex gap-2">
                            {editMode ? (
                                <>
                                    <ActionButton size="sm" variant="danger" onClick={() => { setEditMode(false); setDraft({...selected}); }}>Cancel</ActionButton>
                                    <ActionButton size="sm" variant="primary" onClick={saveEdit}>Save Changes</ActionButton>
                                </>
                            ) : (
                                <ActionButton size="sm" icon={<DocumentTextIcon className="w-3.5 h-3.5" />} onClick={() => setEditMode(true)}>
                                    Edit
                                </ActionButton>
                            )}
                        </div>
                    </div>

                    {editMode && <AlertBanner severity="warning" title="You are editing a compliance document. All changes are logged." compact />}

                    {/* Two-column fields */}
                    <SectionCard padding="md">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <EditField label="Form Tracking #" field="block5_tracking_no" mono />
                            <EditField label="Serial / Batch"  field="block7_serial_no"   mono />
                            <EditField label="Quantity"        field="block9_quantity"     mono />
                            <EditField label="Eligibility"     field="block8_eligibility"  />
                            <EditField label="Certifying Agency" field="block13a_agency"   />
                            <EditField label="Cert Number"     field="block13b_cert_no"    mono />
                            <EditField label="Ship From"       field="block1_ship_from"    />
                            <EditField label="W/O Number"      field="block3_wo_number"    mono />
                            <div className="col-span-2">
                                <EditField label="Remarks / Life Limits (Block 12)" field="block12_remarks" />
                            </div>
                        </div>
                    </SectionCard>

                    {/* Inspector release */}
                    {selected.release_inspection && (
                        <SectionCard padding="md">
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" /> Inspection Release
                            </p>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-[10px] text-slate-500">Inspector</p>
                                    <p className="text-slate-200">{selected.release_inspection.inspector_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500">Cert Number</p>
                                    <p className="text-slate-200 font-mono">{selected.release_inspection.cert_number}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500">Released</p>
                                    <p className="text-slate-200">{new Date(selected.release_inspection.timestamp).toLocaleString()}</p>
                                </div>
                                {selected.release_inspection.notes && (
                                    <div className="col-span-3">
                                        <p className="text-[10px] text-slate-500">Notes</p>
                                        <p className="text-slate-300 text-xs">{selected.release_inspection.notes}</p>
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    )}

                    {/* Checkout history */}
                    {formCheckouts.length > 0 && (
                        <SectionCard padding="md">
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-3">Checkout History</p>
                            <div className="divide-y divide-white/5">
                                {formCheckouts.map(c => (
                                    <div key={c.id} className="py-2 flex items-center justify-between text-sm">
                                        <div>
                                            <p className="text-slate-300 font-mono">{c.work_order_id} · Squawk {c.squawk_id.split('-').pop()}</p>
                                            <p className="text-xs text-slate-500">{new Date(c.timestamp).toLocaleDateString()} · {c.qty_checked_out} unit{c.qty_checked_out>1?'s':''}</p>
                                        </div>
                                        <p className="text-xs text-slate-500 font-mono">{c.bin_id}</p>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>
                    )}

                    {/* Audit log */}
                    <SectionCard padding="sm">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Audit Log</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selected.audit_log.map((entry, i) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                                    <span className="text-slate-500 font-mono">{entry.action}</span>
                                    <span className="text-slate-400">{entry.user}</span>
                                    <span className="text-slate-600">{new Date(entry.timestamp).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    {/* Embedded PDF viewer */}
                    {selected.pdf_data_url && (
                        <SectionCard padding="none">
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider p-3 pb-2">Original Document</p>
                            <div className="h-80 bg-slate-900">
                                {selected.pdf_mime_type === 'application/pdf' ? (
                                    <iframe src={selected.pdf_data_url} className="w-full h-full" title="8130-3" />
                                ) : (
                                    <img src={selected.pdf_data_url} alt="8130-3" className="w-full h-full object-contain" />
                                )}
                            </div>
                        </SectionCard>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
                    Select a form from the list to view details
                </div>
            )}
        </div>
    );
};
