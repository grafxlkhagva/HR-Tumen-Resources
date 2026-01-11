'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Rocket, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type AssignedProgram = {
    id: string;
    programId: string;
    programName: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    progress: number;
    startDate: string;
}

export default function MobileOnboardingListPage() {
    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const router = useRouter();

    const programsQuery = useMemoFirebase(() => employeeProfile ? query(
        collection(firestore, `employees/${employeeProfile.id}/assignedPrograms`),
        orderBy('startDate', 'desc')
    ) : null, [firestore, employeeProfile?.id]);

    const { data: programs, isLoading } = useCollection<AssignedProgram>(programsQuery);

    if (isLoading) {
        return (
            <div className="bg-slate-50 min-h-screen p-6 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-32 w-full rounded-3xl" />
                <Skeleton className="h-32 w-full rounded-3xl" />
            </div>
        )
    }

    return (
        <div className="min-h-dvh bg-slate-50 pb-8">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 py-4 flex items-center gap-3 shadow-sm">
                <Button variant="ghost" size="icon" className="-ml-2 h-9 w-9 rounded-full bg-slate-100 text-slate-600" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-semibold text-lg text-slate-800">Чиглүүлэх хөтөлбөрүүд</h1>
            </header>

            <div className="p-6 space-y-6">
                {programs && programs.length > 0 ? (
                    <div className="grid gap-4">
                        {programs.map(program => (
                            <Link href={`/mobile/onboarding/${program.id}`} key={program.id}>
                                <Card className="border-0 shadow-sm hover:shadow-md transition-all active:scale-[0.98] rounded-3xl overflow-hidden bg-white">
                                    <div className={cn("h-1.5 w-full",
                                        program.status === 'COMPLETED' ? "bg-green-500" :
                                            program.status === 'IN_PROGRESS' ? "bg-blue-500" : "bg-slate-300"
                                    )} />
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2.5 rounded-2xl",
                                                    program.status === 'COMPLETED' ? "bg-green-50 text-green-600" :
                                                        program.status === 'IN_PROGRESS' ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"
                                                )}>
                                                    {program.status === 'COMPLETED' ? <CheckCircle2 className="w-6 h-6" /> : <Rocket className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-base text-slate-800 line-clamp-1">{program.programName}</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                                        {format(new Date(program.startDate), 'yyyy.MM.dd')}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={cn("border-0 font-semibold",
                                                program.status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                                                    program.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                                            )}>
                                                {program.status === 'COMPLETED' ? 'Дууссан' :
                                                    program.status === 'IN_PROGRESS' ? 'Идэвхтэй' : 'Цуцлагдсан'}
                                            </Badge>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs font-semibold text-slate-600">
                                                <span>Гүйцэтгэл</span>
                                                <span className={cn(
                                                    program.status === 'COMPLETED' ? "text-green-600" : "text-blue-600"
                                                )}>{Math.round(program.progress)}%</span>
                                            </div>
                                            <Progress value={program.progress} className="h-2.5 rounded-full bg-slate-100" />
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <span className="text-xs font-semibold text-primary flex items-center">
                                                Дэлгэрэнгүй харах <ChevronRight className="w-3 h-3 ml-1" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="bg-slate-100 p-6 rounded-full shadow-inner">
                            <Rocket className="w-12 h-12 text-slate-300" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-lg text-slate-800">Хөтөлбөр олдсонгүй</h2>
                            <p className="text-slate-500 text-sm mt-1 max-w-[250px] mx-auto">Одоогоор танд оноогдсон чиглүүлэх хөтөлбөр байхгүй байна.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
