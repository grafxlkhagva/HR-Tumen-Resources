// src/app/dashboard/employees/[id]/page.tsx
'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { useFirebase, useDoc, useMemoFirebase, useCollection, useFetchCollection, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser, tenantCollection, tenantDoc, tenantEmployeeSubdoc, useTenantWrite } from '@/firebase';
import { useTenant } from '@/contexts/tenant-context';
import { query, where, getDocs, updateDoc, getCountFromServer, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { type Employee } from '../data';
import { isActiveStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Camera,
    User,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Loader2,
    CheckCircle2,
    ShieldCheck,
    ShieldAlert,
    Crown,
    Clock,
    Sparkles,
    Lock,
    Unlock,
    GraduationCap,
    TrendingUp,
    LogOut,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ERDocument } from '../../employment-relations/types';

import { SettingRow } from '@/components/ui/setting-row';
import { normalizePhoneNumber } from '@/lib/phone-utils';
import { DetailSidebarLayout, type DetailTab } from '@/components/patterns/detail-sidebar-layout';
import { BASE_TABS, statusConfig, type Department, type Position, type WorkSchedule } from './constants';
import { HistoryTabContent } from './history-tab-content';
import { DocumentsTabContent } from './documents-tab-content';
import { ProfileSkeleton } from './profile-skeleton';

import { VacationTabContent } from './vacation-tab-content';
import { OnboardingTabContent } from './onboarding-tab-content';
import { OffboardingTabContent } from './offboarding-tab-content';

import { SystemSettingsTabContent } from './system-settings-tab-content';
import { QuestionnaireTabContent } from './questionnaire-tab-content';
import { LifecycleTabContent } from './lifecycle-tab-content';
import { SkillsTabContent } from './skills-tab-content';
import { VerificationDialog } from './verification-dialog';
import { MakeAdminDialog } from './make-admin-dialog';
import { EmployeeInsightPanel } from './employee-insight-panel';
import { EmployeeAstrologyCard } from './employee-astrology-card';
import { EmployeeContractsTab } from '@/components/legal/employee-contracts-tab';
import { ProbationAlert } from '@/components/legal/probation-alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Project, Task } from '@/types/project';
import { NegeAiIcon } from '@/components/icons/nege-ai-icon';

/**
 * AI дүгнэлт цэсний дотоод таб — `insight` (үндсэн дүгнэлт) + `astrology` (зурхай).
 * Зурхай нь өмнө тусдаа цэс байсныг энд нэгтгэв.
 */
function AiInsightWithAstrology({
    employeeId,
    employeeName,
    birthDate,
}: {
    employeeId: string;
    employeeName: string;
    birthDate?: string | null;
}) {
    const [view, setView] = React.useState<'insight' | 'astrology'>('insight');
    return (
        <div className="space-y-4">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted border">
                <button
                    type="button"
                    onClick={() => setView('insight')}
                    className={cn(
                        'px-4 h-8 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5',
                        view === 'insight'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI дүгнэлт
                </button>
                <button
                    type="button"
                    onClick={() => setView('astrology')}
                    className={cn(
                        'px-4 h-8 rounded-lg text-xs font-semibold transition-colors',
                        view === 'astrology'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    Зурхай
                </button>
            </div>
            {view === 'insight' ? (
                <EmployeeInsightPanel employeeId={employeeId} employeeName={employeeName} />
            ) : (
                <EmployeeAstrologyCard birthDate={birthDate} />
            )}
        </div>
    );
}

export default function EmployeeProfilePage() {
    return (
        <React.Suspense fallback={
            <div className="py-8 min-h-screen container mx-auto max-w-7xl">
                <ProfileSkeleton />
            </div>
        }>
            <EmployeeProfilePageInner />
        </React.Suspense>
    );
}

function EmployeeProfilePageInner() {
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { storage } = useFirebase();
    const { firestore, tDoc, tCollection } = useTenantWrite();
    const { toast } = useToast();
    const { user } = useUser();
    const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
    const photoInputRef = React.useRef<HTMLInputElement>(null);
    

    // Make admin dialog state
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = React.useState(searchParams.get('tab') || 'profile');
    const [makeAdminOpen, setMakeAdminOpen] = React.useState(false);

    // Questionnaire header actions state
    const [isCVDialogOpen, setIsCVDialogOpen] = React.useState(false);
    const [isTogglingLock, setIsTogglingLock] = React.useState(false);

    // Verification dialog state
    const [verifyDialogOpen, setVerifyDialogOpen] = React.useState(false);
    const [verifyType, setVerifyType] = React.useState<'email' | 'phone'>('email');
    const [verifyTarget, setVerifyTarget] = React.useState('');

    // employee/companyId нь callbacks-ээс хойд талд declare хийгддэг тул latest утгыг ref-ээр унших.
    const employeeLatestRef = React.useRef<Employee | null>(null);
    const companyIdRef = React.useRef<string | null>(null);

    // Per-field inline save
    const saveEmployeeField = React.useCallback(async (patch: Record<string, string>) => {
        if (!employeeId) return;
        const empRef = tDoc('employees', employeeId);
        const current = employeeLatestRef.current;
        const finalPatch: Record<string, unknown> = { ...patch };
        if ('email' in patch && (patch.email || '') !== (current?.email || '')) {
            finalPatch.emailVerified = false;
            finalPatch.emailVerifiedAt = deleteField();
        }
        if ('phoneNumber' in patch && (patch.phoneNumber || '') !== (current?.phoneNumber || '')) {
            finalPatch.phoneVerified = false;
            finalPatch.phoneVerifiedAt = deleteField();
        }
        try {
            await updateDoc(empRef, finalPatch);
            toast({ title: 'Хадгалагдлаа' });
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'employees', action: 'save-field' } });
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалахад алдаа гарлаа.' });
            throw error;
        }
    }, [employeeId, tDoc, toast]);

    const handleOpenVerify = React.useCallback((type: 'email' | 'phone', target: string) => {
        setVerifyType(type);
        setVerifyTarget(target);
        setVerifyDialogOpen(true);
    }, []);

    const handleVerified = React.useCallback(() => {
        toast({ title: 'Амжилттай', description: 'Баталгаажуулалт амжилттай боллоо' });
    }, [toast]);

    const handlePhotoSelected = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const currentEmployee = employeeLatestRef.current;
        const currentCompanyId = companyIdRef.current;
        if (!file || !firestore || !storage || !employeeId || !currentCompanyId) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Зөвхөн зураг (JPG, PNG, WebP) оруулна уу.' });
            if (photoInputRef.current) photoInputRef.current.value = '';
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Файл хэт том байна (8MB-с бага байх ёстой).' });
            if (photoInputRef.current) photoInputRef.current.value = '';
            return;
        }

        const oldPhotoURL = currentEmployee?.photoURL;
        const newStorageRef = ref(storage, `employee-photos/${currentCompanyId}/${employeeId}/${Date.now()}-${file.name}`);

        setIsUploadingPhoto(true);
        try {
            // 1) Шинэ зургийг upload хийнэ
            await uploadBytes(newStorageRef, file);
            const url = await getDownloadURL(newStorageRef);

            // 2) Doc-ийг шинэчилнэ — амжилтгүй бол шинэ object-ийг буцааж устгана
            try {
                const empRef = tDoc('employees', employeeId);
                await updateDoc(empRef, { photoURL: url });
            } catch (docError) {
                try { await deleteObject(newStorageRef); } catch { /* cleanup best-effort */ }
                throw docError;
            }

            // 3) Doc амжилттай шинэчлэгдсэний дараа хуучин зургийг устгана (best-effort)
            if (oldPhotoURL && oldPhotoURL.includes('firebase')) {
                try {
                    await deleteObject(ref(storage, oldPhotoURL));
                } catch { /* хуучин зураг устгах алдаа — алгасах */ }
            }

            toast({ title: 'Амжилттай', description: 'Аватар зураг шинэчлэгдлээ' });
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'employees', action: 'photo-upload' } });
            console.error('Photo upload error:', error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Зураг солиход алдаа гарлаа' });
        } finally {
            setIsUploadingPhoto(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    }, [employeeId, firestore, storage, toast, tDoc]);

    const employeeDocRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore && employeeId ? tenantDoc(firestore, companyPath, 'employees', employeeId) : null),
        [employeeId]
    );

    const departmentsQuery = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'departments') : null),
        []
    );

    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef as any);
    employeeLatestRef.current = employee ?? null;

    const handleToggleQuestionnaireLock = React.useCallback(async () => {
        if (!employeeDocRef || isTogglingLock) return;
        setIsTogglingLock(true);
        const currentlyLocked = !!employee?.questionnaireLocked;
        try {
            await updateDoc(employeeDocRef, { questionnaireLocked: !currentlyLocked });
            toast({
                title: !currentlyLocked ? 'Анкет түгжигдлээ' : 'Анкетийн түгжээ нээгдлээ',
                description: !currentlyLocked
                    ? 'Ажилтан өөрийн анкетийг засах боломжгүй боллоо.'
                    : 'Ажилтан өөрийн анкетийг засах боломжтой боллоо.',
            });
        } catch (error) {
            Sentry.captureException(error, { tags: { module: 'employees', action: 'toggle-lock' } });
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Түгжээний төлөв өөрчлөхөд алдаа гарлаа' });
        } finally {
            setIsTogglingLock(false);
        }
    }, [employeeDocRef, isTogglingLock, employee, toast]);

    // Fetch questionnaire for gender & birthDate
    const questionnaireDocRef = useMemoFirebase(
        ({ firestore, companyPath }) =>
          firestore && employeeId ? tenantEmployeeSubdoc(firestore, companyPath, employeeId, 'questionnaire', 'data') : null,
        [employeeId]
    );
    const { data: questionnaireData } = useDoc<any>(questionnaireDocRef as any);

    const positionDocRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore && employee?.positionId ? tenantDoc(firestore, companyPath, 'positions', employee.positionId) : null),
        [employee]
    );

    const { data: position, isLoading: isLoadingPosition } = useDoc<Position>(positionDocRef as any);

    const workScheduleDocRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore && position?.workScheduleId ? tenantDoc(firestore, companyPath, 'workSchedules', position.workScheduleId) : null),
        [position?.workScheduleId]
    );

    const { data: workSchedule, isLoading: isLoadingWorkSchedule } = useDoc<WorkSchedule>(workScheduleDocRef as any);

    const orgActionsRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'organization_actions') : null),
        []
    );
    const { data: orgActions, isLoading: isLoadingOrgActions } = useFetchCollection<any>(orgActionsRef);


    // NOTE: `(employeeId, createdAt)` composite index байхгүй учир orderBy
    // хасаад client-side-д эрэмбэлнэ (HistoryTabContent нь аль хэдийн sort
    // хийдэг). `limit` ч мөн client-side дарна.
    const erDocumentsQuery = React.useMemo(() =>
        firestore && employeeId ? query(
            tCollection('er_documents'),
            where('employeeId', '==', employeeId)
        ) : null
        , [firestore, employeeId, tCollection]);

    const { data: erDocuments, isLoading: isLoadingDocs } = useCollection<ERDocument>(erDocumentsQuery as any);

    // Fetch onboarding process for this employee
    const onboardingProcessRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore && employeeId ? tenantDoc(firestore, companyPath, 'onboarding_processes', employeeId) : null),
        [employeeId]
    );
    const { data: onboardingProcess, isLoading: isLoadingOnboarding } = useDoc<any>(onboardingProcessRef as any);

    // Fetch offboarding projects for this employee (project-based)
    const offboardingProjectsQuery = useMemoFirebase(({ firestore, companyPath }) => {
        if (!firestore || !employeeId) return null;
        return query(
            tenantCollection(firestore, companyPath, 'projects'),
            where('type', '==', 'offboarding'),
            where('offboardingEmployeeId', '==', employeeId)
        );
    }, [employeeId]);
    const { data: offboardingProjects, isLoading: isLoadingOffboarding } = useCollection<Project>(offboardingProjectsQuery as any);
    const [offboardingTaskCounts, setOffboardingTaskCounts] = React.useState<Record<string, { total: number; completed: number }>>({});

    // Calculate onboarding progress
    const onboardingProgress = React.useMemo(() => {
        if (!onboardingProcess?.stages) return 0;
        const stages = onboardingProcess.stages;
        let totalTasks = 0;
        let completedTasks = 0;
        stages.forEach((stage: any) => {
            if (stage.tasks) {
                totalTasks += stage.tasks.length;
                completedTasks += stage.tasks.filter((t: any) => t.completed).length;
            }
        });
        return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }, [onboardingProcess]);

    React.useEffect(() => {
        let cancelled = false;

        async function fetchOffboardingCounts() {
            if (!firestore || !offboardingProjects || offboardingProjects.length === 0) return;
            const counts: Record<string, { total: number; completed: number }> = {};
            const projectsToFetch = offboardingProjects.slice(0, 10);
            // getCountFromServer aggregation — task бүрийн data татахгүйгээр
            // зөвхөн тоог уншина. Project тутамд ~10+ task эвритэй үед уншилт
            // 5-10x багасна (full fetch → 2 count query).
            const entries = await Promise.all(
                projectsToFetch.map(async (p) => {
                    if (cancelled) return null;
                    const tasksRef = tCollection('projects', p.id, 'tasks');
                    const [totalSnap, doneSnap] = await Promise.all([
                        getCountFromServer(tasksRef),
                        getCountFromServer(query(tasksRef, where('status', '==', 'DONE'))),
                    ]);
                    return [p.id, {
                        total: totalSnap.data().count,
                        completed: doneSnap.data().count,
                    }] as const;
                })
            );
            if (cancelled) return;
            for (const entry of entries) {
                if (entry) counts[entry[0]] = entry[1];
            }
            if (!cancelled) setOffboardingTaskCounts(counts);
        }
        fetchOffboardingCounts();
        return () => { cancelled = true; };

    }, [firestore, offboardingProjects, tCollection]);

    const offboardingProgress = React.useMemo(() => {
        const ps = offboardingProjects || [];
        let total = 0;
        let done = 0;
        ps.forEach(p => {
            const c = offboardingTaskCounts[p.id];
            if (!c) return;
            total += c.total;
            done += c.completed;
        });
        return total > 0 ? Math.round((done / total) * 100) : 0;
    }, [offboardingProjects, offboardingTaskCounts]);

    const { data: departments, isLoading: isLoadingDepts } = useFetchCollection<Department>(departmentsQuery as any);

    const currentUserEmployeeRef = useMemoFirebase(
        ({ firestore, companyPath, user }) => (firestore && user ? tenantDoc(firestore, companyPath, 'employees', user.uid) : null),
        [user?.uid]
    );
    const { data: currentUserEmployee } = useDoc<Employee>(currentUserEmployeeRef as any);
    const { role: tenantRole, companyId } = useTenant();
    companyIdRef.current = companyId ?? null;
    // super_admin нь employees doc-д байхгүй байж болно → token claims-аас авна
    const currentUserRole = (tenantRole === 'super_admin' ? 'super_admin' : currentUserEmployee?.role) as
        'super_admin' | 'company_super_admin' | 'admin' | 'manager' | 'employee' | undefined;

    // Profile-ийн үндсэн skeleton зөвхөн employee + departments хүлээнэ.
    // Бусад тусдаа модулиудын data (onboarding, offboarding, ER docs гэх мэт) өөрсдийн loading state-тэй.
    const isLoading = isLoadingEmployee || isLoadingDepts;

    const { effectiveHireDate, probationEndDate, effectiveTerminationDate } = React.useMemo(() => {
        let hireDate = employee?.hireDate;
        let probationEnd = null;
        let terminationDate = employee?.terminationDate;

        if (!erDocuments || erDocuments.length === 0) return { effectiveHireDate: hireDate, probationEndDate: null, effectiveTerminationDate: terminationDate };

        const getActionId = (doc: ERDocument): string =>
            typeof doc.metadata?.actionId === 'string' ? doc.metadata.actionId : '';
        const getTsSeconds = (ts: unknown): number => {
            if (ts && typeof ts === 'object' && 'seconds' in ts && typeof (ts as { seconds: unknown }).seconds === 'number') {
                return (ts as { seconds: number }).seconds;
            }
            if (typeof ts === 'string' || typeof ts === 'number') {
                const t = new Date(ts).getTime();
                return isNaN(t) ? 0 : t / 1000;
            }
            return 0;
        };
        const asStringOrNull = (v: unknown): string | null =>
            typeof v === 'string' ? v : null;

        // Filter for appointment documents and sort by date (newest first)
        const appointmentDocs = erDocuments
            .filter(doc =>
                (getActionId(doc).startsWith('appointment') || doc.templateId?.includes('appointment')) &&
                ['APPROVED', 'SIGNED', 'SENT_TO_EMPLOYEE', 'ACKNOWLEDGED'].includes(doc.status)
            )
            .sort((a, b) => getTsSeconds(b.createdAt) - getTsSeconds(a.createdAt));

        if (appointmentDocs.length > 0) {
            const latestDoc = appointmentDocs[0];
            const inputs: Record<string, unknown> = latestDoc.customInputs || {};
            const actionId = getActionId(latestDoc);

            // Get mapping for this action
            const actionConfig = orgActions?.find((a: { id?: string }) => a.id === actionId);
            const mappings: Record<string, string> = (actionConfig as { dateMappings?: Record<string, string> } | undefined)?.dateMappings || {};

            let hireDateKey: string | null = null;
            let probationEndKey: string | null = null;

            if (actionId === 'appointment_probation') {
                hireDateKey = mappings['probationStartDate'];
                probationEndKey = mappings['probationEndDate'];
            } else if (actionId === 'appointment_reappoint') {
                hireDateKey = mappings['reappointmentDate'];
            } else if (actionId === 'appointment_permanent') {
                hireDateKey = mappings['appointmentDate'];
            }

            let hireDateVal: string | null = hireDateKey ? asStringOrNull(inputs[hireDateKey]) : null;
            probationEnd = probationEndKey ? asStringOrNull(inputs[probationEndKey]) : null;

            // Fallback to legacy hardcoded keys or generic ones if mapping is missing
            if (!hireDateVal) {
                if (actionId === 'appointment_probation') {
                    hireDateVal = asStringOrNull(inputs['Туршилтын эхлэх огноо']) || asStringOrNull(inputs['probationStartDate']);
                } else if (actionId === 'appointment_reappoint') {
                    hireDateVal = asStringOrNull(inputs['Томилогдсон огноо']) || asStringOrNull(inputs['appointmentDate']);
                } else if (actionId === 'appointment_permanent') {
                    hireDateVal = asStringOrNull(inputs['Томилогдсон хугацаа']) || asStringOrNull(inputs['appointmentDate']);
                }
            }

            // General fallbacks for hire date
            if (!hireDateVal) {
                hireDateVal = asStringOrNull(inputs['startDate']) || asStringOrNull(inputs['date']) || asStringOrNull(inputs['Огноо']);
            }

            if (!hireDateVal) {
                console.warn(`[EmployeeProfile] No hire date mapping found for actionId="${actionId}". Available keys: ${Object.keys(inputs).join(', ')}`);
            }

            if (hireDateVal) {
                hireDate = hireDateVal;
            }
        }

        // Filter for release documents
        const releaseDocs = erDocuments
            .filter(doc =>
                (getActionId(doc).startsWith('release') || doc.templateId?.includes('release')) &&
                ['APPROVED', 'SIGNED', 'SENT_TO_EMPLOYEE', 'ACKNOWLEDGED'].includes(doc.status)
            )
            .sort((a, b) => getTsSeconds(b.createdAt) - getTsSeconds(a.createdAt));

        if (releaseDocs.length > 0) {
            const latestDoc = releaseDocs[0];
            const inputs: Record<string, unknown> = latestDoc.customInputs || {};
            const actionId = getActionId(latestDoc);
            const actionConfig = orgActions?.find((a: { id?: string }) => a.id === actionId);
            const mappings: Record<string, string> = (actionConfig as { dateMappings?: Record<string, string> } | undefined)?.dateMappings || {};

            const releaseDateKey = mappings['releaseDate'];
            let releaseDateVal: string | null = releaseDateKey ? asStringOrNull(inputs[releaseDateKey]) : null;

            if (!releaseDateVal) {
                releaseDateVal = asStringOrNull(inputs['Ажлаас чөлөөлөх огноо']) || asStringOrNull(inputs['releaseDate']) || asStringOrNull(inputs['terminationDate']);
            }

            if (releaseDateVal) {
                terminationDate = releaseDateVal;
            }
        }

        return { effectiveHireDate: hireDate, probationEndDate: probationEnd, effectiveTerminationDate: terminationDate };
    }, [erDocuments, employee, orgActions]);

    const departmentMap = React.useMemo(() => {
        if (!departments) return new Map<string, string>();
        return departments.reduce((map, dept) => {
            map.set(dept.id, dept.name);
            return map;
        }, new Map<string, string>());
    }, [departments]);

    const employeeTabs = BASE_TABS;

    if (isLoading) {
        return (
            <div className="py-8 min-h-screen container mx-auto max-w-7xl">
                <ProfileSkeleton />
            </div>
        )
    }

    if (!employee) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                    <User className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">Ажилтан олдсонгүй</h2>
                <p className="text-muted-foreground max-w-md">
                    Таны хайж буй ажилтны мэдээлэл системд байхгүй эсвэл устгагдсан байж болзошгүй.
                </p>
                <Button asChild>
                    <Link href="/dashboard/employees">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        )
    }

    const fullName = employee.lastName
        ? `${employee.lastName.substring(0, 1)}.${employee.firstName}`
        : employee.firstName;
    const departmentName = departmentMap.get(employee.departmentId ?? '') || 'Тодорхойгүй';
    const workScheduleName = workSchedule?.name || 'Тодорхойгүй';
    const statusInfo = statusConfig[employee.status] || { variant: 'outline', className: '', label: employee.status };

    return (
        <>
        <DetailSidebarLayout
            tabs={employeeTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            sidebarHeader={
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (window.history.length > 1) window.history.back();
                            else window.location.assign('/dashboard/employees');
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Буцах"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <Avatar className="h-8 w-8 shrink-0 border border-border">
                        <AvatarImage src={employee.photoURL} alt={fullName} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-muted to-muted/80 text-caption-medium font-bold text-muted-foreground">
                            {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate text-menu-medium font-semibold text-foreground leading-tight">{fullName}</p>
                        {employee.jobTitle && (
                            <p className="truncate text-micro text-muted-foreground leading-tight mt-0.5">{employee.jobTitle}</p>
                        )}
                    </div>
                </div>
            }
            tabActions={
                activeTab === 'questionnaire' && employee ? (
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className={cn(
                                            "h-7 w-7",
                                            employee.questionnaireLocked
                                                ? "border-success/30 bg-success/10 text-success hover:bg-success/20"
                                                : ""
                                        )}
                                        onClick={handleToggleQuestionnaireLock}
                                        disabled={isTogglingLock}
                                    >
                                        {employee.questionnaireLocked
                                            ? <Unlock className="h-3 w-3" />
                                            : <Lock className="h-3 w-3" />
                                        }
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-caption font-semibold">
                                        {employee.questionnaireLocked
                                            ? 'Түгжигдсэн — дарж нээнэ'
                                            : 'Нээлттэй — дарж түгжинэ'
                                        }
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <Button
                            onClick={() => setIsCVDialogOpen(true)}
                            size="sm"
                            className="h-7 text-caption text-white hover:text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                        >
                            <NegeAiIcon size={14} className="mr-1" />
                            <span className="hidden sm:inline">AI CV Уншигч</span>
                            <span className="sm:hidden">AI</span>
                        </Button>
                    </div>
                ) : undefined
            }
            tabBadge={
                activeTab === 'questionnaire' && employee ? (() => {
                    const pct = Math.round(employee.questionnaireCompletion || 0);
                    return (
                        <div className="flex items-center gap-1.5 ml-1">
                            <p className={cn(
                                "text-body-medium font-semibold",
                                pct >= 90 ? "text-success" : pct >= 50 ? "text-warning" : "text-error"
                            )}>{pct}%</p>
                            <div className="h-6 w-6 relative">
                                <svg className="h-6 w-6 -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                                    <circle cx="18" cy="18" r="15" fill="none"
                                        stroke={pct >= 90 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--error))"}
                                        strokeWidth="3" strokeDasharray={`${pct * 0.94} 100`} strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    );
                })() : undefined
            }
        >

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

                <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
                    <div className="space-y-6">
                        {/* Status Warnings */}
                        {employee.status === 'appointing' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-sm font-medium text-amber-900">
                                    Энэ ажилтан <strong>томилогдож буй</strong> төлөвтэй байна. Томилох бичиг баримт баталгаажсан үед идэвхтэй болно.
                                </p>
                            </div>
                        )}
                        {employee.status === 'releasing' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
                                <p className="text-sm font-medium text-orange-900">
                                    Энэ ажилтан <strong>чөлөөлөгдөж буй</strong> төлөвтэй байна. Чөлөөлөх бичиг баримт баталгаажсан үед &quot;Ажлаас гарсан&quot; болно.
                                </p>
                            </div>
                        )}
                        {employee.status === 'terminated' && (
                            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-slate-500 shrink-0" />
                                <p className="text-sm font-medium text-slate-700">
                                    Энэ ажилтан <strong>ажлаас гарсан</strong> төлөвтэй байна.
                                </p>
                            </div>
                        )}

                        {/* Profile Card */}
                        <div className="w-full overflow-visible rounded-lg bg-card">
                            <div className="flex flex-col md:flex-row md:items-start">
                                {/* Avatar column */}
                                <div className="flex w-full shrink-0 flex-col items-center gap-3 border-border px-4 py-4 border-b md:w-[min(100%,180px)] md:border-b-0 md:border-r md:py-4 lg:w-[188px]">
                                    {(() => {
                                        const canEditPhoto = user?.uid === employeeId
                                            || currentUserRole === 'super_admin'
                                            || currentUserRole === 'company_super_admin'
                                            || currentUserRole === 'admin';
                                        return canEditPhoto ? (
                                            <>
                                                <input
                                                    ref={photoInputRef}
                                                    type="file"
                                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                                    className="hidden"
                                                    onChange={handlePhotoSelected}
                                                    disabled={isUploadingPhoto}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => photoInputRef.current?.click()}
                                                    disabled={isUploadingPhoto}
                                                    className="group relative h-20 w-20 focus:outline-none select-none"
                                                    title="Зураг солих"
                                                >
                                                    <Avatar className="h-full w-full border-4 border-background shadow-md">
                                                        <AvatarImage src={employee.photoURL} className="object-cover" />
                                                        <AvatarFallback className="text-lg font-semibold bg-muted">
                                                            {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
                                                        <Camera className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                                                    </div>
                                                    {isUploadingPhoto && (
                                                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            </>
                                        ) : (
                                            <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                                                <AvatarImage src={employee.photoURL} className="object-cover" />
                                                <AvatarFallback className="text-lg font-semibold bg-muted">
                                                    {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        );
                                    })()}

                                    {/* Admin action */}
                                    {currentUserRole &&
                                    (currentUserRole === 'admin' || currentUserRole === 'company_super_admin') &&
                                    user?.uid !== employeeId &&
                                    employee.role !== 'company_super_admin' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="w-full h-7 text-caption gap-1.5 text-muted-foreground"
                                            onClick={() => setMakeAdminOpen(true)}
                                        >
                                            {employee.role === 'admin'
                                                ? <><ShieldAlert className="h-3.5 w-3.5" />Админ эрх цуцлах</>
                                                : <><Crown className="h-3.5 w-3.5" />Админ болгох</>
                                            }
                                        </Button>
                                    )}
                                </div>

                                {/* SettingRow inline editing */}
                                <div className="flex-1 min-w-0 px-4 py-1 [&>div]:!border-b-0">
                                    {employee.employeeCode && (
                                        <div className="flex items-start gap-4 py-3">
                                            <div className="w-28 shrink-0 pt-0.5 flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground/50" /><span className="text-menu text-muted-foreground/60">Код</span></div>
                                            <div className="flex-1 text-menu text-foreground">#{employee.employeeCode}</div>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-4 py-3">
                                        <div className="w-28 shrink-0 pt-0.5 flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground/50" /><span className="text-menu text-muted-foreground/60">Төлөв</span></div>
                                        <div className="flex-1 text-menu text-foreground">{statusInfo.label}</div>
                                    </div>
                                    {employee.jobTitle && (
                                        <div className="flex items-start gap-4 py-3">
                                            <div className="w-28 shrink-0 pt-0.5 flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground/50" /><span className="text-menu text-muted-foreground/60">Албан тушаал</span></div>
                                            <div className="flex-1 text-menu text-foreground">{employee.jobTitle}</div>
                                        </div>
                                    )}
                                    {departmentName && departmentName !== 'Тодорхойгүй' && (
                                        <div className="flex items-start gap-4 py-3">
                                            <div className="w-28 shrink-0 pt-0.5 flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground/50" /><span className="text-menu text-muted-foreground/60">Хэлтэс</span></div>
                                            <div className="flex-1 text-menu text-foreground">{departmentName}</div>
                                        </div>
                                    )}
                                    {effectiveHireDate && (
                                        <div className="flex items-start gap-4 py-3">
                                            <div className="w-28 shrink-0 pt-0.5 flex items-center gap-1.5"><Lock className="h-3 w-3 text-muted-foreground/50" /><span className="text-menu text-muted-foreground/60">Орсон огноо</span></div>
                                            <div className="flex-1 text-menu text-foreground">{new Date(effectiveHireDate).toLocaleDateString('mn-MN')}</div>
                                        </div>
                                    )}
                                    <SettingRow
                                        label="Овог"
                                        value={employee.lastName || ''}
                                        placeholder="Овог оруулах"
                                        onSave={async (v) => {
                                            if (!v.trim()) throw new Error('Овог хоосон байж болохгүй');
                                            await saveEmployeeField({ lastName: v.trim() });
                                        }}
                                    />
                                    <SettingRow
                                        label="Нэр"
                                        value={employee.firstName || ''}
                                        placeholder="Нэр оруулах"
                                        onSave={async (v) => {
                                            if (!v.trim()) throw new Error('Нэр хоосон байж болохгүй');
                                            await saveEmployeeField({ firstName: v.trim() });
                                        }}
                                    />
                                    <SettingRow
                                        label="Утас"
                                        value={employee.phoneNumber || ''}
                                        placeholder="+976 9911 1234"
                                        hint={employee.phoneVerified
                                            ? '✓ Баталгаажсан'
                                            : employee.phoneNumber
                                                ? undefined
                                                : undefined
                                        }
                                        onSave={async (v) => {
                                            const trimmed = v.trim();
                                            if (!trimmed) {
                                                await saveEmployeeField({ phoneNumber: '' });
                                                return;
                                            }
                                            let normalized: string;
                                            try {
                                                normalized = normalizePhoneNumber(trimmed);
                                            } catch (e) {
                                                throw new Error(e instanceof Error ? e.message : 'Утасны дугаар буруу байна');
                                            }
                                            await saveEmployeeField({ phoneNumber: normalized });
                                        }}
                                    />
                                    {employee.phoneNumber && !employee.phoneVerified && (
                                        <div className="pb-2 -mt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenVerify('phone', employee.phoneNumber!)}
                                                className="text-caption text-amber-600 hover:underline"
                                            >
                                                Утас баталгаажуулах
                                            </button>
                                        </div>
                                    )}
                                    <SettingRow
                                        label="Имэйл"
                                        value={employee.email || ''}
                                        placeholder="email@example.com"
                                        onSave={async (v) => {
                                            if (v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
                                                throw new Error('Имэйл хаяг буруу байна');
                                            }
                                            await saveEmployeeField({ email: v.trim() });
                                        }}
                                    />
                                    {employee.email && !employee.emailVerified && (
                                        <div className="pb-2 -mt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenVerify('email', employee.email)}
                                                className="text-caption text-amber-600 hover:underline"
                                            >
                                                Имэйл баталгаажуулах
                                            </button>
                                        </div>
                                    )}
                                    {/* Read-only info */}
                                    <div className="flex items-start gap-4 py-3 border-b">
                                        <div className="w-28 shrink-0 flex items-center gap-1.5">
                                            <Lock className="h-3 w-3 text-muted-foreground/50" />
                                            <span className="text-menu text-muted-foreground/60">Анкет</span>
                                        </div>
                                        <div className="flex-1 text-menu text-foreground">
                                            {Math.round(employee.questionnaireCompletion || 0)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Offboarding Progress */}
                        {(offboardingProjects && offboardingProjects.length > 0) && (
                            <div className="bg-white rounded-xl border p-4 ring-2 ring-amber-100">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-amber-600 uppercase">Offboarding</h3>
                                    <span className={cn('text-xs font-medium', offboardingProgress >= 100 ? 'text-emerald-600' : 'text-amber-600')}>{offboardingProgress}%</span>
                                </div>
                                <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                                    <div className={cn('h-full rounded-full transition-all', offboardingProgress >= 100 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${offboardingProgress}%` }} />
                                </div>
                                <Button variant="ghost" size="sm" className="w-full mt-3 h-8 text-xs text-amber-700 hover:bg-amber-50" asChild>
                                    <Link href={`/dashboard/offboarding/${employeeId}`}>Offboarding харах <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
                                </Button>
                            </div>
                        )}

                        {/* Probation Alert */}
                        {employee && <ProbationAlert employee={employee} />}
                    </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
                    <DocumentsTabContent employee={employee} />
                </TabsContent>
                <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                    <HistoryTabContent
                        employeeId={employeeId || ''}
                        employeeName={fullName}
                        erDocuments={erDocuments}
                        isLoading={isLoadingDocs}
                    />
                </TabsContent>
                <TabsContent value="contracts" className="mt-0 focus-visible:outline-none">
                    <EmployeeContractsTab employeeId={employeeId || ''} />
                </TabsContent>
                <TabsContent value="vacation" className="mt-0 focus-visible:outline-none">
                    <VacationTabContent employee={employee} effectiveHireDate={effectiveHireDate || undefined} />
                </TabsContent>
                <TabsContent value="skills" className="mt-0 focus-visible:outline-none">
                    <SkillsTabContent employeeId={employeeId || ''} />
                </TabsContent>
                <TabsContent value="time-off" className="mt-0 focus-visible:outline-none">
                    <div className="bg-white rounded-xl border p-8 text-center">
                        <Clock className="mx-auto h-10 w-10 text-slate-200 mb-3" />
                        <p className="text-sm text-slate-500 font-medium">Тун удахгүй</p>
                        <p className="text-xs text-slate-400 mt-1">Цаг бүртгэлийн модуль удахгүй нээгдэнэ</p>
                    </div>
                </TabsContent>
                <TabsContent value="training" className="mt-0 focus-visible:outline-none">
                    <div className="bg-white rounded-xl border p-8 text-center">
                        <GraduationCap className="mx-auto h-10 w-10 text-slate-200 mb-3" />
                        <p className="text-sm text-slate-500 font-medium">Тун удахгүй</p>
                        <p className="text-xs text-slate-400 mt-1">Сургалт хөгжлийн модуль удахгүй нээгдэнэ</p>
                    </div>
                </TabsContent>
                <TabsContent value="performance" className="mt-0 focus-visible:outline-none">
                    <div className="bg-white rounded-xl border p-8 text-center">
                        <TrendingUp className="mx-auto h-10 w-10 text-slate-200 mb-3" />
                        <p className="text-sm text-slate-500 font-medium">Тун удахгүй</p>
                        <p className="text-xs text-slate-400 mt-1">Гүйцэтгэлийн үнэлгээний модуль удахгүй нээгдэнэ</p>
                    </div>
                </TabsContent>
                <TabsContent value="onboarding" className="mt-0 focus-visible:outline-none">
                    <OnboardingTabContent employeeId={employeeId || ''} employee={employee} />
                </TabsContent>
                <TabsContent value="offboarding" className="mt-0 focus-visible:outline-none">
                    <OffboardingTabContent employeeId={employeeId || ''} employee={employee} currentUserId={user?.uid} />
                </TabsContent>
                <TabsContent value="questionnaire" className="mt-0 focus-visible:outline-none">
                    <QuestionnaireTabContent
                        employeeId={employeeId || ''}
                        isCVDialogOpen={isCVDialogOpen}
                        onCVDialogChange={setIsCVDialogOpen}
                    />
                </TabsContent>
                <TabsContent value="lifecycle" className="mt-0 focus-visible:outline-none">
                    <LifecycleTabContent employeeId={employeeId || ''} />
                </TabsContent>
                <TabsContent value="ai-insight" className="mt-0 focus-visible:outline-none">
                    <AiInsightWithAstrology
                        employeeId={employee.id}
                        employeeName={fullName}
                        birthDate={questionnaireData?.birthDate}
                    />
                </TabsContent>
                <TabsContent value="system-settings" className="mt-0 focus-visible:outline-none">
                    <SystemSettingsTabContent
                        employee={employee}
                        currentUserId={user?.uid ?? ''}
                        currentUserRole={currentUserRole}
                        onVerifyEmail={(target) => handleOpenVerify('email', target)}
                    />
                </TabsContent>
            </Tabs>
        </DetailSidebarLayout>

        <VerificationDialog
            open={verifyDialogOpen}
            onOpenChange={setVerifyDialogOpen}
            type={verifyType}
            target={verifyTarget}
            employeeId={employeeId || ''}
            onVerified={handleVerified}
        />

        {employee && (
            <MakeAdminDialog
                open={makeAdminOpen}
                onOpenChange={setMakeAdminOpen}
                employee={employee as any}
                currentUserId={user?.uid ?? ''}
            />
        )}

        </>
    )
}
