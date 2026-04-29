// =============================================================================
// services/warehouseStore.ts
// localStorage persistence for warehouse data that must survive page refresh:
//   - forms8130       (scanned 8130-3 documents)
//   - checkoutRecords (part movement history)
//   - partsInventory  (parts added via 8130 workflow — not the seed data)
//
// Strategy: seed data (MOCK_PARTS_INVENTORY) is always loaded fresh.
//           warehouse items (added via scan/receive) are stored separately
//           and merged on top at startup.
// =============================================================================

import { Form8130, CheckoutRecord, InventoryItem } from '../types.ts';

const KEYS = {
    forms:     'warehouse_forms8130',
    checkouts: 'warehouse_checkouts',
    parts:     'warehouse_parts',       // parts added via 8130 workflow only
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function load<T>(key: string): T[] {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function save<T>(key: string, items: T[]): void {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
        console.warn('[warehouseStore] localStorage write failed:', e);
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function loadWarehouseForms(): Form8130[] {
    return load<Form8130>(KEYS.forms);
}

export function saveWarehouseForms(forms: Form8130[]): void {
    save(KEYS.forms, forms);
}

export function loadWarehouseCheckouts(): CheckoutRecord[] {
    return load<CheckoutRecord>(KEYS.checkouts);
}

export function saveWarehouseCheckouts(records: CheckoutRecord[]): void {
    save(KEYS.checkouts, records);
}

/** Parts added via 8130 workflow (not mock seed data) */
export function loadWarehouseParts(): InventoryItem[] {
    return load<InventoryItem>(KEYS.parts);
}

export function saveWarehouseParts(parts: InventoryItem[]): void {
    save(KEYS.parts, parts);
}

/** Upsert a single form */
export function upsertForm(form: Form8130): void {
    const existing = load<Form8130>(KEYS.forms);
    const idx = existing.findIndex(f => f.id === form.id);
    if (idx >= 0) existing[idx] = form;
    else existing.push(form);
    save(KEYS.forms, existing);
}

/** Upsert a single inventory item */
export function upsertPart(part: InventoryItem): void {
    const existing = load<InventoryItem>(KEYS.parts);
    const idx = existing.findIndex(p => p.id === part.id);
    if (idx >= 0) existing[idx] = part;
    else existing.push(part);
    save(KEYS.parts, existing);
}

/** Delete a warehouse-added part */
export function deletePart(id: string): void {
    const existing = load<InventoryItem>(KEYS.parts);
    save(KEYS.parts, existing.filter(p => p.id !== id));
}

/** Clear all warehouse data (for dev/reset) */
export function clearAll(): void {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}
