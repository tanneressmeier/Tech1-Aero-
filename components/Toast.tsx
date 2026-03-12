import React, { useEffect } from 'react';

export interface ToastProps {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
    onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [onDismiss]);

    const baseClasses = 'px-4 py-3 rounded-md shadow-lg text-white font-semibold transition-all duration-300 animate-fade-in-right';
    const typeClasses = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            {message}
        </div>
    );
};
