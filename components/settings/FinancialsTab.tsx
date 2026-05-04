import React from 'react';

interface FinancialsTabProps {
    values: {
        laborRate: number;
        shopSupplies: number;
        taxRate: number;
        benefitsLoad?: number;
        hangarOverhead?: number;
    };
    onChange: (field: string, value: any) => void;
}

export const FinancialsTab: React.FC<FinancialsTabProps> = ({ values, onChange }) => (
    <div className="space-y-6">
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-md">
            <p className="text-sm text-amber-700 dark:text-amber-200">Changes to these values will affect all newly created Work Orders and Invoices.</p>
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Default Labor Rate ($/hr)</label>
            <input type="number" value={values.laborRate} onChange={e => onChange('laborRate', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Shop Supplies Charge (%)</label>
            <input type="number" value={values.shopSupplies} onChange={e => onChange('shopSupplies', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Sales Tax Rate (%)</label>
            <input type="number" value={values.taxRate} onChange={e => onChange('taxRate', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-white/10">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">
                Burdened Labor Rate (used by Profitability Dashboard)
            </p>
            <p className="text-xs text-slate-500 mb-4">
                Burdened rate = Labor Rate × (1 + Benefits Load) + Hangar Overhead. This is the true
                fully-loaded hourly cost used to calculate real-time margin projections.
            </p>
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Benefits Load (%)</label>
            <input type="number" value={values.benefitsLoad ?? 35}
                onChange={e => onChange('benefitsLoad', parseFloat(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
            <p className="text-xs text-slate-500 mt-1">Benefits, payroll tax, insurance as % of base labor rate. Typical: 25–40%.</p>
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Hangar Overhead ($/hr)</label>
            <input type="number" value={values.hangarOverhead ?? 25}
                onChange={e => onChange('hangarOverhead', parseFloat(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
            <p className="text-xs text-slate-500 mt-1">Flat overhead per labor hour — facility, utilities, admin allocation.</p>
        </div>
    </div>
);
