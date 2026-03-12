import React, { useState, useCallback } from 'react';
// FIX: Corrected import paths for types and services by adding file extensions.
import { Aircraft, MaintenanceEvent, OptimizedSchedule, OptimizedVisit, WorkOrder, MaintenanceForecast } from '../types.ts';
import { generateOptimalSchedule } from '../services/geminiService.ts';
// FIX: Added .tsx extension to component import.
import { WrenchIcon, CalendarIcon, SparklesIcon, BuildingOfficeIcon, ClipboardListIcon } from './icons.tsx';
import { MaintenanceForecastDisplay } from './MaintenanceForecastDisplay.tsx';

interface MaintenanceScheduleProps {
  aircraft: Aircraft;
  optimizedSchedule: OptimizedSchedule | null;
  forecast: MaintenanceForecast | null;
  onScheduleGenerated: (aircraftId: string, schedule: OptimizedSchedule | null) => void;
  allSchedules: Record<string, OptimizedSchedule | null>;
  workOrders: WorkOrder[];
  onCreateWorkOrder: (aircraft: Aircraft, visit: OptimizedVisit) => void;
}

const EventCard: React.FC<{ event: MaintenanceEvent }> = ({ event }) => {
    const isHourly = event.intervalType === 'hours';
    const lastPerformed = isHourly ? `${event.lastPerformedHours} hrs` : event.lastPerformedDate;
    
    return (
        <div className="bg-slate-800 rounded-lg p-4 flex flex-col justify-between">
            <div>
                <h4 className="font-bold text-cyan-400">{event.name}</h4>
                <p className="text-sm text-slate-400 mt-1">
                    Every {event.intervalValue} {event.intervalType}
                </p>
                <p className="text-sm text-slate-400">Last done: {lastPerformed}</p>
                 <p className="text-sm text-slate-400">Man Hours: {event.manHours}</p>
            </div>
        </div>
    );
};

const OptimizedScheduleDisplay: React.FC<{ 
    schedule: OptimizedSchedule,
    aircraft: Aircraft,
    workOrders: WorkOrder[],
    onCreateWorkOrder: (aircraft: Aircraft, visit: OptimizedVisit) => void;
}> = ({ schedule, aircraft, workOrders, onCreateWorkOrder }) => {
    if (!schedule.schedule || schedule.schedule.length === 0) {
        return <p className="text-center text-slate-400 mt-4">No optimized schedule generated.</p>;
    }

    const existingWOs = new Set(workOrders.filter(wo => wo.aircraft_id === aircraft.id).map(wo => `${wo.visit_name}|${wo.scheduled_date}`));
    const hasExistingWO = (visit: OptimizedVisit) => existingWOs.has(`${visit.visitName}|${visit.scheduledDate}`);

    return (
        <div className="space-y-6 mt-6">
            {schedule.schedule.map((visit, index) => (
                <div key={index} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <h4 className="text-xl font-bold text-cyan-300">{visit.visitName}</h4>
                            <div className="flex flex-col sm:flex-row sm:gap-4">
                                <p className="text-slate-400 flex items-center gap-2 mt-1">
                                    <CalendarIcon className="w-4 h-4" />
                                    Scheduled: {new Date(visit.scheduledDate).toLocaleDateString()}
                                </p>
                                 <p className="text-slate-400 flex items-center gap-2 mt-1">
                                    <BuildingOfficeIcon className="w-4 h-4" />
                                    Hangar: {visit.hangarAssignment}
                                </p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0 mt-4 sm:mt-0">
                           <p className="text-lg font-semibold whitespace-nowrap">{visit.totalManHours} Man-Hours</p>
                           <button 
                             onClick={() => onCreateWorkOrder(aircraft, visit)}
                             disabled={hasExistingWO(visit)}
                             className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 text-sm"
                           >
                                <ClipboardListIcon className="w-4 h-4" />
                                {hasExistingWO(visit) ? 'WO Created' : 'Create Work Order'}
                           </button>
                        </div>
                    </div>
                    <div className="mt-4 border-t border-slate-700 pt-4">
                        <h5 className="font-semibold text-slate-300 mb-2">Tasks in this visit:</h5>
                        <ul className="list-disc list-inside space-y-1 text-slate-400">
                            {visit.events.map((event, i) => (
                                <li key={i}>
                                    <span className="font-medium text-slate-300">{event.eventName}</span> - <span className="italic">{event.reasonForScheduling}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                     {visit.requiredTooling.length > 0 && (
                        <div className="mt-4 border-t border-slate-700 pt-4">
                            <h5 className="font-semibold text-slate-300 mb-2">Required Tooling:</h5>
                            <p className="text-slate-400 text-sm">{visit.requiredTooling.join(', ')}</p>
                        </div>
                    )}
                     {visit.requiredConsumables.length > 0 && (
                        <div className="mt-4 border-t border-slate-700 pt-4">
                            <h5 className="font-semibold text-slate-300 mb-2">Required Consumables:</h5>
                            <p className="text-slate-400 text-sm">{visit.requiredConsumables.join(', ')}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


export const MaintenanceSchedule: React.FC<MaintenanceScheduleProps> = ({ 
    aircraft,
    optimizedSchedule,
    forecast,
    onScheduleGenerated,
    allSchedules,
    workOrders,
    onCreateWorkOrder
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimizeSchedule = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    onScheduleGenerated(aircraft.id, null);
    try {
      const result = await generateOptimalSchedule(aircraft, allSchedules);
      onScheduleGenerated(aircraft.id, result);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [aircraft, onScheduleGenerated, allSchedules]);

  return (
    <div className="mt-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <WrenchIcon className="w-7 h-7 text-cyan-400" />
            Maintenance Plan
        </h3>
        <button
          onClick={handleOptimizeSchedule}
          disabled={isLoading}
          className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-cyan-500/20"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Optimizing...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5"/>
              Optimize Schedule with AI
            </>
          )}
        </button>
      </div>

      {error && <div className="mt-4 bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg">{error}</div>}
      
      {forecast && <MaintenanceForecastDisplay forecast={forecast} />}
      
      {optimizedSchedule ? (
        <OptimizedScheduleDisplay 
            schedule={optimizedSchedule} 
            aircraft={aircraft} 
            workOrders={workOrders} 
            onCreateWorkOrder={onCreateWorkOrder}
        />
      ) : (
        <div className="mt-6">
            <h4 className="text-lg font-semibold text-slate-300 mb-3">Current Maintenance Items</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aircraft.maintenance_events.map(event => (
                <EventCard key={event.id} event={event} />
            ))}
            </div>
        </div>
      )}
    </div>
  );
};