import React from 'react';

interface AppearanceTabProps {
    values: {
        themeMode: string;
        accentColor: string;
        density: string;
        reducedMotion: boolean;
    };
    onChange: (field: string, value: any) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({ values, onChange }) => (
    <div className="space-y-8">
        {/* Interface Theme */}
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Interface Theme</label>
            <div className="grid grid-cols-3 gap-4">
                <button
                    onClick={() => onChange('themeMode', 'dark')}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${values.themeMode === 'dark' ? 'border-sky-500 bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <div className="h-16 bg-[#0B0F17] rounded-lg mb-3 border border-slate-700 shadow-inner flex flex-col p-2 gap-2">
                        <div className="h-2 w-1/2 bg-slate-600 rounded-full"></div>
                        <div className="h-2 w-3/4 bg-slate-700 rounded-full"></div>
                        <div className="mt-auto h-6 w-full bg-slate-800 rounded border border-slate-700"></div>
                    </div>
                    <span className={`block text-sm font-medium ${values.themeMode === 'dark' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>Dark Mode</span>
                    {values.themeMode === 'dark' && <div className="absolute top-2 right-2 w-3 h-3 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>}
                </button>

                <button
                    onClick={() => onChange('themeMode', 'light')}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${values.themeMode === 'light' ? 'border-sky-500 bg-slate-100' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <div className="h-16 bg-white rounded-lg mb-3 border border-slate-200 shadow-inner flex flex-col p-2 gap-2">
                        <div className="h-2 w-1/2 bg-slate-300 rounded-full"></div>
                        <div className="h-2 w-3/4 bg-slate-200 rounded-full"></div>
                        <div className="mt-auto h-6 w-full bg-slate-100 rounded border border-slate-200"></div>
                    </div>
                    <span className={`block text-sm font-medium ${values.themeMode === 'light' ? 'text-slate-900 dark:text-slate-900' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>Light Mode</span>
                    {values.themeMode === 'light' && <div className="absolute top-2 right-2 w-3 h-3 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>}
                </button>

                <button
                    onClick={() => onChange('themeMode', 'system')}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${values.themeMode === 'system' ? 'border-sky-500 bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <div className="h-16 rounded-lg mb-3 border border-slate-300 dark:border-slate-700 overflow-hidden flex">
                        <div className="w-1/2 bg-[#0B0F17] h-full border-r border-slate-700"></div>
                        <div className="w-1/2 bg-white h-full"></div>
                    </div>
                    <span className={`block text-sm font-medium ${values.themeMode === 'system' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>System Sync</span>
                    {values.themeMode === 'system' && <div className="absolute top-2 right-2 w-3 h-3 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>}
                </button>
            </div>
        </div>

        {/* Accent Color */}
        <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Accent Color</label>
            <div className="flex gap-4">
                {[
                    { id: 'sky',     color: 'bg-sky-500',     label: 'Aero Blue' },
                    { id: 'indigo',  color: 'bg-indigo-500',  label: 'Deep Indigo' },
                    { id: 'emerald', color: 'bg-emerald-500', label: 'Safety Green' },
                    { id: 'amber',   color: 'bg-amber-500',   label: 'Caution Amber' },
                    { id: 'rose',    color: 'bg-rose-500',    label: 'Alert Red' },
                ].map((color) => (
                    <button
                        key={color.id}
                        onClick={() => onChange('accentColor', color.id)}
                        className={`group relative w-12 h-12 rounded-full ${color.color} flex items-center justify-center transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 ring-offset-slate-100 dark:ring-offset-[#1e293b] ${values.accentColor === color.id ? 'ring-slate-400 dark:ring-white scale-110' : 'ring-transparent'}`}
                        title={color.label}
                    >
                        {values.accentColor === color.id && (
                            <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* Density & Accessibility */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Display Density</label>
                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 flex">
                    <button
                        onClick={() => onChange('density', 'Compact')}
                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${values.density === 'Compact' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Compact
                    </button>
                    <button
                        onClick={() => onChange('density', 'Comfortable')}
                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${values.density === 'Comfortable' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        Comfortable
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Accessibility</label>
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Reduced Motion</span>
                    <button
                        onClick={() => onChange('reducedMotion', !values.reducedMotion)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${values.reducedMotion ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${values.reducedMotion ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
        </div>
    </div>
);
