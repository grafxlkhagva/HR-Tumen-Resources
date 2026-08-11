'use client';

import { useMemo } from 'react';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';

/**
 * KAM scoping — прототипийн эрхийн загвар:
 * admin (захирал) бүх датаг харна; crmKamName-тэй хэрэглэгч (KAM) зөвхөн өөрийн
 * kam талбартай бичлэгүүдийг KAM-scoped хуудсууд дээр харна.
 * Scoped: dashboard-ын толгой тоо, funnel, tasks, calendar, quotes, companies default шүүлт.
 * Global (санаатай): deal самбар, analytics, reports, performance, year, contacts, carriers.
 */
export function useKamScope(): {
    /** null = бүх дата (захирал/admin эсвэл KAM холбоогүй хэрэглэгч). */
    kamName: string | null;
    isDirector: boolean;
    actor: { uid?: string; name?: string; kam?: string | null };
    isLoading: boolean;
} {
    const { user, employeeProfile, isProfileLoading } = useEmployeeProfile();

    return useMemo(() => {
        const isDirector = employeeProfile?.role === 'admin';
        const kamName =
            !isDirector && employeeProfile?.crmKamName ? employeeProfile.crmKamName : null;
        const name = employeeProfile
            ? [employeeProfile.firstName, employeeProfile.lastName].filter(Boolean).join(' ')
            : undefined;
        return {
            kamName,
            isDirector,
            actor: { uid: user?.uid, name: name || user?.email || undefined, kam: kamName },
            isLoading: isProfileLoading,
        };
    }, [user, employeeProfile, isProfileLoading]);
}
