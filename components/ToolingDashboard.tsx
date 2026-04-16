import React, { useState, useMemo, useCallback } from 'react';
import { Tool, Kit } from '../types.ts';
import { useToast } from '../contexts/ToastContext.tsx';
import {
  PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon,
  ArrowUpTrayIcon, ArrowDownTrayIcon, SparklesIcon,
  WrenchIcon, ChevronRightIcon, CheckBadgeIcon, ExclamationTriangleIcon,
  FolderOpenIcon, XMarkIcon, InformationCircleIcon,
} from './icons.tsx';
import { detectCsvColumnMapping, applyCsvMapping, predictToolsFromJob, compareToolsClientSide, findSubstitutions } from '../services/geminiService.ts';
import { getVendorSourcingInfo } from '../services/vendorDirectory.ts';

interface ToolingDashboardProps {
  tools:      Tool[];
  toolKits:   Kit[];
  neededTools:Tool[];
  onAddTool:        (tool: Tool) => void;
  onUpdateTool:     (tool: Tool) => void;
  onDeleteTool:     (id: string) => void;
  onSetTools:       (tools: Tool[]) => void;
  onSetKits:        (kits: Kit[]) => void;
  onSetNeededTools: (tools: Tool[]) => void;
}

type TabId = 'inventory' | 'comparison' | 'kits' | 'predict';

// ─── calibration badge helper ──────────────────────────────────────────────
function CalBadge({ tool }: { tool: Tool }) {
  if (!tool.calibrationRequired) return <span className="text-xs text-slate-500">N/A</span>;
  const days = tool.calibrationDueDays ?? (tool.calibrationDueDate
    ? Math.round((new Date(tool.calibrationDueDate).getTime() - Date.now()) / 86400000)
    : undefined);
  if (days === undefined) return <span className="text-xs text-amber-400">Unknown</span>;
  if (days < 0)  return <span className="text-xs font-semibold text-red-400">Overdue {Math.abs(days)}d</span>;
  if (days < 30) return <span className="text-xs font-semibold text-amber-400">Due {days}d</span>;
  return <span className="text-xs text-emerald-400">Good ({days}d)</span>;
}

// ─── Tool row ──────────────────────────────────────────────────────────────
const ToolRow: React.FC<{
  tool: Tool;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ tool, selected, onSelect, onEdit, onDelete }) => (
  <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${selected ? 'bg-sky-500/10' : ''}`} onClick={onSelect}>
    <td className="px-3 py-2.5">
      <input type="checkbox" checked={selected} onChange={onSelect} className="accent-sky-500" onClick={e => e.stopPropagation()} />
    </td>
    <td className="px-3 py-2.5 text-sm font-mono text-sky-300">{tool.id}</td>
    <td className="px-3 py-2.5 text-sm text-slate-100">{tool.name}</td>
    <td className="px-3 py-2.5 text-sm text-slate-400">{tool.make ?? '—'}</td>
    <td className="px-3 py-2.5 text-sm text-slate-400">{tool.model ?? '—'}</td>
    <td className="px-3 py-2.5 text-sm text-slate-400">{tool.category ?? '—'}</td>
    <td className="px-3 py-2.5"><CalBadge tool={tool} /></td>
    <td className="px-3 py-2.5">
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-sky-300 transition-colors"><PencilIcon className="w-4 h-4" /></button>
        <button onClick={onDelete} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors"><TrashIcon className="w-4 h-4" /></button>
      </div>
    </td>
  </tr>
);

// ─── Tool modal ─────────────────────────────────────────────────────────────
const ToolModal: React.FC<{
  tool: Partial<Tool> | null;
  onSave: (t: Tool) => void;
  onClose: () => void;
}> = ({ tool, onSave, onClose }) => {
  const [form, setForm] = useState<Partial<Tool>>(tool ?? {});
  const set = (k: keyof Tool, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name?.trim()) return;
    const calDate = form.calibrationDueDate;
    const days = calDate ? Math.round((new Date(calDate).getTime() - Date.now()) / 86400000) : undefined;
    onSave({
      id:                  form.id || `TOOL-${Date.now()}`,
      name:                form.name!,
      description:         form.description,
      make:                form.make || null,
      model:               form.model || null,
      serial:              form.serial || null,
      calibrationRequired: form.calibrationRequired ?? false,
      calibrationDueDate:  calDate,
      calibrationDueDays:  days,
      calibrationStatus:   days === undefined ? 'N/A' : days > 0 ? 'Good' : 'Needs Calibration',
      category:            form.category,
      location:            form.location,
    });
  };

  const field = (label: string, key: keyof Tool, type = 'text') => (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type={type}
        value={(form[key] as string) ?? ''}
        onChange={e => set(key, e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-base font-semibold text-slate-100">{tool?.id ? 'Edit Tool' : 'Add New Tool'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {field('Tool ID / Part Number', 'id')}
          {field('Name *', 'name')}
          {field('Manufacturer', 'make')}
          {field('Model', 'model')}
          {field('Serial Number', 'serial')}
          {field('Category', 'category')}
          {field('Location', 'location')}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Calibration Due Date</label>
            <input type="date" value={form.calibrationDueDate ?? ''} onChange={e => { set('calibrationDueDate', e.target.value); set('calibrationRequired', !!e.target.value); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.calibrationRequired ?? false} onChange={e => set('calibrationRequired', e.target.checked)} className="accent-sky-500" />
              Requires Calibration
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-slate-400 hover:text-white hover:bg-white/5">Cancel</button>
          <button onClick={handleSave} disabled={!form.name?.trim()} className="px-4 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium disabled:opacity-40">Save Tool</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main dashboard ─────────────────────────────────────────────────────────
export const ToolingDashboard: React.FC<ToolingDashboardProps> = ({
  tools, toolKits, neededTools,
  onAddTool, onUpdateTool, onDeleteTool, onSetTools, onSetKits, onSetNeededTools,
}) => {
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>('inventory');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [calFilter, setCalFilter] = useState('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editTool, setEditTool] = useState<Partial<Tool> | null | false>(false);

  // ── Comparison tab state
  const [compResult, setCompResult] = useState<{ available: Tool[]; onOrder: Tool[]; shortage: Tool[] } | null>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [isFindingSubs, setIsFindingSubs] = useState(false);
  const [sourcingTool, setSourcingTool] = useState<Tool | null>(null);

  // ── Predict tab state
  const [jobDesc, setJobDesc] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [predicted, setPredicted] = useState<Tool[]>([]);

  // ── CSV import state
  const [isImporting, setIsImporting] = useState(false);

  // ── Kit state
  const [newKitName, setNewKitName] = useState('');

  const categories = useMemo(() => ['All', ...Array.from(new Set(tools.map(t => t.category).filter(Boolean)))].sort(), [tools]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tools.filter(t => {
      const matchSearch = !q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.make ?? '').toLowerCase().includes(q) || (t.model ?? '').toLowerCase().includes(q);
      const matchCat = catFilter === 'All' || t.category === catFilter;
      const matchCal = calFilter === 'All' ||
        (calFilter === 'Required' && t.calibrationRequired) ||
        (calFilter === 'Overdue' && t.calibrationRequired && (t.calibrationDueDays ?? 999) < 0) ||
        (calFilter === 'Due Soon' && t.calibrationRequired && (t.calibrationDueDays ?? 999) >= 0 && (t.calibrationDueDays ?? 999) < 30);
      return matchSearch && matchCat && matchCal;
    });
  }, [tools, search, catFilter, calFilter]);

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(filtered.length === selected.size ? new Set() : new Set(filtered.map(t => t.id)));

  // ── CSV import
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsImporting(true);
    try {
      const text = await file.text();
      const headerRow = text.split('\n')[0];
      const mapping = await detectCsvColumnMapping(headerRow);
      const imported = applyCsvMapping(text, mapping);
      onSetTools([...tools, ...imported]);
      showToast({ message: `Imported ${imported.length} tools`, type: 'success' });
    } catch (err: any) {
      showToast({ message: `Import failed: ${err.message}`, type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  // ── CSV export
  const handleExport = () => {
    const rows = [['ID', 'Name', 'Make', 'Model', 'Serial', 'Category', 'Cal Required', 'Cal Due Date']];
    tools.forEach(t => rows.push([t.id, t.name, t.make ?? '', t.model ?? '', t.serial ?? '', t.category ?? '', t.calibrationRequired ? 'Yes' : 'No', t.calibrationDueDate ?? '']));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `tool-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast({ message: 'Inventory exported', type: 'success' });
  };

  // ── Run comparison (client-side, zero tokens)
  const handleCompare = () => {
    if (!neededTools.length) { showToast({ message: 'No needed tools loaded. Use Predict tab or add tools first.', type: 'info' }); return; }
    setIsComparing(true);
    setTimeout(() => {
      const result = compareToolsClientSide(neededTools, tools);
      setCompResult(result);
      setSubs([]);
      setIsComparing(false);
      showToast({ message: `Comparison complete — ${result.available.length} available, ${result.shortage.length} shortage`, type: 'success' });
    }, 300);
  };

  // ── Find substitutions (AI, user-gated)
  const handleFindSubs = async () => {
    if (!compResult?.shortage.length) return;
    setIsFindingSubs(true);
    try {
      const result = await findSubstitutions(compResult.shortage, tools);
      setSubs(result);
      showToast({ message: `Found ${result.length} substitution suggestion(s)`, type: 'success' });
    } catch (err: any) {
      showToast({ message: `AI error: ${err.message}`, type: 'error' });
    } finally {
      setIsFindingSubs(false);
    }
  };

  // ── Predict tools from job description
  const handlePredict = async () => {
    if (!jobDesc.trim()) return;
    setIsPredicting(true);
    try {
      const result = await predictToolsFromJob(jobDesc, tools);
      setPredicted(result);
      showToast({ message: `AI predicted ${result.length} tools`, type: 'success' });
    } catch (err: any) {
      showToast({ message: `AI error: ${err.message}`, type: 'error' });
    } finally {
      setIsPredicting(false);
    }
  };

  // ── Kit management
  const handleCreateKit = () => {
    if (!newKitName.trim() || !selected.size) { showToast({ message: 'Select tools and enter a kit name', type: 'info' }); return; }
    const kitTools = tools.filter(t => selected.has(t.id));
    const kit: Kit = { id: `kit-${Date.now()}`, name: newKitName.trim(), tools: kitTools, createdAt: new Date().toISOString() };
    onSetKits([...toolKits, kit]);
    setNewKitName('');
    setSelected(new Set());
    showToast({ message: `Kit "${kit.name}" created with ${kitTools.length} tools`, type: 'success' });
  };

  const calStats = useMemo(() => ({
    total:    tools.length,
    overdue:  tools.filter(t => t.calibrationRequired && (t.calibrationDueDays ?? 999) < 0).length,
    dueSoon:  tools.filter(t => t.calibrationRequired && (t.calibrationDueDays ?? 999) >= 0 && (t.calibrationDueDays ?? 999) < 30).length,
    good:     tools.filter(t => t.calibrationRequired && (t.calibrationDueDays ?? 999) >= 30).length,
  }), [tools]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'inventory',  label: `Master Inventory (${tools.length})` },
    { id: 'comparison', label: 'Tool Comparison' },
    { id: 'kits',       label: `Kits (${toolKits.length})` },
    { id: 'predict',    label: 'AI Prediction' },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Precision Tooling</h1>
          <p className="text-sm text-slate-400 mt-0.5">Master inventory · Calibration tracking · AI-powered planning</p>
        </div>
        {/* Calibration summary pills */}
        <div className="flex gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">{calStats.total} total</span>
          {calStats.overdue > 0  && <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-300">{calStats.overdue} overdue</span>}
          {calStats.dueSoon > 0  && <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300">{calStats.dueSoon} due soon</span>}
          {calStats.good > 0     && <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">{calStats.good} current</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.id ? 'border-sky-500 text-sky-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── INVENTORY TAB ─────────────────────────────────────────────────── */}
      {tab === 'inventory' && (
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools…"
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-sky-500">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={calFilter} onChange={e => setCalFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-sky-500">
              {['All','Required','Overdue','Due Soon'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-1 ml-auto">
              <label className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${isImporting ? 'bg-sky-500/20 text-sky-300' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}>
                <ArrowUpTrayIcon className="w-4 h-4" />
                {isImporting ? 'Importing…' : 'Import CSV'}
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={isImporting} />
              </label>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10">
                <ArrowDownTrayIcon className="w-4 h-4" /> Export
              </button>
              <button onClick={() => setEditTool({})} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium">
                <PlusIcon className="w-4 h-4" /> Add Tool
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sm text-sky-300">
              <span>{selected.size} selected</span>
              <button onClick={() => { selected.forEach(id => onDeleteTool(id)); setSelected(new Set()); showToast({ message: `Deleted ${selected.size} tools`, type: 'info' }); }}
                className="flex items-center gap-1 hover:text-red-400 transition-colors"><TrashIcon className="w-4 h-4" /> Delete selected</button>
              <div className="flex items-center gap-2 ml-auto">
                <input value={newKitName} onChange={e => setNewKitName(e.target.value)} placeholder="Kit name…"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44" />
                <button onClick={handleCreateKit} className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm">
                  <FolderOpenIcon className="w-4 h-4" /> Save as Kit
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-white/2">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 border-b border-white/10">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" onChange={selectAll} checked={filtered.length > 0 && selected.size === filtered.length} className="accent-sky-500" /></th>
                  {['Tool ID', 'Name', 'Make', 'Model', 'Category', 'Calibration', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={8} className="px-3 py-12 text-center text-slate-500">{tools.length === 0 ? 'No tools yet — import a CSV or add a tool.' : 'No tools match your filters.'}</td></tr>
                  : filtered.map(t => (
                    <ToolRow key={t.id} tool={t} selected={selected.has(t.id)}
                      onSelect={() => toggleSelect(t.id)}
                      onEdit={() => setEditTool(t)}
                      onDelete={() => { onDeleteTool(t.id); showToast({ message: `Deleted ${t.name}`, type: 'info' }); }} />
                  ))
                }
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">{filtered.length} of {tools.length} tools shown</p>
        </div>
      )}

      {/* ── COMPARISON TAB ────────────────────────────────────────────────── */}
      {tab === 'comparison' && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Compare a needed tools list against master inventory. Matching runs client-side (no API tokens). AI substitutions are opt-in.</p>
              <p className="text-sm text-slate-500 mt-0.5">Needed tools loaded: <span className="text-sky-300 font-medium">{neededTools.length}</span> — populate via AI Prediction tab or use existing inventory.</p>
            </div>
            <button onClick={handleCompare} disabled={isComparing || !neededTools.length}
              className="px-4 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium disabled:opacity-40 flex items-center gap-1.5">
              {isComparing ? 'Comparing…' : 'Run Comparison'}
            </button>
          </div>

          {compResult && (
            <div className="grid grid-cols-3 gap-4">
              {/* Available */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckBadgeIcon className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">Available ({compResult.available.length})</span>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {compResult.available.map(t => <div key={t.id} className="text-xs text-emerald-200 truncate">{t.name}</div>)}
                  {!compResult.available.length && <p className="text-xs text-slate-500">None</p>}
                </div>
              </div>
              {/* On Order */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ClockBadge />
                  <span className="text-sm font-semibold text-amber-300">On Order ({compResult.onOrder.length})</span>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {compResult.onOrder.map(t => <div key={t.id} className="text-xs text-amber-200 truncate">{t.name}</div>)}
                  {!compResult.onOrder.length && <p className="text-xs text-slate-500">None</p>}
                </div>
              </div>
              {/* Shortage */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                    <span className="text-sm font-semibold text-red-300">Shortage ({compResult.shortage.length})</span>
                  </div>
                  {compResult.shortage.length > 0 && (
                    <button onClick={handleFindSubs} disabled={isFindingSubs} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-40 flex items-center gap-1">
                      <SparklesIcon className="w-3 h-3" />{isFindingSubs ? '…' : 'Find Subs'}
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {compResult.shortage.map(t => (
                    <div key={t.id} className="text-xs">
                      <div className="text-red-200 truncate">{t.name}</div>
                      <button onClick={() => setSourcingTool(t)} className="text-sky-400 hover:underline flex items-center gap-0.5 mt-0.5">
                        <InformationCircleIcon className="w-3 h-3" /> Find vendors
                      </button>
                    </div>
                  ))}
                  {!compResult.shortage.length && <p className="text-xs text-slate-500">No shortages</p>}
                </div>
              </div>
            </div>
          )}

          {/* Substitutions */}
          {subs.length > 0 && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-sky-300 mb-3">AI Substitution Suggestions</h4>
              <div className="space-y-2">
                {subs.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs text-slate-300 bg-white/3 rounded-lg px-3 py-2">
                    <span className={`font-bold mt-0.5 ${s.confidence === 'High' ? 'text-emerald-400' : s.confidence === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>{s.confidence}</span>
                    <div><span className="text-slate-400">Need:</span> {s.neededTool.name} → <span className="text-sky-200">Use:</span> {s.suggestedTool.name}<br /><span className="text-slate-500">{s.reason}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendor sourcing modal */}
          {sourcingTool && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-slate-100">Vendor Links — {sourcingTool.name}</h3>
                  <button onClick={() => setSourcingTool(null)} className="text-slate-400 hover:text-white"><XMarkIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-3">
                  {(() => {
                    const info = getVendorSourcingInfo(sourcingTool);
                    return (
                      <>
                        <p className="text-xs text-slate-400">{info.sourcingNotes}</p>
                        <div className="space-y-2">
                          {info.vendorLinks.map((v, i) => (
                            <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group">
                              <span className="text-sm text-slate-200 group-hover:text-sky-300">{v.vendor}</span>
                              <ChevronRightIcon className="w-4 h-4 text-slate-500 group-hover:text-sky-400" />
                            </a>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KITS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'kits' && (
        <div className="flex flex-col gap-4 flex-1">
          <p className="text-sm text-slate-400">Save reusable groups of tools. Select tools in the Inventory tab, then click "Save as Kit".</p>
          {toolKits.length === 0
            ? <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">No kits yet — select tools from inventory and save as a kit.</div>
            : <div className="grid gap-3">
              {toolKits.map(kit => (
                <div key={kit.id} className="bg-white/3 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">{kit.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{kit.tools.length} tools · Created {new Date(kit.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { onSetNeededTools(kit.tools); showToast({ message: `Loaded kit "${kit.name}" as needed tools`, type: 'success' }); }}
                        className="text-xs px-2 py-1 rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/30">Load for Comparison</button>
                      <button onClick={() => { onSetKits(toolKits.filter(k => k.id !== kit.id)); showToast({ message: `Deleted kit "${kit.name}"`, type: 'info' }); }}
                        className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"><TrashIcon className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {kit.tools.slice(0, 8).map(t => <span key={t.id} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">{t.name}</span>)}
                    {kit.tools.length > 8 && <span className="text-xs text-slate-500">+{kit.tools.length - 8} more</span>}
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* ── PREDICT TAB ───────────────────────────────────────────────────── */}
      {tab === 'predict' && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex gap-3 items-start">
            <SparklesIcon className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300">Describe the maintenance job and Gemini AI will predict the required tools. Results load directly into the Comparison tab as your needed tools list.</p>
          </div>
          <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={4} placeholder="e.g. 500-hour inspection on Cessna Citation CJ3, including pitot-static check, landing gear service, and engine hot section inspection…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none" />
          <button onClick={handlePredict} disabled={isPredicting || !jobDesc.trim()}
            className="self-start flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors">
            <SparklesIcon className="w-4 h-4" />
            {isPredicting ? 'Predicting…' : 'Predict Required Tools'}
          </button>

          {predicted.length > 0 && (
            <div className="bg-white/3 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-100">Predicted tools ({predicted.length})</h4>
                <button onClick={() => { onSetNeededTools(predicted); showToast({ message: `${predicted.length} tools loaded for comparison`, type: 'success' }); setTab('comparison'); }}
                  className="text-sm px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white">Use for Comparison →</button>
              </div>
              <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
                {predicted.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-200">{t.name}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {t.make && <span>{t.make}</span>}
                      {t.calibrationRequired && <span className="text-amber-400">Cal required</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool edit modal */}
      {editTool !== false && (
        <ToolModal
          tool={editTool}
          onSave={t => { editTool?.id ? onUpdateTool(t) : onAddTool(t); setEditTool(false); showToast({ message: `Tool ${editTool?.id ? 'updated' : 'added'}: ${t.name}`, type: 'success' }); }}
          onClose={() => setEditTool(false)}
        />
      )}
    </div>
  );
};

// tiny inline clock icon to avoid import collision
const ClockBadge = () => (
  <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
);
