
// services/api.ts

import { Aircraft, WorkOrder, RepairOrder, Technician, InventoryItem, Tool, PurchaseOrder } from '../types.ts';
import { MOCK_AIRCRAFT_FLEET } from '../data/fleet.ts';
import { MOCK_WORK_ORDERS, MOCK_REPAIR_ORDERS } from '../data/orders.ts';
import { MOCK_TECHNICIANS } from '../data/personnel.ts';
import { MOCK_PARTS_INVENTORY, MOCK_CONSUMABLES_INVENTORY } from '../data/inventory.ts';
import { MOCK_TOOLS } from '../data/tools.ts';
import { MOCK_PURCHASE_ORDERS } from '../data/purchasing.ts';
import { DEFAULT_TRAINING_CATALOG } from '../data/trainingCatalog.ts';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ── Generic CRUD helpers ────────────────────────────────────────────────────
// Types whose primary key is not `.id` (WorkOrder, RepairOrder, PurchaseOrder)
// use updateItemByKey. Everything else uses the two-arg updateItem.

async function updateItem<T extends { id: string }>(collection: T[], item: T): Promise<T> {
    await delay(200);
    const index = collection.findIndex(i => i.id === item.id);
    if (index > -1) collection[index] = item;
    return item;
}

async function updateItemByKey<T, K extends keyof T>(collection: T[], item: T, key: K): Promise<T> {
    await delay(200);
    const index = collection.findIndex(i => i[key] === item[key]);
    if (index > -1) collection[index] = item;
    return item;
}

async function addItem<T extends { id: string }>(
    collection: T[],
    item: Omit<T, 'id'>,
    prefix: string,
): Promise<T> {
    await delay(300);
    const newItem = { ...item, id: `${prefix}-${Date.now()}` } as T;
    collection.push(newItem);
    return newItem;
}

async function deleteItem<T extends { id: string }>(collection: T[], id: string): Promise<null> {
    await delay(200);
    const index = collection.findIndex(i => i.id === id);
    if (index > -1) collection.splice(index, 1);
    return null;
}

// ── API surface ─────────────────────────────────────────────────────────────

export const api = {
  fetchAllData: async () => {
    console.log("API: Fetching all initial data from mock service...");
    await delay(500);

    return JSON.parse(JSON.stringify({
      aircraftList: MOCK_AIRCRAFT_FLEET,
      workOrders: MOCK_WORK_ORDERS,
      repairOrders: MOCK_REPAIR_ORDERS,
      technicians: MOCK_TECHNICIANS,
      partsInventory: MOCK_PARTS_INVENTORY,
      consumables: MOCK_CONSUMABLES_INVENTORY,
      tools: MOCK_TOOLS,
      purchaseOrders: MOCK_PURCHASE_ORDERS,
      generalTimeLogs: (() => {
          const logs = [];
          const techs = ['tech-1','tech-2','tech-3','tech-5','tech-6'];
          const now = Date.now();
          for (let day = 60; day >= 1; day--) {
              const dayMs = now - day * 86400000;
              const dow = new Date(dayMs).getDay();
              if (dow === 0 || dow === 6) continue;
              techs.forEach((techId, tidx) => {
                  logs.push({
                      log_id: `shop-${techId}-${day}`,
                      technician_id: techId,
                      start_time: new Date(dayMs + 8*3600000).toISOString(),
                      end_time:   new Date(dayMs + 16*3600000).toISOString(),
                      is_billable: false,
                  });
                  const billableHrs = 4 + (tidx % 3) + Math.floor(Math.random() * 3);
                  logs.push({
                      log_id: `bill-${techId}-${day}`,
                      technician_id: techId,
                      start_time: new Date(dayMs + 8*3600000).toISOString(),
                      end_time:   new Date(dayMs + (8+billableHrs)*3600000).toISOString(),
                      is_billable: true,
                      order_id: day < 45 ? 'WO-24-001' : 'WO-25-001',
                      order_type: 'WO' as const,
                  });
              });
          }
          return logs;
      })(),
      activeTimeLogs: [],
      trainingRequirements: DEFAULT_TRAINING_CATALOG,
    }));
  },

  // ── Aircraft ──────────────────────────────────────────────────────────────
  updateAircraft:      (aircraft: Aircraft)              => updateItem(MOCK_AIRCRAFT_FLEET, aircraft),

  // ── Work Orders ───────────────────────────────────────────────────────────
  createWorkOrder: async (wo: Omit<WorkOrder, 'wo_id'>): Promise<WorkOrder> => {
    await delay(300);
    const newWo: WorkOrder = { ...wo, wo_id: `WO-MOCK-${Date.now()}` };
    MOCK_WORK_ORDERS.push(newWo);
    return newWo;
  },
  updateWorkOrder:     (wo: WorkOrder)                   => updateItemByKey(MOCK_WORK_ORDERS, wo, 'wo_id'),

  // ── Repair Orders ─────────────────────────────────────────────────────────
  createRepairOrder: async (ro: Omit<RepairOrder, 'ro_id'>): Promise<RepairOrder> => {
    await delay(300);
    const newRo: RepairOrder = { ...ro, ro_id: `RO-MOCK-${Date.now()}` };
    MOCK_REPAIR_ORDERS.push(newRo);
    return newRo;
  },
  updateRepairOrder:   (ro: RepairOrder)                 => updateItemByKey(MOCK_REPAIR_ORDERS, ro, 'ro_id'),

  // ── Tools ─────────────────────────────────────────────────────────────────
  createTool:          (tool: Omit<Tool, 'id'>)          => addItem(MOCK_TOOLS, tool, 'tool-mock'),
  updateTool:          (tool: Tool)                      => updateItem(MOCK_TOOLS, tool),
  deleteTool:          (toolId: string)                  => deleteItem(MOCK_TOOLS, toolId),

  // ── Inventory ─────────────────────────────────────────────────────────────
  updateConsumable:    (item: InventoryItem)             => updateItem(MOCK_CONSUMABLES_INVENTORY, item),
  updatePart:          (item: InventoryItem)             => updateItem(MOCK_PARTS_INVENTORY, item),

  // ── Technicians ───────────────────────────────────────────────────────────
  createTechnician:    (tech: Omit<Technician, 'id'>)    => addItem(MOCK_TECHNICIANS, tech, 'tech-mock'),
  updateTechnician:    (tech: Technician)                => updateItem(MOCK_TECHNICIANS, tech),

  // ── Purchase Orders ───────────────────────────────────────────────────────
  updatePurchaseOrder: (po: PurchaseOrder)               => updateItemByKey(MOCK_PURCHASE_ORDERS, po, 'po_id'),
};
