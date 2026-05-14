'use client';

/**
 * Single-tenant compatibility shims for code ported from the multi-tenant SaaS
 * test project. Production manai sistem нь нэг байгууллагын дотоод систем тул:
 *   - useTenantRole — employee profile-аас role унш
 *   - useTenant — companyPath (тогтмол), company (profile doc), companyId (stub)
 */
import { doc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';

export type TenantRole = 'super_admin' | 'company_super_admin' | 'admin' | 'employee' | null;

export function useTenantRole(): TenantRole {
    const { employeeProfile } = useEmployeeProfile();
    if (!employeeProfile) return null;
    return (employeeProfile.role ?? 'employee') as TenantRole;
}

/** Single-tenant: фикс companyId буцаана. Тестийн код-ыг ажиллуулахын тулд shim. */
export function useCompanyId(): string {
    return 'default';
}

interface CompanyShape {
    id?: string;
    name?: string;
    logoUrl?: string;
    plan?: string;
    status?: string;
    [key: string]: unknown;
}

interface TenantContextShape {
    companyId: string;
    companyPath: string;
    company: CompanyShape | null;
    role: TenantRole;
    isLoading: boolean;
    isCompanyActive: boolean;
    isInGrace: boolean;
    graceEndsAt: Date | null;
    daysUntilExpiry: number | null;
    /** Subscription feature/quota check — single-tenant-д ямар ч хязгаар байхгүй учир үргэлж true */
    isWithinLimit: (featureKey: string, currentValue: number) => boolean;
}

/**
 * Тестийн файлд `useTenant` нь tenant context-аас company, companyId, role,
 * subscription төлөв авдаг. Манай single-tenant-д companyId='default',
 * companyPath='single-tenant', company=/company/profile doc.
 */
export function useTenant(): TenantContextShape {
    const { firestore } = useFirebase();
    const role = useTenantRole();
    const companyProfileRef = useMemoFirebase(
        ({ firestore: fs }) => (fs ? doc(fs, 'company', 'profile') : null),
        [],
    );
    const { data: company, isLoading } = useDoc<CompanyShape>(companyProfileRef);

    return {
        companyId: 'default',
        companyPath: 'single-tenant',
        company: company || null,
        role,
        isLoading: !firestore || isLoading,
        isCompanyActive: true,
        isInGrace: false,
        graceEndsAt: null,
        daysUntilExpiry: null,
        isWithinLimit: () => true,
    };
}
