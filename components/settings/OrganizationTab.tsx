import React from 'react';

interface OrganizationTabProps {
    values: { name: string; repairStationNum: string; address: string };
    onChange: (field: string, value: any) => void;
}

export const OrganizationTab: React.FC<OrganizationTabProps> = ({ values, onChange }) => (
    <div className="space-y-6">
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Company Name</label>
            <input type="text" value={values.name} onChange={e => onChange('name', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Repair Station Number</label>
            <input type="text" value={values.repairStationNum} onChange={e => onChange('repairStationNum', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Address</label>
            <textarea rows={3} value={values.address} onChange={e => onChange('address', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
    </div>
);
