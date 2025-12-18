

// src/app/dashboard/employees/[id]/page.tsx
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, useDoc, useMemoFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, where, writeBatch, increment } from 'firebase/firestore';
import { type Employee } from '../data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Calendar, Edit, Mail, Phone, FileText, MoreHorizontal, User, Shield, Clock, PlusCircle, CheckCircle, AlertTriangle, UserMinus, Loader2 } from 'lucide-react';
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

import { Progress } from '@/components/ui/progress';
import { AssignProgramDialog, type AssignedProgram, type AssignedTask } from './AssignProgramDialog';
import { TaskStatusDropdown } from './TaskStatusDropdown';
import { OffboardingDialog } from './OffboardingDialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

const statusConfig: { [key: string]: { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, label: string } } = {
    "Идэвхтэй": { variant: 'default', className: 'bg-green-500 hover:bg-green-600', label: 'Идэвхтэй' },
    "Жирэмсний амралттай": { variant: 'secondary', className: 'bg-blue-500 hover:bg-blue-600 text-white', label: 'Жирэмсэний' },
    "Хүүхэд асрах чөлөөтэй": { variant: 'secondary', className: 'bg-purple-500 hover:bg-purple-600 text-white', label: 'Хүүхэд асрах' },
    "Урт хугацааны чөлөөтэй": { variant: 'outline', className: 'border-yellow-500 text-yellow-600', label: 'Чөлөөтэй' },
    "Ажлаас гарсан": { variant: 'destructive', className: '', label: 'Гарсан' },
    "Түр түдгэлзүүлсэн": { variant: 'destructive', className: 'bg-yellow-600 hover:bg-yellow-700', label: 'Түдгэлзүүлсэн' },
};


function InfoRow({ icon: Icon, label, value, actionButton }: { icon: React.ElementType, label: string, value: React.ReactNode, actionButton?: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-4 items-center">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </dt>
            <dd className="col-span-2 text-sm flex items-center justify-between">
                <span>{value || '-'}</span>
                {actionButton}
            </dd>
        </div>
    );
}

const AvatarWithProgress = ({ employee, size = 96 }: { employee?: Employee; size?: number; }) => {
    const progress = employee?.questionnaireCompletion || 0;
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    const progressColor = progress < 50 ? 'text-red-500' : progress < 90 ? 'text-yellow-500' : 'text-green-500';

    const avatarContent = (
         <div className="relative mx-auto mb-3" style={{ width: size, height: size }}>
            <Avatar className="h-full w-full">
                <AvatarImage src={employee?.photoURL} alt={employee?.firstName} />
                <AvatarFallback className="text-3xl bg-muted">
                    {employee ? `${employee.firstName?.charAt(0)}${employee.lastName?.charAt(0)}` : <User className="h-8 w-8 text-muted-foreground"/>}
                </AvatarFallback>
            </Avatar>
            {employee && (
                 <svg
                    className="absolute top-0 left-0"
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                >
                    <circle
                        className="text-muted/30"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    <circle
                        className={cn("transition-all duration-500 ease-in-out", progressColor)}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                        transform={`rotate(-90 ${size/2} ${size/2})`}
                    />
                </svg>
            )}
        </div>
    );
    
    if (employee) {
        return <Link href={`/dashboard/employees/${employee.id}/questionnaire`}>{avatarContent}</Link>
    }

    return avatarContent;
};


function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            <div className="mb-4 flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-8 w-48" />
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-40" />
                            <Skeleton className="h-5 w-32" />
                            <div className="flex gap-2">
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-6 w-20" />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="grid grid-cols-3 gap-4">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-48 col-span-2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

const OnboardingTabContent = ({ employee }: { employee: Employee }) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);

    const assignedProgramsQuery = useMemoFirebase(
      () =>
        firestore
          ? query(
              collection(firestore, `employees/${employee.id}/assignedPrograms`),
              orderBy('startDate', 'desc')
            )
          : null,
      [firestore, employee.id]
    );

    const { data: assignedPrograms, isLoading: isLoadingAssigned } = useCollection<AssignedProgram>(assignedProgramsQuery);
    
    const handleStatusChange = (program: AssignedProgram, taskIndex: number, newStatus: AssignedTask['status']) => {
        if (!firestore) return;
        
        const updatedTasks = [...program.tasks];
        const taskToUpdate = updatedTasks[taskIndex];
        
        if (taskToUpdate) {
            updatedTasks[taskIndex] = { 
                ...taskToUpdate, 
                status: newStatus,
                completedAt: newStatus === 'DONE' || newStatus === 'VERIFIED' ? new Date().toISOString() : undefined
            };

            const doneTasks = updatedTasks.filter(t => t.status === 'DONE' || t.status === 'VERIFIED').length;
            const inProgressTasks = updatedTasks.filter(t => t.status === 'IN_PROGRESS').length;
            const progress = updatedTasks.length > 0 ? ((doneTasks * 100) + (inProgressTasks * 50)) / updatedTasks.length : 0;
            const programStatus = progress === 100 ? 'COMPLETED' : 'IN_PROGRESS';

            const programDocRef = doc(firestore, `employees/${employee.id}/assignedPrograms`, program.id);
            updateDocumentNonBlocking(programDocRef, { tasks: updatedTasks, progress, status: programStatus });

            toast({ title: "Даалгаврын төлөв шинэчлэгдлээ." });
        }
    };

    if (isLoadingAssigned) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Дасан зохицох хөтөлбөрүүд</CardTitle>
                    <CardDescription>
                        Ажилтанд оноогдсон бүх хөтөлбөрийн жагсаалт.
                    </CardDescription>
                </div>
                 <Button onClick={() => setIsAssignDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Хөтөлбөр оноох
                </Button>
            </CardHeader>
            <CardContent>
                 <AssignProgramDialog 
                    open={isAssignDialogOpen} 
                    onOpenChange={setIsAssignDialogOpen}
                    employee={employee}
                    assignedProgramIds={assignedPrograms?.map(p => p.programId) || []}
                 />

                {assignedPrograms && assignedPrograms.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {assignedPrograms.map(program => (
                        <AccordionItem value={program.id} key={program.id} className="border rounded-lg">
                            <AccordionTrigger className="p-4 hover:no-underline">
                                <div className="w-full flex justify-between items-center pr-4">
                                    <div className="text-left">
                                        <p className="font-semibold">{program.programName}</p>
                                        <p className="text-sm text-muted-foreground">Эхэлсэн: {new Date(program.startDate).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-4 w-1/3">
                                        <Progress value={program.progress} className="h-2" />
                                        <span className="text-sm font-bold w-12 text-right">{Math.round(program.progress || 0)}%</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <div className="space-y-2">
                                {program.tasks.map((task, index) => (
                                    <div key={task.templateTaskId + index} className="flex items-center justify-between rounded-md border p-3">
                                        <div>
                                            <p className="font-medium">{task.title}</p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{task.assigneeName || 'Тодорхойгүй'}</span>
                                                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(task.dueDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <TaskStatusDropdown 
                                            currentStatus={task.status} 
                                            onStatusChange={(newStatus) => handleStatusChange(program, index, newStatus)} 
                                        />
                                    </div>
                                ))}
                                {program.tasks.length === 0 && (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <p>Энэ хөтөлбөрт оноогдсон даалгавар байхгүй байна.</p>
                                    </div>
                                )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">Энэ ажилтанд одоогоор идэвхтэй дасан зохицох хөтөлбөр оноогоогүй байна.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const DocumentsTabContent = ({ employeeId }: { employeeId: string }) => {
    const { firestore } = useFirebase();
    const historyQuery = useMemoFirebase(
      () =>
        firestore && employeeId
          ? query(
              collection(firestore, `employees/${employeeId}/employmentHistory`),
              orderBy('eventDate', 'desc')
            )
          : null,
      [firestore, employeeId]
    );
  
    const {
      data: history,
      isLoading,
      error,
    } = useCollection<EmploymentHistoryEvent>(historyQuery);

    const documents = history?.filter(event => event.documentId);

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
        )
    }

    if (error) {
        return <p className="text-destructive">Баримт бичиг ачаалахад алдаа гарлаа.</p>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Хавсаргасан бичиг баримтууд</CardTitle>
                <CardDescription>
                    Ажилтны хөдөлмөрийн түүхтэй холбоотой хавсаргасан баримтууд.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {documents && documents.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Баримтын нэр</TableHead>
                            <TableHead>Холбогдох үйл явдал</TableHead>
                            <TableHead>Огноо</TableHead>
                            <TableHead className="text-right">Үйлдэл</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map((doc) => (
                            <TableRow key={doc.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {doc.documentName}
                                </TableCell>
                                <TableCell>{doc.eventType}</TableCell>
                                <TableCell>{new Date(doc.eventDate).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                         <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Цэс</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/dashboard/documents/${doc.documentId}`}>
                                                    Дэлгэрэнгүй
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                                                    Татах
                                                </a>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 ) : (
                    <div className="py-10 text-center text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12" />
                        <p className="mt-4">Хавсаргасан баримт бичиг одоогоор байхгүй байна.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const HistoryTabContent = ({ employeeId }: { employeeId: string }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Хөдөлмөрийн харилцааны түүх</CardTitle>
                <CardDescription>Ажилтны хөдөлмөрийн гэрээтэй холбоотой бүх үйл явдлын түүх.</CardDescription>
            </CardHeader>
            <CardContent>
                <EmploymentHistoryTimeline employeeId={employeeId} />
            </CardContent>
        </Card>
    )
}

const OverviewTabContent = ({ employeeId }: { employeeId: string }) => {
    const questionnaireRef = useMemoFirebase(
      ({ firestore }) =>
        firestore && employeeId ? doc(firestore, `employees/${employeeId}/questionnaire`, 'data') : null,
      [employeeId]
    );

    const { data: questionnaire, isLoading } = useDoc(questionnaireRef);
    
    const { completionPercentage, filledCount, totalCount } = React.useMemo(() => {
        if (!questionnaire) return { completionPercentage: 0, filledCount: 0, totalCount: 0 };
        
        const fields = [
            'lastName', 'firstName', 'registrationNumber', 'birthDate', 'gender', 'idCardNumber',
            'personalPhone', 'personalEmail', 'homeAddress',
        ];
        
        const arrayFields = [
            { name: 'emergencyContacts', notApplicableKey: null }, // always applicable
            { name: 'education', notApplicableKey: 'educationNotApplicable' },
            { name: 'languages', notApplicableKey: 'languagesNotApplicable' },
            { name: 'trainings', notApplicableKey: 'trainingsNotApplicable' },
            { name: 'familyMembers', notApplicableKey: 'familyMembersNotApplicable' },
            { name: 'experiences', notApplicableKey: 'experienceNotApplicable' },
        ];

        let filled = 0;
        const total = fields.length + arrayFields.length;

        fields.forEach(field => {
            if(questionnaire[field]) {
                filled++;
            }
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

    if (isLoading) {
        return <Skeleton className="h-40" />
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Анкетын гүйцэтгэл</CardTitle>
                    <CardDescription>Ажилтны анкетын мэдээллийн бөглөлт.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <Progress value={completionPercentage} className="h-3 flex-1" />
                        <span className="text-xl font-bold">{Math.round(completionPercentage)}%</span>
                    </div>
                     <p className="text-sm text-muted-foreground mt-2">
                        Нийт {totalCount} талбараас {filledCount}-г бөглөсөн байна.
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Ур чадвар</CardTitle>
                    <CardDescription>Ажилтны эзэмшсэн ур чадварын жагсаалт.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Энд ур чадварын жагсаалт харагдах болно.</p>
                </CardContent>
            </Card>
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
    
    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef);

    const positionDocRef = useMemoFirebase(
        ({firestore}) => (firestore && employee?.positionId ? doc(firestore, 'positions', employee.positionId) : null),
        [employee]
    );
    
    const { data: position, isLoading: isLoadingPosition } = useDoc<Position>(positionDocRef);

    const workScheduleDocRef = useMemoFirebase(
        ({firestore}) => (firestore && position?.workScheduleId ? doc(firestore, 'workSchedules', position.workScheduleId) : null),
        [position?.workScheduleId]
    );
    
    const { data: workSchedule, isLoading: isLoadingWorkSchedule } = useDoc<WorkSchedule>(workScheduleDocRef);

    
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);

    const isLoading = isLoadingEmployee || isLoadingDepts || isLoadingPosition || isLoadingWorkSchedule;

    const departmentMap = React.useMemo(() => {
        if (!departments) return new Map<string, string>();
        return departments.reduce((map, dept) => {
            map.set(dept.id, dept.name);
            return map;
        }, new Map<string, string>());
    }, [departments]);
    
    const handleReactivate = async () => {
        if (!employee || !firestore) return;

        try {
             // Step 1: Enable Firebase Auth user
            const response = await fetch('/api/update-user-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: employee.id, disabled: false }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to enable user account.');
            }
            // Step 2: Update Firestore document status
            await updateDocumentNonBlocking(employeeDocRef!, { status: 'Идэвхтэй' });
            
            toast({
                title: 'Ажилтан идэвхжлээ',
                description: `${employee.firstName}-н нэвтрэх эрхийг сэргээлээ.`,
            });
            router.refresh();

        } catch (error: any) {
            console.error("Error reactivating employee:", error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: error.message || 'Ажилтныг идэвхжүүлэхэд алдаа гарлаа.',
            });
        }
    }
    

    if (isLoading) {
        return (
            <div className="py-8">
                <ProfileSkeleton />
            </div>
        )
    }

    if (!employee) {
        return (
            <div className="py-8 text-center">
                <p>Ажилтан олдсонгүй.</p>
                <Button asChild variant="link">
                    <Link href="/dashboard/employees">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        )
    }
    
    const fullName = `${employee.firstName} ${employee.lastName}`;
    const departmentName = departmentMap.get(employee.departmentId) || 'Тодорхойгүй';
    const workScheduleName = workSchedule?.name || 'Тодорхойгүй';
    const statusInfo = statusConfig[employee.status] || { variant: 'outline', className: '', label: employee.status };
    const isActive = employee.status === 'Идэвхтэй';

    const unassignButton = employee.positionId ? (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setIsOffboardingOpen(true)}>
            <UserMinus className="h-4 w-4" />
            <span className="sr-only">Чөлөөлөх</span>
        </Button>
    ) : null;

    return (
        <div className="py-8">
            <div className="mb-4 flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Буцах</span>
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">Ажилтны хувийн хэрэг</h1>
            </div>

            <OffboardingDialog
                open={isOffboardingOpen}
                onOpenChange={setIsOffboardingOpen}
                employee={employee}
            />

            <div className="space-y-6">
                 {!isActive && (
                    <Card className="bg-yellow-50 border-yellow-200">
                        <CardHeader className="flex-row items-center gap-4">
                            <AlertTriangle className="w-6 h-6 text-yellow-600"/>
                            <div>
                                <CardTitle className="text-yellow-800">Анхаар!</CardTitle>
                                <CardDescription className="text-yellow-700">Энэ ажилтан одоогоор {statusInfo.label.toLowerCase()} төлөвтэй байна.</CardDescription>
                            </div>
                            <Button onClick={handleReactivate} size="sm" className="ml-auto bg-yellow-600 hover:bg-yellow-700 text-white">
                                <CheckCircle className="mr-2 h-4 w-4"/>
                                Идэвхжүүлэх
                            </Button>
                        </CardHeader>
                    </Card>
                 )}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col items-center gap-4 sm:flex-row">
                            <AvatarWithProgress employee={employee} size={96} />
                            <div className="flex-1 text-center sm:text-left">
                                <CardTitle className="text-2xl">{fullName}</CardTitle>
                                <CardDescription>{employee.jobTitle}</CardDescription>
                                <div className="mt-2 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                    <Badge variant="outline">{departmentName}</Badge>
                                    <Badge variant={statusInfo.variant} className={statusInfo.className}>
                                        {statusInfo.label}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button asChild variant="outline">
                                    <Link href={`/dashboard/employees/${employeeId}/questionnaire`}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Анкет
                                    </Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href={`/dashboard/employees/${employeeId}/edit`}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Мэдээлэл засах
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-4">
                            <InfoRow icon={Mail} label="Имэйл" value={<a href={`mailto:${employee.email}`} className="text-primary hover:underline">{employee.email}</a>} />
                            <InfoRow icon={Phone} label="Утасны дугаар" value={employee.phoneNumber || '-'} />
                            <InfoRow icon={Briefcase} label="Албан тушаал" value={employee.jobTitle} actionButton={unassignButton} />
                            <InfoRow icon={Clock} label="Ажлын цагийн хуваарь" value={workScheduleName} />
                             <InfoRow icon={User} label="Ажилтны код" value={employee.employeeCode || '-'} />
                            <InfoRow icon={Shield} label="Ажилтны төлөв" value={employee.status || '-'} />
                            <InfoRow icon={Calendar} label="Ажилд орсон огноо" value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'} />
                        </dl>
                    </CardContent>
                </Card>

                <Tabs defaultValue="onboarding">
                    <TabsList>
                        <TabsTrigger value="overview">Ерөнхий</TabsTrigger>
                        <TabsTrigger value="onboarding">Дасан зохицох</TabsTrigger>
                        <TabsTrigger value="history">Түүх</TabsTrigger>
                        <TabsTrigger value="time-off">Чөлөө</TabsTrigger>
                        <TabsTrigger value="performance">Гүйцэтгэл</TabsTrigger>
                        <TabsTrigger value="documents">Бичиг баримт</TabsTrigger>
                        <TabsTrigger value="cv">CV</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                       <OverviewTabContent employeeId={employeeId} />
                    </TabsContent>
                    <TabsContent value="onboarding">
                        <OnboardingTabContent employee={employee} />
                    </TabsContent>
                    <TabsContent value="history">
                        <HistoryTabContent employeeId={employeeId} />
                    </TabsContent>
                     <TabsContent value="time-off">
                        <Card>
                            <CardHeader>
                                <CardTitle>Чөлөөний түүх</CardTitle>
                                <CardDescription>Тухайн ажилтны авсан бүх чөлөөний түүх.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Энд чөлөөний хүсэлтийн жагсаалт харагдах болно.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="documents">
                        <DocumentsTabContent employeeId={employeeId} />
                    </TabsContent>
                    <TabsContent value="cv">
                        <CVDisplay employeeId={employeeId} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
