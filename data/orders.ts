import { WorkOrder, RepairOrder, Squawk, UsedPart } from '../types.ts';

const STAGE_SEQUENCE = ['Teardown','Inspection','Parts Pending','Reassembly','Testing'] as const;

const DESCRIPTIONS = [
    'Inspect and service main landing gear struts',
    'Check and adjust flight control cable tensions',
    'Perform engine oil change and filter replacement',
    'Inspect brake assemblies — replace hydraulic actuator seals',
    'Perform pitot-static system leak check',
    'Inspect and clean fuel injector nozzles',
    'Check avionics cooling fan operation',
    'Inspect corrosion protection on wing spars',
    'Replace ELT battery and perform function test',
    'Inspect and lubricate flap actuator system',
    'Perform transponder calibration and check',
    'Replace cabin door seal and adjust latch mechanism',
];

const SKILL_MAP: Record<number, { certs?: string[]; training?: string[] }> = {
    0: { certs: ['A&P'] },
    1: { certs: ['A&P'] },
    2: { certs: ['A&P'] },
    3: { certs: ['A&P', 'IA'], training: ['Hydraulic Systems'] },
    4: { certs: ['A&P'] },
    5: { certs: ['A&P'], training: ['Fuel Cell Inspection'] },
    6: { certs: ['A&P', 'Avionics'], training: ['Glass Cockpit Upgrade'] },
    7: { certs: ['A&P'], training: ['Composite Repair'] },
    8: { certs: ['A&P'] },
    9: { certs: ['A&P'] },
    10: { certs: ['A&P', 'Avionics'] },
    11: { certs: ['A&P'] },
};

function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}

function daysOut(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
}

function generateSquawks(count: number, prefix: string, completedRatio = 0.4): Squawk[] {
    const squawks: Squawk[] = [];
    for (let i = 1; i <= count; i++) {
        const descIdx   = (i - 1) % DESCRIPTIONS.length;
        const skills    = SKILL_MAP[descIdx] ?? {};
        const isCompleted = i / count <= completedRatio;
        const isInProgress = !isCompleted && i === Math.ceil(count * completedRatio) + 1;
        squawks.push({
            squawk_id:   `${prefix}-sq-${i}`,
            description: DESCRIPTIONS[descIdx],
            status:      isCompleted ? 'completed' : isInProgress ? 'in_progress' : 'open',
            priority:    i === 1 ? 'urgent' : 'routine',
            time_logs: isCompleted ? [{
                log_id: `log-${prefix}-${i}`,
                technician_id: 'tech-2',
                start_time: new Date(Date.now() - (count - i + 2) * 3600000 * 6).toISOString(),
                end_time:   new Date(Date.now() - (count - i + 1) * 3600000 * 6).toISOString(),
                is_billable: true,
                squawk_id: `${prefix}-sq-${i}`,
            }] : [],
            category: 'Maintenance',
            rii_inspection_enabled: i % 3 === 0,
            notes: '',
            always_show_notes: false,
            created_by: 'tech-1',
            created_at: new Date().toISOString(),
            owner_auth: false,
            hours_estimate: 2 + (i % 4),
            department: 'Maintenance',
            billing_method: 'Hourly',
            billing_customer: 'Tech1 Aero',
            ship_in_charge: 0,
            use_flat_part_charge: false,
            do_not_bill: false,
            do_not_tax_shop_labor: false,
            logbook_category_airframe: true,
            logbook_category_powerplant: i % 2 === 0,
            assigned_technician_ids: i <= 2 ? ['tech-2'] : i <= 4 ? ['tech-6'] : [],
            used_tool_ids: [],
            used_parts: i === 4 ? [{ inventory_item_id: 'part-4', quantity_used: 1 }] : [],
            resolution: isCompleted ? 'Completed per maintenance manual. No discrepancies found.' : '',
            completion_percentage: isCompleted ? 100 : isInProgress ? Math.round((i / count) * 55) : 0,
            stage: STAGE_SEQUENCE[Math.min(i - 1, STAGE_SEQUENCE.length - 1)],
            dependencies: i > 1 ? [`${prefix}-sq-${i - 1}`] : [],
            required_certifications: skills.certs?.length ? skills.certs : undefined,
            required_training: skills.training?.length ? skills.training : undefined,
            signatures: {
                work_complete:     isCompleted ? { technician_id: 'tech-2', signed_at: new Date().toISOString() } : null,
                operational_check: isCompleted ? { technician_id: 'tech-1', signed_at: new Date().toISOString() } : null,
                inspector:         null,
                return_to_service: null,
            },
        });
    }
    return squawks;
}

export const MOCK_WORK_ORDERS: WorkOrder[] = [
    // ── Active / In Progress ────────────────────────────────────────────────
    {
        wo_id: 'WO-25-001', aircraft_id: 'ac-1', aircraft_tail_number: 'N12345',
        visit_name: '100-Hour Inspection',
        scheduled_date: daysAgo(5),
        status: 'In Progress', priority: 'routine',
        location: 'hangar-1',
        quoted_labor_hours: 24, quoted_total: 7200, quoted_parts_total: 1800,
        squawks: generateSquawks(6, 'WO-25-001', 0.5),
    },
    {
        wo_id: 'WO-25-002', aircraft_id: 'ac-2', aircraft_tail_number: 'N120GF',
        visit_name: '48-Month Airframe Inspection',
        scheduled_date: daysAgo(12),
        status: 'In Progress', priority: 'urgent',
        location: 'hangar-1',
        quoted_labor_hours: 80, quoted_total: 28000, quoted_parts_total: 8000,
        squawks: generateSquawks(10, 'WO-25-002', 0.3),
    },
    {
        wo_id: 'WO-25-003', aircraft_id: 'ac-3', aircraft_tail_number: 'N999XX',
        visit_name: 'Annual Inspection',
        scheduled_date: daysOut(2),
        status: 'Pending', priority: 'routine',
        location: 'hangar-2',
        quoted_labor_hours: 32, quoted_total: 9600, quoted_parts_total: 2400,
        squawks: generateSquawks(5, 'WO-25-003', 0),
    },
    // ── AOG ─────────────────────────────────────────────────────────────────
    {
        wo_id: 'WO-25-004', aircraft_id: 'ac-4', aircraft_tail_number: 'N450CC',
        visit_name: 'AOG — Hydraulic System Failure',
        scheduled_date: daysAgo(1),
        status: 'In Progress', priority: 'aog',
        location: 'hangar-1',
        quoted_labor_hours: 16, quoted_total: 6400, quoted_parts_total: 4200,
        squawks: generateSquawks(3, 'WO-25-004', 0.33),
    },
    // ── Completed (historical) ───────────────────────────────────────────────
    {
        wo_id: 'WO-24-001', aircraft_id: 'ac-1', aircraft_tail_number: 'N12345',
        visit_name: '100-Hour Inspection',
        scheduled_date: daysAgo(45),
        status: 'Completed', priority: 'routine',
        location: 'hangar-2',
        quoted_labor_hours: 22, quoted_total: 6600, quoted_parts_total: 1400,
        squawks: generateSquawks(5, 'WO-24-001', 1.0),
    },
    {
        wo_id: 'WO-24-002', aircraft_id: 'ac-5', aircraft_tail_number: 'N300EP',
        visit_name: '200-Hour Power Plant Inspection',
        scheduled_date: daysAgo(30),
        status: 'Completed', priority: 'routine',
        location: 'hangar-1',
        quoted_labor_hours: 18, quoted_total: 5400, quoted_parts_total: 900,
        squawks: generateSquawks(4, 'WO-24-002', 1.0),
    },
    {
        wo_id: 'WO-24-003', aircraft_id: 'ac-2', aircraft_tail_number: 'N120GF',
        visit_name: 'Avionics Upgrade — G600 Retrofit',
        scheduled_date: daysAgo(60),
        status: 'Completed', priority: 'routine',
        location: 'hangar-1',
        quoted_labor_hours: 40, quoted_total: 22000, quoted_parts_total: 14000,
        squawks: generateSquawks(8, 'WO-24-003', 1.0),
    },
    // ── On Hold ─────────────────────────────────────────────────────────────
    {
        wo_id: 'WO-25-005', aircraft_id: 'ac-3', aircraft_tail_number: 'N999XX',
        visit_name: 'Wing Spar Repair — Parts Pending',
        scheduled_date: daysOut(7),
        status: 'On Hold', priority: 'urgent',
        location: 'hangar-2',
        quoted_labor_hours: 48, quoted_total: 16000, quoted_parts_total: 6400,
        squawks: generateSquawks(7, 'WO-25-005', 0.15),
    },
    // ── Upcoming ─────────────────────────────────────────────────────────────
    {
        wo_id: 'WO-25-006', aircraft_id: 'ac-5', aircraft_tail_number: 'N300EP',
        visit_name: 'Phase 1 Inspection',
        scheduled_date: daysOut(14),
        status: 'Pending', priority: 'routine',
        location: 'hangar-2',
        quoted_labor_hours: 28, quoted_total: 8400, quoted_parts_total: 2000,
        squawks: generateSquawks(5, 'WO-25-006', 0),
    },
];

export const MOCK_REPAIR_ORDERS: RepairOrder[] = [
    {
        ro_id: 'RO-25-001', aircraft_id: 'ac-4', aircraft_tail_number: 'N450CC',
        description: 'Landing gear shimmy damper replacement',
        created_date: daysAgo(8),
        status: 'In Progress', priority: 'urgent',
        location: 'hangar-1',
        quoted_labor_hours: 12, quoted_total: 4200, quoted_parts_total: 1800,
        squawks: generateSquawks(3, 'RO-25-001', 0.33),
    },
    {
        ro_id: 'RO-25-002', aircraft_id: 'ac-1', aircraft_tail_number: 'N12345',
        description: 'Cabin pressurization seal replacement',
        created_date: daysAgo(3),
        status: 'Pending', priority: 'routine',
        location: 'hangar-2',
        quoted_labor_hours: 8, quoted_total: 2400, quoted_parts_total: 600,
        squawks: generateSquawks(2, 'RO-25-002', 0),
    },
    {
        ro_id: 'RO-24-001', aircraft_id: 'ac-2', aircraft_tail_number: 'N120GF',
        description: 'Engine fuel control unit overhaul',
        created_date: daysAgo(50),
        status: 'Completed', priority: 'routine',
        location: 'hangar-1',
        quoted_labor_hours: 20, quoted_total: 8500, quoted_parts_total: 5000,
        squawks: generateSquawks(4, 'RO-24-001', 1.0),
    },
    {
        ro_id: 'RO-24-002', aircraft_id: 'ac-3', aircraft_tail_number: 'N999XX',
        description: 'Nose wheel steering system repair',
        created_date: daysAgo(25),
        status: 'Completed', priority: 'routine',
        location: 'hangar-2',
        quoted_labor_hours: 6, quoted_total: 1800, quoted_parts_total: 400,
        squawks: generateSquawks(2, 'RO-24-002', 1.0),
    },
];
