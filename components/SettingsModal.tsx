
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal.tsx';
import { Technician } from '../types.ts';
import { UserCircleIcon, BuildingOfficeIcon, CurrencyDollarIcon, BellIcon, ComputerDesktopIcon, SwatchIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { useSettings } from '../contexts/SettingsContext.tsx';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: Technician | null;
}

type SettingsTab = 'profile' | 'organization' | 'financials' | 'notifications' | 'appearance' | 'system';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentUser }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const { showToast } = useToast();
    const { settings, updateSection } = useSettings();

    // Local state to hold form values before saving
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        if(isOpen) setLocalSettings(settings);
    }, [isOpen, settings]);

    const handleSave = () => {
        // Commit local settings to context
        updateSection('organization', localSettings.organization);
        updateSection('financials', localSettings.financials);
        updateSection('notifications', localSettings.notifications);
        updateSection('appearance', localSettings.appearance);
        
        showToast({ message: 'Settings saved successfully.', type: 'success' });
        onClose();
    };

    const handleChange = (section: keyof typeof settings, field: string, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const tabs: { id: SettingsTab; label: string; icon: React.FC<any> }[] = [
        { id: 'profile', label: 'My Profile', icon: UserCircleIcon },
        { id: 'organization', label: 'Organization', icon: BuildingOfficeIcon },
        { id: 'financials', label: 'Financials', icon: CurrencyDollarIcon },
        { id: 'notifications', label: 'Notifications', icon: BellIcon },
        { id: 'appearance', label: 'Appearance', icon: SwatchIcon },
        { id: 'system', label: 'System', icon: ComputerDesktopIcon },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-3xl font-bold text-slate-500 dark:text-slate-400">
                                {currentUser?.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentUser?.name}</h3>
                                <p className="text-slate-500 dark:text-slate-400">{currentUser?.role}</p>
                                <div className="mt-2 flex gap-2">
                                    {currentUser?.certifications.map(c => (
                                        <span key={c} className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs text-slate-700 dark:text-sky-400 font-mono">{c}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 mb-4 uppercase tracking-wider">Account Security</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
                                    <input type="email" value={localSettings.profile.email} disabled className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-slate-500 cursor-not-allowed" />
                                </div>
                                <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium">Change Password</button>
                            </div>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 mb-4 uppercase tracking-wider">Digital Signature</h4>
                            <div className="h-32 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 border-dashed rounded-md flex items-center justify-center text-slate-500 text-sm">
                                No signature on file. Click to upload.
                            </div>
                        </div>
                    </div>
                );
            case 'organization':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Company Name</label>
                            <input type="text" value={localSettings.organization.name} onChange={e => handleChange('organization', 'name', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Repair Station Number</label>
                            <input type="text" value={localSettings.organization.repairStationNum} onChange={e => handleChange('organization', 'repairStationNum', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Address</label>
                            <textarea rows={3} value={localSettings.organization.address} onChange={e => handleChange('organization', 'address', e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                    </div>
                );
            case 'financials':
                return (
                    <div className="space-y-6">
                        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-md">
                            <p className="text-sm text-amber-700 dark:text-amber-200">Changes to these values will affect all newly created Work Orders and Invoices.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Default Labor Rate ($/hr)</label>
                            <input type="number" value={localSettings.financials.laborRate} onChange={e => handleChange('financials', 'laborRate', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Shop Supplies Charge (%)</label>
                            <input type="number" value={localSettings.financials.shopSupplies} onChange={e => handleChange('financials', 'shopSupplies', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Sales Tax Rate (%)</label>
                            <input type="number" value={localSettings.financials.taxRate} onChange={e => handleChange('financials', 'taxRate', parseFloat(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
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
                            <input type="number" value={localSettings.financials.benefitsLoad ?? 35}
                                onChange={e => handleChange('financials', 'benefitsLoad', parseFloat(e.target.value))}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                            <p className="text-xs text-slate-500 mt-1">Benefits, payroll tax, insurance as % of base labor rate. Typical: 25–40%.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Hangar Overhead ($/hr)</label>
                            <input type="number" value={localSettings.financials.hangarOverhead ?? 25}
                                onChange={e => handleChange('financials', 'hangarOverhead', parseFloat(e.target.value))}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" />
                            <p className="text-xs text-slate-500 mt-1">Flat overhead per labor hour — facility, utilities, admin allocation.</p>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2">Email Alerts</h4>
                        <label className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                            <input type="checkbox" checked={localSettings.notifications.emailWorkOrder} onChange={e => handleChange('notifications', 'emailWorkOrder', e.target.checked)} className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Work Order Assignments</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Receive an email when you are assigned to a new squawk.</p>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                            <input type="checkbox" checked={localSettings.notifications.emailInventory} onChange={e => handleChange('notifications', 'emailInventory', e.target.checked)} className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Low Inventory Alerts</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Notify me when items reach reorder levels.</p>
                            </div>
                        </label>
                        
                        <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2 mt-6">System Alerts</h4>
                        <label className="flex items-center gap-3 p-3 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                            <input type="checkbox" checked={localSettings.notifications.pushCalibration} onChange={e => handleChange('notifications', 'pushCalibration', e.target.checked)} className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
                            <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Tool Calibration Reminders</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">In-app alerts for tools expiring within 30 days.</p>
                            </div>
                        </label>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-8">
                        {/* Interface Theme */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Interface Theme</label>
                            <div className="grid grid-cols-3 gap-4">
                                <button 
                                    onClick={() => handleChange('appearance', 'themeMode', 'dark')}
                                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${localSettings.appearance.themeMode === 'dark' ? 'border-sky-500 bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    <div className="h-16 bg-[#0B0F17] rounded-lg mb-3 border border-slate-700 shadow-inner flex flex-col p-2 gap-2">
                                        <div className="h-2 w-1/2 bg-slate-600 rounded-full"></div>
                                        <div className="h-2 w-3/4 bg-slate-700 rounded-full"></div>
                                        <div className="mt-auto h-6 w-full bg-slate-800 rounded border border-slate-700"></div>
                                    </div>
                                    <span className={`block text-sm font-medium ${localSettings.appearance.themeMode === 'dark' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>Dark Mode</span>
                                    {localSettings.appearance.themeMode === 'dark' && <div className="absolute top-2 right-2 w-3 h-3 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>}
                                </button>

                                <button 
                                    onClick={() => handleChange('appearance', 'themeMode', 'light')}
                                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${localSettings.appearance.themeMode === 'light' ? 'border-sky-500 bg-slate-100' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    <div className="h-16 bg-white rounded-lg mb-3 border border-slate-200 shadow-inner flex flex-col p-2 gap-2">
                                        <div className="h-2 w-1/2 bg-slate-300 rounded-full"></div>
                                        <div className="h-2 w-3/4 bg-slate-200 rounded-full"></div>
                                        <div className="mt-auto h-6 w-full bg-slate-100 rounded border border-slate-200"></div>
                                    </div>
                                    <span className={`block text-sm font-medium ${localSettings.appearance.themeMode === 'light' ? 'text-slate-900 dark:text-slate-900' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>Light Mode</span>
                                    {localSettings.appearance.themeMode === 'light' && <div className="absolute top-2 right-2 w-3 h-3 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>}
                                </button>

                                <button 
                                    onClick={() => handleChange('appearance', 'themeMode', 'system')}
                                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${localSettings.appearance.themeMode === 'system' ? 'border-sky-500 bg-slate-800' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    <div className="h-16 rounded-lg mb-3 border border-slate-300 dark:border-slate-700 overflow-hidden flex">
                                        <div className="w-1/2 bg-[#0B0F17] h-full border-r border-slate-700"></div>
                                        <div className="w-1/2 bg-white h-full"></div>
                                    </div>
                                    <span className={`block text-sm font-medium ${localSettings.appearance.themeMode === 'system' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>System Sync</span>
                                    {localSettings.appearance.themeMode === 'system' && <div className="absolute top-2 right-2 w-3 h-3 bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]"></div>}
                                </button>
                            </div>
                        </div>

                        {/* Accent Color */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Accent Color</label>
                            <div className="flex gap-4">
                                {[
                                    { id: 'sky', color: 'bg-sky-500', label: 'Aero Blue' },
                                    { id: 'indigo', color: 'bg-indigo-500', label: 'Deep Indigo' },
                                    { id: 'emerald', color: 'bg-emerald-500', label: 'Safety Green' },
                                    { id: 'amber', color: 'bg-amber-500', label: 'Caution Amber' },
                                    { id: 'rose', color: 'bg-rose-500', label: 'Alert Red' },
                                ].map((color) => (
                                    <button
                                        key={color.id}
                                        onClick={() => handleChange('appearance', 'accentColor', color.id)}
                                        className={`group relative w-12 h-12 rounded-full ${color.color} flex items-center justify-center transition-transform hover:scale-110 focus:outline-none ring-2 ring-offset-2 ring-offset-slate-100 dark:ring-offset-[#1e293b] ${localSettings.appearance.accentColor === color.id ? 'ring-slate-400 dark:ring-white scale-110' : 'ring-transparent'}`}
                                        title={color.label}
                                    >
                                        {localSettings.appearance.accentColor === color.id && (
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
                                        onClick={() => handleChange('appearance', 'density', 'Compact')}
                                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${localSettings.appearance.density === 'Compact' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                    >
                                        Compact
                                    </button>
                                    <button 
                                        onClick={() => handleChange('appearance', 'density', 'Comfortable')}
                                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${localSettings.appearance.density === 'Comfortable' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
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
                                        onClick={() => handleChange('appearance', 'reducedMotion', !localSettings.appearance.reducedMotion)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localSettings.appearance.reducedMotion ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localSettings.appearance.reducedMotion ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'system':
                return (
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
            default:
                return null;
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Settings"
            size="3xl"
            footer={
                <>
                    <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Save Changes
                    </button>
                </>
            }
        >
            <div className="flex h-[60vh] -mx-6 -my-6">
                {/* Sidebar */}
                <div className="w-64 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                                activeTab === tab.id 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-slate-500'}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto bg-white dark:bg-slate-800">
                    <h2 className="text-2xl font-light text-slate-900 dark:text-white mb-6 pb-2 border-b border-slate-200 dark:border-white/10">
                        {tabs.find(t => t.id === activeTab)?.label}
                    </h2>
                    {renderContent()}
                </div>
            </div>
        </BaseModal>
    );
};
