
// FIX: Replaced placeholder content with actual mock data.
import { WorkOrder, RepairOrder, Squawk } from '../types.ts';

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
];

const generateSquawks = (count: number, prefix: string): Squawk[] => {
    const squawks: Squawk[] = [];

    // Skill requirements keyed by description index (0-based)
    const SKILL_MAP: Record<number, { certs?: string[]; training?: string[] }> = {
        0: { certs: ['A&P'],       training: [] },                                        // landing gear
        1: { certs: ['A&P'],       training: [] },                                        // flight controls
        2: { certs: ['A&P'],       training: [] },                                        // oil change
        3: { certs: ['A&P', 'IA'], training: ['Hydraulic Systems'] },                     // brake/hydraulic — needs IA sign-off
        4: { certs: ['A&P'],       training: [] },                                        // pitot-static
        5: { certs: ['A&P'],       training: ['Fuel Cell Inspection'] },                  // fuel injectors
        6: { certs: ['A&P', 'Avionics'], training: ['Glass Cockpit Upgrade'] },           // avionics
        7: { certs: ['A&P'],       training: ['Composite Repair'] },                      // corrosion/composites
    };

    for (let i = 1; i <= count; i++) {
        const isCompleted  = i % 4 === 0;
        const isInProgress = i % 3 === 0 && !isCompleted;
        const descIdx      = (i - 1) % DESCRIPTIONS.length;
        const skills       = SKILL_MAP[descIdx] ?? {};

        squawks.push({
            squawk_id:   `${prefix}-sq-${i}`,
            description: DESCRIPTIONS[descIdx],
            status:      isCompleted ? 'completed' : isInProgress ? 'in_progress' : 'open',
            priority:    i === 1 ? 'urgent' : 'routine',
            time_logs:   [],
            category:    'Maintenance',
            rii_inspection_enabled: i % 3 === 0,
            notes:       '',
            always_show_notes: false,
            created_by:  'tech-1',
            created_at:  new Date().toISOString(),
            owner_auth:  false,
            hours_estimate: i * 2,
            department:  'Maintenance',
            billing_method: 'Hourly',
            billing_customer: 'Tech1 Aero',
            ship_in_charge: 0,
            use_flat_part_charge: false,
            do_not_bill: false,
            do_not_tax_shop_labor: false,
            logbook_category_airframe: true,
            logbook_category_powerplant: i % 2 === 0,
            assigned_technician_ids: i <= 2 ? ['tech-2'] : [],
            used_tool_ids: [],
            // Squawk 4 uses the backordered hydraulic seal kit — cascades in Gantt
            used_parts: i === 4 ? [{ inventory_item_id: 'part-4', quantity_used: 1 }] : [],
            resolution:  isCompleted ? 'Completed per maintenance manual.' : '',
            completion_percentage: isCompleted ? 100 : isInProgress ? Math.round((i / count) * 60) : 0,
            stage:       STAGE_SEQUENCE[Math.min(i - 1, STAGE_SEQUENCE.length - 1)],
            dependencies: i > 1 ? [`${prefix}-sq-${i - 1}`] : [],
            // Skills gating — populated from SKILL_MAP by description type
            required_certifications: skills.certs?.length ? skills.certs : undefined,
            required_training:       skills.training?.length ? skills.training : undefined,
            signatures: {
                work_complete:     null,
                operational_check: null,
                inspector:         null,
                return_to_service: null,
            },
        });
    }
    return squawks;
}

export const MOCK_WORK_ORDERS: WorkOrder[] = [
    {
        wo_id: "WO-24-001",
        aircraft_id: "ac-1",
        aircraft_tail_number: "N12345",
        visit_name: "Phase 1-4 Inspection",
        scheduled_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "In Progress",
        priority: "routine",
        location: "Hangar 1",
        squawks: generateSquawks(5, 'WO-24-001'),
    },
    {
        wo_id: "WO-24-002",
        aircraft_id: "ac-2",
        aircraft_tail_number: "N120GF",
        visit_name: "24-Month Check",
        scheduled_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "Pending",
        priority: "routine",
        location: "Hangar 2",
        squawks: generateSquawks(8, 'WO-24-002'),
    },
];

export const MOCK_REPAIR_ORDERS: RepairOrder[] = [
    {
        ro_id: "RO-24-001",
        aircraft_id: "ac-3",
        aircraft_tail_number: "N999XX",
        description: "COM 2 radio inoperative",
        created_date: new Date().toISOString().split('T')[0],
        status: "In Progress",
        priority: "urgent",
        location: "Ramp",
        squawks: generateSquawks(3, 'RO-24-001'),
    },
    {
        ro_id: "RO-24-002",
        aircraft_id: "ac-1",
        aircraft_tail_number: "N12345",
        description: "Chip detector light illuminated on #1 engine",
        created_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "Completed",
        priority: "aog",
        location: "Hangar 1",
        squawks: generateSquawks(2, 'RO-24-002'),
    }
]
