'use client';

/**
 * ceo-appoint-step.tsx
 *
 * CEO wizard-ийн 'appoint' phase-д ашиглагдах **нэг алхамт** томилолтын UI.
 *
 * `AppointEmployeeDialog`-ийг (10+ алхам, бүтэн ER document үүсгэх workflow)
 * ашиглахын оронд CEO-д тусгайлан зориулсан энгийн атомик томилолтын компонент:
 *
 *  1. Одоо байгаа ажилтнуудаас сонгох эсвэл шинээр үүсгэх
 *  2. Нэг runTransaction дотор:
 *     - employee doc: positionId, jobTitle, departmentId, status, lifecycleStage,
 *       role='director', appointedCompensation
 *     - position doc: filled + 1
 *     - company/profile: ceoEmployeeId
 *  3. Claims refresh (director role) + membership sync
 */

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Crown, UserPlus, Loader2, Search, Check, ChevronRight, AlertTriangle,
    Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    useFirebase, useCollection, useDoc, useMemoFirebase,
    tenantDoc, tenantCollection, useTenantWrite,
} from '@/firebase';
import { query, where, runTransaction, Timestamp, increment, doc as fsDoc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { generateDocumentContent } from '@/app/dashboard/employment-relations/utils';
import { getNextDocumentNumber } from '@/app/dashboard/employment-relations/services/document-numbering';
import type { ERTemplate } from '@/app/dashboard/employment-relations/types';
import { useToast } from '@/hooks/use-toast';
import { useCompanyId } from '@/contexts/tenant-context';
import { filterSystemUsers } from '@/lib/employee-utils';
import { logAudit } from '@/lib/client/audit-client';
import {
    findActiveAppointmentDocuments,
    findActiveReleaseDocuments,
} from '@/lib/services/employee-lifecycle-docs';
import type { Employee } from '@/types';
import type { Position } from '@/app/dashboard/organization/types';
import { AddEmployeeDialog } from '@/app/dashboard/employees/add-employee-dialog';

// Admin-equivalent roles — CEO-д шилжихэд эдгээр role-уудыг хадгалж үлдээнэ
// (company_super_admin нь компанийн эзэн; admin нь HR/системийн админ). Claims
// давхар тохируулалт шаардлагагүй — тэд өөрсдийн админ эрхтэйгээр CEO болно.
const ADMIN_EQUIVALENT_ROLES = ['company_super_admin', 'admin', 'super_admin'] as const;

interface CeoAppointStepProps {
    positionId: string;
    onComplete: () => void;
}

export function CeoAppointStep({ positionId, onComplete }: CeoAppointStepProps) {
    const { user } = useFirebase();
    const { firestore, tDoc, tCollection, companyPath } = useTenantWrite();
    const { toast } = useToast();
    const companyId = useCompanyId();

    // Company profile мэдээлэл ER document-ын content generation-д ашиглагдана
    const companyProfileRef = useMemoFirebase(
        ({ firestore, companyPath }) => firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null, []);
    const { data: companyProfile } = useDoc<Record<string, unknown>>(companyProfileRef as any);

    const [search, setSearch] = React.useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);
    const [showAddEmployee, setShowAddEmployee] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Full CEO position data (salary steps, department, etc.)
    const positionRef = useMemoFirebase(
        ({ firestore, companyPath }) => firestore ? tenantDoc(firestore, companyPath, 'positions', positionId) : null,
        [positionId],
    );
    const { data: position, isLoading: isPositionLoading } = useDoc<Position & Record<string, any>>(positionRef as any);

    // Томилогдоогүй ажилтнуудын жагсаалт
    const employeesQuery = useMemoFirebase(
        ({ firestore, companyPath }) => firestore
            ? query(
                tenantCollection(firestore, companyPath, 'employees'),
                where('status', 'in', ['active', 'active_probation', 'active_permanent', 'active_recruitment']),
            )
            : null,
        [],
    );
    const { data: allEmployees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery as any);

    const assignableEmployees = React.useMemo(() => {
        if (!allEmployees) return [];
        return filterSystemUsers(allEmployees as any[]).filter((emp: any) =>
            !emp.positionId || emp.positionId === '',
        ) as Employee[];
    }, [allEmployees]);

    const filtered = React.useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return assignableEmployees;
        return assignableEmployees.filter(emp =>
            `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.toLowerCase().includes(q)
            || emp.employeeCode?.toLowerCase().includes(q),
        );
    }, [assignableEmployees, search]);

    const selectedEmployee = React.useMemo(
        () => assignableEmployees.find(e => e.id === selectedEmployeeId) || null,
        [assignableEmployees, selectedEmployeeId],
    );

    const canSubmit = !!selectedEmployeeId && !!position && !isSubmitting;

    const handleAppoint = async () => {
        if (!firestore || !user || !selectedEmployee || !position || !companyPath) return;
        setIsSubmitting(true);
        try {
            // ── Pre-transaction guards: offboarding болон идэвхтэй appointment ───
            const [activeOff, activeApp] = await Promise.all([
                findActiveReleaseDocuments(firestore, companyPath, selectedEmployee.id),
                findActiveAppointmentDocuments(firestore, companyPath, selectedEmployee.id),
            ]);
            if (activeOff.length > 0) {
                throw new Error('Сонгосон ажилтанд идэвхтэй ажлаас чөлөөлөх процесс байна. Тэр процессыг дуусгаж эсвэл цуцалж байж CEO-оор томилогдоно.');
            }
            if (activeApp.length > 0) {
                throw new Error('Сонгосон ажилтанд идэвхтэй томилолтын процесс байна. Тэр процессыг дуусгаж байж CEO-оор томилогдоно.');
            }

            // ── Position-ийн default цалингийн шатлалыг тодорхойлох ─────────
            const salaryStepsRaw = (position as any)?.salarySteps;
            const salaryItems: { name: string; value: number }[] = Array.isArray(salaryStepsRaw?.items)
                ? salaryStepsRaw.items
                : [];
            const activeIndex: number = typeof salaryStepsRaw?.activeIndex === 'number'
                ? Math.min(salaryStepsRaw.activeIndex, Math.max(0, salaryItems.length - 1))
                : 0;
            const activeStep = salaryItems[activeIndex];

            // ── #3 ER appointment document бэлтгэх (template тохиргоотой бол) ──
            // Graceful: `organization_actions/appointment_permanent` тохиргоо
            // эсвэл template байхгүй бол ER doc үүсэхгүй, томилолт үргэлжилнэ.
            let erTemplate: ERTemplate | null = null;
            let erDocNumber: string | undefined;
            let erDocContent = '';
            try {
                const actionSnap = await getDoc(tDoc('organization_actions', 'appointment_permanent'));
                const actionCfg = actionSnap.exists() ? (actionSnap.data() as any) : null;
                const templateId = actionCfg?.templateId;
                if (templateId) {
                    const templateSnap = await getDoc(tDoc('er_templates', templateId));
                    if (templateSnap.exists()) {
                        erTemplate = { id: templateSnap.id, ...(templateSnap.data() as any) } as ERTemplate;
                        const docTypeId = (erTemplate as any).documentTypeId as string | undefined;
                        if (docTypeId && companyPath) {
                            try {
                                erDocNumber = await getNextDocumentNumber(firestore, docTypeId, companyPath);
                            } catch (numErr) {
                                console.warn('[CeoAppointStep] doc number generation failed:', numErr);
                            }
                        }
                        try {
                            erDocContent = generateDocumentContent((erTemplate as any).content || '', {
                                employee: selectedEmployee,
                                company: companyProfile,
                                position,
                                system: {
                                    date: format(new Date(), 'yyyy-MM-dd'),
                                    year: format(new Date(), 'yyyy'),
                                    month: format(new Date(), 'MM'),
                                    day: format(new Date(), 'dd'),
                                    user: user?.displayName || 'Системийн хэрэглэгч',
                                    ...(erDocNumber ? { documentNumber: erDocNumber } : {}),
                                },
                                customInputs: {},
                                appointment: {
                                    salaryStep: activeStep,
                                    incentives: [],
                                    allowances: [],
                                },
                            });
                        } catch {
                            erDocContent = '';
                        }
                    }
                }
            } catch (e) {
                console.warn('[CeoAppointStep] ER template lookup skipped:', e);
            }

            const employeeRef = tDoc('employees', selectedEmployee.id);
            const posRef = tDoc('positions', position.id);
            const profileRef = tDoc('company', 'profile');
            const erDocRef = erTemplate ? fsDoc(tCollection('er_documents')) : null;

            // ── Атомик: employee + position + profile ─────────────────────────
            // Transaction дотор шинэ role-г тооцож бичнэ. Admin-equivalent role-тай
            // хүнийг (эзэн/admin) CEO болгоход тэдний админ эрхийг хадгалж, зөвхөн
            // шинэ ажилтан/энгийн employee-г `director` болгоно.
            let assignedRole: string = 'director';
            let shouldSetDirectorClaim = true;

            await runTransaction(firestore, async (tx) => {
                const [posSnap, empSnap, profileSnap] = await Promise.all([
                    tx.get(posRef),
                    tx.get(employeeRef),
                    tx.get(profileRef),
                ]);
                if (!posSnap.exists()) throw new Error('Гүйцэтгэх захирлын ажлын байр олдсонгүй.');
                if (!empSnap.exists()) throw new Error('Ажилтан олдсонгүй.');
                if (!profileSnap.exists()) throw new Error('Компанийн профайл олдсонгүй.');

                const posData = posSnap.data() as Record<string, unknown>;
                const empData = empSnap.data() as Record<string, unknown>;
                const profileData = profileSnap.data() as Record<string, unknown>;

                // Concurrent appointment guard
                const existingCeo = profileData.ceoEmployeeId;
                if (existingCeo && existingCeo !== selectedEmployee.id) {
                    throw new Error('Өөр хэн нэгэн аль хэдийн гүйцэтгэх захирлаар томилогдсон байна. Хуудсаа дахин ачаална уу.');
                }

                // Headcount guard
                const filled = typeof posData.filled === 'number' ? (posData.filled as number) : 0;
                const headcount = typeof posData.headcount === 'number' ? (posData.headcount as number) : 1;
                if (filled >= headcount) {
                    throw new Error('Ажлын байрны орон тоо дүүрсэн байна.');
                }

                // Role preservation logic
                const currentRole = (empData.role as string) || 'employee';
                if (ADMIN_EQUIVALENT_ROLES.includes(currentRole as any)) {
                    assignedRole = currentRole; // админ/эзэн эрхийг хадгална
                    shouldSetDirectorClaim = false;
                }

                tx.update(employeeRef, {
                    role: assignedRole,
                    positionId: position.id,
                    jobTitle: (position as any).title || 'Гүйцэтгэх захирал',
                    departmentId: (position as any).departmentId || null,
                    status: 'active_permanent',
                    lifecycleStage: 'active',
                    appointedCompensation: activeStep
                        ? {
                            salaryStepIndex: activeIndex,
                            salary: activeStep.value || 0,
                            salaryStepName: activeStep.name || '',
                            incentiveIndices: [],
                            allowanceIndices: [],
                        }
                        : null,
                    updatedAt: Timestamp.now(),
                });

                tx.update(posRef, {
                    filled: increment(1),
                    updatedAt: Timestamp.now(),
                });

                tx.update(profileRef, {
                    ceoEmployeeId: selectedEmployee.id,
                    updatedAt: Timestamp.now(),
                });

                // #3 ER document (хэрэв template тохиргоо бэлэн бол)
                if (erDocRef && erTemplate) {
                    tx.set(erDocRef, {
                        ...(erDocNumber ? { documentNumber: erDocNumber } : {}),
                        documentTypeId: (erTemplate as any).documentTypeId || null,
                        templateId: erTemplate.id,
                        employeeId: selectedEmployee.id,
                        departmentId: (position as any).departmentId || null,
                        positionId: position.id,
                        creatorId: user?.uid || null,
                        status: 'DRAFT',
                        content: erDocContent,
                        version: 1,
                        printSettings: (erTemplate as any).printSettings || null,
                        customInputs: {},
                        appointmentData: {
                            actionId: 'appointment_permanent',
                            salaryStepIndex: activeIndex,
                            salaryStep: activeStep || null,
                            incentiveIndices: [],
                            allowanceIndices: [],
                        },
                        metadata: {
                            employeeName: `${selectedEmployee.firstName ?? ''} ${selectedEmployee.lastName ?? ''}`.trim(),
                            templateName: (erTemplate as any).name || '',
                            positionName: (position as any).title || '',
                            actionId: 'appointment_permanent',
                            kind: 'ceo_appointment',
                            ...(erDocNumber ? { documentNumber: erDocNumber } : {}),
                        },
                        history: [{
                            stepId: 'CREATE',
                            action: 'CREATE',
                            actorId: user?.uid || null,
                            timestamp: Timestamp.now(),
                            comment: erDocNumber
                                ? `Баримт ${erDocNumber} үүсгэв (Гүйцэтгэх захирал томилох)`
                                : 'Гүйцэтгэх захирлыг томилох баримт үүсгэв',
                        }],
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                    });
                }
            });

            // ── Firebase Auth: claims refresh (зөвхөн director-т шилжсэн бол) ──
            if (shouldSetDirectorClaim) {
                const token = await user.getIdToken();
                const claimsRes = await fetch('/api/admin/set-tenant-claims', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ targetUid: selectedEmployee.id, role: 'director', companyId }),
                });
                if (!claimsRes.ok) {
                    console.warn('[CeoAppointStep] set-tenant-claims failed:', await claimsRes.text().catch(() => ''));
                    toast({
                        title: 'Анхааруулга',
                        description: 'Захирал томилогдсон ч Firebase Auth эрх тохируулагдсангүй. Хэрэглэгч дахин нэвтрэхэд автоматаар засагдана.',
                        variant: 'destructive',
                    });
                }
            }

            // ── Caller өөрийгөө CEO болгосон тохиолдолд ID token-ыг
            //    force-refresh хийж шинэ claims (role/companyIds)-г шууд авна.
            //    Үгүй бол хуучин session-д режим солигдохгүй, хуудас refresh
            //    хүртэл эрх өөрчлөгдөхгүй. ──
            if (user.uid === selectedEmployee.id) {
                try {
                    await user.getIdToken(true);
                } catch (tokenErr) {
                    console.warn('[CeoAppointStep] self-token refresh failed:', tokenErr);
                }
            }

            // ── Audit log ─────────────────────────────────────────────────────
            void logAudit({
                action: 'update',
                resource: 'employee',
                resourceId: selectedEmployee.id,
                resourceName: `${selectedEmployee.lastName ?? ''} ${selectedEmployee.firstName ?? ''}`.trim(),
                description: 'Гүйцэтгэх захирлаар томилов',
                metadata: {
                    kind: 'ceo_appointment',
                    positionId: position.id,
                    assignedRole,
                    preservedAdminRole: !shouldSetDirectorClaim,
                    erDocCreated: !!erDocRef,
                    ...(erDocNumber ? { erDocNumber } : {}),
                },
            });

            const roleMsg = shouldSetDirectorClaim ? '' : ' Админы эрх хадгалагдсан.';
            const docMsg = erDocRef
                ? ` Томилгооны баримт${erDocNumber ? ` #${erDocNumber}` : ''} DRAFT төлөвт үүссэн.`
                : '';
            toast({
                title: 'Амжилттай',
                description: `Гүйцэтгэх захирал амжилттай томилогдлоо.${roleMsg}${docMsg}`,
            });
            onComplete();
        } catch (err) {
            console.error('[CeoAppointStep] appointment failed:', err);
            const msg = err instanceof Error ? err.message : 'Томилолт амжилтгүй боллоо.';
            toast({ title: 'Алдаа гарлаа', description: msg, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="max-w-lg w-full">
                <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl border border-amber-200/60 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                            <Crown className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-amber-900">Гүйцэтгэх захирал томилох</h3>
                            <p className="text-xs text-amber-600">
                                {isPositionLoading
                                    ? 'Ажлын байрны мэдээлэл ачаалж байна...'
                                    : position
                                        ? `"${(position as any).title || 'Гүйцэтгэх захирал'}" ажлын байранд томилох`
                                        : 'Ажлын байр олдсонгүй'}
                            </p>
                        </div>
                        {position && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                                title="Ажлын байрны цалин/хангамж тохируулах"
                            >
                                <Link href={`/dashboard/organization/positions/${position.id}`}>
                                    <Settings2 className="h-3.5 w-3.5 mr-1" />
                                    <span className="hidden sm:inline">Цалин тохируулах</span>
                                </Link>
                            </Button>
                        )}
                    </div>

                    {!isPositionLoading && !position && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-700">
                                Ажлын байрны бичвэр олдсонгүй. Wizard-ийг дахин эхлүүлж ажлын байрыг үүсгэнэ үү.
                            </p>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Нэр, кодоор хайх..."
                            className="pl-10 h-10 bg-white border-amber-200 focus-visible:ring-amber-400"
                        />
                    </div>

                    {/* Create new CTA */}
                    <button
                        type="button"
                        onClick={() => setShowAddEmployee(true)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-dashed border-amber-300 bg-white/60 hover:border-amber-500 hover:bg-white transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-sm text-amber-900">Шинэ ажилтан үүсгэх</div>
                                <div className="text-[10px] text-amber-600">Системд бүртгэлгүй хүнийг нэмнэ</div>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {/* Employee list */}
                    <ScrollArea className="h-[260px]">
                        <div className="space-y-2 pr-1">
                            {employeesLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                                ))
                            ) : filtered.length === 0 ? (
                                <div className="py-8 text-center text-amber-600 text-xs">
                                    {search
                                        ? 'Хайлтанд тохирох ажилтан олдсонгүй'
                                        : 'Томилогдоогүй ажилтан байхгүй — дээрээс шинэ ажилтан үүсгэнэ үү'}
                                </div>
                            ) : (
                                filtered.map((emp) => (
                                    <button
                                        key={emp.id}
                                        type="button"
                                        onClick={() => setSelectedEmployeeId(emp.id)}
                                        className={cn(
                                            'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                                            selectedEmployeeId === emp.id
                                                ? 'border-amber-500 bg-amber-50 shadow-sm'
                                                : 'border-amber-100 bg-white/80 hover:border-amber-300',
                                        )}
                                    >
                                        <Avatar className="h-10 w-10 rounded-xl border border-amber-200 shrink-0">
                                            <AvatarImage src={(emp as any).photoURL} />
                                            <AvatarFallback className="rounded-xl bg-amber-100 text-amber-700 font-semibold text-sm">
                                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm text-amber-900 truncate">
                                                {emp.lastName} {emp.firstName}
                                            </div>
                                            <div className="text-[10px] text-amber-600">#{emp.employeeCode}</div>
                                        </div>
                                        {selectedEmployeeId === emp.id && (
                                            <Check className="h-4 w-4 text-amber-500 shrink-0" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    {/* Selected summary */}
                    {selectedEmployee && position && (
                        <div className="p-3 rounded-xl bg-white border border-amber-200 text-xs text-amber-800">
                            <span className="font-semibold">{selectedEmployee.lastName} {selectedEmployee.firstName}</span>
                            <span> → </span>
                            <span className="font-semibold">{(position as any).title}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-amber-100">
                        <Button variant="ghost" onClick={onComplete} disabled={isSubmitting} className="text-amber-600">
                            Цуцлах
                        </Button>
                        <Button
                            onClick={handleAppoint}
                            disabled={!canSubmit}
                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                        >
                            {isSubmitting
                                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Томилж байна...</>
                                : <><Crown className="h-4 w-4 mr-2" />Захирлаар томилох</>}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Nested AddEmployeeDialog — үүсгэмэгц auto-select */}
            <AddEmployeeDialog
                open={showAddEmployee}
                onOpenChange={setShowAddEmployee}
                onCreated={(emp) => setSelectedEmployeeId(emp.id)}
            />
        </div>
    );
}
