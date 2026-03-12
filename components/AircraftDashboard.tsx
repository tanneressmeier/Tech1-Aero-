
import React, { useState } from 'react';
// FIX: Corrected import path for types by adding the file extension.
import { Aircraft, OptimizedSchedule, WorkOrder, OptimizedVisit, MaintenanceForecast, Technician, ADCompliance } from '../types.ts';
// FIX: Added .tsx extension to component imports.
import { MaintenanceSchedule } from './MaintenanceSchedule.tsx';
// FIX: Added .tsx extension to component import.
import { PlaneIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, ShieldCheckIcon, ExclamationTriangleIcon, CheckBadgeIcon, ArrowUpTrayIcon } from './icons.tsx';
import { Logbook } from './Logbook.tsx';
import { fetchAircraftADs } from '../services/geminiService.ts';
import { useToast } from '../contexts/ToastContext.tsx';

interface AircraftDashboardProps {
  aircraftList: Aircraft[];
  schedules: Record<string, OptimizedSchedule | null>;
  forecasts: Record<string, MaintenanceForecast | null>;
  onScheduleGenerated: (aircraftId: string, schedule: OptimizedSchedule | null) => void;
  workOrders: WorkOrder[];
  onCreateWorkOrder: (aircraft: Aircraft, visit: OptimizedVisit) => void;
  onUpdateAircraft: (aircraft: Aircraft) => void;
  onAnalyzeHistory: (aircraft: Aircraft) => void;
  isAnalyzing: boolean;
  technicians: Technician[];
}

const AircraftCard: React.FC<{ 
    aircraft: Aircraft, 
    isSelected: boolean,
    onSelect: () => void 
}> = ({ aircraft, isSelected, onSelect }) => {
    return (
        <div
            onClick={onSelect}
            className={`relative group bg-white/5 backdrop-blur-sm rounded-2xl cursor-pointer border transition-all duration-500 overflow-hidden h-64 flex flex-col justify-end shadow-xl ${
                isSelected 
                ? 'border-sky-500/50 shadow-[0_0_30px_rgba(14,165,233,0.3)] ring-1 ring-sky-500/50' 
                : 'border-white/5 hover:border-white/30 hover:scale-[1.02]'
            }`}
        >
            {/* Background Image with Gradient Overlay */}
            {aircraft.imageUrl ? (
                <>
                    <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url(${aircraft.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/70 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-80"></div>
                </>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 opacity-50"></div>
            )}

            {/* Selection Indicator Line */}
            <div className={`absolute top-0 left-0 h-1 w-full z-20 transition-all duration-500 ${isSelected ? 'bg-sky-500' : 'bg-transparent group-hover:bg-sky-500/50'}`}></div>

            {/* Content */}
            <div className="relative z-10 p-6">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs font-mono text-sky-400 uppercase tracking-widest mb-1">{aircraft.make}</p>
                        <h3 className="text-3xl font-light text-white tracking-wide">{aircraft.tail_number}</h3>
                        <p className="text-sm font-medium text-slate-300 uppercase tracking-wider mt-1">{aircraft.model}</p>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] font-mono text-slate-400 uppercase">Total Time</span>
                        <span className="block text-xl font-mono text-white tracking-tight">{aircraft.hours_total.toLocaleString(undefined, {minimumFractionDigits: 1})}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

const ADComplianceTable: React.FC<{ ads: ADCompliance[] }> = ({ ads }) => {
    const isUrgent = (ad: ADCompliance) => {
        if (ad.compliance_status !== 'Open' || !ad.due_date) return false;
        const due = new Date(ad.due_date);
        const today = new Date();
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
    };

    if (!ads || ads.length === 0) {
        return (
            <div className="p-6 text-center text-slate-500 text-sm font-mono uppercase tracking-widest border-t border-slate-700">
                No Airworthiness Directives recorded.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50">
                    <tr>
                        <th className="p-3 pl-6 font-mono text-slate-400 uppercase text-xs tracking-wider">AD Number</th>
                        <th className="p-3 font-mono text-slate-400 uppercase text-xs tracking-wider">Effective</th>
                        <th className="p-3 font-mono text-slate-400 uppercase text-xs tracking-wider">Subject</th>
                        <th className="p-3 font-mono text-slate-400 uppercase text-xs tracking-wider">Status</th>
                        <th className="p-3 pr-6 font-mono text-slate-400 uppercase text-xs tracking-wider text-right">Due Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {ads.map((ad, index) => {
                        const urgent = isUrgent(ad);
                        return (
                            <tr key={index} className={`transition-colors ${urgent ? 'bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-white/5'}`}>
                                <td className={`p-3 pl-6 font-medium ${urgent ? 'text-red-400' : 'text-slate-300'}`}>
                                    {ad.url ? (
                                        <a href={ad.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                            {ad.ad_number}
                                            <span className="text-[10px] text-slate-500">↗</span>
                                        </a>
                                    ) : (
                                        ad.ad_number
                                    )}
                                </td>
                                <td className="p-3 text-slate-400">{ad.effective_date}</td>
                                <td className="p-3 text-slate-300">{ad.subject}</td>
                                <td className="p-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                                        ad.compliance_status === 'Complied' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : urgent
                                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    }`}>
                                        {ad.compliance_status === 'Complied' ? <CheckBadgeIcon className="w-3 h-3"/> : <ExclamationTriangleIcon className="w-3 h-3"/>}
                                        {ad.compliance_status}
                                    </span>
                                </td>
                                <td className={`p-3 pr-6 text-right font-mono ${urgent ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                                    {ad.due_date || '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export const AircraftDashboard: React.FC<AircraftDashboardProps> = ({ 
    aircraftList, 
    schedules, 
    forecasts,
    onScheduleGenerated,
    workOrders,
    onCreateWorkOrder,
    onUpdateAircraft,
    onAnalyzeHistory,
    isAnalyzing,
    technicians,
}) => {
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(aircraftList.length > 0 ? aircraftList[0].id : null);
  const [isLogbookExpanded, setIsLogbookExpanded] = useState(false);
  const [isFetchingADs, setIsFetchingADs] = useState(false);
  const { showToast } = useToast();

  const selectedAircraft = aircraftList.find(ac => ac.id === selectedAircraftId);
  const selectedAircraftSchedule = selectedAircraft ? schedules[selectedAircraft.id] || null : null;
  const selectedAircraftForecast = selectedAircraft ? forecasts[selectedAircraft.id] || null : null;

  const handleSyncADs = async () => {
      if (!selectedAircraft) return;
      setIsFetchingADs(true);
      try {
          const ads = await fetchAircraftADs(selectedAircraft.make, selectedAircraft.model, selectedAircraft.serial_number);
          // Merge with existing ADs to avoid duplicates (naive check by AD number)
          const existingADs = selectedAircraft.ad_compliance || [];
          const existingAdNumbers = new Set(existingADs.map(ad => ad.ad_number));
          const newADs = ads.filter(ad => !existingAdNumbers.has(ad.ad_number));
          
          if (newADs.length === 0) {
              showToast({ message: 'No new ADs found. System is up to date.', type: 'info' });
          } else {
              const updatedAircraft = {
                  ...selectedAircraft,
                  ad_compliance: [...newADs, ...existingADs].sort((a,b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())
              };
              onUpdateAircraft(updatedAircraft);
              showToast({ message: `Found ${newADs.length} new Airworthiness Directives.`, type: 'success' });
          }
      } catch (error: any) {
          showToast({ message: error.message || 'Failed to fetch ADs', type: 'error' });
      } finally {
          setIsFetchingADs(false);
      }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b border-white/5 pb-6">
        <div>
            <h2 className="text-3xl font-light tracking-wide text-white uppercase">Fleet Status</h2>
            <p className="text-sm text-slate-400 mt-2 font-mono">Managed Assets & Maintenance Planning</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aircraftList.map(aircraft => (
          <AircraftCard 
            key={aircraft.id} 
            aircraft={aircraft}
            isSelected={aircraft.id === selectedAircraftId}
            onSelect={() => setSelectedAircraftId(aircraft.id)}
          />
        ))}
      </div>

      {selectedAircraft ? (
        <div className="mt-10 bg-[#0B0F17] rounded-3xl overflow-hidden border border-white/10 shadow-2xl animate-fade-in-up relative">
           
           {/* Hero Image Section for Detail View */}
           {selectedAircraft.imageUrl && (
               <div className="h-64 relative">
                   <div 
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${selectedAircraft.imageUrl})`, backgroundPosition: 'center 40%' }}
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/60 to-transparent"></div>
               </div>
           )}

           <div className={`p-8 relative ${selectedAircraft.imageUrl ? '-mt-20' : ''}`}>
               <div className="pb-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div>
                      <div className="flex items-center gap-4 mb-2">
                        <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold uppercase tracking-wider border border-sky-500/20">Active Fleet</span>
                        <span className="text-slate-400 text-xs font-mono uppercase tracking-widest">S/N: {selectedAircraft.serial_number}</span>
                      </div>
                      <h2 className="text-5xl font-thin text-white tracking-widest">{selectedAircraft.tail_number}</h2>
                      <p className="text-white/80 text-xl font-light tracking-wide mt-2">{selectedAircraft.make.toUpperCase()} {selectedAircraft.model.toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="text-right px-6 py-3 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                          <p className="text-xs font-mono text-slate-400 uppercase mb-1">Current Hours</p>
                          <p className="text-3xl font-mono text-white font-medium">{selectedAircraft.hours_total.toLocaleString()}</p>
                      </div>
                  </div>
                </div>
                
                <div className="py-8 border-b border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-light text-white uppercase tracking-wider flex items-center gap-3">
                            Digital Logbook
                            <span className="text-xs font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-white/5">{selectedAircraft.logbook_entries.length} Entries</span>
                        </h3>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={(e) => { e.stopPropagation(); onAnalyzeHistory(selectedAircraft); }}
                                disabled={isAnalyzing}
                                className="group relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white transition-all duration-300 bg-indigo-600/20 border border-indigo-500/50 rounded hover:bg-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                            >
                                <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-white rounded-full group-hover:w-56 group-hover:h-56 opacity-5"></span>
                                {isAnalyzing ? (
                                    <span className="relative flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Analyzing Data...
                                    </span>
                                ) : (
                                    <span className="relative flex items-center gap-2">
                                        <SparklesIcon className="w-4 h-4 text-indigo-400"/>
                                        Analyze History
                                    </span>
                                )}
                            </button>
                            
                            <button
                                onClick={() => setIsLogbookExpanded(!isLogbookExpanded)}
                                className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
                            >
                                {isLogbookExpanded ? <ChevronUpIcon className="w-6 h-6" /> : <ChevronDownIcon className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>

                    {isLogbookExpanded && (
                        <div className="animate-fade-in-up bg-white/5 rounded-xl p-4 border border-white/5">
                            <Logbook aircraft={selectedAircraft} onUpdateAircraft={onUpdateAircraft} technicians={technicians} />
                        </div>
                    )}
                </div>

                {/* AD Compliance Section */}
                <div className="py-8 border-b border-white/5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-light text-white uppercase tracking-wider flex items-center gap-3">
                            <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />
                            AD Compliance
                        </h3>
                        <button
                            onClick={handleSyncADs}
                            disabled={isFetchingADs}
                            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium py-2 px-4 rounded-lg text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isFetchingADs ? (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <ArrowUpTrayIcon className="w-4 h-4"/>
                            )}
                            {isFetchingADs ? 'Checking DRS...' : 'Check FAA DRS'}
                        </button>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700">
                        <ADComplianceTable ads={selectedAircraft.ad_compliance || []} />
                    </div>
                </div>

                <MaintenanceSchedule 
                    aircraft={selectedAircraft}
                    optimizedSchedule={selectedAircraftSchedule}
                    forecast={selectedAircraftForecast}
                    onScheduleGenerated={onScheduleGenerated}
                    allSchedules={schedules}
                    workOrders={workOrders}
                    onCreateWorkOrder={onCreateWorkOrder}
                />
           </div>
        </div>
      ) : (
        <div className="mt-20 text-center">
          <p className="text-slate-500 font-light text-xl">Select an aircraft from the fleet to view details.</p>
        </div>
      )}
    </div>
  );
};
