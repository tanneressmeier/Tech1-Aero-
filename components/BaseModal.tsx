import React, { useEffect } from 'react';
import { XMarkIcon } from './icons.tsx';
import { Portal } from './Portal.tsx';

interface BaseModalProps {
    isOpen:   boolean;
    onClose:  () => void;
    title:    string;
    children: React.ReactNode;
    footer:   React.ReactNode;
    size?:    'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const BaseModal: React.FC<BaseModalProps> = ({
    isOpen, onClose, title, children, footer, size = 'lg',
}) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', onKey);
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeW = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl' };

    return (
        <Portal>
            <div
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                onClick={onClose}>
                <div
                    className={`relative bg-[#0d1220] border border-white/10 rounded-2xl shadow-2xl w-full ${sizeW[size]} flex flex-col max-h-[90vh]`}
                    onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                        <h2 className="text-xl font-semibold text-white">{title}</h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Body */}
                    <div className="flex-1 px-6 py-5 overflow-y-auto">
                        {children}
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-4 bg-white/3 border-t border-white/10 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
                        {footer}
                    </div>
                </div>
            </div>
        </Portal>
    );
};
