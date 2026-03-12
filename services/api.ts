
// services/api.ts
// FIX: Reverted to a mock API implementation to resolve "Failed to fetch" errors.
// This version simulates async API calls using the local mock data, allowing the
// application to run without a live backend server.

import { Aircraft, WorkOrder, RepairOrder, Technician, InventoryItem, Tool, PurchaseOrder } from '../types.ts';
import { MOCK_AIRCRAFT_FLEET } from '../data/fleet.ts';
import { MOCK_WORK_ORDERS, MOCK_REPAIR_ORDERS } from '../data/orders.ts';
import { MOCK_TECHNICIANS } from '../data/personnel.ts';
import { MOCK_PARTS_INVENTORY, MOCK_CONSUMABLES_INVENTORY } from '../data/inventory.ts';
import { MOCK_TOOLS } from '../data/tools.ts';
import { MOCK_PURCHASE_ORDERS } from '../data/purchasing.ts';


// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const api = {
  /**
   * Fetches all initial data required for the application from the mock service.
   */
  fetchAllData: async () => {
    console.log("API: Fetching all initial data from mock service...");
    await delay(500); // Simulate network latency

    // The data is mutable, so return copies to prevent side effects between reloads/updates
    return JSON.parse(JSON.stringify({
      aircraftList: MOCK_AIRCRAFT_FLEET,
      workOrders: MOCK_WORK_ORDERS,
      repairOrders: MOCK_REPAIR_ORDERS,
      technicians: MOCK_TECHNICIANS,
      partsInventory: MOCK_PARTS_INVENTORY,
      consumables: MOCK_CONSUMABLES_INVENTORY,
      tools: MOCK_TOOLS,
      purchaseOrders: MOCK_PURCHASE_ORDERS,
      generalTimeLogs: [], // These are client-side
      activeTimeLogs: [],  // These are client-side
    }));
  },

  // --- CRUD Operations (Mocked) ---

  updateAircraft: async (aircraft: Aircraft): Promise<Aircraft> => {
    await delay(200);
    console.log("API (mock): Updating aircraft", aircraft.id);
    // In a real app, this would be persisted. For the mock, we just return the object.
    const index = MOCK_AIRCRAFT_FLEET.findIndex(a => a.id === aircraft.id);
    if (index > -1) MOCK_AIRCRAFT_FLEET[index] = aircraft;
    return aircraft;
  },

  createWorkOrder: async (wo: Omit<WorkOrder, 'wo_id'>): Promise<WorkOrder> => {
    await delay(300);
    const newWo: WorkOrder = { ...wo, wo_id: `WO-MOCK-${Date.now()}` };
    console.log("API (mock): Creating work order", newWo);
    MOCK_WORK_ORDERS.push(newWo);
    return newWo;
  },
  updateWorkOrder: async (wo: WorkOrder): Promise<WorkOrder> => {
    await delay(200);
    console.log("API (mock): Updating work order", wo.wo_id);
    const index = MOCK_WORK_ORDERS.findIndex(o => o.wo_id === wo.wo_id);
    if (index > -1) MOCK_WORK_ORDERS[index] = wo;
    return wo;
  },
  
  createRepairOrder: async (ro: Omit<RepairOrder, 'ro_id'>): Promise<RepairOrder> => {
    await delay(300);
    const newRo: RepairOrder = { ...ro, ro_id: `RO-MOCK-${Date.now()}` };
     console.log("API (mock): Creating repair order", newRo);
    MOCK_REPAIR_ORDERS.push(newRo);
    return newRo;
  },
  updateRepairOrder: async (ro: RepairOrder): Promise<RepairOrder> => {
    await delay(200);
    console.log("API (mock): Updating repair order", ro.ro_id);
    const index = MOCK_REPAIR_ORDERS.findIndex(o => o.ro_id === ro.ro_id);
    if (index > -1) MOCK_REPAIR_ORDERS[index] = ro;
    return ro;
  },

  createTool: async (tool: Omit<Tool, 'id'>): Promise<Tool> => {
    await delay(300);
    const newTool: Tool = { ...tool, id: `tool-mock-${Date.now()}` };
    console.log("API (mock): Creating tool", newTool);
    MOCK_TOOLS.push(newTool);
    return newTool;
  },
  updateTool: async (tool: Tool): Promise<Tool> => {
    await delay(200);
    console.log("API (mock): Updating tool", tool.id);
    const index = MOCK_TOOLS.findIndex(t => t.id === tool.id);
    if (index > -1) MOCK_TOOLS[index] = tool;
    return tool;
  },
  deleteTool: async (toolId: string): Promise<null> => {
    await delay(200);
    console.log("API (mock): Deleting tool", toolId);
    const index = MOCK_TOOLS.findIndex(t => t.id === toolId);
    if (index > -1) MOCK_TOOLS.splice(index, 1);
    return null; // For 204 No Content
  },

  updateConsumable: async (item: InventoryItem): Promise<InventoryItem> => {
    await delay(200);
    console.log("API (mock): Updating consumable", item.id);
    const index = MOCK_CONSUMABLES_INVENTORY.findIndex(c => c.id === item.id);
    if (index > -1) MOCK_CONSUMABLES_INVENTORY[index] = item;
    return item;
  },

  updatePart: async (item: InventoryItem): Promise<InventoryItem> => {
    await delay(200);
    console.log("API (mock): Updating part", item.id);
    const index = MOCK_PARTS_INVENTORY.findIndex(p => p.id === item.id);
    if (index > -1) MOCK_PARTS_INVENTORY[index] = item;
    return item;
  },
  
  createTechnician: async (tech: Omit<Technician, 'id'>): Promise<Technician> => {
    await delay(300);
    const newTech: Technician = { ...tech, id: `tech-mock-${Date.now()}` };
    console.log("API (mock): Creating technician", newTech);
    MOCK_TECHNICIANS.push(newTech);
    return newTech;
  },

  updateTechnician: async (tech: Technician): Promise<Technician> => {
    await delay(200);
    console.log("API (mock): Updating technician", tech.id);
    const index = MOCK_TECHNICIANS.findIndex(t => t.id === tech.id);
    if (index > -1) MOCK_TECHNICIANS[index] = tech;
    return tech;
  },
  
  updatePurchaseOrder: async (po: PurchaseOrder): Promise<PurchaseOrder> => {
    await delay(200);
    console.log("API (mock): Updating PO", po.po_id);
    const index = MOCK_PURCHASE_ORDERS.findIndex(p => p.po_id === po.po_id);
    if (index > -1) MOCK_PURCHASE_ORDERS[index] = po;
    return po;
  },
};
