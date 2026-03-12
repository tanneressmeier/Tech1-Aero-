import React, { useState, useEffect } from 'react';
// FIX: Corrected import path for types by adding the file extension.
import { Tool } from '../types.ts';
// FIX: Added .tsx extension to component import.
import { XMarkIcon } from './icons.tsx';

interface ToolEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    tool: Omit<Tool, 'id'> | Tool | null;
    onSave: (tool: Omit<Tool, 'id'> | Tool) => void;
    onDelete: (toolId: string) => void;
}

export const ToolEditModal: React.FC<ToolEditModalProps> = ({ isOpen, onClose, tool, onSave, onDelete }) => {
    const [formData, setFormData] = useState<Omit<Tool, 'id'> | Tool>({
        name: '',
        description: '',
        details: '',
        make: '',
        model: '',
        serial: '',
        calibrationRequired: false,
        calibrationDueDate: '',
        vendorPrices: { bhd: 0, continental: 0 },
        ...tool,
    });

    useEffect(() => {
        setFormData({
            name: '',
            description: '',
            details: '',
            make: '',
            model: '',
            serial: '',
            calibrationRequired: false,
            calibrationDueDate: '',
            vendorPrices: { bhd: 0, continental: 0 },
            ...tool
        });
    }, [tool, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePriceChange = (vendor: 'bhd' | 'continental', value: string) => {
        const price = parseFloat(value);
        setFormData(prev => ({
            ...prev,
            vendorPrices: { ...prev.vendorPrices, [vendor]: isNaN(price) ? undefined : price }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const isEditMode = tool && 'id' in tool;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{isEditMode ? 'Edit Tool' : 'Add New Tool'}</h2>
                                <p className="text-slate-400">Enter the details for the tool below.</p>
                            </div>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="name" className="block text-sm font-medium text-slate-300">Tool Name / Description</label>
                                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                            </div>
                            <div>
                                <label htmlFor="make" className="block text-sm font-medium text-slate-300">Make</label>
                                <input type="text" name="make" id="make" value={formData.make || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                            <div>
                                <label htmlFor="model" className="block text-sm font-medium text-slate-300">Model</label>
                                <input type="text" name="model" id="model" value={formData.model || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="serial" className="block text-sm font-medium text-slate-300">Serial Number</label>
                                <input type="text" name="serial" id="serial" value={formData.serial || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                            <div className="md:col-span-2 flex items-center gap-4 pt-2">
                                <input id="calibrationRequired" name="calibrationRequired" type="checkbox" checked={formData.calibrationRequired} onChange={handleChange} className="h-4 w-4 text-indigo-600 border-slate-500 rounded focus:ring-indigo-500" />
                                <label htmlFor="calibrationRequired" className="text-sm text-slate-300">Calibration Required</label>
                            </div>
                            {formData.calibrationRequired && (
                                <div className="md:col-span-2">
                                    <label htmlFor="calibrationDueDate" className="block text-sm font-medium text-slate-300">Calibration Due Date</label>
                                    <input type="date" name="calibrationDueDate" id="calibrationDueDate" value={formData.calibrationDueDate?.split('T')[0] || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                            )}
                            <div>
                                <label htmlFor="bhd" className="block text-sm font-medium text-slate-300">BHD Price ($)</label>
                                <input type="number" name="bhd" id="bhd" value={formData.vendorPrices.bhd || ''} onChange={(e) => handlePriceChange('bhd', e.target.value)} step="0.01" className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                            <div>
                                <label htmlFor="continental" className="block text-sm font-medium text-slate-300">Continental Price ($)</label>
                                <input type="number" name="continental" id="continental" value={formData.vendorPrices.continental || ''} onChange={(e) => handlePriceChange('continental', e.target.value)} step="0.01" className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-900/50 rounded-b-2xl flex justify-between items-center">
                        <div>
                            {isEditMode && (
                                <button
                                    type="button"
                                    onClick={() => onDelete((tool as Tool).id)}
                                    className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-md transition-colors"
                                >
                                    Delete Tool
                                </button>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                Save Tool
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};