
// FIX: Add file extension to import
import { Aircraft } from '../types.ts';

export const MOCK_AIRCRAFT_FLEET: Aircraft[] = [
  {
    id: 'ac-1',
    tail_number: 'N12345',
    model: 'CJ3',
    make: 'Cessna Citation',
    serial_number: '525B0123',
    hours_total: 2450.5,
    // Model: Cessna Citation CJ3 (525B)
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Cessna_525B_Citation_CJ3_OE-GDM.jpg/1200px-Cessna_525B_Citation_CJ3_OE-GDM.jpg',
    maintenance_events: [
      { id: 'me-1', name: 'Phase 1-4 Inspection', intervalType: 'hours', intervalValue: 300, lastPerformedHours: 2200, manHours: 40 },
      { id: 'me-2', name: 'Phase 5 Inspection', intervalType: 'days', intervalValue: 365, lastPerformedDate: '2024-06-15', manHours: 25 },
      { id: 'me-3', name: 'Engine HSI (Hot Section)', intervalType: 'hours', intervalValue: 1800, lastPerformedHours: 1750, manHours: 80 },
    ],
    logbook_entries: [
      { entry_id: 'log-1-1', aircraft_id: 'ac-1', entry_date: '2024-06-15T10:00:00Z', description: 'Completed Phase 5 Inspection.', flight_hours: 0, recorded_by: 'tech-1' },
      { entry_id: 'log-1-2', aircraft_id: 'ac-1', entry_date: '2024-07-20T14:30:00Z', description: 'Flight to DEN. All systems nominal.', flight_hours: 2.5, recorded_by: 'tech-2' }
    ],
    ad_compliance: [
        { ad_number: '2023-10-02', effective_date: '2023-06-01', subject: 'Landing Gear Pin Inspection', compliance_status: 'Open', due_date: '2024-06-01' },
        { ad_number: '2022-05-12', effective_date: '2022-02-15', subject: 'Engine Fuel Pump', compliance_status: 'Complied' },
        { ad_number: '2021-23-15', effective_date: '2021-12-10', subject: 'Flap Actuator Assembly', compliance_status: 'Complied' }
    ]
  },
  {
    id: 'ac-2',
    tail_number: 'N120GF',
    model: 'G-V',
    make: 'Gulfstream',
    serial_number: 'GV-555',
    hours_total: 5123.8,
    // Model: Gulfstream G-V
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Gulfstream_G-V_N502GV.jpg/1280px-Gulfstream_G-V_N502GV.jpg',
    maintenance_events: [
      { id: 'me-4', name: '500-hour Inspection', intervalType: 'hours', intervalValue: 500, lastPerformedHours: 4950, manHours: 60 },
      { id: 'me-5', name: '24-Month Check', intervalType: 'days', intervalValue: 730, lastPerformedDate: '2023-11-01', manHours: 120 },
      { id: 'me-6', name: 'Landing Gear Overhaul', intervalType: 'days', intervalValue: 3650, lastPerformedDate: '2019-01-20', manHours: 200 },
    ],
    logbook_entries: [
      { entry_id: 'log-2-1', aircraft_id: 'ac-2', entry_date: '2023-11-01T12:00:00Z', description: '24-Month Check completed.', flight_hours: 0, recorded_by: 'tech-3' }
    ],
    ad_compliance: [
        { ad_number: '2024-02-05', effective_date: '2024-01-15', subject: 'APU Fire Bottle Squib', compliance_status: 'Open', due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }, // Due in 15 days
        { ad_number: '2020-11-08', effective_date: '2020-05-20', subject: 'Elevator Trim Tab', compliance_status: 'Complied' }
    ]
  },
  {
    id: 'ac-3',
    tail_number: 'N999XX',
    model: 'PC-12',
    make: 'Pilatus',
    serial_number: '1234',
    hours_total: 890.1,
    // Model: Pilatus PC-12
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Pilatus_PC-12_N396AL.jpg/1280px-Pilatus_PC-12_N396AL.jpg',
    maintenance_events: [
      { id: 'me-7', name: 'Annual Inspection', intervalType: 'days', intervalValue: 365, lastPerformedDate: '2024-09-01', manHours: 50 },
      { id: 'me-8', name: '100-hour Inspection', intervalType: 'hours', intervalValue: 100, lastPerformedHours: 850, manHours: 16 },
    ],
    logbook_entries: [
      { entry_id: 'log-3-1', aircraft_id: 'ac-3', entry_date: '2024-09-01T16:00:00Z', description: 'Annual Inspection completed. Replaced ELT battery.', flight_hours: 0, recorded_by: 'tech-1' }
    ],
    ad_compliance: []
  },
  {
    id: 'ac-4',
    tail_number: 'N450CC',
    model: 'Challenger 350',
    make: 'Bombardier',
    serial_number: '20654',
    hours_total: 1240.5,
    // Model: Bombardier Challenger 350
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Bombardier_Challenger_350_N721BE_%2823629479373%29.jpg/1280px-Bombardier_Challenger_350_N721BE_%2823629479373%29.jpg',
    maintenance_events: [
      { id: 'me-9', name: '400-Hour Inspection', intervalType: 'hours', intervalValue: 400, lastPerformedHours: 1100, manHours: 35 },
      { id: 'me-10', name: '12-Month Inspection', intervalType: 'days', intervalValue: 365, lastPerformedDate: '2024-02-10', manHours: 40 },
      { id: 'me-10b', name: '96-Month Inspection', intervalType: 'days', intervalValue: 2920, lastPerformedDate: '2016-03-01', manHours: 150 },
    ],
    logbook_entries: [],
    ad_compliance: [
        { ad_number: '2023-01-01', effective_date: '2022-12-15', subject: 'Wing Anti-Ice Ducting', compliance_status: 'Open', due_date: '2025-06-30' }
    ]
  },
  {
    id: 'ac-5',
    tail_number: 'N300EP',
    model: 'Phenom 300',
    make: 'Embraer',
    serial_number: '50500300',
    hours_total: 650.0,
    // Model: Embraer Phenom 300
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Embraer_EMB-505_Phenom_300_PT-PVB.jpg/1280px-Embraer_EMB-505_Phenom_300_PT-PVB.jpg',
    maintenance_events: [
      { id: 'me-11', name: 'Annual Inspection', intervalType: 'days', intervalValue: 365, lastPerformedDate: '2024-05-15', manHours: 45 },
      { id: 'me-12', name: '600-Hour Inspection', intervalType: 'hours', intervalValue: 600, lastPerformedHours: 590, manHours: 30 }
    ],
    logbook_entries: [],
    ad_compliance: []
  }
];
