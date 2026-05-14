'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useTenantWrite } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Position } from '../types';
import type { Employee } from '@/types';
import {
    fetchPositionPreparationStatus,
    PREP_STATUS_NONE,
    type PreparationStatus,
} from '../positions/hooks/use-position-preparation-status';

export type AppointmentPath = 'prepared' | 'quick';

export interface StartAppointmentArgs {
    position: Position;
    employee?: Employee | null;
    /**
     * 'check' (default) — prep status шалгаж сонголт харуулна.
     * 'force-quick'     — шалгалт алгасч шуурхай томилгоог шууд нээнэ (split button-с ашиглана).
     */
    mode?: 'check' | 'force-quick';
}

export interface AppointmentFlowState {
    appointOpen: boolean;
    appointPosition: Position | null;
    appointEmployee: Employee | null;
    appointPath: AppointmentPath;
    choiceOpen: boolean;
    choicePosition: Position | null;
    choiceEmployee: Employee | null;
    choicePrepStatus: PreparationStatus;
    isChecking: boolean;
}

/**
 * Томилгооны урсгалыг нэгтгэн зохицуулах hook.
 * - hr/page.tsx (drag-drop onConnect + radial onAppoint) болон
 * - positions/[positionId]/page.tsx (split button)
 * хоёулаа энэ нэг hook-оор дамжина — одоогийн үл нийцлийг арилгана.
 */
export function useAppointmentFlow() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { companyPath } = useTenantWrite();
    const { toast } = useToast();

    const [state, setState] = React.useState<AppointmentFlowState>({
        appointOpen: false,
        appointPosition: null,
        appointEmployee: null,
        appointPath: 'prepared',
        choiceOpen: false,
        choicePosition: null,
        choiceEmployee: null,
        choicePrepStatus: PREP_STATUS_NONE,
        isChecking: false,
    });

    const openAppoint = React.useCallback(
        (position: Position, employee: Employee | null, path: AppointmentPath) => {
            setState((s) => ({
                ...s,
                appointOpen: true,
                appointPosition: position,
                appointEmployee: employee,
                appointPath: path,
            }));
        },
        []
    );

    const closeAppoint = React.useCallback((open: boolean) => {
        setState((s) => ({
            ...s,
            appointOpen: open,
            appointEmployee: open ? s.appointEmployee : null,
        }));
    }, []);

    const closeChoice = React.useCallback((open: boolean) => {
        setState((s) => ({ ...s, choiceOpen: open }));
    }, []);

    const startAppointment = React.useCallback(
        async ({ position, employee = null, mode = 'check' }: StartAppointmentArgs) => {
            if (!position) return;
            if ((position.filled ?? 0) >= 1) {
                toast({
                    title: 'Орон тоо дүүрсэн',
                    description: `"${position.title}" ажлын байранд ажилтан томилогдсон байна.`,
                    variant: 'destructive',
                });
                return;
            }

            if (mode === 'force-quick') {
                openAppoint(position, employee, 'quick');
                return;
            }

            if (!firestore || !companyPath) {
                toast({ title: 'Алдаа', description: 'Firestore бэлэн биш байна.', variant: 'destructive' });
                return;
            }

            setState((s) => ({ ...s, isChecking: true }));
            try {
                const prepStatus = await fetchPositionPreparationStatus(firestore, companyPath, position.id);
                if (prepStatus.state === 'completed') {
                    openAppoint(position, employee, 'prepared');
                    return;
                }
                setState((s) => ({
                    ...s,
                    choiceOpen: true,
                    choicePosition: position,
                    choiceEmployee: employee,
                    choicePrepStatus: prepStatus,
                }));
            } catch (e) {
                toast({
                    title: 'Алдаа гарлаа',
                    description: 'Бэлтгэлийн төлөв шалгахад алдаа гарлаа. Дахин оролдоно уу.',
                    variant: 'destructive',
                });
            } finally {
                setState((s) => ({ ...s, isChecking: false }));
            }
        },
        [firestore, companyPath, toast, openAppoint]
    );

    const chooseQuickAppoint = React.useCallback(() => {
        setState((s) => {
            if (!s.choicePosition) return { ...s, choiceOpen: false };
            return {
                ...s,
                choiceOpen: false,
                appointOpen: true,
                appointPosition: s.choicePosition,
                appointEmployee: s.choiceEmployee,
                appointPath: 'quick',
            };
        });
    }, []);

    const choosePreparation = React.useCallback(() => {
        setState((s) => {
            if (!s.choicePosition) return { ...s, choiceOpen: false };
            if (s.choicePrepStatus.state === 'in_progress' && s.choicePrepStatus.prepProjectId) {
                router.push(`/projects/${s.choicePrepStatus.prepProjectId}`);
            } else {
                router.push(`/dashboard/organization/positions/${s.choicePosition.id}`);
            }
            return { ...s, choiceOpen: false };
        });
    }, [router]);

    return {
        state,
        startAppointment,
        closeAppoint,
        closeChoice,
        chooseQuickAppoint,
        choosePreparation,
    };
}
