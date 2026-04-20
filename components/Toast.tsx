import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from './icons.tsx';

export interface ToastProps {
    id:        number;
    message:   string;
    type:      'success' | 'error' | 'info' | 'warning';
    onDismiss: () => void;
    duration?: number;  // ms, default 4000
}

export const Toast: React.FC<ToastProps> = ({ message, type, onDismiss, duration = 4000 }) => {
    // Use ref so the timer closure never captures a stale onDismiss
    const dismissRef = useRef(onDismiss);
    dismissRef.current = onDismiss;

    useEffect(() => {
        const t = setTimeout(() => dismissRef.current(), duration);
        return () => clearTimeout(t);
    }, []); // intentionally empty — run once on mount only

    const styles = {
        success: 'bg-emerald-600/90 border-emerald-500/50 text-white',
        error:   'bg-red-600/90    border-red-500/50    text-white',
        info:    'bg-sky-600/90    border-sky-500/50    text-white',
        warning: 'bg-amber-600/90  border-amber-500/50  text-white',
    };

    return (
        <div className={`flex items-center justify-between gap-3 min-w-[280px] max-w-sm px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm text-sm font-medium transition-all duration-300 animate-fade-in-right ${styles[type]}`}>
            <span>{message}</span>
            <button onClick={() => dismissRef.current()} className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
};
