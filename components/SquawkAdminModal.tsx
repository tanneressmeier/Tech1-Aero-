import React, { useState, useEffect } from 'react';
import { Squawk } from '../types.ts';
import { BaseModal } from './BaseModal.tsx';
import { CurrencyDollarIcon } from './icons.tsx';

interface SquawkAdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    squawk: Squawk | null;
    onSave: (updatedSquawk: Squawk) => void;
}

const SQUAWK_CATEGORIES = ['Maintenance', 'Avionics', 'Sheet Metal', 'Interior', 'Administrative', 'Component'];

export const SquawkAdminModal: React.FC<SquawkAdminModalProps> = ({ isOpen, onClose, squawk, onSave }) => {
    const [formData, setFormData] = useState<Squawk | null>(null);

    useEffect(() => {
        if (squawk) {
            setFormData(squawk);
        }
    }, [squawk, isOpen]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => prev ? { ...prev, [name]: isCheckbox ? checked : value } : null);
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: parseFloat(value) || 0 } : null);
    };

    const handleSubmit = () => {
        if (formData) {
            onSave(formData);
            onClose();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Administrative Settings"
            size="2xl"
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Save Changes
                    </button>
                </>
            }
        >
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-slate-300">Priority</label>
                        <select id="priority" name="priority" value={formData.priority} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="routine">Routine</option>
                            <option value="urgent">Urgent</option>
                            <option value="aog">AOG (Aircraft on Ground)</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-300">Category</label>
                        <select id="category" name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                            {SQUAWK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-4 flex items-center gap-2">
                        <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
                        Billing Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="billing_method" className="block text-sm font-medium text-slate-300">Billing Method</label>
                            <input type="text" id="billing_method" name="billing_method" value={formData.billing_method} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm" />
                        </div>
                        <div>
                            <label htmlFor="billing_customer" className="block text-sm font-medium text-slate-300">Billing Customer</label>
                            <input type="text" id="billing_customer" name="billing_customer" value={formData.billing_customer} onChange={handleChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm" />
                        </div>
                         <div>
                            <label htmlFor="ship_in_charge" className="block text-sm font-medium text-slate-300">Shop Supplies Charge (%)</label>
                            <input type="number" id="ship_in_charge" name="ship_in_charge" value={formData.ship_in_charge} onChange={handleNumberChange} className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm" />
                        </div>
                    </div>
                     <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-md">
                            <input id="do_not_bill" name="do_not_bill" type="checkbox" checked={formData.do_not_bill} onChange={handleChange} className="h-4 w-4 rounded border-slate-500 text-indigo-600" />
                            <label htmlFor="do_not_bill" className="text-sm text-slate-300">Do Not Bill</label>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-md">
                            <input id="use_flat_part_charge" name="use_flat_part_charge" type="checkbox" checked={formData.use_flat_part_charge} onChange={handleChange} className="h-4 w-4 rounded border-slate-500 text-indigo-600" />
                            <label htmlFor="use_flat_part_charge" className="text-sm text-slate-300">Use Flat Part Charge</label>
                        </div>
                         <div className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-md">
                            <input id="do_not_tax_shop_labor" name="do_not_tax_shop_labor" type="checkbox" checked={formData.do_not_tax_shop_labor} onChange={handleChange} className="h-4 w-4 rounded border-slate-500 text-indigo-600" />
                            <label htmlFor="do_not_tax_shop_labor" className="text-sm text-slate-300">Do Not Tax Labor</label>
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};
