'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFirebase, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { type Employee } from '../data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Calendar, Edit, Mail, Phone, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Department = {
    id: string;
    name: string;
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
    
    const avatar = PlaceHolderImages.find((p) => p.id === employee.avatarId) || PlaceHolderImages.find(p => p.id === 'avatar-2');
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
                                <AvatarImage src={avatar?.imageUrl} alt={fullName} data-ai-hint={avatar?.imageHint} />
                                <AvatarFallback className="text-3xl">{employee.firstName.charAt(0)}{employee.lastName.charAt(0)}</AvatarFallback>
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
                        <TabsTrigger value="time-off">Чөлөө</TabsTrigger>
                        <TabsTrigger value="performance">Гүйцэтгэл</TabsTrigger>
                        <TabsTrigger value="documents">Бичиг баримт</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <Card>
                            <CardHeader>
                                <CardTitle>Ерөнхий мэдээлэл</CardTitle>
                                <CardDescription>Ажилтантай холбоотой дэлгэрэнгүй мэдээлэл.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">Энд ажилтны ур чадвар, ажлын түүх зэрэг мэдээлэл харагдах болно.</p>
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
                </Tabs>
            </div>
        </div>
    )
}
