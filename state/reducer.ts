// FIX: Corrected import path for types by adding file extension.
import { AppState, AppAction } from './types.ts';

export const initialState: AppState = {
  aircraftList: [],
  schedules: {},
  forecasts: {},
  workOrders: [],
  repairOrders: [],
  technicians: [],
  partsInventory: [],
  consumables: [],
  tools: [],
  purchaseOrders: [],
  generalTimeLogs: [],
  activeTimeLogs: [],
  notifications: [],
  isLoading: true,
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ALL_DATA':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
      };
    case 'SET_AIRCRAFT_LIST':
      return { ...state, aircraftList: action.payload };
    case 'SET_SCHEDULES':
      return { ...state, schedules: action.payload };
    case 'SET_FORECAST':
      return {
        ...state,
        forecasts: {
          ...state.forecasts,
          [action.payload.aircraftId]: action.payload.forecast,
        },
      };
    case 'SET_WORK_ORDERS':
      return { ...state, workOrders: action.payload };
    case 'SET_REPAIR_ORDERS':
      return { ...state, repairOrders: action.payload };
    case 'SET_TECHNICIANS':
      return { ...state, technicians: action.payload };
    case 'SET_PARTS_INVENTORY':
      return { ...state, partsInventory: action.payload };
    case 'SET_CONSUMABLES':
      return { ...state, consumables: action.payload };
    case 'SET_TOOLS':
      return { ...state, tools: action.payload };
    case 'SET_PURCHASE_ORDERS':
      return { ...state, purchaseOrders: action.payload };
    case 'SET_GENERAL_TIME_LOGS':
      return { ...state, generalTimeLogs: action.payload };
    case 'SET_ACTIVE_TIME_LOGS':
      return { ...state, activeTimeLogs: action.payload };
    case 'ADD_NOTIFICATION':
      // Add to the beginning of the array and limit to 50 notifications
      const newNotifications = [action.payload, ...state.notifications].slice(0, 50);
      return { ...state, notifications: newNotifications };
    case 'MARK_NOTIFICATIONS_AS_READ':
        return {
            ...state,
            notifications: state.notifications.map(n => ({ ...n, read: true })),
        };
    default:
      return state;
  }
};