'use client';

/**
 * ceo-setup-wizard.tsx
 *
 * CEO (Гүйцэтгэх захирал) компонентууд ба reset hook.
 *
 *  - CeoRequiredBanner     — CEO томилогдоогүй үед harvuulagdax banner
 *  - CeoInfoCard           — details view (legacy)
 *  - CeoCompactCard        — employees page-ийн quick card
 *  - CeoSetupWizard        — self-heal + direct appoint step
 *  - useCeoReset           — Гүйцэтгэх захирал солих hook
 *
 * Шинэ компани үүсэхэд `/api/companies/register` нь "Удирдлага" department +
 * "Гүйцэтгэх захирал" position-ыг автоматаар үүсгэнэ. Position нь invariant
 * бөгөөд устгагдахгүй — solih үед зөвхөн `filled: 0 + ceoEmployeeId: null`.
 * Wizard нь position байхгүй/orphan тохиолдолд self-heal-ээр бэлдэнэ.
 *
 * Compensation тохиргоо (level, employment type, salary steps, incentives,
 * allowances) нь position detail хуудсанд шилжсэн:
 *   /dashboard/organization/positions/{ceoPositionId}
 */

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Crown, ArrowRight, Loader2, RotateCcw, Settings2,
} from 'lucide-react';
import { useFirebase, useTenantWrite, useDoc, useMemoFirebase, tenantDoc, tenantCollection } from '@/firebase';
import { Timestamp, writeBatch, doc as fsDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { generateDocumentContent } from '@/app/dashboard/employment-relations/utils';
import { getNextDocumentNumber } from '@/app/dashboard/employment-relations/services/document-numbering';
import type { ERTemplate } from '@/app/dashboard/employment-relations/types';
import { useToast } from '@/hooks/use-toast';
import { CeoAppointStep } from './ceo-appoint-step';
import type { Employee, Position } from '@/types';
import { useCompanyId } from '@/contexts/tenant-context';
import { logAudit } from '@/lib/client/audit-client';

// ─── CEO Required Banner ─────────────────────────────────────────────────────

interface CeoRequiredBannerProps {
    onStart: () => void;
}

export function CeoRequiredBanner({ onStart }: CeoRequiredBannerProps) {
    return (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 rounded-xl border border-amber-200/60 p-4 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 shrink-0">
                    <Crown className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-amber-900 text-sm">
                        Гүйцэтгэх захирал томилох шаардлагатай
                    </h3>
                    <p className="text-xs text-amber-600 mt-0.5">
                        Захирал томилогдсоны дараа шинэ ажилтан нэмэх боломжтой болно
                    </p>
                </div>
                <Button
                    onClick={onStart}
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm shrink-0"
                >
                    <Crown className="h-4 w-4 mr-1.5" />
                    Томилох
                </Button>
            </div>
        </div>
    );
}

// ─── CEO Info Card (shown when CEO is appointed) ─────────────────────────────

interface CeoInfoCardProps {
    ceoEmployee: (Employee & { id: string }) | null;
    isLoading: boolean;
    onReset: () => void;
}

export function CeoInfoCard({ ceoEmployee, isLoading, onReset }: CeoInfoCardProps) {
    return (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl border border-amber-200/60 p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                    <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-amber-900">Гүйцэтгэх захирал</h3>
                    <p className="text-xs text-amber-600">Байгууллагын удирдлага</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-xl" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>
            ) : ceoEmployee ? (
                <div className="space-y-4 py-2">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 rounded-xl border-2 border-amber-200 shadow-lg">
                            <AvatarImage src={(ceoEmployee as any).photoURL} className="object-cover" />
                            <AvatarFallback className="rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 text-lg font-semibold">
                                {ceoEmployee.firstName?.[0]}{ceoEmployee.lastName?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-amber-900 text-lg">{ceoEmployee.lastName} {ceoEmployee.firstName}</p>
                            <p className="text-sm text-amber-600 mt-0.5">Гүйцэтгэх захирал</p>
                            {ceoEmployee.email && <p className="text-xs text-amber-500 mt-1 truncate">{ceoEmployee.email}</p>}
                        </div>
                        <Link href={`/dashboard/employees/${ceoEmployee.id}`} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
                            Дэлгэрэнгүй <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="flex justify-end">
                        <Button variant="ghost" size="sm" onClick={onReset} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Захирал солих
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="text-center text-sm text-amber-600 py-4">Томилогдсон ажилтны мэдээлэл олдсонгүй</p>
            )}
        </div>
    );
}

// ─── Compact CEO card (fits in the 3-card quick-access row) ──────────────────

interface CeoCompactCardProps {
    ceoEmployee: (Employee & { id: string }) | null;
    isLoading: boolean;
    onReset: () => void;
    ceoPositionId?: string | null;
}

export function CeoCompactCard({ ceoEmployee, isLoading, onReset, ceoPositionId }: CeoCompactCardProps) {
    return (
        <div className="group bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 border border-amber-200/60 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 rounded-xl p-4 flex items-center gap-4">
            {/* Icon / Avatar */}
            {isLoading ? (
                <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
            ) : ceoEmployee ? (
                <Avatar className="h-11 w-11 rounded-xl border-2 border-amber-200 shadow-md shrink-0">
                    <AvatarImage src={(ceoEmployee as any).photoURL} className="object-cover" />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-semibold">
                        {ceoEmployee.firstName?.[0]}{ceoEmployee.lastName?.[0]}
                    </AvatarFallback>
                </Avatar>
            ) : (
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                    <Crown className="h-5 w-5 text-white" />
                </div>
            )}

            {/* Text */}
            <div className="flex-1 min-w-0">
                {isLoading ? (
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                ) : ceoEmployee ? (
                    <>
                        <h3 className="font-semibold text-amber-900 dark:text-amber-100 truncate">
                            {ceoEmployee.lastName ? `${ceoEmployee.lastName[0]}.` : ''}{ceoEmployee.firstName}
                        </h3>
                        <p className="text-sm text-amber-600 dark:text-amber-400 truncate">Гүйцэтгэх захирал</p>
                    </>
                ) : (
                    <>
                        <h3 className="font-semibold text-amber-900 dark:text-amber-100">Гүйцэтгэх захирал</h3>
                        <p className="text-sm text-amber-600 dark:text-amber-400 truncate">Томилогдсонгүй</p>
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
                {ceoPositionId && (
                    <Link
                        href={`/dashboard/organization/positions/${ceoPositionId}`}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                        aria-label="Ажлын байрны тохиргоо"
                        title="Ажлын байрны цалин/хангамж тохируулах"
                    >
                        <Settings2 className="h-4 w-4" />
                    </Link>
                )}
                {ceoEmployee && (
                    <Link
                        href={`/dashboard/employees/${ceoEmployee.id}`}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                        aria-label="Дэлгэрэнгүй"
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                )}
                <button
                    type="button"
                    onClick={onReset}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                    aria-label="Захирал солих"
                    title="Захирал солих"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

// ─── Main CEO Setup Wizard Component ─────────────────────────────────────────

interface CeoSetupWizardProps {
    onComplete: () => void;
}

export function CeoSetupWizard({ onComplete }: CeoSetupWizardProps) {
    const { firestore } = useFirebase();
    const { tDoc, tCollection } = useTenantWrite();
    const { toast } = useToast();

    // Self-heal дотроос server-side getDocs-оор dept/position шалгах тул
    // client-side subscription шаардлагагүй.
    const companyProfileRef = useMemoFirebase(
        ({ firestore, companyPath }) => firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null, []);
    const { data: companyProfile } = useDoc<Record<string, unknown>>(companyProfileRef as any);

    // Always-on "appoint" — position нь invariant (бүх компанид default үүсгэх
    // буюу self-heal хийгдэнэ). 5-алхамт compensation wizard нь энд хэрэггүй,
    // position detail хуудсанд тусад нь хийгдэнэ.
    const [activePositionId, setActivePositionId] = React.useState<string | null>(null);
    const [isBootstrapping, setIsBootstrapping] = React.useState(false);
    const bootstrapAttemptedRef = React.useRef(false);

    // Existing position-г харна
    const ceoPositionRef = useMemoFirebase(
        ({ firestore, companyPath }) => {
            if (!firestore || !companyProfile) return null;
            const id = (companyProfile as any).ceoPositionId;
            return id ? tenantDoc(firestore, companyPath, 'positions', id) : null;
        }, [companyProfile]
    );
    const { data: ceoPosition, isLoading: isCeoPositionLoading } = useDoc<Position>(ceoPositionRef as any);

    // ── Self-heal: position байхгүй эсвэл orphan бол default-аар үүсгэнэ ─────
    // Server-side getDocs-оор баталгаажуулна (React state cache lag-аас
    // зайлсхийж duplicate "Удирдлага" department үүсгэхээс сэргийлнэ).
    const ensureCeoPosition = React.useCallback(async () => {
        if (!firestore) return;
        if (bootstrapAttemptedRef.current) return;
        bootstrapAttemptedRef.current = true;

        setIsBootstrapping(true);
        try {
            // 1. Server-side дахин шалгах: бусад tab/race-аас үүссэн
            //    "Удирдлага" department байвал дахин үүсгэхгүй.
            const deptSnap = await getDocs(query(
                tCollection('departments'),
                where('name', '==', 'Удирдлага'),
            ));

            let deptId: string;
            const batch = writeBatch(firestore);

            if (!deptSnap.empty) {
                // Аль хэдийн байгаа — эхний (хамгийн хуучин) нэгийг ашиглана
                deptId = deptSnap.docs[0].id;
            } else {
                const deptDocRef = fsDoc(tCollection('departments'));
                batch.set(deptDocRef, {
                    name: 'Удирдлага',
                    type: 'executive',
                    description: 'Байгууллагын удирдлага',
                    isDefault: true,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                deptId = deptDocRef.id;
            }

            // 2. Одоогийн CEO position code='CEO'-тэйгээр байвал түүнийг
            //    reactivate хийж, шинэ position үүсгэхгүй (duplicate-аас сэргийлнэ).
            const posSnap = await getDocs(query(
                tCollection('positions'),
                where('code', '==', 'CEO'),
            ));

            let posId: string;
            if (!posSnap.empty) {
                // Хамгийн хуучин нь canonical — reactivate
                posId = posSnap.docs[0].id;
                batch.update(tDoc('positions', posId), {
                    isActive: true,
                    departmentId: deptId,
                    updatedAt: Timestamp.now(),
                });
            } else {
                // Default CEO position (compensation тохиргоо null — админ дараа
                // position detail хуудсаар тохируулна)
                const posDocRef = fsDoc(tCollection('positions'));
                batch.set(posDocRef, {
                    title: 'Гүйцэтгэх захирал',
                    code: 'CEO',
                    departmentId: deptId,
                    reportsTo: null,
                    filled: 0,
                    headcount: 1,
                    isApproved: true,
                    isActive: true,
                    isDefault: true,
                    levelId: null,
                    employmentTypeId: null,
                    salaryRange: { min: 0, max: 0, currency: 'MNT' },
                    salarySteps: { items: [], activeIndex: 0, currency: 'MNT' },
                    incentives: [],
                    allowances: [],
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                });
                posId = posDocRef.id;
            }

            // Profile-д ceoPositionId + ceoDepartmentId бичих
            batch.set(tDoc('company', 'profile'), {
                ceoDepartmentId: deptId,
                ceoPositionId: posId,
                updatedAt: Timestamp.now(),
            }, { merge: true });

            await batch.commit();
            setActivePositionId(posId);
        } catch (err) {
            console.error('[CeoSetupWizard] ensureCeoPosition failed:', err);
            const msg = err instanceof Error ? err.message : 'Ажлын байр үүсгэхэд алдаа гарлаа.';
            toast({ title: 'Алдаа гарлаа', description: msg, variant: 'destructive' });
            bootstrapAttemptedRef.current = false; // дахин оролдох боломж
        } finally {
            setIsBootstrapping(false);
        }
    }, [firestore, tCollection, tDoc, toast]);

    // ── Mount / profile change: position-ы төлөв шалгана ─────────────────────
    React.useEffect(() => {
        if (!companyProfile) return;
        const profilePosId = (companyProfile as any).ceoPositionId as string | undefined;

        // 1. Profile дээр ceoPositionId байхгүй → bootstrap
        if (!profilePosId) {
            void ensureCeoPosition();
            return;
        }

        // 2. Profile-д байгаа — position doc ачаалагдахыг хүлээнэ
        if (isCeoPositionLoading) return;

        // 3. Position doc байхгүй (orphan reference) эсвэл idle/archived → bootstrap
        if (!ceoPosition || (ceoPosition as any).isActive === false) {
            void ensureCeoPosition();
            return;
        }

        // 4. Position бэлэн — active positionId-г тогтооно
        setActivePositionId(profilePosId);
    }, [companyProfile, ceoPosition, isCeoPositionLoading, ensureCeoPosition]);

    // ── Render ───────────────────────────────────────────────────────────────
    // Position нь invariant — self-heal нь mount-д автоматаар ажиллана.
    // 5-алхамт compensation wizard нь энд хэрэггүй (position detail хуудсанд
    // тусад нь тохируулна).

    if (isBootstrapping || !activePositionId) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                <p className="text-xs text-amber-600">
                    {isBootstrapping ? 'Ажлын байрыг бэлтгэж байна...' : 'Ачаалж байна...'}
                </p>
            </div>
        );
    }

    return <CeoAppointStep positionId={activePositionId} onComplete={onComplete} />;
}

// ─── Reset CEO Handler Hook ──────────────────────────────────────────────────

export function useCeoReset() {
    const { firestore, user } = useFirebase();
    const { tDoc, tCollection, companyPath } = useTenantWrite();
    const { toast } = useToast();
    const companyId = useCompanyId();

    // CEO profile мэдээлэл ER document metadata-д ашиглагдана
    const companyProfileRef = useMemoFirebase(
        ({ firestore, companyPath }) => firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null, []);
    const { data: companyProfileInfo } = useDoc<Record<string, unknown>>(companyProfileRef as any);

    const [isResetting, setIsResetting] = React.useState(false);

    const resetCEO = React.useCallback(async (companyProfile: Record<string, unknown>) => {
        if (!firestore || !user) return;
        setIsResetting(true);
        try {
            const batch = writeBatch(firestore);
            const prevCeoId = typeof companyProfile.ceoEmployeeId === 'string'
                ? (companyProfile.ceoEmployeeId as string)
                : null;
            const prevPositionId = typeof companyProfile.ceoPositionId === 'string'
                ? (companyProfile.ceoPositionId as string)
                : null;
            const prevDepartmentId = typeof companyProfile.ceoDepartmentId === 'string'
                ? (companyProfile.ceoDepartmentId as string)
                : null;
            const hadAppointedCeo = !!prevCeoId;

            // ── Хуучин захирлын Firebase Auth claims цуцлах + employee doc цэвэрлэх ──
            if (prevCeoId) {
                const token = await user.getIdToken();
                const res = await fetch('/api/admin/set-tenant-claims', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        targetUid: prevCeoId,
                        role: 'employee',
                        companyId,
                    }),
                });
                if (!res.ok) {
                    console.error('Failed to revoke director claims:', await res.json());
                }

                // Firestore employee doc: role → employee, position clear
                batch.update(tDoc('employees', prevCeoId), {
                    role: 'employee',
                    positionId: null,
                    jobTitle: null,
                    departmentId: null,
                    status: 'active_recruitment',
                    lifecycleStage: 'onboarding',
                    appointedCompensation: null,
                    updatedAt: Timestamp.now(),
                });
            }

            // ── Position: invariant — устгахгүй. Зөвхөн filled тоог 0 болгож,
            //     шинэ CEO-д зориулж бэлэн болгоно. Компанид CEO-гүй үе байж
            //     болохгүй гэсэн бизнес дүрмийн дагуу position + dept хэвээр. ──
            if (prevPositionId) {
                batch.update(tDoc('positions', prevPositionId), {
                    filled: 0,
                    isActive: true,
                    updatedAt: Timestamp.now(),
                });
            }
            // Удирдлага хэлтэс нь invariant — устгахгүй.

            // ── #10 Active onboarding процесс/проект-уудыг цуцлах ────────────
            let cancelledProjects = 0;
            let cancelledLegacy = 0;
            if (prevCeoId) {
                try {
                    // 1. Projects collection (одоогийн систем)
                    const projectsSnap = await getDocs(query(
                        tCollection('projects'),
                        where('type', '==', 'onboarding'),
                        where('onboardingEmployeeId', '==', prevCeoId),
                    ));
                    projectsSnap.docs.forEach(d => {
                        batch.delete(d.ref);
                        cancelledProjects++;
                    });

                    // 2. Legacy onboarding_processes
                    const legacySnap = await getDocs(query(
                        tCollection('onboarding_processes'),
                        where('employeeId', '==', prevCeoId),
                    ));
                    legacySnap.docs.forEach(d => {
                        batch.delete(d.ref);
                        cancelledLegacy++;
                    });
                } catch (e) {
                    console.warn('[useCeoReset] onboarding cleanup failed:', e);
                }
            }

            // ── #9 Release ER document (template тохиргоотой бол) ─────────────
            let releaseDocCreated = false;
            let releaseDocNumber: string | undefined;
            if (prevCeoId && hadAppointedCeo && companyPath) {
                try {
                    const actionSnap = await getDoc(tDoc('organization_actions', 'release_employee'));
                    const actionCfg = actionSnap.exists() ? (actionSnap.data() as any) : null;
                    const templateId = actionCfg?.templateId;
                    if (templateId) {
                        const templateSnap = await getDoc(tDoc('er_templates', templateId));
                        if (templateSnap.exists()) {
                            const templateData = { id: templateSnap.id, ...(templateSnap.data() as any) } as ERTemplate;
                            const docTypeId = (templateData as any).documentTypeId as string | undefined;
                            if (docTypeId) {
                                try {
                                    releaseDocNumber = await getNextDocumentNumber(firestore, docTypeId, companyPath);
                                } catch (numErr) {
                                    console.warn('[useCeoReset] doc number generation failed:', numErr);
                                }
                            }
                            let content = '';
                            try {
                                content = generateDocumentContent((templateData as any).content || '', {
                                    employee: { id: prevCeoId },
                                    company: companyProfileInfo,
                                    position: prevPositionId ? { id: prevPositionId } : null,
                                    system: {
                                        date: format(new Date(), 'yyyy-MM-dd'),
                                        year: format(new Date(), 'yyyy'),
                                        month: format(new Date(), 'MM'),
                                        day: format(new Date(), 'dd'),
                                        user: user?.displayName || 'Системийн хэрэглэгч',
                                        ...(releaseDocNumber ? { documentNumber: releaseDocNumber } : {}),
                                    },
                                    customInputs: {},
                                });
                            } catch {
                                content = '';
                            }

                            const erDocRef = fsDoc(tCollection('er_documents'));
                            batch.set(erDocRef, {
                                ...(releaseDocNumber ? { documentNumber: releaseDocNumber } : {}),
                                documentTypeId: docTypeId || null,
                                templateId: templateData.id,
                                employeeId: prevCeoId,
                                departmentId: prevDepartmentId || null,
                                positionId: prevPositionId || null,
                                creatorId: user?.uid || null,
                                status: 'DRAFT',
                                content,
                                version: 1,
                                printSettings: (templateData as any).printSettings || null,
                                customInputs: {},
                                metadata: {
                                    templateName: (templateData as any).name || '',
                                    actionId: 'release_employee',
                                    kind: 'ceo_release',
                                    ...(releaseDocNumber ? { documentNumber: releaseDocNumber } : {}),
                                },
                                history: [{
                                    stepId: 'CREATE',
                                    action: 'CREATE',
                                    actorId: user?.uid || null,
                                    timestamp: Timestamp.now(),
                                    comment: releaseDocNumber
                                        ? `Баримт ${releaseDocNumber} үүсгэв (Гүйцэтгэх захирлыг чөлөөлөх)`
                                        : 'Гүйцэтгэх захирлыг чөлөөлөх баримт үүсгэв',
                                }],
                                createdAt: Timestamp.now(),
                                updatedAt: Timestamp.now(),
                            });
                            releaseDocCreated = true;
                        }
                    }
                } catch (e) {
                    console.warn('[useCeoReset] release ER document skipped:', e);
                }
            }

            // ── Profile-д зөвхөн ceoEmployeeId-г цэвэрлэнэ (position/dept хэвээр) ──
            batch.update(tDoc('company', 'profile'), {
                ceoEmployeeId: null,
                updatedAt: Timestamp.now(),
            });

            await batch.commit();

            // ── Audit log ─────────────────────────────────────────────────────
            void logAudit({
                action: 'update',
                resource: 'employee',
                resourceId: prevCeoId || undefined,
                description: hadAppointedCeo
                    ? 'Гүйцэтгэх захирлыг чөлөөлсөн'
                    : 'Гүйцэтгэх захирлын тохиргоог цуцалсан',
                metadata: {
                    kind: 'ceo_reset',
                    positionId: prevPositionId,
                    hadAppointedCeo,
                    positionPreserved: true,
                    cancelledOnboardingProjects: cancelledProjects,
                    cancelledLegacyOnboarding: cancelledLegacy,
                    releaseDocCreated,
                    ...(releaseDocNumber ? { releaseDocNumber } : {}),
                },
            });

            // Caller өөрийгөө чөлөөлсөн бол ID token шинэчилж шинэ role-д орно
            if (user.uid === prevCeoId) {
                try {
                    await user.getIdToken(true);
                } catch (tokenErr) {
                    console.warn('[useCeoReset] self-token refresh failed:', tokenErr);
                }
            }

            toast({
                title: 'Амжилттай',
                description: releaseDocCreated
                    ? `Гүйцэтгэх захирлын тохиргоо устгагдлаа. Чөлөөлөх баримт${releaseDocNumber ? ` #${releaseDocNumber}` : ''} DRAFT төлөвт үүссэн.`
                    : 'Гүйцэтгэх захирлын тохиргоо устгагдлаа.',
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Тохиргоо устгахад алдаа гарлаа.';
            toast({ title: 'Алдаа гарлаа', description: msg, variant: 'destructive' });
        } finally {
            setIsResetting(false);
        }
    }, [firestore, user, companyId, companyPath, companyProfileInfo, tDoc, tCollection, toast]);

    return { resetCEO, isResetting };
}

