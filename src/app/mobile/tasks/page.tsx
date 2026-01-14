'use client';

import * as React from 'react';
import { useFirebase, useCollection, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { RelationInstance, ChecklistItem } from '@/app/dashboard/process/types';
import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    Circle,
    FileText,
    Clock,
    ChevronRight,
    Upload,
    CheckSquare,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

export default function MobileTasksPage() {
    const { employeeProfile } = useEmployeeProfile();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedInstanceId, setSelectedInstanceId] = React.useState<string | null>(null);

    // Fetch active relation instances for the current employee
    const instancesQuery = useMemoFirebase(() =>
        (firestore && employeeProfile?.id) ? query(
            collection(firestore, 'relation_instances'),
            where('status', '==', 'active'),
            where('employeeId', '==', employeeProfile.id)
        ) : null
        , [firestore, employeeProfile?.id]);

    const { data: instances, isLoading } = useCollection<RelationInstance>(instancesQuery);

    // Filter instances for current employee (for demo, showing all)
    const myInstances = React.useMemo(() =>
        instances?.filter(i => i.status === 'active') || []
        , [instances]);

    const selectedInstance = React.useMemo(() =>
        myInstances.find(i => i.id === selectedInstanceId) || myInstances[0] || null
        , [myInstances, selectedInstanceId]);

    const currentStageNode = React.useMemo(() => {
        if (!selectedInstance) return null;
        const nodes = selectedInstance.nodes || selectedInstance.snapshot?.nodes;
        if (!nodes || !Array.isArray(nodes)) return null;
        return nodes.find((n: any) => n.id === selectedInstance.currentStageId);
    }, [selectedInstance]);

    const handleCheckItem = async (itemId: string, isChecked: boolean) => {
        if (!firestore || !selectedInstance || !currentStageNode) return;

        if (!employeeProfile) {
            toast({
                title: "Хандалт татгалзлаа",
                description: "Та нэвтэрсэн байх шаардлагатай.",
                variant: "destructive"
            });
            return;
        }

        try {
            const nodes = selectedInstance.nodes || selectedInstance.snapshot?.nodes || [];
            const updatedNodes = nodes.map((n: any) => {
                if (n.id === currentStageNode.id) {
                    const currentCompleted = n.data.completedChecklistItems || [];
                    const newCompleted = isChecked
                        ? [...currentCompleted, itemId]
                        : currentCompleted.filter((id: string) => id !== itemId);

                    return {
                        ...n,
                        data: {
                            ...n.data,
                            completedChecklistItems: newCompleted
                        }
                    };
                }
                return n;
            });

            // Calculate overall progress across all nodes
            let totalChecklistItems = 0;
            let totalCompletedItems = 0;

            updatedNodes.forEach((n: any) => {
                const checklist = n.data?.checklist || [];
                const completed = n.data?.completedChecklistItems || [];
                totalChecklistItems += checklist.length;
                totalCompletedItems += completed.length;
            });

            const newProgress = totalChecklistItems > 0
                ? Math.round((totalCompletedItems / totalChecklistItems) * 100)
                : 0;

            await updateDocumentNonBlocking(doc(firestore, 'relation_instances', selectedInstance.id), {
                nodes: updatedNodes,
                progress: newProgress,
                updatedAt: new Date().toISOString()
            });

            toast({ title: "Амжилттай", description: "Төлөв шинэчлэгдлээ." });
        } catch (e) {
            console.error(e);
            toast({ title: "Алдаа", description: "Төлөв шинэчлэхэд алдаа гарлаа.", variant: "destructive" });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50/50 pb-20">
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
                    <h1 className="text-xl font-bold text-slate-900">Миний Даалгавар</h1>
                    <p className="text-xs text-slate-500 mt-1">Танд оноогдсон ажлууд</p>
                </header>
                <div className="p-6 space-y-4">
                    <Skeleton className="h-32 w-full rounded-3xl" />
                    <Skeleton className="h-32 w-full rounded-3xl" />
                </div>
            </div>
        );
    }

    if (!selectedInstance || !currentStageNode) {
        return (
            <div className="min-h-screen bg-slate-50/50 pb-20 flex flex-col">
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
                    <h1 className="text-xl font-bold text-slate-900">Миний Даалгавар</h1>
                    <p className="text-xs text-slate-500 mt-1">Танд оноогдсон ажлууд</p>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <CheckSquare className="h-10 w-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Даалгавар байхгүй</h3>
                    <p className="text-sm text-slate-500">Танд одоогоор оноогдсон ажил байхгүй байна.</p>
                </div>
            </div>
        );
    }

    const completedCount = currentStageNode.data.completedChecklistItems?.length || 0;
    const totalCount = currentStageNode.data.checklist?.length || 0;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 flex items-center justify-between shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 leading-tight">Миний Даалгавар</h1>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                        {selectedInstance.templateName}
                    </p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <CheckSquare className="h-5 w-5" />
                </div>
            </header>

            <main className="space-y-6 pt-6">
                {/* Process Selection - Horizontal Scroll */}
                {myInstances.length > 1 && (
                    <div className="space-y-3">
                        <div className="px-6 flex items-center justify-between">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Идэвхтэй процессууд</h2>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{myInstances.length}</span>
                        </div>
                        <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
                            {myInstances.map(instance => (
                                <button
                                    key={instance.id}
                                    onClick={() => setSelectedInstanceId(instance.id)}
                                    className={cn(
                                        "min-w-[140px] p-4 rounded-3xl border transition-all relative overflow-hidden group active:scale-95",
                                        selectedInstance.id === instance.id
                                            ? "border-indigo-500 bg-white shadow-lg shadow-indigo-100 ring-4 ring-indigo-50"
                                            : "border-slate-100 bg-white shadow-sm opacity-60"
                                    )}
                                >
                                    <h3 className={cn(
                                        "font-bold text-xs mb-3 line-clamp-1",
                                        selectedInstance.id === instance.id ? "text-indigo-600" : "text-slate-600"
                                    )}>
                                        {instance.templateName}
                                    </h3>
                                    <div className="flex items-end justify-between gap-2">
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 transition-all duration-500"
                                                    style={{ width: `${instance.progress || 0}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400">{instance.progress || 0}%</span>
                                        </div>
                                    </div>
                                    {selectedInstance.id === instance.id && (
                                        <div className="absolute top-0 right-0 p-1">
                                            <CheckCircle2 className="h-3 w-3 text-indigo-500" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="px-6 space-y-6">
                    {/* Current Stage Info - Modern Hero Card */}
                    <Card className="border-0 shadow-xl shadow-indigo-100/50 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-[2.5rem] overflow-hidden relative group">
                        {/* Decorative circles */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />

                        <CardContent className="p-7 relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 opacity-80 mb-2">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Одоогийн шат</span>
                                    </div>
                                    <h2 className="text-2xl font-bold leading-tight">{currentStageNode.data.label}</h2>
                                    {currentStageNode.data.description && (
                                        <p className="text-indigo-100/80 text-xs font-medium mt-1 line-clamp-2">{currentStageNode.data.description}</p>
                                    )}
                                </div>
                                <div className="h-14 w-14 rounded-3xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                                    <Clock className="w-7 h-7 text-white" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-1.5">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-5 h-5 rounded-full border-2 border-indigo-600 bg-indigo-400 flex items-center justify-center">
                                                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[11px] font-bold text-indigo-100">
                                            {completedCount} / {totalCount} гүйцэтгэсэн
                                        </span>
                                    </div>
                                    <span className="text-3xl font-black italic tracking-tighter">{progressPercent}%</span>
                                </div>
                                <div className="h-3 w-full bg-white/10 rounded-2xl overflow-hidden p-0.5 border border-white/5">
                                    <div
                                        className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Checklist Section - Better List Design */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                                </div>
                                Хийх ажлууд
                            </h2>
                        </div>

                        <div className="grid gap-3">
                            {currentStageNode.data.checklist?.map((item: ChecklistItem) => {
                                const isCompleted = currentStageNode.data.completedChecklistItems?.includes(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleCheckItem(item.id, !isCompleted)}
                                        className={cn(
                                            "flex items-center gap-4 p-5 rounded-[2rem] border transition-all duration-300 active:scale-[0.97] cursor-pointer",
                                            isCompleted
                                                ? "bg-white border-green-100 shadow-sm opacity-70"
                                                : "bg-white border-slate-100 shadow-md shadow-indigo-50/50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500",
                                            isCompleted ? "bg-green-50 text-green-600 rotate-[360deg]" : "bg-slate-50 text-slate-300"
                                        )}>
                                            {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                                        </div>
                                        <div className="flex-1">
                                            <span className={cn(
                                                "text-[13px] font-bold leading-tight block decoration-2 transition-all",
                                                isCompleted ? "text-slate-400 line-through" : "text-slate-700"
                                            )}>
                                                {item.text}
                                            </span>
                                            {item.isRequired && !isCompleted && (
                                                <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter mt-1 block">Заавал</span>
                                            )}
                                        </div>
                                        <ChevronRight className={cn("h-4 w-4 transition-colors", isCompleted ? "text-green-200" : "text-slate-200")} />
                                    </div>
                                );
                            })}
                        </div>

                        {(!currentStageNode.data.checklist || currentStageNode.data.checklist.length === 0) && (
                            <div className="bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 p-10 text-center">
                                <p className="text-xs font-bold text-slate-400 italic">Энэ шатанд хийх ажил байхгүй байна.</p>
                            </div>
                        )}
                    </div>

                    {/* Documents Section - Modern Cards */}
                    {currentStageNode.data.documents && currentStageNode.data.documents.length > 0 && (
                        <div className="space-y-4 pb-10">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 px-1">
                                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                                </div>
                                Шаардлагатай баримт
                            </h2>

                            <div className="grid gap-3">
                                {currentStageNode.data.documents.map((doc: any) => (
                                    <div key={doc.id} className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-[2rem] shadow-md shadow-blue-50/50 active:scale-[0.98] transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                <FileText className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-800">{doc.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {doc.isRequired ? (
                                                        <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">ЗААВАЛ</span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">СОНГОН</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all">
                                            <Upload className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
