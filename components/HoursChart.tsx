import React from 'react';
// FIX: Corrected import path for the TechnicianHours type by adding the file extension.
import { TechnicianHours } from './PersonnelDashboard.tsx';

interface HoursChartProps {
    data: TechnicianHours[];
}

export const HoursChart: React.FC<HoursChartProps> = React.memo(({ data }) => {
    const maxHours = Math.max(...data.map(d => d.totalHours), 10); // Ensure max is at least 10 to avoid huge bars for small numbers

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
            <div className="flex justify-end gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-cyan-400 rounded-sm"></div>
                    <span className="text-xs text-slate-300">Total Hours</span>
                </div>
                 <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-indigo-400 rounded-sm"></div>
                    <span className="text-xs text-slate-300">Billable Hours</span>
                </div>
            </div>
            <div className="flex gap-4 items-end h-96 border-b-2 border-slate-600 pb-2">
                {data.map(tech => (
                    <div key={tech.technicianId} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full flex justify-center items-end gap-1 h-full">
                            {/* Total Hours Bar */}
                            <div 
                                className="w-1/2 bg-cyan-400 rounded-t-md transition-all duration-500 hover:bg-cyan-300"
                                style={{ height: `${(tech.totalHours / maxHours) * 100}%` }}
                                title={`Total: ${tech.totalHours.toFixed(2)} hrs`}
                            ></div>
                            {/* Billable Hours Bar */}
                            <div 
                                className="w-1/2 bg-indigo-400 rounded-t-md transition-all duration-500 hover:bg-indigo-300"
                                style={{ height: `${(tech.billableHours / maxHours) * 100}%` }}
                                title={`Billable: ${tech.billableHours.toFixed(2)} hrs`}
                            ></div>
                        </div>
                        <span className="text-xs text-slate-400 group-hover:text-white transition-colors truncate w-full text-center">{tech.technicianName}</span>
                    </div>
                ))}
                 {data.length === 0 && <p className="w-full text-center text-slate-500">No hour data available.</p>}
            </div>
        </div>
    );
});