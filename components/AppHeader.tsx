import React from 'react';
import { View, Notification } from '../types.ts';
import { GlobalSearchBar } from './GlobalSearchBar.tsx';
import { NotificationCenter } from './NotificationCenter.tsx';

interface AppHeaderProps {
    onSearch:       (query: string) => void;
    isSearching:    boolean;
    notifications:  Notification[];
    onMarkAsRead:   () => void;
    onNavigate:     (link: { view: View; orderId?: string }) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    onSearch, isSearching, notifications, onMarkAsRead, onNavigate,
}) => (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-[#0d1220]/80 backdrop-blur-sm z-10">
        <div className="w-full max-w-sm">
            <GlobalSearchBar onSearch={onSearch} isSearching={isSearching} />
        </div>
        <div className="flex items-center gap-2">
            <NotificationCenter
                notifications={notifications}
                onMarkAsRead={onMarkAsRead}
                onNavigate={onNavigate}
            />
        </div>
    </header>
);
