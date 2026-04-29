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
            { name: 'Forklift / GSE Operation',      requirementId: 'tr-forklift',      completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Aircraft Towing & Marshalling',  requirementId: 'tr-towing',        completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'FOD Awareness',                  requirementId: 'tr-fod',           completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Hazardous Materials (HazMat)',   requirementId: 'tr-hazmat',        completedDate: daysAgo(90),  expiryDate: daysOut(640), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 730 },
            { name: 'Fire Extinguisher / Hangar Safety', requirementId: 'tr-fire',       completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Drug & Alcohol Awareness (DOT)', requirementId: 'tr-drug-alcohol', completedDate: daysAgo(200), expiryDate: daysOut(530), issuedBy: 'FAA / DOT',      recurrenceIntervalDays: 730 },
            { name: 'Human Factors (PEAR Model)',     requirementId: 'tr-human-factors', completedDate: daysAgo(200), expiryDate: daysOut(530), issuedBy: 'FAA',            recurrenceIntervalDays: 730 },
            { name: 'Maintenance Ethics & Professionalism', requirementId: 'tr-ethics', completedDate: daysAgo(200), expiryDate: daysOut(530), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 730 },
            { name: 'Aviation Security (SIDA)',       requirementId: 'tr-security',      completedDate: daysAgo(120), expiryDate: daysOut(245), issuedBy: 'Airport Authority', recurrenceIntervalDays: 365 },
            { name: 'Quality Management System (QMS)',requirementId: 'tr-qms',           completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'RII Authorization',              requirementId: 'tr-rii',           completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Fuel Cell Inspection',           requirementId: 'tr-fuel-cell',     completedDate: daysAgo(180), expiryDate: daysOut(185), issuedBy: 'FAA',            recurrenceIntervalDays: 365 },
            { name: 'Composite Repair',               requirementId: 'tr-composite',     completedDate: daysAgo(90),  expiryDate: daysOut(640), issuedBy: 'OEM',            recurrenceIntervalDays: 730 },
            { name: 'Hydraulic Systems',              requirementId: 'tr-hydraulic',     completedDate: daysAgo(30),  expiryDate: daysOut(335), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
        ],
    },
    {
        id: 'tech-5', name: 'Tanner Essmeier',
        certifications: ['A&P', 'IA'],
        role: 'Admin', efficiency: 0.90,
        vacation_dates: [daysOut(3), daysOut(4), daysOut(5), daysOut(6), daysOut(7)],
        training_records: [
            { name: 'Forklift / GSE Operation',      requirementId: 'tr-forklift',      completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Aircraft Towing & Marshalling',  requirementId: 'tr-towing',        completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'FOD Awareness',                  requirementId: 'tr-fod',           completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Fire Extinguisher / Hangar Safety', requirementId: 'tr-fire',       completedDate: daysAgo(300), expiryDate: daysAgo(20),  issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },  // EXPIRED
            { name: 'Drug & Alcohol Awareness (DOT)', requirementId: 'tr-drug-alcohol', completedDate: daysAgo(200), expiryDate: daysOut(530), issuedBy: 'FAA / DOT',      recurrenceIntervalDays: 730 },
            { name: 'Human Factors (PEAR Model)',     requirementId: 'tr-human-factors', completedDate: daysAgo(200), expiryDate: daysOut(530), issuedBy: 'FAA',            recurrenceIntervalDays: 730 },
            { name: 'Aviation Security (SIDA)',       requirementId: 'tr-security',      completedDate: daysAgo(340), expiryDate: daysAgo(5),   issuedBy: 'Airport Authority', recurrenceIntervalDays: 365 }, // EXPIRED
            { name: 'Quality Management System (QMS)',requirementId: 'tr-qms',           completedDate: daysAgo(45),  expiryDate: daysOut(320), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'RII Authorization',              requirementId: 'tr-rii',           completedDate: daysAgo(200), expiryDate: daysOut(165), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Fuel Cell Inspection',           requirementId: 'tr-fuel-cell',     completedDate: daysAgo(400), expiryDate: daysAgo(35),  issuedBy: 'FAA',            recurrenceIntervalDays: 365 },  // EXPIRED
        ],
    },
    {
        id: 'tech-2', name: 'Caleb Omara',
        certifications: ['A&P'],
        role: 'Lead Technician', efficiency: 0.85,
        vacation_dates: [daysOut(10), daysOut(11)],
        training_records: [
            { name: 'Forklift / GSE Operation',      requirementId: 'tr-forklift',      completedDate: daysAgo(60),  expiryDate: daysOut(305), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Aircraft Towing & Marshalling',  requirementId: 'tr-towing',        completedDate: daysAgo(60),  expiryDate: daysOut(305), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'FOD Awareness',                  requirementId: 'tr-fod',           completedDate: daysAgo(60),  expiryDate: daysOut(305), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Hazardous Materials (HazMat)',   requirementId: 'tr-hazmat',        completedDate: daysAgo(400), expiryDate: daysAgo(35),  issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 730 },  // EXPIRED
            { name: 'Drug & Alcohol Awareness (DOT)', requirementId: 'tr-drug-alcohol', completedDate: daysAgo(400), expiryDate: daysAgo(35),  issuedBy: 'FAA / DOT',      recurrenceIntervalDays: 730 },  // EXPIRED
            { name: 'Human Factors (PEAR Model)',     requirementId: 'tr-human-factors', completedDate: daysAgo(120), expiryDate: daysOut(610), issuedBy: 'FAA',            recurrenceIntervalDays: 730 },
            { name: 'Aviation Security (SIDA)',       requirementId: 'tr-security',      completedDate: daysAgo(60),  expiryDate: daysOut(305), issuedBy: 'Airport Authority', recurrenceIntervalDays: 365 },
            { name: 'Quality Management System (QMS)',requirementId: 'tr-qms',           completedDate: daysAgo(60),  expiryDate: daysOut(305), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'RII Authorization',              requirementId: 'tr-rii',           completedDate: daysAgo(60),  expiryDate: daysOut(305), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Composite Repair',               requirementId: 'tr-composite',     completedDate: daysAgo(60),  expiryDate: daysOut(670), issuedBy: 'OEM',            recurrenceIntervalDays: 730 },
            { name: 'Hydraulic Systems',              requirementId: 'tr-hydraulic',     completedDate: daysAgo(120), expiryDate: daysOut(245), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
        ],
    },
    {
        id: 'tech-3', name: 'Sam Sandifer',
        certifications: ['A&P', 'Avionics'],
        role: 'Admin', efficiency: 0.88,
        vacation_dates: [],
        training_records: [
            { name: 'Forklift / GSE Operation',      requirementId: 'tr-forklift',      completedDate: daysAgo(90),  expiryDate: daysOut(275), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Aircraft Towing & Marshalling',  requirementId: 'tr-towing',        completedDate: daysAgo(90),  expiryDate: daysOut(275), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'FOD Awareness',                  requirementId: 'tr-fod',           completedDate: daysAgo(90),  expiryDate: daysOut(275), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Hazardous Materials (HazMat)',   requirementId: 'tr-hazmat',        completedDate: daysAgo(90),  expiryDate: daysOut(640), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 730 },
            { name: 'Drug & Alcohol Awareness (DOT)', requirementId: 'tr-drug-alcohol', completedDate: daysAgo(90),  expiryDate: daysOut(640), issuedBy: 'FAA / DOT',      recurrenceIntervalDays: 730 },
            { name: 'Human Factors (PEAR Model)',     requirementId: 'tr-human-factors', completedDate: daysAgo(90),  expiryDate: daysOut(640), issuedBy: 'FAA',            recurrenceIntervalDays: 730 },
            { name: 'Aviation Security (SIDA)',       requirementId: 'tr-security',      completedDate: daysAgo(90),  expiryDate: daysOut(275), issuedBy: 'Airport Authority', recurrenceIntervalDays: 365 },
            { name: 'Quality Management System (QMS)',requirementId: 'tr-qms',           completedDate: daysAgo(90),  expiryDate: daysOut(275), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'RII Authorization',              requirementId: 'tr-rii',           completedDate: daysAgo(90),  expiryDate: daysOut(275), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Avionics / Glass Cockpit',       requirementId: 'tr-avionics',      completedDate: daysAgo(45),  issuedBy: 'Garmin' },
            { name: 'ADS-B Installation',             completedDate: daysAgo(200),  expiryDate: daysOut(160), issuedBy: 'FAA' },
        ],
    },
    {
        id: 'tech-6', name: 'Andrew Beard',
        certifications: ['A&P'],
        role: 'Technician', efficiency: 0.80,
        vacation_dates: [daysOut(5)],
        training_records: [
            { name: 'Forklift / GSE Operation',      requirementId: 'tr-forklift',      completedDate: daysAgo(30),  expiryDate: daysOut(335), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Aircraft Towing & Marshalling',  requirementId: 'tr-towing',        completedDate: daysAgo(30),  expiryDate: daysOut(335), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'FOD Awareness',                  requirementId: 'tr-fod',           completedDate: daysAgo(30),  expiryDate: daysOut(335), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Drug & Alcohol Awareness (DOT)', requirementId: 'tr-drug-alcohol', completedDate: daysAgo(30),  expiryDate: daysOut(700), issuedBy: 'FAA / DOT',      recurrenceIntervalDays: 730 },
            { name: 'Human Factors (PEAR Model)',     requirementId: 'tr-human-factors', completedDate: daysAgo(30),  expiryDate: daysOut(700), issuedBy: 'FAA',            recurrenceIntervalDays: 730 },
            { name: 'Aviation Security (SIDA)',       requirementId: 'tr-security',      completedDate: daysAgo(340), expiryDate: daysAgo(10),  issuedBy: 'Airport Authority', recurrenceIntervalDays: 365 }, // EXPIRED
            { name: 'Quality Management System (QMS)',requirementId: 'tr-qms',           completedDate: daysAgo(30),  expiryDate: daysOut(335), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
            { name: 'Hydraulic Systems',              requirementId: 'tr-hydraulic',     completedDate: daysAgo(30),  expiryDate: daysOut(335), issuedBy: 'Tech1 Aero',     recurrenceIntervalDays: 365 },
        ],
    },
];
