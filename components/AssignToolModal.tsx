import React, { useState, useMemo } from 'react';
import { Tool } from '../types.ts';
import { SidePanel } from './SidePanel.tsx';

interface AssignToolModalProps {
    isOpen: boolean;
    onClose: () => void;
    tools: Tool[];
    onAssignTool: (toolId: string) => void;
}

export const AssignToolModal: React.FC<AssignToolModalProps> = ({ isOpen, onClose, tools, onAssignTool }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

    const filteredTools = useMemo(() =>
        tools.filter(tool =>
            tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tool.description.toLowerCase().includes(searchTerm.toLowerCase())
        ), [tools, searchTerm]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedToolId) {
            onAssignTool(selectedToolId);
             setSelectedToolId(null);
             setSearchTerm('');
        }
    };

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Assign Tool"
            size="2xl"
            footer={
                <>
                    <div /> {/* Spacer */}
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" form="assign-tool-form" disabled={!selectedToolId} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md">Assign Tool</button>
                    </div>
                </>
            }
        >
            <form id="assign-tool-form" onSubmit={handleSubmit} className="flex flex-col h-full">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search tools..."
                    className="w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3 text-sm mb-4"
                    autoFocus
                />
                 <div className="flex-1 overflow-y-auto -mx-6">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 sticky top-0">
                            <tr>
                                <th className="p-2 pl-6"></th>
                                <th className="p-2">Tool #</th>
                                <th className="p-2">Description</th>
                                <th className="p-2">Cal. Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTools.map(tool => (
                                <tr key={tool.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                                    <td className="p-2 pl-6"><input type="radio" name="selectedTool" value={tool.id} checked={selectedToolId === tool.id} onChange={() => setSelectedToolId(tool.id)} className="bg-slate-700 border-slate-500 text-indigo-500 focus:ring-indigo-600"/></td>
                                    <td className="p-2">{tool.name}</td>
                                    <td className="p-2">{tool.description}</td>
                                    <td className="p-2">{tool.calibrationDueDate ? new Date(tool.calibrationDueDate).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </form>
        </SidePanel>
    );
};

export default AssignToolModal;
