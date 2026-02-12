// src/app/dashboard/training/components/training-plans.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddActionButton } from '@/components/ui/add-action-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/patterns/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Search, ClipboardList, Play, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    TrainingPlan,
    TrainingCourse,
    SkillGap,
    PLAN_STATUSES,
    PLAN_STATUS_LABELS,
    PLAN_TRIGGER_LABELS,
    PlanStatus,
} from '../types';
import { Employee } from '@/types';
import { AssignTrainingDialog } from './assign-training-dialog';

interface TrainingPlansProps {
    plans: TrainingPlan[];
    courses: TrainingCourse[];
    employees: Employee[];
    employeeGaps: SkillGap[];
    isLoading: boolean;
    onAssign: (values: any, employeeName: string, courseName: string) => void;
}

export function TrainingPlans({
    plans,
    courses,
    employees,
    employeeGaps,
    isLoading,
    onAssign,
}: TrainingPlansProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [assignOpen, setAssignOpen] = useState(false);

    // Complete dialog state
    const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
    const [completingPlan, setCompletingPlan] = useState<TrainingPlan | null>(null);
    const [postScore, setPostScore] = useState('');

    const filteredPlans = useMemo(() => {
        return plans.filter(plan => {
            const matchesSearch =
                plan.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                plan.courseName.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [plans, searchQuery, statusFilter]);

    const handleStatusChange = (planId: string, newStatus: PlanStatus) => {
        if (!firestore) return;
        const updates: Record<string, any> = { status: newStatus };
        if (newStatus === 'in_progress') {
            updates.startedAt = new Date().toISOString();
        }
        if (newStatus === 'cancelled') {
            updates.completedAt = new Date().toISOString();
        }
        updateDocumentNonBlocking(doc(firestore, 'training_plans', planId), updates);
        toast({ title: 'Төлөв шинэчлэгдлээ' });
    };

    const openCompleteDialog = (plan: TrainingPlan) => {
        setCompletingPlan(plan);
        setPostScore('');
        setCompleteDialogOpen(true);
    };

    const handleComplete = () => {
        if (!firestore || !completingPlan) return;
        const updates: Record<string, any> = {
            status: 'completed' as PlanStatus,
            completedAt: new Date().toISOString(),
        };
        if (postScore && !isNaN(Number(postScore))) {
            updates.postAssessmentScore = Number(postScore);
        }
        updateDocumentNonBlocking(doc(firestore, 'training_plans', completingPlan.id), updates);
        toast({ title: 'Сургалт дууслаа', description: completingPlan.courseName });
        setCompleteDialogOpen(false);
        setCompletingPlan(null);
    };

    const statusColor: Record<string, string> = {
        assigned: 'bg-blue-100 text-blue-700',
        in_progress: 'bg-amber-100 text-amber-700',
        completed: 'bg-emerald-100 text-emerald-700',
        overdue: 'bg-red-100 text-red-700',
        cancelled: 'bg-slate-100 text-slate-500',
    };

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: plans.length };
        PLAN_STATUSES.forEach(s => {
            counts[s] = plans.filter(p => p.status === s).length;
        });
        return counts;
    }, [plans]);

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 w-full gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Ажилтан эсвэл сургалтаар хайх..."
                            className="pl-9 bg-white border shadow-sm h-11 rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[200px] bg-white border shadow-sm h-11 rounded-xl">
                            <SelectValue placeholder="Бүх төлөв" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх төлөв ({statusCounts.all})</SelectItem>
                            {PLAN_STATUSES.map(s => (
                                <SelectItem key={s} value={s}>
                                    {PLAN_STATUS_LABELS[s]} ({statusCounts[s] || 0})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <AddActionButton
                    label="Сургалт оноох"
                    description="Ажилтанд сургалт оноох"
                    onClick={() => setAssignOpen(true)}
                />
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
            ) : filteredPlans.length === 0 ? (
                <EmptyState
                    icon={ClipboardList}
                    title="Төлөвлөгөө олдсонгүй"
                    description={plans.length === 0
                        ? 'Ажилтанд сургалт оноогоогүй байна.'
                        : 'Хайлтын үр дүн олдсонгүй.'}
                    action={plans.length === 0 ? {
                        label: 'Сургалт оноох',
                        onClick: () => setAssignOpen(true),
                    } : undefined}
                />
            ) : (
                <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ажилтан</TableHead>
                                <TableHead>Сургалт</TableHead>
                                <TableHead>Шалтгаан</TableHead>
                                <TableHead>Оноосон</TableHead>
                                <TableHead>Хугацаа</TableHead>
                                <TableHead>Оноо</TableHead>
                                <TableHead>Төлөв</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPlans.map(plan => (
                                <TableRow key={plan.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        <p className="font-medium text-sm">{plan.employeeName}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm">{plan.courseName}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {PLAN_TRIGGER_LABELS[plan.trigger]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(plan.assignedAt).toLocaleDateString('mn-MN')}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(plan.dueDate).toLocaleDateString('mn-MN')}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs space-y-0.5">
                                            {plan.preAssessmentScore != null && (
                                                <div>Өмнөх: <span className="font-medium">{plan.preAssessmentScore}</span></div>
                                            )}
                                            {plan.postAssessmentScore != null && (
                                                <div>Дараах: <span className="font-medium text-emerald-600">{plan.postAssessmentScore}</span></div>
                                            )}
                                            {plan.preAssessmentScore == null && plan.postAssessmentScore == null && (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={statusColor[plan.status] || ''}>
                                            {PLAN_STATUS_LABELS[plan.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {plan.status === 'assigned' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-600"
                                                    title="Эхлүүлэх"
                                                    onClick={() => handleStatusChange(plan.id, 'in_progress')}
                                                >
                                                    <Play className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {(plan.status === 'assigned' || plan.status === 'in_progress') && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-emerald-600"
                                                        title="Дуусгах"
                                                        onClick={() => openCompleteDialog(plan)}
                                                    >
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500"
                                                        title="Цуцлах"
                                                        onClick={() => handleStatusChange(plan.id, 'cancelled')}
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Assign Training Dialog */}
            <AssignTrainingDialog
                open={assignOpen}
                onOpenChange={setAssignOpen}
                onSubmit={onAssign}
                employees={employees}
                courses={courses}
                employeeGaps={employeeGaps}
            />

            {/* Complete Dialog with post-assessment */}
            <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Сургалт дуусгах</DialogTitle>
                        <DialogDescription>
                            {completingPlan?.courseName} — {completingPlan?.employeeName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Дараах үнэлгээ (0-100)</label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Заавал биш"
                                value={postScore}
                                onChange={(e) => setPostScore(e.target.value)}
                            />
                            {completingPlan?.preAssessmentScore != null && (
                                <p className="text-xs text-muted-foreground">
                                    Өмнөх үнэлгээ: {completingPlan.preAssessmentScore}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Болих</Button>
                        <Button onClick={handleComplete}>Дуусгах</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
