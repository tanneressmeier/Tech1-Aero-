// =============================================================================
// components/ui.tsx — Tech1 Aero Design System
//
// Single source of truth for:
//   • Color semantics (status, priority, severity)
//   • Shared layout primitives (PageHeader, SectionCard, AlertBanner)
//   • Shared data display (StatusBadge, PriorityBadge, MetaGrid)
//   • Shared interactive (ActionButton, TabBar)
//
// Every component in the app should import from here rather than
// repeating inline Tailwind strings. This file enforces visual consistency.
// =============================================================================

import React from 'react';
import { ExclamationTriangleIcon, CheckBadgeIcon, InformationCircleIcon, XMarkIcon } from './icons.tsx';

// ── Color tokens ──────────────────────────────────────────────────────────────

export const STATUS_STYLES = {
    'In Progress': {
        dot:   'bg-sky-400',
        bg:    'bg-sky-500/10',
        text:  'text-sky-300',
        border:'border-sky-500/20',
    },
    'Pending': {
        dot:   'bg-amber-400',
        bg:    'bg-amber-500/10',
        text:  'text-amber-300',
        border:'border-amber-500/20',
    },
    'Completed': {
        dot:   'bg-emerald-400',
        bg:    'bg-emerald-500/10',
        text:  'text-emerald-300',
        border:'border-emerald-500/20',
    },
    'On Hold': {
        dot:   'bg-slate-400',
        bg:    'bg-slate-500/10',
        text:  'text-slate-400',
        border:'border-slate-500/20',
    },
    'Cancelled': {
        dot:   'bg-slate-600',
        bg:    'bg-slate-700/20',
        text:  'text-slate-500',
        border:'border-slate-600/20',
    },
} as const;

export const PRIORITY_STYLES = {
    aog:     { bg: 'bg-red-500/15',   text: 'text-red-300',    border: 'border-red-500/30',    label: 'AOG'     },
    urgent:  { bg: 'bg-amber-500/15', text: 'text-amber-300',  border: 'border-amber-500/30',  label: 'Urgent'  },
    routine: { bg: 'bg-slate-500/10', text: 'text-slate-400',  border: 'border-slate-500/20',  label: 'Routine' },
} as const;

export const SEVERITY_STYLES = {
    critical: { bg: 'bg-red-500/10',    border: 'border-red-500/25',    icon: 'text-red-400',    text: 'text-red-300'    },
    warning:  { bg: 'bg-amber-500/8',   border: 'border-amber-500/25',  icon: 'text-amber-400',  text: 'text-amber-200'  },
    info:     { bg: 'bg-sky-500/8',     border: 'border-sky-500/20',    icon: 'text-sky-400',    text: 'text-sky-200'    },
    success:  { bg: 'bg-emerald-500/8', border: 'border-emerald-500/20',icon: 'text-emerald-400',text: 'text-emerald-200' },
} as const;

// ── Shared types ──────────────────────────────────────────────────────────────

type Severity = keyof typeof SEVERITY_STYLES;

// ── PageHeader ────────────────────────────────────────────────────────────────
// Consistent top-of-page header with title, optional subtitle, and right slot

interface PageHeaderProps {
    title:    string;
    subtitle?: string;
    icon?:    React.ReactNode;
    actions?: React.ReactNode;
    border?:  boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title, subtitle, icon, actions, border = true,
}) => (
    <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${border ? 'pb-6 mb-6 border-b border-white/5' : 'mb-4'}`}>
        <div className="flex items-center gap-3 min-w-0">
            {icon && (
                <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/8 text-sky-400">
                    {icon}
                </div>
            )}
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-white tracking-tight truncate">{title}</h1>
                {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        {actions && (
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {actions}
            </div>
        )}
    </div>
);

// ── SectionCard ───────────────────────────────────────────────────────────────
// Standard content card — replaces ad-hoc glass-panel + border combos

interface SectionCardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    noBorder?: boolean;
}

export const SectionCard: React.FC<SectionCardProps> = ({
    children, className = '', padding = 'md', noBorder = false,
}) => {
    const padMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };
    return (
        <div className={`bg-white/3 rounded-xl ${noBorder ? '' : 'border border-white/8'} ${padMap[padding]} ${className}`}>
            {children}
        </div>
    );
};

// ── AlertBanner ───────────────────────────────────────────────────────────────
// Replaces all the ad-hoc amber/red inline alert divs

interface AlertBannerProps {
    severity:  Severity;
    title:     string;
    children?: React.ReactNode;
    onDismiss?: () => void;
    compact?:  boolean;
}

const SEVERITY_ICONS = {
    critical: ExclamationTriangleIcon,
    warning:  ExclamationTriangleIcon,
    info:     InformationCircleIcon,
    success:  CheckBadgeIcon,
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
    severity, title, children, onDismiss, compact = false,
}) => {
    const s  = SEVERITY_STYLES[severity];
    const Icon = SEVERITY_ICONS[severity];
    return (
        <div className={`flex items-start gap-3 rounded-xl border ${s.bg} ${s.border} ${compact ? 'px-3 py-2.5' : 'px-4 py-3.5'}`}>
            <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${s.icon}`} />
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${s.text}`}>{title}</p>
                {children && <div className="mt-1 space-y-0.5">{children}</div>}
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
                    <XMarkIcon className="w-4 h-4 text-slate-400" />
                </button>
            )}
        </div>
    );
};

// ── StatusBadge ───────────────────────────────────────────────────────────────

interface StatusBadgeProps {
    status: keyof typeof STATUS_STYLES;
    dot?:   boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, dot = true }) => {
    const s = STATUS_STYLES[status] ?? STATUS_STYLES['Pending'];
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
            {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />}
            {status}
        </span>
    );
};

// ── PriorityBadge ─────────────────────────────────────────────────────────────

interface PriorityBadgeProps {
    priority: keyof typeof PRIORITY_STYLES;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
    const s = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.routine;
    return (
        <span className={`inline-flex items-center text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${s.bg} ${s.text} ${s.border}`}>
            {s.label}
        </span>
    );
};

// ── MetaGrid ──────────────────────────────────────────────────────────────────
// Consistent key-value display for order/aircraft meta information

interface MetaItem { label: string; value: React.ReactNode; accent?: boolean; }
interface MetaGridProps { items: MetaItem[]; cols?: 2 | 3 | 4 | 5; }

export const MetaGrid: React.FC<MetaGridProps> = ({ items, cols = 4 }) => {
    const colClass = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4', 5: 'grid-cols-2 md:grid-cols-5' }[cols];
    return (
        <div className={`grid ${colClass} gap-x-6 gap-y-4`}>
            {items.map(({ label, value, accent }) => (
                <div key={label}>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
                    <p className={`text-base font-medium ${accent ? 'text-sky-300' : 'text-white'}`}>{value}</p>
                </div>
            ))}
        </div>
    );
};

// ── TabBar ────────────────────────────────────────────────────────────────────

interface Tab { id: string; label: string; icon?: React.ReactNode; badge?: number; }
interface TabBarProps {
    tabs:     Tab[];
    active:   string;
    onChange: (id: string) => void;
    size?:    'sm' | 'md';
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, active, onChange, size = 'md' }) => {
    const padClass = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';
    return (
        <div className="flex items-center gap-0.5 bg-white/3 border border-white/8 rounded-xl p-1">
            {tabs.map(tab => (
                <button key={tab.id} onClick={() => onChange(tab.id)}
                    className={`relative flex items-center gap-1.5 ${padClass} font-medium rounded-lg transition-all duration-200 ${
                        active === tab.id
                            ? 'bg-sky-500/15 text-sky-200 border border-sky-500/25 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}>
                    {tab.icon && <span className="opacity-70">{tab.icon}</span>}
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="ml-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white px-0.5">
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};

// ── ActionButton ──────────────────────────────────────────────────────────────

interface ActionButtonProps {
    onClick?:  () => void;
    children:  React.ReactNode;
    variant?:  'primary' | 'secondary' | 'danger' | 'ghost';
    size?:     'sm' | 'md';
    disabled?: boolean;
    icon?:     React.ReactNode;
    className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
    onClick, children, variant = 'secondary', size = 'md', disabled, icon, className = '',
}) => {
    const base = `inline-flex items-center gap-1.5 font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed`;
    const sizeClass = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';
    const variantClass = {
        primary:   'bg-sky-600 hover:bg-sky-500 text-white border border-sky-500',
        secondary: 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 hover:border-white/20',
        danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 hover:border-red-500/40',
        ghost:     'text-slate-400 hover:text-white hover:bg-white/5',
    }[variant];

    return (
        <button onClick={onClick} disabled={disabled}
            className={`${base} ${sizeClass} ${variantClass} ${className}`}>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </button>
    );
};

// ── Divider ───────────────────────────────────────────────────────────────────

export const Divider: React.FC<{ label?: string; className?: string }> = ({ label, className = '' }) => (
    <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-px bg-white/6" />
        {label && <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest flex-shrink-0">{label}</span>}
        <div className="flex-1 h-px bg-white/6" />
    </div>
);

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
    icon?:    React.ReactNode;
    title:    string;
    message?: string;
    action?:  React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
        {icon && <div className="text-slate-600 mb-4">{icon}</div>}
        <p className="text-slate-400 font-medium mb-1">{title}</p>
        {message && <p className="text-slate-600 text-sm mb-4 max-w-sm">{message}</p>}
        {action}
    </div>
);
