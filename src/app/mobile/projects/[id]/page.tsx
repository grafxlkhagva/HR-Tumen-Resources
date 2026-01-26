'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    useFirebase,
    useCollection,
    useMemoFirebase,
    useDoc,
    updateDocumentNonBlocking,
    addDocumentNonBlocking,
} from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { collection, query, orderBy, doc, Timestamp, DocumentReference } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    ChevronLeft,
    Calendar,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    Target,
    ListTodo,
    MessageCircle,
    Send,
    AtSign,
    Loader2,
    MoreHorizontal,
    Circle,
    CheckCircle,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { mn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
    Project,
    Task,
    ProjectMessage,
    PROJECT_STATUS_LABELS,
    TASK_STATUS_LABELS,
    TASK_STATUS_COLORS,
    TaskStatus,
} from '@/types/project';
import { Employee } from '@/types';

export default function MobileProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const { firestore, user } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const [activeTab, setActiveTab] = React.useState('tasks');

    // Chat state
    const [message, setMessage] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);
    const [mentionOpen, setMentionOpen] = React.useState(false);
    const [mentionSearch, setMentionSearch] = React.useState('');
    const [mentions, setMentions] = React.useState<string[]>([]);
    const [cursorPosition, setCursorPosition] = React.useState(0);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Fetch project
    const projectRef = useMemoFirebase(
        () => firestore && projectId
            ? doc(firestore, 'projects', projectId) as DocumentReference<Project>
            : null,
        [firestore, projectId]
    );
    const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectRef);

    // Fetch tasks
    const tasksQuery = useMemoFirebase(
        () => firestore && projectId
            ? query(
                collection(firestore, 'projects', projectId, 'tasks'),
                orderBy('createdAt', 'desc')
            )
            : null,
        [firestore, projectId]
    );
    const { data: tasks, isLoading: isTasksLoading } = useCollection<Task>(tasksQuery);

    // Fetch messages
    const messagesQuery = useMemoFirebase(
        () => firestore && projectId
            ? query(
                collection(firestore, 'projects', projectId, 'messages'),
                orderBy('createdAt', 'asc')
            )
            : null,
        [firestore, projectId]
    );
    const { data: messages, isLoading: isMessagesLoading } = useCollection<ProjectMessage>(messagesQuery);

    // Fetch all employees
    const employeesQuery = useMemoFirebase(
        () => firestore ? collection(firestore, 'employees') : null,
        [firestore]
    );
    const { data: employees } = useCollection<Employee>(employeesQuery);
    const employeeMap = React.useMemo(() => {
        const map = new Map<string, Employee>();
        employees?.forEach(e => e.id && map.set(e.id, e));
        return map;
    }, [employees]);

    // Team members
    const teamMembers = React.useMemo(() => {
        if (!project?.teamMemberIds || !employees) return [];
        return employees.filter(e => e.id && project.teamMemberIds.includes(e.id));
    }, [project?.teamMemberIds, employees]);

    // Task stats
    const taskStats = React.useMemo(() => {
        if (!tasks) return { total: 0, todo: 0, inProgress: 0, done: 0 };
        return {
            total: tasks.length,
            todo: tasks.filter(t => t.status === 'TODO').length,
            inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            done: tasks.filter(t => t.status === 'DONE').length,
        };
    }, [tasks]);

    const progressPercent = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

    // Auto-scroll chat
    React.useEffect(() => {
        if (scrollRef.current && activeTab === 'chat') {
            const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages, activeTab]);

    // Filter team members for mention
    const filteredMembers = React.useMemo(() => {
        if (!mentionSearch) return teamMembers;
        const search = mentionSearch.toLowerCase();
        return teamMembers.filter(m =>
            m.firstName?.toLowerCase().includes(search) ||
            m.lastName?.toLowerCase().includes(search)
        );
    }, [teamMembers, mentionSearch]);

    // Handle task status change
    const handleTaskStatusChange = async (task: Task, newStatus: TaskStatus) => {
        if (!firestore || !projectId) return;
        const taskRef = doc(firestore, 'projects', projectId, 'tasks', task.id);
        const updateData: any = {
            status: newStatus,
            updatedAt: Timestamp.now(),
        };
        if (newStatus === 'DONE') {
            updateData.completedAt = Timestamp.now();
        }
        await updateDocumentNonBlocking(taskRef, updateData);
    };

    // Chat functions
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const pos = e.target.selectionStart || 0;
        setMessage(value);
        setCursorPosition(pos);

        const textBeforeCursor = value.slice(0, pos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
            if (!textAfterAt.includes(' ')) {
                setMentionSearch(textAfterAt);
                setMentionOpen(true);
                return;
            }
        }
        setMentionOpen(false);
        setMentionSearch('');
    };

    const handleMentionSelect = (member: Employee) => {
        if (!member.id) return;
        const textBeforeCursor = message.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = message.slice(cursorPosition);
        const mentionText = `@${member.firstName} `;
        const newMessage = message.slice(0, lastAtIndex) + mentionText + textAfterCursor;

        setMessage(newMessage);
        setMentions(prev => [...new Set([...prev, member.id!])]);
        setMentionOpen(false);
        setMentionSearch('');

        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newPos = lastAtIndex + mentionText.length;
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const handleSend = async () => {
        if (!firestore || !projectId || !user || !message.trim()) return;

        setIsSending(true);
        try {
            const messageData = {
                projectId,
                content: message.trim(),
                senderId: user.uid,
                mentions,
                createdAt: Timestamp.now(),
            };

            await addDocumentNonBlocking(
                collection(firestore, 'projects', projectId, 'messages'),
                messageData
            );

            setMessage('');
            setMentions([]);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatMessageContent = (content: string) => {
        const parts = content.split(/(@\S+)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                return (
                    <span key={index} className="text-indigo-600 font-medium">
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            if (isToday) return format(date, 'HH:mm');
            return format(date, 'MM/dd HH:mm');
        } catch {
            return '';
        }
    };

    const getStatusStyle = (status: string) => {
        const styles: Record<string, { bg: string; text: string }> = {
            DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600' },
            PLANNING: { bg: 'bg-slate-100', text: 'text-slate-600' },
            ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
            IN_PROGRESS: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
            ON_HOLD: { bg: 'bg-amber-100', text: 'text-amber-700' },
            COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700' },
            ARCHIVED: { bg: 'bg-zinc-100', text: 'text-zinc-500' },
        };
        return styles[status] || styles.DRAFT;
    };

    if (isProjectLoading) {
        return (
            <div className="min-h-screen bg-slate-50 p-5 space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-400">Төсөл олдсонгүй</p>
            </div>
        );
    }

    const owner = employeeMap.get(project.ownerId);
    const statusStyle = getStatusStyle(project.status);

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-xl px-5 py-4 border-b border-slate-100 sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10 shrink-0">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base font-bold text-slate-900 truncate">{project.name}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={cn(
                                "text-[9px] font-semibold border-0 px-2 py-0",
                                statusStyle.bg,
                                statusStyle.text
                            )}>
                                {PROJECT_STATUS_LABELS[project.status] || project.status}
                            </Badge>
                            <span className="text-[10px] text-slate-400">
                                {format(parseISO(project.endDate), 'yyyy.MM.dd')} хүртэл
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="bg-white px-5 pt-3 border-b sticky top-[72px] z-40">
                    <TabsList className="w-full bg-slate-100/80 p-1 rounded-xl h-11">
                        <TabsTrigger value="tasks" className="flex-1 rounded-lg text-[11px] font-semibold gap-1.5">
                            <ListTodo className="w-3.5 h-3.5" />
                            Таскууд
                            {taskStats.total > 0 && (
                                <span className="ml-1 text-[9px] bg-slate-200 text-slate-600 px-1.5 rounded-full">
                                    {taskStats.total}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="flex-1 rounded-lg text-[11px] font-semibold gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Чат
                            {messages && messages.length > 0 && (
                                <span className="ml-1 text-[9px] bg-slate-200 text-slate-600 px-1.5 rounded-full">
                                    {messages.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="info" className="flex-1 rounded-lg text-[11px] font-semibold gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Мэдээлэл
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="p-5 space-y-4 animate-in fade-in outline-none">
                    {/* Progress Card */}
                    <Card className="rounded-2xl border-0 shadow-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">Явц</p>
                                    <p className="text-3xl font-bold">{progressPercent}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">{taskStats.done}/{taskStats.total}</p>
                                    <p className="text-[10px] text-indigo-200">дууссан</p>
                                </div>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Task Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                            <div className="text-lg font-bold text-slate-600">{taskStats.todo}</div>
                            <div className="text-[9px] font-semibold text-slate-400 uppercase">Хийх</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 text-center shadow-sm">
                            <div className="text-lg font-bold text-amber-600">{taskStats.inProgress}</div>
                            <div className="text-[9px] font-semibold text-amber-600 uppercase">Явагдаж буй</div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 text-center shadow-sm">
                            <div className="text-lg font-bold text-emerald-600">{taskStats.done}</div>
                            <div className="text-[9px] font-semibold text-emerald-600 uppercase">Дууссан</div>
                        </div>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-2">
                        {isTasksLoading ? (
                            [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                        ) : !tasks || tasks.length === 0 ? (
                            <Card className="rounded-xl border-2 border-dashed border-slate-200 bg-white/50">
                                <CardContent className="py-10 text-center">
                                    <ListTodo className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">Таск байхгүй</p>
                                </CardContent>
                            </Card>
                        ) : (
                            tasks.map((task) => {
                                const isOverdue = isPast(parseISO(task.dueDate)) && task.status !== 'DONE';
                                const assignees = task.assigneeIds?.map(id => employeeMap.get(id)).filter(Boolean) || [];

                                return (
                                    <Card key={task.id} className="rounded-xl border-0 shadow-sm bg-white">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                {/* Status Toggle */}
                                                <button
                                                    onClick={() => handleTaskStatusChange(
                                                        task,
                                                        task.status === 'DONE' ? 'TODO' : task.status === 'TODO' ? 'IN_PROGRESS' : 'DONE'
                                                    )}
                                                    className="mt-0.5 shrink-0"
                                                >
                                                    {task.status === 'DONE' ? (
                                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                    ) : task.status === 'IN_PROGRESS' ? (
                                                        <Clock className="w-5 h-5 text-amber-500" />
                                                    ) : (
                                                        <Circle className="w-5 h-5 text-slate-300" />
                                                    )}
                                                </button>

                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "text-sm font-medium mb-1",
                                                        task.status === 'DONE' ? "text-slate-400 line-through" : "text-slate-900"
                                                    )}>
                                                        {task.title}
                                                    </p>

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge className={cn(
                                                            "text-[9px] font-semibold border-0",
                                                            TASK_STATUS_COLORS[task.status]
                                                        )}>
                                                            {TASK_STATUS_LABELS[task.status]}
                                                        </Badge>

                                                        <span className={cn(
                                                            "text-[10px]",
                                                            isOverdue ? "text-red-500 font-semibold" : "text-slate-400"
                                                        )}>
                                                            {format(parseISO(task.dueDate), 'MM/dd')}
                                                            {isOverdue && " (хэтэрсэн)"}
                                                        </span>

                                                        {/* Assignees */}
                                                        {assignees.length > 0 && (
                                                            <div className="flex -space-x-1.5">
                                                                {assignees.slice(0, 2).map((emp) => (
                                                                    <Avatar key={emp!.id} className="h-5 w-5 ring-1 ring-white">
                                                                        <AvatarImage src={emp!.photoURL} />
                                                                        <AvatarFallback className="text-[7px]">
                                                                            {emp!.firstName?.[0]}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </TabsContent>

                {/* Chat Tab */}
                <TabsContent value="chat" className="outline-none h-[calc(100vh-200px)] flex flex-col">
                    <ScrollArea ref={scrollRef} className="flex-1 px-5 py-4">
                        {isMessagesLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                            </div>
                        ) : messages && messages.length > 0 ? (
                            <div className="space-y-4">
                                {messages.map((msg) => {
                                    const sender = employeeMap.get(msg.senderId);
                                    const isCurrentUser = user?.uid === msg.senderId;

                                    return (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex gap-2",
                                                isCurrentUser && "flex-row-reverse"
                                            )}
                                        >
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarImage src={sender?.photoURL} />
                                                <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-600">
                                                    {sender?.firstName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className={cn("max-w-[75%]", isCurrentUser && "text-right")}>
                                                <div className={cn(
                                                    "flex items-center gap-1.5 mb-1",
                                                    isCurrentUser && "flex-row-reverse"
                                                )}>
                                                    <span className="text-[11px] font-semibold text-slate-700">
                                                        {sender?.firstName}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">
                                                        {formatTime(msg.createdAt)}
                                                    </span>
                                                </div>
                                                <div className={cn(
                                                    "inline-block px-3 py-2 rounded-2xl text-sm",
                                                    isCurrentUser
                                                        ? "bg-indigo-600 text-white rounded-tr-sm"
                                                        : "bg-white shadow-sm rounded-tl-sm text-slate-700"
                                                )}>
                                                    {formatMessageContent(msg.content)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-20">
                                <MessageCircle className="h-12 w-12 text-slate-200 mb-2" />
                                <p className="text-sm text-slate-400">Мессеж байхгүй</p>
                                <p className="text-xs text-slate-300">Багтайгаа харилцаж эхлээрэй</p>
                            </div>
                        )}
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 bg-white border-t">
                        <div className="flex items-center gap-2">
                            <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 shrink-0 rounded-full"
                                        onClick={() => {
                                            setMessage(message + '@');
                                            setMentionOpen(true);
                                            inputRef.current?.focus();
                                        }}
                                    >
                                        <AtSign className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-[200px] p-2 rounded-xl"
                                    align="start"
                                    onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 px-2 pb-1">Гишүүн сонгох</p>
                                        {filteredMembers.length > 0 ? (
                                            filteredMembers.map((member) => (
                                                <button
                                                    key={member.id}
                                                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-100 text-left"
                                                    onClick={() => handleMentionSelect(member)}
                                                >
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={member.photoURL} />
                                                        <AvatarFallback className="text-[9px]">
                                                            {member.firstName?.[0]}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm truncate">{member.firstName}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 px-2 py-2">Олдсонгүй</p>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Input
                                ref={inputRef}
                                value={message}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Мессеж бичих..."
                                className="flex-1 h-10 rounded-full border-slate-200"
                                disabled={isSending}
                            />

                            <Button
                                size="icon"
                                className="h-10 w-10 shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-700"
                                onClick={handleSend}
                                disabled={isSending || !message.trim()}
                            >
                                {isSending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                {/* Info Tab */}
                <TabsContent value="info" className="p-5 space-y-4 animate-in fade-in outline-none">
                    {/* Goal & Outcome */}
                    <Card className="rounded-2xl border-0 shadow-sm">
                        <CardContent className="p-5 space-y-4">
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Зорилго</p>
                                <p className="text-sm text-slate-700">{project.goal}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Хүлээгдэж буй үр дүн</p>
                                <p className="text-sm text-slate-700">{project.expectedOutcome}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dates */}
                    <Card className="rounded-2xl border-0 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <Calendar className="w-5 h-5 text-slate-400" />
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Хугацаа</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-slate-400 mb-0.5">Эхлэх</p>
                                    <p className="text-sm font-semibold text-slate-700">
                                        {format(parseISO(project.startDate), 'yyyy.MM.dd')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 mb-0.5">Дуусах</p>
                                    <p className="text-sm font-semibold text-slate-700">
                                        {format(parseISO(project.endDate), 'yyyy.MM.dd')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Owner */}
                    <Card className="rounded-2xl border-0 shadow-sm">
                        <CardContent className="p-5">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Эзэн</p>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={owner?.photoURL} />
                                    <AvatarFallback>{owner?.firstName?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {owner?.firstName} {owner?.lastName}
                                    </p>
                                    <p className="text-xs text-slate-400">{owner?.jobTitle}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team Members */}
                    <Card className="rounded-2xl border-0 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <Users className="w-5 h-5 text-slate-400" />
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Багийн гишүүд ({teamMembers.length})
                                </p>
                            </div>
                            <div className="space-y-3">
                                {teamMembers.map((member) => (
                                    <div key={member.id} className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={member.photoURL} />
                                            <AvatarFallback className="text-xs">{member.firstName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                {member.firstName} {member.lastName}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate">{member.jobTitle}</p>
                                        </div>
                                        {member.id === project.ownerId && (
                                            <Badge className="text-[8px] bg-indigo-100 text-indigo-600 border-0">Эзэн</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
