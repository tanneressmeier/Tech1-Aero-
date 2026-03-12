import React from 'react';
import { XMarkIcon } from './icons.tsx';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer: React.ReactNode;
    size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const BaseModal: React.FC<BaseModalProps> = ({ isOpen, onClose, title, children, footer, size = 'lg' }) => {
    if (!isOpen) return null;
    
    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className={`bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <button type="button" onClick={onClose} className="p-1 -mt-1 -mr-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    {children}
                </div>
                <div className="p-6 bg-slate-900/50 rounded-b-2xl flex justify-end gap-3">
                    {footer}
                </div>
            </div>
        </div>
    );
};
