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
import { PageHeader } from '@/components/page-header';
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
        <Card className="group relative flex flex-col transition-all duration-300 hover:shadow-xl border-border/60 bg-card hover:bg-accent/5 overflow-hidden">
            {/* Decorative top accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

            <Link href={`/dashboard/settings/onboarding/${program.id}`} className="flex-1 flex flex-col p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1.5">
                        <h3 className="font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {program.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {program.description || 'Тодорхойлолт байхгүй.'}
                        </p>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground">{program.stageCount || 0}</span>
                            <span className="text-xs">Үе шат</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <ListTodo className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground">{program.taskCount || 0}</span>
                            <span className="text-xs">Даалгавар</span>
                        </div>
                    </div>
                </div>
            </Link>

            <div className="px-6 py-3 bg-muted/30 border-t border-border/50 flex justify-between items-center text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                    <AppliesToIcon className="h-3.5 w-3.5" />
                    <span>{appliesToText}</span>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                            <Pencil className="mr-2 h-4 w-4" /> Засах
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive cursor-pointer">
                                    <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Хөтөлбөр устгах</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Та "{program.title}" хөтөлбөрийг устгахдаа итгэлтэй байна уу?
                                        <br />
                                        Энэ үйлдэл нь хөтөлбөрийн бүх үе шат, даалгавруудыг устгана.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Тийм, устгах</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </Card>
    );
}


export default function OnboardingSettingsPage() {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingProgram, setEditingProgram] = React.useState<OnboardingProgram | null>(null);

    const { firestore } = useFirebase();

    const programsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'onboardingPrograms') : null, []);
    const departmentsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'departments') : null, []);
    const positionsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'positions') : null, []);


    const { data: programs, isLoading: isLoadingPrograms } = useCollection<OnboardingProgram>(programsQuery as any);
    const { data: departments, isLoading: isLoadingDepts } = useCollection<Reference>(departmentsQuery as any);
    const { data: positions, isLoading: isLoadingPos } = useCollection<Reference>(positionsQuery as any);


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
        <div className="space-y-6">
            <AddProgramDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingProgram={editingProgram}
                departments={departments || []}
                positions={positions || []}
            />

            <PageHeader
                title="Дасан зохицох хөтөлбөр"
                description="Шинэ ажилтны дадлагын үеийн үе шат, даалгавруудыг эндээс тохируулна"
                breadcrumbs={[]}
                actions={
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Шинэ хөтөлбөр нэмэх
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading && Array.from({ length: 3 }).map((_, i) => (
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
