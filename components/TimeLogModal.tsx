// =============================================================================
// TimeLogModal — Task-Level Billable Time Clock-In/Out
//
// Supports two modes:
//   "clock_in"  — opens a live log against this squawk (is_billable: true)
//   "manual"    — Admin/Lead can add a historical entry with start + end time
//
// TimeLog.squawk_id + order_id distinguishes task-level billing from
// shop-presence time (which has no squawk_id).
// =============================================================================
import React, { useState, useEffect } from 'react';
import { Technician, TimeLog, Squawk } from '../types.ts';
import { SidePanel } from './SidePanel.tsx';
import { ClockIcon, PlusIcon } from './icons.tsx';

interface TimeLogModalProps {
    isOpen:      boolean;
    onClose:     () => void;
    technicians: Technician[];
    currentUser: Technician;
    squawk:      Squawk;
    orderId:     string;
    orderType:   'WO' | 'RO';
    // Active task log for this squawk + user (if already clocked in)
    activeTaskLog?: TimeLog;
    onClockInToTask:  (log: Omit<TimeLog, 'log_id'>) => void;
    onClockOutOfTask: (logId: string, endTime: string) => void;
    onLogManual:      (log: Omit<TimeLog, 'log_id'>) => void;
}

export const TimeLogModal: React.FC<TimeLogModalProps> = ({
    isOpen, onClose, technicians, currentUser, squawk,
    orderId, orderType, activeTaskLog,
    onClockInToTask, onClockOutOfTask, onLogManual,
}) => {
    const [mode, setMode]             = useState<'live' | 'manual'>('live');
    const [manualTechId, setManualTechId] = useState(currentUser.id);
    const [startTime, setStartTime]   = useState('');
    const [endTime, setEndTime]       = useState('');
    const [notes, setNotes]           = useState('');
    const [elapsed, setElapsed]       = useState('');

    const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Lead Technician';

    // Live elapsed timer
    useEffect(() => {
        if (!activeTaskLog || mode !== 'live') { setElapsed(''); return; }
        const tick = () => {
            const ms  = Date.now() - new Date(activeTaskLog.start_time).getTime();
            const h   = Math.floor(ms / 3_600_000);
            const m   = Math.floor((ms % 3_600_000) / 60_000);
            const s   = Math.floor((ms % 60_000) / 1_000);
            setElapsed(`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
        };
        tick();
        const id = setInterval(tick, 1_000);
        return () => clearInterval(id);
    }, [activeTaskLog, mode]);

    useEffect(() => {
        if (isOpen) {
            setMode('live');
            setStartTime(new Date().toISOString().slice(0, 16));
            setEndTime('');
            setNotes('');
            setManualTechId(currentUser.id);
        }
    }, [isOpen, currentUser.id]);

    const handleClockIn = () => {
        onClockInToTask({
            technician_id: currentUser.id,
            start_time:    new Date().toISOString(),
            is_billable:   true,
            squawk_id:     squawk.squawk_id,
            order_id:      orderId,
            order_type:    orderType,
            notes,
        });
        onClose();
    };

    const handleClockOut = () => {
        if (!activeTaskLog) return;
        onClockOutOfTask(activeTaskLog.log_id, new Date().toISOString());
        onClose();
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogManual({
            technician_id: manualTechId,
            start_time:    new Date(startTime).toISOString(),
            end_time:      endTime ? new Date(endTime).toISOString() : undefined,
            is_billable:   true,
            squawk_id:     squawk.squawk_id,
            order_id:      orderId,
            order_type:    orderType,
            notes,
        });
        onClose();
    };

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Task Time"
            size="md"
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-slate-500 truncate max-w-[180px]">{squawk.description}</span>
                    {mode === 'live'
                        ? activeTaskLog
                            ? <button onClick={handleClockOut}
                                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                                <ClockIcon className="w-4 h-4" /> Clock Out
                              </button>
                            : <button onClick={handleClockIn}
                                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                                <ClockIcon className="w-4 h-4" /> Clock In to Task
                              </button>
                        : <button type="submit" form="manual-log-form"
                            className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                            <PlusIcon className="w-4 h-4" /> Add Entry
                          </button>
                    }
                </div>
            }>
            {/* Mode tabs */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-5">
                {(['live', 'manual'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                            mode === m ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                        {m === 'live' ? '⏱ Live Clock' : '✏ Manual Entry'}
                    </button>
                ))}
            </div>

            {mode === 'live' ? (
                <div className="space-y-4">
                    {/* Clock status */}
                    {activeTaskLog ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center space-y-1">
                            <p className="text-xs text-slate-400">Clocked in as</p>
                            <p className="text-sm font-semibold text-slate-200">{currentUser.name}</p>
                            <p className="text-3xl font-mono font-bold text-emerald-400">{elapsed || '0:00:00'}</p>
                            <p className="text-xs text-slate-500">
                                Since {new Date(activeTaskLog.start_time).toLocaleTimeString()}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white/3 border border-white/10 rounded-xl p-4 text-center space-y-1">
                            <ClockIcon className="w-8 h-8 text-slate-500 mx-auto" />
                            <p className="text-sm text-slate-400">Not clocked in to this task</p>
                            <p className="text-xs text-slate-600">
                                Clocking in records billable time against this squawk
                            </p>
                        </div>
                    )}

                    {/* How it works note */}
                    <div className="bg-sky-500/5 border border-sky-500/15 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                        <p className="text-sky-400 font-medium">How time tracking works</p>
                        <p>• <strong className="text-slate-300">Shop presence</strong> — clocking in at login (non-billable)</p>
                        <p>• <strong className="text-slate-300">Task time</strong> — clocking in here (billable to this squawk)</p>
                        <p>• Efficiency = billable hours ÷ total shop hours</p>
                    </div>

                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
                        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="What are you working on?"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none" />
                    </div>
                </div>
            ) : (
                <form id="manual-log-form" onSubmit={handleManualSubmit} className="space-y-4">
                    {isAdmin && (
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Technician</label>
                            <select value={manualTechId} onChange={e => setManualTechId(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500">
                                {technicians.map(t => <option key={t.id} value={t.id}>{t.name} — {t.role}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Start time *</label>
                            <input type="datetime-local" required value={startTime} onChange={e => setStartTime(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">End time</label>
                            <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Notes</label>
                        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 resize-none" />
                    </div>
                </form>
            )}
        </SidePanel>
    );
};

export default TimeLogModal;
