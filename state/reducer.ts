import { AppState, AppAction } from './types.ts';

export const initialState: AppState = {
    // Core Tech1 state
    aircraftList:     [],
    schedules:        {},
    forecasts:        {},
    workOrders:       [],
    repairOrders:     [],
    technicians:      [],
    partsInventory:   [],
    consumables:      [],
    purchaseOrders:   [],
    generalTimeLogs:  [],
    activeTimeLogs:   [],
    notifications:    [],
    // Unified tooling slice
    tools:            [],
    toolKits:         [],
    neededTools:      [],
    comparisonResult: null,
    aircraftToolData: [],
    isLoading:        true,
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        // ── Existing Tech1 actions (unchanged) ───────────────────────────
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };
        case 'SET_ALL_DATA':
            return { ...state, ...action.payload, isLoading: false };
        case 'SET_AIRCRAFT_LIST':
            return { ...state, aircraftList: action.payload };
        case 'SET_SCHEDULES':
            return { ...state, schedules: action.payload };
        case 'SET_FORECAST':
            return { ...state, forecasts: { ...state.forecasts, [action.payload.aircraftId]: action.payload.forecast } };
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
        case 'SET_PURCHASE_ORDERS':
            return { ...state, purchaseOrders: action.payload };
        case 'SET_GENERAL_TIME_LOGS':
            return { ...state, generalTimeLogs: action.payload };
        case 'SET_ACTIVE_TIME_LOGS':
            return { ...state, activeTimeLogs: action.payload };
        case 'ADD_NOTIFICATION': {
            const updated = [action.payload, ...state.notifications].slice(0, 50);
            return { ...state, notifications: updated };
        }
        case 'MARK_NOTIFICATIONS_AS_READ':
            return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };

        // ── New tooling actions (Phase 1) ─────────────────────────────────
        case 'SET_TOOLS':
            return { ...state, tools: action.payload };
        case 'ADD_TOOL':
            return { ...state, tools: [...state.tools, action.payload] };
        case 'UPDATE_TOOL':
            return { ...state, tools: state.tools.map(t => t.id === action.payload.id ? action.payload : t) };
        case 'DELETE_TOOL':
            return { ...state, tools: state.tools.filter(t => t.id !== action.payload) };
        case 'SET_TOOL_KITS':
            return { ...state, toolKits: action.payload };
        case 'ADD_KIT':
            return { ...state, toolKits: [...state.toolKits, action.payload] };
        case 'DELETE_KIT':
            return { ...state, toolKits: state.toolKits.filter(k => k.id !== action.payload) };
        case 'SET_NEEDED_TOOLS':
            return { ...state, neededTools: action.payload };
        case 'SET_COMPARISON_RESULT':
            return { ...state, comparisonResult: action.payload };
        case 'SET_AIRCRAFT_TOOL_DATA':
            return { ...state, aircraftToolData: action.payload };

        default:
            return state;
    }
};
