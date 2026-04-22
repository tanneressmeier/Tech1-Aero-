// =============================================================================
// WarehouseMap.tsx — 2D interactive warehouse rack/bin visualizer
// Rack config: BJC prefix, 3 racks, rows A–G (R1/R2) A–E (R3), 20 bins (R1/R2) 4 bins (R3)
// Shelf location format: BJC01A02 = facility BJC, rack 01, row A, bin 02
// =============================================================================
import React, { useState, useMemo } from 'react';
import { InventoryItem, Form8130 } from '../types.ts';
import { MagnifyingGlassIcon, ShieldCheckIcon, ExclamationTriangleIcon } from './icons.tsx';
import { SectionCard } from './ui.tsx';

interface WarehouseMapProps {
    parts:    InventoryItem[];
    forms:    Form8130[];
    onViewForm: (formId: string) => void;
    onNavigateToPart: (partId: string) => void;
}

// ── Rack configuration ────────────────────────────────────────────────────────
interface RackConfig { rack: number; rows: string[]; bins: number; wideStyle?: boolean; }

const RACKS: RackConfig[] = [
    { rack: 1, rows: ['A','B','C','D','E','F','G'], bins: 20 },
    { rack: 2, rows: ['A','B','C','D','E','F','G'], bins: 20 },
    { rack: 3, rows: ['A','B','C','D','E'],         bins:  4, wideStyle: true },
];

function makeBinId(rack: number, row: string, bin: number): string {
    return `BJC${String(rack).padStart(2,'0')}${row}${String(bin).padStart(2,'0')}`;
}

function parseBinId(loc: string): { rack: number; row: string; bin: number } | null {
    // BJC01A02
    const m = loc.match(/BJC(\d{2})([A-G])(\d{2})/i);
    if (m) return { rack: parseInt(m[1]), row: m[2].toUpperCase(), bin: parseInt(m[3]) };
    // Legacy format A-01-01 → treat as rack 1
    const m2 = loc.match(/([A-G])-(\d+)-(\d+)/i);
    if (m2) return { rack: 1, row: m2[1].toUpperCase(), bin: parseInt(m2[2]) };
    return null;
}

function shortBinLabel(rack: number, row: string, bin: number): string {
    return `${rack}${row}${String(bin).padStart(2,'0')}`;
}

// ── Bin status colour ─────────────────────────────────────────────────────────
function binColour(items: InventoryItem[]): string {
    if (!items.length) return 'bg-slate-800/60 border-white/5 text-slate-700';
    const hasQuarantine = items.some(p => p.quarantine_status === 'quarantined');
    const hasLow        = items.some(p => p.qty_on_hand <= p.reorder_level);
    const hasExpired    = items.some(p => {
        if (!p.expiration_date) return false;
        return new Date(p.expiration_date) < new Date();
    });
    if (hasQuarantine) return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
    if (hasExpired)    return 'bg-red-500/15   border-red-500/30   text-red-300';
    if (hasLow)        return 'bg-orange-500/10 border-orange-500/25 text-orange-300';
    return 'bg-sky-500/10 border-sky-500/20 text-sky-300';
}

export const WarehouseMap: React.FC<WarehouseMapProps> = ({
    parts, forms, onViewForm, onNavigateToPart,
}) => {
    const [search,      setSearch]      = useState('');
    const [selectedBin, setSelectedBin] = useState<string | null>(null);
    const [pulse,       setPulse]       = useState<string | null>(null);

    // Index parts by bin ID
    const binIndex = useMemo(() => {
        const idx = new Map<string, InventoryItem[]>();
        parts.forEach(p => {
            const parsed = parseBinId(p.shelf_location);
            if (!parsed) return;
            const key = makeBinId(parsed.rack, parsed.row, parsed.bin);
            if (!idx.has(key)) idx.set(key, []);
            idx.get(key)!.push(p);
        });
        return idx;
    }, [parts]);

    // Search — highlight matching bins
    const matchedBins = useMemo(() => {
        if (!search.trim()) return new Set<string>();
        const q = search.toLowerCase();
        const found = new Set<string>();
        parts.forEach(p => {
            if (
                p.part_no.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.shelf_location.toLowerCase().includes(q) ||
                (p.form_tracking_no ?? '').toLowerCase().includes(q)
            ) {
                const parsed = parseBinId(p.shelf_location);
                if (parsed) found.add(makeBinId(parsed.rack, parsed.row, parsed.bin));
            }
        });
        return found;
    }, [search, parts]);

    const handleSearch = (q: string) => {
        setSearch(q);
        if (q.trim() && matchedBins.size > 0) {
            const first = [...matchedBins][0];
            setPulse(first);
            setTimeout(() => setPulse(null), 2000);
        }
    };

    const selectedItems = selectedBin ? (binIndex.get(selectedBin) ?? []) : [];

    // Stats
    const totalBins  = RACKS.reduce((s, r) => s + r.rows.length * r.bins, 0);
    const occupiedBins = binIndex.size;
    const quarantineCount = parts.filter(p => p.quarantine_status === 'quarantined').length;
    const lowStockCount   = parts.filter(p => p.qty_on_hand <= p.reorder_level && p.qty_on_hand > 0).length;

    return (
        <div className="space-y-5">
            {/* Stats + Search row */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search by P/N, description, bin ID…"
                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                    />
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 font-mono flex-wrap">
                    <span>{occupiedBins}/{totalBins} bins occupied</span>
                    {quarantineCount > 0 && <span className="text-amber-400">⚠ {quarantineCount} quarantined</span>}
                    {lowStockCount   > 0 && <span className="text-orange-400">▼ {lowStockCount} low stock</span>}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 ml-auto flex-wrap">
                    {[
                        { col: 'bg-sky-500/30',     label: 'Stocked' },
                        { col: 'bg-orange-500/30',  label: 'Low Stock' },
                        { col: 'bg-amber-500/30',   label: 'Quarantine' },
                        { col: 'bg-red-500/30',     label: 'Expired' },
                        { col: 'bg-slate-700/60',   label: 'Empty' },
                    ].map(({ col, label }) => (
                        <span key={label} className="flex items-center gap-1">
                            <span className={`w-3 h-3 rounded-sm border border-white/10 ${col}`}/>
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Racks */}
            <div className="space-y-6 overflow-x-auto pb-2">
                {RACKS.map(rack => (
                    <div key={rack.rack}>
                        <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
                            Rack {rack.rack} {rack.wideStyle ? '— Oversize (4 wide bins)' : `(Rows ${rack.rows[0]}–${rack.rows[rack.rows.length-1]}, ${rack.bins} bins)`}
                        </p>
                        <div className="border border-white/8 rounded-xl overflow-hidden">
                            {rack.rows.map(row => (
                                <div key={row} className="flex border-b border-white/5 last:border-0">
                                    {/* Row label */}
                                    <div className="w-8 flex-shrink-0 flex items-center justify-center bg-white/3 border-r border-white/5">
                                        <span className="text-[10px] font-mono font-bold text-slate-500">{row}</span>
                                    </div>
                                    {/* Bins */}
                                    <div className={`flex flex-1 ${rack.wideStyle ? '' : 'flex-wrap'}`}>
                                        {Array.from({ length: rack.bins }, (_, i) => i + 1).map(bin => {
                                            const binId    = makeBinId(rack.rack, row, bin);
                                            const items    = binIndex.get(binId) ?? [];
                                            const isMatch  = matchedBins.has(binId);
                                            const isPulse  = pulse === binId;
                                            const isSel    = selectedBin === binId;
                                            const colClass = binColour(items);
                                            return (
                                                <button
                                                    key={bin}
                                                    onClick={() => setSelectedBin(isSel ? null : binId)}
                                                    title={`${binId} · ${items.length} part type${items.length !== 1 ? 's' : ''}`}
                                                    className={`
                                                        relative border-r border-white/5 last:border-0 flex flex-col items-center justify-center
                                                        transition-all duration-150 cursor-pointer select-none
                                                        ${rack.wideStyle ? 'flex-1 h-16 text-xs' : 'w-[44px] h-10 text-[9px]'}
                                                        ${isSel   ? 'ring-2 ring-sky-400 ring-inset z-10' : ''}
                                                        ${isMatch  ? 'ring-2 ring-emerald-400 ring-inset z-10' : ''}
                                                        ${isPulse  ? 'animate-pulse' : ''}
                                                        ${colClass}
                                                        hover:brightness-125
                                                    `}
                                                >
                                                    <span className="font-mono font-semibold leading-tight">
                                                        {shortBinLabel(rack.rack, row, bin)}
                                                    </span>
                                                    {items.length > 0 && (
                                                        <span className="font-mono opacity-70 leading-tight">
                                                            {items.reduce((s, p) => s + p.qty_on_hand, 0)} ea
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Bin inspector drawer */}
            {selectedBin && (
                <SectionCard>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-semibold text-white">Bin {selectedBin}</h4>
                            <p className="text-xs text-slate-500">{selectedItems.length} part type{selectedItems.length !== 1 ? 's' : ''} · {selectedItems.reduce((s,p) => s+p.qty_on_hand,0)} total units</p>
                        </div>
                        <button onClick={() => setSelectedBin(null)} className="text-slate-500 hover:text-white text-lg leading-none transition-colors">×</button>
                    </div>
                    {selectedItems.length === 0 ? (
                        <p className="text-sm text-slate-600 italic">Empty bin</p>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {selectedItems.map(part => {
                                const form = part.form_8130_id ? forms.find(f => f.id === part.form_8130_id) : null;
                                const isQuarantine = part.quarantine_status === 'quarantined';
                                const isLow        = part.qty_on_hand <= part.reorder_level;
                                return (
                                    <div key={part.id} className="py-3 flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-mono font-semibold text-sky-300">{part.part_no}</span>
                                                {part.condition && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                                        part.condition === 'New'        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' :
                                                        part.condition === 'Overhauled' ? 'bg-sky-500/15     text-sky-300     border-sky-500/25'     :
                                                                                          'bg-slate-500/15   text-slate-300   border-slate-500/25'
                                                    }`}>{part.condition}</span>
                                                )}
                                                {isQuarantine && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/25">Quarantine</span>}
                                                {part.certification?.verified && (
                                                    <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" title="8130-3 verified" />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5 truncate">{part.description}</p>
                                            {part.form_tracking_no && (
                                                <p className="text-[10px] text-slate-600 font-mono mt-0.5">Form: {part.form_tracking_no}</p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-sm font-semibold font-mono ${isLow ? 'text-orange-400' : 'text-white'}`}>
                                                {part.qty_on_hand} {part.unit}
                                            </p>
                                            {part.qty_reserved > 0 && <p className="text-[10px] text-slate-500">{part.qty_reserved} reserved</p>}
                                            {form && (
                                                <button onClick={() => onViewForm(form.id)}
                                                    className="mt-1 text-[10px] text-sky-400 hover:text-sky-300 underline transition-colors">
                                                    View 8130
                                                </button>
                                            )}
                                            <button onClick={() => onNavigateToPart(part.id)}
                                                className="block mt-0.5 text-[10px] text-slate-500 hover:text-slate-300 underline transition-colors">
                                                Part detail
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>
            )}
        </div>
    );
};
