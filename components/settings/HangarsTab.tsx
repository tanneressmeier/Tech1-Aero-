import React, { useState } from 'react';
import { HangarConfig } from '../../types.ts';
import { PlusIcon, TrashIcon } from '../icons.tsx';

interface HangarsTabProps {
    hangars:  HangarConfig[];
    onChange: (h: HangarConfig[]) => void;
}

export const HangarsTab: React.FC<HangarsTabProps> = ({ hangars, onChange }) => {
    const [editIdx, setEditIdx] = useState<number | null>(null);

    const addHangar = () => {
        const newH: HangarConfig = {
            id:             `hangar-${Date.now()}`,
            label:          'New Hangar',
            width_ft:       120,
            depth_ft:       80,
            door_height_ft: 22,
            door_width_ft:  100,
            bays:           2,
        };
        onChange([...hangars, newH]);
        setEditIdx(hangars.length);
    };

    const updateHangar = (idx: number, field: keyof HangarConfig, value: string | number) => {
        onChange(hangars.map((h, i) => i === idx ? { ...h, [field]: value } : h));
    };

    const removeHangar = (idx: number) => {
        onChange(hangars.filter((_, i) => i !== idx));
        if (editIdx === idx) setEditIdx(null);
    };

    const numField = (idx: number, field: keyof HangarConfig, label: string, hint: string) => (
        <div key={field as string}>
            <label className="block text-xs text-slate-400 mb-1">{label}</label>
            <input
                type="number" min="0" step="1"
                value={(hangars[idx][field] as number) ?? ''}
                onChange={e => updateHangar(idx, field, parseFloat(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Hangar Configuration</h4>
                <button onClick={addHangar}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-sky-600/50 hover:bg-sky-600 text-white transition-colors">
                    <PlusIcon className="w-3.5 h-3.5" /> Add Hangar
                </button>
            </div>
            <p className="text-xs text-slate-500">
                Configure your facility footprint. The door height is the critical gate — aircraft whose tail height exceeds it are blocked from that hangar.
            </p>

            {hangars.length === 0 && (
                <p className="text-sm text-slate-600 italic text-center py-8">No hangars configured. Add one above.</p>
            )}

            {hangars.map((h, idx) => (
                <div key={h.id} className="border border-white/10 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-white/3 cursor-pointer"
                        onClick={() => setEditIdx(editIdx === idx ? null : idx)}>
                        <div>
                            <p className="text-sm font-medium text-slate-100">{h.label}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                                {h.width_ft}ft × {h.depth_ft}ft · Door: {h.door_height_ft}ft tall × {h.door_width_ft}ft wide · {h.bays} bays
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={e => { e.stopPropagation(); removeHangar(idx); }}
                                className="text-slate-500 hover:text-red-400 transition-colors">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                            <span className="text-slate-500 text-xs">{editIdx === idx ? '▲' : '▼'}</span>
                        </div>
                    </div>

                    {editIdx === idx && (
                        <div className="p-4 space-y-4 border-t border-white/10">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Label</label>
                                <input value={h.label}
                                    onChange={e => updateHangar(idx, 'label', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {numField(idx, 'width_ft',       'Floor Width (ft)',    'Wall-to-wall interior width')}
                                {numField(idx, 'depth_ft',       'Floor Depth (ft)',    'Door to back wall')}
                                {numField(idx, 'door_height_ft', 'Door Height (ft) ⚠', 'Gates aircraft by tail height — critical field')}
                                {numField(idx, 'door_width_ft',  'Door Width (ft)',     'Clear opening width')}
                                {numField(idx, 'bays',           'Number of Bays',      'Nominal aircraft positions')}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
