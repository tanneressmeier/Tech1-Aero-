
import React, { useReducer, useEffect, useState, useCallback, useMemo } from 'react';

// State management
import { appReducer, initialState } from './state/reducer.ts';
import { AppState, AppAction } from './state/types.ts';

// API and services
import { api } from './services/api.ts';
import { getSearchIntent, SearchIntent, generateOptimalSchedule, analyzeMaintenanceHistory } from './services/geminiService.ts';
import { useWebSocket } from './hooks/useWebSocket.ts';
import { useToast } from './contexts/ToastContext.tsx';
import { usePermissions } from './hooks/usePermissions.ts';
import { useSettings } from './contexts/SettingsContext.tsx';

// Types
import { View, Technician, WorkOrder, RepairOrder, Aircraft, OptimizedVisit, PurchaseOrder, PurchaseOrderItem, Squawk, StagedWorkOrder, StagedTool, StagedConsumable, ParsedPOHeader, ParsedPackingSlipItem, InventoryItem, Tool, TimeLog, Kit } from './types.ts';

// Components
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
import { GlobalSearchBar } from './components/GlobalSearchBar.tsx';
import { NotificationCenter } from './components/NotificationCenter.tsx';
import { AnalyticsDashboard } from './components/AnalyticsDashboard.tsx';
import { ProfitabilityDashboard } from './components/ProfitabilityDashboard.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';

// Icons
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
  CircleStackIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  UserCircleIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
} from './components/icons.tsx';

type DetailedView = 'work_order_detail' | 'repair_order_detail';
type CurrentView = View | DetailedView;

// Nav grouped by function — reduces 13 flat items to 3 logical groups
type NavItem = { view: View; label: string; icon: React.FC<any>; adminOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

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
    const [isSearching, setIsSearching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    const { showToast } = useToast();
    const { settings } = useSettings();
    const permissions = usePermissions(currentUser);

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
                dispatch({ type: 'SET_ALL_DATA', payload: data });
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

    const handleUpdateOrder = async (order: WorkOrder | RepairOrder) => {
        try {
            if ('wo_id' in order) {
                const updatedOrder = await api.updateWorkOrder(order);
                dispatch({ type: 'SET_WORK_ORDERS', payload: state.workOrders.map(wo => wo.wo_id === updatedOrder.wo_id ? updatedOrder : wo) });
            } else {
                const updatedOrder = await api.updateRepairOrder(order);
                dispatch({ type: 'SET_REPAIR_ORDERS', payload: state.repairOrders.map(ro => ro.ro_id === updatedOrder.ro_id ? updatedOrder : ro) });
            }
            // No success toast here — this fires on every field edit (resolution notes,
            // stage changes, slider) and would spam. Callers show their own toasts
            // for explicit user actions (signatures, assignments, etc.)
        } catch (error) {
            console.error('Failed to update order:', error);
            showToast({ message: 'Failed to save order changes.', type: 'error' });
        }
    };

    const handleUpdateAircraft = async (updatedAircraft: Aircraft) => {
        try {
            const returnedAircraft = await api.updateAircraft(updatedAircraft);
            dispatch({ type: 'SET_AIRCRAFT_LIST', payload: state.aircraftList.map(ac => ac.id === returnedAircraft.id ? returnedAircraft : ac) });
            showToast({ message: `Aircraft ${returnedAircraft.tail_number} updated.`, type: 'success' });
        } catch (error) {
            console.error("Failed to update aircraft:", error);
            showToast({ message: 'Failed to update aircraft.', type: 'error' });
        }
    };

    const handleScheduleGenerated = (aircraftId: string, schedule: any) => {
        dispatch({ type: 'SET_SCHEDULES', payload: { ...state.schedules, [aircraftId]: schedule } });
        if (schedule) {
            showToast({ message: `Optimized schedule generated for aircraft ${aircraftId}.`, type: 'success' });
        }
    };

    const handleAnalyzeHistory = async (aircraft: Aircraft) => {
        setIsAnalyzing(true);
        try {
            const forecast = await analyzeMaintenanceHistory(aircraft);
            dispatch({ type: 'SET_FORECAST', payload: { aircraftId: aircraft.id, forecast } });
            showToast({ message: `Maintenance analysis complete for ${aircraft.tail_number}`, type: 'info' });
        } catch (e: any) {
            showToast({ message: e.message || "Failed to analyze history", type: 'error' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCreateWorkOrderFromVisit = async (aircraft: Aircraft, visit: OptimizedVisit) => {
        const newWOData: Omit<WorkOrder, 'wo_id'> = {
            aircraft_id: aircraft.id,
            aircraft_tail_number: aircraft.tail_number,
            visit_name: visit.visitName,
            scheduled_date: visit.scheduledDate,
            status: "Pending",
            priority: "routine",
            squawks: [], // Should ideally be populated from visit events
        };
        try {
            const createdWO = await api.createWorkOrder(newWOData);
            dispatch({ type: 'SET_WORK_ORDERS', payload: [...state.workOrders, createdWO] });
            showToast({ message: `Work Order created for ${visit.visitName}`, type: 'success' });
        } catch (error) {
            console.error("Failed to create work order:", error);
            showToast({ message: 'Failed to create work order.', type: 'error' });
        }
    };

    const handleAddWorkOrder = async (newWOData: Omit<WorkOrder, 'wo_id'>) => {
        try {
            const createdWO = await api.createWorkOrder(newWOData);
            dispatch({ type: 'SET_WORK_ORDERS', payload: [...state.workOrders, createdWO] });
            showToast({ message: 'Work Order created successfully.', type: 'success' });
        } catch (error) {
            console.error("Failed to add work order:", error);
            showToast({ message: 'Failed to add work order.', type: 'error' });
        }
    };

    const handleAddRepairOrder = async (newROData: Omit<RepairOrder, 'ro_id' | 'created_date'>) => {
        try {
            const createdRO = await api.createRepairOrder({...newROData, created_date: new Date().toISOString().split('T')[0]});
            dispatch({ type: 'SET_REPAIR_ORDERS', payload: [...state.repairOrders, createdRO] });
            showToast({ message: 'Repair Order created successfully.', type: 'success' });
        } catch (error) {
            console.error("Failed to add repair order:", error);
            showToast({ message: 'Failed to add repair order.', type: 'error' });
        }
    };

    const handleAddTool = async (toolData: Omit<Tool, 'id'>) => {
        try {
            const newTool = await api.createTool(toolData);
            dispatch({ type: 'SET_TOOLS', payload: [...state.tools, newTool] });
            showToast({ message: `Tool ${newTool.name} added.`, type: 'success' });
        } catch (error) {
            console.error("Failed to add tool:", error);
            showToast({ message: 'Failed to add tool.', type: 'error' });
        }
    };

    const handleUpdateTool = async (toolData: Tool) => {
        try {
            const updatedTool = await api.updateTool(toolData);
            dispatch({ type: 'SET_TOOLS', payload: state.tools.map(t => t.id === updatedTool.id ? updatedTool : t) });
            showToast({ message: `Tool ${updatedTool.name} updated.`, type: 'success' });
        } catch (error) {
            console.error("Failed to update tool:", error);
            showToast({ message: 'Failed to update tool.', type: 'error' });
        }
    };

    const handleDeleteTool = async (toolId: string) => {
        try {
            await api.deleteTool(toolId);
            dispatch({ type: 'SET_TOOLS', payload: state.tools.filter(t => t.id !== toolId) });
            showToast({ message: `Tool deleted.`, type: 'success' });
        } catch (error) {
            console.error("Failed to delete tool:", error);
            showToast({ message: 'Failed to delete tool.', type: 'error' });
        }
    };

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

    const handleUpdateConsumable = async (consumable: InventoryItem) => {
        try {
            const updatedItem = await api.updateConsumable(consumable);
            dispatch({ type: 'SET_CONSUMABLES', payload: state.consumables.map(c => c.id === updatedItem.id ? updatedItem : c) });
            showToast({ message: `Consumable updated.`, type: 'success' });
        } catch (error) {
            console.error("Failed to update consumable:", error);
            showToast({ message: 'Failed to update consumable.', type: 'error' });
        }
    };

    const handleUpdatePart = async (part: InventoryItem) => {
        try {
            const updatedItem = await api.updatePart(part);
            dispatch({ type: 'SET_PARTS_INVENTORY', payload: state.partsInventory.map(p => p.id === updatedItem.id ? updatedItem : p) });
            showToast({ message: `Part updated.`, type: 'success' });
        } catch (error) {
            console.error("Failed to update part:", error);
            showToast({ message: 'Failed to update part.', type: 'error' });
        }
    };

    const handleAddTechnician = async (techData: Omit<Technician, 'id' | 'role'>) => {
        try {
            const newTech = await api.createTechnician({ ...techData, role: 'Technician' });
            dispatch({ type: 'SET_TECHNICIANS', payload: [...state.technicians, newTech] });
            showToast({ message: `Technician ${newTech.name} added.`, type: 'success' });
        } catch (error) {
            console.error("Failed to add technician:", error);
            showToast({ message: 'Failed to add technician.', type: 'error' });
        }
    };

    const handleUpdateTechnician = async (updatedTech: Technician) => {
        try {
            const result = await api.updateTechnician(updatedTech);
            dispatch({ type: 'SET_TECHNICIANS', payload: state.technicians.map(t => t.id === result.id ? result : t) });
            showToast({ message: `Technician ${result.name} updated.`, type: 'success' });
        } catch (error) {
            console.error("Failed to update technician:", error);
            showToast({ message: 'Failed to update technician.', type: 'error' });
        }
    };

    const handleUpdatePurchaseOrder = async (po: PurchaseOrder) => {
        try {
            const updatedPO = await api.updatePurchaseOrder(po);
            dispatch({ type: 'SET_PURCHASE_ORDERS', payload: state.purchaseOrders.map(p => p.po_id === updatedPO.po_id ? updatedPO : p) });
            showToast({ message: `Purchase Order ${updatedPO.po_id} updated.`, type: 'success' });
        } catch (error) {
            console.error("Failed to update PO:", error);
            showToast({ message: 'Failed to update PO.', type: 'error' });
        }
    };
    
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

    const handleGlobalSearch = async (query: string) => {
        setIsSearching(true);
        setInitialFilters(null);
        try {
            const intent = getSearchIntent(query);
            if (intent.view !== 'unknown') {
                setInitialFilters(intent.filters);
                setCurrentView(intent.view);
                const viewName = intent.view.charAt(0).toUpperCase() + intent.view.slice(1).replace('_', ' ');
                showToast({ message: `Navigating to ${viewName}…`, type: 'info' });
            } else {
                showToast({ message: "Couldn't understand that search. Try rephrasing.", type: 'error' });
            }
        } catch (error) {
            console.error('Search failed:', error);
            showToast({ message: 'Search failed. Please try again.', type: 'error' });
        } finally {
            setIsSearching(false);
        }
    };

    const renderView = () => {
        switch (currentView) {
            case 'mission_control': return <MissionControlDashboard currentUser={currentUser!} {...state} onNavigate={handleNavigate} onNavigateToOrder={(view, id) => handleSelectOrder(view === 'work_orders' ? 'wo' : 'ro', id)} onNavigateWithFilters={(view, filters) => { setInitialFilters(filters); setCurrentView(view); }} />;
            case 'aircraft': return <AircraftDashboard aircraftList={state.aircraftList} schedules={state.schedules} forecasts={state.forecasts} onScheduleGenerated={handleScheduleGenerated} workOrders={state.workOrders} onCreateWorkOrder={handleCreateWorkOrderFromVisit} onUpdateAircraft={handleUpdateAircraft} onAnalyzeHistory={handleAnalyzeHistory} isAnalyzing={isAnalyzing} technicians={state.technicians} />;
            case 'work_orders': return <WorkOrderDashboard workOrders={state.workOrders} aircraftList={state.aircraftList} onSelectOrder={(id) => handleSelectOrder('wo', id)} onAddWorkOrder={handleAddWorkOrder} initialFilters={initialFilters} />;
            case 'repair_orders': return <RepairOrderDashboard repairOrders={state.repairOrders} aircraftList={state.aircraftList} onSelectOrder={(id) => handleSelectOrder('ro', id)} onAddRepairOrder={handleAddRepairOrder} initialFilters={initialFilters} />;
            case 'tooling': return <ToolingDashboard tools={state.tools} toolKits={state.toolKits} neededTools={state.neededTools} onAddTool={handleAddToolDirect} onUpdateTool={handleUpdateToolDirect} onDeleteTool={handleDeleteToolDirect} onSetTools={handleSetTools} onSetKits={handleSetKits} onSetNeededTools={handleSetNeededTools} />;
            case 'inventory': return <InventoryDashboard parts={[...state.partsInventory]} onCreatePurchaseOrder={(items) => { /* logic */ }} onUpdatePart={handleUpdatePart} />;
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
            />;
            case 'purchase_orders': return <PurchaseOrderDashboard purchaseOrders={state.purchaseOrders} inventory={[...state.partsInventory, ...state.consumables]} onUpdatePurchaseOrder={handleUpdatePurchaseOrder} onReceiveFromPackingSlip={handleReceiveFromPackingSlip} onConfirmReception={handleConfirmReception} workOrders={state.workOrders} repairOrders={state.repairOrders} />;
            case 'data_migration': return <DataMigrationDashboard aircraftList={state.aircraftList} onImportData={() => {}} />;
            case 'calendar': return <CalendarView workOrders={state.workOrders} repairOrders={state.repairOrders} technicians={state.technicians} aircraftList={state.aircraftList} onSaveAssignments={handleSaveAssignments} onUpdateOrder={handleUpdateOrder} onNavigateToOrder={(view, id, initialView) => handleSelectOrder(view === 'work_orders' ? 'wo' : 'ro', id, initialView)} />;
            case 'analytics': return <AnalyticsDashboard technicians={state.technicians} generalTimeLogs={state.generalTimeLogs} workOrders={state.workOrders} repairOrders={state.repairOrders} aircraftList={state.aircraftList} partsInventory={state.partsInventory} />;
            case 'profitability': return <ProfitabilityDashboard workOrders={state.workOrders} repairOrders={state.repairOrders} inventory={[...state.partsInventory, ...state.consumables]} aircraftList={state.aircraftList} onNavigateToOrder={(view, id) => handleSelectOrder(view === 'work_orders' ? 'wo' : 'ro', id)} />;
            case 'work_order_detail': {
                const wo = state.workOrders.find(o => o.wo_id === selectedOrder?.id);
                const woAircraft = state.aircraftList.find(a => a.id === wo?.aircraft_id);
                return wo && woAircraft ? <WorkOrderDetail order={wo} aircraft={woAircraft} technicians={state.technicians} inventory={[...state.partsInventory, ...state.consumables]} tools={state.tools} onBack={handleBackToDashboard} onUpdateOrder={handleUpdateOrder} permissions={permissions} initialViewMode={selectedOrder?.initialView} activeTimeLogs={state.activeTimeLogs} onClockInToTask={handleClockInToTask} onClockOutOfTask={handleClockOutOfTask} /> : <div>Work Order not found</div>;
            }
            case 'repair_order_detail': {
                const ro = state.repairOrders.find(o => o.ro_id === selectedOrder?.id);
                const roAircraft = state.aircraftList.find(a => a.id === ro?.aircraft_id);
                return ro && roAircraft ? <RepairOrderDetail order={ro} aircraft={roAircraft} technicians={state.technicians} inventory={[...state.partsInventory, ...state.consumables]} tools={state.tools} onBack={handleBackToDashboard} onUpdateOrder={handleUpdateOrder} permissions={permissions} activeTimeLogs={state.activeTimeLogs} onClockInToTask={handleClockInToTask} onClockOutOfTask={handleClockOutOfTask} /> : <div>Repair Order not found</div>;
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
            {/* ── Sidebar ── */}
            <aside className="w-56 flex-shrink-0 flex flex-col bg-[#0d1220] border-r border-white/5 z-20">

                {/* Logo */}
                <div className="h-16 flex items-center px-5 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center flex-shrink-0">
                            <WrenchIcon className="w-3.5 h-3.5 text-sky-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-white leading-tight truncate">
                                {settings.organization.name.split(' ')[0]}
                            </p>
                            <p className="text-[10px] text-sky-400 font-mono tracking-widest uppercase leading-tight">
                                {settings.organization.name.split(' ').slice(1).join(' ') || 'MRO'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Nav groups */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
                    {visibleGroups.map(group => (
                        <div key={group.label}>
                            <p className="px-3 mb-1 text-[9px] font-mono font-semibold text-slate-600 uppercase tracking-[0.18em]">
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map(item => {
                                    const isActive = currentView === item.view;
                                    return (
                                        <button
                                            key={item.view}
                                            onClick={() => handleNavigate({ view: item.view })}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-left ${
                                                isActive
                                                    ? 'bg-sky-500/12 text-white font-medium border border-sky-500/20'
                                                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                                            }`}
                                        >
                                            <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User footer */}
                <div className="flex-shrink-0 border-t border-white/5 p-3 space-y-2">
                    <div className="flex items-center gap-2.5 px-2 py-1.5">
                        <div className="relative flex-shrink-0">
                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300">
                                {currentUser.name.charAt(0)}
                            </div>
                            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-[#0d1220]" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{currentUser.role}</p>
                        </div>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex-shrink-0 p-1 text-slate-500 hover:text-white rounded transition-colors"
                            title="Settings"
                        >
                            <CogIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => setCurrentUser(null)}
                        className="w-full text-[11px] text-slate-600 hover:text-slate-300 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#080c14]">

                {/* Top header bar */}
                <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-[#0d1220]/80 backdrop-blur-sm z-10">
                    <div className="w-full max-w-sm">
                        <GlobalSearchBar onSearch={handleGlobalSearch} isSearching={isSearching} />
                    </div>
                    <div className="flex items-center gap-2">
                        <NotificationCenter notifications={state.notifications} onMarkAsRead={() => dispatch({type: 'MARK_NOTIFICATIONS_AS_READ'})} onNavigate={handleNavigate} />
                    </div>
                </header>

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
