'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Pencil, Trash2, MoreHorizontal, Activity, Layers, ListTodo, Users, Briefcase } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
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

export type OnboardingProgram = {
    id: string;
    title: string;
    description?: string;
    type: 'ONBOARDING' | 'OFFBOARDING';
    taskCount: number;
    stageCount: number;
    appliesTo?: {
        departmentIds?: string[];
        positionIds?: string[];
    }
}

export type OnboardingStage = {
    id: string;
    title: string;
    order: number;
}
export type OnboardingTaskTemplate = {
    id: string;
    title: string;
    description?: string;
    assigneeType: 'NEW_HIRE' | 'MANAGER' | 'HR' | 'BUDDY' | 'SPECIFIC_PERSON';
    dueDays: number;
    attachmentUrl?: string;
    attachmentName?: string;
}


type Reference = {
    id: string;
    name: string;
    title?: string;
    isActive?: boolean;
}


function ProgramCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
                <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-32" />
                </div>
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-8 w-24 ml-auto" />
            </CardFooter>
        </Card>
    )
}

function ProgramCard({ program, lookups, onEdit, onDelete }: { program: OnboardingProgram, lookups: any, onEdit: () => void, onDelete: () => void }) {
    
    const getAppliesToText = () => {
        if (!program.appliesTo || (!program.appliesTo.departmentIds?.length && !program.appliesTo.positionIds?.length)) {
            return { icon: Users, text: 'Бүх ажилтан' };
        }
        if (program.appliesTo.departmentIds?.length) {
            const deptName = lookups.departmentMap[program.appliesTo.departmentIds[0]] || 'Тодорхойгүй';
            const count = program.appliesTo.departmentIds.length;
            return { icon: Users, text: count > 1 ? `${deptName} ба бусад ${count - 1}` : deptName };
        }
         if (program.appliesTo.positionIds?.length) {
            const posName = lookups.positionMap[program.appliesTo.positionIds[0]] || 'Тодорхойгүй';
            const count = program.appliesTo.positionIds.length;
            return { icon: Briefcase, text: count > 1 ? `${posName} ба бусад ${count - 1}` : posName };
        }
        return { icon: Users, text: 'Тодорхойгүй' };
    }

    const { icon: AppliesToIcon, text: appliesToText } = getAppliesToText();

    return (
        <Card className="flex flex-col transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
             <Link href={`/dashboard/settings/onboarding/${program.id}`} className="flex-1 flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{program.title}</CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">{program.description || 'Тодорхойлолт байхгүй.'}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 grid grid-cols-2 gap-4">
                    <Card className="bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Үе шат</CardTitle>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{program.stageCount || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Даалгавар</CardTitle>
                            <ListTodo className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{program.taskCount || 0}</div>
                        </CardContent>
                    </Card>
                </CardContent>
            </Link>
            <CardFooter className="flex justify-between items-center">
                 <Badge variant="secondary" className="font-normal flex items-center gap-2">
                    <AppliesToIcon className="h-4 w-4" />
                    {appliesToText}
                </Badge>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Засах</DropdownMenuItem>
                            <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{program.title}" хөтөлбөрийг бүх үе шат, даалгаврын хамт устгах болно.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete}>Тийм, устгах</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
        </Card>
    );
}


export default function OnboardingSettingsPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingProgram, setEditingProgram] = React.useState<OnboardingProgram | null>(null);

    const { firestore } = useFirebase();

    const programsQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'onboardingPrograms') : null, []);
    const departmentsQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'departments') : null, []);
    const positionsQuery = useMemoFirebase(({firestore}) => firestore ? collection(firestore, 'positions') : null, []);


    const { data: programs, isLoading: isLoadingPrograms } = useCollection<OnboardingProgram>(programsQuery);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Reference>(departmentsQuery);
    const { data: positions, isLoading: isLoadingPos } = useCollection<Reference>(positionsQuery);


    const isLoading = isLoadingPrograms || isLoadingDepts || isLoadingPos;

    const lookups = React.useMemo(() => {
        const departmentMap = departments?.reduce((acc, dept) => { acc[dept.id] = dept.name; return acc; }, {} as Record<string, string>) || {};
        const positionMap = positions?.reduce((acc, pos) => { acc[pos.id] = pos.title || pos.name; return acc; }, {} as Record<string, string>) || {};
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

    const handleDelete = (program: OnboardingProgram) => {
        // TODO: add logic to delete subcollections
        if (!firestore) return;
        const docRef = doc(firestore, 'onboardingPrograms', program.id);
        deleteDocumentNonBlocking(docRef);
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
                        <Link href="/dashboard/settings/general">
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
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {isLoading && Array.from({length: 3}).map((_, i) => (
                    <ProgramCardSkeleton key={i} />
                ))}
                {!isLoading && programs?.map((program) => (
                    <ProgramCard 
                        key={program.id}
                        program={program}
                        lookups={lookups}
                        onEdit={() => handleEdit(program)}
                        onDelete={() => handleDelete(program)}
                    />
                ))}
                 {!isLoading && (!programs || programs.length === 0) && (
                    <div className="col-span-full py-24 text-center">
                        <Card className="max-w-md mx-auto">
                            <CardHeader>
                                <CardTitle className="flex justify-center">
                                    <Activity className="h-12 w-12 text-muted-foreground" />
                                </CardTitle>
                                <CardDescription>Хөтөлбөрийн загвар үүсээгүй байна.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={handleAddNew}>Анхны хөтөлбөрөө үүсгэх</Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
             </div>
        </div>
    );
}
