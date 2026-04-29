import React, { useState, useMemo } from 'react';
import { Technician, TimeLog, WorkOrder, RepairOrder, TrainingRequirement } from '../types.ts';
import {
    UsersIcon, ClockIcon, UserPlusIcon, PencilIcon, ExclamationTriangleIcon,
    CheckBadgeIcon, PlusIcon, TrashIcon, CogIcon, ChartBarIcon,
} from './icons.tsx';
import { PageHeader, TabBar, SectionCard, AlertBanner, ActionButton } from './ui.tsx';
import { AddTechnicianModal } from './AddTechnicianModal.tsx';
import { EditTechnicianModal } from './EditTechnicianModal.tsx';
import { HoursChart } from './HoursChart.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { getTrainingExpiryWarnings } from '../utils/skillsEngine.ts';

export interface TechnicianHours {
    technicianId:   string;
    technicianName: string;
    totalHours:     number;
    billableHours:  number;
}

interface PersonnelDashboardProps {
    technicians:           Technician[];
    workOrders:            WorkOrder[];
    repairOrders:          RepairOrder[];
    generalTimeLogs:       TimeLog[];
    activeTimeLogs:        TimeLog[];
    currentUser:           Technician;
    trainingRequirements:  TrainingRequirement[];
    onAddTechnician:       (t: Omit<Technician, 'id' | 'role'>) => void;
    onUpdateTechnician:    (t: Technician) => void;
    onClockIn:             (id: string) => void;
    onClockOut:            (id: string) => void;
    onAddRequirement:      (r: TrainingRequirement) => void;
    onUpdateRequirement:   (r: TrainingRequirement) => void;
    onDeleteRequirement:   (id: string) => void;
}

// ── Status helpers ────────────────────────────────────────────────────────────
type TrainingStatus = 'current' | 'expiring' | 'expired' | 'missing';

function getStatus(tech: Technician, reqId: string, warningDays: number): TrainingStatus {
    const record = tech.training_records?.find(r => r.requirementId === reqId);
    if (!record) return 'missing';
    if (!record.expiryDate) return 'current';
    const days = Math.round((new Date(record.expiryDate).getTime() - Date.now()) / 86400000);
    if (days < 0)            return 'expired';
    if (days <= warningDays) return 'expiring';
    return 'current';
}

const STATUS_CELL: Record<TrainingStatus, { bg: string; text: string; label: string }> = {
    current:  { bg: 'bg-emerald-500/15 border-emerald-500/20', text: 'text-emerald-300', label: '✓' },
    expiring: { bg: 'bg-amber-500/15  border-amber-500/20',   text: 'text-amber-300',   label: '!' },
    expired:  { bg: 'bg-red-500/15    border-red-500/20',     text: 'text-red-300',     label: '✕' },
    missing:  { bg: 'bg-white/3       border-white/8',        text: 'text-slate-600',   label: '—' },
};

function intervalLabel(days: number): string {
    if (days === 0)    return 'One-time';
    if (days === 365)  return 'Annual';
    if (days === 730)  return 'Biennial';
    if (days === 1095) return 'Triennial';
    return `Every ${days}d`;
}

const CATEGORY_COLOURS: Record<TrainingRequirement['category'], string> = {
    Safety:     'bg-red-500/15    text-red-300    border-red-500/25',
    Technical:  'bg-sky-500/15    text-sky-300    border-sky-500/25',
    Regulatory: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    Company:    'bg-slate-500/15  text-slate-300  border-slate-500/20',
};

// ============================================================================
// TAB: Training Matrix
// ============================================================================
const TrainingMatrix: React.FC<{
    technicians:          Technician[];
    trainingRequirements: TrainingRequirement[];
    onEditTech:           (t: Technician) => void;
}> = ({ technicians, trainingRequirements, onEditTech }) => {
    const [categoryFilter, setCategoryFilter] = useState<'all' | TrainingRequirement['category']>('all');
    const [statusFilter,   setStatusFilter]   = useState<'all' | TrainingStatus>('all');

    const visibleReqs = trainingRequirements.filter(r => {
        if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
        return true;
    });

    // Count issues per tech for the status filter
    const techStatus = (tech: Technician) => ({
        expired:  visibleReqs.filter(r => getStatus(tech, r.id, r.warningDays) === 'expired').length,
        expiring: visibleReqs.filter(r => getStatus(tech, r.id, r.warningDays) === 'expiring').length,
        missing:  visibleReqs.filter(r => getStatus(tech, r.id, r.warningDays) === 'missing').length,
    });

    const visibleTechs = technicians.filter(tech => {
        if (statusFilter === 'all') return true;
        const st = techStatus(tech);
        if (statusFilter === 'expired')  return st.expired  > 0;
        if (statusFilter === 'expiring') return st.expiring > 0;
        if (statusFilter === 'missing')  return st.missing  > 0;
        return true;
    });

    return (
        <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500 font-mono">Category:</span>
                {(['all', 'Safety', 'Technical', 'Regulatory', 'Company'] as const).map(c => (
                    <button key={c} onClick={() => setCategoryFilter(c)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            categoryFilter === c
                                ? 'bg-sky-500/15 text-sky-200 border-sky-500/25'
                                : 'text-slate-500 border-white/8 hover:border-white/15'
                        }`}>
                        {c === 'all' ? 'All' : c}
                    </button>
                ))}
                <span className="text-xs text-slate-500 font-mono ml-4">Show:</span>
                {(['all','expired','expiring','missing'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            statusFilter === s ? 'bg-sky-500/15 text-sky-200 border-sky-500/25' : 'text-slate-500 border-white/8 hover:border-white/15'
                        }`}>
                        {s === 'all' ? 'All Techs' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
                {(['current','expiring','expired','missing'] as TrainingStatus[]).map(s => (
                    <span key={s} className="flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded border text-center text-[9px] font-bold flex items-center justify-center ${STATUS_CELL[s].bg} ${STATUS_CELL[s].text}`}>
                            {STATUS_CELL[s].label}
                        </span>
                        <span className="text-slate-500 capitalize">{s}</span>
                    </span>
                ))}
            </div>

            {/* Matrix table — horizontal scroll */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                    <thead>
                        <tr>
                            <th className="text-left px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider sticky left-0 bg-[#0d1220] min-w-[140px]">
                                Technician
                            </th>
                            {visibleReqs.map(r => (
                                <th key={r.id} className="px-2 py-2 min-w-[90px] max-w-[90px]">
                                    <div className="text-center">
                                        <span className={`text-[9px] px-1 py-0.5 rounded border ${CATEGORY_COLOURS[r.category]}`}>
                                            {r.category[0]}
                                        </span>
                                        <p className="text-[10px] text-slate-400 mt-1 leading-tight font-normal" style={{ maxWidth: 86, wordBreak: 'break-word' }}>
                                            {r.name}
                                        </p>
                                        <p className="text-[9px] text-slate-600">{intervalLabel(r.intervalDays)}</p>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {visibleTechs.map(tech => (
                            <tr key={tech.id} className="hover:bg-white/3 transition-colors">
                                <td className="px-3 py-2.5 sticky left-0 bg-[#0d1220]">
                                    <p className="font-medium text-white">{tech.name}</p>
                                    <p className="text-[10px] text-slate-500">{tech.role}</p>
                                </td>
                                {visibleReqs.map(r => {
                                    const status  = getStatus(tech, r.id, r.warningDays);
                                    const record  = tech.training_records?.find(tr => tr.requirementId === r.id);
                                    const sc      = STATUS_CELL[status];
                                    const expDate = record?.expiryDate;
                                    const daysLeft= expDate ? Math.round((new Date(expDate).getTime() - Date.now()) / 86400000) : null;
                                    const tooltip = record
                                        ? `Completed: ${record.completedDate}${expDate ? ` · Expires: ${expDate}` : ''}${daysLeft !== null ? ` (${daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d ago`})` : ''}`
                                        : 'Not completed';
                                    return (
                                        <td key={r.id} className="px-1.5 py-2">
                                            <button
                                                onClick={() => onEditTech(tech)}
                                                title={tooltip}
                                                className={`w-full py-1.5 rounded border text-center text-[10px] font-bold transition-all hover:brightness-125 ${sc.bg} ${sc.text}`}>
                                                {sc.label}
                                                {daysLeft !== null && status !== 'current' && (
                                                    <span className="block text-[8px] font-normal opacity-80">
                                                        {daysLeft >= 0 ? `${daysLeft}d` : `${Math.abs(daysLeft)}d ago`}
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ============================================================================
// TAB: Training Catalog
// ============================================================================
const TrainingCatalog: React.FC<{
    requirements:  TrainingRequirement[];
    technicians:   Technician[];
    onAdd:         (r: TrainingRequirement) => void;
    onUpdate:      (r: TrainingRequirement) => void;
    onDelete:      (id: string) => void;
}> = ({ requirements, technicians, onAdd, onUpdate, onDelete }) => {
    const [editing, setEditing] = useState<TrainingRequirement | null>(null);
    const [isNew,   setIsNew]   = useState(false);

    const blank = (): TrainingRequirement => ({
        id:           `tr-custom-${Date.now()}`,
        name:         '',
        category:     'Safety',
        applicableTo: 'all',
        intervalDays: 365,
        isRequired:   true,
        warningDays:  30,
    });

    const startNew   = () => { setEditing(blank()); setIsNew(true); };
    const startEdit  = (r: TrainingRequirement) => { setEditing({ ...r }); setIsNew(false); };
    const cancelEdit = () => { setEditing(null); setIsNew(false); };

    const save = () => {
        if (!editing || !editing.name.trim()) return;
        isNew ? onAdd(editing) : onUpdate(editing);
        setEditing(null);
    };

    // Compliance summary per requirement
    const complianceSummary = (r: TrainingRequirement) => {
        const applicable = technicians.filter(t => {
            if (r.applicableTo === 'all') return true;
            if (r.applicableTo === 'leads_admins') return t.role !== 'Technician';
            return (r.applicableTo as string[]).includes(t.id);
        });
        const compliant = applicable.filter(t => {
            const s = getStatus(t, r.id, r.warningDays);
            return s === 'current' || s === 'expiring';
        });
        return { total: applicable.length, compliant: compliant.length };
    };

    const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
        <div>
            <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</label>
            {children}
        </div>
    );
    const iCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500";

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">{requirements.length} training types configured</p>
                <ActionButton size="sm" variant="primary" icon={<PlusIcon className="w-3.5 h-3.5" />} onClick={startNew}>
                    Add Training Type
                </ActionButton>
            </div>

            {/* Edit / Add form */}
            {editing && (
                <SectionCard padding="md" className="border-sky-500/25">
                    <h4 className="text-sm font-semibold text-white mb-4">{isNew ? 'New Training Type' : `Edit — ${editing.name}`}</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Training Name *">
                            <input value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)}
                                className={iCls} placeholder="e.g. Forklift Certification" />
                        </Field>
                        <Field label="Category">
                            <select value={editing.category} onChange={e => setEditing(p => p ? { ...p, category: e.target.value as TrainingRequirement['category'] } : p)}
                                className={iCls}>
                                {(['Safety','Technical','Regulatory','Company'] as const).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                        <Field label="Recurrence">
                            <select value={editing.intervalDays}
                                onChange={e => setEditing(p => p ? { ...p, intervalDays: parseInt(e.target.value) } : p)}
                                className={iCls}>
                                <option value={0}>One-time</option>
                                <option value={180}>Semi-annual (180d)</option>
                                <option value={365}>Annual (365d)</option>
                                <option value={730}>Biennial (730d)</option>
                                <option value={1095}>Triennial (1095d)</option>
                            </select>
                        </Field>
                        <Field label="Warning Days Before Expiry">
                            <select value={editing.warningDays}
                                onChange={e => setEditing(p => p ? { ...p, warningDays: parseInt(e.target.value) } : p)}
                                className={iCls}>
                                <option value={14}>14 days</option>
                                <option value={30}>30 days</option>
                                <option value={60}>60 days</option>
                                <option value={90}>90 days</option>
                            </select>
                        </Field>
                        <Field label="Applicable To">
                            <select value={editing.applicableTo as string}
                                onChange={e => setEditing(p => p ? { ...p, applicableTo: e.target.value } : p)}
                                className={iCls}>
                                <option value="all">All Technicians</option>
                                <option value="leads_admins">Leads & Admins Only</option>
                            </select>
                        </Field>
                        <Field label="Default Issuing Authority">
                            <input value={editing.issuedBy ?? ''} onChange={e => setEditing(p => p ? { ...p, issuedBy: e.target.value } : p)}
                                className={iCls} placeholder="FAA, Tech1 Aero, OEM…" />
                        </Field>
                        <div className="col-span-2">
                            <Field label="Description">
                                <textarea value={editing.description ?? ''} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : p)}
                                    rows={2} className={`${iCls} resize-none`} placeholder="Brief description of what this training covers…" />
                            </Field>
                        </div>
                        <div className="col-span-2 flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
                                <input type="checkbox" checked={editing.isRequired}
                                    onChange={e => setEditing(p => p ? { ...p, isRequired: e.target.checked } : p)}
                                    className="accent-sky-500 w-4 h-4" />
                                Required (shows as gap if not completed)
                            </label>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                        <ActionButton size="sm" variant="secondary" onClick={cancelEdit}>Cancel</ActionButton>
                        <ActionButton size="sm" variant="primary" onClick={save} disabled={!editing.name.trim()}>
                            {isNew ? 'Add Training Type' : 'Save Changes'}
                        </ActionButton>
                    </div>
                </SectionCard>
            )}

            {/* Catalog list */}
            <div className="space-y-2">
                {(['Safety','Technical','Regulatory','Company'] as const).map(cat => {
                    const catReqs = requirements.filter(r => r.category === cat);
                    if (!catReqs.length) return null;
                    return (
                        <div key={cat}>
                            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1.5 mt-3">{cat}</p>
                            <div className="space-y-1.5">
                                {catReqs.map(r => {
                                    const { total, compliant } = complianceSummary(r);
                                    const allGood = compliant === total;
                                    return (
                                        <div key={r.id}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                                                !allGood && r.isRequired ? 'bg-amber-500/5 border-amber-500/15' : 'bg-white/3 border-white/8'
                                            }`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-medium text-white">{r.name}</span>
                                                    {r.isRequired && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/20">Required</span>}
                                                    <span className="text-[10px] text-slate-500">{intervalLabel(r.intervalDays)}</span>
                                                    {r.issuedBy && <span className="text-[10px] text-slate-600">· {r.issuedBy}</span>}
                                                </div>
                                                {r.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{r.description}</p>}
                                            </div>
                                            {/* Compliance badge */}
                                            <div className={`text-center flex-shrink-0 min-w-[56px] px-2 py-1 rounded-lg border text-xs font-semibold ${
                                                allGood ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                            }`}>
                                                {compliant}/{total}
                                                <p className="text-[9px] font-normal opacity-70">compliant</p>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0">
                                                <button onClick={() => startEdit(r)}
                                                    className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/8 transition-colors">
                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => onDelete(r.id)}
                                                    className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================================================
// Main component
// ============================================================================
export const PersonnelDashboard: React.FC<PersonnelDashboardProps> = ({
    technicians, generalTimeLogs, activeTimeLogs, currentUser,
    trainingRequirements, onAddTechnician, onUpdateTechnician,
    onClockIn, onClockOut, onAddRequirement, onUpdateRequirement, onDeleteRequirement,
}) => {
    const [tab,              setTab]              = useState<'roster'|'matrix'|'catalog'|'hours'>('roster');
    const [isAddModalOpen,   setIsAddModalOpen]   = useState(false);
    const [editingTech,      setEditingTech]      = useState<Technician | null>(null);
    const permissions = usePermissions(currentUser);
    const activeTechIds = useMemo(() => new Set(activeTimeLogs.map(l => l.technician_id)), [activeTimeLogs]);

    const techHoursData: TechnicianHours[] = useMemo(() => {
        const map: Record<string, { total: number; billable: number }> = {};
        technicians.forEach(t => { map[t.id] = { total: 0, billable: 0 }; });
        generalTimeLogs.forEach(l => {
            if (l.end_time && map[l.technician_id]) {
                const h = (new Date(l.end_time).getTime() - new Date(l.start_time).getTime()) / 3600000;
                map[l.technician_id].total += h;
                if (l.is_billable) map[l.technician_id].billable += h;
            }
        });
        return technicians.map(t => ({ technicianId: t.id, technicianName: t.name, totalHours: map[t.id].total, billableHours: map[t.id].billable }))
            .sort((a, b) => b.totalHours - a.totalHours);
    }, [technicians, generalTimeLogs]);

    // Global training alerts (expired or expiring in 30 days)
    const trainingWarnings = useMemo(() => getTrainingExpiryWarnings(technicians, 30), [technicians]);
    const expiredCount  = trainingWarnings.filter(w => w.isExpired).length;
    const expiringCount = trainingWarnings.filter(w => !w.isExpired).length;

    return (
        <div className="space-y-5 max-w-7xl">
            <PageHeader
                title="Personnel"
                icon={<UsersIcon className="w-5 h-5" />}
                subtitle={`${technicians.length} technicians · ${activeTechIds.size} clocked in`}
                actions={
                    permissions.canAddPersonnel ? (
                        <ActionButton variant="primary" size="sm"
                            icon={<UserPlusIcon className="w-3.5 h-3.5" />}
                            onClick={() => setIsAddModalOpen(true)}>
                            Add Technician
                        </ActionButton>
                    ) : undefined
                }
            />

            {/* Global alerts */}
            {expiredCount > 0 && (
                <AlertBanner severity="critical"
                    title={`${expiredCount} expired training${expiredCount > 1 ? 's' : ''} — immediate recurrent training required`}>
                    {trainingWarnings.filter(w => w.isExpired).slice(0, 4).map((w, i) => (
                        <p key={i} className="text-xs text-red-200/60">{w.techName} — {w.trainingName}</p>
                    ))}
                </AlertBanner>
            )}
            {expiringCount > 0 && (
                <AlertBanner severity="warning"
                    title={`${expiringCount} training${expiringCount > 1 ? 's' : ''} expiring within 30 days`}>
                    {trainingWarnings.filter(w => !w.isExpired).slice(0, 4).map((w, i) => (
                        <p key={i} className="text-xs text-amber-200/60">{w.techName} — {w.trainingName} · {w.daysUntilExpiry}d remaining</p>
                    ))}
                </AlertBanner>
            )}

            <TabBar
                tabs={[
                    { id: 'roster',  label: 'Roster',           icon: <UsersIcon    className="w-3.5 h-3.5" /> },
                    { id: 'matrix',  label: 'Training Matrix',   icon: <CheckBadgeIcon className="w-3.5 h-3.5" />, badge: (expiredCount + expiringCount) || undefined },
                    { id: 'catalog', label: 'Training Catalog',  icon: <CogIcon      className="w-3.5 h-3.5" /> },
                    { id: 'hours',   label: 'Hours',             icon: <ChartBarIcon className="w-3.5 h-3.5" /> },
                ]}
                active={tab}
                onChange={t => setTab(t as typeof tab)}
            />

            {/* ── Roster ── */}
            {tab === 'roster' && (
                <SectionCard padding="none">
                    <table className="min-w-full divide-y divide-white/5 text-left text-sm">
                        <thead className="bg-white/5">
                            <tr>
                                {['Name','Role','Certifications','Efficiency','Status',''].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] font-mono text-slate-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {technicians.map(tech => {
                                const isClockedIn = activeTechIds.has(tech.id);
                                const hrs = techHoursData.find(h => h.technicianId === tech.id);
                                const ratio = (hrs?.totalHours ?? 0) > 0 ? (hrs!.billableHours / hrs!.totalHours) : null;
                                const techWarnings = trainingWarnings.filter(w => w.techName === tech.name);
                                return (
                                    <tr key={tech.id} className="hover:bg-white/3 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                                            {tech.name}
                                            {techWarnings.length > 0 && (
                                                <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                                    {techWarnings.length} training issue{techWarnings.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">{tech.role}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-400">{tech.certifications.join(', ')}</td>
                                        <td className="px-4 py-3 font-mono">
                                            <span className={ratio === null ? 'text-slate-500' : ratio >= 0.75 ? 'text-emerald-400' : ratio >= 0.5 ? 'text-amber-400' : 'text-red-400'}>
                                                {ratio !== null ? `${Math.round(ratio * 100)}%` : '—'}
                                            </span>
                                            <p className="text-[10px] text-slate-600 font-normal">{(hrs?.billableHours ?? 0).toFixed(1)}h / {(hrs?.totalHours ?? 0).toFixed(1)}h</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {isClockedIn
                                                ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20"><ClockIcon className="w-3 h-3" /> Clocked In</span>
                                                : <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400 border border-slate-500/20">Clocked Out</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 justify-end">
                                                {permissions.canAddPersonnel && (
                                                    <button onClick={() => setEditingTech(tech)} className="p-1 text-slate-500 hover:text-white transition-colors" title="Edit">
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {tech.id === currentUser.id && (
                                                    isClockedIn
                                                        ? <button onClick={() => onClockOut(tech.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-1 px-3 rounded-md text-xs transition-all">Clock Out</button>
                                                        : <button onClick={() => onClockIn(tech.id)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-1 px-3 rounded-md text-xs transition-all">Clock In</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </SectionCard>
            )}

            {/* ── Training Matrix ── */}
            {tab === 'matrix' && (
                <TrainingMatrix
                    technicians={technicians}
                    trainingRequirements={trainingRequirements}
                    onEditTech={setEditingTech}
                />
            )}

            {/* ── Training Catalog ── */}
            {tab === 'catalog' && (
                <TrainingCatalog
                    requirements={trainingRequirements}
                    technicians={technicians}
                    onAdd={onAddRequirement}
                    onUpdate={onUpdateRequirement}
                    onDelete={onDeleteRequirement}
                />
            )}

            {/* ── Hours ── */}
            {tab === 'hours' && (
                <div className="space-y-5">
                    <p className="text-xs text-slate-500">Individual technician hours breakdown. Shop-wide efficiency trend is in Analytics → Efficiency.</p>
                    <HoursChart data={techHoursData} />
                </div>
            )}

            <AddTechnicianModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={onAddTechnician} />
            <EditTechnicianModal
                isOpen={!!editingTech}
                onClose={() => setEditingTech(null)}
                technician={editingTech}
                trainingRequirements={trainingRequirements}
                onUpdate={t => { onUpdateTechnician(t); setEditingTech(null); }}
            />
        </div>
    );
};
