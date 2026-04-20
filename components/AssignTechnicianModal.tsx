import React, { useState, useMemo } from 'react';
import { Technician } from '../types.ts';
import { SidePanel } from './SidePanel.tsx';
import { MagnifyingGlassIcon, CheckBadgeIcon } from './icons.tsx';

interface AssignTechnicianModalProps {
    isOpen:              boolean;
    onClose:             () => void;
    technicians:         Technician[];
    assignedIds:         string[];
    onAssign:            (techId: string) => void;
    onUnassign:          (techId: string) => void;
}

const CERT_COLOURS: Record<string, string> = {
    'A&P':      'bg-sky-500/20     text-sky-300     border-sky-500/30',
    'IA':       'bg-purple-500/20  text-purple-300  border-purple-500/30',
    'Avionics': 'bg-amber-500/20   text-amber-300   border-amber-500/30',
};

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
    isOpen, onClose, technicians, assignedIds, onAssign, onUnassign,
}) => {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() =>
        technicians.filter(t =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.certifications.some(c => c.toLowerCase().includes(search.toLowerCase()))
        ),
        [technicians, search]
    );

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

                {/* Tech list */}
                <div className="space-y-2">
                    {filtered.map(tech => {
                        const assigned = assignedIds.includes(tech.id);
                        return (
                            <div key={tech.id}
                                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer
                                    ${assigned
                                        ? 'bg-sky-500/10 border-sky-500/30'
                                        : 'bg-white/3 border-white/10 hover:bg-white/6 hover:border-white/20'
                                    }`}
                                onClick={() => assigned ? onUnassign(tech.id) : onAssign(tech.id)}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-100">{tech.name}</p>
                                        <span className="text-[10px] text-slate-500">{tech.role}</span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {tech.certifications.map(cert => (
                                            <span key={cert}
                                                className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${CERT_COLOURS[cert] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
                                                {cert}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-3">
                                    {assigned ? (
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
                        <p className="text-center text-sm text-slate-500 py-8">No technicians match your search.</p>
                    )}
                </div>
            </div>
        </SidePanel>
    );
};
