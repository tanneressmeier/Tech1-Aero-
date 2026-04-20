import { Technician } from '../types.ts';

const today = new Date();
const daysOut = (n: number) => new Date(today.getTime() + n * 86400000).toISOString().split('T')[0];
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().split('T')[0];

export const MOCK_TECHNICIANS: Technician[] = [
    {
        id: 'tech-1', name: 'Michael Snyder',
        certifications: ['A&P', 'IA'],
        role: 'Admin', efficiency: 0.95,
        vacation_dates: [],
        training_records: [
            { name: 'Fuel Cell Inspection',  completedDate: daysAgo(180), expiryDate: daysOut(185), issuedBy: 'FAA' },
            { name: 'Composite Repair',      completedDate: daysAgo(90),  expiryDate: daysOut(275), issuedBy: 'OEM' },
            { name: 'RII Authorization',     completedDate: daysAgo(365), expiryDate: daysOut(365), issuedBy: 'Tech1 Aero' },
        ],
    },
    {
        id: 'tech-5', name: 'Tanner Essmeier',
        certifications: ['A&P', 'IA'],
        role: 'Admin', efficiency: 0.90,
        vacation_dates: [daysOut(3), daysOut(4), daysOut(5), daysOut(6), daysOut(7)],
        training_records: [
            { name: 'Fuel Cell Inspection',  completedDate: daysAgo(400), expiryDate: daysAgo(35),  issuedBy: 'FAA' },  // EXPIRED
            { name: 'RII Authorization',     completedDate: daysAgo(200), expiryDate: daysOut(165), issuedBy: 'Tech1 Aero' },
        ],
    },
    {
        id: 'tech-2', name: 'Caleb Omara',
        certifications: ['A&P'],
        role: 'Lead Technician', efficiency: 0.85,
        vacation_dates: [daysOut(10), daysOut(11)],
        training_records: [
            { name: 'Composite Repair',      completedDate: daysAgo(60),  expiryDate: daysOut(305), issuedBy: 'OEM' },
            { name: 'Hydraulic Systems',     completedDate: daysAgo(120), expiryDate: daysOut(245), issuedBy: 'Tech1 Aero' },
        ],
    },
    {
        id: 'tech-3', name: 'Sam Sandifer',
        certifications: ['A&P', 'Avionics'],
        role: 'Admin', efficiency: 0.88,
        vacation_dates: [],
        training_records: [
            { name: 'Glass Cockpit Upgrade', completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Garmin' },
            { name: 'ADS-B Installation',    completedDate: daysAgo(200), expiryDate: daysOut(160), issuedBy: 'FAA' },
        ],
    },
    {
        id: 'tech-6', name: 'Andrew Beard',
        certifications: ['A&P'],
        role: 'Technician', efficiency: 0.80,
        vacation_dates: [daysOut(5)],
        training_records: [
            { name: 'Hydraulic Systems',     completedDate: daysAgo(30),  expiryDate: daysOut(335), issuedBy: 'Tech1 Aero' },
        ],
    },
];
