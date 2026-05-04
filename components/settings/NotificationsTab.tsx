import React from 'react';

interface NotificationsTabProps {
    values: {
        emailWorkOrder: boolean;
        emailInventory: boolean;
        pushCalibration: boolean;
    };
    onChange: (field: string, value: any) => void;
}

export const NotificationsTab: React.FC<NotificationsTabProps> = ({ values, onChange }) => (
    <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2">Email Alerts</h4>
        <label className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
            <input type="checkbox" checked={values.emailWorkOrder} onChange={e => onChange('emailWorkOrder', e.target.checked)} className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
            <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Work Order Assignments</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Receive an email when you are assigned to a new squawk.</p>
            </div>
        </label>
        <label className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
            <input type="checkbox" checked={values.emailInventory} onChange={e => onChange('emailInventory', e.target.checked)} className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
            <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Low Inventory Alerts</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Notify me when items reach reorder levels.</p>
            </div>
        </label>

        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2 mt-6">System Alerts</h4>
        <label className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
            <input type="checkbox" checked={values.pushCalibration} onChange={e => onChange('pushCalibration', e.target.checked)} className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
            <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Tool Calibration Reminders</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">In-app alerts for tools expiring within 30 days.</p>
            </div>
        </label>
    </div>
);
