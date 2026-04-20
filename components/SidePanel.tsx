import React, { useEffect } from 'react';
import { XMarkIcon } from './icons.tsx';
import { Portal } from './Portal.tsx';

interface SidePanelProps {
    isOpen:   boolean;
    onClose:  () => void;
    title:    string;
    children: React.ReactNode;
    footer:   React.ReactNode;
    size?:    'md' | 'lg' | 'xl' | '2xl';
}

export const SidePanel: React.FC<SidePanelProps> = ({
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

    const sizeW = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' };

    return (
        <Portal>
            <div
                className={`fixed inset-0 z-[200] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                aria-modal="true" role="dialog">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
                {/* Panel */}
                <div className={`fixed top-0 right-0 h-full bg-[#0d1220]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col w-full ${sizeW[size]} transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <header className="px-6 py-5 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                        <h2 className="text-xl font-semibold text-white">{title}</h2>
                        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </header>
                    <main className="flex-1 px-6 py-5 overflow-y-auto">
                        {children}
                    </main>
                    <footer className="px-6 py-4 bg-white/3 border-t border-white/10 flex justify-between items-center gap-3 flex-shrink-0">
                        {footer}
                    </footer>
                </div>
            </div>
        </Portal>
    );
};
