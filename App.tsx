
import React, { useReducer, useEffect, useState, useCallback, useMemo } from 'react';

// State management
import { appReducer, initialState } from './state/reducer.ts';
import { AppState, AppAction } from './state/types.ts';

// API and services
import { api } from './services/api.ts';
import {
    loadWarehouseForms, loadWarehouseParts, loadWarehouseCheckouts,
    upsertForm, upsertPart, saveWarehouseForms, saveWarehouseParts, saveWarehouseCheckouts,
} from './services/warehouseStore.ts';
import { getSearchIntent, SearchIntent, generateOptimalSchedule, analyzeMaintenanceHistory } from './services/geminiService.ts';
import { useWebSocket } from './hooks/useWebSocket.ts';
import { useToast } from './contexts/ToastContext.tsx';
import { useAsyncAction } from './hooks/useAsyncAction.ts';
import { usePermissions } from './hooks/usePermissions.ts';
import { useSettings } from './contexts/SettingsContext.tsx';

// Types
import { View, Technician, WorkOrder, RepairOrder, Aircraft, OptimizedVisit, PurchaseOrder, PurchaseOrderItem, Squawk, StagedWorkOrder, StagedTool, StagedConsumable, ParsedPOHeader, ParsedPackingSlipItem, InventoryItem, Tool, TimeLog, Kit, Form8130, CheckoutRecord } from './types.ts';

// Components
import { AppSidebar, NavItem, NavGroup } from './components/AppSidebar.tsx';
import { AppHeader } from './components/AppHeader.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { MissionControlDashboard } from './components/MissionControlDashboard.tsx';
import { AircraftDashboard } from './components/AircraftDashboard.tsx';
import { WorkOrderDashboard } from './components/WorkOrderDashboard.tsx';
import { WorkOrderDetail } from './components/WorkOrderDetail.tsx';
import { RepairOrderDashboard } from './components/RepairOrderDashboard.tsx';
import { RepairOrderDetail } from './components/RepairOrderDetail.tsx';
import { ToolingDashboard } from './components/ToolingDashboard.tsx';
import { InventoryDashboard } from './components/InventoryDashboard.tsx';
import { ConsumablesDashboard } from './components/ConsumablesDashboard.tsx';
import { PersonnelDashboard } from './components/PersonnelDashboard.tsx';
import { PurchaseOrderDashboard } from './components/PurchaseOrderDashboard.tsx';
import { DataMigrationDashboard } from './components/DataMigrationDashboard.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { AnalyticsDashboard } from './components/AnalyticsDashboard.tsx';
import { ProfitabilityDashboard } from './components/ProfitabilityDashboard.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Icons (nav icons used by NAV_GROUPS)
import {
  HomeIcon,
  PlaneIcon,
  ClipboardListIcon,
  WrenchScrewdriverIcon,
  WrenchIcon,
  CogIcon,
  BeakerIcon,
  UsersIcon,
  ShoppingCartIcon,
  CalendarIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
} from './components/icons.tsx';

type DetailedView = 'work_order_detail' | 'repair_order_detail';
type CurrentView = View | DetailedView;

const NAV_GROUPS: NavGroup[] = [
    {
        label: 'Operations',
        items: [
            { view: 'mission_control', label: 'Dashboard',    icon: HomeIcon },
            { view: 'work_orders',    label: 'Work Orders',  icon: ClipboardListIcon },
            { view: 'repair_orders',  label: 'Repair Orders',icon: WrenchScrewdriverIcon },
            { view: 'calendar',       label: 'Schedule',     icon: CalendarIcon },
        ],
    },
    {
        label: 'Resources',
        items: [
            { view: 'aircraft',        label: 'Fleet',       icon: PlaneIcon },
            { view: 'tooling',         label: 'Tooling',     icon: WrenchIcon },
            { view: 'inventory',       label: 'Parts',       icon: CogIcon },
            { view: 'consumables',     label: 'Consumables', icon: BeakerIcon },
            { view: 'purchase_orders', label: 'Procurement', icon: ShoppingCartIcon },
        ],
    },
    {
        label: 'Management',
        items: [
            { view: 'personnel',       label: 'Personnel',     icon: UsersIcon,          adminOnly: true },
            { view: 'profitability',   label: 'Profitability', icon: CurrencyDollarIcon, adminOnly: true },
            { view: 'analytics',       label: 'Analytics',     icon: ChartPieIcon,       adminOnly: true },
        ],
    },
];

// Flat list kept for legacy compatibility (active view detection etc.)
const navItems = NAV_GROUPS.flatMap(g => g.items);

const App: React.FC = () => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const [currentUser, setCurrentUser] = useState<Technician | null>(null);
    const [currentView, setCurrentView] = useState<CurrentView>('mission_control');
    const [selectedOrder, setSelectedOrder] = useState<{type: 'wo' | 'ro', id: string, initialView?: 'list' | 'board' | 'gantt'} | null>(null);
    const [initialFilters, setInitialFilters] = useState<SearchIntent['filters'] | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const { showToast } = useToast();
    const { settings } = useSettings();
    const permissions = usePermissions(currentUser);

    const analyzeAction = useAsyncAction();
    const searchAction  = useAsyncAction();
    const apiAction     = useAsyncAction();

    const handleWebSocketMessage = useCallback((message: any) => {
        console.log('WebSocket message received:', message);
        showToast({ message: `Real-time update: ${message.payload.message}`, type: 'info' });
        // Here you would dispatch actions to update state based on message type
    }, [showToast]);

    useWebSocket(handleWebSocketMessage);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await api.fetchAllData();
                // Merge persisted warehouse data (survives page refresh)
                const savedForms     = loadWarehouseForms();
                const savedParts     = loadWarehouseParts();
                const savedCheckouts = loadWarehouseCheckouts();
                dispatch({
                    type: 'SET_ALL_DATA',
                    payload: {
                        ...data,
                        forms8130:       savedForms,
                        checkoutRecords: savedCheckouts,
                        // Merge: seed parts first, then warehouse-scanned parts on top
                        // (warehouse parts override if same id)
                        partsInventory: [
                            ...data.partsInventory.filter(p => !savedParts.some(s => s.id === p.id)),
                            ...savedParts,
                        ],
                    },
                });
            } catch (error) {
                console.error("Failed to fetch initial data", error);
                showToast({ message: "Failed to load application data. Is the backend running?", type: 'error' });
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };
        loadData();
    }, [showToast]);

    const handleLogin = (technicianId: string) => {
        const user = state.technicians.find(t => t.id === technicianId);
        if (user) {
            setCurrentUser(user);
            // Auto clock-in to shop (non-billable presence log) on login
            const shopLog: TimeLog = {
                log_id:        `shop-${user.id}-${Date.now()}`,
                technician_id: user.id,
                start_time:    new Date().toISOString(),
                is_billable:   false,   // presence only — billable time comes from task clock-in
            };
            // Close any open shop logs for this tech before opening a new one
            const existing = state.activeTimeLogs.find(l => l.technician_id === user.id && !l.squawk_id && !l.end_time);
            if (existing) {
                dispatch({ type: 'CLOCK_OUT_TASK', payload: { logId: existing.log_id, endTime: new Date().toISOString() } });
            }
            dispatch({ type: 'ADD_ACTIVE_TIME_LOG', payload: shopLog });
            showToast({ message: `Welcome, ${user.name}! Clocked in to shop.`, type: 'success' });
        }
    };

    // ── Task-level time tracking ──────────────────────────────────────────
    const handleClockInToTask = (log: Omit<TimeLog, 'log_id'>) => {
        // Only one active task clock-in per tech at a time
        const existing = state.activeTimeLogs.find(
            l => l.technician_id === log.technician_id && l.squawk_id && !l.end_time
        );
        if (existing) {
            // Auto clock-out of previous task before clocking into new one
            dispatch({ type: 'CLOCK_OUT_TASK', payload: { logId: existing.log_id, endTime: new Date().toISOString() } });
        }
        const newLog: TimeLog = { ...log, log_id: `task-${Date.now()}` };
        dispatch({ type: 'ADD_ACTIVE_TIME_LOG', payload: newLog });
    };

    const handleClockOutOfTask = (logId: string, endTime: string) => {
        dispatch({ type: 'CLOCK_OUT_TASK', payload: { logId, endTime } });
    };

    const handleNavigate = (link: { view: View, orderId?: string }) => {
        if(link.orderId) {
            const viewType = link.view === 'work_orders' ? 'wo' : 'ro';
            setSelectedOrder({ type: viewType, id: link.orderId });
            setCurrentView(link.view === 'work_orders' ? 'work_order_detail' : 'repair_order_detail');
        } else {
            setCurrentView(link.view);
            setSelectedOrder(null);
            setInitialFilters(null);
        }
    };

    const handleSelectOrder = (type: 'wo' | 'ro', orderId: string, initialView?: 'list' | 'board' | 'gantt') => {
        setSelectedOrder({ type, id: orderId, initialView });
        setCurrentView(type === 'wo' ? 'work_order_detail' : 'repair_order_detail');
    };

    const handleBackToDashboard = () => {
        if (selectedOrder?.type === 'wo') setCurrentView('work_orders');
        else if (selectedOrder?.type === 'ro') setCurrentView('repair_orders');
        else setCurrentView('mission_control');
        setSelectedOrder(null);
    };

    const handleUpdateOrder = (order: WorkOrder | RepairOrder) =>
        apiAction.run(async () => {
            if ('wo_id' in order) {
                const updatedOrder = await api.updateWorkOrder(order);
                dispatch({ type: 'SET_WORK_ORDERS', payload: state.workOrders.map(wo => wo.wo_id === updatedOrder.wo_id ? updatedOrder : wo) });
            } else {
                const updatedOrder = await api.updateRepairOrder(order);
                dispatch({ type: 'SET_REPAIR_ORDERS', payload: state.repairOrders.map(ro => ro.ro_id === updatedOrder.ro_id ? updatedOrder : ro) });
            }
            // No success toast here — this fires on every field edit and would spam.
        }, 'Failed to save order changes.');

    const handleUpdateAircraft = (updatedAircraft: Aircraft) =>
        apiAction.run(async () => {
            const returnedAircraft = await api.updateAircraft(updatedAircraft);
            dispatch({ type: 'SET_AIRCRAFT_LIST', payload: state.aircraftList.map(ac => ac.id === returnedAircraft.id ? returnedAircraft : ac) });
            showToast({ message: `Aircraft ${returnedAircraft.tail_number} updated.`, type: 'success' });
        }, 'Failed to update aircraft.');

    const handleScheduleGenerated = (aircraftId: string, schedule: any) => {
        dispatch({ type: 'SET_SCHEDULES', payload: { ...state.schedules, [aircraftId]: schedule } });
        if (schedule) {
            showToast({ message: `Optimized schedule generated for aircraft ${aircraftId}.`, type: 'success' });
        }
    };

    const handleAnalyzeHistory = (aircraft: Aircraft) =>
        analyzeAction.run(async () => {
            const forecast = await analyzeMaintenanceHistory(aircraft);
            dispatch({ type: 'SET_FORECAST', payload: { aircraftId: aircraft.id, forecast } });
            showToast({ message: `Maintenance analysis complete for ${aircraft.tail_number}`, type: 'info' });
        }, 'Failed to analyze history.');

    const handleCreateWorkOrderFromVisit = (aircraft: Aircraft, visit: OptimizedVisit) =>
        apiAction.run(async () => {
            const newWOData: Omit<WorkOrder, 'wo_id'> = {
                aircraft_id: aircraft.id,
                aircraft_tail_number: aircraft.tail_number,
                visit_name: visit.visitName,
                scheduled_date: visit.scheduledDate,
                status: "Pending",
                priority: "routine",
                squawks: [],
            };
            const createdWO = await api.createWorkOrder(newWOData);
            dispatch({ type: 'SET_WORK_ORDERS', payload: [...state.workOrders, createdWO] });
            showToast({ message: `Work Order created for ${visit.visitName}`, type: 'success' });
        }, 'Failed to create work order.');

    const handleAddWorkOrder = (newWOData: Omit<WorkOrder, 'wo_id'>) =>
        apiAction.run(async () => {
            const createdWO = await api.createWorkOrder(newWOData);
            dispatch({ type: 'SET_WORK_ORDERS', payload: [...state.workOrders, createdWO] });
            showToast({ message: 'Work Order created successfully.', type: 'success' });
        }, 'Failed to add work order.');

    const handleAddRepairOrder = (newROData: Omit<RepairOrder, 'ro_id' | 'created_date'>) =>
        apiAction.run(async () => {
            const createdRO = await api.createRepairOrder({...newROData, created_date: new Date().toISOString().split('T')[0]});
            dispatch({ type: 'SET_REPAIR_ORDERS', payload: [...state.repairOrders, createdRO] });
            showToast({ message: 'Repair Order created successfully.', type: 'success' });
        }, 'Failed to add repair order.');

    const handleAddTool = (toolData: Omit<Tool, 'id'>) =>
        apiAction.run(async () => {
            const newTool = await api.createTool(toolData);
            dispatch({ type: 'SET_TOOLS', payload: [...state.tools, newTool] });
            showToast({ message: `Tool ${newTool.name} added.`, type: 'success' });
        }, 'Failed to add tool.');

    const handleUpdateTool = (toolData: Tool) =>
        apiAction.run(async () => {
            const updatedTool = await api.updateTool(toolData);
            dispatch({ type: 'SET_TOOLS', payload: state.tools.map(t => t.id === updatedTool.id ? updatedTool : t) });
            showToast({ message: `Tool ${updatedTool.name} updated.`, type: 'success' });
        }, 'Failed to update tool.');

    const handleDeleteTool = (toolId: string) =>
        apiAction.run(async () => {
            await api.deleteTool(toolId);
            dispatch({ type: 'SET_TOOLS', payload: state.tools.filter(t => t.id !== toolId) });
            showToast({ message: `Tool deleted.`, type: 'success' });
        }, 'Failed to delete tool.');

    // ── Phase 1: unified tooling slice handlers ───────────────────────────
    const handleAddToolDirect = (tool: Tool) => {
        dispatch({ type: 'ADD_TOOL', payload: tool });
    };

    const handleUpdateToolDirect = (tool: Tool) => {
        dispatch({ type: 'UPDATE_TOOL', payload: tool });
        api.updateTool(tool).catch(() => showToast({ message: 'Failed to persist tool update.', type: 'error' }));
    };

    const handleDeleteToolDirect = (id: string) => {
        dispatch({ type: 'DELETE_TOOL', payload: id });
        api.deleteTool(id).catch(() => showToast({ message: 'Failed to persist tool delete.', type: 'error' }));
    };

    const handleSetTools = (tools: Tool[]) => {
        dispatch({ type: 'SET_TOOLS', payload: tools });
    };

    const handleSetKits = (kits: Kit[]) => {
        dispatch({ type: 'SET_TOOL_KITS', payload: kits });
    };

    const handleSetNeededTools = (tools: Tool[]) => {
        dispatch({ type: 'SET_NEEDED_TOOLS', payload: tools });
    };
    // ─────────────────────────────────────────────────────────────────────

    const handleUpdateConsumable = (consumable: InventoryItem) =>
        apiAction.run(async () => {
            const updatedItem = await api.updateConsumable(consumable);
            dispatch({ type: 'SET_CONSUMABLES', payload: state.consumables.map(c => c.id === updatedItem.id ? updatedItem : c) });
            showToast({ message: `Consumable updated.`, type: 'success' });
        }, 'Failed to update consumable.');

    const handleUpdatePart = (part: InventoryItem) =>
        apiAction.run(async () => {
            const updatedItem = await api.updatePart(part);
            dispatch({ type: 'SET_PARTS_INVENTORY', payload: state.partsInventory.map(p => p.id === updatedItem.id ? updatedItem : p) });
        }, 'Failed to update part.');

    const handleReceivePart = (form: Form8130, newItemPartial: Partial<InventoryItem>) => {
        const formExists = state.forms8130.some(f => f.id === form.id);
        const itemExists = state.partsInventory.some(p => p.form_8130_id === form.id);

        // Build the inventory item (always, whether new or update)
        const existingItem = state.partsInventory.find(p => p.form_8130_id === form.id);
        const itemId = existingItem?.id ?? newItemPartial.id ?? `part-ws-${Date.now()}`;

        const inventoryItem: InventoryItem = {
            id:                    itemId,
            part_no:               newItemPartial.part_no               ?? form.block6_part_no    ?? '',
            sku:                   newItemPartial.sku                   ?? form.block6_part_no    ?? '',
            description:           newItemPartial.description           ?? form.block6_description ?? '',
            qty_on_hand:           newItemPartial.qty_on_hand           ?? form.block9_quantity    ?? 0,
            qty_reserved:          existingItem?.qty_reserved           ?? 0,
            reorder_level:         existingItem?.reorder_level          ?? 1,
            shelf_location:        newItemPartial.shelf_location        ?? existingItem?.shelf_location ?? '',
            storage_area:          newItemPartial.storage_area          ?? existingItem?.storage_area   ?? 'General',
            procurement_lead_time: 7,
            unit:                  'EA',
            suppliers:             existingItem?.suppliers              ?? [],
            quarantine_status:     'active',
            condition:             (newItemPartial.condition            ?? form.block11_condition  ?? existingItem?.condition) as InventoryItem['condition'],
            form_tracking_no:      newItemPartial.form_tracking_no      ?? form.block5_tracking_no ?? existingItem?.form_tracking_no,
            form_8130_id:          form.id,
            certification: {
                type:     '8130-3',
                verified: true,
                number:   form.block5_tracking_no || form.block13b_cert_no || undefined,
            },
        };

        // Update / add form with inventory link
        const updatedForm: Form8130 = {
            ...form,
            inventory_item_id: itemId,
            shelf_location:    inventoryItem.shelf_location || form.shelf_location,
        };

        if (formExists) {
            dispatch({ type: 'UPDATE_FORM_8130',   payload: updatedForm });
        } else {
            dispatch({ type: 'ADD_FORM_8130',      payload: updatedForm });
        }

        if (itemExists) {
            dispatch({ type: 'SET_PARTS_INVENTORY', payload: state.partsInventory.map(p =>
                p.id === itemId ? inventoryItem : p
            )});
        } else {
            dispatch({ type: 'ADD_INVENTORY_ITEM', payload: inventoryItem });
        }

        // ── Persist to localStorage ──────────────────────────────────────────
        // Persist the form
        const updatedForms = formExists
            ? state.forms8130.map(f => f.id === form.id ? updatedForm : f)
            : [...state.forms8130, updatedForm];
        saveWarehouseForms(updatedForms);

        // Persist the inventory item (warehouse parts only — not seed data)
        upsertPart(inventoryItem);
    };

    // Persist form edits (archive) AND auto-create InventoryItem when a new form is scanned
    const handleUpdateForm = (form: Form8130) => {
        const exists = state.forms8130.some(f => f.id === form.id);
        if (exists) {
            dispatch({ type: 'UPDATE_FORM_8130', payload: form });
        } else {
            dispatch({ type: 'ADD_FORM_8130', payload: form });
        }
        // Persist form to localStorage
        const updatedForms = exists
            ? state.forms8130.map(f => f.id === form.id ? form : f)
            : [...state.forms8130, form];
        saveWarehouseForms(updatedForms);

        // Auto-create InventoryItem when a new form is scanned (not already linked)
        if (!exists && form.block6_part_no && !state.partsInventory.some(p => p.form_8130_id === form.id)) {
            const newItem: InventoryItem = {
                id:                    `part-${form.id}`,
                part_no:               form.block6_part_no,
                sku:                   form.block6_part_no,
                description:           form.block6_description || form.block6_part_no,
                qty_on_hand:           form.block9_quantity ?? 1,
                qty_reserved:          0,
                reorder_level:         1,
                shelf_location:        '',          // TBD — user assigns via bin editor
                storage_area:          'Receiving', // Default area until bin is set
                procurement_lead_time: 7,
                unit:                  'EA',
                suppliers:             [],
                quarantine_status:     'active',
                condition:             (form.block11_condition && form.block11_condition !== 'Unknown')
                                           ? form.block11_condition as InventoryItem['condition']
                                           : undefined,
                form_tracking_no:      form.block5_tracking_no || undefined,
                form_8130_id:          form.id,
                certification: {
                    type:     '8130-3',
                    verified: !!form.release_inspection,
                    number:   form.block5_tracking_no || form.block13b_cert_no || undefined,
                },
            };
            dispatch({ type: 'ADD_INVENTORY_ITEM', payload: newItem });
            // Update form with linked inventory item id
            const linkedForm = { ...form, inventory_item_id: newItem.id };
            dispatch({ type: 'UPDATE_FORM_8130', payload: linkedForm });
            saveWarehouseForms(updatedForms.map(f => f.id === form.id ? linkedForm : f));
            upsertPart(newItem);
        }
    };

    // Persist bin location update from BinAssignPanel
    const handleUpdatePartLocation = (partId: string, shelf_location: string, storage_area: string) => {
        const updated = state.partsInventory.map(p =>
            p.id === partId ? { ...p, shelf_location, storage_area } : p
        );
        dispatch({ type: 'SET_PARTS_INVENTORY', payload: updated });
        const part = updated.find(p => p.id === partId);
        if (part) upsertPart(part);
    };


    const handleAddTechnician = (techData: Omit<Technician, 'id' | 'role'>) =>
        apiAction.run(async () => {
            const newTech = await api.createTechnician({ ...techData, role: 'Technician' });
            dispatch({ type: 'SET_TECHNICIANS', payload: [...state.technicians, newTech] });
            showToast({ message: `Technician ${newTech.name} added.`, type: 'success' });
        }, 'Failed to add technician.');

    const handleUpdateTechnician = (updatedTech: Technician) =>
        apiAction.run(async () => {
            const result = await api.updateTechnician(updatedTech);
            dispatch({ type: 'SET_TECHNICIANS', payload: state.technicians.map(t => t.id === result.id ? result : t) });
            showToast({ message: `Technician ${result.name} updated.`, type: 'success' });
        }, 'Failed to update technician.');

    const handleUpdatePurchaseOrder = (po: PurchaseOrder) =>
        apiAction.run(async () => {
            const updatedPO = await api.updatePurchaseOrder(po);
            dispatch({ type: 'SET_PURCHASE_ORDERS', payload: state.purchaseOrders.map(p => p.po_id === updatedPO.po_id ? updatedPO : p) });
            showToast({ message: `Purchase Order ${updatedPO.po_id} updated.`, type: 'success' });
        }, 'Failed to update PO.');
    
    const handleConfirmReception = (
        po: PurchaseOrder,
        categorizedItems: (PurchaseOrderItem & { category?: 'part' | 'consumable' | 'tool' | 'unassigned' })[],
        squawkId?: string
    ) => {
        let updatedParts = [...state.partsInventory];
        let updatedConsumables = [...state.consumables];
        let updatedTools = [...state.tools];
        
        const updateOrCreateItem = (list: InventoryItem[], item: PurchaseOrderItem, category: 'part' | 'consumable') => {
            const existingItem = list.find(p => p.part_no === item.name);
            if (existingItem) {
                return list.map(p => p.id === existingItem.id ? { ...p, qty_on_hand: p.qty_on_hand + item.quantityToOrder } : p);
            } else {
                const newItem: InventoryItem = {
                    id: `${category}-${Date.now()}-${Math.random()}`,
                    part_no: item.name,
                    description: item.description,
                    qty_on_hand: item.quantityToOrder,
                    sku: item.name,
                    qty_reserved: 0,
                    reorder_level: 10,
                    shelf_location: 'Receiving',
                    storage_area: 'Staging',
                    procurement_lead_time: 14,
                    unit: 'EA',
                    suppliers: [{ supplierName: po.supplierName, cost: item.costPerUnit }]
                };
                return [...list, newItem];
            }
        };

        categorizedItems.forEach(item => {
            switch (item.category) {
                case 'part':
                    updatedParts = updateOrCreateItem(updatedParts, item, 'part');
                    break;
                case 'consumable':
                    updatedConsumables = updateOrCreateItem(updatedConsumables, item, 'consumable');
                    break;
                case 'tool':
                    const newTool: Tool = {
                        id: `tool-${Date.now()}-${Math.random()}`,
                        name: item.name,
                        description: item.description,
                        make: po.supplierName,
                        model: item.name,
                        serial: null,
                        calibrationRequired: false,
                        vendorPrices: {},
                    };
                    updatedTools.push(newTool);
                    break;
            }
        });
        
        if (squawkId) {
            const receivedParts = categorizedItems.filter(i => i.category === 'part');
             updatedParts = updatedParts.map(part => {
                const receivedItem = receivedParts.find(rp => rp.name === part.part_no);
                if (receivedItem) {
                    return { ...part, qty_reserved: part.qty_reserved + receivedItem.quantityToOrder };
                }
                return part;
            });
            if(receivedParts.length > 0) {
                 showToast({ message: `${receivedParts.length} part(s) reserved for squawk ${squawkId}`, type: 'info' });
            }
        }
        
        const updatedPO: PurchaseOrder = { ...po, status: 'Received' };
        
        dispatch({ type: 'SET_PARTS_INVENTORY', payload: updatedParts });
        dispatch({ type: 'SET_CONSUMABLES', payload: updatedConsumables });
        dispatch({ type: 'SET_TOOLS', payload: updatedTools });
        dispatch({ type: 'SET_PURCHASE_ORDERS', payload: state.purchaseOrders.map(p => p.po_id === po.po_id ? updatedPO : p) });

        showToast({ message: `PO ${po.po_id} received. Inventory updated.`, type: 'success' });
    };


    const handleReceiveFromPackingSlip = (header: ParsedPOHeader, items: ParsedPackingSlipItem[]) => {
        const targetPO = state.purchaseOrders.find(po => po.po_id === header.poNumber);
        if (!targetPO) {
            showToast({ message: `Purchase Order ${header.poNumber} not found. Cannot receive items.`, type: 'error' });
            return;
        }

        const updatedItems = targetPO.items.map(poItem => {
            const slipItem = items.find(s => s.partNumber === poItem.inventoryItemId || s.description === poItem.name);
            return {
                ...poItem,
                quantityToOrder: slipItem?.quantityShipped ?? poItem.quantityToOrder,
            };
        });

        handleConfirmReception(targetPO, updatedItems);
    };

    const handleSaveAssignments = (orderType: 'WO' | 'RO', orderId: string, technicianIds: string[]) => {
        const updateSquawks = (squawks: Squawk[]) => squawks.map(sq => ({...sq, assigned_technician_ids: technicianIds}));
        if(orderType === 'WO') {
            const order = state.workOrders.find(wo => wo.wo_id === orderId);
            if (order) handleUpdateOrder({ ...order, squawks: updateSquawks(order.squawks) });
        } else {
            const order = state.repairOrders.find(ro => ro.ro_id === orderId);
            if (order) handleUpdateOrder({ ...order, squawks: updateSquawks(order.squawks) });
        }
        showToast({message: `Technicians assigned to ${orderId}`, type: 'success'});
    }

    const handleGlobalSearch = (query: string) => {
        setInitialFilters(null);
        return searchAction.run(async () => {
            const intent = getSearchIntent(query);
            if (intent.view !== 'unknown') {
                setInitialFilters(intent.filters);
                setCurrentView(intent.view);
                const viewName = intent.view.charAt(0).toUpperCase() + intent.view.slice(1).replace('_', ' ');
                showToast({ message: `Navigating to ${viewName}…`, type: 'info' });
            } else {
                showToast({ message: "Couldn't understand that search. Try rephrasing.", type: 'error' });
            }
        }, 'Search failed. Please try again.');
    };

    const renderView = () => {
        switch (currentView) {
            case 'mission_control': return <MissionControlDashboard currentUser={currentUser!} {...state} onNavigate={handleNavigate} onNavigateToOrder={(view, id) => handleSelectOrder(view === 'work_orders' ? 'wo' : 'ro', id)} onNavigateWithFilters={(view, filters) => { setInitialFilters(filters); setCurrentView(view); }} />;
            case 'aircraft': return <AircraftDashboard aircraftList={state.aircraftList} schedules={state.schedules} forecasts={state.forecasts} onScheduleGenerated={handleScheduleGenerated} workOrders={state.workOrders} onCreateWorkOrder={handleCreateWorkOrderFromVisit} onUpdateAircraft={handleUpdateAircraft} onAnalyzeHistory={handleAnalyzeHistory} isAnalyzing={analyzeAction.loading} technicians={state.technicians} />;
            case 'work_orders': return <WorkOrderDashboard workOrders={state.workOrders} aircraftList={state.aircraftList} onSelectOrder={(id) => handleSelectOrder('wo', id)} onAddWorkOrder={handleAddWorkOrder} initialFilters={initialFilters} />;
            case 'repair_orders': return <RepairOrderDashboard repairOrders={state.repairOrders} aircraftList={state.aircraftList} onSelectOrder={(id) => handleSelectOrder('ro', id)} onAddRepairOrder={handleAddRepairOrder} initialFilters={initialFilters} />;
            case 'tooling': return <ToolingDashboard tools={state.tools} toolKits={state.toolKits} neededTools={state.neededTools} onAddTool={handleAddToolDirect} onUpdateTool={handleUpdateToolDirect} onDeleteTool={handleDeleteToolDirect} onSetTools={handleSetTools} onSetKits={handleSetKits} onSetNeededTools={handleSetNeededTools} />;
            case 'inventory': return <InventoryDashboard
                parts={state.partsInventory}
                consumables={state.consumables}
                forms8130={state.forms8130}
                checkoutRecords={state.checkoutRecords}
                currentUser={currentUser!}
                onCreatePurchaseOrder={(items) => { /* PO creation logic */ }}
                onUpdatePart={handleUpdatePart}
                onUpdateConsumable={handleUpdatePart}
                onReceive={handleReceivePart}
                onUpdateForm={handleUpdateForm}
            />;
            case 'consumables': return <ConsumablesDashboard consumables={state.consumables} onUpdateConsumable={handleUpdateConsumable} onCreatePurchaseOrder={(items) => { /* logic */ }} />;
            case 'personnel': return <PersonnelDashboard
                technicians={state.technicians}
                workOrders={state.workOrders}
                repairOrders={state.repairOrders}
                generalTimeLogs={state.generalTimeLogs}
                activeTimeLogs={state.activeTimeLogs}
                currentUser={currentUser!}
                onAddTechnician={handleAddTechnician}
                onUpdateTechnician={handleUpdateTechnician}
                onClockIn={(techId) => {
                    const existing = state.activeTimeLogs.find(l => l.technician_id === techId && !l.squawk_id && !l.end_time);
                    if (existing) return; // already clocked in to shop
                    dispatch({ type: 'ADD_ACTIVE_TIME_LOG', payload: {
                        log_id: `shop-${techId}-${Date.now()}`,
                        technician_id: techId,
                        start_time: new Date().toISOString(),
                        is_billable: false,
                    }});
                }}
                onClockOut={(techId) => {
                    // Clock out of shop AND any active task
                    state.activeTimeLogs
                        .filter(l => l.technician_id === techId && !l.end_time)
                        .forEach(l => dispatch({ type: 'CLOCK_OUT_TASK', payload: { logId: l.log_id, endTime: new Date().toISOString() } }));
                }}
                trainingRequirements={state.trainingRequirements}
                onAddRequirement={r  => dispatch({ type: 'ADD_TRAINING_REQUIREMENT',    payload: r })}
                onUpdateRequirement={r => dispatch({ type: 'UPDATE_TRAINING_REQUIREMENT', payload: r })}
                onDeleteRequirement={id => dispatch({ type: 'DELETE_TRAINING_REQUIREMENT', payload: id })}
            />;
            case 'purchase_orders': return <PurchaseOrderDashboard purchaseOrders={state.purchaseOrders} inventory={[...state.partsInventory, ...state.consumables]} onUpdatePurchaseOrder={handleUpdatePurchaseOrder} onReceiveFromPackingSlip={handleReceiveFromPackingSlip} onConfirmReception={handleConfirmReception} workOrders={state.workOrders} repairOrders={state.repairOrders} />;
            case 'data_migration': return <DataMigrationDashboard aircraftList={state.aircraftList} onImportData={() => {}} />;
            case 'calendar': return <CalendarView workOrders={state.workOrders} repairOrders={state.repairOrders} technicians={state.technicians} aircraftList={state.aircraftList} onSaveAssignments={handleSaveAssignments} onUpdateOrder={handleUpdateOrder} onNavigateToOrder={(view, id, initialView) => handleSelectOrder(view === 'work_orders' ? 'wo' : 'ro', id, initialView)} />;
            case 'analytics': return <AnalyticsDashboard technicians={state.technicians} generalTimeLogs={state.generalTimeLogs} workOrders={state.workOrders} repairOrders={state.repairOrders} aircraftList={state.aircraftList} partsInventory={state.partsInventory} tools={state.tools} />;
            case 'profitability': return <ProfitabilityDashboard workOrders={state.workOrders} repairOrders={state.repairOrders} inventory={[...state.partsInventory, ...state.consumables]} aircraftList={state.aircraftList} onNavigateToOrder={(view, id) => handleSelectOrder(view === 'work_orders' ? 'wo' : 'ro', id)} />;
            case 'work_order_detail': {
                const wo = state.workOrders.find(o => o.wo_id === selectedOrder?.id);
                const woAircraft = state.aircraftList.find(a => a.id === wo?.aircraft_id);
                return (
                    <ErrorBoundary label={`Work Order ${selectedOrder?.id}`}>
                        {wo && woAircraft ? <WorkOrderDetail order={wo} aircraft={woAircraft} technicians={state.technicians} inventory={[...state.partsInventory, ...state.consumables]} tools={state.tools} onBack={handleBackToDashboard} onUpdateOrder={handleUpdateOrder} permissions={permissions} initialViewMode={selectedOrder?.initialView} activeTimeLogs={state.activeTimeLogs} onClockInToTask={handleClockInToTask} onClockOutOfTask={handleClockOutOfTask} /> : <div className="p-8 text-center text-slate-400">Work Order not found</div>}
                    </ErrorBoundary>
                );
            }
            case 'repair_order_detail': {
                const ro = state.repairOrders.find(o => o.ro_id === selectedOrder?.id);
                const roAircraft = state.aircraftList.find(a => a.id === ro?.aircraft_id);
                return (
                    <ErrorBoundary label={`Repair Order ${selectedOrder?.id}`}>
                        {ro && roAircraft ? <RepairOrderDetail order={ro} aircraft={roAircraft} technicians={state.technicians} inventory={[...state.partsInventory, ...state.consumables]} tools={state.tools} onBack={handleBackToDashboard} onUpdateOrder={handleUpdateOrder} permissions={permissions} activeTimeLogs={state.activeTimeLogs} onClockInToTask={handleClockInToTask} onClockOutOfTask={handleClockOutOfTask} /> : <div className="p-8 text-center text-slate-400">Repair Order not found</div>}
                    </ErrorBoundary>
                );
            }
            default: return <div className="p-8 text-center text-slate-400">Select a view from the sidebar.</div>;
        }
    };
    
    if (!currentUser) {
        return <LoginScreen technicians={state.technicians} onLogin={handleLogin} />;
    }

    const visibleGroups = NAV_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(item => !item.adminOnly || permissions.canViewAdminDashboards),
    })).filter(g => g.items.length > 0);

    return (
        <div className={`flex h-screen bg-[#080c14] text-slate-200 font-sans overflow-hidden ${settings.appearance.density === 'Compact' ? 'text-sm' : ''}`}>
            <AppSidebar
                currentUser={currentUser}
                currentView={currentView}
                visibleGroups={visibleGroups}
                onNavigate={view => handleNavigate({ view })}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onSignOut={() => setCurrentUser(null)}
            />

            {/* ── Main Content ── */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#080c14]">
                <AppHeader
                    onSearch={handleGlobalSearch}
                    isSearching={searchAction.loading}
                    notifications={state.notifications}
                    onMarkAsRead={() => dispatch({ type: 'MARK_NOTIFICATIONS_AS_READ' })}
                    onNavigate={handleNavigate}
                />

                <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
                    {state.isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
                            <p className="text-sm text-slate-500 font-mono">Loading…</p>
                        </div>
                    ) : (
                        <div className="animate-fade-in-up">
                            {renderView()}
                        </div>
                    )}
                </div>
            </main>
            
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                currentUser={currentUser} 
            />
        </div>
    );
};

export default App;
