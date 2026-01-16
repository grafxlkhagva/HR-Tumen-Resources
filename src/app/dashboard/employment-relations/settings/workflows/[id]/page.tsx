'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase, useDoc, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, Timestamp, collection, query, where, orderBy } from 'firebase/firestore';
import { ERWorkflow, ERWorkflowStep, ApproverRole, ActionType } from '../../../types';
import { Position } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, Save, ArrowDown, ArrowUp, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ id: string }>;
}

const APPROVER_ROLES: Record<string, string> = {
    'POSITION': 'Тодорхой ажлын байр'
};

const ACTION_TYPES: Record<string, string> = {
    'REVIEW': 'Хянах (Review)',
    'APPROVE': 'Батлах (Approve)',
    'SIGN': 'Гарын үсэг зурах (Sign)',
    'ARCHIVE': 'Архивлах (Archive)'
};

export default function WorkflowEditPage({ params }: PageProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    const docRef = useMemo(() => firestore ? doc(firestore, 'er_workflows', id) : null, [firestore, id]);
    const { data: workflow, isLoading } = useDoc<ERWorkflow>(docRef as any);

    // Fetch approved positions
    const positionsQuery = useMemo(() =>
        firestore ? query(collection(firestore, 'positions'), where('isActive', '==', true), orderBy('title')) : null
        , [firestore]);
    const { data: positions } = useCollection<Position>(positionsQuery as any);

    const [steps, setSteps] = useState<ERWorkflowStep[]>([]);
    const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<ERWorkflowStep | null>(null);
    const [stepForm, setStepForm] = useState<Partial<ERWorkflowStep>>({
        name: '',
        approverRole: 'POSITION',
        actionType: 'REVIEW',
        approverPositionId: ''
    });

    useEffect(() => {
        if (workflow?.steps) {
            setSteps(workflow.steps);
        }
    }, [workflow]);

    const handleSave = async () => {
        if (!firestore || !workflow) return;

        try {
            await updateDocumentNonBlocking(docRef!, {
                steps: steps,
                updatedAt: Timestamp.now()
            });
            toast({ title: "Амжилттай", description: "Урсгал хадгалагдлаа" });
        } catch (error) {
            toast({ title: "Алдаа", description: "Хадгалахад алдаа гарлаа", variant: "destructive" });
        }
    };

    const handleAddStep = () => {
        setEditingStep(null);
        setStepForm({ name: '', approverRole: 'POSITION', actionType: 'REVIEW', approverPositionId: '' });
        setIsStepDialogOpen(true);
    };

    const handleEditStep = (step: ERWorkflowStep) => {
        setEditingStep(step);
        setStepForm({ ...step });
        setIsStepDialogOpen(true);
    };

    const handleStepSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation for POSITION role
        if (stepForm.approverRole === 'POSITION' && !stepForm.approverPositionId) {
            toast({ title: "Алдаа", description: "Ажлын байр сонгоно уу", variant: "destructive" });
            return;
        }

        let newSteps = [...steps];
        if (editingStep) {
            newSteps = newSteps.map(s => s.id === editingStep.id ? { ...s, ...stepForm } as ERWorkflowStep : s);
        } else {
            const newStep: ERWorkflowStep = {
                id: crypto.randomUUID(),
                order: steps.length + 1,
                name: stepForm.name || 'Шинэ алхам',
                approverRole: stepForm.approverRole as ApproverRole,
                actionType: stepForm.actionType as ActionType,
                approverPositionId: stepForm.approverPositionId,
                ...stepForm
            } as ERWorkflowStep;
            newSteps.push(newStep);
        }

        setSteps(newSteps);
        setIsStepDialogOpen(false);
    };

    const handleDeleteStep = (id: string) => {
        setSteps(steps.filter(s => s.id !== id));
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        const newSteps = [...steps];
        if (direction === 'up' && index > 0) {
            [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
        } else if (direction === 'down' && index < newSteps.length - 1) {
            [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
        }
        newSteps.forEach((s, i) => s.order = i + 1);
        setSteps(newSteps);
    };

    if (isLoading) return <div className="p-8 flex justify-center"><Plus className="animate-spin" /></div>;
    if (!workflow) return <div className="p-8">Workflow not found</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/employment-relations/settings/workflows">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-xl font-semibold">{workflow.name}</h2>
                    <p className="text-sm text-muted-foreground">{workflow.description || 'Тайлбар байхгүй'}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Хадгалах
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-medium">Алхамууд ({steps.length})</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleAddStep}>
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Алхам нэмэх
                    </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                    {steps.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                            Одоогоор алхам нэмэгдээгүй байна
                        </div>
                    )}
                    {steps.map((step, index) => {
                        const positionName = positions?.find(p => p.id === step.approverPositionId)?.title;

                        return (
                            <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:border-primary/50 transition-colors group">
                                <div className="flex flex-col gap-1 text-muted-foreground/50">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => moveStep(index, 'up')}>
                                        <ArrowUp className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === steps.length - 1} onClick={() => moveStep(index, 'down')}>
                                        <ArrowDown className="h-3 w-3" />
                                    </Button>
                                </div>

                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                                    {index + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{step.name}</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 flex items-center gap-1.5">
                                            <Briefcase className="h-3 w-3" />
                                            {positionName || 'Ажлын байр сонгоогүй'}
                                        </span>
                                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                            → {ACTION_TYPES[step.actionType]}
                                        </span>
                                    </div>
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditStep(step)}>Засах</Button>
                                    <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600" onClick={() => handleDeleteStep(step.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingStep ? 'Алхам засах' : 'Шинэ алхам'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleStepSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="stepName">Алхамын нэр</Label>
                            <Input
                                id="stepName"
                                required
                                value={stepForm.name}
                                onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })}
                                placeholder="Жишээ: ХН менежер хянах"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-primary" />
                                Хариуцах ажлын байр
                            </Label>
                            <Select
                                value={stepForm.approverPositionId}
                                onValueChange={(val) => setStepForm({ ...stepForm, approverPositionId: val })}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Ажлын байр сонгоно уу..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {positions?.map((pos) => (
                                        <SelectItem key={pos.id} value={pos.id}>
                                            {pos.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Гүйцэтгэх үйлдэл</Label>
                            <Select
                                value={stepForm.actionType}
                                onValueChange={(val) => setStepForm({ ...stepForm, actionType: val as ActionType })}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(ACTION_TYPES).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsStepDialogOpen(false)}>Цуцлах</Button>
                            <Button type="submit">{editingStep ? 'Хадгалах' : 'Нэмэх'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
