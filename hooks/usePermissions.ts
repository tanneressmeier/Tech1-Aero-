import { useMemo } from 'react';
import { Technician } from '../types.ts';

/**
 * A custom hook to centralize and manage Role-Based Access Control (RBAC).
 * It provides a consistent way to check user permissions throughout the application.
 * @param currentUser The currently logged-in technician object.
 */
export const usePermissions = (currentUser: Technician | null) => {
    const permissions = useMemo(() => {
        const role = currentUser?.role;
        const certs = currentUser?.certifications || [];

        const isAdmin = role === 'Admin';
        const isLead = role === 'Lead Technician';

        return {
            isAdmin,
            isLead,
            isTechnician: role === 'Technician',
            
            // Permission to see administrative dashboards like Personnel and Data Migration
            canViewAdminDashboards: isAdmin,
            
            // Permission to add new users to the system
            canAddPersonnel: isAdmin,
            
            // Permission to access billing and other administrative settings on a squawk
            canEditBilling: isAdmin || isLead,
            
            // Permission for future use with drag-and-drop task reordering
            canPrioritizeTasks: isAdmin || isLead, 
            
            // Permission to sign off as an inspector
            canSignInspector: isAdmin || isLead,
            
            // Permission to sign the final "Return to Service" (requires IA certification)
            canSignReturnToService: (isAdmin || isLead) && certs.includes('IA'),
        };
    }, [currentUser]);

    return permissions;
};

// Exporting the return type of the hook for cleaner prop typing in components
export type Permissions = ReturnType<typeof usePermissions>;
