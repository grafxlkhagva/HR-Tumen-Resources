'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFetchCollection, useFirebase, addDocumentNonBlocking, useDoc, useTenantWrite, useAuth } from '@/firebase';
import { useTenant } from '@/contexts/tenant-context';
import { query, where, Timestamp, getDocs, getDoc, addDoc, doc, runTransaction, setDoc } from 'firebase/firestore';
import {
    readAndGuardAppointmentInTransaction,
    applyAppointmentPositionWrites,
} from '@/lib/services/employee-appointment-service';
import { ERDocumentType, ERTemplate, ERDocument, AppointmentDetails, AppointedCompensation } from '../types';
import { useERRbacMatrix } from '../hooks/use-er-rbac-matrix';
import { buildERPermissionMap } from '../lib/rbac-matrix';
import { applyEmployeeLifecycle } from '../lib/apply-employee-lifecycle';
import { logERTransition } from '../lib/er-audit';
import { logAudit } from '@/lib/client/audit-client';
import { Employee, Department, Position } from '@/types';
import { generateDocumentContent } from '../utils';
import { buildLegalFieldOverrides, legalContentToHtml } from '../lib/legal-template-adapter';
import {
    AppointmentActionFields,
    normalizeSalarySteps,
    type FullPositionLike,
    type AppointmentFieldValues,
} from './components/appointment-action-fields';
import { getNextDocumentNumber } from '../services/document-numbering';
import {
    validateCustomInputs,
    createDocumentInputSchema,
    ERValidationError,
} from '../validation';
import { captureERError } from '../lib/sentry-capture';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    ArrowLeft, ArrowRight, Check, FileText, User, Search,
    Loader2, ChevronRight, Home, Layout, FilePlus, Users, Wand2, Building2, Briefcase, DollarSign, Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/patterns/page-layout';

export default function CreateDocumentPage() {
    const { firestore, user: firebaseUser } = useFirebase();
    const { tDoc, tCollection, companyPath } = useTenantWrite();
    const auth = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    // Submit state — instant-apply эсвэл энгийн DRAFT аль нь дарагдсныг ялгах
    const [isSubmitting, setIsSubmitting] = useState<false | 'draft' | 'instant'>(false);

    const [selectedType, setSelectedType] = useState<string>('');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedPosition, setSelectedPosition] = useState<string>('');
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Appointment action system fields
    const [fullPosition, setFullPosition] = useState<FullPositionLike | null>(null);
    const [appointmentValues, setAppointmentValues] = useState<AppointmentFieldValues>({
        selectedSalaryStepIndex: null,
        selectedIncentives: [],
        selectedAllowances: [],
        enableOnboarding: false,
    });
    // Template-д metadata.actionId байхгүй тохиолдолд хэрэглэгч өөрөө сонгох
    // (жнь хэрэглэгчийн үүсгэсэн template). Auto-detect-д override болно.
    const [manualActionId, setManualActionId] = useState<string>('');

    // Ижил ажилтанд ижил төрлийн идэвхтэй баримт аль хэдийн байгаа үед
    // confirm dialog харуулна.
    const [existingActiveDoc, setExistingActiveDoc] = useState<{
        id: string;
        documentNumber?: string;
        status: string;
        templateName?: string;
    } | null>(null);
    const [isCheckingActive, setIsCheckingActive] = useState(false);

    // 300ms debounce for employee search — prevents filtering on every keystroke
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(employeeSearch), 300);
        return () => clearTimeout(timer);
    }, [employeeSearch]);
    const [customInputValues, setCustomInputValues] = useState<Record<string, unknown>>({});

    const searchParams = useSearchParams();
    const qEmployeeId = searchParams.get('employeeId');
    const qWorkflowId = searchParams.get('workflowId');

    // Pre-fill logic
    useEffect(() => {
        if (!firestore) return;
        const prefill = async () => {
            if (qEmployeeId) {
                const empDoc = await getDoc(tDoc('employees', qEmployeeId));
                if (empDoc.exists()) {
                    setSelectedEmployee({ id: empDoc.id, ...empDoc.data() } as Employee);
                }
            }
            if (qWorkflowId) {
                const typeQuery = query(tCollection('er_process_document_types'), where('workflowId', '==', qWorkflowId));
                const typeSnap = await getDocs(typeQuery);
                if (!typeSnap.empty) setSelectedType(typeSnap.docs[0].id);
            }
        };
        prefill();
    }, [firestore, qEmployeeId, qWorkflowId, tDoc, tCollection]);

    // Ажилтан сонгогдох бүрд түүний томилогдсон нэгж + ажлын байрыг автомат сонгоно.
    // Томилогдоогүй (positionId байхгүй) ажилтны хувьд хуучин утгыг дарж бичихгүй.
    // departmentId employee-д дутсан ч position-оос олж авна (хуучин бүртгэгдсэн
    // ажилтны хувьд тохиолдож болзошгүй).
    useEffect(() => {
        if (!selectedEmployee || !firestore) return;
        const posId = selectedEmployee.positionId;
        if (!posId) return;

        let cancelled = false;
        (async () => {
            let deptId = selectedEmployee.departmentId;
            if (!deptId) {
                try {
                    const posSnap = await getDoc(tDoc('positions', posId));
                    if (posSnap.exists()) {
                        deptId = (posSnap.data() as { departmentId?: string }).departmentId;
                    }
                } catch {
                    /* ignore — хэрэглэгч гараар сонгох боломж хэвээр */
                }
            }
            if (cancelled) return;
            if (deptId) setSelectedDepartment(deptId);
            setSelectedPosition(posId);
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedEmployee?.id, firestore, tDoc]); // eslint-disable-line react-hooks/exhaustive-deps

    const docTypesQuery = useMemo(() => firestore ? tCollection('er_process_document_types') : null, [firestore, tCollection]);
    const templatesQuery = useMemo(() =>
        firestore && selectedType ? query(tCollection('er_templates'), where('documentTypeId', '==', selectedType), where('isActive', '==', true)) : null
        , [firestore, selectedType, tCollection]);
    // Legal модулиас ER-д нэмэгдсэн загварууд
    const legalTemplatesQuery = useMemo(() =>
        firestore ? tCollection('legal_templates') : null
        , [firestore, tCollection]);
    const employeesQuery = useMemo(() => firestore ? tCollection('employees') : null, [firestore, tCollection]);
    const departmentsQuery = useMemo(() => firestore ? tCollection('departments') : null, [firestore, tCollection]);
    const positionsQuery = useMemo(() =>
        firestore && selectedDepartment ? query(tCollection('positions'), where('departmentId', '==', selectedDepartment)) : null
        , [firestore, selectedDepartment, tCollection]);

    const { data: docTypes } = useFetchCollection<ERDocumentType>(docTypesQuery);
    const { data: erTemplates } = useFetchCollection<ERTemplate>(templatesQuery);
    const { data: legalTemplatesRaw } = useFetchCollection<{
        id: string;
        title: string;
        content: string;
        version?: number;
        useInER?: boolean;
        erDocumentTypeId?: string;
    }>(legalTemplatesQuery);

    // Legal-аас ирсэн загваруудыг ERTemplate shape руу дүгнэж, сонгогдсон төрөлтэй тааруулна
    const templates = useMemo<ERTemplate[]>(() => {
        const base = erTemplates ? [...erTemplates] : [];
        if (!selectedType || !legalTemplatesRaw) return base;
        const legalAsER = legalTemplatesRaw
            .filter(l => l.useInER && l.erDocumentTypeId === selectedType)
            .map(l => ({
                id: `legal:${l.id}`,
                name: l.title,
                documentTypeId: l.erDocumentTypeId!,
                content: l.content,
                version: l.version ?? 1,
                requiredFields: [],
                isActive: true,
                isSystem: false,
            } as ERTemplate));
        return [...base, ...legalAsER];
    }, [erTemplates, legalTemplatesRaw, selectedType]);
    const { data: employees } = useFetchCollection<Employee>(employeesQuery);
    const { data: departments } = useFetchCollection<Department & { managerId?: string; managerName?: string; managerPositionName?: string }>(departmentsQuery);
    const { data: positions } = useFetchCollection<Position>(positionsQuery);

    // Зөвхөн БАТЛАГДСАН ажлын байрыг харуулна. Position-д `isApproved: true`
    // төлөвтэй нь л ER процессийн баримт үүсгэхэд сонгогдоно.
    const approvedPositions = useMemo(() =>
        (positions || []).filter((p) => (p as unknown as { isApproved?: boolean }).isApproved === true)
        , [positions]);

    const [companyProfile, setCompanyProfile] = useState<Record<string, unknown> | null>(null);

    // company profile — tenant-scoped doc зам: companies/{id}/company/profile
    useEffect(() => {
        if (!firestore) return;
        getDoc(tDoc('company', 'profile')).then(snap => {
            if (snap.exists()) setCompanyProfile(snap.data());
        });
    }, [firestore, tDoc]);

    const filteredEmployees = useMemo(() => {
        if (!employees || !debouncedSearch.trim()) return [];
        const term = debouncedSearch.toLowerCase();
        return employees.filter(e =>
            e.firstName?.toLowerCase().includes(term) ||
            e.lastName?.toLowerCase().includes(term)
        ).slice(0, 8);
    }, [employees, debouncedSearch]);

    const selectedTemplateData = useMemo(() => templates?.find(t => t.id === selectedTemplate), [templates, selectedTemplate]);

    // ── Action-aware system fields ────────────────────────────────────────
    // template.metadata.actionId → fallback docType.code. appointment_* бол
    // position-оос salary/incentives/allowances сонгох UI-г нэмнэ.
    const autoActionId = useMemo(() => {
        const md = (selectedTemplateData as unknown as { metadata?: { actionId?: string } })?.metadata?.actionId;
        if (md) return String(md);
        const code = docTypes?.find((t) => t.id === selectedType)?.code;
        // docType.code нь appointment_*-тай зөвхөн таарвал ашиглана. Бусад тохиолдолд
        // (жнь баримтын дугаарлалтын prefix "Б") actionId-д хэрэглэгдэхгүй.
        if (code && /^appointment_/.test(code)) return code;
        // Template нэрнээс heuristic
        const name = String(selectedTemplateData?.name || '').toLowerCase();
        if (/туршилт/.test(name)) return 'appointment_probation';
        if (/эргүүлэн|дахин/.test(name)) return 'appointment_reappoint';
        if (/ажилтнаар.*томил|үндсэн.*томил|томил.*ажилтан/.test(name)) return 'appointment_permanent';
        return '';
    }, [selectedTemplateData, docTypes, selectedType]);

    // Manual select нь auto-detect-г override хийнэ.
    const resolvedActionId = manualActionId || autoActionId;

    // ── Organization actions ──────────────────────────────────────────────
    // Сонгосон template нь organization_actions collection-д холбогдсон эсэхийг
    // шалгана. Admin нь /dashboard/organization/settings → Үйлдэл tab дээр
    // аль загварыг аль action-д ашиглахыг тохируулсан бол action doc үүсгэсэн
    // байна (templateId === selectedTemplate).
    const orgActionsQuery = useMemo(
        () => (firestore ? tCollection('organization_actions') : null),
        [firestore, tCollection],
    );
    const { data: orgActions } = useFetchCollection<{ id: string; templateId?: string }>(orgActionsQuery);
    const templateIsActionLinked = useMemo(() => {
        if (!resolvedActionId || !selectedTemplate) return false;
        return !!orgActions?.some(
            (a) => a.id === resolvedActionId && a.templateId === selectedTemplate,
        );
    }, [orgActions, resolvedActionId, selectedTemplate]);

    // ── Permission: шууд хэрэгжүүлэх эрх ──────────────────────────────────
    // Current user-ийн role-ыг employee doc-оос уншаад RBAC matrix-аар
    // finalApprove эрхтэй эсэхийг тооцоолно.
    const currentUserProfileRef = useMemo(
        () => (firestore && firebaseUser?.uid ? tDoc('employees', firebaseUser.uid) : null),
        [firestore, firebaseUser?.uid, tDoc],
    );
    const { data: currentUserProfile } = useDoc<{ role?: string }>(currentUserProfileRef);
    const { matrix: rbacMatrix } = useERRbacMatrix();
    const canInstantExecute = useMemo(() => {
        const permMap = buildERPermissionMap(rbacMatrix, currentUserProfile?.role);
        return permMap.finalApprove;
    }, [rbacMatrix, currentUserProfile?.role]);

    const isAppointmentAction = useMemo(() => {
        return (
            resolvedActionId === 'appointment_permanent' ||
            resolvedActionId === 'appointment_probation' ||
            resolvedActionId === 'appointment_reappoint'
        );
    }, [resolvedActionId]);

    // Template солигдоход manual actionId-г цэвэрлэнэ.
    useEffect(() => {
        setManualActionId('');
    }, [selectedTemplate]);

    // selectedPosition-өөс full document авч salarySteps/incentives/allowances ашиглана.
    useEffect(() => {
        if (!firestore || !selectedPosition) {
            setFullPosition(null);
            return;
        }
        let cancelled = false;
        getDoc(tDoc('positions', selectedPosition))
            .then((snap) => {
                if (cancelled || !snap.exists()) return;
                setFullPosition(snap.data() as FullPositionLike);
            })
            .catch(() => { /* ignored — UI-д full data байхгүй бол зүгээр хоосон section */ });
        return () => { cancelled = true; };
    }, [firestore, selectedPosition, tDoc]);

    // Position өөрчлөгдөхөд appointment сонголтуудыг reset + salary step default-ийг activeIndex рүү тавина.
    useEffect(() => {
        const steps = normalizeSalarySteps(fullPosition);
        const active = fullPosition?.salarySteps?.activeIndex;
        setAppointmentValues({
            selectedSalaryStepIndex: steps.length > 0 ? (typeof active === 'number' ? active : 0) : null,
            selectedIncentives: [],
            selectedAllowances: [],
            enableOnboarding: false,
        });
    }, [fullPosition]);

    // Initialize custom inputs when template takes effect
    useEffect(() => {
        if (selectedTemplateData?.customInputs) {
            const initialValues: Record<string, unknown> = {};
            selectedTemplateData.customInputs.forEach(input => {
                initialValues[input.key] = '';
            });
            setCustomInputValues(initialValues);
        } else {
            setCustomInputValues({});
        }
    }, [selectedTemplateData]);

    /**
     * Ажилтанд ижил documentType-ын идэвхтэй баримт (DRAFT/IN_REVIEW/REVIEWED/
     * APPROVED/SIGNED/SENT_TO_EMPLOYEE) байгаа эсэхийг шалгана.
     * Идэвхтэй баримт байвал буцаана — үгүй бол null.
     */
    const checkExistingActiveDoc = async (): Promise<{ id: string; documentNumber?: string; status: string; templateName?: string } | null> => {
        if (!firestore || !selectedType || !selectedEmployee) return null;
        const ACTIVE_STATUSES = ['DRAFT', 'IN_REVIEW', 'REVIEWED', 'APPROVED', 'SIGNED', 'SENT_TO_EMPLOYEE'];
        try {
            const q = query(
                tCollection('er_documents'),
                where('employeeId', '==', selectedEmployee.id),
                where('documentTypeId', '==', selectedType),
                where('status', 'in', ACTIVE_STATUSES),
            );
            const snap = await getDocs(q);
            if (snap.empty) return null;
            const d = snap.docs[0];
            const data = d.data() as { documentNumber?: string; status?: string; metadata?: { templateName?: string } };
            return {
                id: d.id,
                documentNumber: data.documentNumber,
                status: data.status || 'DRAFT',
                templateName: data.metadata?.templateName,
            };
        } catch (e) {
            // Шалгалт алдаатай бол creation-ийг зогсоохгүй — зүгээр үргэлжлүүлнэ
            console.warn('checkExistingActiveDoc failed:', e);
            return null;
        }
    };

    // instantApply === true бол AlertDialog-ын "Шинээр үүсгэх" товч дарагдахад
    // хэрэглэгчийн сонгосон намайг хадгалах зорилгоор pendingInstantApply state.
    const [pendingInstantApply, setPendingInstantApply] = useState(false);

    const handleCreate = async (opts?: { instantApply?: boolean }) => {
        const instantApply = !!opts?.instantApply;
        if (!firestore || !selectedType || !selectedTemplate || !selectedEmployee) {
            toast({ title: "Дутуу мэдээлэл", description: "Бүх талбарыг сонгоно уу", variant: "destructive" });
            return;
        }

        // Ижил documentType-ын идэвхтэй баримт байгаа эсэхийг шалгана
        setIsCheckingActive(true);
        const existing = await checkExistingActiveDoc();
        setIsCheckingActive(false);
        if (existing) {
            setPendingInstantApply(instantApply);
            setExistingActiveDoc(existing);
            return; // AlertDialog-д хэрэглэгчийн сонголт хүлээнэ
        }

        await executeCreate({ instantApply });
    };

    const executeCreate = async (opts?: { instantApply?: boolean }) => {
        const instantApply = !!opts?.instantApply;
        if (!firestore || !selectedType || !selectedTemplate || !selectedEmployee) return;

        // ── Validation: үндсэн талбарууд ─────────────────────────────────────
        const baseParse = createDocumentInputSchema.safeParse({
            documentTypeId: selectedType,
            templateId: selectedTemplate,
            employeeId: selectedEmployee.id,
            departmentId: selectedDepartment || undefined,
            positionId: selectedPosition || undefined,
        });
        if (!baseParse.success) {
            toast({
                title: 'Дутуу мэдээлэл',
                description: baseParse.error.issues[0]?.message || 'Үндсэн талбар дутуу',
                variant: 'destructive',
            });
            return;
        }

        // ── Validation: appointment-specific ─────────────────────────────────
        const steps = normalizeSalarySteps(fullPosition);
        if (isAppointmentAction && steps.length > 0 && appointmentValues.selectedSalaryStepIndex == null) {
            toast({
                title: 'Дутуу мэдээлэл',
                description: 'Цалингийн шатлал сонгоно уу',
                variant: 'destructive',
            });
            return;
        }

        // ── Validation: customInputs (template-specific) ─────────────────────
        try {
            const actionId = resolvedActionId;
            validateCustomInputs(selectedTemplateData, customInputValues, { actionId });
        } catch (err) {
            if (err instanceof ERValidationError) {
                toast({
                    title: 'Шалгалт амжилтгүй',
                    description: err.message,
                    variant: 'destructive',
                });
                return;
            }
            throw err;
        }

        try {
            // Автомат дугаар авах (атомик үйлдэл) — server-side allocator so non-admin creators work too
            let documentNumber: string | undefined;
            const idToken = await firebaseUser?.getIdToken?.();
            if (idToken) {
                const res = await fetch('/api/employment-relations/next-document-number', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ documentTypeId: selectedType }),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg = String(json?.error || '');
                    // Dev fallback: if Admin SDK env isn't configured, use client-side transaction.
                    if (msg.includes('Firebase Admin env not configured')) {
                        documentNumber = await getNextDocumentNumber(firestore, selectedType, companyPath);
                    } else {
                        throw new Error(msg || 'Баримтын дугаар олгох үйлдэл амжилтгүй');
                    }
                } else {
                    documentNumber = json?.documentNumber;
                }
            } else {
                // Fallback (dev / unexpected auth state): try client transaction
                documentNumber = await getNextDocumentNumber(firestore, selectedType, companyPath);
            }

            if (!documentNumber) {
                throw new Error('Баримтын дугаар олгогдсонгүй');
            }

            // ── Parallel fetch (P2-B: N+1 cleanup) ─────────────────────────
            // Эдгээр 3 getDoc дуудлага бие даан хамааралгүй — өмнө нь sequential
            // явдаг байсан (3 RTT). Promise.all ашиглан паралель болгож сүлжээ
            // RTT-г 1 болгож багасгана. Алдаатай fetch-ийг тус бүрд нь handle.
            const deptData = departments?.find(d => d.id === selectedDepartment);
            const posData = positions?.find(p => p.id === selectedPosition);
            const enrichedDept = deptData ? { ...deptData } : undefined;
            const managerRef =
                enrichedDept?.managerId && !enrichedDept.managerName
                    ? tDoc('employees', enrichedDept.managerId)
                    : null;

            const [empDoc, mgrSettled, qSettled] = await Promise.all([
                getDoc(tDoc('employees', selectedEmployee.id)),
                managerRef
                    ? getDoc(managerRef).then((s) => ({ ok: true as const, snap: s })).catch(() => ({ ok: false as const }))
                    : Promise.resolve({ ok: false as const }),
                getDoc(tDoc('employees', selectedEmployee.id, 'questionnaire', 'data'))
                    .then((s) => ({ ok: true as const, snap: s }))
                    .catch(() => ({ ok: false as const })),
            ]);

            // Department manager — паралель хүлээж аваад nullable аар нэмнэ
            if (enrichedDept && mgrSettled.ok && mgrSettled.snap.exists()) {
                const mgr = mgrSettled.snap.data();
                const mgrPos = positions?.find(p => p.id === mgr.positionId);
                enrichedDept.managerName = [mgr.lastName, mgr.firstName].filter(Boolean).join(' ');
                enrichedDept.managerPositionName = mgrPos?.title || mgr.jobTitle || '';
            }

            // Questionnaire — байхгүй ч баримт үүсгэнэ
            let questionnaireData: Record<string, unknown> | null = null;
            if (qSettled.ok && qSettled.snap.exists()) {
                questionnaireData = qSettled.snap.data() as Record<string, unknown>;
            }

            // Appointment action-д зориулан virtualPosition: сонгосон salary step-ийн
            // activeIndex-ийг тохируулснаар `{{position.salaryStepName}}` /
            // `{{position.salaryStepValue}}` placeholder нь сонгосон утгаар орно.
            const appointmentIncentives = steps.length > 0 && isAppointmentAction
                ? appointmentValues.selectedIncentives
                      .map((i) => fullPosition?.incentives?.[i])
                      .filter((x): x is NonNullable<typeof x> => !!x)
                : [];
            const appointmentAllowances = isAppointmentAction
                ? appointmentValues.selectedAllowances
                      .map((i) => fullPosition?.allowances?.[i])
                      .filter((x): x is NonNullable<typeof x> => !!x)
                : [];
            const activeStepIndex = isAppointmentAction && appointmentValues.selectedSalaryStepIndex != null
                ? appointmentValues.selectedSalaryStepIndex
                : undefined;
            const selectedStepItem = activeStepIndex != null ? steps[activeStepIndex] : undefined;

            const effectivePosition = posData && activeStepIndex != null && fullPosition?.salarySteps
                ? {
                      ...posData,
                      salarySteps: {
                          ...fullPosition.salarySteps,
                          activeIndex: activeStepIndex,
                      },
                  }
                : posData;

            // Template-д `{{system.*}}` placeholder байж болох тул customInputs-д нэмэх
            const enrichedCustomInputs: Record<string, unknown> = { ...customInputValues };
            if (isAppointmentAction) {
                if (appointmentIncentives.length > 0) {
                    enrichedCustomInputs['system.selectedIncentives'] = appointmentIncentives
                        .map((i) => i.type)
                        .join(', ');
                }
                if (appointmentAllowances.length > 0) {
                    enrichedCustomInputs['system.selectedAllowances'] = appointmentAllowances
                        .map((a) => a.type)
                        .join(', ');
                }
                enrichedCustomInputs['system.onboardingEnabled'] = appointmentValues.enableOnboarding ? 'Тийм' : 'Үгүй';
            }

            // Legal-аас ирсэн загвар уу? — placeholder-уудыг монгол snake_case байж
            // болох тул нэмэлт fieldOverrides бэлдэх, контентыг HTML руу хөрвүүлэх
            // шаардлагатай.
            const isLegalTemplate = selectedTemplate.startsWith('legal:');
            const empDataForOverride = empDoc.data() as Record<string, any> | undefined;
            const legalOverrides = isLegalTemplate
                ? buildLegalFieldOverrides({
                      employee: empDataForOverride,
                      position: effectivePosition as any,
                      department: enrichedDept as any,
                      company: companyProfile as any,
                      questionnaire: questionnaireData as any,
                      documentNumber,
                  })
                : undefined;

            // Generate content
            const rawContent = generateDocumentContent(selectedTemplateData?.content || '', {
                employee: { id: empDoc.id, ...empDoc.data() },
                department: enrichedDept,
                position: effectivePosition,
                company: companyProfile,
                questionnaire: questionnaireData,
                system: {
                    date: format(new Date(), 'yyyy-MM-dd'),
                    year: format(new Date(), 'yyyy'),
                    month: format(new Date(), 'MM'),
                    day: format(new Date(), 'dd'),
                    user: firebaseUser?.displayName || 'Системийн хэрэглэгч',
                    documentNumber: documentNumber,
                },
                customInputs: enrichedCustomInputs,
                fieldOverrides: legalOverrides,
            });

            // Legal загвар нь plain text + markdown-маягийн `**bold**`-той байдаг.
            // ER-ийн `DocumentPreview` нь `prose`-чиглэсэн HTML rendering тул мөр
            // таслалт алдагдаж 1 урт паргаф болон харагдахаас сэргийлж HTML рүү
            // хөрвүүлнэ (ER загварууд аль хэдийн HTML тул дахин хөрвүүлэхгүй).
            const content = isLegalTemplate ? legalContentToHtml(rawContent) : rawContent;

            const appointmentDetails: AppointmentDetails | undefined = isAppointmentAction
                ? {
                      actionId: resolvedActionId,
                      salaryStepIndex: appointmentValues.selectedSalaryStepIndex,
                      salaryStepName: selectedStepItem?.name,
                      salaryStepValue: selectedStepItem?.value,
                      selectedIncentives: appointmentIncentives,
                      selectedAllowances: appointmentAllowances,
                      enableOnboarding: appointmentValues.enableOnboarding,
                  }
                : undefined;

            const nowTs = Timestamp.now();
            const newDoc: Partial<ERDocument> = {
                documentNumber,
                documentTypeId: selectedType,
                templateId: selectedTemplate,
                employeeId: selectedEmployee.id,
                departmentId: selectedDepartment || undefined,
                positionId: selectedPosition || undefined,
                creatorId: firebaseUser?.uid || 'SYSTEM',
                status: instantApply ? 'ACKNOWLEDGED' : 'DRAFT',
                content: content, // Now populated
                version: 1,
                ...(selectedTemplateData?.printSettings
                    ? { printSettings: selectedTemplateData.printSettings }
                    : {}),
                customInputs: customInputValues,
                ...(appointmentDetails ? { appointmentDetails } : {}),
                // Instant-apply үед баримт танилцсан төлөвт үүсэх тул ack талбаруудыг
                // шууд бөглөнө — эцсийн баталгаажуулалтын "Шууд батлах" товчтой ижил.
                ...(instantApply
                    ? {
                          employeeAckRequired: true,
                          employeeAckSentAt: nowTs,
                          employeeAckSentBy: firebaseUser?.uid || undefined,
                          employeeAckAt: nowTs,
                          employeeAckBy: selectedEmployee.id,
                      }
                    : {}),
                metadata: {
                    employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
                    templateName: selectedTemplateData?.name,
                    departmentName: deptData?.name,
                    positionName: posData?.title,
                    documentNumber,
                    // Загварын эх үүсвэр — ER эсвэл Legal модулиас
                    templateSource: selectedTemplate.startsWith('legal:') ? 'legal' : 'er',
                    ...(selectedTemplate.startsWith('legal:')
                        ? { legalTemplateId: selectedTemplate.slice('legal:'.length) }
                        : {}),
                    // actionId-ыг үргэлж metadata-д бичнэ — баримт устгахад
                    // appointment/release rollback flow-руу зөв замчилна.
                    // (Өмнө нь зөвхөн instantApply үед бичигддэг байсан тул
                    // DRAFT баримт устгахад employee төлөв буцаагдахгүй
                    // үлдэх bug үүсгэж байсан.)
                    ...(resolvedActionId ? { actionId: resolvedActionId } : {}),
                    ...(instantApply ? { instantApplyAtCreate: true } : {}),
                },
                history: [
                    {
                        stepId: 'CREATE',
                        action: 'CREATE',
                        actorId: firebaseUser?.uid || 'SYSTEM',
                        timestamp: nowTs,
                        comment: `Баримт үүсгэв: ${documentNumber}`,
                    },
                    ...(instantApply
                        ? [{
                              stepId: 'INSTANT_APPLY',
                              action: 'INSTANT_APPLY' as const,
                              actorId: firebaseUser?.uid || 'SYSTEM',
                              timestamp: nowTs,
                              comment: 'Хяналт, танилцуулах үе шатыг алгасаж шууд хэрэгжүүлэв',
                          }]
                        : []),
                ],
                createdAt: nowTs,
                updatedAt: nowTs,
            };

            // Appointment action үед — employee-г `appointing` төлөвт оруулж, positionId-ыг
            // холбож, position.filled-ийг +1-ээр нэмнэ. Баримт үүсгэлттэй хамт нэг
            // transaction-д хийнэ — /organization "Ажилтан томилох" dialog-тай ижил.
            let docRefId: string;
            if (isAppointmentAction && selectedEmployee && selectedPosition) {
                const empRef = tDoc('employees', selectedEmployee.id);
                const posRef = tDoc('positions', selectedPosition);
                const newErDocRef = doc(tCollection('er_documents'));
                try {
                    await runTransaction(firestore, async (transaction) => {
                        const ctx = await readAndGuardAppointmentInTransaction(transaction, empRef, posRef);
                        const empData = ctx.empData as unknown as Record<string, unknown>;
                        // Phase 5.1: position.filled-ийг +1 хийхийн ӨМНӨХ утгыг snapshot-д
                        // хадгалж, rollback-т concurrent write race detection-д ашиглана.
                        const positionFilledBefore =
                            typeof ctx.posData.filled === 'number' ? ctx.posData.filled : 0;
                        applyAppointmentPositionWrites(transaction, ctx, posRef);

                        const selectedStepItem = activeStepIndex != null ? steps[activeStepIndex] : undefined;
                        transaction.update(empRef, {
                            positionId: selectedPosition,
                            jobTitle: posData?.title || null,
                            departmentId: selectedDepartment || null,
                            status: 'appointing',
                            appointedCompensation: {
                                salaryStepIndex: appointmentValues.selectedSalaryStepIndex,
                                salary: selectedStepItem?.value || 0,
                                salaryStepName: selectedStepItem?.name || '',
                                incentiveIndices: appointmentValues.selectedIncentives,
                                allowanceIndices: appointmentValues.selectedAllowances,
                            },
                            updatedAt: Timestamp.now(),
                        });

                        // Employee-ийн өмнөх төлөвийг snapshot болгож баримтад хадгалах
                        // (rollback-д ашиглана — release болон appointment хоёулан).
                        // Phase 5.1: positionFilledBefore + snapshotAt нэмэв.
                        const previousState = {
                            status: (empData?.status as string) ?? null,
                            positionId: (empData?.positionId as string | null) ?? null,
                            jobTitle: (empData?.jobTitle as string | null) ?? null,
                            departmentId: (empData?.departmentId as string | null) ?? null,
                            lifecycleStage: (empData?.lifecycleStage as string | null) ?? null,
                            loginDisabled: !!(empData?.loginDisabled),
                            appointedCompensation:
                                (empData?.appointedCompensation as AppointedCompensation | null) ??
                                null,
                            positionFilledBefore,
                            snapshotAt: Timestamp.now(),
                        };

                        transaction.set(newErDocRef, { ...newDoc, previousState });
                    });
                    docRefId = newErDocRef.id;
                } catch (txErr) {
                    // Transaction алдаатай бол стандарт toast буулгана
                    throw txErr;
                }
            } else {
                const docRef = await addDoc(tCollection('er_documents'), newDoc);
                docRefId = docRef.id;
            }

            // ── Instant-apply post-commit: activity entry + lifecycle + audit ───
            if (instantApply) {
                try {
                    // Activity subcollection-д нэг entry
                    await setDoc(doc(tCollection('er_documents', docRefId, 'activity')), {
                        type: 'STATUS_CHANGE',
                        actorId: firebaseUser?.uid || 'SYSTEM',
                        content: 'Баримт үүсгэгдэн шууд хэрэгжлээ (хяналт, танилцуулах үе шатыг алгассан)',
                        createdAt: Timestamp.now(),
                    });
                } catch (activityErr) {
                    console.warn('[instantCreate] activity log write failed:', activityErr);
                }

                // Employee lifecycle apply — appointment/release side-effects
                try {
                    await applyEmployeeLifecycle({
                        actionId: resolvedActionId,
                        employeeId: selectedEmployee.id,
                        customInputs: customInputValues,
                        tDoc,
                        firestore,
                        auth: auth ?? undefined,
                        companyPath,
                    });

                    // Employee-resource audit log (release/appointment finalized)
                    const employeeName = `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || 'Ажилтан';
                    if (resolvedActionId.startsWith('release_')) {
                        logAudit({
                            action: 'delete',
                            resource: 'employee',
                            resourceId: selectedEmployee.id,
                            resourceName: employeeName,
                            description: `Чөлөөлөх баримт үүсгэгдэж шууд хэрэгжиж ажилтан халагдлаа: ${employeeName}`,
                            metadata: {
                                kind: 'release_finalized',
                                actionId: resolvedActionId,
                                erDocumentId: docRefId,
                                documentNumber,
                                instantApplyAtCreate: true,
                            },
                        });
                    } else if (resolvedActionId.startsWith('appointment_')) {
                        const appointmentStatus =
                            resolvedActionId === 'appointment_probation'
                                ? 'active_probation'
                                : 'active_permanent';
                        logAudit({
                            action: 'create',
                            resource: 'employee',
                            resourceId: selectedEmployee.id,
                            resourceName: employeeName,
                            description: `Томилгооны баримт үүсгэгдэж шууд хэрэгжиж ажилтан томилогдлоо: ${employeeName}`,
                            metadata: {
                                kind: 'appointment_finalized',
                                actionId: resolvedActionId,
                                erDocumentId: docRefId,
                                documentNumber,
                                positionId: selectedPosition || null,
                                departmentId: selectedDepartment || null,
                                toStatus: appointmentStatus,
                                instantApplyAtCreate: true,
                            },
                        });
                    }
                } catch (lifecycleErr) {
                    console.warn('[instantCreate] Employee lifecycle failed:', lifecycleErr);
                    captureERError(lifecycleErr, {
                        flow: 'lifecycle-apply',
                        documentId: docRefId,
                        employeeId: selectedEmployee.id,
                        actionId: resolvedActionId,
                        extra: { phase: 'instant-create-lifecycle' },
                    });
                    toast({
                        variant: 'destructive',
                        title: 'Ажилтны төлвийг шинэчлэхэд алдаа',
                        description:
                            lifecycleErr instanceof Error
                                ? lifecycleErr.message
                                : 'Баримт үүссэн боловч ажилтны төлөв шинэчлэгдсэнгүй.',
                    });
                }

                // ER-document resource audit log — 3 үе шат бүрт compliance trail
                const erAuditDoc = {
                    id: docRefId,
                    documentNumber,
                    employeeId: selectedEmployee.id,
                    metadata: {
                        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
                        templateName: selectedTemplateData?.name,
                    },
                    status: 'ACKNOWLEDGED' as const,
                };
                logERTransition('final_approve', erAuditDoc, {
                    kind: 'er_instant_create',
                    skippedStages: ['DRAFT', 'IN_REVIEW', 'REVIEWED', 'SIGNED', 'SENT_TO_EMPLOYEE'],
                });
                logERTransition('send_to_employee', erAuditDoc, { kind: 'er_instant_create' });
                logERTransition('acknowledge', erAuditDoc, { kind: 'er_instant_create' });
            }

            toast({
                title: 'Амжилттай',
                description: instantApply
                    ? `Баримт ${documentNumber} үүсгэгдэн шууд хэрэгжлээ`
                    : `Баримт ${documentNumber} үүслээ`,
            });
            router.push(`/dashboard/employment-relations/${docRefId}`);

        } catch (error) {
            console.error(error);
            captureERError(error, {
                flow: 'create-document',
                employeeId: selectedEmployee?.id,
                extra: {
                    templateId: selectedTemplate || undefined,
                    documentTypeId: selectedType || undefined,
                },
            });
            toast({
                title: "Алдаа",
                description: error instanceof Error ? error.message : "Баримт үүсгэхэд алдаа гарлаа",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 p-6 md:p-8 space-y-8 overflow-y-auto">
            <div className="w-full space-y-8">
                <PageHeader
                    title="Шинэ процесс эхлүүлэх"
                    description={'Баримтын загвар болон ажилтнаа сонгоод "Төлөвлөх" үе шатыг эхлүүлнэ үү.'}
                    showBackButton
                    hideBreadcrumbs
                    backButtonPlacement="inline"
                    backBehavior="history"
                    fallbackBackHref="/dashboard/employment-relations"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Col: Setup */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-md bg-white">
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">1. Баримтын төрөл</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {docTypes?.map(type => (
                                            <div
                                                key={type.id}
                                                onClick={() => setSelectedType(type.id)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedType === type.id ? 'bg-primary/5 border-primary text-primary' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="font-medium text-sm">{type.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedType && (
                                    <div className="space-y-2 animate-in fade-in">
                                        <label className="text-sm font-medium text-slate-700">2. Загвар сонгох</label>
                                        <div className="space-y-2">
                                            {templates?.length === 0 && <p className="text-xs text-muted-foreground">Энэ төрөлд загвар алга.</p>}
                                            {templates?.map(tpl => (
                                                <div
                                                    key={tpl.id}
                                                    onClick={() => setSelectedTemplate(tpl.id)}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedTemplate === tpl.id ? 'bg-primary/5 border-primary ring-1 ring-primary/20' : 'hover:bg-slate-50'}`}
                                                >
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm font-medium">{tpl.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">3. Ажилтан сонгох</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Хайх..."
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    {filteredEmployees.length > 0 && (
                                        <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                                            {filteredEmployees.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => { setSelectedEmployee(emp); setEmployeeSearch(`${emp.lastName} ${emp.firstName}`) }}
                                                    className="p-2 text-sm hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                                >
                                                    <span>{emp.lastName} {emp.firstName}</span>
                                                    {selectedEmployee?.id === emp.id && <Check className="h-3 w-3 text-primary" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedEmployee && (
                                        <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3 border">
                                            <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center font-bold text-xs">
                                                {selectedEmployee.firstName.charAt(0)}
                                            </div>
                                            <div className="text-sm font-medium">{selectedEmployee.lastName} {selectedEmployee.firstName}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">4. Албан нэгж сонгох</label>
                                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                        <SelectTrigger className="bg-white">
                                            <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                                            <SelectValue placeholder="Албан нэгж сонгох" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments?.map(dept => (
                                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">5. Ажлын байр сонгох</label>
                                    <Select
                                        value={selectedPosition}
                                        onValueChange={setSelectedPosition}
                                        disabled={!selectedDepartment}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <Briefcase className="h-4 w-4 mr-2 text-slate-400" />
                                            <SelectValue placeholder={selectedDepartment ? "Ажлын байр сонгох" : "Эхлээд албан нэгж сонгоно уу"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {approvedPositions.length === 0 && selectedDepartment && (
                                                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                                    Батлагдсан ажлын байр алга
                                                </div>
                                            )}
                                            {approvedPositions.map(pos => (
                                                <SelectItem key={pos.id} value={pos.id}>{pos.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Action type selector — template.metadata.actionId байхгүй үед хэрэглэгч гараар сонгоно */}
                                {selectedTemplate && selectedPosition && (
                                    <div className="space-y-2 pt-4 border-t">
                                        <label className="text-sm font-medium text-slate-700">Үйл ажиллагааны төрөл</label>
                                        <Select value={resolvedActionId || '__none'} onValueChange={(v) => setManualActionId(v === '__none' ? '' : v)}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Сонгох шаардлагагүй (чөлөөт баримт)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none">Сонгохгүй — чөлөөт баримт</SelectItem>
                                                <SelectItem value="appointment_permanent">Үндсэн ажилтнаар томилох</SelectItem>
                                                <SelectItem value="appointment_probation">Туршилтын хугацаатай томилох</SelectItem>
                                                <SelectItem value="appointment_reappoint">Эргүүлэн томилох</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground">
                                            Appointment төрөл сонгоход цалин, урамшуулал, хангамж сонгох боломж нээгдэнэ.
                                        </p>
                                    </div>
                                )}

                                {/* 6. Appointment action-ийн системийн утгууд (зөвхөн appointment_*) */}
                                {isAppointmentAction && selectedPosition && (
                                    <div className="space-y-4 pt-4 border-t animate-in slide-in-from-top-4">
                                        <div className="flex items-center gap-2 text-emerald-600">
                                            <DollarSign className="h-4 w-4" />
                                            <label className="text-sm font-bold uppercase tracking-wider">6. Системийн утгууд</label>
                                        </div>
                                        <AppointmentActionFields
                                            position={fullPosition}
                                            values={appointmentValues}
                                            onChange={setAppointmentValues}
                                        />
                                    </div>
                                )}

                                {selectedTemplateData?.customInputs && selectedTemplateData.customInputs.length > 0 && (
                                    <div className="space-y-4 pt-4 border-t animate-in slide-in-from-top-4">
                                        <div className="flex items-center gap-2 text-primary">
                                            <Wand2 className="h-4 w-4" />
                                            <label className="text-sm font-bold uppercase tracking-wider">Шаардлагатай мэдээллүүд</label>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {[...(selectedTemplateData.customInputs || [])]
                                                .sort((a, b) => (a.order || 0) - (b.order || 0))
                                                .map((input, idx) => (
                                                    <div key={`${input.key || 'input'}-${input.order ?? idx}`} className="space-y-1.5">
                                                        <Label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                                                            <span>{input.label} {input.required && <span className="text-rose-500">*</span>}</span>
                                                            {input.type === 'boolean' && (
                                                                <Switch
                                                                    checked={customInputValues[input.key] === 'Тийм'}
                                                                    onCheckedChange={(c) => setCustomInputValues(prev => ({ ...prev, [input.key]: c ? 'Тийм' : 'Үгүй' }))}
                                                                />
                                                            )}
                                                        </Label>

                                                        {input.type !== 'boolean' && (
                                                            <Input
                                                                type={input.type === 'number' ? 'number' : input.type === 'date' ? 'date' : 'text'}
                                                                value={String(customInputValues[input.key] ?? '')}
                                                                onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.key]: e.target.value }))}
                                                                placeholder={input.description || `${input.label} оруулна уу...`}
                                                                className="h-10 border-slate-200 focus:border-primary focus:ring-primary/10"
                                                            />
                                                        )}
                                                        {input.type === 'boolean' && (
                                                            <p className="text-[10px] text-muted-foreground">{input.description || 'Сонголтыг идэвхжүүлэх эсвэл цуцлах'}</p>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Col: Summary & Action */}
                    <div className="space-y-6 md:sticky md:top-6 md:self-start md:max-h-[calc(100vh-3rem)]">
                        <Card className="border-none shadow-xl bg-slate-900 text-white relative overflow-hidden flex flex-col md:max-h-[calc(100vh-3rem)]">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <CardContent className="p-8 flex flex-col h-full relative z-10">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Layout className="h-5 w-5 text-primary" /> Хураангуй
                                </h3>

                                <div className="space-y-6 flex-1">
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Төрөл</div>
                                        <div className="font-medium text-lg">{docTypes?.find(t => t.id === selectedType)?.name || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Загвар</div>
                                        <div className="font-medium text-lg">{selectedTemplateData?.name || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Ажилтан</div>
                                        <div className="font-medium text-lg">{selectedEmployee ? `${selectedEmployee.lastName} ${selectedEmployee.firstName}` : '-'}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1 text-[10px]">Албан нэгж</div>
                                            <div className="font-medium text-sm truncate">{departments?.find(d => d.id === selectedDepartment)?.name || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1 text-[10px]">Ажлын байр</div>
                                            <div className="font-medium text-sm truncate">{positions?.find(p => p.id === selectedPosition)?.title || '-'}</div>
                                        </div>
                                    </div>

                                    {/* Appointment action system fields summary */}
                                    {isAppointmentAction && selectedPosition && (() => {
                                        const steps = normalizeSalarySteps(fullPosition);
                                        const idx = appointmentValues.selectedSalaryStepIndex;
                                        const step = idx != null ? steps[idx] : undefined;
                                        const incNames = appointmentValues.selectedIncentives
                                            .map((i) => fullPosition?.incentives?.[i]?.type)
                                            .filter(Boolean);
                                        const allNames = appointmentValues.selectedAllowances
                                            .map((i) => fullPosition?.allowances?.[i]?.type)
                                            .filter(Boolean);
                                        return (
                                            <div className="pt-4 border-t border-white/10 space-y-3">
                                                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1 text-[10px]">Системийн утгууд</div>
                                                {step && (
                                                    <div>
                                                        <div className="text-[10px] text-slate-500 mb-0.5">Цалин</div>
                                                        <div className="text-sm font-medium">
                                                            {step.name} / {Number(step.value).toLocaleString()}₮
                                                        </div>
                                                    </div>
                                                )}
                                                {incNames.length > 0 && (
                                                    <div>
                                                        <div className="text-[10px] text-slate-500 mb-0.5">Урамшуулал</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {incNames.map((n, i) => (
                                                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">{n}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {allNames.length > 0 && (
                                                    <div>
                                                        <div className="text-[10px] text-slate-500 mb-0.5">Хангамж</div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {allNames.map((n, i) => (
                                                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-200">{n}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-[10px] text-slate-500 mb-0.5">Онбординг</div>
                                                    <div className="text-xs font-medium">
                                                        {appointmentValues.enableOnboarding ? 'Идэвхтэй' : 'Идэвхгүй'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="flex flex-col gap-3 mt-8">
                                    <Button
                                        size="lg"
                                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl"
                                        disabled={!!isSubmitting || isCheckingActive || !selectedType || !selectedTemplate || !selectedEmployee || (selectedTemplateData?.customInputs || []).some(i => i.required && !customInputValues[i.key])}
                                        onClick={() => { setIsSubmitting('draft'); handleCreate().finally(() => setIsSubmitting(false)); }}
                                    >
                                        {isSubmitting === 'draft' || isCheckingActive ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isCheckingActive ? 'Шалгаж байна...' : 'Үүсгэж байна...'}</>
                                        ) : (
                                            <>Процесс эхлүүлэх <ArrowRight className="ml-2 h-4 w-4" /></>
                                        )}
                                    </Button>
                                    {templateIsActionLinked && canInstantExecute && (
                                        <Button
                                            size="lg"
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl"
                                            title="Хяналт, танилцуулах үе шатыг алгасаж бичиг баримт үүсгэгдсэн даруй ажилтны төлөв шууд өөрчлөгдөнө"
                                            disabled={!!isSubmitting || isCheckingActive || !selectedType || !selectedTemplate || !selectedEmployee || (selectedTemplateData?.customInputs || []).some(i => i.required && !customInputValues[i.key])}
                                            onClick={() => { setIsSubmitting('instant'); handleCreate({ instantApply: true }).finally(() => setIsSubmitting(false)); }}
                                        >
                                            {isSubmitting === 'instant' ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Хэрэгжүүлж байна...</>
                                            ) : (
                                                <><Zap className="mr-2 h-4 w-4" /> Үүсгээд шууд хэрэгжүүлэх</>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Идэвхтэй баримт аль хэдийн байна — үргэлжлүүлэх эсэх confirm */}
            <AlertDialog
                open={!!existingActiveDoc}
                onOpenChange={(open) => { if (!open) setExistingActiveDoc(null); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Энэ ажилтан дээр идэвхтэй баримт байна</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm">
                                <p>
                                    <strong>{selectedEmployee ? `${selectedEmployee.lastName || ''} ${selectedEmployee.firstName || ''}`.trim() : 'Ажилтан'}</strong> дээр
                                    "<strong>{docTypes?.find(t => t.id === selectedType)?.name || 'энэ төрлийн'}</strong>" төрлийн
                                    баримт хэдийнэ төлөвлөгдсөн байна.
                                </p>
                                {existingActiveDoc && (
                                    <div className="bg-slate-50 border rounded-md p-3 text-xs space-y-1">
                                        {existingActiveDoc.documentNumber && (
                                            <div><span className="text-slate-500">Дугаар: </span><code>{existingActiveDoc.documentNumber}</code></div>
                                        )}
                                        {existingActiveDoc.templateName && (
                                            <div><span className="text-slate-500">Загвар: </span>{existingActiveDoc.templateName}</div>
                                        )}
                                        <div><span className="text-slate-500">Төлөв: </span>{existingActiveDoc.status}</div>
                                    </div>
                                )}
                                <p>Уг баримтаа үргэлжлүүлэх үү, эсвэл шинэ баримт үүсгэх үү?</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setExistingActiveDoc(null)}>
                            Цуцлах
                        </AlertDialogCancel>
                        <Button
                            variant="outline"
                            onClick={async () => {
                                setExistingActiveDoc(null);
                                const ia = pendingInstantApply;
                                setPendingInstantApply(false);
                                await executeCreate({ instantApply: ia });
                            }}
                        >
                            Шинээр үүсгэх
                        </Button>
                        <AlertDialogAction
                            onClick={() => {
                                if (existingActiveDoc) {
                                    router.push(`/dashboard/employment-relations/${existingActiveDoc.id}`);
                                }
                                setExistingActiveDoc(null);
                            }}
                        >
                            Үргэлжлүүлэх
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
