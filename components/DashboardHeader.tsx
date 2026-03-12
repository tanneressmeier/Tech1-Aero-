import React from 'react';
import { FunnelIcon, XMarkIcon } from './icons.tsx';

interface DashboardHeaderProps {
    icon: React.ReactNode;
    title: string;
    children?: React.ReactNode;
    activeFilters?: Record<string, any>;
    onFilterClear?: (filterName: string) => void;
    onShowFilters?: () => void;
    filterLabels?: Record<string, string>;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
    icon, 
    title, 
    children, 
    activeFilters,
    onFilterClear,
    onShowFilters,
    filterLabels
}) => {
    const activeFilterEntries = activeFilters ? Object.entries(activeFilters).filter(([key, value]) => {
        if (key === 'searchTerm') return false; 
        if (typeof value === 'object' && value !== null) {
            return value.start || value.end;
        }
        return value && value !== 'all';
    }) : [];

    const getFilterDisplayValue = (key: string, value: any): string => {
        if (typeof value === 'object' && value !== null) {
            if (value.start && value.end) return `${value.start} to ${value.end}`;
            if (value.start) return `From ${value.start}`;
            if (value.end) return `Until ${value.end}`;
        }
        return String(value);
    }

    return (
        <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end border-b border-white/5 pb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-lg text-sky-400 border border-white/10">
                        {icon}
                    </div>
                    <h2 className="text-3xl font-light tracking-wide text-white uppercase">{title}</h2>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {children}
                    {onShowFilters && (
                         <button onClick={onShowFilters} className="relative flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-medium py-2 px-4 rounded-lg text-sm transition-all duration-300">
                            <FunnelIcon className="w-4 h-4" />
                            Filters
                            {activeFilterEntries.length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white shadow-lg shadow-sky-500/50">
                                    {activeFilterEntries.length}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>
            {activeFilterEntries.length > 0 && onFilterClear && (
                <div className="flex flex-wrap items-center gap-2 mt-4 animate-fade-in-up">
                    <span className="text-xs font-mono text-slate-500 uppercase tracking-wider mr-2">Active Filters:</span>
                    {activeFilterEntries.map(([key, value]) => (
                        <span key={key} className="inline-flex items-center gap-x-2 rounded-md bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs font-medium text-sky-300">
                            <span className="opacity-70 uppercase">{filterLabels?.[key] || key}:</span> {getFilterDisplayValue(key, value)}
                            <button
                                type="button"
                                onClick={() => onFilterClear(key)}
                                className="-mr-1 ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-sky-400 hover:bg-sky-500/20 hover:text-white transition-colors"
                                aria-label={`Remove ${filterLabels?.[key] || key} filter`}
                            >
                                <XMarkIcon className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};