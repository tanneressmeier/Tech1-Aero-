import React, { useState } from 'react';
// FIX: Corrected import paths for types, services, and components by adding file extensions.
import { Aircraft, StagedWorkOrder, StagedTool, StagedConsumable } from '../types.ts';
import { cleanAndValidateDataWithAI } from '../services/geminiService.ts';
import { CircleStackIcon, ArrowUpTrayIcon } from './icons.tsx';
import { HISTORICAL_WO_CSV } from '../data/historical_wo.csv.ts';
import { HISTORICAL_TOOLS_CSV } from '../data/historical_tools.csv.ts';
import { HISTORICAL_CONSUMABLES_CSV } from '../data/historical_consumables.csv.ts';


interface DataMigrationDashboardProps {
    aircraftList: Aircraft[];
    onImportData: (dataType: DataType, data: StagedData[]) => void;
}

type DataType = 'workOrders' | 'tooling' | 'consumables';
type StagedData = StagedWorkOrder | StagedTool | StagedConsumable;

export const DataMigrationDashboard: React.FC<DataMigrationDashboardProps> = ({ aircraftList, onImportData }) => {
    const [stagedData, setStagedData] = useState<Record<DataType, StagedData[]>>({
        workOrders: [],
        tooling: [],
        consumables: [],
    });
    const [isLoading, setIsLoading] = useState<Record<DataType, boolean>>({
        workOrders: false,
        tooling: false,
        consumables: false,
    });
    const [error, setError] = useState<Record<DataType, string | null>>({
        workOrders: null,
        tooling: null,
        consumables: null,
    });
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, dataType: DataType) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(prev => ({ ...prev, [dataType]: true }));
        setError(prev => ({ ...prev, [dataType]: null }));

        try {
            const csvText = await file.text();
            const result = await cleanAndValidateDataWithAI(csvText, dataType, aircraftList);
            setStagedData(prev => ({ ...prev, [dataType]: result.records as StagedData[] }));
        } catch (err: any) {
            setError(prev => ({ ...prev, [dataType]: err.message || 'An error occurred during processing.' }));
        } finally {
            setIsLoading(prev => ({ ...prev, [dataType]: false }));
            if(event.target) event.target.value = ''; // Reset file input
        }
    };

    const downloadTemplate = (dataType: DataType) => {
        let content = '';
        let filename = '';
        if (dataType === 'workOrders') {
            content = HISTORICAL_WO_CSV;
            filename = 'work_orders_template.csv';
        } else if (dataType === 'tooling') {
            content = HISTORICAL_TOOLS_CSV;
            filename = 'tooling_template.csv';
        } else {
            content = HISTORICAL_CONSUMABLES_CSV;
            filename = 'consumables_template.csv';
        }

        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleCommitData = (dataType: DataType) => {
        const dataToCommit = stagedData[dataType].filter(
            d => d.validationStatus === 'valid' || d.validationStatus === 'needs_review'
        );
        if (dataToCommit.length > 0) {
            onImportData(dataType, dataToCommit);
            setStagedData(prev => ({ ...prev, [dataType]: [] })); // Clear after commit
        } else {
            alert('No valid data to import.');
        }
    };

    const renderTable = (dataType: DataType) => {
        const data = stagedData[dataType];
        const loading = isLoading[dataType];
        const err = error[dataType];

        const getStatusColor = (status: string) => {
            switch (status) {
                case 'valid': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                case 'invalid': return 'bg-red-500/10 text-red-400 border border-red-500/20';
                case 'needs_review': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                default: return 'bg-slate-500/10 text-slate-300';
            }
        };

        return (
            <div className="glass-panel rounded-xl overflow-hidden border border-white/5">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-light text-white uppercase tracking-wide">{dataType.replace(/([A-Z])/g, ' $1')}</h3>
                    <div className="flex gap-3">
                        <button onClick={() => downloadTemplate(dataType)} className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">Download Template</button>
                        <label className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500/50 font-medium py-2 px-4 rounded-lg text-sm transition-all duration-300 cursor-pointer">
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            Upload CSV
                            <input type="file" accept=".csv" onChange={(e) => handleFileChange(e, dataType)} className="hidden" />
                        </label>
                    </div>
                </div>
                {loading && <p className="text-center p-12 text-slate-400 font-mono animate-pulse">Processing data with AI...</p>}
                {err && <div className="bg-red-500/10 text-red-300 p-4 m-6 rounded-lg border border-red-500/20">{err}</div>}
                {!loading && data.length > 0 && (
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 sticky top-0">
                                <tr>
                                    {Object.keys(data[0]).map(key => <th key={key} className="p-4 text-xs font-mono font-medium text-slate-400 uppercase tracking-wider capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.map((row, index) => (
                                    <tr key={index} className="hover:bg-white/5 transition-colors">
                                        {Object.entries(row).map(([key, value]) => (
                                            <td key={key} className="p-4 whitespace-nowrap text-slate-300">
                                                {/* FIX: Safely render cell content, handling arrays explicitly to satisfy ReactNode type. */}
                                                {key === 'validationStatus' ? (
                                                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(value as string)}`}>{value as string}</span>
                                                ) : (
                                                    Array.isArray(value) ? value.join(', ') : String(value)
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                 {!loading && data.length > 0 && (
                    <div className="p-6 border-t border-white/5 flex justify-end">
                        <button
                            onClick={() => handleCommitData(dataType)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500/50 font-bold py-2 px-6 rounded-lg transition-all duration-300"
                        >
                            Commit {data.filter(d => d.validationStatus !== 'invalid').length} Valid Records
                        </button>
                    </div>
                )}
                {!loading && data.length === 0 && !err && <p className="text-center text-slate-500 p-12 font-mono uppercase tracking-widest text-sm">Upload a CSV file to begin validation</p>}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 mb-8">
                <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                    <div className="p-3 bg-white/5 rounded-lg text-emerald-400 border border-white/10">
                        <CircleStackIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-light tracking-wide text-white uppercase">Data Migration Hub</h2>
                        <p className="text-slate-400 mt-2 max-w-3xl">
                            Upload legacy CSV data. Our AI assistant will automatically parse, clean, and validate records before import.
                        </p>
                    </div>
                </div>
            </div>
            
            <div className="space-y-8">
                {renderTable('workOrders')}
                {renderTable('tooling')}
                {renderTable('consumables')}
            </div>
        </div>
    );
};