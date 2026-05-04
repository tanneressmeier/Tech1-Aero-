import React from 'react';
import { Technician, View } from '../types.ts';
import { WrenchIcon, CogIcon } from './icons.tsx';
import { useSettings } from '../contexts/SettingsContext.tsx';

export type NavItem  = { view: View; label: string; icon: React.FC<any>; adminOnly?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

interface AppSidebarProps {
    currentUser:    Technician;
    currentView:    string;
    visibleGroups:  NavGroup[];
    onNavigate:     (view: View) => void;
    onOpenSettings: () => void;
    onSignOut:      () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
    currentUser, currentView, visibleGroups, onNavigate, onOpenSettings, onSignOut,
}) => {
    const { settings } = useSettings();

    return (
        <aside className="w-56 flex-shrink-0 flex flex-col bg-[#0d1220] border-r border-white/5 z-20">

            {/* Logo */}
            <div className="h-16 flex items-center px-5 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center flex-shrink-0">
                        <WrenchIcon className="w-3.5 h-3.5 text-sky-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight truncate">
                            {settings.organization.name.split(' ')[0]}
                        </p>
                        <p className="text-[10px] text-sky-400 font-mono tracking-widest uppercase leading-tight">
                            {settings.organization.name.split(' ').slice(1).join(' ') || 'MRO'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Nav groups */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
                {visibleGroups.map(group => (
                    <div key={group.label}>
                        <p className="px-3 mb-1 text-[9px] font-mono font-semibold text-slate-600 uppercase tracking-[0.18em]">
                            {group.label}
                        </p>
                        <div className="space-y-0.5">
                            {group.items.map(item => {
                                const isActive = currentView === item.view;
                                return (
                                    <button
                                        key={item.view}
                                        onClick={() => onNavigate(item.view)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left ${
                                            isActive
                                                ? 'bg-sky-500/12 text-white font-medium border border-sky-500/20'
                                                : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                                        }`}
                                    >
                                        <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User footer */}
            <div className="flex-shrink-0 border-t border-white/5 p-3 space-y-2">
                <div className="flex items-center gap-2.5 px-2 py-1.5">
                    <div className="relative flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                            {currentUser.name.charAt(0)}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#0d1220]" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{currentUser.role}</p>
                    </div>
                    <button
                        onClick={onOpenSettings}
                        className="flex-shrink-0 p-1 text-slate-500 hover:text-white rounded transition-colors"
                        title="Settings"
                    >
                        <CogIcon className="w-4 h-4" />
                    </button>
                </div>
                <button
                    onClick={onSignOut}
                    className="w-full text-[11px] text-slate-600 hover:text-slate-300 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                    Sign out
                </button>
            </div>
        </aside>
    );
};
