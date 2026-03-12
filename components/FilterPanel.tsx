import React from 'react';
import { SidePanel } from './SidePanel.tsx';
import { XMarkIcon } from './icons.tsx';

export type FilterValue = string | { start: string; end: string };

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterConfig {
    name: string;
    label: string;
    type: 'select' | 'text' | 'date-range';
    options?: FilterOption[];
    placeholder?: string;
}

interface FilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    filters: Record<string, FilterValue>;
    onFilterChange: (name: string, value: FilterValue) => void;
    filterConfig: FilterConfig[];
    onClearAll: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    isOpen,
    onClose,
    filters,
    onFilterChange,
    filterConfig,
    onClearAll,
}) => {

    const renderFilter = (config: FilterConfig) => {
        const { name, label, type, options, placeholder } = config;
        const value = filters[name];

        switch (type) {
            case 'select':
                return (
                    <div key={name}>
                        <label htmlFor={name} className="block text-sm font-medium text-slate-300">{label}</label>
                        <select
                            id={name}
                            value={value as string || ''}
                            onChange={(e) => onFilterChange(name, e.target.value)}
                            className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                );
            case 'text':
                return (
                     <div key={name}>
                        <label htmlFor={name} className="block text-sm font-medium text-slate-300">{label}</label>
                        <input
                            type="text"
                            id={name}
                            value={value as string || ''}
                            onChange={(e) => onFilterChange(name, e.target.value)}
                            placeholder={placeholder}
                            className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                );
            case 'date-range':
                const dateValue = value as { start: string, end: string } || { start: '', end: '' };
                return (
                    <div key={name}>
                        <label className="block text-sm font-medium text-slate-300">{label}</label>
                        <div className="flex items-center gap-2 mt-1">
                             <input
                                type="date"
                                value={dateValue.start}
                                onChange={(e) => onFilterChange(name, { ...dateValue, start: e.target.value })}
                                className="block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <span className="text-slate-400">to</span>
                            <input
                                type="date"
                                value={dateValue.end}
                                onChange={(e) => onFilterChange(name, { ...dateValue, end: e.target.value })}
                                className="block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Filters"
            size="md"
            footer={
                 <>
                    <button type="button" onClick={onClearAll} className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                        Clear All
                    </button>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md">
                            Done
                        </button>
                    </div>
                </>
            }
        >
            <div className="space-y-6">
                {filterConfig.map(renderFilter)}
            </div>
        </SidePanel>
    );
};