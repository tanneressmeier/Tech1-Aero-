import {
    Aircraft, OptimizedSchedule, WorkOrder, RepairOrder, Technician,
    InventoryItem, Tool, PurchaseOrder, TimeLog, MaintenanceForecast,
    Notification, Kit, AircraftToolData, ComparisonResult,
    Form8130, CheckoutRecord,
} from '../types.ts';

export interface AppState {
    // ── Core Tech1 state (unchanged) ─────────────────────────────────────
    aircraftList:    Aircraft[];
    schedules:       Record<string, OptimizedSchedule | null>;
    forecasts:       Record<string, MaintenanceForecast | null>;
    workOrders:      WorkOrder[];
    repairOrders:    RepairOrder[];
    technicians:     Technician[];
    partsInventory:  InventoryItem[];
    consumables:     InventoryItem[];
    purchaseOrders:  PurchaseOrder[];
    generalTimeLogs: TimeLog[];
    activeTimeLogs:  TimeLog[];
    notifications:   Notification[];
    forms8130:       Form8130[];
    checkoutRecords: CheckoutRecord[];

    // ── Unified tooling slice (Phase 1 addition) ──────────────────────────
    tools:             Tool[];            // master tool inventory
    toolKits:          Kit[];             // reusable tool sets
    neededTools:       Tool[];            // working list for comparison
    comparisonResult:  ComparisonResult | null;
    aircraftToolData:  AircraftToolData[]; // per-aircraft tool history

    isLoading: boolean;
}

export type AppAction =
    // Existing Tech1 actions (unchanged)
    | { type: 'SET_LOADING';            payload: boolean }
    | { type: 'SET_ALL_DATA';           payload: Omit<AppState, 'isLoading' | 'schedules' | 'forecasts' | 'notifications' | 'toolKits' | 'neededTools' | 'comparisonResult' | 'aircraftToolData'> }
    | { type: 'SET_AIRCRAFT_LIST';      payload: Aircraft[] }
    | { type: 'SET_SCHEDULES';          payload: Record<string, OptimizedSchedule | null> }
    | { type: 'SET_FORECAST';           payload: { aircraftId: string; forecast: MaintenanceForecast | null } }
    | { type: 'SET_WORK_ORDERS';        payload: WorkOrder[] }
    | { type: 'SET_REPAIR_ORDERS';      payload: RepairOrder[] }
    | { type: 'SET_TECHNICIANS';        payload: Technician[] }
    | { type: 'SET_PARTS_INVENTORY';    payload: InventoryItem[] }
    | { type: 'SET_CONSUMABLES';        payload: InventoryItem[] }
    | { type: 'SET_PURCHASE_ORDERS';    payload: PurchaseOrder[] }
    | { type: 'SET_GENERAL_TIME_LOGS';  payload: TimeLog[] }
    | { type: 'SET_ACTIVE_TIME_LOGS';   payload: TimeLog[] }
    | { type: 'ADD_ACTIVE_TIME_LOG';    payload: TimeLog }
    | { type: 'CLOCK_OUT_TASK';         payload: { logId: string; endTime: string } }
    | { type: 'ADD_NOTIFICATION';       payload: Notification }
    | { type: 'MARK_NOTIFICATIONS_AS_READ' }
    // New tooling actions (Phase 1 additions)
    | { type: 'SET_TOOLS';              payload: Tool[] }
    | { type: 'ADD_TOOL';               payload: Tool }
    | { type: 'UPDATE_TOOL';            payload: Tool }
    | { type: 'DELETE_TOOL';            payload: string }
    | { type: 'SET_TOOL_KITS';          payload: Kit[] }
    | { type: 'ADD_KIT';                payload: Kit }
    | { type: 'DELETE_KIT';             payload: string }
    | { type: 'SET_NEEDED_TOOLS';       payload: Tool[] }
    | { type: 'SET_COMPARISON_RESULT';  payload: ComparisonResult | null }
    | { type: 'SET_AIRCRAFT_TOOL_DATA'; payload: AircraftToolData[] }
    // ── Warehouse / 8130 ─────────────────────────────────────────────────
    | { type: 'ADD_FORM_8130';          payload: Form8130 }
    | { type: 'UPDATE_FORM_8130';       payload: Form8130 }
    | { type: 'ADD_CHECKOUT_RECORD';    payload: CheckoutRecord }
    | { type: 'ADD_INVENTORY_ITEM';     payload: InventoryItem };
