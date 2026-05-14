'use client';

import * as React from 'react';
import { filterSystemUsers } from '@/lib/employee-utils';
import { Employee, EmployeeStatus } from '@/types';
import { useCollection, useFirebase, useDoc, useTenantWrite, tenantDoc, tenantCollection } from '@/firebase';
import { query, where, doc, getDoc, getDocs, Timestamp, runTransaction } from 'firebase/firestore';
import {
    checkAppointmentEligibility,
    readAndGuardAppointmentInTransaction,
    applyAppointmentPositionWrites,
} from '@/lib/services/employee-appointment-service';
import {
    findActiveAppointmentDocuments,
    findActiveReleaseDocuments,
} from '@/lib/services/employee-lifecycle-docs';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { createOnboardingProjects, OnboardingStage, OnboardingStageTaskPlan } from '@/lib/onboarding-project-creator';
import { useRouter } from 'next/navigation';
import { Position } from '../../../../types';
import { ERTemplate } from '../../../../../employment-relations/types';
import { generateDocumentContent } from '../../../../../employment-relations/utils';
import { getNextDocumentNumber } from '../../../../../employment-relations/services/document-numbering';
import { addDays, addMonths, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { logAudit } from '@/lib/client/audit-client';
import * as Sentry from '@sentry/nextjs';
import {
    FullPositionData,
    WIZARD_STEPS,
    OnboardingStageId,
    ONBOARDING_STAGE_ORDER,
    ONBOARDING_STAGE_DUE_OFFSETS,
    ACTION_REQUIREMENTS,
    EligibilityState,
    OffboardingStatus,
    OnboardingTaskPlanState,
} from './types';

interface UseAppointmentFormOptions {
    open: boolean;
    position: Position | null;
    initialEmployee?: Employee | null;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (employeeId: string) => void;
    appointmentPath?: 'prepared' | 'quick';
}

export function useAppointmentForm({
    open,
    position,
    initialEmployee,
    onOpenChange,
    onSuccess,
    appointmentPath = 'prepared',
}: UseAppointmentFormOptions) {
    const { firestore, user: firebaseUser } = useFirebase();
    const { tDoc, tCollection, companyPath } = useTenantWrite();
    const { employeeProfile: currentUserProfile } = useEmployeeProfile();
    const { toast } = useToast();
    const router = useRouter();

    // Fetch full position data from Firestore (position prop might be incomplete)
    const fullPositionRef = React.useMemo(() =>
        firestore && companyPath && position?.id && open ? tenantDoc(firestore, companyPath, 'positions', position.id) : null
        , [firestore, companyPath, position?.id, open]);
    const { data: fullPosition, isLoading: isPositionLoading } = useDoc<FullPositionData>(fullPositionRef as any);

    // Use full position data if available, fallback to prop
    const positionData = fullPosition || position;

    // Basic states
    const [search, setSearch] = React.useState('');
    const [step, setStep] = React.useState(WIZARD_STEPS.EMPLOYEE_SELECT);
    const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [offboardingStatus, setOffboardingStatus] = React.useState<OffboardingStatus>('none');

    // Cross-workflow eligibility guard
    const [eligibility, setEligibility] = React.useState<EligibilityState | null>(null);

    // Wizard selection states
    const [selectedActionId, setSelectedActionId] = React.useState<string | null>(null);
    const [selectedSalaryStepIndex, setSelectedSalaryStepIndex] = React.useState<number>(0);
    const [selectedIncentives, setSelectedIncentives] = React.useState<number[]>([]);
    const [selectedAllowances, setSelectedAllowances] = React.useState<number[]>([]);
    const [enableOnboarding, setEnableOnboarding] = React.useState<boolean | null>(null);
    const [onboardingTaskPlan, setOnboardingTaskPlan] = React.useState<OnboardingTaskPlanState>({});
    const [customInputValues, setCustomInputValues] = React.useState<Record<string, any>>({});

    const onboardingConfigRef = React.useMemo(() =>
        firestore && companyPath && open ? tenantDoc(firestore, companyPath, 'settings', 'onboarding') : null
        , [firestore, companyPath, open]);
    const { data: onboardingConfig } = useDoc<any>(onboardingConfigRef as any);
    const onboardingStages = React.useMemo(() => ((onboardingConfig?.stages || []) as OnboardingStage[]), [onboardingConfig]);

    const hasActiveOffboarding = React.useCallback(async (empId: string) => {
        if (!firestore || !empId) return false;
        try {
            const snap = await getDocs(query(
                tCollection('projects'),
                where('type', '==', 'offboarding'),
                where('offboardingEmployeeId', '==', empId)
            ));
            return !snap.empty;
        } catch (e) {
            Sentry.captureException(e, { level: 'warning', tags: { module: 'organization', action: 'offboarding-projects-check' } });
            return false;
        }
    }, [firestore, tCollection]);

    const isValidDateString = React.useCallback((val?: string) => !!val && /^\d{4}-\d{2}-\d{2}$/.test(val), []);
    const getDefaultDueDateForStage = React.useCallback((stageId: OnboardingStageId) => {
        const start = new Date();
        return format(addDays(start, ONBOARDING_STAGE_DUE_OFFSETS[stageId] ?? 30), 'yyyy-MM-dd');
    }, []);

    const getStageConfig = React.useCallback((stageId: OnboardingStageId) => onboardingStages.find(s => s.id === stageId), [onboardingStages]);

    // Fetch all active employees
    const employeesQuery = React.useMemo(() => {
        if (!firestore || !companyPath) return null;
        return query(
            tenantCollection(firestore, companyPath, 'employees'),
            where('status', 'in', ['active', 'active_probation', 'active_permanent', 'active_recruitment'])
        );
    }, [firestore, companyPath]);

    const { data: allEmployees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);

    // Fetch System Appointment Action Config
    const actionConfigRef = React.useMemo(() =>
        firestore && companyPath && selectedActionId ? tenantDoc(firestore, companyPath, 'organization_actions', selectedActionId) : null
        , [firestore, companyPath, selectedActionId]);
    const { data: appointmentAction } = useDoc<any>(actionConfigRef);

    // Fetch Template if configured
    const templateRef = React.useMemo(() =>
        firestore && companyPath && appointmentAction?.templateId ? tenantDoc(firestore, companyPath, 'er_templates', appointmentAction.templateId) : null
        , [firestore, companyPath, appointmentAction?.templateId]);
    const { data: templateData, isLoading: templateLoading } = useDoc<ERTemplate>(templateRef as any);

    // Stabilize customInputs dependency using JSON signature
    const customInputsJson = React.useMemo(() => {
        try {
            return JSON.stringify(templateData?.customInputs || []);
        } catch {
            return '[]';
        }
    }, [templateData?.customInputs]);

    // Normalize customInputs to guarantee unique keys in UI/state
    const normalizedCustomInputs = React.useMemo(() => {
        let inputs: any[];
        try {
            inputs = JSON.parse(customInputsJson);
        } catch {
            inputs = [];
        }
        const counts = new Map<string, number>();
        return inputs.map((input: any, index: number) => {
            const baseKey = String(input?.key || '').trim();
            const prev = counts.get(baseKey) ?? 0;
            counts.set(baseKey, prev + 1);

            const normalizedKey = baseKey
                ? (prev === 0 ? baseKey : `${baseKey}__${prev + 1}`)
                : `__input_${index}`;

            return {
                ...input,
                __baseKey: baseKey,
                __normalizedKey: normalizedKey,
                __index: index,
            };
        });
    }, [customInputsJson]);

    const assignableEmployees = React.useMemo(() => {
        if (!allEmployees) return [];
        const tenantEmployees = filterSystemUsers(allEmployees as any[]) as typeof allEmployees;
        return tenantEmployees.filter(emp => !emp.positionId || emp.positionId === '');
    }, [allEmployees]);

    const filteredEmployees = React.useMemo(() => {
        return assignableEmployees.filter(emp =>
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            emp.employeeCode?.toLowerCase().includes(search.toLowerCase())
        );
    }, [assignableEmployees, search]);

    // Normalize salary steps
    const normalizeSalarySteps = React.useCallback((pos: Position | FullPositionData | null) => {
        if (!pos?.salarySteps) return [];
        if (pos.salarySteps.items && Array.isArray(pos.salarySteps.items)) {
            return pos.salarySteps.items;
        }
        const oldValues = (pos.salarySteps as any)?.values;
        if (oldValues && Array.isArray(oldValues)) {
            return oldValues.map((v: number, i: number) => ({
                name: `Шатлал ${i + 1}`,
                value: v
            }));
        }
        return [];
    }, []);

    const salarySteps = React.useMemo(() => normalizeSalarySteps(positionData), [positionData, normalizeSalarySteps]);
    const incentives = positionData?.incentives || [];
    const allowances = positionData?.allowances || [];

    // Calculate total steps based on position data
    const getMaxSteps = () => {
        let max = WIZARD_STEPS.APPOINTMENT_TYPE;
        if (salarySteps.length > 0) max = WIZARD_STEPS.SALARY_STEP;
        if (incentives.length > 0) max = WIZARD_STEPS.INCENTIVES;
        if (allowances.length > 0) max = WIZARD_STEPS.ALLOWANCES;
        max = WIZARD_STEPS.ONBOARDING;
        if (enableOnboarding) max = WIZARD_STEPS.ONBOARDING_PRODUCTIVITY;
        if (templateData?.customInputs?.length) max = WIZARD_STEPS.DOCUMENT_INPUTS;
        return max;
    };

    // Initialize custom inputs when template loads
    const expectedCustomInputKeys = React.useMemo(
        () => normalizedCustomInputs.map((i: any) => String(i.__normalizedKey)),
        [normalizedCustomInputs]
    );
    const expectedCustomInputKeysSig = React.useMemo(() => expectedCustomInputKeys.join('|'), [expectedCustomInputKeys]);
    const customInputsTemplateId = String(appointmentAction?.templateId || '');

    React.useEffect(() => {
        const keys = expectedCustomInputKeysSig ? expectedCustomInputKeysSig.split('|').filter(Boolean) : [];

        if (!customInputsTemplateId || keys.length === 0) {
            setCustomInputValues((prev) => (Object.keys(prev || {}).length === 0 ? prev : {}));
            return;
        }

        setCustomInputValues((prev) => {
            const current = prev || {};
            let changed = false;
            const next: Record<string, any> = { ...current };
            for (const key of keys) {
                if (!(key in next)) {
                    next[key] = '';
                    changed = true;
                }
            }
            return changed ? next : current;
        });
    }, [customInputsTemplateId, expectedCustomInputKeysSig]);

    // Compute probation auto-fill keys as STABLE primitives
    const probationAutoFillKeys = React.useMemo(() => {
        if (selectedActionId !== 'appointment_probation') return null;
        if (!normalizedCustomInputs || normalizedCustomInputs.length === 0) return null;

        const startInput = normalizedCustomInputs.find((i: any) => {
            const label = String(i.label || '').toLowerCase();
            return label.includes('томилох огноо') || label.includes('эхлэх огноо') || label.includes('ажилд орсон');
        });

        const endInput = normalizedCustomInputs.find((i: any) => {
            const label = String(i.label || '').toLowerCase();
            return label.includes('дуусах огноо') || label.includes('дуусгавар');
        });

        const durationInput = normalizedCustomInputs.find((i: any) => {
            const label = String(i.label || '').toLowerCase();
            return label.includes('туршилтын хугацаа') || label.includes('хугацаа');
        });

        if (!startInput || !endInput || !durationInput) {
            if (!appointmentAction?.dateMappings) return null;
            const mappings = appointmentAction.dateMappings as Record<string, string>;
            const startBaseKey = String(mappings.probationStartDate || '').trim();
            const endBaseKey = String(mappings.probationEndDate || '').trim();
            if (!startBaseKey || !endBaseKey) return null;

            const fallbackStart = startInput || normalizedCustomInputs.find((i: any) => i.__baseKey === startBaseKey || i.__normalizedKey === startBaseKey);
            const fallbackEnd = endInput || normalizedCustomInputs.find((i: any) => i.__baseKey === endBaseKey || i.__normalizedKey === endBaseKey);
            const fallbackDuration = durationInput ||
                normalizedCustomInputs.find((i: any) => ['probationDuration', 'probationPeriod', 'probationMonths', 'probationMonth'].includes(String(i.__baseKey || '')));

            if (!fallbackStart || !fallbackEnd || !fallbackDuration) return null;

            const hint = `${fallbackDuration.label || ''} ${fallbackDuration.description || ''} ${fallbackDuration.__baseKey || ''}`.toLowerCase();
            const isDays = hint.includes('өдөр') || hint.includes('day');
            return `${fallbackStart.__normalizedKey}|${fallbackEnd.__normalizedKey}|${fallbackDuration.__normalizedKey}|${isDays ? '1' : '0'}`;
        }

        const hint = `${durationInput.label || ''} ${durationInput.description || ''} ${durationInput.__baseKey || ''}`.toLowerCase();
        const isDays = hint.includes('өдөр') || hint.includes('day');

        return `${startInput.__normalizedKey}|${endInput.__normalizedKey}|${durationInput.__normalizedKey}|${isDays ? '1' : '0'}`;
    }, [appointmentAction?.dateMappings, normalizedCustomInputs, selectedActionId]);

    const probationStartKey = probationAutoFillKeys ? probationAutoFillKeys.split('|')[0] : '';
    const probationEndKey = probationAutoFillKeys ? probationAutoFillKeys.split('|')[1] : '';
    const probationDurationKey = probationAutoFillKeys ? probationAutoFillKeys.split('|')[2] : '';
    const probationIsDays = probationAutoFillKeys ? probationAutoFillKeys.split('|')[3] === '1' : false;

    const probationStartVal = probationStartKey ? String(customInputValues?.[probationStartKey] || '').trim() : '';
    const probationDurationVal = probationDurationKey ? String(customInputValues?.[probationDurationKey] || '').trim() : '';
    const probationCurrentEndVal = probationEndKey ? String(customInputValues?.[probationEndKey] || '').trim() : '';

    // Handler for custom input changes - includes probation end date auto-fill logic
    const handleCustomInputChange = React.useCallback((key: string, value: any) => {
        setCustomInputValues(prev => {
            const next = { ...prev, [key]: value };

            if (probationAutoFillKeys && probationStartKey && probationEndKey && probationDurationKey) {
                const isStartOrDurationChange = key === probationStartKey || key === probationDurationKey;

                if (isStartOrDurationChange) {
                    const startVal = String(key === probationStartKey ? value : next[probationStartKey] || '').trim();
                    const durationVal = String(key === probationDurationKey ? value : next[probationDurationKey] || '').trim();

                    if (/^\d{4}-\d{2}-\d{2}$/.test(startVal)) {
                        const durationNum = Number(String(durationVal).replace(/[^\d.]/g, ''));
                        if (Number.isFinite(durationNum) && durationNum > 0) {
                            const [y, m, d] = startVal.split('-').map((p) => Number(p));
                            if (y && m && d) {
                                const startDate = new Date(y, m - 1, d, 12, 0, 0, 0);
                                const computedEnd = probationIsDays
                                    ? addDays(startDate, Math.round(durationNum))
                                    : addMonths(startDate, Math.round(durationNum));
                                next[probationEndKey] = format(computedEnd, 'yyyy-MM-dd');
                            }
                        }
                    }
                }
            }

            return next;
        });
    }, [probationAutoFillKeys, probationStartKey, probationEndKey, probationDurationKey, probationIsDays]);

    // Handle initial employee from dashboard drag & drop
    React.useEffect(() => {
        if (open && initialEmployee) {
            setSelectedEmployee(initialEmployee);
            setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
        }
    }, [open, initialEmployee]);

    // Check for active offboarding
    React.useEffect(() => {
        const checkOffboarding = async () => {
            if (!firestore || !initialEmployee?.id || !open) return;

            setOffboardingStatus('checking');
            try {
                const active = await hasActiveOffboarding(initialEmployee.id);
                if (active) {
                    setOffboardingStatus('active');
                    toast({
                        title: 'Анхааруулга: Offboarding идэвхтэй',
                        description: `${initialEmployee.firstName} ${initialEmployee.lastName} ажилтанд ажилаас чөлөөлөх хөтөлбөр явагдаж байна.`,
                        variant: 'destructive',
                    });
                    return;
                }
                setOffboardingStatus('none');
            } catch (error) {
                Sentry.captureException(error, { tags: { module: 'organization', action: 'offboarding-check' } });
                setOffboardingStatus('none');
            }
        };
        checkOffboarding();
    }, [firestore, initialEmployee?.id, open, toast, hasActiveOffboarding]);

    // Reset on close
    React.useEffect(() => {
        if (!open) {
            setStep(WIZARD_STEPS.EMPLOYEE_SELECT);
            setSelectedEmployee(null);
            setSelectedActionId(null);
            setSelectedSalaryStepIndex(position?.salarySteps?.activeIndex || 0);
            setSelectedIncentives([]);
            setSelectedAllowances([]);
            setEnableOnboarding(null);
            setOnboardingTaskPlan({});
            setSearch('');
            setCustomInputValues({});
            setOffboardingStatus('none');
            setEligibility(null);
        }
    }, [open, position?.salarySteps?.activeIndex]);

    // Cross-workflow eligibility check
    React.useEffect(() => {
        if (!open || !firestore || !companyPath || !selectedEmployee?.id) {
            setEligibility(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const result = await checkAppointmentEligibility({
                    firestore,
                    companyPath,
                    employeeId: selectedEmployee.id,
                    employeeStatus: selectedEmployee.status as EmployeeStatus,
                });
                if (cancelled) return;
                if (result.allowed) {
                    setEligibility({ allowed: true });
                } else {
                    setEligibility({
                        allowed: false,
                        reason: result.reason,
                        activeAppointmentDocId: result.activeAppointmentDoc?.id,
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
    }, [open, firestore, companyPath, selectedEmployee?.id, selectedEmployee?.status]);

    // Initialize default salary step from position
    React.useEffect(() => {
        if (positionData?.salarySteps?.activeIndex !== undefined && salarySteps.length > 0) {
            const activeIdx = Math.min(positionData.salarySteps.activeIndex, salarySteps.length - 1);
            setSelectedSalaryStepIndex(activeIdx);
        }
    }, [positionData?.salarySteps?.activeIndex, salarySteps.length]);

    const handleEmployeeSelect = async (employee: Employee) => {
        if (!firestore) return;

        try {
            const active = await hasActiveOffboarding(employee.id);
            if (active) {
                toast({
                    title: 'Анхааруулга: Offboarding идэвхтэй',
                    description: `${employee.firstName} ${employee.lastName} ажилтанд ажилаас чөлөөлөх хөтөлбөр явагдаж байна.`,
                    variant: 'destructive',
                });
                setOffboardingStatus('active');
                return;
            }
            setOffboardingStatus('none');
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'organization', action: 'offboarding-check-2' } });
            setOffboardingStatus('none');
        }

        setSelectedEmployee(employee);
        setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
    };

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

    // Navigate to next step based on available data
    function goToNextStep(currentStep: number) {
        if (currentStep === WIZARD_STEPS.APPOINTMENT_TYPE) {
            if (salarySteps.length > 0) {
                setStep(WIZARD_STEPS.SALARY_STEP);
            } else if (incentives.length > 0) {
                setStep(WIZARD_STEPS.INCENTIVES);
            } else if (allowances.length > 0) {
                setStep(WIZARD_STEPS.ALLOWANCES);
            } else {
                setStep(WIZARD_STEPS.ONBOARDING);
            }
        } else if (currentStep === WIZARD_STEPS.SALARY_STEP) {
            if (incentives.length > 0) {
                setStep(WIZARD_STEPS.INCENTIVES);
            } else if (allowances.length > 0) {
                setStep(WIZARD_STEPS.ALLOWANCES);
            } else {
                setStep(WIZARD_STEPS.ONBOARDING);
            }
        } else if (currentStep === WIZARD_STEPS.INCENTIVES) {
            if (allowances.length > 0) {
                setStep(WIZARD_STEPS.ALLOWANCES);
            } else {
                setStep(WIZARD_STEPS.ONBOARDING);
            }
        } else if (currentStep === WIZARD_STEPS.ALLOWANCES) {
            setStep(WIZARD_STEPS.ONBOARDING);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING) {
            if (enableOnboarding === true) {
                setStep(WIZARD_STEPS.ONBOARDING_PRE);
                return;
            }
            if (templateData?.customInputs?.length) {
                setStep(WIZARD_STEPS.DOCUMENT_INPUTS);
            } else {
                handleStartProcess();
            }
        } else if (currentStep === WIZARD_STEPS.ONBOARDING_PRE) {
            setStep(WIZARD_STEPS.ONBOARDING_ORIENTATION);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING_ORIENTATION) {
            setStep(WIZARD_STEPS.ONBOARDING_INTEGRATION);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING_INTEGRATION) {
            setStep(WIZARD_STEPS.ONBOARDING_PRODUCTIVITY);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING_PRODUCTIVITY) {
            if (templateData?.customInputs?.length) {
                setStep(WIZARD_STEPS.DOCUMENT_INPUTS);
            } else {
                handleStartProcess();
            }
        }
    }

    // Navigate to previous step
    const goToPreviousStep = (currentStep: number) => {
        if (currentStep === WIZARD_STEPS.DOCUMENT_INPUTS) {
            if (enableOnboarding) {
                setStep(WIZARD_STEPS.ONBOARDING_PRODUCTIVITY);
            } else {
                setStep(WIZARD_STEPS.ONBOARDING);
            }
        } else if (currentStep === WIZARD_STEPS.ONBOARDING_PRODUCTIVITY) {
            setStep(WIZARD_STEPS.ONBOARDING_INTEGRATION);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING_INTEGRATION) {
            setStep(WIZARD_STEPS.ONBOARDING_ORIENTATION);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING_ORIENTATION) {
            setStep(WIZARD_STEPS.ONBOARDING_PRE);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING_PRE) {
            setStep(WIZARD_STEPS.ONBOARDING);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING) {
            if (allowances.length > 0) {
                setStep(WIZARD_STEPS.ALLOWANCES);
            } else if (incentives.length > 0) {
                setStep(WIZARD_STEPS.INCENTIVES);
            } else if (salarySteps.length > 0) {
                setStep(WIZARD_STEPS.SALARY_STEP);
            } else {
                setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
            }
        } else if (currentStep === WIZARD_STEPS.ALLOWANCES) {
            if (incentives.length > 0) {
                setStep(WIZARD_STEPS.INCENTIVES);
            } else if (salarySteps.length > 0) {
                setStep(WIZARD_STEPS.SALARY_STEP);
            } else {
                setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
            }
        } else if (currentStep === WIZARD_STEPS.INCENTIVES) {
            if (salarySteps.length > 0) {
                setStep(WIZARD_STEPS.SALARY_STEP);
            } else {
                setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
            }
        } else if (currentStep === WIZARD_STEPS.SALARY_STEP) {
            setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
        } else if (currentStep === WIZARD_STEPS.APPOINTMENT_TYPE) {
            setStep(WIZARD_STEPS.EMPLOYEE_SELECT);
        }
    };

    const handleSelectAppointmentType = React.useCallback(async (type: { id: string; name: string }) => {
        if (!firestore) return;
        if (offboardingStatus === 'active' || offboardingStatus === 'checking') return;
        if (eligibility && eligibility.allowed === false) {
            toast({
                title: 'Томилгоо эхлүүлэх боломжгүй',
                description: eligibility.reason,
                variant: 'destructive',
            });
            return;
        }

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
            Sentry.captureException(e, { tags: { module: 'organization', action: 'step-validation' } });
            toast({
                title: 'Алдаа гарлаа',
                description: 'Үйлдлийн тохиргоо шалгахад алдаа гарлаа.',
                variant: 'destructive',
            });
            return;
        }

        goToNextStep(WIZARD_STEPS.APPOINTMENT_TYPE);
    }, [firestore, offboardingStatus, eligibility, showActionNotConfiguredToast, toast, goToNextStep]);

    const handleStartProcess = async () => {
        if (!firestore || !position || !selectedEmployee || !firebaseUser) {
            return;
        }

        if (!selectedEmployee?.id || !position?.id) {
            toast({
                title: 'Алдаа',
                description: 'Ажилтан эсвэл ажлын байрны мэдээлэл дутуу байна.',
                variant: 'destructive'
            });
            return;
        }

        // Fresh active-doc uniqueness check (submit-time)
        if (!companyPath) {
            toast({
                title: 'Алдаа',
                description: 'Компанийн контекст олдсонгүй. Дахин нэвтэрнэ үү.',
                variant: 'destructive',
            });
            return;
        }
        try {
            const [activeAppointment, activeRelease] = await Promise.all([
                findActiveAppointmentDocuments(firestore, companyPath, selectedEmployee.id),
                findActiveReleaseDocuments(firestore, companyPath, selectedEmployee.id),
            ]);
            if (activeAppointment.length > 0) {
                toast({
                    title: 'Томилох боломжгүй',
                    description: 'Энэ ажилтанд аль хэдийн идэвхтэй томилгооны процесс байна. Эхлээд тэр процессыг дуусгана уу.',
                    variant: 'destructive',
                });
                return;
            }
            if (activeRelease.length > 0) {
                toast({
                    title: 'Томилох боломжгүй',
                    description: 'Энэ ажилтанд идэвхтэй чөлөөлөлтийн процесс байна. Тэр процесс дуусах буюу цуцлагдах хүртэл томилох боломжгүй.',
                    variant: 'destructive',
                });
                return;
            }
        } catch (guardErr) {
            Sentry.captureException(guardErr, { tags: { module: 'organization', action: 'active-doc-guard' } });
            toast({
                title: 'Шалгалт амжилтгүй',
                description: 'Идэвхтэй процессыг шалгахад алдаа гарлаа. Дахин оролдоно уу.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Build customInputs payload with unique keys
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

            // Double-check offboarding status
            try {
                const active = await hasActiveOffboarding(selectedEmployee.id);
                if (active) {
                    toast({
                        title: 'Томилох боломжгүй',
                        description: 'Тухайн ажилтанд offboarding хөтөлбөр идэвхтэй байгаа тул томилох боломжгүй.',
                        variant: 'destructive'
                    });
                    setIsSubmitting(false);
                    return;
                }
            } catch (e) {
                Sentry.captureException(e, { level: 'warning', tags: { module: 'organization', action: 'offboarding-final-check' } });
            }

            // Pre-transaction: non-conflicting reads
            let companyProfile = null;
            try {
                const companySnap = await getDocs(tCollection('company_profile'));
                companyProfile = !companySnap.empty ? companySnap.docs[0].data() : null;
            } catch (e) {
                Sentry.captureException(e, { level: 'warning', tags: { module: 'organization', action: 'fetch-company-profile' } });
            }

            let deptData = null;
            if (position.departmentId) {
                try {
                    const deptSnap = await getDoc(tDoc('departments', position.departmentId));
                    deptData = deptSnap.exists() ? { id: deptSnap.id, ...deptSnap.data() } : null;
                } catch (e) {
                    Sentry.captureException(e, { level: 'warning', tags: { module: 'organization', action: 'fetch-department' } });
                }
            }

            const selectedSalary = salarySteps[selectedSalaryStepIndex];
            const selectedIncentivesList = selectedIncentives.map(i => incentives[i]);
            const selectedAllowancesList = selectedAllowances.map(i => allowances[i]);

            let documentNumber: string | undefined;
            if (templateData?.documentTypeId) {
                try {
                    documentNumber = await getNextDocumentNumber(firestore, templateData.documentTypeId);
                } catch (numErr) {
                    Sentry.captureException(numErr, { level: 'warning', tags: { module: 'organization', action: 'doc-number-generation' } });
                }
            }

            let content = '';
            if (templateData) {
                try {
                    content = generateDocumentContent(templateData.content || '', {
                        employee: selectedEmployee,
                        department: deptData,
                        position: position,
                        company: companyProfile,
                        system: {
                            date: format(new Date(), 'yyyy-MM-dd'),
                            year: format(new Date(), 'yyyy'),
                            month: format(new Date(), 'MM'),
                            day: format(new Date(), 'dd'),
                            user: firebaseUser?.displayName || 'Системийн хэрэглэгч',
                            ...(documentNumber ? { documentNumber } : {}),
                        },
                        customInputs: customInputsPayload,
                        appointment: {
                            salaryStep: selectedSalary,
                            incentives: selectedIncentivesList,
                            allowances: selectedAllowancesList,
                        }
                    });
                } catch (e) {
                    Sentry.captureException(e, { tags: { module: 'organization', action: 'doc-content-generation' } });
                    content = '';
                }
            }

            // Atomic transaction
            const posRef = tDoc('positions', position.id);
            const empRef = tDoc('employees', selectedEmployee.id);
            const erDocRef = doc(tCollection('er_documents'));

            try {
                await runTransaction(firestore, async (transaction) => {
                    const ctx = await readAndGuardAppointmentInTransaction(
                        transaction,
                        empRef,
                        posRef,
                    );
                    const empData = ctx.empData as any;

                    // Phase 5.1: position.filled-ийг +1 хийхийн ӨМНӨХ утгыг snapshot-д
                    // хадгалж, rollback-т concurrent write race detection-д ашиглана.
                    const positionFilledBefore =
                        typeof ctx.posData.filled === 'number' ? ctx.posData.filled : 0;

                    applyAppointmentPositionWrites(transaction, ctx, posRef);

                    transaction.update(empRef, {
                        positionId: position?.id || null,
                        jobTitle: position?.title || null,
                        departmentId: position?.departmentId || null,
                        status: 'appointing',
                        appointedCompensation: {
                            salaryStepIndex: selectedSalaryStepIndex,
                            salary: selectedSalary?.value || 0,
                            salaryStepName: selectedSalary?.name || '',
                            incentiveIndices: selectedIncentives,
                            allowanceIndices: selectedAllowances,
                        },
                        updatedAt: Timestamp.now(),
                    });

                    if (templateData) {
                        // Phase 5.1: positionFilledBefore + snapshotAt нэмэв.
                        const appointmentPreviousState = {
                            status: empData.status ?? null,
                            positionId: empData.positionId ?? null,
                            jobTitle: empData.jobTitle ?? null,
                            departmentId: empData.departmentId ?? null,
                            lifecycleStage: empData.lifecycleStage ?? null,
                            loginDisabled: !!empData.loginDisabled,
                            appointedCompensation: empData.appointedCompensation ?? null,
                            positionFilledBefore,
                            snapshotAt: Timestamp.now(),
                        };

                        transaction.set(erDocRef, {
                            ...(documentNumber ? { documentNumber } : {}),
                            documentTypeId: templateData?.documentTypeId || null,
                            templateId: templateData?.id || null,
                            employeeId: selectedEmployee.id,
                            departmentId: position?.departmentId || null,
                            positionId: position.id,
                            creatorId: firebaseUser?.uid || null,
                            status: 'DRAFT',
                            content: content,
                            version: 1,
                            printSettings: templateData?.printSettings || null,
                            customInputs: customInputsPayload,
                            previousState: appointmentPreviousState,
                            appointmentData: {
                                actionId: selectedActionId,
                                salaryStepIndex: selectedSalaryStepIndex,
                                salaryStep: selectedSalary,
                                incentiveIndices: selectedIncentives,
                                incentives: selectedIncentivesList,
                                allowanceIndices: selectedAllowances,
                                allowances: selectedAllowancesList,
                                enableOnboarding: enableOnboarding,
                            },
                            metadata: {
                                employeeName: `${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`,
                                templateName: templateData?.name || '',
                                departmentName: (deptData as any)?.name || '',
                                positionName: position?.title || '',
                                actionId: selectedActionId || '',
                                appointmentPath,
                                ...(documentNumber ? { documentNumber } : {}),
                            },
                            history: [{
                                stepId: 'CREATE',
                                action: 'CREATE',
                                actorId: firebaseUser?.uid || null,
                                timestamp: Timestamp.now(),
                                comment: documentNumber
                                    ? `Баримт ${documentNumber} үүсгэв (Томилгоо)`
                                    : 'Томилгооны процесс эхлүүлэв (Бүтэц зураглалаас)',
                            }],
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now(),
                        });
                    }
                });
            } catch (txErr: any) {
                Sentry.captureException(txErr, { tags: { module: 'organization', action: 'appointment-transaction' } });
                throw new Error(txErr?.message || 'Томилгоог хадгалахад алдаа гарлаа.');
            }

            // Create Onboarding Projects (after batch commit succeeds)
            if (enableOnboarding) {
                try {
                    const configSnap = await getDoc(tDoc('settings', 'onboarding'));
                    const config = configSnap.exists() ? configSnap.data() : { stages: [] };
                    const onboardingStages = (config.stages || []) as OnboardingStage[];

                    if (onboardingStages.length > 0) {
                        const employeeName = `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim();
                        const appointerId = currentUserProfile?.id || firebaseUser?.uid || '';
                        const startDate = format(new Date(), 'yyyy-MM-dd');

                        const taskPlan: OnboardingStageTaskPlan[] = ONBOARDING_STAGE_ORDER.map((sid) => {
                            const stageMap = onboardingTaskPlan[sid] || {};
                            const tasks = Object.entries(stageMap)
                                .filter(([, p]) => p?.selected)
                                .map(([templateTaskId, p]) => ({
                                    templateTaskId,
                                    dueDate: String(p.dueDate || ''),
                                    ownerId: String(p.ownerId || ''),
                                }))
                                .filter(t => isValidDateString(t.dueDate) && !!t.ownerId);
                            return { stageId: sid, tasks };
                        });

                        const totalSelected = taskPlan.reduce((acc, s) => acc + (s.tasks?.length || 0), 0);
                        if (totalSelected === 0) {
                            throw new Error('Onboarding таск сонгоогүй байна. Onboarding-ийг сонгосон бол дор хаяж 1 таск сонгоно уу.');
                        }

                        const result = await createOnboardingProjects({
                            firestore,
                            companyPath: companyPath!,
                            employeeId: selectedEmployee.id,
                            employeeName: employeeName || 'Шинэ ажилтан',
                            mentorId: undefined,
                            appointerId,
                            onboardingConfig: onboardingStages,
                            positionOnboardingIds: undefined,
                            startDate,
                            taskPlan,
                            alwaysCreateAllStages: true,
                        });

                    }
                } catch (e) {
                    Sentry.captureException(e, { tags: { module: 'organization', action: 'onboarding-projects' } });
                    toast({
                        title: 'Анхааруулга',
                        description: 'Onboarding төслүүд үүсгэхэд алдаа гарлаа. Гараар нэмнэ үү.',
                        variant: 'destructive'
                    });
                }
            }

            toast({
                title: 'Томилгоо эхэллээ',
                description: `${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''} ажилтныг "${position?.title || ''}" албан тушаалд томилох процесс эхэллээ.`,
            });

            // Audit log
            try {
                const employeeNameForAudit = `${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`.trim() || 'Ажилтан';
                logAudit({
                    action: 'create',
                    resource: 'employee',
                    resourceId: selectedEmployee.id,
                    resourceName: employeeNameForAudit,
                    description: templateData
                        ? `Томилгооны процесс эхэллээ (ER doc): ${employeeNameForAudit}`
                        : `Ажилтан шууд томилогдлоо: ${employeeNameForAudit}`,
                    metadata: {
                        kind: templateData ? 'appointment_initiated' : 'direct_appointment',
                        actionId: selectedActionId || null,
                        erDocumentId: templateData ? erDocRef.id : null,
                        positionId: position?.id || null,
                        positionName: position?.title || null,
                        departmentId: position?.departmentId || null,
                        enableOnboarding: !!enableOnboarding,
                        appointmentPath,
                    },
                });
            } catch (auditErr) {
                Sentry.captureException(auditErr, { level: 'warning', tags: { module: 'organization', action: 'audit-log' } });
            }

            if (onSuccess && selectedEmployee?.id) {
                onSuccess(selectedEmployee.id);
            }

            onOpenChange(false);
        } catch (error: any) {
            Sentry.captureException(error, { tags: { module: 'organization', action: 'appoint-submit' } });
            toast({
                title: 'Алдаа гарлаа',
                description: error?.message || 'Томилгооны процесс хийхэд алдаа гарлаа.',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate current step progress
    const getStepProgress = () => {
        const steps = [];
        steps.push({ id: 1, name: 'Ажилтан' });
        steps.push({ id: 2, name: 'Төрөл' });
        if (salarySteps.length > 0) steps.push({ id: 3, name: 'Цалин' });
        if (incentives.length > 0) steps.push({ id: 4, name: 'Урамшуулал' });
        if (allowances.length > 0) steps.push({ id: 5, name: 'Хангамж' });
        steps.push({ id: WIZARD_STEPS.ONBOARDING, name: 'Onboarding' });
        if (enableOnboarding) {
            steps.push({ id: WIZARD_STEPS.ONBOARDING_PRE, name: 'Бэлтгэл' });
            steps.push({ id: WIZARD_STEPS.ONBOARDING_ORIENTATION, name: 'Танилцах' });
            steps.push({ id: WIZARD_STEPS.ONBOARDING_INTEGRATION, name: 'Уусах' });
            steps.push({ id: WIZARD_STEPS.ONBOARDING_PRODUCTIVITY, name: 'Бүтээмж' });
        }
        if (templateData?.customInputs?.length) steps.push({ id: WIZARD_STEPS.DOCUMENT_INPUTS, name: 'Баримт' });
        return steps;
    };

    const stepProgress = getStepProgress();
    const currentStepIndex = stepProgress.findIndex(s => s.id === step);

    return {
        // State
        search,
        setSearch,
        step,
        setStep,
        selectedEmployee,
        isSubmitting,
        offboardingStatus,
        eligibility,
        selectedActionId,
        selectedSalaryStepIndex,
        setSelectedSalaryStepIndex,
        selectedIncentives,
        setSelectedIncentives,
        selectedAllowances,
        setSelectedAllowances,
        enableOnboarding,
        setEnableOnboarding,
        onboardingTaskPlan,
        setOnboardingTaskPlan,
        customInputValues,

        // Derived data
        positionData,
        isPositionLoading,
        allEmployees,
        employeesLoading,
        filteredEmployees,
        salarySteps,
        incentives,
        allowances,
        templateData,
        templateLoading,
        normalizedCustomInputs,
        onboardingStages,
        stepProgress,
        currentStepIndex,
        currentUserProfile,

        // Handlers
        handleEmployeeSelect,
        handleSelectAppointmentType,
        handleStartProcess,
        handleCustomInputChange,
        goToNextStep,
        goToPreviousStep,
        getStageConfig,
        getDefaultDueDateForStage,
        isValidDateString,
    };
}
