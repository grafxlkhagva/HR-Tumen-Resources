'use client';

import React from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Briefcase, Users, MoreHorizontal, Link as LinkIcon, Edit, UserPlus, Clock } from 'lucide-react';
import { CreateVacancyDialog } from './create-vacancy-dialog';
import { Vacancy } from '@/types/recruitment';
import { Department } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function VacanciesList() {
    const { firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    const vacanciesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'vacancies'), orderBy('createdAt', 'desc')) : null),
        [firestore]
    );

    const departmentsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'departments') : null),
        [firestore]
    );

    const { data: vacancies, isLoading: isLoadingVacancies } = useCollection<Vacancy>(vacanciesQuery as any);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Department>(departmentsQuery as any);

    const getDeptName = (id: string) => {
        return departments?.find(d => d.id === id)?.name || 'Unknown';
    };

    if (isLoadingVacancies || isLoadingDepts) {
        return <div className="space-y-4">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-64 w-full rounded-md" />
        </div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Нээлттэй ажлын байрууд</h2>
                    <p className="text-sm text-muted-foreground">Идэвхтэй сонгон шалгаруулалтууд болон түүний явц.</p>
                </div>
                <CreateVacancyDialog departments={departments || []} />
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30%]">Албан тушаал</TableHead>
                            <TableHead>Хэлтэс</TableHead>
                            <TableHead>Төлөв</TableHead>
                            <TableHead>Үе шат</TableHead>
                            <TableHead>Нийтэлсэн</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!vacancies || vacancies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    Одоогоор идэвхтэй зар байхгүй байна. "Шинэ зар" товч дарж үүсгэнэ үү.
                                </TableCell>
                            </TableRow>
                        ) : (
                            vacancies.map((vacancy) => (
                                <TableRow
                                    key={vacancy.id}
                                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => router.push(`/dashboard/recruitment/vacancies/${vacancy.id}`)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                                <Briefcase className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <span className="block text-base">{vacancy.title}</span>
                                                <span className="text-xs text-muted-foreground">ID: {vacancy.id.slice(0, 8)}...</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getDeptName(vacancy.departmentId)}</TableCell>
                                    <TableCell>
                                        <Badge variant={vacancy.status === 'OPEN' ? 'default' : 'secondary'} className={vacancy.status === 'OPEN' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                            {vacancy.status === 'OPEN' ? 'Нээлттэй' :
                                                vacancy.status === 'CLOSED' ? 'Хаагдсан' :
                                                    vacancy.status === 'DRAFT' ? 'Ноорог' : vacancy.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>{vacancy.stages?.length || 5} үе шаттай</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(vacancy.createdAt), 'yyyy-MM-dd')}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
