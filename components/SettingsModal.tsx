
import React, { useState, useEffect } from 'react';
import { BaseModal } from './BaseModal.tsx';
import { Technician } from '../types.ts';
import { UserCircleIcon, BuildingOfficeIcon, CurrencyDollarIcon, BellIcon, ComputerDesktopIcon, SwatchIcon } from './icons.tsx';
import { useToast } from '../contexts/ToastContext.tsx';
import { useSettings } from '../contexts/SettingsContext.tsx';
import { ProfileTab }       from './settings/ProfileTab.tsx';
import { OrganizationTab }  from './settings/OrganizationTab.tsx';
import { FinancialsTab }    from './settings/FinancialsTab.tsx';
import { HangarsTab }       from './settings/HangarsTab.tsx';
import { NotificationsTab } from './settings/NotificationsTab.tsx';
import { AppearanceTab }    from './settings/AppearanceTab.tsx';
import { SystemTab }        from './settings/SystemTab.tsx';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: Technician | null;
}

type SettingsTab = 'profile' | 'organization' | 'financials' | 'hangars' | 'notifications' | 'appearance' | 'system';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentUser }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const { showToast } = useToast();
    const { settings, updateSection, updateSettings } = useSettings();

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
        if (localSettings.hangars) updateSettings({ hangars: localSettings.hangars });

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
        { id: 'hangars', label: 'Hangars', icon: BuildingOfficeIcon },
        { id: 'notifications', label: 'Notifications', icon: BellIcon },
        { id: 'appearance', label: 'Appearance', icon: SwatchIcon },
        { id: 'system', label: 'System', icon: ComputerDesktopIcon },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':       return <ProfileTab currentUser={currentUser} email={localSettings.profile.email} />;
            case 'organization':  return <OrganizationTab  values={localSettings.organization}  onChange={(f, v) => handleChange('organization',  f, v)} />;
            case 'financials':    return <FinancialsTab    values={localSettings.financials}    onChange={(f, v) => handleChange('financials',    f, v)} />;
            case 'hangars':       return <HangarsTab       hangars={localSettings.hangars ?? []} onChange={h => setLocalSettings((p: typeof localSettings) => ({ ...p, hangars: h }))} />;
            case 'notifications': return <NotificationsTab values={localSettings.notifications} onChange={(f, v) => handleChange('notifications', f, v)} />;
            case 'appearance':    return <AppearanceTab    values={localSettings.appearance}    onChange={(f, v) => handleChange('appearance',    f, v)} />;
            case 'system':        return <SystemTab />;
            default:              return null;
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

