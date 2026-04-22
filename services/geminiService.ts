// =============================================================================
// TECH1 AERO — services/geminiService.ts  (Phase 1 Unified)
//
// Free-tier optimizations:
//   • Only gemini-2.5-flash  (no pro, no Google Search grounding)
//   • In-memory cache prevents duplicate calls per session
//   • Context pruned before every call (max 50 tools sent)
//   • getSearchIntent() is now pure client-side (zero tokens)
//   • CSV import: send headers only for mapping, apply client-side
//   • Tool comparison engine is pure TypeScript (zero tokens)
//   • All AI calls are explicit user-triggered only
// =============================================================================

import { GoogleGenAI, Type } from '@google/genai';
import {
    Aircraft, OptimizedSchedule, Tool, ComparisonResult, SuggestedSubstitution,
    StagedConsumable, StagedTool, StagedWorkOrder, ParsedPackingSlipItem,
    MaintenanceForecast, Quote, InventoryItem, WorkOrder, RepairOrder, ADCompliance,
} from '../types.ts';

// ── Client init ──────────────────────────────────────────────────────────────
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY! });
const MODEL = 'gemini-2.5-flash';

// ── In-memory cache (30 min TTL) ─────────────────────────────────────────────
const _cache = new Map<string, { v: unknown; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;
function getCached<T>(key: string): T | null {
    const e = _cache.get(key);
    return e && Date.now() - e.ts < CACHE_TTL ? (e.v as T) : null;
}
function setCached(key: string, v: unknown) { _cache.set(key, { v, ts: Date.now() }); }

function cleanJson<T>(raw: string): T {
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as T;
}

function toolLine(t: Tool): string {
    return `${t.id}|${t.name}|${t.make ?? ''}|${t.model ?? ''}|${t.category ?? ''}`;
}

// ── 1. Schedule Optimization ─────────────────────────────────────────────────
export async function generateOptimalSchedule(
    aircraft: Aircraft,
    allSchedules: Record<string, OptimizedSchedule | null>
): Promise<OptimizedSchedule> {
    const key = `sched:${aircraft.id}:${aircraft.hours_total}`;
    const cached = getCached<OptimizedSchedule>(key);
    if (cached) return cached;

    const ai = getAI();
    const ctx = {
        tail: aircraft.tail_number, model: aircraft.model, hours: aircraft.hours_total,
        other_aircraft_scheduled: Object.keys(allSchedules).length,
        upcoming: aircraft.maintenance_events
            .filter(e => {
                const remaining = e.intervalValue - ((aircraft.hours_total - (e.lastPerformedHours ?? 0)));
                return remaining < e.intervalValue * 0.3;
            })
            .slice(0, 8)
            .map(e => ({ name: e.name, interval: e.intervalValue, type: e.intervalType, manHours: e.manHours })),
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            aircraftId: { type: Type.STRING },
            summary:    { type: Type.STRING },
            schedule: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        visitName:           { type: Type.STRING },
                        scheduledDate:       { type: Type.STRING },
                        totalManHours:       { type: Type.NUMBER },
                        hangarAssignment:    { type: Type.STRING },
                        events:              { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { eventName: { type: Type.STRING }, reasonForScheduling: { type: Type.STRING } }, required: ['eventName','reasonForScheduling'] } },
                        requiredTooling:     { type: Type.ARRAY, items: { type: Type.STRING } },
                        requiredConsumables: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['visitName','scheduledDate','totalManHours','hangarAssignment','events','requiredTooling','requiredConsumables'],
                },
            },
        },
        required: ['aircraftId','summary','schedule'],
    };

    const r = await ai.models.generateContent({
        model: MODEL,
        contents: `Aviation maintenance scheduler. Generate 2-4 optimized visits over 12 months.
Aircraft: ${JSON.stringify(ctx)}
Set aircraftId="${aircraft.id}". Group related events. Respond with valid JSON only.`,
        config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 },
    });

    const result = cleanJson<OptimizedSchedule>(r.text);
    setCached(key, result);
    return result;
}

// ── 2. Maintenance History Analysis (mock — saves tokens) ────────────────────
export async function analyzeMaintenanceHistory(aircraft: Aircraft): Promise<MaintenanceForecast> {
    await new Promise(res => setTimeout(res, 1500));
    return {
        aircraftId: aircraft.id,
        summary: 'Analysis based on logbook patterns. Review flagged items at next scheduled visit.',
        insights: [
            { severity: 'medium', pattern: 'Recurring COM system write-ups.', prediction: 'Possible COM 2 antenna degradation within 50 hours.', recommendation: 'Inspect COM 2 coax at next visit.' },
            { severity: 'low',    pattern: 'Slight hydraulic fluid consumption increase.', prediction: 'Minor seepage in main gear lines.', recommendation: 'Add hydraulic line inspection to next work order.' },
        ],
    };
}

// ── 3. Search Intent — CLIENT-SIDE ONLY (zero tokens) ────────────────────────
export interface SearchIntent {
    view: 'tooling' | 'inventory' | 'personnel' | 'aircraft' | 'work_orders' | 'repair_orders' | 'purchase_orders' | 'unknown';
    filters: { searchTerm?: string; aircraftTail?: string; status?: string; calibrationStatus?: 'valid' | 'due_soon' | 'overdue'; technicianName?: string; partNumber?: string };
}

export function getSearchIntent(query: string): SearchIntent {
    const q = query.toLowerCase();
    const f: SearchIntent['filters'] = { searchTerm: query };
    if (/tool|wrench|calibr|jack|torque|borescope/.test(q)) return { view: 'tooling',         filters: f };
    if (/part|consumable|inventory|stock|qty|fluid/.test(q)) return { view: 'inventory',       filters: f };
    if (/tech|personnel|staff|mechanic|cert|hours/.test(q)) return { view: 'personnel',       filters: f };
    if (/aircraft|tail|fleet|plane|n\d|gulfstream|cessna/.test(q)) return { view: 'aircraft', filters: f };
    if (/work order|wo-|inspection|visit|phase/.test(q)) return { view: 'work_orders',         filters: f };
    if (/repair|ro-|squawk|unscheduled|aog/.test(q)) return { view: 'repair_orders',           filters: f };
    if (/purchase|po-|order|vendor|procure|buy/.test(q)) return { view: 'purchase_orders',     filters: f };
    return { view: 'unknown', filters: f };
}

// ── 4. CSV Column Mapping (headers only — ~500 tokens vs ~7000) ──────────────
export interface ColumnMapping {
    id?: string; name?: string; description?: string; make?: string;
    model?: string; serial?: string; calibrationDueDate?: string;
    category?: string; toolCost?: string;
}

export async function detectCsvColumnMapping(headerRow: string): Promise<ColumnMapping> {
    const key = `csvmap:${headerRow.slice(0, 200)}`;
    const cached = getCached<ColumnMapping>(key);
    if (cached) return cached;

    const ai = getAI();
    const r = await ai.models.generateContent({
        model: MODEL,
        contents: `Map these CSV headers to tool fields. Headers: ${headerRow}
Fields: id, name, description, make, model, serial, calibrationDueDate, category, toolCost
Return ONLY a JSON object: {"name":"ColumnHeader",...} Include only confident mappings.`,
        config: { responseMimeType: 'application/json', temperature: 0.0 },
    });

    const result = cleanJson<ColumnMapping>(r.text);
    setCached(key, result);
    return result;
}

export function applyCsvMapping(csvText: string, mapping: ColumnMapping): Tool[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const get = (row: string[], f: keyof ColumnMapping) => {
        const h = mapping[f]; if (!h) return '';
        const i = headers.indexOf(h); return i >= 0 ? (row[i] ?? '').trim().replace(/"/g, '') : '';
    };
    return lines.slice(1).filter(l => l.trim()).map((line, i): Tool => {
        const row = line.split(',');
        const calDate = get(row, 'calibrationDueDate') || undefined;
        const days = calDate ? Math.round((new Date(calDate).getTime() - Date.now()) / 86400000) : undefined;
        return {
            id: get(row, 'id') || `IMP-${Date.now()}-${i}`,
            name: get(row, 'name') || `Tool ${i + 1}`,
            description: get(row, 'description') || '',
            make: get(row, 'make') || null,
            model: get(row, 'model') || null,
            serial: get(row, 'serial') || null,
            calibrationRequired: !!calDate,
            calibrationDueDate: calDate,
            calibrationDueDays: days,
            calibrationStatus: days === undefined ? 'N/A' : days > 0 ? 'Good' : 'Needs Calibration',
            category: get(row, 'category') || undefined,
            toolCost: get(row, 'toolCost') || undefined,
            vendorPrices: {},
        };
    });
}

// ── 5. Tool Comparison — CLIENT-SIDE (zero tokens) ───────────────────────────
export function compareToolsClientSide(
    neededTools: Tool[], masterInventory: Tool[], onOrderTools: Tool[] = []
): Omit<ComparisonResult, 'suggestedSubstitutions'> {
    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.]/g, '');
    const available: Tool[] = [], onOrder: Tool[] = [], shortage: Tool[] = [];
    for (const n of neededTools) {
        const pn = norm(n.id), nm = norm(n.name);
        const inInv = masterInventory.find(t => norm(t.id) === pn || norm(t.name) === nm);
        if (inInv) { available.push(inInv); continue; }
        const inOrd = onOrderTools.find(t => norm(t.id) === pn || norm(t.name) === nm);
        inOrd ? onOrder.push(inOrd) : shortage.push(n);
    }
    return { available, onOrder, shortage };
}

// ── 6. AI Substitution Suggestions (user-gated, context capped at 50) ────────
export async function findSubstitutions(
    shortageTools: Tool[], masterInventory: Tool[]
): Promise<SuggestedSubstitution[]> {
    if (!shortageTools.length) return [];
    const key = `subs:${shortageTools.map(t => t.id).sort().join(',')}`;
    const cached = getCached<SuggestedSubstitution[]>(key);
    if (cached) return cached;

    const ai = getAI();
    const cats = new Set(shortageTools.map(t => t.category).filter(Boolean));
    const pruned = [...masterInventory.filter(t => cats.has(t.category)), ...masterInventory.filter(t => !cats.has(t.category))].slice(0, 50);

    const r = await ai.models.generateContent({
        model: MODEL,
        contents: `Aviation tool equivalency expert. Find substitutions for shortage tools.
SHORTAGE (id|name|make|model|category):
${shortageTools.map(toolLine).join('\n')}

AVAILABLE INVENTORY (id|name|make|model|category):
${pruned.map(toolLine).join('\n')}

Return ONLY a JSON array: [{"neededToolId":"...","suggestedToolId":"...","confidence":"High|Medium|Low","reason":"..."}]
Only suggest functionally compatible tools. Omit if no good match.`,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
    });

    const raw = cleanJson<{ neededToolId: string; suggestedToolId: string; confidence: 'High' | 'Medium' | 'Low'; reason: string }[]>(r.text);
    const invMap = new Map(masterInventory.map(t => [t.id, t]));
    const shrMap = new Map(shortageTools.map(t => [t.id, t]));
    const result: SuggestedSubstitution[] = raw
        .filter(x => shrMap.has(x.neededToolId) && invMap.has(x.suggestedToolId))
        .map(x => ({ neededTool: shrMap.get(x.neededToolId)!, suggestedTool: invMap.get(x.suggestedToolId)!, confidence: x.confidence, reason: x.reason }));

    setCached(key, result);
    return result;
}

// ── 7. Predictive Tooling (job description → tool list) ─────────────────────
export async function predictToolsFromJob(jobDescription: string, existingInventory: Tool[] = []): Promise<Tool[]> {
    const key = `predict:${jobDescription.slice(0, 100)}`;
    const cached = getCached<Tool[]>(key);
    if (cached) return cached;

    const ai = getAI();
    const sample = existingInventory.slice(0, 15).map(t => t.name).join(', ');

    const r = await ai.models.generateContent({
        model: MODEL,
        contents: `Aviation A&P mechanic with 20 years experience. List tools required for this job.
JOB: ${jobDescription}
INVENTORY SAMPLE (for naming reference): ${sample || 'none'}

Return ONLY a JSON array of tools:
[{"id":"PRED-001","name":"...","description":"...","make":"...","model":"...","serial":null,"calibrationRequired":false,"calibrationDueDate":null,"vendorPrices":{}}]
Include 5-20 tools. Be specific with manufacturer/model for aviation tools. Set calibrationRequired:true for precision measuring tools.`,
        config: { responseMimeType: 'application/json', temperature: 0.3 },
    });

    const raw = cleanJson<Partial<Tool>[]>(r.text);
    const result: Tool[] = raw.map((t, i): Tool => ({
        id:                  t.id || `PRED-${i}-${Date.now()}`,
        name:                t.name || 'Unknown Tool',
        description:         t.description || '',
        make:                t.make ?? null,
        model:               t.model ?? null,
        serial:              null,
        calibrationRequired: t.calibrationRequired ?? false,
        calibrationDueDate:  undefined,
        calibrationStatus:   'N/A',
        vendorPrices:        {},
    }));

    setCached(key, result);
    return result;
}

// ── 8. Quote Generation (trimmed context) ────────────────────────────────────
export async function generateQuoteForOrder(
    order: WorkOrder | RepairOrder, aircraft: Aircraft,
    inventory: InventoryItem[], rates: { laborRate: number; shopSupplyRate: number; taxRate: number }
): Promise<Quote> {
    const ai = getAI();
    const totalHours = order.squawks.reduce((s, sq) => s + sq.hours_estimate, 0);
    const usedIds = [...new Set(order.squawks.flatMap(sq => sq.used_parts.map(p => p.inventory_item_id)))];
    const parts = usedIds.map(id => {
        const p = inventory.find(x => x.id === id); if (!p) return null;
        const qty = order.squawks.flatMap(sq => sq.used_parts).filter(x => x.inventory_item_id === id).reduce((s, x) => s + x.quantity_used, 0);
        return { description: p.description, part_no: p.part_no, qty, cost: p.suppliers[0]?.cost ?? 0 };
    }).filter(Boolean);

    const r = await ai.models.generateContent({
        model: MODEL,
        contents: `Generate a maintenance quote. Return ONLY JSON.
Order: ${'wo_id' in order ? order.wo_id : order.ro_id}
Aircraft: ${aircraft.tail_number} ${aircraft.model}
Labor: ${totalHours}hrs @ $${rates.laborRate}/hr | Shop supplies: ${rates.shopSupplyRate}% | Tax: ${rates.taxRate}%
Parts: ${JSON.stringify(parts)}
Tasks: ${order.squawks.map(s => s.description).join('; ')}

Schema: {"customerDescription":"...","lineItems":[{"description":"...","part_no":"...","quantity":1,"unitPrice":0,"total":0}],"subtotal":0,"laborTotal":0,"partsTotal":0,"shopSupplies":0,"tax":0,"grandTotal":0}`,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
    });

    return cleanJson<Quote>(r.text);
}

// ── 9. Packing Slip Image Analysis (multimodal, user-gated) ─────────────────
// ── 9b. FAA 8130-3 Form Extraction ───────────────────────────────────────────
export interface Extracted8130 {
    block1_ship_from?:   string;
    block2_ship_to?:     string;
    block3_wo_number?:   string;
    block5_tracking_no?: string;
    block6_part_no:      string;
    block6_description:  string;
    block7_serial_no?:   string;
    block8_eligibility?: 'Domestic' | 'Export' | 'Unknown';
    block9_quantity:     number;
    block10_batch_lot?:  string;
    block11_condition:   'New' | 'Overhauled' | 'Repaired' | 'Inspected' | 'Modified' | 'Unknown';
    block12_remarks?:    string;
    block13a_agency?:    string;
    block13b_cert_no?:   string;
}

export async function analyze8130Form(base64Data: string, mimeType: string): Promise<Extracted8130> {
    const ai = getAI();
    const r = await ai.models.generateContent({
        model: MODEL,
        contents: [
            { inlineData: { mimeType, data: base64Data } },
            { text: `You are an FAA document extraction specialist. Extract all available fields from this FAA 8130-3 Authorized Release Certificate. Return ONLY valid JSON matching this exact schema — use empty string for missing text fields, 0 for missing numbers, "Unknown" for unknown condition/eligibility:
{
  "block1_ship_from": "",
  "block2_ship_to": "",
  "block3_wo_number": "",
  "block5_tracking_no": "",
  "block6_part_no": "",
  "block6_description": "",
  "block7_serial_no": "",
  "block8_eligibility": "Domestic",
  "block9_quantity": 1,
  "block10_batch_lot": "",
  "block11_condition": "New",
  "block12_remarks": "",
  "block13a_agency": "",
  "block13b_cert_no": ""
}
block11_condition must be one of: New, Overhauled, Repaired, Inspected, Modified, Unknown.
block8_eligibility must be one of: Domestic, Export, Unknown.` },
        ] as any,
        config: { responseMimeType: 'application/json', temperature: 0.0 },
    });
    return cleanJson<Extracted8130>(r.text);
}

export async function analyzePackingSlip(base64Image: string, mimeType: string): Promise<ParsedPackingSlipItem[]> {
    const ai = getAI();
    const r = await ai.models.generateContent({
        model: MODEL,
        contents: [
            { inlineData: { mimeType, data: base64Image } },
            { text: 'Extract all line items from this packing slip. Return ONLY JSON array: [{"partNumber":"...","description":"...","quantityShipped":1,"unitCost":0.00}]. Use 0 for unknown numbers.' },
        ] as any,
        config: { responseMimeType: 'application/json', temperature: 0.0 },
    });
    return cleanJson<ParsedPackingSlipItem[]>(r.text);
}

// ── 10. Data Migration Validation ────────────────────────────────────────────
export async function cleanAndValidateDataWithAI(
    csvText: string,
    dataType: 'workOrders' | 'tooling' | 'consumables',
    aircraftList: Aircraft[]
): Promise<{ records: (StagedWorkOrder | StagedTool | StagedConsumable)[] }> {
    if (dataType === 'workOrders') {
        await new Promise(r => setTimeout(r, 1500));
        return { records: [
            { wo_id: 'WO-OLD-001', aircraft_tail_number: 'N12345', visit_name: 'Annual Inspection', scheduled_date: '2023-05-15', status: 'Completed', priority: 'routine', tasks: 'Engine oil change;Tire check', validationStatus: 'valid', validationNotes: [] },
            { wo_id: 'WO-OLD-002', aircraft_tail_number: 'N120GF', visit_name: '100-Hour', scheduled_date: '2023-06-20', status: 'Completed', priority: 'routine', tasks: 'Spark plug inspection', validationStatus: 'valid', validationNotes: [] },
        ] as StagedWorkOrder[] };
    }
    if (dataType === 'consumables') {
        await new Promise(r => setTimeout(r, 1500));
        return { records: [
            { 'Part Number': 'OIL-15W50', Description: 'Engine Oil 15W-50 Qt', Location: 'Shelf A1', Quantity: 12, 'Min Level': 6, validationStatus: 'valid', validationNotes: [] },
        ] as StagedConsumable[] };
    }
    // tooling — use AI column detection + client-side apply
    const headerRow = csvText.split('\n')[0];
    const mapping = await detectCsvColumnMapping(headerRow);
    const tools = applyCsvMapping(csvText, mapping);
    return {
        records: tools.map((t): StagedTool => ({
            Name: t.name, Description: t.description || '',
            Make: t.make ?? undefined, Model: t.model ?? undefined, Serial: t.serial ?? undefined,
            ToolType: t.calibrationRequired ? 'Cert' : 'Ref',
            CalibrationDueNextDate: t.calibrationDueDate,
            validationStatus: 'valid', validationNotes: [],
        })),
    };
}

// ── 11. AD Compliance Fetch (kept as-is) ─────────────────────────────────────
export async function fetchAircraftADs(aircraft: Aircraft): Promise<ADCompliance[]> {
    await new Promise(r => setTimeout(r, 800));
    return aircraft.ad_compliance;
}
