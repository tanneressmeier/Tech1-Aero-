import React, { useState, useMemo } from 'react';
import { Tool } from '../types.ts';
import { SidePanel } from './SidePanel.tsx';
import { ExclamationTriangleIcon, CheckBadgeIcon } from './icons.tsx';

interface AssignToolModalProps {
    isOpen: boolean;
    onClose: () => void;
    tools: Tool[];
    onAssignTool: (toolId: string) => void;
}

// Calibration status derived for display
function getCalStatus(tool: Tool): { label: string; color: string; blocked: boolean } {
    if (!tool.calibrationRequired) return { label: 'N/A', color: 'text-slate-500', blocked: false };
    const days = tool.calibrationDueDays ?? (tool.calibrationDueDate
        ? Math.round((new Date(tool.calibrationDueDate).getTime() - Date.now()) / 86400000)
        : undefined);
    if (days === undefined) return { label: 'Unknown', color: 'text-amber-400', blocked: false };
    if (days < 0)  return { label: `Overdue ${Math.abs(days)}d`, color: 'text-red-400 font-semibold', blocked: true };
    if (days < 30) return { label: `Due ${days}d`,              color: 'text-amber-400',              blocked: false };
    return               { label: `OK (${days}d)`,               color: 'text-emerald-400',            blocked: false };
}

export const AssignToolModal: React.FC<AssignToolModalProps> = ({ isOpen, onClose, tools, onAssignTool }) => {
    const [searchTerm,     setSearchTerm]     = useState('');
    const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
    const [showBlocked,    setShowBlocked]     = useState(false);

    const filteredTools = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return tools.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            (t.make ?? '').toLowerCase().includes(q) ||
            (t.description ?? '').toLowerCase().includes(q)
        );
    }, [tools, searchTerm]);

    const selectedTool = tools.find(t => t.id === selectedToolId);
    const selectedCal  = selectedTool ? getCalStatus(selectedTool) : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedToolId) return;
        onAssignTool(selectedToolId);
        setSelectedToolId(null);
        setSearchTerm('');
    };

    if (!isOpen) return null;

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Assign Tool to Squawk"
            size="2xl"
            footer={
                <>
                    <div>
                        {selectedCal?.blocked && (
                            <p className="text-xs text-red-400 flex items-center gap-1">
                                <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                                Calibration overdue — confirm airworthiness before assigning
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose}
                            className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md text-sm">
                            Cancel
                        </button>
                        <button type="submit" form="assign-tool-form" disabled={!selectedToolId}
                            className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md text-sm">
                            Assign Tool
                        </button>
                    </div>
                </>
            }
        >
            <form id="assign-tool-form" onSubmit={handleSubmit} className="flex flex-col h-full gap-3">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by name, ID, or manufacturer…"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    autoFocus
                />

                {/* Legend */}
                <div className="flex items-center gap-4 text-[10px] text-slate-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Cal OK</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Due soon</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Overdue</span>
                    <label className="flex items-center gap-1 cursor-pointer ml-auto">
                        <input type="checkbox" checked={showBlocked} onChange={e => setShowBlocked(e.target.checked)} className="accent-sky-500" />
                        Show overdue
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto -mx-6 border-t border-white/5">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/80 sticky top-0">
                            <tr>
                                <th className="p-2 pl-6 w-8" />
                                <th className="p-2 text-xs text-slate-400 font-semibold">Tool</th>
                                <th className="p-2 text-xs text-slate-400 font-semibold">Make / Model</th>
                                <th className="p-2 text-xs text-slate-400 font-semibold text-right pr-4">Calibration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTools
                                .filter(t => showBlocked || !getCalStatus(t).blocked)
                                .map(tool => {
                                    const cal = getCalStatus(tool);
                                    const isSelected = selectedToolId === tool.id;
                                    return (
                                        <tr key={tool.id}
                                            onClick={() => setSelectedToolId(tool.id)}
                                            className={`cursor-pointer transition-colors ${isSelected ? 'bg-sky-500/10' : 'hover:bg-white/5'} ${cal.blocked ? 'opacity-60' : ''}`}>
                                            <td className="p-2 pl-6">
                                                <input type="radio" name="selectedTool" value={tool.id}
                                                    checked={isSelected}
                                                    onChange={() => setSelectedToolId(tool.id)}
                                                    className="accent-sky-500" />
                                            </td>
                                            <td className="p-2">
                                                <p className="text-slate-100 font-medium text-sm">{tool.name}</p>
                                                <p className="text-slate-500 text-xs font-mono">{tool.id}</p>
                                            </td>
                                            <td className="p-2 text-slate-400 text-xs">
                                                {[tool.make, tool.model].filter(Boolean).join(' · ') || '—'}
                                            </td>
                                            <td className={`p-2 text-xs text-right pr-4 ${cal.color}`}>
                                                {cal.blocked && <ExclamationTriangleIcon className="w-3 h-3 inline mr-1" />}
                                                {cal.label}
                                            </td>
                                        </tr>
                                    );
                                })}
                            {filteredTools.length === 0 && (
                                <tr><td colSpan={4} className="py-8 text-center text-slate-500 text-sm">No tools match your search.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </form>
        </SidePanel>
    );
};

export default AssignToolModal;
