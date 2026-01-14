'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Trash2,
    User,
    Calendar as CalendarIcon,
    Save,
    Loader2,
    ArrowRight,
    Search,
    ChevronDown,
    ChevronRight,
    GripVertical,
    Check
} from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { OffboardingProcess } from '../types';
import { type Employee } from '../../../data';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface StepHandoverProps {
    process: OffboardingProcess;
}

interface HandoverTask {
    id: string;
    task: string;
    assigneeId?: string;
    assigneeName?: string;
    status: 'TODO' | 'DONE';
    dueDate?: string;
}

interface HandoverGroup {
    id: string;
    title: string;
    tasks: HandoverTask[];
}

export function StepHandover({ process }: StepHandoverProps) {
    const { firestore } = useFirebase();
    const { id: currentEmployeeIdParam } = useParams();
    const employeeId = Array.isArray(currentEmployeeIdParam) ? currentEmployeeIdParam[0] : currentEmployeeIdParam;
    const { toast } = useToast();

    // Fetch Employees
    const employeesRef = React.useMemo(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
    const { data: employees } = useCollection<Employee>(employeesRef as any);

    // Filter out the employee being offboarded
    const otherEmployees = React.useMemo(() => {
        return employees?.filter(emp => emp.id !== employeeId) || [];
    }, [employees, employeeId]);

    // State
    const [groups, setGroups] = React.useState<HandoverGroup[]>(
        process.handover?.groups || [
            { id: 'default', title: 'Үндсэн даалгаврууд', tasks: process.handover?.tasks || [] }
        ]
    );
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['default']);

    const isReadOnly = process.handover?.isCompleted;

    // Handlers
    const handleAddGroup = () => {
        const newGroup: HandoverGroup = {
            id: Math.random().toString(36).substring(7),
            title: 'Шинэ бүлэг',
            tasks: []
        };
        setGroups([...groups, newGroup]);
        setExpandedGroups([...expandedGroups, newGroup.id]);
    };

    const handleUpdateGroupTitle = (groupId: string, title: string) => {
        setGroups(groups.map(g => g.id === groupId ? { ...g, title } : g));
    };

    const handleDeleteGroup = (groupId: string) => {
        setGroups(groups.filter(g => g.id !== groupId));
    };

    const handleAddTask = (groupId: string) => {
        const newTask: HandoverTask = {
            id: Math.random().toString(36).substring(7),
            task: '',
            status: 'TODO',
            dueDate: new Date().toISOString()
        };
        setGroups(groups.map(g => g.id === groupId ? { ...g, tasks: [...g.tasks, newTask] } : g));
    };

    const handleUpdateTask = (groupId: string, taskId: string, updates: Partial<HandoverTask>) => {
        setGroups(groups.map(g => g.id === groupId ? {
            ...g,
            tasks: g.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
        } : g));
    };

    const handleDeleteTask = (groupId: string, taskId: string) => {
        setGroups(groups.map(g => g.id === groupId ? {
            ...g,
            tasks: g.tasks.filter(t => t.id !== taskId)
        } : g));
    };

    const toggleGroupExpand = (groupId: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
        );
    };

    const handleSave = async (completeStep: boolean = false) => {
        if (!firestore || !employeeId) return;

        setIsSubmitting(true);
        try {
            const docRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, process.id);

            // Flatten tasks for backward compatibility if needed, though we primarily save groups now
            const allTasks = groups.flatMap(g => g.tasks);

            await updateDocumentNonBlocking(docRef, {
                handover: {
                    groups,
                    tasks: allTasks,
                    isCompleted: completeStep
                },
                currentStep: completeStep ? 4 : 3
            });

            toast({ title: completeStep ? 'Амжилттай хадгалагдлаа' : 'Хадгалагдлаа', description: completeStep ? 'Дараагийн шат руу шилжлээ.' : 'Өөрчлөлтүүд хадгалагдлаа.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалах үед алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate progress
    const allTasks = groups.flatMap(g => g.tasks);
    const completedCount = allTasks.filter(t => t.status === 'DONE').length;
    const totalCount = allTasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <Card className="max-w-4xl mx-auto border-t-4 border-t-purple-500 shadow-md">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <span className="bg-purple-100 text-purple-600 w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold">3</span>
                            Ажил хүлээлцэх
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            Ажлын байрны тодорхойлолтод заасан үүрэг, хариуцаж буй төслүүдийг хүлээлцэх.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8">

                {/* Progress Bar */}
                <div className="space-y-2 bg-muted/20 p-4 rounded-xl border">
                    <div className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground font-medium uppercase tracking-wider">Нийт гүйцэтгэл</span>
                        <span className="font-bold text-lg text-purple-600">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-purple-500 transition-all duration-700 ease-in-out shadow-sm" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                <div className="space-y-6">
                    {groups.map((group) => (
                        <div key={group.id} className="border rounded-xl bg-card shadow-sm overflow-hidden group/group-item">
                            {/* Group Header */}
                            <div className="flex items-center justify-between p-4 bg-muted/10 border-b">
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground"
                                        onClick={() => toggleGroupExpand(group.id)}
                                    >
                                        {expandedGroups.includes(group.id) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                    </Button>
                                    <Input
                                        value={group.title}
                                        onChange={(e) => handleUpdateGroupTitle(group.id, e.target.value)}
                                        disabled={isReadOnly}
                                        className="bg-transparent border-none text-lg font-bold p-0 h-auto focus-visible:ring-0 w-[300px]"
                                    />
                                    <Badge variant="secondary" className="bg-purple-50 text-purple-600 border-purple-100">
                                        {group.tasks.length} даалгавар
                                    </Badge>
                                </div>
                                {!isReadOnly && (
                                    <div className="flex items-center gap-2 opacity-0 group-hover/group-item:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDeleteGroup(group.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" /> Бүлэг устгах
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Group Tasks */}
                            {expandedGroups.includes(group.id) && (
                                <div className="p-4 space-y-4">
                                    {group.tasks.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground italic text-sm border-2 border-dashed rounded-lg">
                                            Энэ бүлэгт даалгавар байхгүй байна.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {group.tasks.map((task) => (
                                                <div
                                                    key={task.id}
                                                    className={cn(
                                                        "flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border transition-all duration-300",
                                                        task.status === 'DONE' ? "bg-muted/10 border-muted opacity-80" : "bg-card hover:border-purple-200 hover:shadow-md"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                                        <Checkbox
                                                            checked={task.status === 'DONE'}
                                                            onCheckedChange={() => handleUpdateTask(group.id, task.id, { status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
                                                            disabled={isReadOnly}
                                                            className="h-5 w-5 transition-transform hover:scale-110"
                                                        />
                                                        <div className="flex-1 shrink-0">
                                                            <Input
                                                                placeholder="Даалгавар..."
                                                                value={task.task}
                                                                onChange={(e) => handleUpdateTask(group.id, task.id, { task: e.target.value })}
                                                                disabled={isReadOnly}
                                                                className={cn(
                                                                    "bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-sm font-medium w-full min-w-[200px]",
                                                                    task.status === 'DONE' && "line-through text-muted-foreground"
                                                                )}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 w-full sm:w-auto sm:ml-auto">
                                                        {/* Assignee Selection */}
                                                        <div className="flex items-center gap-2 min-w-[150px]">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={isReadOnly}
                                                                        className={cn(
                                                                            "h-9 w-full justify-start gap-2 border bg-muted/5 font-normal",
                                                                            !task.assigneeId && "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        {task.assigneeId ? (
                                                                            <>
                                                                                <Avatar className="h-5 w-5">
                                                                                    <AvatarFallback className="text-[10px] bg-purple-100 text-purple-600">
                                                                                        {task.assigneeName?.charAt(0)}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="truncate max-w-[100px]">{task.assigneeName}</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <User className="h-4 w-4" />
                                                                                <span>Хариуцагч</span>
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="p-0 w-[250px]" align="end">
                                                                    <div className="flex flex-col">
                                                                        <div className="p-2 border-b">
                                                                            <div className="relative">
                                                                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                                <Input
                                                                                    placeholder="Хүн хайх..."
                                                                                    className="pl-8 h-9 text-sm"
                                                                                    onChange={(e) => {
                                                                                        // Local filtering logic can be handled here or by state
                                                                                        const search = e.target.value.toLowerCase();
                                                                                        const items = document.querySelectorAll('.employee-item');
                                                                                        items.forEach((item: any) => {
                                                                                            const text = item.innerText.toLowerCase();
                                                                                            if (text.includes(search)) {
                                                                                                item.style.display = 'flex';
                                                                                            } else {
                                                                                                item.style.display = 'none';
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="max-h-[300px] overflow-y-auto p-1">
                                                                            {otherEmployees.length === 0 ? (
                                                                                <div className="p-4 text-center text-sm text-muted-foreground">
                                                                                    Ажилтан олдсонгүй.
                                                                                </div>
                                                                            ) : (
                                                                                otherEmployees.map((emp) => (
                                                                                    <div
                                                                                        key={emp.id}
                                                                                        className="employee-item flex items-center gap-2 p-2 hover:bg-accent rounded-sm cursor-pointer transition-colors"
                                                                                        onClick={() => {
                                                                                            handleUpdateTask(group.id, task.id, {
                                                                                                assigneeId: emp.id,
                                                                                                assigneeName: `${emp.lastName} ${emp.firstName}`
                                                                                            });
                                                                                        }}
                                                                                    >
                                                                                        <Avatar className="h-7 w-7">
                                                                                            <AvatarImage src={emp.photoURL} />
                                                                                            <AvatarFallback className="text-[10px]">
                                                                                                {emp.firstName.charAt(0)}
                                                                                            </AvatarFallback>
                                                                                        </Avatar>
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-medium text-xs truncate">{emp.lastName} {emp.firstName}</span>
                                                                                            <span className="text-[10px] text-muted-foreground truncate">{emp.jobTitle}</span>
                                                                                        </div>
                                                                                        {task.assigneeId === emp.id && <Check className="ml-auto h-4 w-4 text-purple-600" />}
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>

                                                        {/* Due Date Picker */}
                                                        <div className="flex items-center gap-2">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        disabled={isReadOnly}
                                                                        className={cn(
                                                                            "h-9 w-full justify-start gap-2 border bg-muted/5 font-normal px-2",
                                                                            !task.dueDate && "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        <CalendarIcon className="h-4 w-4" />
                                                                        {task.dueDate ? (
                                                                            <span className="text-xs">{format(new Date(task.dueDate), "MMM d")}</span>
                                                                        ) : (
                                                                            <span className="text-xs">Огноо</span>
                                                                        )}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="end">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={task.dueDate ? new Date(task.dueDate) : undefined}
                                                                        onSelect={(date) => {
                                                                            if (date) handleUpdateTask(group.id, task.id, { dueDate: date.toISOString() });
                                                                        }}
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>

                                                        {!isReadOnly && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                                onClick={() => handleDeleteTask(group.id, task.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!isReadOnly && (
                                        <Button
                                            variant="ghost"
                                            className="w-full h-10 border-dashed border-2 hover:bg-purple-50 hover:border-purple-200 text-purple-600 gap-2"
                                            onClick={() => handleAddTask(group.id)}
                                        >
                                            <Plus className="h-4 w-4" /> Шинэ даалгавар нэмэх
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {!isReadOnly && (
                        <Button
                            variant="outline"
                            className="w-full h-14 border-dashed border-2 bg-purple-50/10 hover:bg-purple-50 group transition-colors"
                            onClick={handleAddGroup}
                        >
                            <Plus className="h-5 w-5 mr-3 text-purple-600 transition-transform group-hover:rotate-90" />
                            <span className="font-semibold text-lg">Шинэ бүлэг үүсгэх</span>
                        </Button>
                    )}
                </div>

            </CardContent>
            <CardFooter className="flex justify-between gap-3 border-t bg-muted/20 py-6 px-8">
                <Button variant="outline" size="lg" onClick={() => handleSave(false)} disabled={isSubmitting || isReadOnly} className="min-w-[140px] gap-2">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Хадгалах
                </Button>
                {!isReadOnly ? (
                    <div className="flex flex-col items-end gap-2">
                        <Button
                            size="lg"
                            onClick={() => handleSave(true)}
                            disabled={isSubmitting || (totalCount > 0 && progress < 100)}
                            className="bg-purple-600 hover:bg-purple-700 min-w-[200px] gap-2"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            Дуусгах & Үргэлжлүүлэх
                        </Button>
                        {totalCount > 0 && progress < 100 && (
                            <span className="text-[10px] text-destructive font-medium animate-pulse">
                                * Бүх даалгаврыг дуусгасны дараа үргэлжлүүлэх боломжтой
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-green-600 font-bold bg-green-50 px-6 py-2 rounded-full border border-green-200">
                        <Check className="h-5 w-5" />
                        <span>Ажил хүлээлцэж дууссан</span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
