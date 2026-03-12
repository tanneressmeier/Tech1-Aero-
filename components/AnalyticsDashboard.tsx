import React, { useState, useMemo } from 'react';
import { Technician, TimeLog, WorkOrder, RepairOrder, Aircraft, InventoryItem } from '../types.ts';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { DashboardHeader } from './DashboardHeader.tsx';
import { ChartPieIcon } from './icons.tsx';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

interface AnalyticsDashboardProps {
    technicians: Technician[];
    generalTimeLogs: TimeLog[];
    workOrders: WorkOrder[];
    repairOrders: RepairOrder[];
    aircraftList: Aircraft[];
    partsInventory: InventoryItem[];
}

type DateRange = '30d' | '90d' | 'all';

// Define a few high-use parts to track for the trend chart
const HIGH_USE_PART_IDS = ['part-1', 'part-2'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    technicians,
    generalTimeLogs,
    workOrders,
    repairOrders,
    aircraftList,
    partsInventory
}) => {
    const [dateRange, setDateRange] = useState<DateRange>('30d');

    const getDateCutoff = (range: DateRange): Date | null => {
        if (range === 'all') return null;
        const cutoff = new Date();
        const days = range === '30d' ? 30 : 90;
        cutoff.setDate(cutoff.getDate() - days);
        return cutoff;
    };

    const techHoursData = useMemo(() => {
        const cutoff = getDateCutoff(dateRange);
        const relevantLogs = generalTimeLogs.filter(log => !cutoff || new Date(log.start_time) >= cutoff);

        const hoursMap: Record<string, { total: number, billable: number }> = {};
        technicians.forEach(t => hoursMap[t.id] = { total: 0, billable: 0 });

        relevantLogs.forEach(log => {
            if (log.end_time && hoursMap[log.technician_id]) {
                const duration = (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / (1000 * 60 * 60);
                hoursMap[log.technician_id].total += duration;
                if (log.is_billable) {
                    hoursMap[log.technician_id].billable += duration;
                }
            }
        });
        
        const labels = technicians.map(t => t.name);
        const totalHours = technicians.map(t => hoursMap[t.id].total);
        const billableHours = technicians.map(t => hoursMap[t.id].billable);

        return {
            labels,
            datasets: [
                { label: 'Total Hours', data: totalHours, backgroundColor: 'rgba(56, 189, 248, 0.6)' },
                { label: 'Billable Hours', data: billableHours, backgroundColor: 'rgba(139, 92, 246, 0.6)' }
            ]
        };
    }, [technicians, generalTimeLogs, dateRange]);

    const fleetStatusData = useMemo(() => {
        const inMaintenanceIds = new Set(
            [...workOrders, ...repairOrders]
                .filter(o => o.status === 'In Progress' || o.status === 'Pending')
                .map(o => o.aircraft_id)
        );
        const inMaintenanceCount = inMaintenanceIds.size;
        const airworthyCount = aircraftList.length - inMaintenanceCount;
        
        return {
            labels: ['Airworthy', 'In Maintenance'],
            datasets: [{
                data: [airworthyCount, inMaintenanceCount],
                backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)'],
                borderColor: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)'],
            }]
        };
    }, [aircraftList, workOrders, repairOrders]);

    const partsConsumptionData = useMemo(() => {
        const allSquawks = [...workOrders, ...repairOrders].flatMap(o => o.squawks.map(s => ({...s, order_date: 'scheduled_date' in o ? o.scheduled_date : o.created_date})));
        
        const consumptionByMonth: Record<string, Record<string, number>> = {};
        
        allSquawks.forEach(squawk => {
            squawk.used_parts.forEach(part => {
                if(HIGH_USE_PART_IDS.includes(part.inventory_item_id)){
                    const month = new Date(squawk.order_date).toISOString().slice(0, 7); // YYYY-MM
                    if(!consumptionByMonth[month]) consumptionByMonth[month] = {};
                    consumptionByMonth[month][part.inventory_item_id] = (consumptionByMonth[month][part.inventory_item_id] || 0) + part.quantity_used;
                }
            });
        });

        const sortedMonths = Object.keys(consumptionByMonth).sort();
        const labels = sortedMonths.map(m => new Date(m + '-02').toLocaleString('default', { month: 'short', year: '2-digit' }));

        const datasets = HIGH_USE_PART_IDS.map((partId, index) => {
            const partInfo = partsInventory.find(p => p.id === partId);
            const colors = ['rgba(56, 189, 248, 0.7)', 'rgba(236, 72, 153, 0.7)'];
            return {
                label: partInfo?.description || partId,
                data: sortedMonths.map(month => consumptionByMonth[month][partId] || 0),
                borderColor: colors[index % colors.length],
                tension: 0.4
            }
        });

        return { labels, datasets };

    }, [workOrders, repairOrders, partsInventory]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#94a3b8' } },
            title: { display: false }
        },
        scales: {
            x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
            y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        }
    };

    return (
        <div className="space-y-8">
            <DashboardHeader icon={<ChartPieIcon className="w-8 h-8 text-cyan-400"/>} title="Analytics Dashboard">
                <select 
                    value={dateRange} 
                    onChange={e => setDateRange(e.target.value as DateRange)} 
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                    <option value="30d" className="bg-slate-900">Last 30 Days</option>
                    <option value="90d" className="bg-slate-900">Last 90 Days</option>
                    <option value="all" className="bg-slate-900">All Time</option>
                </select>
            </DashboardHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hours Chart */}
                <div className="glass-panel rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-light text-white uppercase tracking-wider mb-6">Technician Hours</h3>
                    <div className="h-80">
                        <Bar options={chartOptions as any} data={techHoursData} />
                    </div>
                </div>

                {/* Fleet Status Chart */}
                <div className="glass-panel rounded-xl p-6 border border-white/5">
                    <h3 className="text-lg font-light text-white uppercase tracking-wider mb-6">Fleet Status Breakdown</h3>
                    <div className="h-80 flex items-center justify-center">
                        <Doughnut data={fleetStatusData} options={{...chartOptions, plugins: {...chartOptions.plugins, legend: {...chartOptions.plugins.legend, position: 'right'}}}} />
                    </div>
                </div>

                 {/* Parts Consumption Chart */}
                <div className="glass-panel rounded-xl p-6 border border-white/5 lg:col-span-2">
                    <h3 className="text-lg font-light text-white uppercase tracking-wider mb-6">High-Use Parts Consumption Trend</h3>
                    <div className="h-80">
                       <Line options={chartOptions as any} data={partsConsumptionData} />
                    </div>
                </div>
            </div>
        </div>
    );
};