
import React, { useState, useEffect } from 'react';
import { InventoryItem, PartCertification } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';
import { XMarkIcon, PaperClipIcon, ShieldCheckIcon, DocumentTextIcon, CheckBadgeIcon } from './icons.tsx';

interface PartEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    part: InventoryItem | null;
    onSave: (part: InventoryItem) => void;
}

const EMPTY_PART: Omit<InventoryItem, 'id'> = {
    description: '',
    part_no: '',
    sku: '',
    qty_on_hand: 0,
    qty_reserved: 0,
    reorder_level: 0,
    shelf_location: '',
    procurement_lead_time: 0,
    storage_area: '',
    unit: '',
    suppliers: [],
    certification: {
        type: 'None',
        verified: false,
    }
};

export const PartEditModal: React.FC<PartEditModalProps> = ({ isOpen, onClose, part, onSave }) => {
    const [formData, setFormData] = useState<InventoryItem | Omit<InventoryItem, 'id'>>(EMPTY_PART);

    useEffect(() => {
        if (isOpen && part) {
            setFormData(part);
        } else {
            setFormData(EMPTY_PART);
        }
    }, [part, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseInt(value, 10);
        setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    };

    const handleCertChange = (field: keyof PartCertification, value: any) => {
        setFormData(prev => ({
            ...prev,
            certification: {
                ...prev.certification,
                type: prev.certification?.type || 'None',
                verified: prev.certification?.verified || false,
                [field]: value
            }
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Simulate file upload by creating a local URL
            const fakeUrl = URL.createObjectURL(file);
            setFormData(prev => ({
                ...prev,
                certification: {
                    ...prev.certification,
                    type: prev.certification?.type || '8130-3', // Default to 8130 on upload if none selected
                    verified: true, // Auto-verify on upload (can be unchecked)
                    mediaName: file.name,
                    mediaUrl: fakeUrl
                }
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as InventoryItem);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Aircraft Part"
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="edit-part-form" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Save Changes
                    </button>
                </>
            }
        >
            <form id="edit-part-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info Section */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">General Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="part_no" className="block text-sm font-medium text-slate-300">Part Number</label>
                            <input type="text" name="part_no" id="part_no" value={formData.part_no || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                        </div>
                        <div>
                            <label htmlFor="qty_on_hand" className="block text-sm font-medium text-slate-300">Quantity On Hand</label>
                            <input type="number" name="qty_on_hand" id="qty_on_hand" value={formData.qty_on_hand} onChange={handleNumberChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="description" className="block text-sm font-medium text-slate-300">Description</label>
                            <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                        </div>
                        <div>
                            <label htmlFor="shelf_location" className="block text-sm font-medium text-slate-300">Shelf Location</label>
                            <input type="text" name="shelf_location" id="shelf_location" value={formData.shelf_location || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label htmlFor="storage_area" className="block text-sm font-medium text-slate-300">Storage Area</label>
                            <input type="text" name="storage_area" id="storage_area" value={formData.storage_area || ''} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div className="sm:col-span-3">
                            <label htmlFor="expected_delivery_date" className="block text-sm font-medium text-slate-300">
                                Expected Delivery Date
                                <span className="ml-1 text-xs text-amber-400 font-normal">(set if on backorder — drives Gantt cascade)</span>
                            </label>
                            <input type="date" name="expected_delivery_date" id="expected_delivery_date"
                                value={(formData as any).expected_delivery_date || ''}
                                onChange={handleChange}
                                className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            <p className="text-xs text-slate-500 mt-1">Leave blank if in stock. When set and qty available &lt; required, the Gantt chart will automatically shift dependent tasks to start after this date.</p>
                        </div>
                    </div>
                </div>

                {/* Certification Section */}
                <div className="bg-slate-900/50 p-4 rounded-lg border border-indigo-500/30">
                    <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                        <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
                        Airworthiness Certification
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="cert_type" className="block text-sm font-medium text-slate-300">Certification Type</label>
                            <select 
                                id="cert_type" 
                                value={formData.certification?.type || 'None'} 
                                onChange={(e) => handleCertChange('type', e.target.value)}
                                className="mt-1 block w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="None">None</option>
                                <option value="8130-3">FAA Form 8130-3</option>
                                <option value="CoC">Certificate of Conformity (CoC)</option>
                                <option value="EASA Form 1">EASA Form 1</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="cert_number" className="block text-sm font-medium text-slate-300">Control / Tracking #</label>
                            <input 
                                type="text" 
                                id="cert_number" 
                                value={formData.certification?.number || ''} 
                                onChange={(e) => handleCertChange('number', e.target.value)} 
                                className="mt-1 block w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="e.g. 12345-ABC"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Attached Document</label>
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-md text-sm border border-slate-500 transition-colors">
                                    <PaperClipIcon className="w-4 h-4" />
                                    {formData.certification?.mediaName ? 'Change File' : 'Upload 8130/CoC'}
                                    <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />
                                </label>
                                {formData.certification?.mediaName && (
                                    <div className="flex items-center gap-1 text-sm text-sky-400 bg-sky-900/30 px-2 py-1 rounded border border-sky-500/30">
                                        <DocumentTextIcon className="w-4 h-4" />
                                        <span className="truncate max-w-[150px]">{formData.certification.mediaName}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-emerald-900/20 p-3 rounded-md border border-emerald-500/30 mt-2 md:mt-0">
                            <input 
                                type="checkbox" 
                                id="verified" 
                                checked={formData.certification?.verified || false} 
                                onChange={(e) => handleCertChange('verified', e.target.checked)} 
                                className="h-5 w-5 rounded border-slate-500 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
                            />
                            <label htmlFor="verified" className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                                <CheckBadgeIcon className="w-4 h-4" />
                                Authenticity Verified
                            </label>
                        </div>
                    </div>
                </div>
            </form>
        </BaseModal>
    );
};
