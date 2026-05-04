import React from 'react';

export const SystemTab: React.FC = () => (
    <div className="space-y-6">
        <div>
            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2">Integrations</h4>
            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Google Gemini API</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Connected</p>
                    </div>
                    <div className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400 font-mono">gemini-2.5-flash</div>
                </div>
            </div>
        </div>
        <div>
            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2">Data Management</h4>
            <button className="w-full text-left px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-colors text-sm text-slate-700 dark:text-slate-300">
                Export All Data (JSON)
            </button>
            <button className="w-full text-left px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-colors text-sm text-red-500 dark:text-red-400 mt-2">
                Clear Local Cache
            </button>
        </div>
        <div className="text-center pt-4">
            <p className="text-xs text-slate-500 dark:text-slate-600 font-mono">Tech1 Aero Optimization v1.0.4</p>
            <p className="text-xs text-slate-500 dark:text-slate-600 font-mono">Build: 2024.05.20-RC2</p>
        </div>
    </div>
);
