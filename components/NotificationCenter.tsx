import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Notification, View } from '../types.ts';
import { BellIcon, CheckIcon } from './icons.tsx';

const formatTimeAgo = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

interface NotificationCenterProps {
    notifications: Notification[];
    onMarkAsRead: () => void;
    onNavigate: (link: { view: View, orderId?: string }) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onMarkAsRead, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

    const handleToggle = () => {
        setIsOpen(prev => {
            const newIsOpen = !prev;
            if (newIsOpen && unreadCount > 0) {
                onMarkAsRead();
            }
            return newIsOpen;
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notification: Notification) => {
        if (notification.link) {
            onNavigate(notification.link);
        }
        setIsOpen(false);
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={handleToggle} className="relative p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-white">
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-white text-xs items-center justify-center">{unreadCount}</span>
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-slate-700">
                    <div className="py-1">
                        <div className="px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-white">Notifications</h3>
                            <button onClick={onMarkAsRead} className="text-xs text-indigo-400 hover:underline">Mark all as read</button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map(notification => (
                                    <div 
                                        key={notification.id} 
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`block px-4 py-3 text-sm ${notification.link ? 'cursor-pointer hover:bg-slate-700' : 'cursor-default'}`}
                                    >
                                        <p className={`text-slate-300 ${!notification.read ? 'font-semibold' : 'font-normal'}`}>{notification.message}</p>
                                        <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(notification.timestamp)}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-slate-500 py-4 text-sm">No notifications yet.</p>
                            )}
                        </div>
                         <div className="px-4 py-2 border-t border-slate-700 text-center">
                            <button className="text-xs text-slate-400 hover:text-white">View all</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
