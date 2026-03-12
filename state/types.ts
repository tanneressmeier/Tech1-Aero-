// FIX: Corrected import path for types by adding file extension.
import {
  Aircraft,
  OptimizedSchedule,
  WorkOrder,
  RepairOrder,
  Technician,
  InventoryItem,
  Tool,
  PurchaseOrder,
  TimeLog,
  MaintenanceForecast,
  Notification,
} from '../types.ts';

// Defines the shape of our application's entire state
export interface AppState {
  aircraftList: Aircraft[];
  schedules: Record<string, OptimizedSchedule | null>;
  forecasts: Record<string, MaintenanceForecast | null>;
  workOrders: WorkOrder[];
  repairOrders: RepairOrder[];
  technicians: Technician[];
  partsInventory: InventoryItem[];
  consumables: InventoryItem[];
  tools: Tool[];
  purchaseOrders: PurchaseOrder[];
  generalTimeLogs: TimeLog[];
  activeTimeLogs: TimeLog[];
  notifications: Notification[];
  isLoading: boolean;
}

// Defines all possible actions that can be dispatched to the reducer
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ALL_DATA'; payload: Omit<AppState, 'isLoading' | 'schedules' | 'forecasts' | 'notifications'> }
  | { type: 'SET_AIRCRAFT_LIST'; payload: Aircraft[] }
  | { type: 'SET_SCHEDULES'; payload: Record<string, OptimizedSchedule | null> }
  | { type: 'SET_FORECAST'; payload: { aircraftId: string, forecast: MaintenanceForecast | null } }
  | { type: 'SET_WORK_ORDERS'; payload: WorkOrder[] }
  | { type: 'SET_REPAIR_ORDERS'; payload: RepairOrder[] }
  | { type: 'SET_TECHNICIANS'; payload: Technician[] }
  | { type: 'SET_PARTS_INVENTORY'; payload: InventoryItem[] }
  | { type: 'SET_CONSUMABLES'; payload: InventoryItem[] }
  | { type: 'SET_TOOLS'; payload: Tool[] }
  | { type: 'SET_PURCHASE_ORDERS'; payload: PurchaseOrder[] }
  | { type: 'SET_GENERAL_TIME_LOGS'; payload: TimeLog[] }
  | { type: 'SET_ACTIVE_TIME_LOGS'; payload: TimeLog[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATIONS_AS_READ' };