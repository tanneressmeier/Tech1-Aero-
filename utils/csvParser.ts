// FIX: Add file extension to import.
import { Tool, InventoryItem, Supplier } from '../types.ts';

function parseCSV<T>(csvText: string, mapFn: (row: Record<string, string>, index: number) => T): T[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    return dataRows.map((line, index) => {
        // This is a simple parser, won't handle commas inside quotes.
        // The data seems to be clean enough for this to work.
        const values = line.split(',');
        const rowObject = header.reduce((obj, key, index) => {
            obj[key] = values[index] ? values[index].trim() : '';
            return obj;
        }, {} as Record<string, string>);
        return mapFn(rowObject, index);
    });
}


export function parseToolsFromCSV(csvText: string): Tool[] {
    return parseCSV(csvText, (row): Tool => {
        return {
            id: row.Name || `tool-${row.ID}`,
            name: row.Name,
            description: row.Description,
            details: row.Details,
            make: row.Make || null,
            model: row.Model || null,
            serial: row.Serial || null,
            calibrationRequired: row.ToolType === 'Cert',
            calibrationDueDate: row.CalibrationDueNextDate || undefined,
            vendorPrices: {
                // Mock data, as it's not in the CSV
                bhd: Math.random() > 0.5 ? parseFloat((Math.random() * 200 + 50).toFixed(2)) : undefined,
                continental: Math.random() > 0.5 ? parseFloat((Math.random() * 200 + 50).toFixed(2)) : undefined,
            },
        };
    });
}

export function parseConsumablesFromCSV(csvText: string): InventoryItem[] {
    return parseCSV(csvText, (row): InventoryItem => {
        const suppliers: Supplier[] = [];
        if (Math.random() > 0.3) {
             suppliers.push({ supplierName: 'Aviall', cost: parseFloat((Math.random() * 50 + 10).toFixed(2)) });
        }
        if (Math.random() > 0.6) {
             suppliers.push({ supplierName: 'Aircraft Spruce', cost: parseFloat((Math.random() * 50 + 12).toFixed(2)) });
        }

        return {
            id: row.ID,
            part_no: row.PartNo,
            sku: row.PartNo, // Using PartNo as SKU for simplicity
            description: row.Description,
            qty_on_hand: parseInt(row.QtyOnHand, 10) || 0,
            qty_reserved: 0, // Default value
            reorder_level: parseInt(row.ReorderLevel, 10) || 0,
            shelf_location: row.ShelfLocation,
            storage_area: row.StorageArea,
            procurement_lead_time: 14, // Default value
            unit: row.Unit,
            expiration_date: row.ExpirationDate || 'On Condition',
            suppliers,
        };
    });
}
