'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { MessageCircle, Send, AtSign, Loader2, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import {
    useFirebase,
    useMemoFirebase,
    useCollection,
    addDocumentNonBlocking,
    useTenantWrite,
} from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { ProjectMessage, Task } from '@/types/project';
import { Employee } from '@/types';

interface ProjectChatSectionProps {
    projectId: string;
    teamMembers: Employee[];
    employeeMap: Map<string, Employee>;
    tasks?: Task[];
    onTaskClick?: (task: Task) => void;
}

export interface ProjectChatSectionHandle {
    mentionTask: (task: Task) => void;
}

export const ProjectChatSection = React.forwardRef<ProjectChatSectionHandle, ProjectChatSectionProps>(
    function ProjectChatSection({ projectId, teamMembers, employeeMap, tasks = [], onTaskClick }, ref) {
    const { firestore, user } = useFirebase();
    const { tCollection } = useTenantWrite();
    const [message, setMessage] = React.useState('');
    const [isSending, setIsSending] = React.useState(false);
    const [mentionOpen, setMentionOpen] = React.useState(false);
    const [mentionSearch, setMentionSearch] = React.useState('');
    const [mentions, setMentions] = React.useState<string[]>([]);
    const [taskMentions, setTaskMentions] = React.useState<string[]>([]);
    const [cursorPosition, setCursorPosition] = React.useState(0);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const messagesQuery = useMemoFirebase(
        ({ firestore, companyPath }) => firestore && projectId
            ? query(
                collection(firestore, companyPath ? `${companyPath}/projects` : 'projects', projectId, 'messages'),
                orderBy('createdAt', 'asc')
            )
            : null,
        [firestore, projectId]
    );
    const { data: messages, isLoading } = useCollection<ProjectMessage>(messagesQuery);

    React.useEffect(() => {
        if (scrollRef.current) {
            const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages]);

    const taskMap = React.useMemo(() => {
        return new Map(tasks.map(t => [t.id, t]));
    }, [tasks]);

    const filteredMembers = React.useMemo(() => {
        if (!mentionSearch) return teamMembers;
        const search = mentionSearch.toLowerCase();
        return teamMembers.filter(m =>
            m.firstName?.toLowerCase().includes(search) ||
            m.lastName?.toLowerCase().includes(search)
        );
    }, [teamMembers, mentionSearch]);

    const filteredTasks = React.useMemo(() => {
        if (!mentionSearch) return tasks.slice(0, 10);
        const search = mentionSearch.toLowerCase();
        return tasks.filter(t => t.title?.toLowerCase().includes(search)).slice(0, 10);
    }, [tasks, mentionSearch]);

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

    const replaceAtBeforeCursor = (replacement: string) => {
        const textBeforeCursor = message.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = message.slice(cursorPosition);
        const safeFrom = lastAtIndex === -1 ? cursorPosition : lastAtIndex;
        const newMessage = message.slice(0, safeFrom) + replacement + textAfterCursor;
        setMessage(newMessage);
        setMentionOpen(false);
        setMentionSearch('');
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newPos = safeFrom + replacement.length;
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const handleMentionSelect = (member: Employee) => {
        if (!member.id) return;
        const mentionText = `@${member.firstName} `;
        replaceAtBeforeCursor(mentionText);
        setMentions(prev => [...new Set([...prev, member.id!])]);
    };

    const handleTaskMentionSelect = (task: Task) => {
        if (!task.id) return;
        const title = task.title?.length > 30 ? task.title.slice(0, 30) + '…' : task.title;
        const mentionText = `@${title} `;
        replaceAtBeforeCursor(mentionText);
        setTaskMentions(prev => [...new Set([...prev, task.id])]);
    };

    React.useImperativeHandle(ref, () => ({
        mentionTask(task: Task) {
            if (!task.id) return;
            const title = task.title?.length > 30 ? task.title.slice(0, 30) + '…' : task.title;
            const needsLeadingSpace = message.length > 0 && !message.endsWith(' ');
            const insertion = `${needsLeadingSpace ? ' ' : ''}@${title} `;
            const newMessage = message + insertion;
            setMessage(newMessage);
            setTaskMentions(prev => [...new Set([...prev, task.id])]);
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(newMessage.length, newMessage.length);
                }
            }, 0);
        }
    }), [message]);

    const handleSend = async () => {
        if (!firestore || !projectId || !user || !message.trim()) return;

        setIsSending(true);
        try {
            const messageData: any = {
                projectId,
                content: message.trim(),
                senderId: user.uid,
                mentions,
                createdAt: Timestamp.now(),
            };
            if (taskMentions.length > 0) {
                messageData.taskMentions = taskMentions;
            }

            await addDocumentNonBlocking(
                tCollection('projects', projectId, 'messages'),
                messageData
            );

            setMessage('');
            setMentions([]);
            setTaskMentions([]);
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

    const formatMessageContent = (content: string, msgTaskMentions?: string[]) => {
        const taskTitles = (msgTaskMentions || [])
            .map(id => taskMap.get(id))
            .filter((t): t is Task => !!t);

        const parts = content.split(/(@\S+(?:\s\S+)*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const matchedTask = taskTitles.find(t => {
                    const truncated = t.title?.length > 30 ? t.title.slice(0, 30) + '…' : t.title;
                    return part === `@${truncated}` || part.startsWith(`@${truncated}`);
                });
                if (matchedTask) {
                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => onTaskClick?.(matchedTask)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-200/60 dark:bg-violet-800/40 text-violet-700 dark:text-violet-300 font-medium hover:bg-violet-300/70 dark:hover:bg-violet-700/60 transition-colors"
                        >
                            <ListChecks className="h-3 w-3" />
                            {part.slice(1)}
                        </button>
                    );
                }
                return (
                    <span key={index} className="text-violet-600 dark:text-violet-400 font-medium">
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

            if (isToday) {
                return format(date, 'HH:mm');
            }
            return format(date, 'MM/dd HH:mm');
        } catch {
            return '';
        }
    };

    return (
        <div className="flex flex-col min-h-[480px]">
            <Card className="flex-1 flex flex-col min-h-0 border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">Төслийн чат</CardTitle>
                            <p className="text-xs text-muted-foreground">
                                Багийн гишүүдтэй харилцах
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 min-h-0 overflow-hidden p-0 flex flex-col">
                    <ScrollArea ref={scrollRef} className="h-[400px] pr-4 shrink-0">
                        <div className="p-4 pt-0">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                                                    "flex gap-3",
                                                    isCurrentUser && "flex-row-reverse"
                                                )}
                                            >
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarImage src={sender?.photoURL} />
                                                    <AvatarFallback className="text-xs bg-violet-100 text-violet-600">
                                                        {sender?.firstName?.[0]}{sender?.lastName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className={cn(
                                                    "max-w-[70%]",
                                                    isCurrentUser && "text-right"
                                                )}>
                                                    <div className={cn(
                                                        "flex items-center gap-2 mb-1",
                                                        isCurrentUser && "flex-row-reverse"
                                                    )}>
                                                        <span className="text-sm font-medium">
                                                            {sender ? `${sender.firstName} ${sender.lastName?.[0]}.` : 'Хэрэглэгч'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatTime(msg.createdAt)}
                                                        </span>
                                                    </div>
                                                    <div className={cn(
                                                        "inline-block px-3 py-2 rounded-2xl text-sm",
                                                        isCurrentUser
                                                            ? "bg-violet-600 text-white rounded-tr-sm"
                                                            : "bg-slate-100 dark:bg-slate-800 rounded-tl-sm"
                                                    )}>
                                                        {formatMessageContent(msg.content, msg.taskMentions)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Мессеж байхгүй байна
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Багийн гишүүдтэй харилцаж эхлээрэй
                                    </p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={() => {
                                    const newMessage = message + '@';
                                    setMessage(newMessage);
                                    setMentionOpen(true);
                                    inputRef.current?.focus();
                                }}
                            >
                                <AtSign className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-[260px] p-2"
                            align="start"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                        >
                            <div className="space-y-2">
                                {filteredMembers.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2">
                                            Гишүүн
                                        </p>
                                        {filteredMembers.map((member) => (
                                            <button
                                                key={member.id}
                                                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                                onClick={() => handleMentionSelect(member)}
                                            >
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={member.photoURL} />
                                                    <AvatarFallback className="text-xs">
                                                        {member.firstName?.[0]}{member.lastName?.[0]}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm truncate">
                                                    {member.firstName} {member.lastName}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {filteredTasks.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 pt-1">
                                            Таск
                                        </p>
                                        {filteredTasks.map((task) => (
                                            <button
                                                key={task.id}
                                                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                                                onClick={() => handleTaskMentionSelect(task)}
                                            >
                                                <div className="h-6 w-6 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                                                    <ListChecks className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                                                </div>
                                                <span className="text-sm truncate">{task.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {filteredMembers.length === 0 && filteredTasks.length === 0 && (
                                    <p className="text-sm text-muted-foreground px-2 py-2">
                                        Олдсонгүй
                                    </p>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Input
                        ref={inputRef}
                        value={message}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Мессеж бичих... (@ — гишүүн/таск дурдах)"
                        className="flex-1"
                        disabled={isSending}
                    />

                    <Button
                        size="icon"
                        className="h-9 w-9 shrink-0 bg-violet-600 hover:bg-violet-700"
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

                {(mentions.length > 0 || taskMentions.length > 0) && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {mentions.length > 0 && (
                            <span className="flex items-center gap-1">
                                <AtSign className="h-3 w-3" />
                                {mentions.length} хүн
                            </span>
                        )}
                        {taskMentions.length > 0 && (
                            <span className="flex items-center gap-1">
                                <ListChecks className="h-3 w-3" />
                                {taskMentions.length} таск
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
