// =============================================================================
// utils/skillsEngine.ts
// Pure TypeScript skills-based labor authorization engine.
// Zero API calls — all checks run client-side in real-time.
//
// Answers:
//   1. Is this technician authorized for this squawk?
//   2. Is this technician available on this date (not on vacation)?
//   3. Which skills are missing from a squawk's assigned techs?
//   4. Does a work order have a labor bottleneck (missing skills or vacation conflicts)?
// =============================================================================

import { Technician, Squawk, WorkOrder, RepairOrder } from '../types.ts';

// ── Authorization check ───────────────────────────────────────────────────────

export interface AuthorizationResult {
    authorized:      boolean;
    missingCerts:    string[];
    missingTraining: string[];
    expiredTraining: string[];
    reason:          string;  // human-readable single string for UI display
}

/**
 * Check if a technician is authorized to work a specific squawk.
 * Checks certifications AND named training records (with expiry).
 */
export function checkAuthorization(
    tech: Technician,
    squawk: Squawk,
    asOfDate: Date = new Date()
): AuthorizationResult {
    const missingCerts:    string[] = [];
    const missingTraining: string[] = [];
    const expiredTraining: string[] = [];

    // Check required certifications
    for (const cert of squawk.required_certifications ?? []) {
        if (!tech.certifications.includes(cert)) {
            missingCerts.push(cert);
        }
    }

    // Check required training (must exist and not be expired)
    for (const trainingName of squawk.required_training ?? []) {
        const record = tech.training_records?.find(r =>
            r.name.toLowerCase() === trainingName.toLowerCase()
        );
        if (!record) {
            missingTraining.push(trainingName);
        } else if (record.expiryDate && new Date(record.expiryDate) < asOfDate) {
            expiredTraining.push(trainingName);
        }
    }

    const authorized = missingCerts.length === 0 &&
                       missingTraining.length === 0 &&
                       expiredTraining.length === 0;

    let reason = '';
    if (!authorized) {
        const parts: string[] = [];
        if (missingCerts.length)    parts.push(`Missing cert${missingCerts.length > 1 ? 's' : ''}: ${missingCerts.join(', ')}`);
        if (missingTraining.length) parts.push(`Missing training: ${missingTraining.join(', ')}`);
        if (expiredTraining.length) parts.push(`Expired training: ${expiredTraining.join(', ')}`);
        reason = parts.join(' · ');
    }

    return { authorized, missingCerts, missingTraining, expiredTraining, reason };
}

// ── Availability check ────────────────────────────────────────────────────────

/**
 * Check if a technician is on vacation on a specific date.
 */
export function isOnVacation(tech: Technician, date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return (tech.vacation_dates ?? []).includes(dateStr);
}

/**
 * Get all vacation dates for a tech within a date range, for calendar rendering.
 */
export function getVacationDatesInRange(
    tech: Technician,
    start: Date,
    end: Date
): string[] {
    return (tech.vacation_dates ?? []).filter(d => {
        const date = new Date(d + 'T00:00:00');
        return date >= start && date <= end;
    });
}

// ── Training expiry warnings ──────────────────────────────────────────────────

export interface TrainingExpiryWarning {
    techId:       string;
    techName:     string;
    trainingName: string;
    expiryDate:   string;
    daysUntilExpiry: number;
    isExpired:    boolean;
}

/**
 * Get all training expiry warnings across a list of technicians.
 * Returns warnings for expired and expiring-within-60-days training.
 */
export function getTrainingExpiryWarnings(
    technicians: Technician[],
    warningDays = 60
): TrainingExpiryWarning[] {
    const now = new Date();
    const warnings: TrainingExpiryWarning[] = [];

    for (const tech of technicians) {
        for (const record of tech.training_records ?? []) {
            if (!record.expiryDate) continue;
            const expiry    = new Date(record.expiryDate);
            const daysLeft  = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
            if (daysLeft <= warningDays) {
                warnings.push({
                    techId:           tech.id,
                    techName:         tech.name,
                    trainingName:     record.name,
                    expiryDate:       record.expiryDate,
                    daysUntilExpiry:  daysLeft,
                    isExpired:        daysLeft < 0,
                });
            }
        }
    }

    return warnings.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

// ── Squawk-level coverage check ───────────────────────────────────────────────

export interface SquawkCoverageGap {
    squawkId:    string;
    description: string;
    missing:     string[]; // combined missing certs + training
}

/**
 * For a squawk, check which required certs/training are NOT covered
 * by ANY of its assigned technicians.
 */
export function getSquawkCoverageGaps(
    squawk: Squawk,
    assignedTechs: Technician[]
): SquawkCoverageGap | null {
    if (!squawk.required_certifications?.length && !squawk.required_training?.length) {
        return null;
    }

    const missing: string[] = [];

    // A cert is covered if at least one assigned tech has it
    for (const cert of squawk.required_certifications ?? []) {
        const covered = assignedTechs.some(t => t.certifications.includes(cert));
        if (!covered) missing.push(cert);
    }

    // A training is covered if at least one assigned tech has a valid (non-expired) record
    const now = new Date();
    for (const trainingName of squawk.required_training ?? []) {
        const covered = assignedTechs.some(t => {
            const rec = t.training_records?.find(r =>
                r.name.toLowerCase() === trainingName.toLowerCase()
            );
            return rec && (!rec.expiryDate || new Date(rec.expiryDate) >= now);
        });
        if (!covered) missing.push(trainingName);
    }

    if (!missing.length) return null;
    return { squawkId: squawk.squawk_id, description: squawk.description, missing };
}

// ── Work Order bottleneck analysis ────────────────────────────────────────────

export interface LaborBottleneck {
    type:         'missing_skill' | 'vacation_conflict' | 'training_expired';
    squawkId?:    string;
    squawkDesc?:  string;
    techId?:      string;
    techName?:    string;
    detail:       string;  // human-readable explanation
}

/**
 * Full bottleneck analysis for a work order or repair order.
 * Returns all labor issues that should surface as warnings.
 */
export function analyzeOrderBottlenecks(
    order: WorkOrder | RepairOrder,
    technicians: Technician[]
): LaborBottleneck[] {
    const techMap = new Map(technicians.map(t => [t.id, t]));
    const bottlenecks: LaborBottleneck[] = [];

    const scheduledDate = 'scheduled_date' in order
        ? new Date(order.scheduled_date + 'T08:00:00')
        : new Date(order.created_date  + 'T08:00:00');

    for (const squawk of order.squawks) {
        const assignedTechs = squawk.assigned_technician_ids
            .map(id => techMap.get(id))
            .filter((t): t is Technician => !!t);

        // 1. Missing skill coverage
        const gap = getSquawkCoverageGaps(squawk, assignedTechs);
        if (gap) {
            bottlenecks.push({
                type:       'missing_skill',
                squawkId:   squawk.squawk_id,
                squawkDesc: squawk.description,
                detail:     `"${squawk.description}" requires: ${gap.missing.join(', ')} — not covered by assigned techs`,
            });
        }

        // 2. Vacation conflicts — assigned tech is off on the scheduled date
        for (const tech of assignedTechs) {
            if (isOnVacation(tech, scheduledDate)) {
                bottlenecks.push({
                    type:       'vacation_conflict',
                    squawkId:   squawk.squawk_id,
                    squawkDesc: squawk.description,
                    techId:     tech.id,
                    techName:   tech.name,
                    detail:     `${tech.name} is on vacation on ${scheduledDate.toLocaleDateString()} — assigned to "${squawk.description}"`,
                });
            }
        }

        // 3. Expired training on assigned techs
        for (const tech of assignedTechs) {
            const expiredWarnings = getTrainingExpiryWarnings([tech], 0)
                .filter(w => w.isExpired);
            for (const warn of expiredWarnings) {
                // Only flag if this training is actually required by the squawk
                if (squawk.required_training?.some(r =>
                    r.toLowerCase() === warn.trainingName.toLowerCase()
                )) {
                    bottlenecks.push({
                        type:       'training_expired',
                        squawkId:   squawk.squawk_id,
                        squawkDesc: squawk.description,
                        techId:     tech.id,
                        techName:   tech.name,
                        detail:     `${tech.name}'s "${warn.trainingName}" training expired — required for "${squawk.description}"`,
                    });
                }
            }
        }
    }

    return bottlenecks;
}
