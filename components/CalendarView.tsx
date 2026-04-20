
import React, { useState, useMemo, useRef } from 'react';
import { WorkOrder, RepairOrder, Technician } from '../types.ts';
import { CalendarEventModal } from './CalendarEventModal.tsx';
import { ChevronLeftIcon, ChevronRightIcon, UserGroupIcon, PlaneIcon, ChartPieIcon, BuildingOfficeIcon } from './icons.tsx';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, LineController } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getVacationDatesInRange } from '../utils/skillsEngine.ts';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, LineController);

interface CalendarViewProps {
    workOrders: WorkOrder[];
    repairOrders: RepairOrder[];
    technicians: Technician[];
    onSaveAssignments: (orderType: 'WO' | 'RO', orderId: string, technicianIds: string[]) => void;
    onUpdateOrder: (order: WorkOrder | RepairOrder) => void;
    onNavigateToOrder: (view: 'work_orders' | 'repair_orders', orderId: string, initialView?: 'list' | 'board' | 'gantt') => void;
}

type ViewMode = 'fleet' | 'personnel' | 'facility';
type TimeScale = 'month' | 'week';

const FACILITIES = [
    { id: 'Hangar 1', label: 'Hangar 1 (Main)' },
    { id: 'Hangar 2', label: 'Hangar 2 (Overflow)' },
    { id: 'Wash Bay', label: 'Wash Bay' },
    { id: 'Ramp', label: 'Ramp / Line' },
];

interface CalendarHeaderProps {
    currentDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    timeScale: TimeScale;
    onTimeScaleChange: (scale: TimeScale) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ 
    currentDate, onPrev, onNext, onToday,
    viewMode, onViewModeChange,
    timeScale, onTimeScaleChange
}) => (
    <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-6 pb-6 border-b border-white/5 gap-4">
        <div>
            <h2 className="text-3xl font-light tracking-wide text-white uppercase">
                {timeScale === 'month' 
                    ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
                    : `Week of ${currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                }
            </h2>
            <div className="flex items-center gap-4 mt-2">
                <button 
                    onClick={onPrev} 
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button 
                    onClick={onToday} 
                    className="text-xs font-mono font-medium text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
                >
                    Reset to Today
                </button>
                <button 
                    onClick={onNext} 
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                >
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
            </div>
        </div>

        <div className="flex gap-4">
            {/* View Mode Toggle */}
            <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex">
                <button
                    onClick={() => onViewModeChange('facility')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'facility' ? 'bg-sky-500/20 text-white shadow-sm ring-1 ring-sky-500/50' : 'text-slate-400 hover:text-white'}`}
                >
                    <BuildingOfficeIcon className="w-3 h-3" /> Facility
                </button>
                <button
                    onClick={() => onViewModeChange('fleet')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'fleet' ? 'bg-sky-500/20 text-white shadow-sm ring-1 ring-sky-500/50' : 'text-slate-400 hover:text-white'}`}
                >
                    <PlaneIcon className="w-3 h-3" /> Fleet
                </button>
                <button
                    onClick={() => onViewModeChange('personnel')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'personnel' ? 'bg-sky-500/20 text-white shadow-sm ring-1 ring-sky-500/50' : 'text-slate-400 hover:text-white'}`}
                >
                    <UserGroupIcon className="w-3 h-3" /> Personnel
                </button>
            </div>

            {/* Time Scale Toggle */}
            <div className="bg-white/5 p-1 rounded-lg border border-white/10 flex">
                <button
                    onClick={() => onTimeScaleChange('month')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeScale === 'month' ? 'bg-indigo-500/20 text-white shadow-sm ring-1 ring-indigo-500/50' : 'text-slate-400 hover:text-white'}`}
                >
                    Month
                </button>
                <button
                    onClick={() => onTimeScaleChange('week')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${timeScale === 'week' ? 'bg-indigo-500/20 text-white shadow-sm ring-1 ring-indigo-500/50' : 'text-slate-400 hover:text-white'}`}
                >
                    Week
                </button>
            </div>
        </div>
    </div>
);

export const CalendarView: React.FC<CalendarViewProps> = ({ workOrders, repairOrders, technicians, onSaveAssignments, onUpdateOrder, onNavigateToOrder }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('facility'); // Defaulting to facility view as requested
    const [timeScale, setTimeScale] = useState<TimeScale>('month');
    const [selectedOrder, setSelectedOrder] = useState<WorkOrder | RepairOrder | null>(null);
    const [draggedEvent, setDraggedEvent] = useState<{ id: string, type: 'WO' | 'RO', resourceId: string } | null>(null);

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (timeScale === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (timeScale === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    // --- Timeline Data Preparation ---

    const { dateRange, days } = useMemo(() => {
        const start = new Date(currentDate);
        const end = new Date(currentDate);
        
        if (timeScale === 'month') {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1, 0);
        } else {
            const day = currentDate.getDay();
            const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            start.setDate(diff);
            end.setDate(start.getDate() + 6);
        }
        // Normalize times
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        const daysArr = [];
        let d = new Date(start);
        while (d <= end) {
            daysArr.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }

        return { dateRange: { start, end }, days: daysArr };
    }, [currentDate, timeScale]);

    const resources = useMemo(() => {
        if (viewMode === 'facility') {
            return FACILITIES;
        } else if (viewMode === 'fleet') {
            const uniqueAircraft = Array.from(new Set([...workOrders, ...repairOrders].map(o => ({
                id: o.aircraft_id, 
                label: o.aircraft_tail_number
            }))));
            // De-duplicate by ID
            const seen = new Set();
            return uniqueAircraft.filter(a => {
                const duplicate = seen.has(a.id);
                seen.add(a.id);
                return !duplicate;
            }).sort((a, b) => a.label.localeCompare(b.label));
        } else {
            return technicians.map(t => ({ id: t.id, label: t.name }));
        }
    }, [viewMode, workOrders, repairOrders, technicians]);

    // --- Drag & Drop Handlers ---

    const handleDragStart = (e: React.DragEvent, orderId: string, type: 'WO' | 'RO', resourceId: string) => {
        setDraggedEvent({ id: orderId, type, resourceId });
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: orderId, type, resourceId }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDate: Date, targetResourceId: string) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;
        
        const { id, type, resourceId: originalResourceId } = JSON.parse(data);
        const newDateString = targetDate.toISOString().split('T')[0];

        // Find the order
        const orderList = type === 'WO' ? workOrders : repairOrders;
        const order = orderList.find((o: any) => (type === 'WO' ? o.wo_id : o.ro_id) === id);

        if (!order) return;

        let updatedOrder = { ...order };

        // 1. Update Date
        if (type === 'WO') {
            (updatedOrder as WorkOrder).scheduled_date = newDateString;
        } else {
            (updatedOrder as RepairOrder).created_date = newDateString;
        }

        // 2. Handle Resource Change
        if (viewMode === 'facility') {
            // Update Location Assignment
            if (updatedOrder.location !== targetResourceId) {
                updatedOrder.location = targetResourceId;
            }
        } else if (viewMode === 'fleet') {
            if (updatedOrder.aircraft_id !== targetResourceId) {
                updatedOrder.aircraft_id = targetResourceId;
            }
        } else {
            // Personnel Assignment Logic
            if (originalResourceId !== targetResourceId) {
                const newSquawks = updatedOrder.squawks.map(sq => {
                    const assigned = new Set(sq.assigned_technician_ids);
                    if (assigned.has(originalResourceId)) {
                        assigned.delete(originalResourceId);
                        assigned.add(targetResourceId);
                    } else if (assigned.size === 0) {
                        assigned.add(targetResourceId);
                    }
                    return { ...sq, assigned_technician_ids: Array.from(assigned) };
                });
                updatedOrder.squawks = newSquawks;
            }
        }

        onUpdateOrder(updatedOrder);
        setDraggedEvent(null);
    };

    // --- Capacity Chart Data ---
    const { capacityData, capacityOptions, maxCapacity } = useMemo(() => {
        const dates = days; // Reuse calculated days
        const dailyCapacity = technicians.reduce((sum, tech) => sum + (8 * (tech.efficiency ?? 0.85)), 0);

        const dailyLoad = dates.map(day => {
            let load = 0;
            [...workOrders, ...repairOrders].forEach(order => {
                const isWO = 'wo_id' in order;
                const orderStart = new Date((isWO ? order.scheduled_date : order.created_date) + 'T00:00:00');
                const totalHours = order.squawks.reduce((sum, sq) => sum + sq.hours_estimate, 0) || 8; 
                const durationDays = Math.ceil(totalHours / 8) || 1;
                const orderEnd = new Date(orderStart);
                orderEnd.setDate(orderStart.getDate() + durationDays - 1);

                const dTime = new Date(day).setHours(0,0,0,0);
                const sTime = orderStart.setHours(0,0,0,0);
                const eTime = orderEnd.setHours(0,0,0,0);

                if (dTime >= sTime && dTime <= eTime) {
                    load += (totalHours / durationDays);
                }
            });
            return load;
        });

        return {
            maxCapacity: parseFloat(dailyCapacity.toFixed(1)),
            capacityData: {
                labels: dates.map(d => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })),
                datasets: [
                    {
                        type: 'line' as const,
                        label: 'Max Billable Capacity',
                        data: Array(dates.length).fill(dailyCapacity),
                        borderColor: 'rgba(16, 185, 129, 0.5)',
                        borderWidth: 2,
                        pointRadius: 0,
                        borderDash: [5, 5],
                        fill: false,
                    },
                    {
                        type: 'bar' as const,
                        label: 'Scheduled Hours',
                        data: dailyLoad,
                        backgroundColor: dailyLoad.map(load => 
                            load > dailyCapacity ? 'rgba(239, 68, 68, 0.6)' : 
                            load > dailyCapacity * 0.8 ? 'rgba(245, 158, 11, 0.6)' : 
                            'rgba(56, 189, 248, 0.6)'
                        ),
                        borderRadius: 4,
                    }
                ]
            },
            capacityOptions: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, labels: { color: '#94a3b8' } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b' } },
                    x: { grid: { display: false }, ticks: { color: '#64748b' } }
                }
            }
        };
    }, [days, workOrders, repairOrders, technicians]);

    return (
        <div className="h-full flex flex-col gap-6">
            <CalendarHeader 
                currentDate={currentDate} 
                onPrev={handlePrev} 
                onNext={handleNext} 
                onToday={() => setCurrentDate(new Date())}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                timeScale={timeScale}
                onTimeScaleChange={setTimeScale}
            />
            
            {/* Main Scheduling Grid */}
            <div className="grid grid-rows-[3fr_1fr] gap-6 flex-grow overflow-hidden">
                <div className="glass-panel rounded-xl border border-white/5 flex flex-col overflow-hidden">
                    {/* Header Row */}
                    <div className="flex border-b border-white/10 bg-slate-900/50">
                        <div className="w-48 flex-shrink-0 p-3 border-r border-white/10 text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">
                            {viewMode === 'fleet' ? 'Aircraft' : viewMode === 'facility' ? 'Facility' : 'Technician'}
                        </div>
                        <div className="flex-grow flex overflow-hidden">
                            {days.map((day, i) => (
                                <div key={i} className={`flex-1 text-center py-3 border-r border-white/5 text-xs font-medium ${day.toDateString() === new Date().toDateString() ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400'}`}>
                                    <span className="block">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                    <span className="block font-bold">{day.getDate()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline Body */}
                    <div className="flex-grow overflow-y-auto">
                        {resources.map(resource => (
                            <div key={resource.id} className="flex border-b border-white/5 hover:bg-white/5 transition-colors relative group h-20">
                                <div className="w-48 flex-shrink-0 p-4 border-r border-white/10 text-sm font-medium text-white flex items-center">
                                    {resource.label}
                                </div>
                                <div className="flex-grow flex relative">
                                    {/* Grid Cells */}
                                    {days.map((day, i) => {
                                        // In personnel mode shade vacation days grey
                                        const isVacation = viewMode === 'personnel' && (() => {
                                            const tech = technicians.find(t => t.id === resource.id);
                                            if (!tech) return false;
                                            const ds = day.toISOString().split('T')[0];
                                            return (tech.vacation_dates ?? []).includes(ds);
                                        })();
                                        return (
                                            <div
                                                key={i}
                                                className={`flex-1 border-r border-white/5 h-full transition-colors relative ${draggedEvent ? 'hover:bg-indigo-500/10' : ''} ${isVacation ? 'bg-slate-600/20' : ''}`}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, day, resource.id)}
                                            >
                                                {isVacation && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest rotate-[-30deg] select-none">PTO</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Events Layer */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {[...workOrders, ...repairOrders].map(order => {
                                            // Determine if this order belongs on this row
                                            let belongs = false;
                                            if (viewMode === 'facility') {
                                                // Check location, default to Ramp if undefined
                                                const orderLocation = order.location || 'Ramp';
                                                belongs = orderLocation === resource.id;
                                            } else if (viewMode === 'fleet') {
                                                belongs = order.aircraft_id === resource.id;
                                            } else {
                                                // Personnel Mode
                                                belongs = order.squawks.some(sq => sq.assigned_technician_ids.includes(resource.id));
                                            }

                                            if (!belongs) return null;

                                            const isWO = 'wo_id' in order;
                                            const startDate = new Date((isWO ? order.scheduled_date : order.created_date) + 'T00:00:00');
                                            const totalHours = order.squawks.reduce((sum, sq) => sum + sq.hours_estimate, 0) || 8;
                                            const durationDays = Math.ceil(totalHours / 8) || 1;
                                            const endDate = new Date(startDate);
                                            endDate.setDate(startDate.getDate() + durationDays); // Exclusive for calc

                                            // Calculate position
                                            const viewStart = dateRange.start.getTime();
                                            const viewEnd = dateRange.end.getTime();
                                            const eventStart = startDate.getTime();
                                            const eventEnd = endDate.getTime(); // Actually need inclusive end for drawing

                                            // Check overlap
                                            if (eventEnd < viewStart || eventStart > viewEnd) return null;

                                            const dayMs = 24 * 60 * 60 * 1000;
                                            const totalViewDuration = viewEnd - viewStart + dayMs; // inclusive
                                            
                                            const relativeStart = Math.max(0, eventStart - viewStart);
                                            // const relativeEnd = Math.min(eventEnd - viewStart, totalViewDuration); 
                                            
                                            // More precise CSS % calculation
                                            const leftPercent = (relativeStart / totalViewDuration) * 100;
                                            const widthPercent = ((Math.min(eventEnd, viewEnd + dayMs) - Math.max(eventStart, viewStart)) / totalViewDuration) * 100;

                                            const statusColors: any = {
                                                'Pending':    'bg-slate-500',
                                                'In Progress':'bg-sky-500',
                                                'Completed':  'bg-emerald-500',
                                                'On Hold':    'bg-amber-500',
                                                'Cancelled':  'bg-red-500',
                                            };

                                            // In personnel mode: flag if the tech is on vacation during this order
                                            const hasVacationConflict = viewMode === 'personnel' && (() => {
                                                const tech = technicians.find(t => t.id === resource.id);
                                                if (!tech || !(tech.vacation_dates ?? []).length) return false;
                                                const oStart = new Date(startDate); oStart.setHours(0,0,0,0);
                                                const oEnd   = new Date(endDate);   oEnd.setHours(23,59,59,999);
                                                const vacDates = getVacationDatesInRange(tech, oStart, oEnd);
                                                return vacDates.length > 0;
                                            })();

                                            const colorClass = hasVacationConflict
                                                ? 'bg-red-600 ring-2 ring-red-400 ring-offset-1 ring-offset-transparent'
                                                : (statusColors[order.status] || 'bg-slate-500');

                                            return (
                                                <div
                                                    key={(isWO ? order.wo_id : order.ro_id) + resource.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, isWO ? order.wo_id : order.ro_id, isWO ? 'WO' : 'RO', resource.id)}
                                                    onClick={() => setSelectedOrder(order)}
                                                    className={`absolute top-2 bottom-2 rounded-md ${colorClass} bg-opacity-90 border border-white/20 shadow-md hover:brightness-110 cursor-grab active:cursor-grabbing pointer-events-auto flex items-center px-2 overflow-hidden whitespace-nowrap z-10 transition-all`}
                                                    style={{
                                                        left: `${leftPercent}%`,
                                                        width: `${Math.max(widthPercent, (100 / days.length))}%`,
                                                        minWidth: '20px'
                                                    }}
                                                    title={`${isWO ? order.wo_id : order.ro_id}: ${order.aircraft_tail_number}${hasVacationConflict ? ' ⚠ VACATION CONFLICT' : ''}`}
                                                >
                                                    <span className="text-xs font-bold text-white drop-shadow-md truncate">
                                                        {hasVacationConflict && '⚠ '}{order.aircraft_tail_number} | {isWO ? order.wo_id : order.ro_id}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel rounded-xl border border-white/5 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <ChartPieIcon className="w-4 h-4 text-cyan-400" />
                            Shop Capacity Analysis
                        </h4>
                        <span className="text-xs text-slate-500 font-mono">
                            ADJUSTED MAX CAPACITY: {maxCapacity} HRS/DAY (Billable)
                        </span>
                    </div>
                    <div className="flex-grow relative w-full">
                        <Bar options={capacityOptions as any} data={capacityData} />
                    </div>
                </div>
            </div>

            <CalendarEventModal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                order={selectedOrder}
                technicians={technicians}
                onSaveAssignments={onSaveAssignments}
                onUpdateOrder={onUpdateOrder}
                onNavigateToOrder={onNavigateToOrder}
            />
        </div>
    );
};
