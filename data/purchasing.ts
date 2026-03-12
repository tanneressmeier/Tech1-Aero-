// FIX: Corrected import path for types by adding file extension.
import { PurchaseOrder } from '../types.ts';

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
    {
        po_id: "402112025",
        supplierName: "ULINE",
        created_date: "2025-11-03",
        status: "Received",
        items: [
            { id: 'po-item-1', inventoryItemId: 'S-10250BLU', name: "S-10250BLU", description: "3M471 1/4\"X36YD BLUE TP 6/CT", quantityToOrder: 12, costPerUnit: 10.50, supplierName: "ULINE" },
            { id: 'po-item-2', inventoryItemId: 'S-10251BLU', name: "S-10251BLU", description: "3M471 1/2\"X36YD BLUE TP 72/CT", quantityToOrder: 10, costPerUnit: 12.00, supplierName: "ULINE" },
            { id: 'po-item-3', inventoryItemId: 'S-10311', name: "S-10311", description: "3M425 2\"X60YD ALUMINUM FOIL TAPE", quantityToOrder: 5, costPerUnit: 25.00, supplierName: "ULINE" },
            { id: 'po-item-4', inventoryItemId: 'S-6537', name: "S-6537", description: "3M200/201+ 1/2\"X60YD MASKING TP", quantityToOrder: 12, costPerUnit: 5.50, supplierName: "ULINE" },
            { id: 'po-item-5', inventoryItemId: 'S-6539', name: "S-6539", description: "3M200/201+ 1\"X60YD MASKING TAPE", quantityToOrder: 12, costPerUnit: 7.50, supplierName: "ULINE" }
        ],
        totalCost: (12*10.5) + (10*12) + (5*25) + (12*5.5) + (12*7.5)
    }
];