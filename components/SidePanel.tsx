import React, { useEffect } from 'react';
import { XMarkIcon } from './icons.tsx';

interface SidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer: React.ReactNode;
    size?: 'md' | 'lg' | 'xl' | '2xl';
}

export const SidePanel: React.FC<SidePanelProps> = ({ isOpen, onClose, title, children, footer, size = 'lg' }) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    return (
        <div 
            className={`fixed inset-0 z-50 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500" 
                onClick={onClose}
            />

            {/* Panel */}
            <div 
                className={`fixed top-0 right-0 h-full bg-[#0B0F17]/90 backdrop-blur-xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col w-full ${sizeClasses[size]} transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <header className="p-8 border-b border-white/5 flex justify-between items-start flex-shrink-0">
                    <h2 className="text-2xl font-light text-white tracking-wide">{title}</h2>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="p-2 -mt-2 -mr-2 rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                        aria-label="Close panel"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>

                <main className="flex-1 p-8 overflow-y-auto">
                    {children}
                </main>

                <footer className="p-8 bg-white/5 flex justify-between items-center gap-3 flex-shrink-0 border-t border-white/5">
                    {footer}
                </footer>
            </div>
        </div>
    );
};