// ErrorBoundary — catches render errors and shows the message instead of blank screen
// Must be a class component (React requirement for error boundaries)
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react';

type Props = { children: React.ReactNode; label?: string };
type State = { hasError: boolean; message: string; stack: string };

const _React = React as any;

export const ErrorBoundary = class ErrorBoundaryClass extends _React.Component {
    constructor(props: Props) {
        super(props as any);
        (this as any).state = { hasError: false, message: '', stack: '' };
    }
    static getDerivedStateFromError(e: Error) {
        return { hasError: true, message: e.message, stack: '' };
    }
    componentDidCatch(e: Error, info: any) {
        (this as any).setState({ stack: info?.componentStack ?? '' });
        console.error('[ErrorBoundary]', (this as any).props?.label, e, info);
    }
    render() {
        const s = (this as any).state as State;
        const p = (this as any).props as Props;
        if (!s.hasError) return p.children;
        return (
            _React.createElement('div', { className: 'm-6 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-4' },
                _React.createElement('p', { className: 'text-base font-bold text-red-300' },
                    `⚠ Render Error${p.label ? ` in ${p.label}` : ''}`),
                _React.createElement('p', { className: 'text-sm font-mono text-red-200 bg-black/30 rounded p-3 whitespace-pre-wrap break-all' },
                    s.message),
                s.stack && _React.createElement('details', { className: 'text-xs' },
                    _React.createElement('summary', { className: 'text-slate-400 cursor-pointer select-none' }, 'Component stack'),
                    _React.createElement('pre', { className: 'mt-2 text-slate-500 font-mono whitespace-pre-wrap break-all bg-black/20 rounded p-3 max-h-48 overflow-y-auto' }, s.stack)
                ),
                _React.createElement('button', {
                    onClick: () => (this as any).setState({ hasError: false, message: '', stack: '' }),
                    className: 'text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg transition-colors'
                }, 'Try again')
            )
        );
    }
} as unknown as React.FC<{ children: React.ReactNode; label?: string }>;
