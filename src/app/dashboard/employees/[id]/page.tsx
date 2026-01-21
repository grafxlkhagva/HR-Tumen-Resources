// src/app/dashboard/employees/[id]/page.tsx
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { PageHeader } from '@/components/page-header';
import { collection, doc, query, orderBy, where, writeBatch, increment } from 'firebase/firestore';
import { type Employee } from '../data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    Briefcase,
    Calendar,
    Edit,
    Mail,
    Phone,
    FileText,
    MoreHorizontal,
    User,
    Shield,
    Clock,
    PlusCircle,
    CheckCircle,
    AlertTriangle,
    UserMinus,
    Loader2,
    BookOpen,
    Trash2,
    ChevronRight,
    MapPin,
    GraduationCap,
    File as FileIcon,
    Download,
    Paperclip,
    ShieldCheck,
    Activity,
    CalendarCheck,
    Hash
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CVDisplay } from './cv-display';
import { EmploymentHistoryTimeline } from './EmploymentHistoryTimeline';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { ERDocument, DOCUMENT_STATUSES } from '../../employment-relations/types';

import { VacationTabContent } from './vacation-tab-content';
import { OffboardingDialog } from './OffboardingDialog';
import { AddEmployeeDocumentDialog } from './AddEmployeeDocumentDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';


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


function InfoItem({ icon: Icon, label, value, action }: { icon: any, label: string, value: React.ReactNode, action?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/30 group hover:bg-slate-50 transition-all">
            <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                <Icon className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <div className="text-sm font-semibold text-slate-700 truncate flex items-center gap-2">
                    {value || '-'}
                    {action}
                </div>
            </div>
        </div>
    )
}

const AvatarWithProgress = ({ employee, size = 120 }: { employee?: Employee; size?: number; }) => {
    const progress = employee?.questionnaireCompletion || 0;
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    const progressColor = progress < 50 ? 'text-red-500' : progress < 90 ? 'text-amber-500' : 'text-emerald-500';

    const avatarContent = (
        <div className="relative" style={{ width: size, height: size }}>
            <Avatar className="h-full w-full border-4 border-background shadow-xl">
                <AvatarImage src={employee?.photoURL} alt={employee?.firstName} className="object-cover" />
                <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
                    {employee ? `${employee.firstName?.charAt(0)}${employee.lastName?.charAt(0)}` : <User className="h-10 w-10" />}
                </AvatarFallback>
            </Avatar>
            {employee && (
                <svg
                    className="absolute -top-[4px] -left-[4px] pointer-events-none"
                    width={size + 8}
                    height={size + 8}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ overflow: 'visible' }}
                >
                    {/* Background Circle */}
                    <circle
                        className="text-muted/20"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius + 4} // Slightly larger
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Progress Circle */}
                    <circle
                        className={cn("transition-all duration-1000 ease-out", progressColor)}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference + 25} // Adjust for size diff
                        strokeDashoffset={offset > 0 ? offset + (25 * (1 - progress / 100)) : 0} // Approx adjust
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius + 4}
                        cx={size / 2}
                        cy={size / 2}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                    {/* Percentage Pill */}
                    <foreignObject x={0} y={size - 20} width={size} height={30}>
                        <div className="flex justify-center">
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border shadow-sm", progressColor)}>
                                {Math.round(progress)}%
                            </span>
                        </div>
                    </foreignObject>
                </svg>
            )}
        </div>
    );

    if (employee) {
        return (
            <div className="group relative">
                <Link href={`/dashboard/employees/${employee.id}/questionnaire`}>
                    {avatarContent}
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-xs backdrop-blur-[1px]">
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

    const { data: documents, isLoading, error } = useCollection<any>(documentsQuery as any);
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
                Алдаа гарлаа: {error.message}
            </div>
        );
    }



    if (isLoading) return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
        </div>
    );

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-end">
                <Button onClick={() => setIsAddDialogOpen(true)} size="icon" className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl h-10 w-10 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                    <PlusCircle className="w-4 h-4" />
                </Button>
            </div>

            <div className="grid gap-3">
                {documents && documents.length > 0 ? (
                    documents.map((doc, idx) => (
                        <div key={idx} className="group flex items-center gap-5 p-5 bg-white border border-slate-100 rounded-[1.25rem] transition-all hover:bg-slate-50 hover:border-indigo-100/50 hover:shadow-md hover:shadow-indigo-50/50">
                            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                                <FileIcon className="h-5.5 w-5.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h4 className="text-sm font-bold text-slate-700 truncate">{doc.title}</h4>
                                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter px-2 h-4.5 border-none bg-indigo-100 text-indigo-700">
                                        {doc.documentType}
                                    </Badge>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(doc.uploadDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 border-transparent transition-all">
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Энэ баримт бичгийг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => {
                                                    if (!firestore) return;
                                                    deleteDocumentNonBlocking(doc(firestore, 'documents', doc.id));
                                                }}
                                                className="bg-rose-600 hover:bg-rose-700"
                                            >
                                                Устгах
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-white border-transparent hover:border-slate-100 transition-all" asChild>
                                    <Link href={`/dashboard/documents/${doc.id}`}>
                                        <ChevronRight className="h-5 w-5" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-24 text-center rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center bg-white/50">
                        <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mb-6">
                            <FileIcon className="h-10 w-10" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Баримт байхгүй</h4>
                        <p className="text-xs font-semibold text-slate-300">Ажилтантай холбоотой бичиг баримт одоогоор байхгүй байна.</p>
                        <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" className="mt-8 font-bold text-[10px] uppercase tracking-widest rounded-2xl px-6">
                            Анхны баримт байршуулах
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
            <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-[2rem]" />
                ))}
            </div>
        );
    }

    if (!sortedDocs || sortedDocs.length === 0) {
        return (
            <div className="py-24 text-center rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center bg-white/50">
                <FileText className="h-10 w-10 text-slate-200 mb-4" />
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Баримт байхгүй</h4>
            </div>
        );
    }

    return (
        <div className="relative pl-8 space-y-12 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {sortedDocs.map((doc, idx) => {
                const date = doc.createdAt ? (
                    doc.createdAt.seconds
                        ? new Date(doc.createdAt.seconds * 1000).toLocaleDateString()
                        : new Date(doc.createdAt).toLocaleDateString()
                ) : '-';

                return (
                    <div key={`${doc.id}-${idx}`} className="relative group">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[27px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-indigo-500 ring-4 ring-indigo-50 z-10 transition-transform group-hover:scale-125" />

                        <div className="space-y-4">
                            {/* Date Title */}
                            <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                {date}
                                <div className="h-px flex-1 bg-slate-50" />
                            </h3>

                            {/* Document Card */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm transition-all hover:shadow-md hover:border-indigo-100/50 group/card">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-base font-bold text-slate-700">{doc.metadata?.templateName || 'Нэргүй баримт'}</h4>
                                            <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 h-5", DOCUMENT_STATUSES[doc.status].color)}>
                                                {DOCUMENT_STATUSES[doc.status].label}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                ID: #{doc.id.slice(-6).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button asChild variant="outline" size="sm" className="h-11 px-5 rounded-2xl border-slate-100 bg-slate-50 font-bold text-xs gap-2.5 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95 group/btn">
                                            <Link href={`/dashboard/employment-relations/${doc.id}`}>
                                                <Paperclip className="w-4 h-4 transition-transform group-hover/btn:rotate-12" />
                                                Хавсралт
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const OverviewTabContent = ({ employeeId, employee }: { employeeId: string; employee: Employee }) => {
    const questionnaireRef = useMemoFirebase(
        ({ firestore }) =>
            firestore && employeeId ? doc(firestore, `employees/${employeeId}/questionnaire`, 'data') : null,
        [employeeId]
    );

    const { data: questionnaire, isLoading } = useDoc(questionnaireRef as any);

    const { completionPercentage, filledCount, totalCount } = React.useMemo(() => {
        if (!questionnaire) return { completionPercentage: 0, filledCount: 0, totalCount: 0 };

        const fields = [
            'lastName', 'firstName', 'registrationNumber', 'birthDate', 'gender', 'idCardNumber',
            'personalPhone', 'personalEmail', 'homeAddress',
        ];

        const arrayFields = [
            { name: 'emergencyContacts', notApplicableKey: null },
            { name: 'education', notApplicableKey: 'educationNotApplicable' },
            { name: 'languages', notApplicableKey: 'languagesNotApplicable' },
            { name: 'trainings', notApplicableKey: 'trainingsNotApplicable' },
            { name: 'familyMembers', notApplicableKey: 'familyMembersNotApplicable' },
            { name: 'experiences', notApplicableKey: 'experienceNotApplicable' },
        ];

        let filled = 0;
        const total = fields.length + arrayFields.length;

        fields.forEach(field => {
            if (questionnaire[field]) filled++;
        });

        arrayFields.forEach(fieldInfo => {
            if (fieldInfo.notApplicableKey && questionnaire[fieldInfo.notApplicableKey] === true) {
                filled++;
            } else if (Array.isArray(questionnaire[fieldInfo.name]) && questionnaire[fieldInfo.name].length > 0) {
                filled++;
            }
        });

        return {
            completionPercentage: total > 0 ? (filled / total) * 100 : 0,
            filledCount: filled,
            totalCount: total,
        }
    }, [questionnaire]);

    if (isLoading) return <Skeleton className="h-64 w-full rounded-3xl" />;

    return (
        <div className="space-y-10">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <User className="h-5 w-5" />
                </div>
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overview</label>
                    <h3 className="text-lg font-bold text-slate-800">Ерөнхий мэдээлэл</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 transition-all hover:shadow-md hover:border-indigo-100/50">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Анкетын бүрдүүлэлт</p>
                            <h4 className="text-sm font-bold text-slate-700">Хувийн мэдээллийн бүрэн байдал</h4>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 font-black text-xs">
                            {Math.round(completionPercentage)}%
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filledCount} / {totalCount} ТАЛБАР</span>
                        </div>
                        <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                        <div className="mt-6 flex items-start gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                                Анкетын мэдээлэл дутуу байх нь цалин бодолт болон тайлангуудад нөлөөлөх эрсдэлтэй.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 transition-all hover:shadow-md hover:border-emerald-100/50">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Ур чадвар</p>
                            <h4 className="text-sm font-bold text-slate-700">Мэргэжлийн болон хувь хүний</h4>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5 min-h-[120px] content-start">
                        {['Teamwork', 'Leadership', 'Strategic Planning', 'Communication'].map(skill => (
                            <Badge key={skill} variant="secondary" className="px-4 py-2 font-bold text-[10px] uppercase tracking-wider bg-slate-50 text-slate-500 border-none rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                {skill}
                            </Badge>
                        ))}
                        <div className="w-full mt-auto pt-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                            * Системээс автоматаар үүсгэсэн
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


export default function EmployeeProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isOffboardingOpen, setIsOffboardingOpen] = React.useState(false);


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

    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery as any);

    const isLoading = isLoadingEmployee || isLoadingDepts || isLoadingPosition || isLoadingWorkSchedule || isLoadingDocs || isLoadingOrgActions;

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

    const handleReactivate = async () => {
        if (!employee || !firestore) return;

        await updateDocumentNonBlocking(employeeDocRef!, { status: 'Идэвхтэй' });

        toast({
            title: 'Ажилтан идэвхжлээ',
            description: `${employee.firstName}-н нэвтрэх эрхийг сэргээлээ.`,
        });

    }


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
        <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
            <OffboardingDialog
                open={isOffboardingOpen}
                onOpenChange={setIsOffboardingOpen}
                employee={employee}
            />

            {/* Page Header */}
            <PageHeader
                title={employee.firstName}
                description={employee.lastName ? `${employee.lastName}-ийн мэдээлэл` : undefined}
                breadcrumbs={[
                    { label: 'Ажилтан', href: '/dashboard/employees' },
                    { label: employee.firstName }
                ]}
                showBackButton
                backHref="/dashboard/employees"
            />

            {!isActive && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-4 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Анхааруулга</p>
                        <p className="text-sm opacity-90">Энэ ажилтан одоогоор <strong>{statusInfo.label?.toLowerCase() || employee.status}</strong> төлөвтэй байна. Системд нэвтрэх эрх хязгаарлагдмал.</p>
                    </div>
                    <Button onClick={handleReactivate} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-none">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Идэвхжүүлэх
                    </Button>
                </div>
            )}

            {/* Main Profile Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Avatar & Actions */}
                <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                    <Card className="overflow-hidden border-none shadow-xl shadow-indigo-100/20 bg-white rounded-[2.5rem]">
                        <div className="h-32 bg-gradient-to-br from-indigo-600 to-violet-700 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.8),transparent)]" />
                            <div className="absolute -right-4 -top-4 h-24 w-24 bg-white/10 rounded-full blur-2xl" />
                        </div>
                        <CardContent className="pt-0 relative px-8 pb-10 text-center">
                            <div className="flex justify-center -mt-16 mb-6">
                                <AvatarWithProgress employee={employee} size={128} />
                            </div>
                            <h1 className="text-2xl font-black tracking-tight mb-2 text-slate-800 leading-tight">{employee.lastName} {employee.firstName}</h1>
                            <div className="flex flex-col items-center gap-1 mb-8">
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">{employee.jobTitle}</p>
                                </div>
                                <div className="h-1 w-8 bg-indigo-500 rounded-full mt-2" />
                            </div>

                            <div className="flex flex-wrap gap-2 justify-center mb-10">
                                <Badge variant="secondary" className="font-bold text-[9px] uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100 px-3 py-1.5 rounded-lg">
                                    {departmentName}
                                </Badge>
                                <Badge variant="outline" className={cn("font-bold text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg border-2", statusInfo.className)}>
                                    {statusInfo.label}
                                </Badge>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-slate-50 mb-8">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Хуваарь</span>
                                    <span className="text-slate-600">{workScheduleName}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Орсон</span>
                                    <span className="text-slate-600">{effectiveHireDate ? new Date(effectiveHireDate).toLocaleDateString() : '-'}</span>
                                </div>
                                {probationEndDate && (
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                        <span className="text-slate-400 flex items-center gap-1.5"><CalendarCheck className="w-3 h-3" /> Туршилт</span>
                                        <span className="text-slate-600">{new Date(probationEndDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {effectiveTerminationDate && (
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                        <span className="text-slate-400 flex items-center gap-1.5"><UserMinus className="w-3 h-3" /> Чөлөөлөгдөх</span>
                                        <span className="text-indigo-600">{new Date(effectiveTerminationDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                                <div className="h-px bg-slate-50 my-2" />
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider group/link">
                                    <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</span>
                                    <a href={`mailto:${employee.email}`} className="text-slate-600 truncate max-w-[120px] hover:text-indigo-600 transition-colors">{employee.email}</a>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" /> Утас</span>
                                    <span className="text-slate-600">{employee.phoneNumber || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-slate-400 flex items-center gap-1.5"><Hash className="w-3 h-3" /> ID Code</span>
                                    <span className="text-slate-600 font-mono">#{employee.employeeCode}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 w-full">
                                <Button asChild variant="default" className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95">
                                    <Link href={`/dashboard/employees/${employeeId}/edit`}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Мэдээлэл засах
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" className="w-full h-12 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                    <Link href={`/dashboard/employees/${employeeId}/questionnaire`}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Анкет харах
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" className="w-full h-12 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 mt-1">
                                    <Link href={`/dashboard/employees/${employeeId}/lifecycle`}>
                                        <Activity className="mr-2 h-4 w-4" />
                                        Life Cycle
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column: Key Details & Tabs */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-8 pt-2">
                    <Tabs defaultValue="history" className="w-full">
                        <div className="bg-slate-50/50 rounded-3xl p-1.5 inline-flex mb-8 overflow-x-auto max-w-full scrollbar-hide">
                            <TabsList className="bg-transparent h-12 gap-1 px-1">

                                <TabsTrigger
                                    value="history"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Хөдөлмөрийн харилцаа
                                </TabsTrigger>
                                <TabsTrigger
                                    value="documents"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Ажилтны баримт бичиг
                                </TabsTrigger>
                                <TabsTrigger
                                    value="time-off"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Чөлөө
                                </TabsTrigger>
                                <TabsTrigger
                                    value="vacation"
                                    className="h-9 px-6 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
                                >
                                    Ээлжийн амралт
                                </TabsTrigger>

                            </TabsList>
                        </div>

                        <div className="min-h-[400px]">


                            <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                                <HistoryTabContent employeeId={employeeId || ''} erDocuments={erDocuments} isLoading={isLoadingDocs} />
                            </TabsContent>
                            <TabsContent value="vacation" className="mt-0 focus-visible:outline-none">
                                <VacationTabContent employee={employee} />
                            </TabsContent>
                            <TabsContent value="time-off" className="mt-0 focus-visible:outline-none">
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Чөлөөний түүх</CardTitle>
                                        <CardDescription>Баталгаажсан болон хүлээгдэж буй чөлөөний хүсэлтүүд</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="py-12 text-center text-muted-foreground border-dashed border-2 rounded-xl">
                                            <Calendar className="mx-auto h-10 w-10 opacity-20 mb-3" />
                                            <p>Одоогоор чөлөөний бүртгэл байхгүй байна.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
                                <DocumentsTabContent employee={employee} />
                            </TabsContent>

                        </div>
                    </Tabs>
                </div>
            </div>
        </div >
    )
}
