import React, { useState } from 'react';
import { MagnifyingGlassIcon, SparklesIcon } from './icons.tsx';

interface GlobalSearchBarProps {
    onSearch: (query: string) => void;
    isSearching: boolean;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ onSearch, isSearching }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                {isSearching ? (
                     <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                )}
            </div>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isSearching}
                placeholder="Ask AI to find anything..."
                className="block w-full rounded-md border-0 bg-slate-700 py-2.5 pl-10 pr-12 text-slate-200 ring-1 ring-inset ring-slate-600 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
            />
            <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
                <kbd className="inline-flex items-center rounded border border-slate-500 px-2 font-sans text-xs text-slate-400">
                    <SparklesIcon className="w-3 h-3 mr-1 text-cyan-400"/> AI
                </kbd>
            </div>
        </form>
    );
};