
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

const navItems: { view: View; label: string; icon: React.FC<any>; adminOnly?: boolean }[] = [
    { view: 'mission_control', label: 'Mission Control', icon: HomeIcon },
    { view: 'aircraft', label: 'Fleet Status', icon: PlaneIcon },
    { view: 'work_orders', label: 'Work Orders', icon: ClipboardListIcon },
    { view: 'repair_orders', label: 'Repair Orders', icon: WrenchScrewdriverIcon },
    { view: 'calendar', label: 'Schedule', icon: CalendarIcon },
    { view: 'tooling', label: 'Precision Tooling', icon: WrenchIcon },
    { view: 'inventory', label: 'Parts Inventory', icon: CogIcon },
    { view: 'consumables', label: 'Consumables', icon: BeakerIcon },
    { view: 'personnel', label: 'Personnel', icon: UsersIcon, adminOnly: true },
    { view: 'analytics', label: 'Analytics', icon: ChartPieIcon, adminOnly: true },
    { view: 'profitability', label: 'Profitability', icon: CurrencyDollarIcon, adminOnly: true },
    { view: 'purchase_orders', label: 'Procurement', icon: ShoppingCartIcon },
    { view: 'data_migration', label: 'Data Migration', icon: CircleStackIcon, adminOnly: true },
];

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
            showToast({ message: `Welcome, ${user.name}!`, type: 'success' });
        }
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
            showToast({ message: `Order updated successfully.`, type: 'success' });
        } catch (error) {
            console.error("Failed to update order:", error);
            showToast({ message: 'Failed to update order.', type: 'error' });
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
            case 'personnel': return <PersonnelDashboard technicians={state.technicians} workOrders={state.workOrders} repairOrders={state.repairOrders} generalTimeLogs={state.generalTimeLogs} activeTimeLogs={state.activeTimeLogs} currentUser={currentUser!} onAddTechnician={handleAddTechnician} onUpdateTechnician={handleUpdateTechnician} onClockIn={(techId) => { const newLog: TimeLog = {log_id: `tl-${Date.now()}`, technician_id: techId, start_time: new Date().toISOString(), is_billable: false }; dispatch({type: 'SET_ACTIVE_TIME_LOGS', payload: [...state.activeTimeLogs, newLog]}); }} onClockOut={(techId) => { const logToEnd = state.activeTimeLogs.find(l => l.technician_id === techId); if(logToEnd){ const endedLog = {...logToEnd, end_time: new Date().toISOString() }; dispatch({type: 'SET_GENERAL_TIME_LOGS', payload: [...state.generalTimeLogs, endedLog]}); dispatch({type: 'SET_ACTIVE_TIME_LOGS', payload: state.activeTimeLogs.filter(l => l.technician_id !== techId)}); } }}/>;
            case 'purchase_orders': return <PurchaseOrderDashboard purchaseOrders={state.purchaseOrders} inventory={[...state.partsInventory, ...state.consumables]} onUpdatePurchaseOrder={handleUpdatePurchaseOrder} onReceiveFromPackingSlip={handleReceiveFromPackingSlip} onConfirmReception={handleConfirmReception} workOrders={state.workOrders} repairOrders={state.repairOrders} />;
            case 'data_migration': return <DataMigrationDashboard aircraftList={state.aircraftList} onImportData={() => {}} />;
            case 'calendar': return <CalendarView workOrders={state.workOrders} repairOrders={state.repairOrders} technicians={state.technicians} onSaveAssignments={handleSaveAssignments} onUpdateOrder={handleUpdateOrder} onNavigateToOrder={(view, id, initialView) => handleSelectOrder(view === 'work_orders' ? 'wo' : 'ro', id, initialView)} />;
            case 'analytics': return <AnalyticsDashboard technicians={state.technicians} generalTimeLogs={state.generalTimeLogs} workOrders={state.workOrders} repairOrders={state.repairOrders} aircraftList={state.aircraftList} partsInventory={state.partsInventory} />;
            case 'profitability': return <ProfitabilityDashboard workOrders={state.workOrders} repairOrders={state.repairOrders} inventory={[...state.partsInventory, ...state.consumables]} aircraftList={state.aircraftList} onNavigateToOrder={(view, id) => handleSelectOrder(view === 'work_orders' ? 'wo' : 'ro', id)} />;
            case 'work_order_detail':
                const wo = state.workOrders.find(o => o.wo_id === selectedOrder?.id);
                const woAircraft = state.aircraftList.find(a => a.id === wo?.aircraft_id);
                return wo && woAircraft ? <WorkOrderDetail order={wo} aircraft={woAircraft} technicians={state.technicians} inventory={[...state.partsInventory, ...state.consumables]} tools={state.tools} onBack={handleBackToDashboard} onUpdateOrder={handleUpdateOrder} permissions={permissions} initialViewMode={selectedOrder?.initialView} /> : <div>Work Order not found</div>;
            case 'repair_order_detail':
                const ro = state.repairOrders.find(o => o.ro_id === selectedOrder?.id);
                const roAircraft = state.aircraftList.find(a => a.id === ro?.aircraft_id);
                return ro && roAircraft ? <RepairOrderDetail order={ro} aircraft={roAircraft} technicians={state.technicians} inventory={[...state.partsInventory, ...state.consumables]} tools={state.tools} onBack={handleBackToDashboard} onUpdateOrder={handleUpdateOrder} permissions={permissions} /> : <div>Repair Order not found</div>;
            default: return <div className="p-8 text-center text-slate-400">Select a view from the sidebar.</div>;
        }
    };
    
    if (!currentUser) {
        return <LoginScreen technicians={state.technicians} onLogin={handleLogin} />;
    }

    const visibleNavItems = navItems.filter(item => !item.adminOnly || permissions.canViewAdminDashboards);

    const getAccentColorClass = (color: string) => {
        switch(color) {
            case 'indigo': return 'text-indigo-400 border-indigo-400';
            case 'emerald': return 'text-emerald-400 border-emerald-400';
            case 'amber': return 'text-amber-400 border-amber-400';
            case 'rose': return 'text-rose-400 border-rose-400';
            default: return 'text-sky-400 border-sky-400';
        }
    };

    const getAccentBgClass = (color: string) => {
        switch(color) {
            case 'indigo': return 'from-indigo-500/20';
            case 'emerald': return 'from-emerald-500/20';
            case 'amber': return 'from-amber-500/20';
            case 'rose': return 'from-rose-500/20';
            default: return 'from-sky-500/20';
        }
    };

    return (
        <div className={`flex h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300 ${settings.appearance.density === 'Compact' ? 'text-sm' : ''}`}>
            {/* Sidebar */}
            <aside className="w-72 glass-panel flex-shrink-0 flex flex-col z-20 m-4 rounded-2xl shadow-2xl">
                <div className="h-24 flex items-center px-8 border-b border-slate-200 dark:border-white/5">
                     <WrenchIcon className={`w-8 h-8 ${getAccentColorClass(settings.appearance.accentColor).split(' ')[0]}`} />
                     <div className="ml-3">
                        <span className="block text-xl font-light tracking-widest text-slate-900 dark:text-white uppercase truncate w-40" title={settings.organization.name}>
                            {settings.organization.name.split(' ')[0]}
                        </span>
                        <span className={`block text-xs font-medium tracking-[0.2em] uppercase ${getAccentColorClass(settings.appearance.accentColor).split(' ')[0]}`}>
                            {settings.organization.name.split(' ').slice(1).join(' ') || 'Aero'}
                        </span>
                     </div>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {visibleNavItems.map(item => {
                        const isActive = currentView === item.view;
                        const activeColorClass = getAccentColorClass(settings.appearance.accentColor);
                        const activeBgClass = getAccentBgClass(settings.appearance.accentColor);

                        return (
                            <a 
                                key={item.view} 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); handleNavigate({ view: item.view }); }} 
                                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ease-out ${
                                    isActive
                                    ? `bg-gradient-to-r ${activeBgClass} to-transparent text-slate-800 dark:text-white border-l-2 ${activeColorClass.split(' ')[1]} shadow-sm` 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border-l-2 border-transparent'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 mr-3 transition-colors duration-300 ${isActive ? activeColorClass.split(' ')[0] : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                                {item.label}
                            </a>
                        );
                    })}
                </nav>
                 <div className="p-6 border-t border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <UserCircleIcon className="w-10 h-10 text-slate-400"/>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0B0F17]"></div>
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white text-sm">{currentUser.name}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">{currentUser.role}</p>
                        </div>
                    </div>
                     <button onClick={() => setCurrentUser(null)} className="w-full mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors py-2 border border-slate-300 dark:border-white/5 rounded hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-400 dark:hover:border-white/20">Sign Out</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                    <div className={`absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-10 ${settings.appearance.accentColor === 'rose' ? 'bg-rose-500' : settings.appearance.accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500'}`}></div>
                    <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]"></div>
                </div>

                <header className="h-24 flex-shrink-0 flex items-center justify-between px-8 z-10">
                    <div className="w-full max-w-xl">
                        <GlobalSearchBar onSearch={handleGlobalSearch} isSearching={isSearching} />
                    </div>
                    <div className="flex items-center gap-6">
                        <NotificationCenter notifications={state.notifications} onMarkAsRead={() => dispatch({type: 'MARK_NOTIFICATIONS_AS_READ'})} onNavigate={handleNavigate} />
                        <button 
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
                            aria-label="Settings"
                        >
                            <CogIcon className="h-6 w-6" />
                        </button>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto px-8 pb-8 z-10 scroll-smooth">
                    {state.isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="relative w-24 h-24">
                                <div className={`absolute inset-0 border-t-2 border-${settings.appearance.accentColor}-500 rounded-full animate-spin`}></div>
                                <div className="absolute inset-2 border-r-2 border-indigo-500 rounded-full animate-spin reverse"></div>
                                <div className="absolute inset-4 border-b-2 border-slate-500 rounded-full animate-pulse"></div>
                            </div>
                            <p className={`mt-6 text-sm font-mono tracking-widest uppercase text-${settings.appearance.accentColor}-600 dark:text-${settings.appearance.accentColor}-400`}>Initializing Systems...</p>
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
