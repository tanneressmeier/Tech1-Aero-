
// FIX: Replaced placeholder content with actual mock data.
import { WorkOrder, RepairOrder, Squawk } from '../types.ts';

const generateSquawks = (count: number, prefix: string): Squawk[] => {
    const squawks: Squawk[] = [];
    for (let i = 1; i <= count; i++) {
        squawks.push({
            squawk_id: `${prefix}-sq-${i}`,
            description: `Task ${i} for order ${prefix}`,
            status: i % 3 === 0 ? 'completed' : (i % 2 === 0 ? 'in_progress' : 'open'),
            priority: 'routine',
            time_logs: [],
            category: 'Maintenance',
            rii_inspection_enabled: false,
            notes: '',
            always_show_notes: false,
            created_by: 'tech-1',
            created_at: new Date().toISOString(),
            owner_auth: false,
            hours_estimate: i * 2,
            department: 'Maintenance',
            billing_method: 'Hourly',
            billing_customer: 'Elevate MRO',
            ship_in_charge: 0,
            use_flat_part_charge: false,
            do_not_bill: false,
            do_not_tax_shop_labor: false,
            logbook_category_airframe: true,
            logbook_category_powerplant: false,
            assigned_technician_ids: [],
            used_tool_ids: [],
            used_parts: [],
            resolution: i % 3 === 0 ? 'Completed as per manual.' : '',
            signatures: {
                work_complete: null,
                operational_check: null,
                inspector: null,
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
