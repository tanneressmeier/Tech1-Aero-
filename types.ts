
// FIX: Replaced placeholder content with actual type definitions.
export type View =
  | 'mission_control'
  | 'aircraft'
  | 'work_orders'
  | 'repair_orders'
  | 'tooling'
  | 'inventory'
  | 'consumables'
  | 'personnel'
  | 'purchase_orders'
  | 'data_migration'
  | 'analytics'
  | 'calendar';

export interface Notification {
    id: number;
    message: string;
    read: boolean;
    timestamp: string;
    link?: {
        view: View;
        orderId?: string;
    };
}

export interface AppSettings {
    profile: {
        name: string;
        email: string;
    };
    organization: {
        name: string;
        repairStationNum: string;
        address: string;
    };
    financials: {
        laborRate: number;
        shopSupplies: number; // percentage
        taxRate: number; // percentage
    };
    notifications: {
        emailWorkOrder: boolean;
        emailInventory: boolean;
        pushCalibration: boolean;
    };
    appearance: {
        themeMode: 'dark' | 'light' | 'system';
        accentColor: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose';
        density: 'Compact' | 'Comfortable';
        reducedMotion: boolean;
    };
}

export interface Technician {
    id: string;
    name: string;
    certifications: string[];
    role: 'Admin' | 'Lead Technician' | 'Technician';
    efficiency?: number; // 0.0 to 1.0, defaults to 0.85
}

export interface LogbookEntry {
    entry_id: string;
    aircraft_id: string;
    entry_date: string; // ISO date string
    description: string;
    flight_hours?: number;
    recorded_by: string; // technician id
}

export interface MaintenanceEvent {
    id: string;
    name: string;
    intervalType: 'hours' | 'days';
    intervalValue: number;
    lastPerformedHours?: number;
    lastPerformedDate?: string; // YYYY-MM-DD
    manHours: number;
}

export interface ADCompliance {
    ad_number: string;
    effective_date: string; // YYYY-MM-DD
    subject: string;
    compliance_status: 'Complied' | 'Open';
    due_date?: string; // YYYY-MM-DD, required if status is Open
    url?: string; // URL to the AD on FAA DRS
}

export interface Aircraft {
    id: string;
    tail_number: string;
    model: string;
    make: string;
    serial_number: string;
    hours_total: number;
    imageUrl?: string; // Added image URL support
    maintenance_events: MaintenanceEvent[];
    logbook_entries: LogbookEntry[];
    ad_compliance: ADCompliance[];
}

export interface Supplier {
    supplierName: string;
    cost: number;
}

export interface PartCertification {
    type: '8130-3' | 'CoC' | 'EASA Form 1' | 'Other' | 'None';
    verified: boolean;
    number?: string; // Control or Tracking number
    mediaUrl?: string;
    mediaName?: string;
}

export interface InventoryItem {
    id: string;
    part_no: string;
    sku: string;
    description: string;
    qty_on_hand: number;
    qty_reserved: number;
    reorder_level: number;
    shelf_location: string;
    storage_area: string;
    procurement_lead_time: number;
    unit: string;
    suppliers: Supplier[];
    expiration_date?: string;
    certification?: PartCertification;
}

export interface Tool {
    id: string;
    name: string;
    description: string;
    details?: string;
    make: string | null;
    model: string | null;
    serial: string | null;
    calibrationRequired: boolean;
    calibrationDueDate?: string; // YYYY-MM-DD
    vendorPrices: {
        bhd?: number;
        continental?: number;
    };
}

export interface TimeLog {
    log_id: string;
    technician_id: string;
    start_time: string; // ISO date string
    end_time?: string; // ISO date string
    is_billable: boolean;
    notes?: string;
}

export interface Signature {
    technician_id: string;
    signed_at: string; // ISO date string
}

export interface UsedPart {
    inventory_item_id: string;
    quantity_used: number;
}

export interface Squawk {
    squawk_id: string;
    description: string;
    status: 'open' | 'in_progress' | 'completed' | 'on_hold';
    priority: 'routine' | 'urgent' | 'aog';
    time_logs: TimeLog[];
    category: string;
    rii_inspection_enabled: boolean;
    notes: string;
    always_show_notes: boolean;
    created_by: string;
    created_at: string; // ISO date string
    owner_auth: boolean;
    hours_estimate: number;
    department: string;
    billing_method: string;
    billing_customer: string;
    ship_in_charge: number; // percentage
    use_flat_part_charge: boolean;
    do_not_bill: boolean;
    do_not_tax_shop_labor: boolean;
    logbook_category_airframe: boolean;
    logbook_category_powerplant: boolean;
    assigned_technician_ids: string[];
    used_tool_ids: string[];
    used_parts: UsedPart[];
    resolution: string;
    signatures: {
        work_complete: Signature | null;
        operational_check: Signature | null;
        inspector: Signature | null;
        return_to_service: Signature | null;
    };
}

export interface WorkOrder {
    wo_id: string;
    aircraft_id: string;
    aircraft_tail_number: string;
    visit_name: string;
    scheduled_date: string; // YYYY-MM-DD
    status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
    priority: 'routine' | 'urgent' | 'aog';
    squawks: Squawk[];
    location?: string; // e.g., "Hangar 1", "Ramp"
}

export interface RepairOrder {
    ro_id: string;
    aircraft_id: string;
    aircraft_tail_number: string;
    description: string;
    created_date: string; // YYYY-MM-DD
    status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
    priority: 'routine' | 'urgent' | 'aog';
    squawks: Squawk[];
    location?: string; // e.g., "Hangar 1", "Ramp"
}

export interface PurchaseOrderItem {
    id: string;
    inventoryItemId: string;
    name: string;
    description: string;
    quantityToOrder: number;
    costPerUnit: number;
    supplierName: string;
}

export interface PurchaseOrder {
    po_id: string;
    supplierName: string;
    created_date: string; // YYYY-MM-DD
    status: 'Draft' | 'Submitted' | 'Partially Received' | 'Received' | 'Cancelled';
    items: PurchaseOrderItem[];
    totalCost: number;
}

export interface OptimizedVisitEvent {
    eventName: string;
    reasonForScheduling: string;
}

export interface OptimizedVisit {
    visitName: string;
    scheduledDate: string; // YYYY-MM-DD
    totalManHours: number;
    hangarAssignment: string;
    events: OptimizedVisitEvent[];
    requiredTooling: string[];
    requiredConsumables: string[];
}

export interface OptimizedSchedule {
    aircraftId: string;
    schedule: OptimizedVisit[];
    summary: string;
}

export interface MaintenanceInsight {
    severity: 'low' | 'medium' | 'high';
    pattern: string;
    prediction: string;
    recommendation: string;
}

export interface MaintenanceForecast {
    aircraftId: string;
    summary: string;
    insights: MaintenanceInsight[];
}

interface BaseStagedRecord {
    validationStatus: 'valid' | 'invalid' | 'needs_review';
    validationNotes: string[];
}

export interface StagedWorkOrder extends BaseStagedRecord {
    wo_id: string;
    aircraft_tail_number: string;
    visit_name: string;
    scheduled_date: string;
    status: string;
    priority: string;
    tasks: string;
}

export interface StagedTool extends BaseStagedRecord {
    // Define properties based on csv
    Name: string;
    Description: string;
    Make?: string;
    Model?: string;
    Serial?: string;
    ToolType: string;
    CalibrationDueNextDate?: string;
}

export interface StagedConsumable extends BaseStagedRecord {
    // Define properties based on csv
    'Part Number': string;
    Description: string;
    Location: string;
    Quantity: number;
    'Min Level': number;
    Expiration?: string;
}

export interface ParsedPOHeader {
    po_number: string;
    supplier_name: string;
    order_date: string;
}

export interface ParsedPackingSlipItem {
    model_number: string;
    description: string;
    quantity: number;
    category: 'tool' | 'part' | 'consumable' | 'unassigned';
}

export interface QuoteLineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface Quote {
    customerDescription: string;
    lineItems: QuoteLineItem[];
    subtotal: number;
    tax: number;
    total: number;
}
