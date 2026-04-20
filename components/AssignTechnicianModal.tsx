import React, { useState, useMemo } from 'react';
import { Technician, Squawk } from '../types.ts';
import { SidePanel } from './SidePanel.tsx';
import { MagnifyingGlassIcon, CheckBadgeIcon, ExclamationTriangleIcon, LockClosedIcon } from './icons.tsx';
import { checkAuthorization } from '../utils/skillsEngine.ts';

interface AssignTechnicianModalProps {
    isOpen:       boolean;
    onClose:      () => void;
    technicians:  Technician[];
    assignedIds:  string[];
    squawk?:      Squawk;      // when provided, enables skills-gating
    onAssign:     (techId: string) => void;
    onUnassign:   (techId: string) => void;
}

const CERT_COLOURS: Record<string, string> = {
    'A&P':      'bg-sky-500/20     text-sky-300     border-sky-500/30',
    'IA':       'bg-purple-500/20  text-purple-300  border-purple-500/30',
    'Avionics': 'bg-amber-500/20   text-amber-300   border-amber-500/30',
};

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
    isOpen, onClose, technicians, assignedIds, squawk, onAssign, onUnassign,
}) => {
    const [search, setSearch]         = useState('');
    const [showUnqualified, setShowUnqualified] = useState(false);

    const techsWithAuth = useMemo(() =>
        technicians.map(t => ({
            tech: t,
            auth: squawk ? checkAuthorization(t, squawk) : null,
        })),
        [technicians, squawk]
    );

    const qualified   = techsWithAuth.filter(({ auth }) => !auth || auth.authorized);
    const unqualified = techsWithAuth.filter(({ auth }) => auth && !auth.authorized);

    const filtered = (showUnqualified ? techsWithAuth : qualified).filter(({ tech }) =>
        tech.name.toLowerCase().includes(search.toLowerCase()) ||
        tech.certifications.some(c => c.toLowerCase().includes(search.toLowerCase()))
    );

    const hasRequirements = !!(squawk?.required_certifications?.length || squawk?.required_training?.length);

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Assign Technicians"
            size="lg"
            footer={
                <div className="flex justify-between items-center w-full">
                    <span className="text-xs text-slate-500">
                        {assignedIds.length} technician{assignedIds.length !== 1 ? 's' : ''} assigned
                    </span>
                    <button onClick={onClose}
                        className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors">
                        Done
                    </button>
                </div>
            }>
            <div className="space-y-4">

                {/* Task requirements banner */}
                {hasRequirements && (
                    <div className="px-3 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-1">
                        <p className="text-xs font-semibold text-sky-300">Task requirements</p>
                        <div className="flex flex-wrap gap-1.5">
                            {squawk?.required_certifications?.map(c => (
                                <span key={c} className="text-[10px] px-1.5 py-0.5 rounded border bg-sky-500/20 text-sky-200 border-sky-500/30">
                                    Cert: {c}
                                </span>
                            ))}
                            {squawk?.required_training?.map(t => (
                                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border bg-purple-500/20 text-purple-200 border-purple-500/30">
                                    Training: {t}
                                </span>
                            ))}
                        </div>
                        {unqualified.length > 0 && (
                            <p className="text-[10px] text-amber-400">
                                {unqualified.length} technician{unqualified.length > 1 ? 's' : ''} not qualified for this task
                            </p>
                        )}
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or certification…"
                        autoFocus
                        className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                </div>

                {/* Qualified techs */}
                <div className="space-y-2">
                    {filtered.map(({ tech, auth }) => {
                        const assigned   = assignedIds.includes(tech.id);
                        const blocked    = auth && !auth.authorized;

                        return (
                            <div key={tech.id}
                                onClick={() => {
                                    if (blocked) return;
                                    assigned ? onUnassign(tech.id) : onAssign(tech.id);
                                }}
                                className={`flex items-start justify-between px-4 py-3 rounded-xl border transition-all
                                    ${blocked
                                        ? 'opacity-50 cursor-not-allowed bg-white/2 border-white/5'
                                        : assigned
                                            ? 'bg-sky-500/10 border-sky-500/30 cursor-pointer'
                                            : 'bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/20 cursor-pointer'
                                    }`}>
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-medium text-slate-100">{tech.name}</p>
                                        <span className="text-[10px] text-slate-500">{tech.role}</span>
                                    </div>
                                    {/* Certifications */}
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {tech.certifications.map(cert => (
                                            <span key={cert}
                                                className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${CERT_COLOURS[cert] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
                                                {cert}
                                            </span>
                                        ))}
                                    </div>
                                    {/* Training records */}
                                    {tech.training_records && tech.training_records.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {tech.training_records.map(tr => {
                                                const expired = tr.expiryDate && new Date(tr.expiryDate) < new Date();
                                                return (
                                                    <span key={tr.name}
                                                        className={`text-[10px] px-1.5 py-0.5 rounded border ${expired ? 'bg-red-500/20 text-red-300 border-red-500/30 line-through' : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'}`}>
                                                        {tr.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {/* Auth failure reason */}
                                    {blocked && (
                                        <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                                            <LockClosedIcon className="w-3 h-3" />{auth!.reason}
                                        </p>
                                    )}
                                </div>

                                <div className="flex-shrink-0 ml-3 mt-0.5">
                                    {blocked ? (
                                        <LockClosedIcon className="w-4 h-4 text-red-500/50" />
                                    ) : assigned ? (
                                        <span className="flex items-center gap-1 text-xs text-sky-400 font-medium">
                                            <CheckBadgeIcon className="w-4 h-4" /> Assigned
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-500 hover:text-slate-300">+ Assign</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <p className="text-center text-sm text-slate-500 py-8">
                            No technicians match your search.
                        </p>
                    )}
                </div>

                {/* Show unqualified toggle */}
                {hasRequirements && unqualified.length > 0 && (
                    <button
                        onClick={() => setShowUnqualified(p => !p)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors py-2">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                        {showUnqualified ? 'Hide' : 'Show'} {unqualified.length} unqualified technician{unqualified.length > 1 ? 's' : ''}
                    </button>
                )}
            </div>
        </SidePanel>
    );
};
