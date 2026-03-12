
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { WorkOrder, Squawk } from '../types.ts';

interface SquawkGanttProps {
    workOrder: WorkOrder;
}

// Visual configuration constants
const PIXELS_PER_HOUR = 60; // 1 hour = 60px
const HOUR_MARKER_INTERVAL = 4; // Show a label every 4 hours
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 48;

interface TaskState {
    offsetHours: number; // Start time offset from WO start (0)
}

export const SquawkGantt: React.FC<SquawkGanttProps> = ({ workOrder }) => {
    // Local state to track task offsets (simulated start times)
    const [taskOffsets, setTaskOffsets] = useState<Record<string, number>>({});
    
    // Drag state
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [dragStartX, setDragStartX] = useState<number>(0);
    const [initialDragOffset, setInitialDragOffset] = useState<number>(0);
    
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize "Waterfall" schedule on mount or WO change
    useEffect(() => {
        let currentOffset = 0;
        const newOffsets: Record<string, number> = {};
        
        workOrder.squawks.forEach((squawk) => {
            newOffsets[squawk.squawk_id] = currentOffset;
            // Add duration to offset for the next task (sequential waterfall)
            // Minimum duration 1 hour for viz
            const duration = Math.max(squawk.hours_estimate || 1, 1);
            currentOffset += duration;
        });
        
        setTaskOffsets(newOffsets);
    }, [workOrder.wo_id, workOrder.squawks]);

    // Calculate total duration for container width
    const totalDuration = useMemo(() => {
        let maxEnd = 0;
        workOrder.squawks.forEach(s => {
            const start = taskOffsets[s.squawk_id] || 0;
            const duration = Math.max(s.hours_estimate || 1, 1);
            if (start + duration > maxEnd) maxEnd = start + duration;
        });
        // Add some buffer
        return Math.max(maxEnd + 5, 24); // Minimum 24 hour view
    }, [workOrder.squawks, taskOffsets]);

    const handleMouseDown = (e: React.MouseEvent, squawkId: string) => {
        e.preventDefault(); // Prevent text selection
        setDraggingTaskId(squawkId);
        setDragStartX(e.clientX);
        setInitialDragOffset(taskOffsets[squawkId] || 0);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!draggingTaskId) return;

        const deltaPixels = e.clientX - dragStartX;
        const deltaHours = deltaPixels / PIXELS_PER_HOUR;
        
        let newOffset = initialDragOffset + deltaHours;
        // Clamp to 0 (cannot start before WO starts)
        if (newOffset < 0) newOffset = 0;

        setTaskOffsets(prev => ({
            ...prev,
            [draggingTaskId]: newOffset
        }));
    };

    const handleMouseUp = () => {
        setDraggingTaskId(null);
    };

    // Attach global listeners for drag operation
    useEffect(() => {
        if (draggingTaskId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingTaskId, dragStartX, initialDragOffset]);

    const getBarColor = (priority: string) => {
        switch(priority) {
            case 'aog': return 'bg-red-500 border-red-400';
            case 'urgent': return 'bg-amber-500 border-amber-400';
            default: return 'bg-sky-500 border-sky-400';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-lg overflow-hidden border border-white/10 relative">
            <div className="flex-1 overflow-auto relative" ref={containerRef}>
                <div 
                    style={{ 
                        width: `${totalDuration * PIXELS_PER_HOUR}px`,
                        minWidth: '100%',
                        position: 'relative'
                    }}
                >
                    {/* Time Grid Header */}
                    <div className="sticky top-0 z-20 bg-slate-800 border-b border-white/10 h-10 flex items-end">
                        {Array.from({ length: Math.ceil(totalDuration) }).map((_, i) => (
                            <div 
                                key={i} 
                                className={`flex-shrink-0 border-l border-white/5 h-full relative ${i % HOUR_MARKER_INTERVAL === 0 ? 'border-white/20' : ''}`}
                                style={{ width: `${PIXELS_PER_HOUR}px` }}
                            >
                                {i % HOUR_MARKER_INTERVAL === 0 && (
                                    <span className="absolute bottom-1 left-1 text-[10px] font-mono text-slate-400">
                                        +{i}h
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Grid Background Lines */}
                    <div className="absolute inset-0 top-10 z-0 flex pointer-events-none">
                        {Array.from({ length: Math.ceil(totalDuration) }).map((_, i) => (
                            <div 
                                key={`grid-${i}`} 
                                className={`flex-shrink-0 border-l border-white/5 h-full ${i % HOUR_MARKER_INTERVAL === 0 ? 'border-white/10' : ''}`}
                                style={{ width: `${PIXELS_PER_HOUR}px` }}
                            />
                        ))}
                    </div>

                    {/* Task Rows */}
                    <div className="relative z-10 pt-2 pb-20">
                        {workOrder.squawks.map((squawk, index) => {
                            const offset = taskOffsets[squawk.squawk_id] || 0;
                            const duration = Math.max(squawk.hours_estimate || 1, 1);
                            const width = duration * PIXELS_PER_HOUR;
                            const left = offset * PIXELS_PER_HOUR;
                            const colorClass = getBarColor(squawk.priority);

                            return (
                                <div 
                                    key={squawk.squawk_id}
                                    className="relative h-12 flex items-center hover:bg-white/5 transition-colors border-b border-white/5"
                                >
                                    {/* Task Label (Sticky Left) */}
                                    <div className="sticky left-0 z-30 w-64 bg-slate-900/90 backdrop-blur-sm border-r border-white/10 h-full flex items-center px-4 shadow-[4px_0_10px_rgba(0,0,0,0.2)]">
                                        <div className="truncate">
                                            <p className="text-xs font-mono text-slate-400">{squawk.squawk_id.split('-').pop()}</p>
                                            <p className="text-sm text-white truncate w-56" title={squawk.description}>{squawk.description}</p>
                                        </div>
                                    </div>

                                    {/* Gantt Bar */}
                                    <div 
                                        className={`absolute h-8 rounded-md shadow-lg cursor-grab active:cursor-grabbing flex items-center px-2 overflow-hidden border ${colorClass} bg-opacity-80 backdrop-blur-sm group hover:brightness-110 transition-all duration-75`}
                                        style={{ 
                                            left: `${left}px`, // Add padding for sticky col
                                            width: `${width}px`,
                                            marginLeft: '256px' // Offset by sticky column width
                                        }}
                                        onMouseDown={(e) => handleMouseDown(e, squawk.squawk_id)}
                                    >
                                        <span className="text-xs font-bold text-white drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis">
                                            {duration}h
                                        </span>
                                        
                                        {/* Resize Handle (Visual Only for now) */}
                                        <div className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/20"></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            <div className="p-3 border-t border-white/10 bg-slate-800 text-xs text-slate-400 flex justify-between items-center">
                <span>Start: {workOrder.scheduled_date} 08:00</span>
                <span>Drag bars to adjust task sequencing. This helps visualize critical path and resource overlaps.</span>
            </div>
        </div>
    );
};
