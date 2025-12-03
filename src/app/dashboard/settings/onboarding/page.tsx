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
import { ArrowLeft, PlusCircle, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AddProgramDialog } from './add-program-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type OnboardingProgram = {
    id: string;
    title: string;
    description: string;
    type: 'ONBOARDING' | 'OFFBOARDING';
    taskCount?: number;
    stageCount?: number;
    appliesTo?: {
        departmentId?: string;
        positionId?: string;
    }
}

type Reference = {
    id: string;
    name: string;
}

export default function OnboardingSettingsPage() {
    const { firestore } = useFirebase();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingProgram, setEditingProgram] = React.useState<OnboardingProgram | null>(null);

    const programsQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'onboardingPrograms') : null),
        [firestore]
    );
     const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);

    const { data: programs, isLoading: isLoadingPrograms } = useCollection<OnboardingProgram>(programsQuery);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Reference>(departmentsQuery);
    const { data: positions, isLoading: isLoadingPos } = useCollection<Reference>(positionsQuery);

    const isLoading = isLoadingPrograms || isLoadingDepts || isLoadingPos;

    const lookups = React.useMemo(() => {
        const departmentMap = departments?.reduce((acc, dept) => { acc[dept.id] = dept.name; return acc; }, {} as Record<string, string>) || {};
        const positionMap = positions?.reduce((acc, pos) => { acc[pos.id] = (pos as any).title; return acc; }, {} as Record<string, string>) || {};
        return { departmentMap, positionMap };
    }, [departments, positions]);

    const handleAddNew = () => {
        setEditingProgram(null);
        setIsDialogOpen(true);
    }
    
    const handleEdit = (program: OnboardingProgram) => {
        setEditingProgram(program);
        setIsDialogOpen(true);
    }

    const handleDelete = (programId: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, 'onboardingPrograms', programId);
        // Add logic to delete subcollections (stages, tasks) if necessary
        deleteDocumentNonBlocking(docRef);
    }

    const getAppliesToText = (program: OnboardingProgram) => {
        if (program.appliesTo?.departmentId) {
            return `Хэлтэс: ${lookups.departmentMap[program.appliesTo.departmentId] || 'Тодорхойгүй'}`;
        }
        if (program.appliesTo?.positionId) {
            return `Албан тушаал: ${lookups.positionMap[program.appliesTo.positionId] || 'Тодорхойгүй'}`;
        }
        return 'Бүх ажилтан';
    }


    return (
        <div className="py-8">
            <AddProgramDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingProgram={editingProgram}
                departments={departments || []}
                positions={positions || []}
            />
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
                <Button onClick={handleAddNew}>
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
                                <TableHead className="text-right">Үйлдэл</TableHead>
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
                                    <TableCell><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
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
                                        <Badge variant="outline">{getAppliesToText(program)}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(program)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Засах
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(program.id)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && (!programs || programs.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
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
