
// FIX: Corrected import path for types by adding file extension.
import { Technician } from '../types.ts';

export const MOCK_TECHNICIANS: Technician[] = [
  { id: 'tech-1', name: 'Michael Snyder', certifications: ['A&P', 'IA'], role: 'Admin', efficiency: 0.95 },
  { id: 'tech-5', name: 'Tanner Essmeier', certifications: ['A&P', 'IA'], role: 'Admin', efficiency: 0.90 },
  { id: 'tech-2', name: 'Caleb Omara', certifications: ['A&P'], role: 'Lead Technician', efficiency: 0.85 },
  { id: 'tech-3', name: 'Sam Sandifer', certifications: ['A&P', 'Avionics'], role: 'Admin', efficiency: 0.88 },
  { id: 'tech-6', name: 'Andrew Beard', certifications: ['A&P'], role: 'Technician', efficiency: 0.80 },
];
