import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types.ts';
import { SidePanel } from './SidePanel.tsx';

interface AssignPartModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventory: InventoryItem[];
    onAssignPart: (partId: string, quantity: number) => void;
}

export const AssignPartModal: React.FC<AssignPartModalProps> = ({ isOpen, onClose, inventory, onAssignPart }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);

    const filteredInventory = useMemo(() => 
        inventory.filter(item => 
            item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.part_no.toLowerCase().includes(searchTerm.toLowerCase())
        ), [inventory, searchTerm]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPartId && quantity > 0) {
            onAssignPart(selectedPartId, quantity);
            // Reset for next time
            setSelectedPartId(null);
            setQuantity(1);
            setSearchTerm('');
        }
    };

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Assign Part / Consumable"
            size="2xl"
            footer={
                <>
                    <div className="flex items-center gap-2">
                         <label htmlFor="quantity" className="text-sm font-medium text-slate-300">Quantity:</label>
                         <input type="number" id="quantity" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" className="bg-slate-900 border-slate-600 rounded-md w-24 py-2 px-3 text-sm"/>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" form="assign-part-form" disabled={!selectedPartId} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md">Assign Part</button>
                    </div>
                </>
            }
        >
            <form id="assign-part-form" onSubmit={handleSubmit} className="flex flex-col h-full">
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search inventory..."
                    className="w-full bg-slate-900 border-slate-600 rounded-md py-2 px-3 text-sm mb-4"
                    autoFocus
                />
                <div className="flex-1 overflow-y-auto -mx-6">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 sticky top-0">
                            <tr>
                                <th className="p-2 pl-6"></th>
                                <th className="p-2">Part #</th>
                                <th className="p-2">Description</th>
                                <th className="p-2 text-center">Available</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map(item => (
                                <tr key={item.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                                    <td className="p-2 pl-6"><input type="radio" name="selectedPart" value={item.id} checked={selectedPartId === item.id} onChange={() => setSelectedPartId(item.id)} className="bg-slate-700 border-slate-500 text-indigo-500 focus:ring-indigo-600" /></td>
                                    <td className="p-2">{item.part_no}</td>
                                    <td className="p-2">{item.description}</td>
                                    <td className="p-2 text-center">{item.qty_on_hand - item.qty_reserved}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </form>
        </SidePanel>
    );
};

export default AssignPartModal;
