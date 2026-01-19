'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Circle,
    Save,
    Loader2,
    Info,
    LayoutGrid,
    CheckSquare,
    Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Position } from '../../../types';
import { cn } from '@/lib/utils';

interface OnboardingTask {
    id: string;
    title: string;
    description?: string;
}

interface OnboardingStage {
    id: string;
    title: string;
    description?: string;
    tasks: OnboardingTask[];
}

interface PositionOnboardingProps {
    position: Position;
}

export function PositionOnboarding({ position }: PositionOnboardingProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // Fetch global onboarding settings
    const configRef = React.useMemo(() => (firestore ? doc(firestore, 'settings', 'onboarding') : null), [firestore]);
    const { data: config, isLoading: isLoadingConfig } = useDoc<any>(configRef as any);

    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    useEffect(() => {
        if (position.onboardingProgramIds) {
            setSelectedTaskIds(position.onboardingProgramIds);
        }
    }, [position.onboardingProgramIds]);

    const stages: OnboardingStage[] = config?.stages || [];

    const toggleTask = (taskId: string) => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const toggleStage = (stage: OnboardingStage) => {
        const stageTaskIds = stage.tasks.map(t => t.id);
        const allSelected = stageTaskIds.every(id => selectedTaskIds.includes(id));

        if (allSelected) {
            // Deselect all in stage
            setSelectedTaskIds(prev => prev.filter(id => !stageTaskIds.includes(id)));
        } else {
            // Select all in stage
            setSelectedTaskIds(prev => {
                const newIds = [...prev];
                stageTaskIds.forEach(id => {
                    if (!newIds.includes(id)) newIds.push(id);
                });
                return newIds;
            });
        }
    };

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', position.id), {
                onboardingProgramIds: selectedTaskIds,
                updatedAt: new Date().toISOString()
            });
            toast({ title: "Чиглүүлэх хөтөлбөрийн тохиргоо хадгалагдлаа" });
        } catch (error) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingConfig) {
        return <div className="py-12 text-center animate-pulse text-slate-400">Тохиргоо ачаалж байна...</div>;
    }

    const totalTasks = stages.reduce((acc, stage) => acc + stage.tasks.length, 0);
    const selectedCount = selectedTaskIds.length;
    const progress = totalTasks > 0 ? Math.round((selectedCount / totalTasks) * 100) : 0;

    return (
        <section className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Чиглүүлэх хөтөлбөр</label>
                        <h2 className="text-lg font-bold text-foreground">Таск сонгох</h2>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Сонгосон</p>
                        <p className="text-sm font-black text-indigo-600">{selectedCount} / {totalTasks}</p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Хадгалах
                    </Button>
                </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-4">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Програмд хамрагдах хувь</span>
                    <span className="text-xs font-bold text-indigo-600">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-200" />
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    <Info className="h-3 w-3 inline mr-1 text-indigo-400" />
                    Энэхүү албан тушаалд шинээр томилогдсон ажилтан энд сонгосон таскуудыг заавал биелүүлэх шаардлагатай болно.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stages.map((stage) => {
                    const stageTaskIds = stage.tasks.map(t => t.id);
                    const selectedInStage = stageTaskIds.filter(id => selectedTaskIds.includes(id)).length;
                    const isAllSelected = selectedInStage === stage.tasks.length && stage.tasks.length > 0;

                    return (
                        <Card key={stage.id} className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 hover:ring-indigo-100 transition-all">
                            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-bold text-slate-800">{stage.title}</h3>
                                    <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0 bg-white">
                                        {selectedInStage}/{stage.tasks.length}
                                    </Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleStage(stage)}
                                    className="h-7 px-2 text-[9px] font-bold uppercase tracking-tight text-indigo-600 hover:bg-indigo-50"
                                >
                                    {isAllSelected ? 'Бүгдийг болих' : 'Бүгдийг сонгох'}
                                </Button>
                            </div>
                            <CardContent className="p-4 space-y-2">
                                {stage.tasks.map((task) => {
                                    const isSelected = selectedTaskIds.includes(task.id);
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => toggleTask(task.id)}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                                                isSelected
                                                    ? "bg-indigo-50/50 border-indigo-100"
                                                    : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-100"
                                            )}
                                        >
                                            {isSelected ? (
                                                <CheckSquare className="h-5 w-5 text-indigo-600 shrink-0" />
                                            ) : (
                                                <Square className="h-5 w-5 text-slate-200 shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className={cn(
                                                    "text-xs font-bold leading-tight",
                                                    isSelected ? "text-indigo-900" : "text-slate-600"
                                                )}>
                                                    {task.title}
                                                </p>
                                                {task.description && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{task.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {stage.tasks.length === 0 && (
                                    <p className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase">Энэ шатанд таск байхгүй</p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
