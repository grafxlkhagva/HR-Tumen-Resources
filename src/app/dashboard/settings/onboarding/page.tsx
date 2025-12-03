'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, CheckCircle, Clock, Users, Calendar, Hash } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

type OnboardingProgram = {
    id: string;
    title: string;
    description: string;
    type: 'ONBOARDING' | 'OFFBOARDING';
    taskCount: number;
    stageCount: number;
    appliesTo: {
        departmentId?: string;
        positionId?: string;
    }
}

export default function OnboardingSettingsPage() {
    const { firestore } = useFirebase();

    const programsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'onboardingPrograms') : null),
        [firestore]
    );

    const { data: programs, isLoading } = useCollection<OnboardingProgram>(programsQuery);

    return (
        <div className="py-8">
        <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/dashboard/settings">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Буцах</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Дасан зохицох хөтөлбөрийн тохиргоо</h1>
                    <p className="text-muted-foreground">
                        Шинэ ажилтны дадлагын үеийн үе шат, даалгавруудыг эндээс тохируулна.
                    </p>
                </div>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Шинэ хөтөлбөр нэмэх
            </Button>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>Хөтөлбөрийн загварууд</CardTitle>
            <CardDescription>
                Байгууллагын хэмжээнд ашиглагдах дасан зохицох болон ажлаас чөлөөлөх хөтөлбөрийн жагсаалт.
            </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Хөтөлбөрийн нэр</TableHead>
                            <TableHead>Төрөл</TableHead>
                            <TableHead>Үе шат</TableHead>
                            <TableHead>Даалгавар</TableHead>
                            <TableHead>Хэрэглэгдэх хүрээ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 2}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-48"/></TableCell>
                                <TableCell><Skeleton className="h-6 w-24"/></TableCell>
                                <TableCell><Skeleton className="h-5 w-12"/></TableCell>
                                <TableCell><Skeleton className="h-5 w-12"/></TableCell>
                                <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && programs?.map((program) => (
                            <TableRow key={program.id}>
                                <TableCell className="font-medium">{program.title}</TableCell>
                                <TableCell>
                                    <Badge variant={program.type === 'ONBOARDING' ? 'default' : 'secondary'}>
                                        {program.type === 'ONBOARDING' ? 'Дасан зохицох' : 'Ажлаас чөлөөлөх'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{program.stageCount || 0}</TableCell>
                                <TableCell>{program.taskCount || 0}</TableCell>
                                <TableCell>
                                    {/* This would need a lookup to get dept/position names */}
                                    {program.appliesTo?.departmentId || program.appliesTo?.positionId ? 'Тодорхой албан тушаал' : 'Бүх ажилтан'}
                                </TableCell>
                            </TableRow>
                        ))}
                         {!isLoading && (!programs || programs.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Хөтөлбөрийн загвар үүсээгүй байна.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        </div>
    );
}
