'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useUser } from '@/firebase';
import { RelationInstance, StageNodeData, ChecklistItem } from '../types';
import { cn } from '@/lib/utils';
import {
    CheckCircle2,
    Circle,
    FileText,
    Clock,
    AlertCircle,
    ChevronRight,
    Upload,
    User,
    CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface EmployeeTasksViewProps {
    instances: RelationInstance[];
    onSelectInstance?: (instanceId: string) => void;
}

export function EmployeeTasksView({ instances, onSelectInstance }: EmployeeTasksViewProps) {
    const { user } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

    // Filter instances for the current user (assuming user.uid maps to employeeId for now, 
    // or if acting as admin, maybe see all? For this view, let's assume personal view)
    // For demo purposes, if no matching instances, we might show all or a debug selector.
    // Let's filter by employeeId matching user.uid OR if the user is mentioned in stakeholders (future)
    // For now, simple filter:

    // DEBUG: Since we don't have real auth-employee mapping, we'll show ALL instances 
    // but visually distinguish "Mine" if matches. 
    // Actually, to make it useful for the demo, let's just show ALL active instances here 
    // treating this as "My Tasks (Simulation)" where I can see anyone's tasks.
    const myInstances = instances.filter(i => i.status === 'active');

    const selectedInstance = useMemo(() =>
        myInstances.find(i => i.id === selectedInstanceId) || null
        , [myInstances, selectedInstanceId]);

    const currentStageNode = useMemo(() => {
        if (!selectedInstance) return null;
        const nodes = selectedInstance.nodes || selectedInstance.snapshot?.nodes;
        if (!nodes || !Array.isArray(nodes)) return null;
        return nodes.find((n: any) => n.id === selectedInstance.currentStageId);
    }, [selectedInstance]);

    const handleCheckItem = async (itemId: string, isChecked: boolean) => {
        if (!firestore || !selectedInstance || !currentStageNode) return;

        if (!user) {
            toast({
                title: "Хандалт татгалзлаа",
                description: "Та нэвтэрсэн байх шаардлагатай.",
                variant: "destructive"
            });
            return;
        }

        try {
            // We need to update the node data within the instance's nodes array.
            // This is a bit complex with Firestore array updates if we don't replace the whole array.
            // Strategy: Update the specific node in the nodes array.

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

            // Calculate overall progress?
            // Simple logic: (Completed Nodes / Total Nodes) * 100 ? 
            // Or (Completed Checklist Items / Total Items)? 
            // Let's stick to update nodes for now.

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

            // Optimistic update handled by realtime listener in parent
        } catch (e) {
            console.error(e);
            toast({ title: "Алдаа", description: "Төлөв шинэчлэхэд алдаа гарлаа.", variant: "destructive" });
        }
    };

    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950">
            {/* Task List Sidebar */}
            <div className="w-[350px] border-r bg-white dark:bg-slate-900 flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                        Миний Даалгавар
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Танд оноогдсон идэвхтэй ажлууд</p>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-3">
                        {myInstances.map(instance => {
                            const nodes = instance.nodes || instance.snapshot?.nodes;
                            const currentNode = (nodes && Array.isArray(nodes))
                                ? nodes.find((n: any) => n.id === instance.currentStageId)
                                : null;
                            const progress = instance.progress || 0;

                            return (
                                <div
                                    key={instance.id}
                                    onClick={() => setSelectedInstanceId(instance.id)}
                                    className={cn(
                                        "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md space-y-3",
                                        selectedInstanceId === instance.id
                                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm"
                                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-300"
                                    )}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                                                {instance.templateName}
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                <User className="h-3 w-3" /> {instance.employeeName}
                                            </p>
                                        </div>
                                        <Badge variant={progress === 100 ? "default" : "secondary"} className="text-[10px]">
                                            {progress}%
                                        </Badge>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Одоо: {currentNode?.data.label || 'Unknown'}</span>
                                            <span>{currentNode?.data.checklist?.length || 0} ажил</span>
                                        </div>
                                        <Progress value={progress} className="h-1.5" />
                                    </div>
                                </div>
                            );
                        })}

                        {myInstances.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                                <p>Танд оноогдсон ажил байхгүй байна.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Task Details Area */}
            <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
                {selectedInstance && currentStageNode ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Header */}
                        <div className="bg-white dark:bg-slate-900 border-b px-6 py-4 flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                                    {currentStageNode.data.label}
                                    <Badge variant="outline" className="text-sm font-normal">
                                        {currentStageNode.type === 'start' ? 'Эхлэл' : 'Үе шат'}
                                    </Badge>
                                </h1>
                                <p className="text-slate-500 mt-1 max-w-2xl">
                                    {currentStageNode.data.description || "Тайлбар байхгүй."}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectInstance && onSelectInstance(selectedInstance.id)}
                            >
                                Бүтэц харах <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-6 max-w-4xl mx-auto time-line-container space-y-8">

                                {/* Checklist Section */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-indigo-500" /> Хийх ажлын жагсаалт
                                        </CardTitle>
                                        <CardDescription>
                                            Энэ шатны ажлуудыг гүйцэтгэж дуусгана уу.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {currentStageNode.data.checklist?.map((item: ChecklistItem) => {
                                            const isCompleted = currentStageNode.data.completedChecklistItems?.includes(item.id);
                                            return (
                                                <div key={item.id} className={cn(
                                                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                                                    isCompleted ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                                                )}>
                                                    <Checkbox
                                                        id={item.id}
                                                        checked={isCompleted}
                                                        onCheckedChange={(checked) => handleCheckItem(item.id, checked as boolean)}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="flex-1 space-y-1">
                                                        <label
                                                            htmlFor={item.id}
                                                            className={cn(
                                                                "text-sm font-medium leading-none cursor-pointer",
                                                                isCompleted && "text-muted-foreground line-through"
                                                            )}
                                                        >
                                                            {item.text}
                                                        </label>
                                                        {item.isRequired && (
                                                            <div className="flex gap-2">
                                                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-red-200 text-red-600 bg-red-50">
                                                                    Заавал
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!currentStageNode.data.checklist || currentStageNode.data.checklist.length === 0) && (
                                            <p className="text-sm text-muted-foreground italic">Энэ шатанд хийх ажил байхгүй байна.</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Documents Section */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-blue-500" /> Шаардлагатай Баримт бичиг
                                        </CardTitle>
                                        <CardDescription>
                                            Дараах баримтуудыг бүрдүүлж хавсаргана уу.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {currentStageNode.data.documents?.map((doc: any) => (
                                            <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                        <FileText className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{doc.name}</p>
                                                        {doc.isRequired && <span className="text-xs text-red-500">Заавал</span>}
                                                    </div>
                                                </div>
                                                <Button variant="secondary" size="sm">
                                                    <Upload className="h-4 w-4 mr-2" /> Хуулах
                                                </Button>
                                            </div>
                                        ))}
                                        {(!currentStageNode.data.documents || currentStageNode.data.documents.length === 0) && (
                                            <p className="text-sm text-muted-foreground italic">Баримт бичиг шаардлагагүй.</p>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="h-10" />
                            </div>
                        </ScrollArea>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                        <CheckSquare className="h-16 w-16 mb-4 text-slate-200" />
                        <p className="text-lg font-medium">Даалгавар сонгоно уу</p>
                        <p className="text-sm">Зүүн талын жагсаалтаас даалгавар сонгож дэлгэрэнгүйг харна уу.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
