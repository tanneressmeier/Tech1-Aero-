
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '../types.ts';

const DEFAULT_SETTINGS: AppSettings = {
    profile: {
        name: 'Michael Snyder',
        email: 'michael.snyder@tech1.aero',
    },
    organization: {
        name: 'Tech1 Aero Systems',
        repairStationNum: 'X9YR1234',
        address: '123 Hangar Row\nAviation City, ST 12345',
    },
    financials: {
        laborRate:      125.00,
        shopSupplies:   10,
        taxRate:        8.25,
        benefitsLoad:   35,
        hangarOverhead: 22,
    },
    notifications: {
        emailWorkOrder: true,
        emailInventory: true,
        pushCalibration: true,
    },
    appearance: {
        themeMode: 'dark',
        accentColor: 'sky',
        density: 'Comfortable',
        reducedMotion: false,
    },
    hangars: [
        {
            id: 'hangar-1',
            label: 'Hangar 1 — Main Bay',
            width_ft:       180,
            depth_ft:       120,
            door_height_ft:  26,
            door_width_ft:  160,
            bays:             4,
            color:           'sky',
        },
        {
            id: 'hangar-2',
            label: 'Hangar 2 — Overflow',
            width_ft:       120,
            depth_ft:        80,
            door_height_ft:  20,
            door_width_ft:  100,
            bays:             2,
            color:           'indigo',
        },
        {
            id: 'wash-bay',
            label: 'Wash Bay',
            width_ft:        60,
            depth_ft:        60,
            door_height_ft:  18,
            door_width_ft:   55,
            bays:             1,
            color:           'emerald',
        },
    ],
};

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    updateSection: <K extends keyof AppSettings>(section: K, data: Partial<AppSettings[K]>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('appSettings');
        return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    });

    useEffect(() => {
        localStorage.setItem('appSettings', JSON.stringify(settings));
        
        const root = window.document.documentElement;
        
        // Handle Theme Mode
        root.classList.remove('dark', 'light');
        if (settings.appearance.themeMode === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            if (systemTheme === 'dark') {
                root.classList.add('dark');
            }
        } else if (settings.appearance.themeMode === 'dark') {
            root.classList.add('dark');
        } else {
            // Light mode is default (no class), but we explicitly removed 'dark' above.
        }

        // Apply global styles/classes based on settings
        if (settings.appearance.reducedMotion) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }

        // Font size scaling for density
        if (settings.appearance.density === 'Compact') {
            document.documentElement.style.fontSize = '14px';
        } else {
            document.documentElement.style.fontSize = '16px';
        }

    }, [settings]);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const updateSection = <K extends keyof AppSettings>(section: K, data: Partial<AppSettings[K]>) => {
        setSettings(prev => ({
            ...prev,
            [section]: { ...prev[section], ...data }
        }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, updateSection }}>
            {children}
        </SettingsContext.Provider>
    );
};
