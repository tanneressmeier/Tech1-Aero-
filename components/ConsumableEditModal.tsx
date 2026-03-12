import React, { useState, useEffect } from 'react';
// FIX: Corrected import path for types by adding the file extension.
import { InventoryItem } from '../types.ts';
// FIX: Added .tsx extension to component import.
import { XMarkIcon } from './icons.tsx';

interface ConsumableEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    consumable: InventoryItem | null;
    onSave: (consumable: InventoryItem) => void;
}

const EMPTY_CONSUMABLE: Omit<InventoryItem, 'id'> = {
    description: '',
    part_no: '',
    sku: '',
    qty_on_hand: 0,
    qty_reserved: 0,
    reorder_level: 0,
    shelf_location: '',
    procurement_lead_time: 0,
    storage_area: '',
    expiration_date: '',
    unit: '',
    suppliers: [],
};

export const ConsumableEditModal: React.FC<ConsumableEditModalProps> = ({ isOpen, onClose, consumable, onSave }) => {
    const [formData, setFormData] = useState<InventoryItem | Omit<InventoryItem, 'id'>>(EMPTY_CONSUMABLE);

    useEffect(() => {
        if (isOpen && consumable) {
            setFormData(consumable);
        } else {
            setFormData(EMPTY_CONSUMABLE);
        }
    }, [consumable, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

     const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseInt(value, 10);
        setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as InventoryItem);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Edit Consumable</h2>
                                <p className="text-slate-400">Update the details for this item.</p>
                            </div>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-300">Description</label>
                            <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                        </div>
                        <div>
                            <label htmlFor="part_no" className="block text-sm font-medium text-slate-300">Part Number</label>
                            <input type="text" name="part_no" id="part_no" value={formData.part_no || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="qty_on_hand" className="block text-sm font-medium text-slate-300">Quantity In Stock</label>
                                <input type="number" name="qty_on_hand" id="qty_on_hand" value={formData.qty_on_hand} onChange={handleNumberChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                            <div>
                                <label htmlFor="reorder_level" className="block text-sm font-medium text-slate-300">Reorder Level</label>
                                <input type="number" name="reorder_level" id="reorder_level" value={formData.reorder_level} onChange={handleNumberChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="shelf_location" className="block text-sm font-medium text-slate-300">Location</label>
                                <input type="text" name="shelf_location" id="shelf_location" value={formData.shelf_location} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                             <div>
                                <label htmlFor="expiration_date" className="block text-sm font-medium text-slate-300">Expiration Date</label>
                                <input type="text" name="expiration_date" id="expiration_date" value={formData.expiration_date || ''} onChange={handleChange} placeholder="MM/YYYY or On Condition" className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};