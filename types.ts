
// =============================================================================
// TECH1 AERO — types.ts
// Phase 1 Unified: merged Tool Inventory Checker types into Tech1 base
// =============================================================================

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
  | 'profitability'
  | 'calendar';

export interface Notification {
    id: number;
    message: string;
    read: boolean;
    timestamp: string;
    link?: { view: View; orderId?: string };
}

export interface AppSettings {
    profile:       { name: string; email: string };
    organization:  { name: string; repairStationNum: string; address: string };
    financials:    {
        laborRate: number;           // $/hr base
        shopSupplies: number;        // percentage
        taxRate: number;             // percentage
        benefitsLoad?: number;       // percentage added to labor rate (benefits, payroll tax, insurance)
        hangarOverhead?: number;     // $/hr flat overhead (facility, utilities, admin allocation)
    };
    notifications: { emailWorkOrder: boolean; emailInventory: boolean; pushCalibration: boolean };
    appearance:    {
        themeMode: 'dark' | 'light' | 'system';
        accentColor: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose';
        density: 'Compact' | 'Comfortable';
        reducedMotion: boolean;
    };
    hangars:       HangarConfig[];  // facility footprint config for 2D hangar view
}

// ---------------------------------------------------------------------------
// HANGAR CONFIGURATION
// ---------------------------------------------------------------------------

export interface HangarConfig {
    id:             string;
    label:          string;
    width_ft:       number;   // hangar floor width (wall-to-wall)
    depth_ft:       number;   // hangar floor depth (nose-in, door to back wall)
    door_height_ft: number;   // CRITICAL — gates aircraft by tail height
    door_width_ft:  number;   // door clear width
    bays:           number;   // number of nominal aircraft bays
    color?:         string;   // optional accent color for UI
}

export interface TrainingRecord {
    name:        string;   // e.g. "Fuel Cell Inspection", "Composite Repair", "RII Authorization"
    completedDate: string; // ISO date
    expiryDate?:  string;  // ISO date — if set, training expires
    issuedBy?:   string;
}

export interface Technician {
    id:             string;
    name:           string;
    certifications: string[];
    role:           'Admin' | 'Lead Technician' | 'Technician';
    efficiency?:    number;
    // Phase 2 — Skill-Based Labor Tracking
    vacation_dates?:   string[];        // ISO date strings (YYYY-MM-DD) tech is unavailable
    training_records?: TrainingRecord[]; // named training completions with optional expiry
}

export interface LogbookEntry {
    entry_id:     string;
    aircraft_id:  string;
    entry_date:   string;
    description:  string;
    flight_hours?: number;
    recorded_by:  string;
}

export interface MaintenanceEvent {
    id:                  string;
    name:                string;
    intervalType:        'hours' | 'days';
    intervalValue:       number;
    lastPerformedHours?: number;
    lastPerformedDate?:  string;
    manHours:            number;
}

export interface ADCompliance {
    ad_number:         string;
    effective_date:    string;
    subject:           string;
    compliance_status: 'Complied' | 'Open';
    due_date?:         string;
    url?:              string;
}

export interface Aircraft {
    id:                string;
    tail_number:       string;
    model:             string;
    make:              string;
    serial_number:     string;
    hours_total:       number;
    imageUrl?:         string;
    maintenance_events: MaintenanceEvent[];
    logbook_entries:   LogbookEntry[];
    ad_compliance:     ADCompliance[];

    // Physical dimensions for hangar stacking (Phase 3 Area 1)
    // If omitted, lookup table in data/aircraftDimensions.ts provides defaults by model
    wingspan_ft?:      number;
    length_ft?:        number;
    tail_height_ft?:   number;
}

export interface Supplier {
    supplierName: string;
    cost:         number;
}

export interface PartCertification {
    type:      '8130-3' | 'CoC' | 'EASA Form 1' | 'Other' | 'None';
    verified:  boolean;
    number?:   string;
    mediaUrl?: string;
    mediaName?:string;
}

export interface InventoryItem {
    id:                    string;
    part_no:               string;
    sku:                   string;
    description:           string;
    qty_on_hand:           number;
    qty_reserved:          number;
    reorder_level:         number;
    shelf_location:        string;
    storage_area:          string;
    procurement_lead_time: number;
    unit:                  string;
    suppliers:             Supplier[];
    expiration_date?:      string;
    certification?:        PartCertification;
    expected_delivery_date?: string;   // ISO date — set when item is on backorder (Phase 3)
}

// ---------------------------------------------------------------------------
// UNIFIED TOOL
// Merges Tech1's Tool (id, make, model, serial, calibrationRequired,
// calibrationDueDate, vendorPrices) with Tool Inventory Checker's Tool
// (calibrationDueDays, calibrationStatus, category, location, owner, toolCost).
// All existing code continues to work — new fields are optional additions.
// ---------------------------------------------------------------------------
export interface Tool {
    // Core identity (Tech1 originals — unchanged)
    id:                  string;
    name:                string;
    description:         string;
    details?:            string;
    make:                string | null;
    model:               string | null;
    serial:              string | null;
    calibrationRequired: boolean;
    calibrationDueDate?: string;       // YYYY-MM-DD
    vendorPrices:        { bhd?: number; continental?: number };

    // Extended fields from Tool Inventory Checker (all optional — non-breaking)
    calibrationDueDays?: number;       // computed: days until cal due
    calibrationStatus?:  'Good' | 'Needs Calibration' | 'N/A';
    category?:           string;
    location?:           string;
    owner?:              string;
    toolCost?:           string;
    quantity?:           string;
    unitPrice?:          string;
    totalPrice?:         string;
    sourcingLink?:       string;
    status?:             string;
}

export interface TimeLog {
    log_id:        string;
    technician_id: string;
    start_time:    string;
    end_time?:     string;
    is_billable:   boolean;   // true = charged to customer (task-level); false = shop presence only
    notes?:        string;
    // Task linkage — when set, this log is billable to a specific squawk
    squawk_id?:    string;
    order_id?:     string;    // wo_id or ro_id
    order_type?:   'WO' | 'RO';
}

export interface Signature {
    technician_id: string;
    signed_at:     string;
}

export interface UsedPart {
    inventory_item_id: string;
    quantity_used:     number;
}

export type SquawkStage =
    | 'Teardown'
    | 'Inspection'
    | 'Parts Pending'
    | 'Reassembly'
    | 'Testing'
    | 'Complete';

export interface Squawk {
    squawk_id:                    string;
    description:                  string;
    status:                       'open' | 'in_progress' | 'completed' | 'on_hold';
    priority:                     'routine' | 'urgent' | 'aog';
    stage?:                       SquawkStage;        // Phase 3 — workflow stage
    dependencies?:                string[];           // Phase 3 — squawk_ids that must finish first
    // Phase 2 — Skill-Based Labor Tracking
    required_certifications?:     string[];           // e.g. ['A&P', 'IA'] — gates assignment & clock-in
    required_training?:           string[];           // e.g. ['Fuel Cell', 'Composite Repair']
    time_logs:                    TimeLog[];
    category:                     string;
    rii_inspection_enabled:       boolean;
    notes:                        string;
    always_show_notes:            boolean;
    created_by:                   string;
    created_at:                   string;
    owner_auth:                   boolean;
    hours_estimate:               number;
    department:                   string;
    billing_method:               string;
    billing_customer:             string;
    ship_in_charge:               number;
    use_flat_part_charge:         boolean;
    do_not_bill:                  boolean;
    do_not_tax_shop_labor:        boolean;
    logbook_category_airframe:    boolean;
    logbook_category_powerplant:  boolean;
    assigned_technician_ids:      string[];
    used_tool_ids:                string[];
    used_parts:                   UsedPart[];
    resolution:                   string;
    completion_percentage?:       number;
    signatures: {
        work_complete:     Signature | null;
        operational_check: Signature | null;
        inspector:         Signature | null;
        return_to_service: Signature | null;
    };
}

export interface WorkOrder {
    wo_id:               string;
    aircraft_id:         string;
    aircraft_tail_number:string;
    visit_name:          string;
    scheduled_date:      string;
    status:              'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
    priority:            'routine' | 'urgent' | 'aog';
    squawks:             Squawk[];
    location?:           string;

    // Profitability tracking (Phase 3 Area 4)
    quoted_labor_hours?:    number;   // quoted at sell time; if omitted, falls back to sum of squawk estimates
    burdened_labor_rate?:   number;   // override Settings default; $/hr including benefits + overhead
    quoted_parts_total?:    number;   // quoted parts revenue
    quoted_total?:          number;   // full quoted price to customer
}

export interface RepairOrder {
    ro_id:               string;
    aircraft_id:         string;
    aircraft_tail_number:string;
    description:         string;
    created_date:        string;
    status:              'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
    priority:            'routine' | 'urgent' | 'aog';
    squawks:             Squawk[];
    location?:           string;

    // Profitability tracking (Phase 3 Area 4)
    quoted_labor_hours?:  number;
    burdened_labor_rate?: number;
    quoted_parts_total?:  number;
    quoted_total?:        number;
}

export interface PurchaseOrderItem {
    id:               string;
    inventoryItemId:  string;
    name:             string;
    description:      string;
    quantityToOrder:  number;
    costPerUnit:      number;
    supplierName:     string;
}

export interface PurchaseOrder {
    po_id:        string;
    supplierName: string;
    created_date: string;
    status:       'Draft' | 'Submitted' | 'Partially Received' | 'Received' | 'Cancelled';
    items:        PurchaseOrderItem[];
    totalCost:    number;
}

export interface OptimizedVisitEvent {
    eventName:           string;
    reasonForScheduling: string;
}

export interface OptimizedVisit {
    visitName:            string;
    scheduledDate:        string;
    totalManHours:        number;
    hangarAssignment:     string;
    events:               OptimizedVisitEvent[];
    requiredTooling:      string[];
    requiredConsumables:  string[];
}

export interface OptimizedSchedule {
    aircraftId: string;
    schedule:   OptimizedVisit[];
    summary:    string;
}

export interface MaintenanceInsight {
    severity:       'low' | 'medium' | 'high';
    pattern:        string;
    prediction:     string;
    recommendation: string;
}

export interface MaintenanceForecast {
    aircraftId: string;
    summary:    string;
    insights:   MaintenanceInsight[];
}

interface BaseStagedRecord {
    validationStatus: 'valid' | 'invalid' | 'needs_review';
    validationNotes:  string[];
}

export interface StagedWorkOrder extends BaseStagedRecord {
    wo_id:               string;
    aircraft_tail_number:string;
    visit_name:          string;
    scheduled_date:      string;
    status:              string;
    priority:            string;
    tasks:               string;
}

export interface StagedTool extends BaseStagedRecord {
    Name:                   string;
    Description:            string;
    Make?:                  string;
    Model?:                 string;
    Serial?:                string;
    ToolType:               string;
    CalibrationDueNextDate?:string;
}

export interface StagedConsumable extends BaseStagedRecord {
    'Part Number': string;
    Description:   string;
    Location:      string;
    Quantity:      number;
    'Min Level':   number;
    Expiration?:   string;
}

export interface ParsedPOHeader {
    supplierName:   string;
    poNumber:       string;
    orderDate:      string;
    estimatedTotal: number;
}

export interface ParsedPackingSlipItem {
    partNumber:      string;
    description:     string;
    quantityShipped: number;
    unitCost:        number;
}

// ---------------------------------------------------------------------------
// Tool Inventory Checker types — new additions for Phase 1
// ---------------------------------------------------------------------------

/** Vendor search link (replaces paid Google Search grounding) */
export interface VendorLink {
    vendor: string;
    url:    string;
}

export interface SourcingInfo {
    vendorLinks:   VendorLink[];
    sourcingNotes: string;
}

export interface SuggestedSubstitution {
    neededTool:    Tool;
    suggestedTool: Tool;
    confidence:    'High' | 'Medium' | 'Low';
    reason:        string;
}

export interface ComparisonResult {
    available:               Tool[];
    onOrder:                 Tool[];
    shortage:                Tool[];
    suggestedSubstitutions?: SuggestedSubstitution[];
}

export interface Kit {
    id:        string;
    name:      string;
    tools:     Tool[];
    createdAt: string;
}

export interface SavedToolList {
    id:               string;
    name:             string;
    maintenanceEvent: string;
    tools:            Tool[];
    createdAt:        string;
}

export interface SavedComparison {
    id:               string;
    name:             string;
    createdAt:        string;
    result:           ComparisonResult;
    toolListName:     string;
    maintenanceEvent: string;
}

/** Per-aircraft tool history hub */
export interface AircraftToolData {
    aircraftId:  string;
    toolLists:   SavedToolList[];
    comparisons: SavedComparison[];
}

export interface MaintenanceTask {
    task:  string;
    tools: Tool[];
}

export interface PurchasePlanItem {
    id:          string;
    aircraft:    string;
    itemType:    string;
    name:        string;
    partNumber:  string;
    manufacturer:string;
    reason:      string;
    stage:       string;
    unitPrice:   string;
    quantity:    string;
    totalPrice:  string;
    sourcingLink:string;
    requestId:   string;
    status:      string;
    notes:       string;
    received?:   boolean;
    tlNumber?:   string;
}

// ---------------------------------------------------------------------------
// Existing types preserved from Tech1 (unchanged)
// ---------------------------------------------------------------------------

export interface QuoteLineItem {
    description: string;
    part_no?:    string;
    quantity:    number;
    unitPrice:   number;
    total:       number;
}

export interface Quote {
    customerDescription: string;
    lineItems:           QuoteLineItem[];
    subtotal:            number;
    laborTotal:          number;
    partsTotal:          number;
    shopSupplies:        number;
    tax:                 number;
    grandTotal:          number;
}

export interface ToastMessage {
    id:      number;
    message: string;
    type:    'success' | 'error' | 'info' | 'warning';
}
