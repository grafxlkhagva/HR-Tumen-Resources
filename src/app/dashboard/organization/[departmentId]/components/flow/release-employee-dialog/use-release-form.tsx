'use client';

import * as React from 'react';
import * as Sentry from '@sentry/nextjs';
import { useAuth, useCollection, useFirebase, useDoc, useTenantWrite, tenantDoc, tenantCollection } from '@/firebase';
import { setEmployeeAuthDisabled } from '@/lib/services/employee-auth-service';
import {
    cleanupEmployeeSideEffects,
    formatSideEffectsToast,
} from '@/lib/services/employee-side-effects';
import { logAudit } from '@/lib/client/audit-client';
import { query, where, doc, Timestamp, writeBatch, increment, arrayUnion, getDoc, getDocs, deleteDoc, runTransaction } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { generateDocumentContent } from '../../../../../employment-relations/utils';
import { getNextDocumentNumber } from '../../../../../employment-relations/services/document-numbering';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import {
    createOffboardingProjects,
    OffboardingStage,
    OffboardingStageTaskPlan,
} from '@/lib/offboarding-project-creator';
import { deletePositionPreparationProjects } from '@/lib/position-preparation-project-creator';
import {
    checkReleaseEligibility,
    getTransitionalStatusForReleaseAction,
    getFinalStatusForReleaseAction,
    getReleaseDocumentUrl,
    readAndGuardReleaseInTransaction,
    applyReleasePositionWrites,
} from '@/lib/services/employee-release-service';
import {
    ALL_APPOINTMENT_ACTION_IDS,
    findActiveReleaseDocuments,
    findActiveAppointmentDocuments,
} from '@/lib/services/employee-lifecycle-docs';
import type { EmployeeStatus } from '@/types';
import Link from 'next/link';
import {
    ReleaseEmployeeDialogProps,
    EligibilityState,
    TaskPlanByStage,
    ACTION_REQUIREMENTS,
} from './types';
import type { ERTemplate, ERDocument } from './types';
import type { Employee } from './types';

export function useReleaseForm({ open, onOpenChange, employee, position }: ReleaseEmployeeDialogProps) {
    const { firestore, user: firebaseUser } = useFirebase();
    const { tDoc, tCollection, companyPath } = useTenantWrite();
    const auth = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const { employeeProfile: currentUserProfile } = useEmployeeProfile();
    const [step, setStep] = React.useState(1);
    const [selectedActionId, setSelectedActionId] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [customInputValues, setCustomInputValues] = React.useState<Record<string, any>>({});
    const [enableOffboarding, setEnableOffboarding] = React.useState(false);
    const [taskPlanByStage, setTaskPlanByStage] = React.useState<TaskPlanByStage>({});

    const [eligibility, setEligibility] = React.useState<EligibilityState>(null);

    const showActionNotConfiguredToast = React.useCallback((actionName?: string) => {
        toast({
            title: 'Үйлдлийн загвар тохируулаагүй байна',
            description: (
                <div className="space-y-1">
                    <div>
                        {actionName ? `"${actionName}"` : 'Энэ үйлдэл'} дээр "Ашиглах загвар" тохируулаагүй тул үргэлжлүүлэх боломжгүй.
                    </div>
                    <Link className="underline font-medium" href="/dashboard/organization/settings">
                        Тохируулах хэсэг рүү очих (Үйлдэл tab)
                    </Link>
                </div>
            ),
            variant: 'destructive',
        });
    }, [toast]);

    const handleSelectReleaseType = React.useCallback(async (type: { id: string; name: string }) => {
        if (!firestore) return;
        setSelectedActionId(type.id);
        try {
            const actionSnap = await getDoc(tDoc('organization_actions', type.id));
            const cfg = actionSnap.exists() ? (actionSnap.data() as any) : null;
            if (!cfg?.templateId) {
                showActionNotConfiguredToast(type.name);
                return;
            }
            const reqs = ACTION_REQUIREMENTS[type.id];
            if (reqs && reqs.length > 0) {
                const mappings = cfg?.dateMappings || {};
                const missing = reqs.some((r) => !mappings?.[r.key]);
                if (missing) {
                    toast({
                        title: 'Огнооны талбар тохируулаагүй байна',
                        description: (
                            <div className="space-y-1">
                                <div>Шаардлагатай огнооны талбаруудыг "Үйлдэл" тохиргооноос холбоно уу.</div>
                                <Link className="underline font-medium" href="/dashboard/organization/settings">
                                    Тохируулах хэсэг рүү очих (Үйлдэл tab)
                                </Link>
                            </div>
                        ),
                        variant: 'destructive',
                    });
                    return;
                }
            }
        } catch (e) {
            Sentry.captureException(e, { tags: { module: 'organization', action: 'eligibility-init' } });
            toast({
                title: 'Алдаа гарлаа',
                description: 'Үйлдлийн тохиргоо шалгахад алдаа гарлаа.',
                variant: 'destructive',
            });
            return;
        }
        setStep(2);
    }, [firestore, showActionNotConfiguredToast, toast]);

    // Reset state on open
    React.useEffect(() => {
        if (open) {
            setStep(1);
            setSelectedActionId(null);
            setCustomInputValues({});
            setEnableOffboarding(false);
            setTaskPlanByStage({});
            setEligibility(null);
        }
    }, [open]);

    // Idempotency / eligibility check
    React.useEffect(() => {
        if (!open || !firestore || !companyPath || !employee?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const result = await checkReleaseEligibility({
                    firestore,
                    companyPath,
                    employeeId: employee.id,
                    employeeStatus: employee.status as EmployeeStatus,
                });
                if (cancelled) return;
                if (result.allowed) {
                    setEligibility({ allowed: true });
                } else {
                    setEligibility({
                        allowed: false,
                        reason: result.reason,
                        activeReleaseDocId: result.activeReleaseDoc?.id,
                    });
                }
            } catch (e) {
                Sentry.captureException(e, { tags: { module: 'organization', action: 'eligibility-check' } });
                if (!cancelled) {
                    setEligibility({ allowed: true });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, firestore, companyPath, employee?.id, employee?.status]);

    // Fetch System Action Config based on selection
    const actionConfigRef = React.useMemo(() =>
        firestore && companyPath && selectedActionId ? tenantDoc(firestore, companyPath, 'organization_actions', selectedActionId) : null
        , [firestore, companyPath, selectedActionId]);
    const { data: actionConfig } = useDoc<any>(actionConfigRef);

    // Fetch Template if configured
    const templateRef = React.useMemo(() =>
        firestore && companyPath && actionConfig?.templateId ? tenantDoc(firestore, companyPath, 'er_templates', actionConfig.templateId) : null
        , [firestore, companyPath, actionConfig?.templateId]);
    const { data: templateData, isLoading: templateLoading } = useDoc<ERTemplate>(templateRef as any);

    const employeesQuery = React.useMemo(() =>
        firestore && companyPath
            ? query(tenantCollection(firestore, companyPath, 'employees'), where('status', 'in', ['active', 'active_probation', 'active_permanent']))
            : null
        , [firestore, companyPath]);
    const { data: employees } = useCollection<Employee>(employeesQuery as any);

    const offboardingProjectsQuery = React.useMemo(() => {
        if (!firestore || !companyPath || !employee?.id) return null;
        return query(
            tenantCollection(firestore, companyPath, 'projects'),
            where('type', '==', 'offboarding'),
            where('offboardingEmployeeId', '==', employee.id),
        );
    }, [firestore, companyPath, employee?.id]);
    const { data: existingOffboardingProjects } = useCollection<any>(offboardingProjectsQuery as any);

    // Check if employee has pending (unapproved) appointment documents
    const pendingAppointmentDocsQuery = React.useMemo(() => {
        if (!firestore || !companyPath || !employee?.id) return null;
        return query(
            tenantCollection(firestore, companyPath, 'er_documents'),
            where('employeeId', '==', employee.id),
            where('metadata.actionId', 'in', [...ALL_APPOINTMENT_ACTION_IDS])
        );
    }, [firestore, companyPath, employee?.id]);
    const { data: pendingAppointmentDocs } = useCollection<ERDocument>(pendingAppointmentDocsQuery as any);

    const hasPendingAppointment = React.useMemo(() => {
        if (employee?.status !== 'appointing') return false;
        if (!pendingAppointmentDocs?.length) return false;
        return pendingAppointmentDocs.some(doc =>
            !['SIGNED', 'APPROVED', 'ACKNOWLEDGED', 'SENT_TO_EMPLOYEE'].includes(doc.status)
        );
    }, [employee?.status, pendingAppointmentDocs]);

    const offboardingConfigRef = React.useMemo(() => {
        if (!firestore || !companyPath) return null;
        return tenantDoc(firestore, companyPath, 'settings', 'offboarding');
    }, [firestore, companyPath]);
    const { data: offboardingConfig } = useDoc<any>(offboardingConfigRef as any);

    const offboardingStages = React.useMemo(() => {
        return (offboardingConfig?.stages || []) as OffboardingStage[];
    }, [offboardingConfig]);

    const stageCount = offboardingStages.length || 4;
    const stageForStep = React.useMemo(() => {
        const idx = step - 3;
        if (idx < 0) return null;
        return offboardingStages[idx] || null;
    }, [step, offboardingStages]);

    const getReleaseStartDate = React.useCallback((customInputsPayload: Record<string, any>) => {
        const raw = customInputsPayload['releaseDate'] || customInputsPayload['Ажлаас чөлөөлөх огноо'] || null;
        if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        return format(new Date(), 'yyyy-MM-dd');
    }, []);

    const isValidDateString = React.useCallback((val?: string) => {
        return !!val && /^\d{4}-\d{2}-\d{2}$/.test(val);
    }, []);

    const getDefaultDueDateForIndex = React.useCallback((startDateStr: string, idx: number) => {
        const offsets = [7, 14, 21, 30];
        const off = offsets[idx] ?? 30;
        const base = new Date(startDateStr);
        base.setDate(base.getDate() + off);
        return format(base, 'yyyy-MM-dd');
    }, []);

    const setTaskSelected = React.useCallback((stageId: string, taskId: string, selected: boolean, stageIdx: number, startDateStr: string) => {
        setTaskPlanByStage((prev) => {
            const stagePlan = { ...(prev[stageId] || {}) };
            const cur = stagePlan[taskId] || { selected: false };
            const initiatorId = currentUserProfile?.id || firebaseUser?.uid || '';
            stagePlan[taskId] = {
                ...cur,
                selected,
                dueDate: selected ? (cur.dueDate || getDefaultDueDateForIndex(startDateStr, stageIdx)) : cur.dueDate,
                ownerId: selected ? (cur.ownerId || initiatorId) : cur.ownerId,
            };
            return { ...prev, [stageId]: stagePlan };
        });
    }, [currentUserProfile?.id, firebaseUser?.uid, getDefaultDueDateForIndex]);

    const setTaskDueDate = React.useCallback((stageId: string, taskId: string, dueDate: string) => {
        setTaskPlanByStage((prev) => {
            const stagePlan = { ...(prev[stageId] || {}) };
            const cur = stagePlan[taskId] || { selected: true };
            stagePlan[taskId] = { ...cur, dueDate };
            return { ...prev, [stageId]: stagePlan };
        });
    }, []);

    const setTaskOwner = React.useCallback((stageId: string, taskId: string, ownerId: string) => {
        setTaskPlanByStage((prev) => {
            const stagePlan = { ...(prev[stageId] || {}) };
            const cur = stagePlan[taskId] || { selected: true };
            stagePlan[taskId] = { ...cur, ownerId };
            return { ...prev, [stageId]: stagePlan };
        });
    }, []);

    const buildOffboardingOverrides = React.useCallback((): OffboardingStageTaskPlan[] => {
        return (offboardingStages || []).map((stage) => {
            const stagePlan = taskPlanByStage[stage.id] || {};
            const tasks = Object.entries(stagePlan)
                .filter(([, p]) => p.selected)
                .map(([templateTaskId, p]) => ({
                    templateTaskId,
                    dueDate: p.dueDate!,
                    ownerId: p.ownerId!,
                }));
            return { stageId: stage.id, tasks };
        });
    }, [offboardingStages, taskPlanByStage]);

    // Normalize customInputs — apply per-action overrides from organization_actions
    // (label / required / hidden). Hidden inputs are dropped entirely.
    const normalizedCustomInputs = React.useMemo(() => {
        const inputs = templateData?.customInputs || [];
        const overrides = (actionConfig?.customInputOverrides || {}) as Record<
            string,
            { required?: boolean; hidden?: boolean; label?: string }
        >;
        const counts = new Map<string, number>();
        const result: any[] = [];
        inputs.forEach((input: any, index: number) => {
            const baseKey = String(input?.key || '').trim();
            const ov = baseKey ? overrides[baseKey] : undefined;
            if (ov?.hidden) return;

            const prev = counts.get(baseKey) ?? 0;
            counts.set(baseKey, prev + 1);

            const normalizedKey = baseKey
                ? (prev === 0 ? baseKey : `${baseKey}__${prev + 1}`)
                : `__input_${index}`;

            result.push({
                ...input,
                label: ov?.label ?? input.label,
                required: ov?.required ?? !!input.required,
                __baseKey: baseKey,
                __normalizedKey: normalizedKey,
                __index: index,
            });
        });
        return result;
    }, [templateData, actionConfig?.customInputOverrides]);

    // Initialize custom inputs when template takes effect
    React.useEffect(() => {
        if (normalizedCustomInputs.length > 0) {
            const initialValues: Record<string, any> = {};
            normalizedCustomInputs.forEach((input: any) => {
                initialValues[input.__normalizedKey] = '';
            });
            setCustomInputValues(initialValues);
            return;
        }
        setCustomInputValues({});
    }, [normalizedCustomInputs]);

    // Handle canceling pending appointment
    const handleCancelPendingAppointment = async () => {
        if (!firestore || !employee || !position || !firebaseUser) return;

        setIsSubmitting(true);
        try {
            const batch = writeBatch(firestore);
            let deletedDocsCount = 0;

            if (pendingAppointmentDocs?.length) {
                for (const erDoc of pendingAppointmentDocs) {
                    if (!['SIGNED', 'APPROVED', 'ACKNOWLEDGED', 'SENT_TO_EMPLOYEE'].includes(erDoc.status)) {
                        const erDocRef = tDoc('er_documents', erDoc.id);
                        batch.delete(erDocRef);
                        deletedDocsCount++;
                    }
                }
            }

            const onboardingProcessQuery = query(
                tCollection('onboarding_processes'),
                where('employeeId', '==', employee.id)
            );
            const onboardingSnap = await getDocs(onboardingProcessQuery);
            for (const onboardingDoc of onboardingSnap.docs) {
                batch.delete(onboardingDoc.ref);
            }

            const onboardingProjectsQuery = query(
                tCollection('projects'),
                where('type', '==', 'onboarding'),
                where('onboardingEmployeeId', '==', employee.id)
            );
            const projectsSnap = await getDocs(onboardingProjectsQuery);
            for (const projectDoc of projectsSnap.docs) {
                batch.delete(projectDoc.ref);
            }

            const empRef = tDoc('employees', employee.id);
            batch.update(empRef, {
                status: 'active_recruitment',
                positionId: null,
                jobTitle: null,
                departmentId: null,
                updatedAt: Timestamp.now()
            });

            const posRef = tDoc('positions', position.id);
            batch.update(posRef, {
                filled: increment(-1),
                updatedAt: Timestamp.now()
            });

            await batch.commit();

            toast({
                title: 'Томилгоо цуцлагдлаа',
                description: `Ажилтан томилогдохын өмнөх төлөвт буцлаа.${deletedDocsCount > 0 ? ` ${deletedDocsCount} бичиг баримт устгагдлаа.` : ''}`,
            });

            onOpenChange(false);
            router.refresh();
        } catch (err) {
            Sentry.captureException(err, { tags: { module: 'organization', action: 'cancel-appointment' } });
            toast({
                title: 'Алдаа гарлаа',
                description: 'Томилгоо цуцлахад алдаа гарлаа.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRelease = async (opts?: { createOffboarding?: boolean }) => {
        if (!firestore || !employee || !position || !firebaseUser) return;

        if (eligibility && eligibility.allowed === false) {
            toast({
                variant: 'destructive',
                title: 'Чөлөөлөх боломжгүй',
                description: eligibility.reason,
            });
            return;
        }

        if (!selectedActionId || !selectedActionId.startsWith('release_')) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Чөлөөлөх төрөл сонгоогүй байна.' });
            return;
        }

        // Fresh active-doc uniqueness check
        try {
            const [activeRelease, activeAppointment] = await Promise.all([
                findActiveReleaseDocuments(firestore, companyPath, employee.id),
                findActiveAppointmentDocuments(firestore, companyPath, employee.id),
            ]);
            if (activeRelease.length > 0) {
                toast({
                    variant: 'destructive',
                    title: 'Идэвхтэй чөлөөлөх баримт байна',
                    description: `Энэ ажилтанд аль хэдийн дуусаагүй чөлөөлөх баримт байна${
                        activeRelease[0].documentNumber ? ` (${activeRelease[0].documentNumber})` : ''
                    }. Хуудсыг шинэчилнэ үү.`,
                });
                return;
            }
            if (activeAppointment.length > 0) {
                toast({
                    variant: 'destructive',
                    title: 'Идэвхтэй томилгооны баримт байна',
                    description: `Энэ ажилтанд дуусаагүй томилгооны баримт байна${
                        activeAppointment[0].documentNumber ? ` (${activeAppointment[0].documentNumber})` : ''
                    }. Эхлээд тэр процессыг шийднэ үү.`,
                });
                return;
            }
        } catch (guardErr) {
            Sentry.captureException(guardErr, { tags: { module: 'organization', action: 'active-doc-guard' } });
            toast({
                variant: 'destructive',
                title: 'Шалгалт амжилтгүй',
                description: 'Идэвхтэй баримт шалгахад алдаа гарлаа. Дахин оролдоно уу.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Build customInputs payload
            const customInputsPayload: Record<string, any> = {};
            normalizedCustomInputs.forEach((input: any) => {
                const normalizedKey = input.__normalizedKey as string;
                const baseKey = input.__baseKey as string;
                const val = customInputValues?.[normalizedKey] ?? '';
                customInputsPayload[normalizedKey] = val;
                if (baseKey && customInputsPayload[baseKey] === undefined) {
                    customInputsPayload[baseKey] = val;
                }
            });

            if (!employee?.id || !position?.id) {
                throw new Error('Ажилтан эсвэл ажлын байрны мэдээлэл дутуу байна');
            }

            const releaseDateFromInputs: string | null =
                (typeof customInputsPayload['releaseDate'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(customInputsPayload['releaseDate'])
                    ? customInputsPayload['releaseDate']
                    : null) ||
                (typeof customInputsPayload['Ажлаас чөлөөлөх огноо'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(customInputsPayload['Ажлаас чөлөөлөх огноо'])
                    ? customInputsPayload['Ажлаас чөлөөлөх огноо']
                    : null);

            const willCreateERDoc = !!templateData;
            const releaseStatus: EmployeeStatus = willCreateERDoc
                ? getTransitionalStatusForReleaseAction(selectedActionId)
                : getFinalStatusForReleaseAction(selectedActionId);

            const isDirectToTerminal = !willCreateERDoc && releaseStatus === 'terminated';

            const departureHistoryEntry = {
                type: 'departure',
                date: new Date().toISOString(),
                position: position?.title || null,
                positionId: position?.id || null,
                departmentId: position?.departmentId || null,
                reason: selectedActionId || null,
                lastWorkingDate: releaseDateFromInputs || null,
                note: `${new Date().getFullYear()} онд ажлаас гарсан`,
            };

            let documentNumber: string | undefined;
            if (templateData?.documentTypeId) {
                try {
                    documentNumber = await getNextDocumentNumber(firestore, templateData.documentTypeId);
                } catch (numErr) {
                    Sentry.captureException(numErr, { level: 'warning', tags: { module: 'organization', action: 'doc-number-generation' } });
                }
            }

            let docContent = '';
            if (templateData) {
                try {
                    docContent = generateDocumentContent(templateData.content || '', {
                        employee,
                        position,
                        customInputs: customInputsPayload,
                        company: null,
                        system: {
                            date: format(new Date(), 'yyyy-MM-dd'),
                            year: format(new Date(), 'yyyy'),
                            month: format(new Date(), 'MM'),
                            day: format(new Date(), 'dd'),
                            user: firebaseUser?.displayName || 'Системийн хэрэглэгч',
                            ...(documentNumber ? { documentNumber } : {}),
                        },
                    });
                } catch (contentErr) {
                    Sentry.captureException(contentErr, { tags: { module: 'organization', action: 'doc-content-generation' } });
                    docContent = '';
                }
            }

            // Atomic transaction
            const empRef = tDoc('employees', employee.id);
            const posRef = tDoc('positions', position.id);
            const erDocRef = doc(tCollection('er_documents'));

            await runTransaction(firestore, async (transaction) => {
                const { empData: empDataLive, liveStatus, posExists } =
                    await readAndGuardReleaseInTransaction(
                        transaction,
                        empRef,
                        posRef,
                        releaseStatus,
                    );

                // WRITES
                transaction.update(empRef, {
                    positionId: null,
                    jobTitle: null,
                    departmentId: null,
                    status: releaseStatus,
                    ...(isDirectToTerminal
                        ? {
                              terminationDate:
                                  releaseDateFromInputs || new Date().toISOString(),
                              ...((empDataLive.role as string) !== 'super_admin' && empDataLive.role !== 'company_super_admin'
                                  ? { loginDisabled: true }
                                  : {}),
                              lifecycleStage: 'alumni',
                              previousLifecycleStage: empDataLive.lifecycleStage ?? null,
                          }
                        : {}),
                    employmentHistory: arrayUnion(departureHistoryEntry),
                    updatedAt: Timestamp.now(),
                });

                applyReleasePositionWrites(transaction, posRef, posExists);

                if (templateData) {
                    transaction.set(erDocRef, {
                        ...(documentNumber ? { documentNumber } : {}),
                        documentTypeId: templateData.documentTypeId || null,
                        templateId: templateData.id || null,
                        employeeId: employee.id,
                        positionId: position?.id || null,
                        departmentId: position?.departmentId || null,
                        creatorId: firebaseUser.uid,
                        status: 'DRAFT',
                        content: docContent,
                        version: 1,
                        metadata: {
                            employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
                            positionTitle: position?.title || '',
                            templateName: templateData.name || '',
                            actionId: selectedActionId,
                            ...(selectedActionId === 'release_temporary_longterm' ? { leaveType: 'longterm' } :
                                selectedActionId === 'release_temporary_maternity' ? { leaveType: 'maternity' } :
                                selectedActionId === 'release_temporary_childcare' ? { leaveType: 'childcare' } :
                                {}),
                            ...(documentNumber ? { documentNumber } : {}),
                        },
                        customInputs: customInputsPayload,
                        previousState: {
                            // Phase 5.1: snapshotAt нэмэв (release flow нь position.filled-д
                            // гарцгүй тул positionFilledBefore шаардлагагүй).
                            status: liveStatus || null,
                            positionId: position?.id || null,
                            jobTitle: position?.title || null,
                            departmentId: position?.departmentId || null,
                            loginDisabled: !!empDataLive.loginDisabled,
                            snapshotAt: Timestamp.now(),
                        },
                        history: [
                            {
                                action: 'CREATE',
                                actorId: firebaseUser.uid,
                                timestamp: Timestamp.now(),
                                note: documentNumber
                                    ? `Баримт ${documentNumber} үүсгэв (Чөлөөлөх)`
                                    : 'Ажилтан чөлөөлөх үед системээс автоматаар үүсгэв.',
                            },
                        ],
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    });
                }
            });

            // Position сул болсон тул өмнөх "Ажлын байр бэлтгэх" төслүүдийг
            // устгаж, шинэ ажилтан томилохоос өмнө бэлтгэлийг ДАХИН хийхийг
            // албаддаг болгоно. Алдаа гарсан ч release-ийг унагаахгүй —
            // зөвхөн мэдэгдэл + Sentry-д бүртгэнэ.
            try {
                const prepCleanup = await deletePositionPreparationProjects({
                    firestore,
                    companyPath,
                    positionId: position.id,
                });
                if (prepCleanup.deletedProjects > 0) {
                    toast({
                        title: 'Бэлтгэл цэвэрлэгдлээ',
                        description: `Өмнөх бэлтгэл: ${prepCleanup.deletedProjects} төсөл, ${prepCleanup.deletedTasks} таск устгагдлаа. Шинэ томилгооны өмнө ажлын байрыг дахин бэлтгэнэ.`,
                    });
                }
            } catch (prepErr) {
                Sentry.captureException(prepErr, { tags: { module: 'organization', action: 'prep-cleanup-on-release' } });
                toast({
                    variant: 'destructive',
                    title: 'Анхааруулга',
                    description: 'Өмнөх бэлтгэл төслүүдийг устгахад алдаа гарлаа. Гараар устгах шаардлагатай.',
                });
            }

            if (isDirectToTerminal) {
                const releaseCompanyId = companyPath ? companyPath.split('/')[1] : undefined;
                try {
                    await setEmployeeAuthDisabled(auth, employee.id, true, releaseCompanyId);
                } catch (authErr: any) {
                    Sentry.captureException(authErr, { tags: { module: 'organization', action: 'auth-disable' } });
                    toast({
                        variant: 'destructive',
                        title: 'Анхааруулга: Нэвтрэх эрхийг хаах амжилтгүй',
                        description:
                            authErr?.message ||
                            'Ажилтан чөлөөлөгдсөн ч Firebase Auth account-ыг хааж чадсангүй.',
                    });
                }

                try {
                    const sideEffects = await cleanupEmployeeSideEffects({
                        firestore,
                        companyPath,
                        employeeId: employee.id,
                    });
                    const summary = formatSideEffectsToast(sideEffects);
                    if (summary) {
                        toast({ title: 'Холбоотой бичлэг шинэчлэгдлээ', description: summary });
                    }
                    if (sideEffects.errors.length > 0) {
                        Sentry.captureException(new Error('Side effects errors'), { level: 'warning', tags: { module: 'organization', action: 'side-effects' }, extra: { errors: sideEffects.errors } });
                    }
                } catch (sideErr) {
                    Sentry.captureException(sideErr, { tags: { module: 'organization', action: 'side-effects-cleanup' } });
                }
            }

            const shouldCreateOffboarding = !!opts?.createOffboarding;
            let createdProjectId: string | null = null;
            if (shouldCreateOffboarding) {
                if (!offboardingStages?.length) {
                        toast({
                            title: 'Offboarding тохиргоо хоосон байна',
                            description: 'Эхлээд /dashboard/offboarding/settings дээр таскуудаа тохируулна уу.',
                            variant: 'destructive',
                        });
                } else if ((existingOffboardingProjects || []).length > 0) {
                    toast({
                        title: 'Offboarding аль хэдийн үүссэн байна',
                        description: 'Энэ ажилтанд offboarding төслүүд өмнө нь үүссэн байна.',
                        variant: 'destructive',
                    });
                } else {
                    const initiatorId = currentUserProfile?.id || firebaseUser?.uid || '';
                    const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Ажилтан';
                    const startDate = getReleaseStartDate(customInputsPayload);
                    const result = await createOffboardingProjects({
                        firestore,
                        employeeId: employee.id,
                        employeeName,
                        initiatorId,
                        offboardingConfig: offboardingStages,
                        startDate,
                        taskPlan: buildOffboardingOverrides(),
                        alwaysCreateAllStages: true,
                    });
                    createdProjectId = result.projectIds?.[0] || null;
                }
            }

            // Audit log
            const employeeFullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Ажилтан';
            const auditKind = willCreateERDoc ? 'release_started' : 'release_finalized';
            const auditDescription = willCreateERDoc
                ? `Чөлөөлөх процесс эхэллээ: ${employeeFullName} (${selectedActionId})`
                : `Ажилтан чөлөөлөгдөв: ${employeeFullName} → ${releaseStatus}`;
            logAudit({
                action: 'delete',
                resource: 'employee',
                resourceId: employee.id,
                resourceName: employeeFullName,
                description: auditDescription,
                metadata: {
                    kind: auditKind,
                    actionId: selectedActionId,
                    fromStatus: employee.status || null,
                    toStatus: releaseStatus,
                    positionId: position?.id || null,
                    positionTitle: position?.title || null,
                    departmentId: position?.departmentId || null,
                    releaseDate: releaseDateFromInputs || null,
                    createdOffboarding: !!opts?.createOffboarding,
                },
            });

            toast({
                title: "Ажилтан чөлөөлөгдлөө",
                description: templateData
                    ? (shouldCreateOffboarding ? "Баримтын ноорог + Offboarding төслүүд үүслээ." : "Баримтын ноорог үүсгэгдсэн.")
                    : (shouldCreateOffboarding ? "Offboarding төслүүд үүслээ." : "Чөлөөлөх үйлдэл амжилттай.")
            });
            onOpenChange(false);
            if (createdProjectId) {
                router.push(`/projects/${createdProjectId}`);
            }
        } catch (e: any) {
            Sentry.captureException(e, { tags: { module: 'organization', action: 'release-submit' } });
            toast({ variant: 'destructive', title: 'Алдаа гарлаа', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const canProceedCustomInputs = React.useMemo(() => {
        return !normalizedCustomInputs.some((i: any) => i.required && !customInputValues[i.__normalizedKey]);
    }, [normalizedCustomInputs, customInputValues]);

    const startDateForPlanning = React.useMemo(() => {
        const base = (customInputValues?.['releaseDate'] || customInputValues?.['Ажлаас чөлөөлөх огноо']) as string | undefined;
        if (typeof base === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(base)) return base;
        return format(new Date(), 'yyyy-MM-dd');
    }, [customInputValues]);

    const canGoNextOffboardingStage = React.useMemo(() => {
        if (step < 3) return true;
        const stageIdx = step - 3;
        const stage = offboardingStages[stageIdx];
        if (!stage) return true;
        const stagePlan = taskPlanByStage[stage.id] || {};
        const selected = Object.entries(stagePlan).filter(([, p]) => p.selected);
        return selected.every(([, p]) => isValidDateString(p.dueDate) && !!p.ownerId);
    }, [step, offboardingStages, taskPlanByStage, isValidDateString]);

    return {
        // State
        step,
        setStep,
        selectedActionId,
        isSubmitting,
        customInputValues,
        setCustomInputValues,
        enableOffboarding,
        setEnableOffboarding,
        taskPlanByStage,
        eligibility,

        // Data
        templateData,
        templateLoading,
        employees,
        existingOffboardingProjects,
        hasPendingAppointment,
        offboardingStages,
        stageCount,
        stageForStep,
        normalizedCustomInputs,
        canProceedCustomInputs,
        startDateForPlanning,
        canGoNextOffboardingStage,

        // Actions
        handleSelectReleaseType,
        handleCancelPendingAppointment,
        handleRelease,
        setTaskSelected,
        setTaskDueDate,
        setTaskOwner,

        // Utils
        toast,
    };
}
