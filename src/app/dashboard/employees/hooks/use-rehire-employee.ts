// src/app/dashboard/employees/hooks/use-rehire-employee.ts
'use client';

import * as React from 'react';
import { arrayUnion, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { useAuth, useTenantWrite } from '@/firebase';
import { setEmployeeAuthDisabled } from '@/lib/services/employee-auth-service';
import { useToast } from '@/hooks/use-toast';
import type { Employee } from '@/types';

// Ажлаас гарсан ажилтныг дахин ажилд авах reusable hook.
// `lifecycle-tab-content.tsx`-ийн `handleRehire` логиктой ижил үйлдэл хийнэ:
//   - employees/{id} status → 'active', lifecycleStage → 'recruitment'
//   - terminationDate цэвэрлэж, position/department reset
//   - employmentHistory дотор `rehire` entry нэмэх
//   - Firebase Auth-ийн disabled флагыг false болгож сэргээх
//   - Үлдсэн onboarding/offboarding project-уудыг цэвэрлэх
export function useRehireEmployee() {
    const { firestore, tDoc, tCollection, companyPath } = useTenantWrite();
    const auth = useAuth();
    const { toast } = useToast();
    const [isRehiring, setIsRehiring] = React.useState<string | null>(null);

    const companyId = React.useMemo(() => {
        if (!companyPath) return undefined;
        const parts = companyPath.split('/');
        return parts.length >= 2 ? parts[1] : undefined;
    }, [companyPath]);

    const deleteLifecycleProjects = React.useCallback(async (
        employeeId: string,
        type: 'onboarding' | 'offboarding',
        employeeField: 'onboardingEmployeeId' | 'offboardingEmployeeId',
    ) => {
        if (!firestore) return;
        const q = query(
            tCollection('projects'),
            where('type', '==', type),
            where(employeeField, '==', employeeId),
        );
        const snap = await getDocs(q);
        if (snap.empty) return;

        let batch = writeBatch(firestore);
        let ops = 0;
        const flush = async () => {
            if (ops === 0) return;
            await batch.commit();
            batch = writeBatch(firestore);
            ops = 0;
        };

        for (const pDoc of snap.docs) {
            const tasksSnap = await getDocs(tCollection('projects', pDoc.id, 'tasks'));
            for (const t of tasksSnap.docs) {
                batch.delete(tDoc('projects', pDoc.id, 'tasks', t.id));
                ops += 1;
                if (ops >= 450) await flush();
            }
            batch.delete(tDoc('projects', pDoc.id));
            ops += 1;
            if (ops >= 450) await flush();
        }
        await flush();
    }, [firestore, tCollection, tDoc]);

    const rehire = React.useCallback(async (employee: Employee): Promise<boolean> => {
        if (!firestore || !employee?.id) return false;
        const employeeId = employee.id;
        setIsRehiring(employeeId);

        try {
            const history = (employee as any)?.employmentHistory as any[] | undefined;
            const lastDeparture = Array.isArray(history)
                ? [...history].reverse().find((h) => h?.type === 'departure')
                : null;

            const historyEntry = {
                type: 'rehire',
                date: new Date().toISOString(),
                previousAlumniDate: lastDeparture?.lastWorkingDate || lastDeparture?.date || null,
                previousPosition: employee.jobTitle || null,
                previousDepartmentId: employee.departmentId || null,
                offboardingReason: lastDeparture?.reason || null,
                note: `${new Date().getFullYear()} онд дахин ажилд авсан`,
            };

            await updateDoc(tDoc('employees', employeeId), {
                status: 'active',
                lifecycleStage: 'recruitment',
                loginDisabled: false,
                terminationDate: null,
                positionId: null,
                jobTitle: null,
                departmentId: null,
                employmentHistory: arrayUnion(historyEntry),
                rehireCount: (employee as any).rehireCount ? (employee as any).rehireCount + 1 : 1,
                lastRehireDate: new Date().toISOString(),
            });

            let authRestoreError: string | null = null;
            try {
                await setEmployeeAuthDisabled(auth, employeeId, false, companyId);
            } catch (authErr) {
                console.warn('[rehire] Firebase Auth re-enable failed:', authErr);
                authRestoreError = authErr instanceof Error ? authErr.message : 'Тодорхойгүй алдаа';
            }

            try {
                await deleteLifecycleProjects(employeeId, 'offboarding', 'offboardingEmployeeId');
                await deleteLifecycleProjects(employeeId, 'onboarding', 'onboardingEmployeeId');
            } catch (e) {
                console.warn('[rehire] Failed to delete lifecycle projects:', e);
            }

            if (authRestoreError) {
                toast({
                    variant: 'destructive',
                    title: 'Auth сэргээх амжилтгүй',
                    description: `Ажилтан Firestore-д active болсон боловч Firebase Auth идэвхжээгүй: ${authRestoreError}`,
                });
            } else {
                toast({
                    title: 'Дахин ажилд авах бэлэн',
                    description: 'Ажилтны нэвтрэх эрх сэргэсэн. Одоо ажлын байр руу томилно уу.',
                });
            }
            return true;
        } catch (error) {
            console.error('[rehire] failed:', error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'Дахин ажилд авахад алдаа гарлаа.',
            });
            return false;
        } finally {
            setIsRehiring(null);
        }
    }, [firestore, tDoc, auth, companyId, deleteLifecycleProjects, toast]);

    return { rehire, isRehiring };
}
