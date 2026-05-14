'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase, useDoc, useCollection, useFetchCollection, useTenantWrite, useMemoFirebase, tenantCollection, tenantDoc } from '@/firebase';
import { doc, Timestamp, updateDoc, collection, query, where, getDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ERDocument, DOCUMENT_STATUSES, DocumentStatus, ERTemplate, ERDocumentType } from '../types';
import { generateHeaderHtml } from '../lib/generate-header-html';
import type { Department, Position, Employee } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/patterns/page-layout';
import {
    Loader2, ArrowLeft, CheckCircle2, Clock,
    User, Briefcase, Building2, Send, Save, Undo2,
    MessageSquare, Check, X, Upload, Printer, Download,
    Search, Plus, Trash2, FileText, Sparkles, Users, XCircle, AlertCircle, Wand2, Edit3, Zap, Calendar as CalendarIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { getReplacementMap, generateDocumentContent } from '../utils';
import { useCallback } from 'react';
import {
    AppointmentActionFields,
    normalizeSalarySteps,
    type FullPositionLike,
    type AppointmentFieldValues,
} from '../create/components/appointment-action-fields';
import type { AppointmentDetails } from '../types';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';

// Lazy-loaded editors — баримт "Засах" dialog нээгдэх үед л bundle татагдана.
// Энэ нь detail page-ийн initial bundle size ~200KB багасгана (Tiptap + dnd-kit).
const TemplateBuilder = dynamic(
    () => import('../components/template-builder').then(m => ({ default: m.TemplateBuilder })),
    {
        ssr: false,
        loading: () => (
            <div className="min-h-[400px] flex items-center justify-center text-sm text-muted-foreground">
                Ачаалж байна...
            </div>
        ),
    }
);
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';
import { PrintLayout } from '../components/print-layout';
import { useERDocumentActions } from '../hooks/use-er-document-actions';
import { useERPermissions } from '../hooks/use-er-permissions';
import { useERRbacMatrix } from '../hooks/use-er-rbac-matrix';
import { ActivityFeed } from './components/activity-feed';
import { DocumentStepper } from './components/document-stepper';
import { DocumentPreview } from './components/document-preview';
import { EntityInfoCard } from './components/entity-info-card';
import { RejectionAlert } from './components/rejection-alert';
import { DeleteConfirmDialog } from './components/delete-confirm-dialog';
import { CustomInputsPanel } from './components/custom-inputs-panel';


export default function DocumentDetailPage() {
    const { firestore, storage, user: currentUser } = useFirebase();
    const { tDoc, tCollection, companyPath } = useTenantWrite();
    const tenantCompanyId = useMemo(() => {
        if (!companyPath) return null;
        const parts = companyPath.split('/');
        return parts.length >= 2 ? parts[1] : null;
    }, [companyPath]);
    const currentUserId = currentUser?.uid;
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams<{ id?: string | string[] }>();
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const docRef = useMemo(() => (firestore && id ? tDoc('er_documents', id) : null), [firestore, id, tDoc]);
    const { data: document, isLoading } = useDoc<ERDocument>(docRef);

    // Fetch template to check permissions
    const templateRef = useMemo(() => firestore && document?.templateId ? tDoc('er_templates', document.templateId) : null, [firestore, document?.templateId, tDoc]);
    const { data: template } = useDoc<ERTemplate>(templateRef);

    // Баримтын төрлийн толгойн тохиргоог татах — preview/print дээр толгой
    // үүсгэхэд шаардлагатай (ERDocumentType.header).
    const docTypeRef = useMemo(
        () => firestore && document?.documentTypeId ? tDoc('er_process_document_types', document.documentTypeId) : null,
        [firestore, document?.documentTypeId, tDoc],
    );
    const { data: docType } = useDoc<ERDocumentType>(docTypeRef);

    // Metadata & Entities
    const [editContent, setEditContent] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [selectedPos, setSelectedPos] = useState<string>('');
    const [reviewers, setReviewers] = useState<string[]>([]);
    const [isReviewRequired, setIsReviewRequired] = useState(true);
    const [customInputValues, setCustomInputValues] = useState<Record<string, unknown>>({});
    const [fieldOverrides, setFieldOverrides] = useState<Record<string, string>>({});

    // Appointment system fields (зөвхөн appointment_* template-д харагдана)
    const [fullPosition, setFullPosition] = useState<FullPositionLike | null>(null);
    const [appointmentValues, setAppointmentValues] = useState<AppointmentFieldValues>({
        selectedSalaryStepIndex: null,
        selectedIncentives: [],
        selectedAllowances: [],
        enableOnboarding: false,
    });

    const departmentsQuery = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'departments') : null, []);
    const { data: departments } = useFetchCollection<Department & { managerId?: string; managerName?: string; managerPositionName?: string }>(departmentsQuery);

    const positionsQuery = useMemoFirebase(({ firestore, companyPath }) =>
        firestore && selectedDept ? query(tenantCollection(firestore, companyPath, 'positions'), where('departmentId', '==', selectedDept)) : null
        , [selectedDept]);
    const { data: positions } = useFetchCollection<Position & { jobTitle?: string }>(positionsQuery);

    const employeesQuery = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'employees') : null, []);
    const { data: employeesList } = useCollection<Employee>(employeesQuery);

    const allPositionsListQuery = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'positions') : null, []);
    const { data: allPositions } = useFetchCollection<Position & { managerId?: string }>(allPositionsListQuery);

    const occupiedPositions = useMemo<(Position & { managerId?: string; occupant: Employee })[] | []>(() => {
        if (!allPositions || !employeesList) return [];
        return allPositions
            .map((pos) => {
                const occupant = employeesList.find((emp) =>
                    (emp.positionId === pos.id || emp.id === pos.managerId) &&
                    ['active', 'active_probation', 'active_permanent', 'appointing'].includes(emp.status || 'active'),
                );
                return occupant ? { ...pos, occupant } : null;
            })
            .filter((p): p is Position & { managerId?: string; occupant: Employee } => p !== null);
    }, [allPositions, employeesList]);

    const [companyProfile, setCompanyProfile] = useState<Record<string, unknown> | null>(null);
    const [questionnaireData, setQuestionnaireData] = useState<Record<string, unknown> | null>(null);

    // selectedPos change → fetch position document (salarySteps/incentives/allowances авах)
    useEffect(() => {
        if (!firestore || !selectedPos) {
            setFullPosition(null);
            return;
        }
        let cancelled = false;
        getDoc(tDoc('positions', selectedPos))
            .then((snap) => {
                if (cancelled || !snap.exists()) return;
                const data = snap.data() as FullPositionLike;
                setFullPosition(data);
                // appointmentDetails-ээс indices restore: анх унших үед (хоосон) хийнэ
                if (document?.appointmentDetails &&
                    appointmentValues.selectedIncentives.length === 0 &&
                    appointmentValues.selectedAllowances.length === 0) {
                    const ad = document.appointmentDetails;
                    const incIndices = (ad.selectedIncentives || [])
                        .map((sel) => (data.incentives || []).findIndex((src) => src.type === sel.type && src.amount === sel.amount))
                        .filter((i) => i >= 0);
                    const allIndices = (ad.selectedAllowances || [])
                        .map((sel) => (data.allowances || []).findIndex((src) => src.type === sel.type && src.amount === sel.amount))
                        .filter((i) => i >= 0);
                    if (incIndices.length > 0 || allIndices.length > 0) {
                        setAppointmentValues((prev) => ({
                            ...prev,
                            selectedIncentives: incIndices,
                            selectedAllowances: allIndices,
                        }));
                    }
                }
            })
            .catch(() => { /* ignored */ });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firestore, selectedPos, tDoc, document?.appointmentDetails]);

    // ── P2-B: Parallel side-fetch ────────────────────────────────────────
    // company profile, questionnaire болон employee-ийн 3 fetch урьд нь
    // тусдаа useEffect-үүдээр дамжин sequential байсан. Тэдгээрийг нэг
    // useEffect дотор Promise.all-аар паралель болгож RTT-г 3→1 болгов.
    // employee fetch нь өмнө нь өөр effect-д байсныг доош нэгтгэв.
    useEffect(() => {
        if (!firestore) return;
        let cancelled = false;
        const tasks: Promise<unknown>[] = [
            getDoc(tDoc('company', 'profile'))
                .then((snap) => { if (!cancelled && snap.exists()) setCompanyProfile(snap.data()); })
                .catch(() => { /* профайл байхгүй ч хэвийн */ }),
        ];
        if (document?.employeeId) {
            tasks.push(
                getDoc(tDoc('employees', document.employeeId, 'questionnaire', 'data'))
                    .then((snap) => { if (!cancelled && snap.exists()) setQuestionnaireData(snap.data()); })
                    .catch(() => { /* questionnaire байхгүй ч хэвийн */ }),
            );
            if (!selectedEmployee) {
                tasks.push(
                    getDoc(tDoc('employees', document.employeeId))
                        .then((snap) => {
                            if (!cancelled && snap.exists()) {
                                setSelectedEmployee({ id: snap.id, ...(snap.data() as Omit<Employee, 'id'>) });
                            }
                        })
                        .catch(() => { /* fallback явуулна */ }),
                );
            }
        }
        // `allSettled` — task бүр өөрийн `.catch()`-тэй тул rejection bubble up биш.
        // Ирээдүйд task level error-ыг баяжуулахдаа эндхэн `.forEach(r => r.status === 'rejected' && log(...))`
        // pattern нэмж болно.
        Promise.allSettled(tasks);
        return () => { cancelled = true; };

    }, [firestore, document?.employeeId]);

    // Department enriched with manager name
    const enrichedDepartment = React.useMemo(() => {
        const dept = departments?.find(d => d.id === selectedDept);
        if (!dept) return undefined;
        if (dept.managerName) return dept; // аль хэдийн байна
        // managerId-аас employeesList-д хайна
        if (dept.managerId && employeesList) {
            const mgr = employeesList.find((e) => e.id === dept.managerId);
            if (mgr) {
                const mgrPos = positions?.find((p) => p.id === mgr.positionId);
                return {
                    ...dept,
                    managerName: [mgr.lastName, mgr.firstName].filter(Boolean).join(' '),
                    managerPositionName: mgrPos?.title || mgr.jobTitle || '',
                };
            }
        }
        return dept;
    }, [departments, selectedDept, employeesList, positions]);

    // UI States
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);


    // Print Handling
    const printComponentRef = React.useRef<HTMLDivElement>(null);
    const documentTemplateName = typeof document?.metadata?.templateName === 'string' ? document.metadata.templateName : '';
    const documentEmployeeName = typeof document?.metadata?.employeeName === 'string' ? document.metadata.employeeName : '';
    const documentDepartmentName = typeof document?.metadata?.departmentName === 'string' ? document.metadata.departmentName : '';
    const documentPositionName = typeof document?.metadata?.positionName === 'string' ? document.metadata.positionName : '';
    const documentJobTitle = typeof document?.metadata?.jobTitle === 'string' ? document.metadata.jobTitle : '';

    const handlePrint = useReactToPrint({
        contentRef: printComponentRef,
        documentTitle: documentTemplateName || 'Document',
        onAfterPrint: () => toast({ title: "Хэвлэх үйлдэл дууслаа" })
    });
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (document) {
            // Only set if current state is empty to avoid overwriting user edits
            if (!editContent) setEditContent(document.content || '');
            if (!selectedDept) setSelectedDept(document.departmentId || '');
            if (!selectedPos) setSelectedPos(document.positionId || '');
            if (reviewers.length === 0) setReviewers(document.reviewers || []);

            // Initialize custom inputs if not set
            if (Object.keys(customInputValues).length === 0 && document.customInputs) {
                setCustomInputValues(document.customInputs);
            }

            // Initialize appointment values from saved appointmentDetails (once)
            if (document.appointmentDetails && appointmentValues.selectedSalaryStepIndex == null &&
                appointmentValues.selectedIncentives.length === 0 &&
                appointmentValues.selectedAllowances.length === 0) {
                const ad = document.appointmentDetails;
                setAppointmentValues({
                    selectedSalaryStepIndex: ad.salaryStepIndex ?? null,
                    selectedIncentives: [],      // restored via type-match below
                    selectedAllowances: [],      // restored via type-match below
                    enableOnboarding: !!ad.enableOnboarding,
                });
            }

            // Initialize per-document field overrides if not set
            if (Object.keys(fieldOverrides).length === 0 && document.fieldOverrides) {
                setFieldOverrides(document.fieldOverrides);
            }

            // selectedEmployee fetch нь дээрх parallel-side fetch effect-д
            // нэгтгэгдсэн (P2-B) — энд дахин хийхгүй.
        }
    }, [document, firestore]);

    // Fetch current user's employee profile for position-based checks
    const currentUserProfileRef = useMemoFirebase(({ firestore, companyPath }) =>
        firestore && currentUser ? tenantDoc(firestore, companyPath, 'employees', currentUser.uid) : null, [currentUser]);
    const { data: currentUserProfile } = useDoc<Employee>(currentUserProfileRef);

    // ── Permissions (via hook) ────────────────────────────────────────────────
    const { matrix: rbacMatrix } = useERRbacMatrix();
    const permissions = useERPermissions({ document, currentUserId, currentUserProfile, reviewers, rbacMatrix });
    const {
        isOwner: _isOwner,
        isAdmin,
        isApprover,
        approveKeyForCurrentUser,
        canApproveFromCommentBox,
    } = permissions;

    // ActionId-г 3 эх үүсвэрээс детектлэнэ: template.metadata.actionId →
    // document.appointmentDetails.actionId → template/docType нэрнээс heuristic.
    const detectedActionId = useMemo(() => {
        const tplActionId = (template as unknown as { metadata?: { actionId?: string } })?.metadata?.actionId || '';
        if (tplActionId) return tplActionId;
        const docActionId = document?.appointmentDetails?.actionId || '';
        if (docActionId) return docActionId;
        // Heuristic — template name-аас автоматаар таамаглах
        const name = String(template?.name || '').toLowerCase();
        if (/туршилт/.test(name)) return 'appointment_probation';
        if (/эргүүлэн|дахин/.test(name)) return 'appointment_reappoint';
        if (/ажилтнаар.*томил|үндсэн.*томил|томил.*ажилтан/.test(name)) return 'appointment_permanent';
        return '';
    }, [template, document?.appointmentDetails]);

    const isAppointmentAction = useMemo(() => (
        detectedActionId === 'appointment_permanent' ||
        detectedActionId === 'appointment_probation' ||
        detectedActionId === 'appointment_reappoint'
    ), [detectedActionId]);

    // Computed appointmentDetails — saveDraft-т хадгалагдана.
    const computedAppointmentDetails = useMemo<AppointmentDetails | null>(() => {
        if (!isAppointmentAction || !fullPosition) return null;
        const actionId = detectedActionId;
        const steps = normalizeSalarySteps(fullPosition);
        const idx = appointmentValues.selectedSalaryStepIndex;
        const step = idx != null ? steps[idx] : undefined;
        return {
            actionId,
            salaryStepIndex: idx,
            salaryStepName: step?.name,
            salaryStepValue: step?.value,
            selectedIncentives: appointmentValues.selectedIncentives
                .map((i) => fullPosition.incentives?.[i])
                .filter((x): x is NonNullable<typeof x> => !!x),
            selectedAllowances: appointmentValues.selectedAllowances
                .map((i) => fullPosition.allowances?.[i])
                .filter((x): x is NonNullable<typeof x> => !!x),
            enableOnboarding: appointmentValues.enableOnboarding,
        };
    }, [isAppointmentAction, detectedActionId, fullPosition, appointmentValues]);

    // effectivePosition — сонгосон salaryStepIndex-ийг position.salarySteps.activeIndex-т
    // орлуулна. Ингэснээр resolvers болон preview дэх `{{position.salaryStepName}}` /
    // `{{position.salaryStepValue}}` placeholder-ууд сонголтоор шууд шинэчлэгдэнэ.
    const effectivePosition = useMemo(() => {
        const posData = positions?.find((p) => p.id === selectedPos);
        const idx = appointmentValues.selectedSalaryStepIndex;
        if (!fullPosition?.salarySteps || idx == null) return posData;
        // posData нь title/jobTitle-тэй хөнгөн object; fullPosition нь salarySteps,
        // incentives, allowances г.м бүх нэмэлт массиваар баяжигдсан. Хоёулаа нэгтгэнэ.
        return {
            ...(posData || {}),
            ...fullPosition,
            salarySteps: { ...fullPosition.salarySteps, activeIndex: idx },
        };
    }, [positions, selectedPos, fullPosition, appointmentValues.selectedSalaryStepIndex]);

    // effectiveCustomInputs — customInputValues + appointment-ийн системийн утгууд.
    // Template-д `{{system.selectedIncentives}}` гэх мэт placeholder байвал энд
    // орлогдож преview/chip-д шууд харагдана. Өөрчлөлт бүр useMemo-ээр re-compute.
    const effectiveCustomInputs = useMemo<Record<string, unknown>>(() => {
        const base: Record<string, unknown> = { ...customInputValues };
        // Appointment action биш бол зүгээр customInputValues буцаана
        if (!computedAppointmentDetails) return base;
        const inc = (computedAppointmentDetails.selectedIncentives || []).map((i) => i.type).filter(Boolean).join(', ');
        const all = (computedAppointmentDetails.selectedAllowances || []).map((a) => a.type).filter(Boolean).join(', ');
        if (inc) base['system.selectedIncentives'] = inc;
        if (all) base['system.selectedAllowances'] = all;
        base['system.onboardingEnabled'] = computedAppointmentDetails.enableOnboarding ? 'Тийм' : 'Үгүй';
        // Цалингийн шатлалын нэр/дүнг шууд key-р нэмэх (template-д шаардагдвал)
        if (computedAppointmentDetails.salaryStepName) base['system.salaryStepName'] = computedAppointmentDetails.salaryStepName;
        if (computedAppointmentDetails.salaryStepValue != null) base['system.salaryStepValue'] = computedAppointmentDetails.salaryStepValue;
        return base;
    }, [customInputValues, computedAppointmentDetails]);

    // contentWithHeader — Загварын `includeHeader` flag дээр тулгуурлан
    // baрimтын төрлийн (`ERDocumentType.header`) толгой HTML-ийг үндсэн
    // агуулгад автоматаар нэмж preview/print дээр харуулна. Template editor
    // preview-тэй (template-form.tsx) яг ижил гаралт.
    const headerHtml = useMemo(() => {
        return generateHeaderHtml({
            includeHeader: template?.includeHeader,
            documentType: docType ?? null,
            companyProfile: companyProfile ?? null,
        });
    }, [template?.includeHeader, docType, companyProfile]);

    const contentWithHeader = useMemo(() => {
        return headerHtml + (editContent || document?.content || '');
    }, [headerHtml, editContent, document?.content]);

    // ── Толгойн огноог гараар тохируулах ──
    // fieldOverrides-д `{{date.year}}` / `{{date.month}}` / `{{date.day}}`
    // түлхүүрүүдийг бичсэнээр system date placeholder-уудыг override хийнэ.
    // Default нь өнөөдрийн огноо (system date).
    const documentDateValue = useMemo(() => {
        const y = fieldOverrides['{{date.year}}'];
        const m = fieldOverrides['{{date.month}}'];
        const d = fieldOverrides['{{date.day}}'];
        if (y && m && d) return `${y}-${m}-${d}`;
        return '';
    }, [fieldOverrides]);

    const handleDocumentDateChange = useCallback((value: string) => {
        setFieldOverrides((prev) => {
            const next = { ...prev };
            if (!value) {
                delete next['{{date.year}}'];
                delete next['{{date.month}}'];
                delete next['{{date.day}}'];
                delete next['{{date.today}}'];
                return next;
            }
            const [y, m, d] = value.split('-');
            if (y) next['{{date.year}}'] = y;
            if (m) next['{{date.month}}'] = m;
            if (d) next['{{date.day}}'] = d;
            next['{{date.today}}'] = value;
            return next;
        });
    }, []);

    // ── Толгойн баримтын дугаарыг гараар тохируулах / харуулах ──
    // Default нь баримтад хадгалагдсан `document.documentNumber`.
    // fieldOverrides-д override бичсэн бол тэр нь түрүүлж харагдана.
    const documentNumberValue = useMemo(() => {
        return fieldOverrides['{{document.number}}'] ?? document?.documentNumber ?? '';
    }, [fieldOverrides, document?.documentNumber]);

    const handleDocumentNumberChange = useCallback((value: string) => {
        const trimmed = value.trim();
        setFieldOverrides((prev) => {
            const next = { ...prev };
            if (!trimmed) {
                delete next['{{document.number}}'];
            } else {
                next['{{document.number}}'] = trimmed;
            }
            return next;
        });
    }, []);

    // resolvedPrintContent — Хэвлэх үед PrintLayout түүхий template-ийг шууд
    // гаргадаг тул placeholder-уудыг preview-тэй ижил байдлаар resolve хийх
    // ёстой. Үгүй бол `{{...}}` болон тохируулсан хэсгүүд хэвлэгдэхгүй.
    const resolvedPrintContent = useMemo(() => {
        return generateDocumentContent(contentWithHeader, {
            employee: selectedEmployee,
            department: enrichedDepartment,
            position: effectivePosition,
            company: companyProfile,
            questionnaire: questionnaireData,
            system: {
                date: format(new Date(), 'yyyy-MM-dd'),
                year: format(new Date(), 'yyyy'),
                month: format(new Date(), 'MM'),
                day: format(new Date(), 'dd'),
                user: currentUser?.displayName || 'Системийн хэрэглэгч',
                documentNumber: document?.documentNumber,
            },
            customInputs: effectiveCustomInputs,
            fieldOverrides,
        });
    }, [contentWithHeader, document, selectedEmployee, enrichedDepartment, effectivePosition, companyProfile, questionnaireData, currentUser, effectiveCustomInputs, fieldOverrides]);

    // ── Document action handlers (via hook) ──────────────────────────────────
    // IMPORTANT: must be called before any early returns to preserve hook order
    const {
        fileInputRef,
        restoreTemplateContent,
        handleSaveDraft,
        handleSendForReview,
        handleApprove: _handleApprove,
        handleReject: _handleReject,
        handleFinalApprove,
        handleInstantApprove,
        handleSendToEmployeeForAcknowledgement,
        handleDelete: _handleDelete,
        handleFileUpload,
    } = useERDocumentActions({
        id: id || '',
        document: document || ({} as ERDocument),
        currentUserId,
        editContent,
        selectedDept,
        selectedPos,
        reviewers,
        isReviewRequired,
        customInputValues,
        fieldOverrides,
        appointmentDetails: computedAppointmentDetails,
        departments,
        positions,
        template: template ?? undefined,
        permissions,
        setEditContent,
        setIsSaving,
        setIsUploading,
    });

    // Wrap handlers that need local state (isDeleteDialogOpen).
    // useCallback — ActivityFeed component-д stable reference дамжуулна (React.memo-ын equality-д чухал).
    const handleApprove = React.useCallback((comment?: string) => _handleApprove(approveKeyForCurrentUser, comment), [_handleApprove, approveKeyForCurrentUser]);
    const handleReject = React.useCallback((comment: string) => _handleReject(approveKeyForCurrentUser, comment), [_handleReject, approveKeyForCurrentUser]);
    const handleDelete = React.useCallback(() => _handleDelete(() => setIsDeleteDialogOpen(false)), [_handleDelete]);

    if (!id) return <div className="p-10 text-center text-muted-foreground">Баримт олдсонгүй</div>;
    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    if (!document) return <div className="p-8 text-center bg-slate-50 h-screen"><p className="text-muted-foreground">Баримт олдсонгүй</p></div>;

    const currentStatus = document.status;
    const isOwner = _isOwner;

    // Status stepper визаул нь `./components/document-stepper.tsx`-т extract хийгдсэн.

    return (
        <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
            {/* Sticky Header */}
            <div className="bg-white border-b sticky top-0 z-30">
                <div className="px-6 md:px-8">
                    {/* Top Row: Back + Title + Actions */}
                    <div className="py-4">
                        <PageHeader
                            title={documentTemplateName || 'Баримт'}
                            description={[
                                selectedEmployee
                                    ? `${selectedEmployee.lastName || ''} ${selectedEmployee.firstName || ''}`.trim()
                                    : documentEmployeeName || 'Ажилтан сонгоогүй',
                                documentDepartmentName || null,
                            ].filter(Boolean).join(' • ')}
                            showBackButton
                            hideBreadcrumbs
                            backButtonPlacement="inline"
                            backBehavior="history"
                            fallbackBackHref="/dashboard/employment-relations"
                            actions={
                                <div className="flex items-center gap-2">
                                    <Badge className={cn("shrink-0 text-[10px]", DOCUMENT_STATUSES[currentStatus].color)}>
                                        {DOCUMENT_STATUSES[currentStatus].label}
                                    </Badge>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => handlePrint && handlePrint()}
                                        title="Хэвлэх"
                                    >
                                        <Printer className="h-4 w-4" />
                                    </Button>

                                    {(currentStatus === 'DRAFT' || currentStatus === 'IN_REVIEW') && (
                                        <>
                                            {/* DRAFT/IN_REVIEW төлөвт эзэмшигч (creator) болон админ хэзээд устгаж болно. */}
                                            {(isOwner || isAdmin) && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSaving} title="Устгах">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm" className="h-8" onClick={handleSaveDraft} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                                                Хадгалах
                                            </Button>
                                            {currentStatus === 'DRAFT' && (
                                                <Button size="sm" className="h-8" onClick={handleSendForReview} disabled={isSaving}>
                                                    <Send className="h-3.5 w-3.5 mr-1.5" />
                                                    Илгээх
                                                </Button>
                                            )}
                                            {currentStatus === 'DRAFT' && (isOwner || isAdmin) && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                                    onClick={handleInstantApprove}
                                                    disabled={isSaving}
                                                    title="Хяналт, танилцуулах үе шатыг алгасаж шууд хүчин төгөлдөр болгоно"
                                                >
                                                    <Zap className="h-3.5 w-3.5 mr-1.5" />
                                                    Шууд батлах
                                                </Button>
                                            )}
                                        </>
                                    )}
                                    {currentStatus === 'IN_REVIEW' && isApprover && !!approveKeyForCurrentUser && document.approvalStatus?.[approveKeyForCurrentUser]?.status !== 'APPROVED' && (
                                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove()} disabled={isSaving}>
                                            <Check className="h-3.5 w-3.5 mr-1.5" />
                                            Батлах
                                        </Button>
                                    )}
                                    {currentStatus === 'REVIEWED' && (isOwner || isAdmin) && (
                                        <>
                                            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} />
                                            <Button variant="outline" size="sm" className="h-8" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                                {isUploading ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                                                Эх хувь
                                            </Button>
                                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleFinalApprove} disabled={isSaving || isUploading}>
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                                Батлах
                                            </Button>
                                        </>
                                    )}
                                    {/* Админд REVIEWED-оос хойших бүх төлөвт устгах боломж нээлттэй.
                                        SENT_TO_EMPLOYEE / ACKNOWLEDGED байсан ч админ rollback-тай устгана. */}
                                    {(currentStatus === 'REVIEWED' || currentStatus === 'APPROVED' || currentStatus === 'SIGNED' || currentStatus === 'SENT_TO_EMPLOYEE' || currentStatus === 'ACKNOWLEDGED') && isAdmin && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSaving} title="Устгах">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {/* Гарын үсэгтэй эх хувийг үргэлж харах товч.
                                        Хавсаргаагүй бол disabled + "Хавсаргаагүй" гэсэн заавартай. */}
                                    {document.signedDocUrl ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                            onClick={() => window.open(document.signedDocUrl, '_blank')}
                                            title="Гарын үсэгтэй эх хувийг харах"
                                        >
                                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                                            Эх хувь
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-muted-foreground"
                                            disabled
                                            title="Гарын үсэгтэй эх хувь хавсаргаагүй байна"
                                        >
                                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                                            Эх хувь хавсаргаагүй
                                        </Button>
                                    )}

                                    {(currentStatus === 'SIGNED' || currentStatus === 'APPROVED') && (isOwner || isAdmin) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                            onClick={handleSendToEmployeeForAcknowledgement}
                                            disabled={isSaving}
                                            title="Ажилтанд танилцуулахаар илгээх"
                                        >
                                            <Send className="h-3.5 w-3.5 mr-1.5" />
                                            Танилцуулах
                                        </Button>
                                    )}
                                </div>
                            }
                        />
                    </div>
                    
                    {/* Progress Stepper Row — extracted to DocumentStepper */}
                    <DocumentStepper currentStatus={currentStatus} />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8 space-y-6 pb-32">

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Sidebar */}
                    <div className="xl:col-span-1 space-y-4">
                        {/* Entity Info Card — extracted */}
                        <EntityInfoCard
                            employeeDisplayName={
                                selectedEmployee
                                    ? `${selectedEmployee.lastName || ''} ${selectedEmployee.firstName || ''}`.trim()
                                    : documentEmployeeName || 'Сонгоогүй'
                            }
                            departmentName={
                                documentDepartmentName ||
                                departments?.find((d) => d.id === selectedDept)?.name ||
                                'Мэдээлэлгүй'
                            }
                            positionName={
                                documentPositionName ||
                                positions?.find((p) => p.id === selectedPos)?.title ||
                                'Мэдээлэлгүй'
                            }
                        />

                        {/* Reviewers Card */}
                        <div className="bg-white rounded-xl border overflow-hidden">
                            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span className="text-sm font-medium">Хянагчид</span>
                                </div>
                                {reviewers.length > 0 && (
                                    <Badge variant="secondary" className="bg-white/20 text-white text-[10px]">
                                        {reviewers.length}
                                    </Badge>
                                )}
                            </div>
                            <div className="p-4 space-y-3">
                                {(currentStatus === 'DRAFT' || currentStatus === 'IN_REVIEW') && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs text-slate-600">Хянуулах</Label>
                                            <Switch
                                                checked={isReviewRequired}
                                                onCheckedChange={(checked) => {
                                                    setIsReviewRequired(checked);
                                                    if (!checked) setReviewers([]);
                                                }}
                                            />
                                        </div>

                                        {isReviewRequired && (
                                            <Select onValueChange={(posId) => {
                                                if (posId && !reviewers.includes(posId)) {
                                                    setReviewers([...reviewers, posId]);
                                                }
                                            }}>
                                                <SelectTrigger className="text-xs h-9">
                                                    <SelectValue placeholder="Хянагч нэмэх..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {occupiedPositions?.length === 0 ? (
                                                        <div className="p-2 text-xs text-slate-400 text-center">Сонгох боломжтой албан тушаал алга</div>
                                                    ) : (
                                                        occupiedPositions?.map((pos) => {
                                                            if (!pos) return null;
                                                            return (
                                                                <SelectItem key={pos.id} value={pos.id}>
                                                                    <span className="font-medium">{pos.title}</span>
                                                                    <span className="text-slate-400 ml-1">- {pos.occupant?.firstName}</span>
                                                                </SelectItem>
                                                            );
                                                        })
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </>
                                )}

                                <div className="space-y-2">
                                    {reviewers.map((rid) => {
                                        const pos = allPositions?.find(p => p.id === rid);
                                        const occupant = employeesList?.find(u => u.positionId === rid || u.id === rid);
                                        const status = document.approvalStatus?.[occupant?.id || rid];

                                        return (
                                            <div key={rid} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 group">
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarImage src={occupant?.photoURL} />
                                                    <AvatarFallback className="text-xs bg-slate-200">{pos?.title?.charAt(0) || '?'}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium truncate">{occupant ? `${occupant.firstName} ${occupant.lastName}` : 'Сул'}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{pos?.title}</p>
                                                </div>
                                                {status?.status === 'APPROVED' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                                {status?.status === 'REJECTED' && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
                                                {status?.status === 'PENDING' && <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                                                {(currentStatus === 'DRAFT' || currentStatus === 'IN_REVIEW') && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500" onClick={() => setReviewers(reviewers.filter(r => r !== rid))}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {reviewers.length === 0 && (
                                        <p className="text-xs text-center text-slate-400 py-3">Хянагч байхгүй</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Custom Inputs — extracted */}
                        {(currentStatus === 'DRAFT' || currentStatus === 'IN_REVIEW') &&
                            template?.customInputs &&
                            template.customInputs.length > 0 && (
                                <CustomInputsPanel
                                    customInputs={template.customInputs}
                                    values={customInputValues}
                                    onChange={setCustomInputValues}
                                />
                            )}

                        {/* Activity Feed for mobile/tablet */}
                        {currentStatus !== 'DRAFT' && (
                            <div className="xl:hidden bg-white rounded-xl border overflow-hidden">
                                <div className="px-4 py-3 border-b flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-medium">Түүх & Коммент</span>
                                </div>
                                <div className="h-[400px]">
                                    <ActivityFeed
                                        documentId={id}
                                        employeesList={employeesList || []}
                                        isApprover={isApprover}
                                        isAdmin={isAdmin}
                                        canApprove={canApproveFromCommentBox}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        canFinalApprove={(isOwner || isAdmin) && currentStatus === 'REVIEWED'}
                                        onFinalApprove={handleFinalApprove}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="xl:col-span-2 space-y-4">
                        {/* Rejection Alert — extracted */}
                        {currentStatus === 'DRAFT' && (
                            <RejectionAlert
                                approvalStatus={document.approvalStatus}
                                employeesList={employeesList}
                            />
                        )}

                        {/* Document Preview Card */}
                        <div className="bg-white rounded-xl border overflow-hidden">
                            {/* Preview Header */}
                            <div className="px-4 py-3 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-medium">Баримтын харагдац</span>
                                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">Live</Badge>
                                </div>
                                {(currentStatus === 'DRAFT' || currentStatus === 'IN_REVIEW') && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setIsEditorOpen(true)}
                                    >
                                        <Edit3 className="h-3 w-3 mr-1.5" />
                                        Засах
                                    </Button>
                                )}
                            </div>
                            
                            {/* Document Preview — extracted to DocumentPreview */}
                            <div className="bg-slate-100 p-6 md:p-10">
                                <div className="max-w-3xl mx-auto">
                                    <DocumentPreview
                                        content={contentWithHeader}
                                        printSettings={document?.printSettings}
                                        companyProfile={companyProfile}
                                        documentId={id}
                                        companyId={tenantCompanyId}
                                        resolvers={{
                                            employee: selectedEmployee,
                                            department: enrichedDepartment,
                                            position: effectivePosition,
                                            company: companyProfile,
                                            questionnaire: questionnaireData,
                                            system: {
                                                date: format(new Date(), 'yyyy-MM-dd'),
                                                year: format(new Date(), 'yyyy'),
                                                month: format(new Date(), 'MM'),
                                                day: format(new Date(), 'dd'),
                                                user: currentUser?.displayName || 'Системийн хэрэглэгч',
                                                documentNumber: document.documentNumber,
                                            },
                                            customInputs: effectiveCustomInputs,
                                            fieldOverrides,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hidden Print Layout */}
                        <div style={{ display: 'none' }}>
                            <PrintLayout
                                ref={printComponentRef}
                                content={resolvedPrintContent}
                                settings={document?.printSettings}
                                documentId={id}
                                companyId={tenantCompanyId}
                            />
                        </div>

            {/* Editor Dialog — бүтэн дэлгэцээр, тусдаа хуудас шиг UX */}
            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                <DialogContent className="max-w-none w-screen h-screen sm:rounded-none p-0 flex flex-col overflow-hidden gap-0 border-0">
                    <DialogHeader className="p-4 border-b bg-slate-50 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-white">
                                    <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-semibold">Агуулга засах</DialogTitle>
                                    <p className="text-xs text-muted-foreground">Ажлын байр, цалин, нэмэлт утгуудыг зэрэг сонгож өөрчилнө</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={restoreTemplateContent}>
                                    <Undo2 className="h-3.5 w-3.5 mr-1.5" /> Сэргээх
                                </Button>
                                <Button size="sm" className="h-8 text-xs" onClick={() => setIsEditorOpen(false)}>
                                    <Check className="h-3.5 w-3.5 mr-1.5" /> Дуусгах
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Dialog body — хоёр багана: засах (зүүн) / бодит харагдац (баруун) */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
                    {/* LEFT — metadata + editor */}
                    <div className="flex flex-col overflow-y-auto border-r">
                    {/* Metadata panel — create page-ийн сонголтуудтай ижил: dept + position + custom inputs */}
                    {(currentStatus === 'DRAFT' || currentStatus === 'IN_REVIEW') && (
                        <div className="px-6 pt-4 pb-3 border-b bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                                        <FileText className="h-3 w-3" /> Баримтын дугаар
                                    </Label>
                                    <Input
                                        value={documentNumberValue}
                                        onChange={(e) => handleDocumentNumberChange(e.target.value)}
                                        className="h-9 text-xs font-mono"
                                        placeholder="ГЭР-2026-0001"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        {fieldOverrides['{{document.number}}']
                                            ? 'Гараар тохируулсан'
                                            : document?.documentNumber
                                              ? 'Системээс автоматаар олгосон'
                                              : 'Дугаар олгогдоогүй — гараар бичнэ үү'}
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                                        <CalendarIcon className="h-3 w-3" /> Баримтын огноо
                                    </Label>
                                    <div className="flex gap-1">
                                        <Input
                                            type="date"
                                            value={documentDateValue}
                                            onChange={(e) => handleDocumentDateChange(e.target.value)}
                                            className="h-9 text-xs"
                                            placeholder="Системийн огноо"
                                        />
                                        {documentDateValue && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-9 px-2 shrink-0"
                                                onClick={() => handleDocumentDateChange('')}
                                                title="Системийн огноо руу буцаах"
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {documentDateValue ? 'Гараар тохируулсан' : 'Өнөөдрийн огноог автоматаар хэрэглэнэ'}
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                                        <Building2 className="h-3 w-3" /> Албан нэгж
                                    </Label>
                                    <Select
                                        value={selectedDept}
                                        onValueChange={(v) => {
                                            setSelectedDept(v);
                                            // department өөрчлөгдвөл position-г дахин сонгуулна
                                            setSelectedPos('');
                                        }}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Албан нэгж сонгох" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments?.map((d) => (
                                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                                        <Briefcase className="h-3 w-3" /> Ажлын байр
                                    </Label>
                                    <Select
                                        value={selectedPos}
                                        onValueChange={setSelectedPos}
                                        disabled={!selectedDept}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder={selectedDept ? 'Ажлын байр сонгох' : 'Эхлээд албан нэгж сонгоно уу'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {positions?.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Appointment action-ийн системийн утгууд — ажлын байранд тохируулсан цалин/урамшуулал/хангамж */}
                            {isAppointmentAction && selectedPos && (
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                                        <Label className="text-[11px] uppercase tracking-wider text-emerald-700 font-semibold">
                                            Ажлын байрны цалин, хангамж, нэмэгдэл
                                        </Label>
                                    </div>
                                    <AppointmentActionFields
                                        position={fullPosition}
                                        values={appointmentValues}
                                        onChange={setAppointmentValues}
                                    />
                                </div>
                            )}

                            {/* Template-ийн нэмэлт утгууд (цалин г.м) */}
                            {template?.customInputs && template.customInputs.length > 0 && (
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <Wand2 className="h-3.5 w-3.5 text-primary" />
                                        <Label className="text-[11px] uppercase tracking-wider text-primary font-semibold">
                                            Нэмэлт утгууд
                                        </Label>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {[...(template.customInputs || [])]
                                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                                            .map((input, idx) => (
                                                <div key={`dlg-${input.key || 'input'}-${input.order ?? idx}`} className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs text-slate-600">
                                                            {input.label}
                                                            {input.required && <span className="text-rose-500 ml-0.5">*</span>}
                                                        </Label>
                                                        {input.type === 'boolean' && (
                                                            <Switch
                                                                checked={customInputValues[input.key] === 'Тийм'}
                                                                onCheckedChange={(c) => setCustomInputValues((prev) => ({ ...prev, [input.key]: c ? 'Тийм' : 'Үгүй' }))}
                                                            />
                                                        )}
                                                    </div>
                                                    {input.type !== 'boolean' && (
                                                        <Input
                                                            type={input.type === 'number' ? 'number' : input.type === 'date' ? 'date' : 'text'}
                                                            value={String(customInputValues[input.key] ?? '')}
                                                            onChange={(e) => setCustomInputValues((prev) => ({ ...prev, [input.key]: e.target.value }))}
                                                            placeholder={input.description || `${input.label}...`}
                                                            className="h-8 text-xs"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="p-6 bg-slate-50">
                        <TemplateBuilder
                            content={editContent}
                            onChange={setEditContent}
                            resolvers={getReplacementMap({
                                employee: selectedEmployee,
                                department: enrichedDepartment,
                                position: effectivePosition,
                                company: companyProfile,
                                questionnaire: questionnaireData,
                                system: {
                                    date: format(new Date(), 'yyyy-MM-dd'),
                                    year: format(new Date(), 'yyyy'),
                                    month: format(new Date(), 'MM'),
                                    day: format(new Date(), 'dd'),
                                    user: currentUser?.displayName || 'Системийн хэрэглэгч',
                                    documentNumber: document.documentNumber,
                                },
                                customInputs: effectiveCustomInputs,
                                // chip дэх "Эх утга" нь overridе-ыг хэрэглэхгүй — зөвхөн source-ыг харуулна
                            })}
                            overrides={fieldOverrides}
                            onOverridesChange={setFieldOverrides}
                            disabled={!(currentStatus === 'DRAFT' || currentStatus === 'IN_REVIEW')}
                            printSettings={document.printSettings}
                        />
                    </div>
                    </div>

                    {/* RIGHT — live preview of generated document */}
                    <div className="overflow-y-auto bg-slate-100">
                        <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur px-6 py-3 border-b flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span className="text-sm font-medium">Бодит харагдац</span>
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">Live</Badge>
                        </div>
                        <div className="p-6">
                            <DocumentPreview
                                variant="compact"
                                content={contentWithHeader}
                                printSettings={document?.printSettings}
                                companyProfile={companyProfile}
                                documentId={id}
                                companyId={tenantCompanyId}
                                resolvers={{
                                    employee: selectedEmployee,
                                    department: enrichedDepartment,
                                    position: effectivePosition,
                                    company: companyProfile,
                                    questionnaire: questionnaireData,
                                    system: {
                                        date: format(new Date(), 'yyyy-MM-dd'),
                                        year: format(new Date(), 'yyyy'),
                                        month: format(new Date(), 'MM'),
                                        day: format(new Date(), 'dd'),
                                        user: currentUser?.displayName || 'Системийн хэрэглэгч',
                                        documentNumber: document.documentNumber,
                                    },
                                    customInputs: effectiveCustomInputs,
                                    fieldOverrides,
                                }}
                            />
                        </div>
                    </div>
                    </div>
                </DialogContent>
            </Dialog>

                        {/* Activity Feed for desktop */}
                        {currentStatus !== 'DRAFT' && (
                            <div className="hidden xl:block bg-white rounded-xl border overflow-hidden">
                                <div className="px-4 py-3 border-b flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-medium">Түүх & Коммент</span>
                                </div>
                                <div className="h-[450px]">
                                    <ActivityFeed
                                        documentId={id}
                                        employeesList={employeesList || []}
                                        isApprover={isApprover}
                                        isAdmin={isAdmin}
                                        canApprove={canApproveFromCommentBox}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        canFinalApprove={(isOwner || isAdmin) && currentStatus === 'REVIEWED'}
                                        onFinalApprove={handleFinalApprove}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </div>

            {/* Delete Dialog — extracted */}
            <DeleteConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                isSaving={isSaving}
            />
        </div>
    );
}

