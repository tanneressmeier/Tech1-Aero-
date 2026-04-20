
// FIX: Corrected import path for types by adding file extension.
import { InventoryItem } from "../types.ts";
// FIX: Corrected import to use the newly created parseConsumablesFromCSV function.
// FIX: Corrected import path for parser by adding file extension.
import { parseConsumablesFromCSV } from "../utils/csvParser.ts";
// FIX: Corrected import path for CSV data by adding file extension.
import { BJC_CONSUMABLES_CSV } from './consumables.csv.ts';


export const MOCK_PARTS_INVENTORY: InventoryItem[] = [
    {
        id: 'part-1',
        part_no: 'HW-1001',
        sku: 'HW1001',
        description: 'AN3-5A Bolt',
        qty_on_hand: 500,
        qty_reserved: 0,
        reorder_level: 100,
        shelf_location: 'A-01-01',
        storage_area: 'Hardware',
        procurement_lead_time: 7,
        unit: 'EA',
        suppliers: [{ supplierName: 'Aircraft Spruce', cost: 0.50 }],
        certification: {
            type: '8130-3',
            verified: true,
            number: 'FAA-8130-999',
            mediaName: '8130_HW1001.pdf'
        }
    },
    {
        id: 'part-2',
        part_no: 'HW-1002',
        sku: 'HW1002',
        description: 'MS21044N3 Nut',
        qty_on_hand: 800,
        qty_reserved: 0,
        reorder_level: 200,
        shelf_location: 'A-01-02',
        storage_area: 'Hardware',
        procurement_lead_time: 7,
        unit: 'EA',
        suppliers: [{ supplierName: 'Aircraft Spruce', cost: 0.25 }],
        certification: {
            type: 'CoC',
            verified: true,
            number: 'COC-55522',
            mediaName: 'COC_Batch_55.pdf'
        }
    },
    {
        id: 'part-3',
        part_no: 'AV-2001',
        sku: 'AV2001',
        description: 'Landing Light Bulb',
        qty_on_hand: 12,
        qty_reserved: 0,
        reorder_level: 5,
        shelf_location: 'B-05-01',
        storage_area: 'Avionics',
        procurement_lead_time: 14,
        unit: 'EA',
        suppliers: [{ supplierName: 'Avionics Source', cost: 120.00 }],
        certification: { type: 'None', verified: false }
    },
    {
        // BACKORDERED — expected_delivery_date set to demonstrate Gantt cascade
        id: 'part-4',
        part_no: 'HYD-5606-SEAL',
        sku: 'HYD5606SEAL',
        description: 'Main Gear Hydraulic Actuator Seal Kit',
        qty_on_hand: 0,
        qty_reserved: 1,
        reorder_level: 2,
        shelf_location: 'D-03-01',
        storage_area: 'Hydraulics',
        procurement_lead_time: 14,
        unit: 'KIT',
        suppliers: [{ supplierName: 'Parker Hannifin', cost: 320.00 }],
        expected_delivery_date: new Date(Date.now() + 12 * 86_400_000).toISOString().split('T')[0],
        certification: { type: 'EASA Form 1', verified: true, number: 'EASA-2025-0042' }
    }
];

export const MOCK_CONSUMABLES_INVENTORY: InventoryItem[] = parseConsumablesFromCSV(BJC_CONSUMABLES_CSV);
