// src/app/dashboard/employees/[id]/page.tsx
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, orderBy, where } from 'firebase/firestore';
import { type Employee } from '../data';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    Calendar,
    Edit,
    Mail,
    Phone,
    FileText,
    User,
    PlusCircle,
    AlertTriangle,
    Trash2,
    ChevronRight,
    File as FileIcon,
    Activity,
    ClipboardCheck,
    LogOut,
    Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ERDocument, DOCUMENT_STATUSES } from '../../employment-relations/types';

import { VacationTabContent } from './vacation-tab-content';
import { OnboardingTabContent } from './onboarding-tab-content';
import { OffboardingTabContent } from './offboarding-tab-content';
import { AddEmployeeDocumentDialog } from './AddEmployeeDocumentDialog';
import { MakeAdminDialog } from './make-admin-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


type Department = {
    id: string;
    name: string;
};

type Position = {
    id: string;
    workScheduleId?: string;
}

type WorkSchedule = {
    id: string;
    name: string;
}

type EmploymentHistoryEvent = {
    id: string;
    eventType: string;
    eventDate: string;
    notes?: string;
    documentUrl?: string;
    documentName?: string;
    documentId?: string;
};

type CompanyPolicy = {
    id: string;
    title: string;
    documentUrl: string;
    uploadDate: string;
    appliesToAll: boolean;
    applicablePositionIds: string[];
}


const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, label: string } } = {
    "Идэвхтэй": { variant: 'default', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 border-emerald-200', label: 'Идэвхтэй' },
    "Жирэмсний амралттай": { variant: 'secondary', className: 'bg-blue-50 text-blue-700 hover:bg-blue-50/80 border-blue-200', label: 'Жирэмсний амралт' },
    "Хүүхэд асрах чөлөөтэй": { variant: 'secondary', className: 'bg-purple-50 text-purple-700 hover:bg-purple-50/80 border-purple-200', label: 'Хүүхэд асаргаа' },
    "Урт хугацааны чөлөөтэй": { variant: 'outline', className: 'bg-amber-50 text-amber-700 hover:bg-amber-50/80 border-amber-200', label: 'Чөлөөтэй' },
    "Ажлаас гарсан": { variant: 'destructive', className: 'bg-rose-50 text-rose-700 hover:bg-rose-50/80 border-rose-200', label: 'Гарсан' },
    "Түр түдгэлзүүлсэн": { variant: 'destructive', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100/80 border-gray-200', label: 'Түдгэлзсэн' },
};

const AvatarWithProgress = ({ 
    employee, 
    size = 120, 
    onboardingProgress = 0 
}: { 
    employee?: Employee; 
    size?: number; 
    onboardingProgress?: number;
}) => {
    // Questionnaire progress (inner ring)
    const questionnaireProgress = employee?.questionnaireCompletion || 0;
    
    const strokeWidth = 3;
    const gap = 4; // Gap between rings
    
    // Outer ring (Onboarding) - larger radius
    const outerRadius = (size / 2) + 2;
    const outerCircumference = 2 * Math.PI * outerRadius;
    const outerOffset = outerCircumference - (onboardingProgress / 100) * outerCircumference;
    const onboardingColor = onboardingProgress < 50 ? '#6366f1' : onboardingProgress < 90 ? '#6366f1' : '#10b981'; // indigo -> emerald
    
    // Inner ring (Questionnaire) - smaller radius
    const innerRadius = (size / 2) - gap - strokeWidth;
    const innerCircumference = 2 * Math.PI * innerRadius;
    const innerOffset = innerCircumference - (questionnaireProgress / 100) * innerCircumference;
    const questionnaireColor = questionnaireProgress < 50 ? '#ef4444' : questionnaireProgress < 90 ? '#f59e0b' : '#10b981'; // red -> amber -> emerald

    const avatarContent = (
        <div className="relative" style={{ width: size, height: size }}>
            <Avatar className="h-full w-full border-2 border-background shadow-xl">
                <AvatarImage src={employee?.photoURL} alt={employee?.firstName} className="object-cover" />
                <AvatarFallback className="text-2xl bg-muted text-muted-foreground">
                    {employee ? `${employee.firstName?.charAt(0)}${employee.lastName?.charAt(0)}` : <User className="h-8 w-8" />}
                </AvatarFallback>
            </Avatar>
            {employee && (
                <svg
                    className="absolute pointer-events-none"
                    style={{ top: -strokeWidth - 2, left: -strokeWidth - 2 }}
                    width={size + (strokeWidth + 2) * 2}
                    height={size + (strokeWidth + 2) * 2}
                >
                    {/* Outer Ring Background (Onboarding) */}
                    <circle
                        stroke="#e2e8f0"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={outerRadius}
                        cx={size / 2 + strokeWidth + 2}
                        cy={size / 2 + strokeWidth + 2}
                    />
                    {/* Outer Ring Progress (Onboarding) */}
                    <circle
                        stroke={onboardingColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={outerCircumference}
                        strokeDashoffset={outerOffset}
                        strokeLinecap="round"
                        fill="transparent"
                        r={outerRadius}
                        cx={size / 2 + strokeWidth + 2}
                        cy={size / 2 + strokeWidth + 2}
                        transform={`rotate(-90 ${size / 2 + strokeWidth + 2} ${size / 2 + strokeWidth + 2})`}
                        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                    
                    {/* Inner Ring Background (Questionnaire) */}
                    <circle
                        stroke="#e2e8f0"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={innerRadius}
                        cx={size / 2 + strokeWidth + 2}
                        cy={size / 2 + strokeWidth + 2}
                    />
                    {/* Inner Ring Progress (Questionnaire) */}
                    <circle
                        stroke={questionnaireColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={innerCircumference}
                        strokeDashoffset={innerOffset}
                        strokeLinecap="round"
                        fill="transparent"
                        r={innerRadius}
                        cx={size / 2 + strokeWidth + 2}
                        cy={size / 2 + strokeWidth + 2}
                        transform={`rotate(-90 ${size / 2 + strokeWidth + 2} ${size / 2 + strokeWidth + 2})`}
                        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                </svg>
            )}
        </div>
    );

    if (employee) {
        return (
            <div className="group relative">
                <Link href={`/dashboard/employees/${employee.id}/questionnaire`}>
                    {avatarContent}
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-[10px] backdrop-blur-[1px] text-center leading-tight px-2">
                        Анкет харах
                    </div>
                </Link>
            </div>
        )
    }

    return avatarContent;
};


function ProfileSkeleton() {
    return (
        <div className="space-y-8 animate-pulse p-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="space-y-4 flex-1 w-full">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-48" />
                    <div className="flex gap-4 pt-2">
                        <Skeleton className="h-10 w-32 rounded-lg" />
                        <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                </div>
            </div>
            <div className="space-y-4 pt-8">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </div>
    )
}



const DocumentsTabContent = ({ employee }: { employee: Employee }) => {
    const { firestore } = useFirebase();

    const documentsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                    collection(firestore, 'documents'),
                    where('metadata.employeeId', '==', employee.id),
                    orderBy('uploadDate', 'desc')
                )
                : null,
        [firestore, employee.id]
    );

    const { data: documents, isLoading: isLoadingDocs, error } = useCollection<any>(documentsQuery as any);

    const mandatoryQuery = useMemoFirebase(
        () => firestore ? collection(firestore, 'er_document_types') : null,
        [firestore]
    );
    const { data: allDocTypes, isLoading: isLoadingDocTypes } = useCollection<any>(mandatoryQuery);

    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

    const complianceStats = React.useMemo(() => {
        if (!allDocTypes || !documents) return null;
        const mandatoryDocs = allDocTypes.filter((t: any) => t.isMandatory === true);
        const total = mandatoryDocs.length;
        if (total === 0) return null;

        const uploadedTypes = new Set(documents.map((d: any) => d.documentType));
        const completedDocs = mandatoryDocs.filter((m: any) => uploadedTypes.has(m.name));
        const missingDocs = mandatoryDocs.filter((m: any) => !uploadedTypes.has(m.name));
        const completed = completedDocs.length;
        const percentage = Math.round((completed / total) * 100);

        return { total, completed, percentage, missingDocs };
    }, [allDocTypes, documents]);

    const isLoading = isLoadingDocs || isLoadingDocTypes;

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                Алдаа: {error.message}
            </div>
        );
    }

    if (isLoading) return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Compliance Stats */}
            {complianceStats && (
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Баримтын бүрдүүлэлт</span>
                        </div>
                        <span className="text-sm font-medium">{complianceStats.percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${complianceStats.percentage}%` }}
                        />
                    </div>
                    {complianceStats.missingDocs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {complianceStats.missingDocs.map((m: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-[10px] bg-rose-50 text-rose-600 border-rose-200">
                                    Дутуу: {m.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-600">Бичиг баримт</h3>
                <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-8">
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                    Нэмэх
                </Button>
            </div>

            {/* Documents List */}
            <div className="space-y-2">
                {documents && documents.length > 0 ? (
                    documents.map((docItem: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border hover:border-primary/20 transition-all group">
                            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <FileIcon className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium truncate">{docItem.title}</h4>
                                    <Badge variant="secondary" className="text-[10px] shrink-0">
                                        {docItem.documentType}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {new Date(docItem.uploadDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Баримт устгах</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Энэ баримтыг устгахдаа итгэлтэй байна уу?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Болих</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    if (!firestore) return;
                                                    deleteDocumentNonBlocking(doc(firestore, 'documents', docItem.id));
                                                }}
                                                className="bg-rose-600 hover:bg-rose-700"
                                            >
                                                Устгах
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" asChild>
                                    <Link href={`/dashboard/employee-documents/${docItem.id}`}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-xl border p-12 text-center">
                        <FileIcon className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 mb-4">Баримт бичиг байхгүй</p>
                        <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" size="sm">
                            Баримт нэмэх
                        </Button>
                    </div>
                )}
            </div>

            <AddEmployeeDocumentDialog
                employeeId={employee.id}
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
            />
        </div>
    );
};


const HistoryTabContent = ({ employeeId, erDocuments, isLoading }: { employeeId: string; erDocuments?: ERDocument[]; isLoading: boolean }) => {
    const sortedDocs = React.useMemo(() => {
        if (!erDocuments) return [];
        return [...erDocuments].sort((a, b) => {
            const dateA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
            const dateB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
            return (dateB || 0) - (dateA || 0);
        });
    }, [erDocuments]);

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (!sortedDocs || sortedDocs.length === 0) {
        return (
            <div className="bg-white rounded-xl border p-12 text-center">
                <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Хөдөлмөрийн харилцааны баримт байхгүй</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {sortedDocs.map((doc, idx) => {
                const date = doc.createdAt ? (
                    doc.createdAt.seconds
                        ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString()
                        : new Date(doc.createdAt).toLocaleDateString()
                ) : '-';

                return (
                    <Link 
                        key={`${doc.id}-${idx}`} 
                        href={`/dashboard/employment-relations/${doc.id}`}
                        className="flex items-center gap-4 p-4 bg-white rounded-xl border hover:border-primary/20 hover:shadow-sm transition-all group"
                    >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h4 className="text-sm font-medium truncate">{doc.metadata?.templateName || 'Баримт'}</h4>
                                <Badge className={cn("text-[10px] shrink-0", DOCUMENT_STATUSES[doc.status].color)}>
                                    {DOCUMENT_STATUSES[doc.status].label}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                                {date} • #{doc.id.slice(-6).toUpperCase()}
                            </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                );
            })}
        </div>
    );
};

export default function EmployeeProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { user } = useUser();
    const [showAdminDialog, setShowAdminDialog] = React.useState(false);


    const employeeDocRef = useMemoFirebase(
        () => (firestore && employeeId ? doc(firestore, 'employees', employeeId) : null),
        [firestore, employeeId]
    );

    const departmentsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'departments') : null),
        [firestore]
    );

    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef as any);

    const positionDocRef = useMemoFirebase(
        ({ firestore }) => (firestore && employee?.positionId ? doc(firestore, 'positions', employee.positionId) : null),
        [employee]
    );

    const { data: position, isLoading: isLoadingPosition } = useDoc<Position>(positionDocRef as any);

    const workScheduleDocRef = useMemoFirebase(
        ({ firestore }) => (firestore && position?.workScheduleId ? doc(firestore, 'workSchedules', position.workScheduleId) : null),
        [position?.workScheduleId]
    );

    const { data: workSchedule, isLoading: isLoadingWorkSchedule } = useDoc<WorkSchedule>(workScheduleDocRef as any);

    const orgActionsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'organization_actions') : null),
        [firestore]
    );
    const { data: orgActions, isLoading: isLoadingOrgActions } = useCollection<any>(orgActionsRef);


    const erDocumentsQuery = React.useMemo(() =>
        firestore && employeeId ? query(
            collection(firestore, 'er_documents'),
            where('employeeId', '==', employeeId)
        ) : null
        , [firestore, employeeId]);

    const { data: erDocuments, isLoading: isLoadingDocs } = useCollection<ERDocument>(erDocumentsQuery as any);

    // Fetch onboarding process for this employee
    const onboardingProcessRef = useMemoFirebase(
        () => (firestore && employeeId ? doc(firestore, 'onboarding_processes', employeeId) : null),
        [firestore, employeeId]
    );
    const { data: onboardingProcess, isLoading: isLoadingOnboarding } = useDoc<any>(onboardingProcessRef as any);

    // Fetch offboarding process for this employee
    const offboardingProcessRef = useMemoFirebase(
        () => (firestore && employeeId ? doc(firestore, 'offboarding_processes', employeeId) : null),
        [firestore, employeeId]
    );
    const { data: offboardingProcess, isLoading: isLoadingOffboarding } = useDoc<any>(offboardingProcessRef as any);

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

    // Calculate offboarding progress
    const offboardingProgress = React.useMemo(() => {
        if (!offboardingProcess?.stages) return 0;
        const stages = offboardingProcess.stages;
        let totalTasks = 0;
        let completedTasks = 0;
        stages.forEach((stage: any) => {
            if (stage.tasks) {
                totalTasks += stage.tasks.length;
                completedTasks += stage.tasks.filter((t: any) => t.completed).length;
            }
        });
        return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }, [offboardingProcess]);

    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery as any);

    const isLoading = isLoadingEmployee || isLoadingDepts || isLoadingPosition || isLoadingWorkSchedule || isLoadingDocs || isLoadingOrgActions || isLoadingOnboarding || isLoadingOffboarding;

    const { effectiveHireDate, probationEndDate, effectiveTerminationDate } = React.useMemo(() => {
        let hireDate = employee?.hireDate;
        let probationEnd = null;
        let terminationDate = employee?.terminationDate;

        if (!erDocuments || erDocuments.length === 0) return { effectiveHireDate: hireDate, probationEndDate: null, effectiveTerminationDate: terminationDate };

        // Filter for appointment documents and sort by date (newest first)
        const appointmentDocs = erDocuments
            .filter(doc =>
                (doc.metadata?.actionId?.startsWith('appointment') || doc.templateId?.includes('appointment')) &&
                ['APPROVED', 'SIGNED'].includes(doc.status)
            )
            .sort((a, b) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
                return (dateB || 0) - (dateA || 0);
            });

        if (appointmentDocs.length > 0) {
            const latestDoc = appointmentDocs[0];
            const inputs = latestDoc.customInputs || {};
            const actionId = latestDoc.metadata?.actionId;

            // Get mapping for this action
            const actionConfig = orgActions?.find((a: any) => a.id === actionId);
            const mappings = actionConfig?.dateMappings || {};

            let hireDateKey = null;
            let probationEndKey = null;

            if (actionId === 'appointment_probation') {
                hireDateKey = mappings['probationStartDate'];
                probationEndKey = mappings['probationEndDate'];
            } else if (actionId === 'appointment_reappoint') {
                hireDateKey = mappings['reappointmentDate'];
            } else if (actionId === 'appointment_permanent') {
                hireDateKey = mappings['appointmentDate'];
            }

            let hireDateVal = hireDateKey ? inputs[hireDateKey] : null;
            probationEnd = probationEndKey ? inputs[probationEndKey] : null;

            // Fallback to legacy hardcoded keys or generic ones if mapping is missing
            if (!hireDateVal) {
                if (actionId === 'appointment_probation') {
                    hireDateVal = inputs['Туршилтын эхлэх огноо'] || inputs['probationStartDate'];
                } else if (actionId === 'appointment_reappoint') {
                    hireDateVal = inputs['Томилогдсон огноо'] || inputs['appointmentDate'];
                } else if (actionId === 'appointment_permanent') {
                    hireDateVal = inputs['Томилогдсон хугацаа'] || inputs['appointmentDate'];
                }
            }

            // General fallbacks for hire date
            if (!hireDateVal) {
                hireDateVal = inputs['startDate'] || inputs['date'] || inputs['Огноо'];
            }

            // Last resort: find any string that looks like a date
            if (!hireDateVal) {
                hireDateVal = Object.values(inputs).find(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v));
            }

            if (hireDateVal) {
                hireDate = hireDateVal;
            }
        }

        // Filter for release documents
        const releaseDocs = erDocuments
            .filter(doc =>
                (doc.metadata?.actionId?.startsWith('release') || doc.templateId?.includes('release')) &&
                ['APPROVED', 'SIGNED'].includes(doc.status)
            )
            .sort((a, b) => {
                const dateA = a.createdAt?.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime() / 1000;
                const dateB = b.createdAt?.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime() / 1000;
                return (dateB || 0) - (dateA || 0);
            });

        if (releaseDocs.length > 0) {
            const latestDoc = releaseDocs[0];
            const inputs = latestDoc.customInputs || {};
            const actionId = latestDoc.metadata?.actionId;
            const actionConfig = orgActions?.find((a: any) => a.id === actionId);
            const mappings = actionConfig?.dateMappings || {};

            const releaseDateKey = mappings['releaseDate'];
            let releaseDateVal = releaseDateKey ? inputs[releaseDateKey] : null;

            if (!releaseDateVal) {
                releaseDateVal = inputs['Ажлаас чөлөөлөх огноо'] || inputs['releaseDate'] || inputs['terminationDate'];
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
    const departmentName = departmentMap.get(employee.departmentId) || 'Тодорхойгүй';
    const workScheduleName = workSchedule?.name || 'Тодорхойгүй';
    const statusInfo = statusConfig[employee.status] || { variant: 'outline', className: '', label: employee.status };
    const isActive = employee.status === 'Идэвхтэй';



    return (
        <>
        <div className="flex flex-col h-full bg-slate-50/50">

            {/* Sticky Header */}
            <div className="bg-white border-b sticky top-0 z-30">
                <div className="px-6 md:px-8">
                    <div className="flex items-center justify-between py-4 gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                                <Link href="/dashboard/employees">
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                            </Button>
                            <Avatar className="h-10 w-10 border-2 border-white shadow shrink-0">
                                <AvatarImage src={employee.photoURL} alt={employee.firstName} />
                                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                    {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-semibold truncate">
                                        {fullName}
                                    </h1>
                                    <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusInfo.className)}>
                                        {statusInfo.label}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    {employee.jobTitle || 'Албан тушаал'} • {departmentName} • #{employee.employeeCode}
                                </p>
                            </div>
                        </div>
                        
                        {/* Header Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className={cn("h-8", employee.role === 'admin' && "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100")}
                                onClick={() => setShowAdminDialog(true)}
                            >
                                <Shield className="h-3.5 w-3.5 mr-1.5" />
                                {employee.role === 'admin' ? 'Админ' : 'Админ болгох'}
                            </Button>
                            <Button variant="outline" size="sm" className="h-8" asChild>
                                <Link href={`/dashboard/employees/${employeeId}/questionnaire`}>
                                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                                    Анкет
                                </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8" asChild>
                                <Link href={`/dashboard/employees/${employeeId}/lifecycle`}>
                                    <Activity className="h-3.5 w-3.5 mr-1.5" />
                                    Life Cycle
                                </Link>
                            </Button>
                            <Button size="sm" className="h-8" asChild>
                                <Link href={`/dashboard/employees/${employeeId}/edit`}>
                                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                                    Засах
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8 space-y-6 pb-32">
                    {/* Inactive Warning */}
                    {!isActive && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            <p className="text-sm font-medium text-amber-900">
                                Энэ ажилтан <strong>{statusInfo.label?.toLowerCase()}</strong> төлөвтэй байна. Томилох үйлдэл баталгаажсан үед идэвхтэй болно.
                            </p>
                        </div>
                    )}

            {/* Main Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Left Sidebar - Profile Card */}
                <div className="xl:col-span-1 space-y-4">
                    {/* Profile Card */}
                    <div className="bg-white rounded-xl border overflow-hidden">
                        <div className="h-20 bg-gradient-to-br from-primary to-indigo-600 relative">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)]" />
                        </div>
                        <div className="px-4 pb-4 -mt-10 text-center">
                            <div className="flex justify-center mb-3">
                                <AvatarWithProgress employee={employee} size={80} onboardingProgress={onboardingProgress} />
                            </div>
                            <h2 className="text-base font-semibold text-slate-800">{fullName}</h2>
                            <p className="text-xs text-slate-500 mb-3">{employee.jobTitle || 'Албан тушаал'}</p>
                            
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-center gap-2 text-slate-600">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{employee.phoneNumber || '-'}</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-slate-600">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="truncate">{employee.email}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="bg-white rounded-xl border p-4 space-y-3">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase">Ерөнхий</h3>
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Код</span>
                                <span className="font-medium font-mono">#{employee.employeeCode}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Хэлтэс</span>
                                <span className="font-medium truncate ml-2">{departmentName}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Цагийн хуваарь</span>
                                <span className="font-medium">{workScheduleName}</span>
                            </div>
                            {effectiveHireDate && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Ажилд орсон</span>
                                    <span className="font-medium">{effectiveHireDate}</span>
                                </div>
                            )}
                            {probationEndDate && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Туршилт дуусах</span>
                                    <span className="font-medium">{probationEndDate}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Legend */}
                    <div className="bg-white rounded-xl border p-3">
                        <h3 className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Аватар тайлбар</h3>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                <span className="text-slate-600">Гадна цагираг - Onboarding</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                <span className="text-slate-600">Дотор цагираг - Анкет</span>
                            </div>
                        </div>
                    </div>

                    {/* Questionnaire Progress */}
                    <div className="bg-white rounded-xl border p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase">Анкет</h3>
                            <span className={cn(
                                "text-xs font-medium",
                                (employee.questionnaireCompletion || 0) >= 90 ? "text-emerald-600" :
                                (employee.questionnaireCompletion || 0) >= 50 ? "text-amber-600" : "text-rose-600"
                            )}>
                                {Math.round(employee.questionnaireCompletion || 0)}%
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    (employee.questionnaireCompletion || 0) >= 90 ? "bg-emerald-500" :
                                    (employee.questionnaireCompletion || 0) >= 50 ? "bg-amber-500" : "bg-rose-500"
                                )}
                                style={{ width: `${employee.questionnaireCompletion || 0}%` }}
                            />
                        </div>
                        <Button variant="ghost" size="sm" className="w-full mt-3 h-8 text-xs" asChild>
                            <Link href={`/dashboard/employees/${employeeId}/questionnaire`}>
                                Анкет харах
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Link>
                        </Button>
                    </div>

                    {/* Onboarding Progress */}
                    <div className="bg-white rounded-xl border p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase">Onboarding</h3>
                            <span className={cn(
                                "text-xs font-medium",
                                onboardingProgress >= 100 ? "text-emerald-600" :
                                onboardingProgress > 0 ? "text-indigo-600" : "text-slate-400"
                            )}>
                                {onboardingProgress}%
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    onboardingProgress >= 100 ? "bg-emerald-500" : "bg-indigo-500"
                                )}
                                style={{ width: `${onboardingProgress}%` }}
                            />
                        </div>
                        <Button variant="ghost" size="sm" className="w-full mt-3 h-8 text-xs" asChild>
                            <Link href={`/dashboard/onboarding/${employeeId}`}>
                                Onboarding харах
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Link>
                        </Button>
                    </div>

                    {/* Offboarding Progress - Only show if process exists */}
                    {offboardingProcess && (
                        <div className="bg-white rounded-xl border p-4 ring-2 ring-amber-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold text-amber-600 uppercase">Offboarding</h3>
                                <span className={cn(
                                    "text-xs font-medium",
                                    offboardingProgress >= 100 ? "text-emerald-600" : "text-amber-600"
                                )}>
                                    {offboardingProgress}%
                                </span>
                            </div>
                            <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                                <div 
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        offboardingProgress >= 100 ? "bg-emerald-500" : "bg-amber-500"
                                    )}
                                    style={{ width: `${offboardingProgress}%` }}
                                />
                            </div>
                            <Button variant="ghost" size="sm" className="w-full mt-3 h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50" asChild>
                                <Link href={`/dashboard/offboarding/${employeeId}`}>
                                    Offboarding харах
                                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Right Content - Tabs */}
                <div className="xl:col-span-3">
                    <Tabs defaultValue="history" className="w-full">
                        {/* Tab Navigation */}
                        <div className="bg-white rounded-xl border mb-4 p-1 overflow-x-auto no-scrollbar">
                            <TabsList className="bg-transparent h-10 w-full justify-start gap-1">
                                <TabsTrigger
                                    value="history"
                                    className="h-8 px-4 rounded-lg text-xs font-medium data-[state=active]:bg-slate-100"
                                >
                                    Хөдөлмөрийн харилцаа
                                </TabsTrigger>
                                <TabsTrigger
                                    value="onboarding"
                                    className="h-8 px-4 rounded-lg text-xs font-medium data-[state=active]:bg-slate-100"
                                >
                                    Onboarding
                                </TabsTrigger>
                                {offboardingProcess && (
                                    <TabsTrigger
                                        value="offboarding"
                                        className="h-8 px-4 rounded-lg text-xs font-medium data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700"
                                    >
                                        Offboarding
                                    </TabsTrigger>
                                )}
                                <TabsTrigger
                                    value="documents"
                                    className="h-8 px-4 rounded-lg text-xs font-medium data-[state=active]:bg-slate-100"
                                >
                                    Баримт бичиг
                                </TabsTrigger>
                                <TabsTrigger
                                    value="time-off"
                                    className="h-8 px-4 rounded-lg text-xs font-medium data-[state=active]:bg-slate-100"
                                >
                                    Чөлөө
                                </TabsTrigger>
                                <TabsTrigger
                                    value="vacation"
                                    className="h-8 px-4 rounded-lg text-xs font-medium data-[state=active]:bg-slate-100"
                                >
                                    Амралт
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Tab Contents */}
                        <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                            <HistoryTabContent employeeId={employeeId || ''} erDocuments={erDocuments} isLoading={isLoadingDocs} />
                        </TabsContent>
                        <TabsContent value="vacation" className="mt-0 focus-visible:outline-none">
                            <VacationTabContent employee={employee} />
                        </TabsContent>
                        <TabsContent value="time-off" className="mt-0 focus-visible:outline-none">
                            <div className="bg-white rounded-xl border p-8 text-center">
                                <Calendar className="mx-auto h-10 w-10 text-slate-200 mb-3" />
                                <p className="text-sm text-slate-500">Одоогоор чөлөөний бүртгэл байхгүй байна</p>
                            </div>
                        </TabsContent>
                        <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
                            <DocumentsTabContent employee={employee} />
                        </TabsContent>
                        <TabsContent value="onboarding" className="mt-0 focus-visible:outline-none">
                            <OnboardingTabContent employeeId={employeeId || ''} employee={employee} />
                        </TabsContent>
                        {offboardingProcess && (
                            <TabsContent value="offboarding" className="mt-0 focus-visible:outline-none">
                                <OffboardingTabContent employeeId={employeeId || ''} employee={employee} />
                            </TabsContent>
                        )}
                    </Tabs>
                </div>
            </div>
                </div>
            </div>
        </div>

            {/* Admin Dialog */}
            {user && (
                <MakeAdminDialog
                    open={showAdminDialog}
                    onOpenChange={setShowAdminDialog}
                    employee={employee}
                    currentUserId={user.uid}
                />
            )}
        </>
    )
}
