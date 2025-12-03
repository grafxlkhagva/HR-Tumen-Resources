'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, query, orderBy, where } from 'firebase/firestore';
import { type Employee } from '../data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Calendar, Edit, Mail, Phone, FileText, Download, MoreHorizontal } from 'lucide-react';
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


type Department = {
    id: string;
    name: string;
};

type EmploymentHistoryEvent = {
  id: string;
  eventType: string;
  eventDate: string;
  notes?: string;
  documentUrl?: string;
  documentName?: string;
  documentId?: string;
};

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-3 gap-4">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </dt>
            <dd className="col-span-2 text-sm">{value || '-'}</dd>
        </div>
    );
}

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
                            <Skeleton className="h-6 w-24" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
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

const DocumentsTabContent = ({ employeeId }: { employeeId: string }) => {
    const { firestore } = useFirebase();
    const historyQuery = useMemoFirebase(
      () =>
        firestore
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

export default function EmployeeProfilePage() {
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { firestore } = useFirebase();

    const employeeDocRef = useMemoFirebase(
        () => (firestore && employeeId ? doc(firestore, 'employees', employeeId) : null),
        [firestore, employeeId]
    );

    const departmentsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'departments') : null),
        [firestore]
    );

    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery);

    const isLoading = isLoadingEmployee || isLoadingDepts;

    const departmentMap = React.useMemo(() => {
        if (!departments) return new Map<string, string>();
        return departments.reduce((map, dept) => {
            map.set(dept.id, dept.name);
            return map;
        }, new Map<string, string>());
    }, [departments]);
    
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

    return (
        <div className="py-8">
            <div className="mb-4 flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/dashboard/employees">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Буцах</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">Ажилтны хувийн хэрэг</h1>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col items-center gap-4 sm:flex-row">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={employee.photoURL} alt={fullName} />
                                <AvatarFallback className="text-3xl">{employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-center sm:text-left">
                                <CardTitle className="text-2xl">{fullName}</CardTitle>
                                <CardDescription>{employee.jobTitle}</CardDescription>
                                <Badge variant="outline" className="mt-2">{departmentName}</Badge>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={`/dashboard/employees/${employeeId}/questionnaire`}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        Анкет
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild>
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
                            <InfoRow icon={Briefcase} label="Албан тушаал" value={employee.jobTitle} />
                            <InfoRow icon={Calendar} label="Ажилд орсон огноо" value={employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-'} />
                        </dl>
                    </CardContent>
                </Card>

                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">Ерөнхий</TabsTrigger>
                        <TabsTrigger value="onboarding">Дасан зохицох</TabsTrigger>
                        <TabsTrigger value="time-off">Чөлөө</TabsTrigger>
                        <TabsTrigger value="performance">Гүйцэтгэл</TabsTrigger>
                        <TabsTrigger value="documents">Бичиг баримт</TabsTrigger>
                        <TabsTrigger value="cv">CV</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Хөдөлмөрийн харилцааны түүх</CardTitle>
                                <CardDescription>Ажилтны хөдөлмөрийн гэрээтэй холбоотой бүх үйл явдлын түүх.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <EmploymentHistoryTimeline employeeId={employeeId} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Ур чадвар</CardTitle>
                                <CardDescription>Ажилтантай холбоотой дэлгэрэнгүй мэдээлэл.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Энд ажилтны ур чадвар, ажлын түүх зэрэг мэдээлэл харагдах болно.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="onboarding">
                         <Card>
                            <CardHeader>
                                <CardTitle>Дасан зохицох үйл явц</CardTitle>
                                <CardDescription>Шинэ ажилтны дадлагажих үйл явцын хяналт.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Энд шинэ ажилтны дадлагын үеийн даалгаврууд болон гүйцэтгэл харагдана.</p>
                            </CardContent>
                        </Card>
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
