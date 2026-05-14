'use client';

/**
 * ActivityFeed
 * ─────────────────────────────────────────────────────────────────────
 * ER баримтын Активити feed — коммент + approval/reject урсгал.
 * `[id]/page.tsx`-аас Phase 3.1 extraction үед тусдаа компонент болгов.
 *
 * Энэ нь:
 *  - `er_documents/{id}/activity` subcollection-д `onSnapshot` (real-time)
 *  - Коммент илгээх inline input
 *  - Approve/Reject товчууд (comment тусгах)
 *  - FinalApprove товч (REVIEWED төлөвт)
 *
 * Parent component-оос stable callback reference-үүд дамждаг (React.memo equality).
 */

import * as React from 'react';
import { useEffect, useState } from 'react';
import { onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useFirebase, useTenantWrite } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Loader2,
    Send,
    Check,
    CheckCircle2,
    XCircle,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types';
import { ProcessActivity } from '../../types';
import { formatDateTime } from '../../utils';

export interface ActivityFeedProps {
    documentId: string;
    employeesList: Employee[] | null | undefined;
    isApprover?: boolean;
    isAdmin?: boolean;
    canApprove?: boolean;
    onApprove?: (comment?: string) => Promise<void>;
    onReject?: (comment: string) => Promise<void>;
    canFinalApprove?: boolean;
    onFinalApprove?: () => Promise<void>;
}

export const ActivityFeed = React.memo(function ActivityFeed({
    documentId,
    employeesList,
    canApprove,
    onApprove,
    onReject,
    canFinalApprove,
    onFinalApprove,
}: ActivityFeedProps) {
    const { firestore, user: currentUser } = useFirebase();
    const { tCollection } = useTenantWrite();
    const [activities, setActivities] = useState<ProcessActivity[]>([]);
    const [commentText, setCommentText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!firestore) return;
        const q = query(
            tCollection('er_documents', documentId, 'activity'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            const acts: ProcessActivity[] = [];
            snap.forEach((d) => acts.push({ id: d.id, ...d.data() } as ProcessActivity));
            setActivities(acts);
        });
        return () => unsubscribe();
    }, [firestore, documentId, tCollection]);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activities]);

    const handleSendComment = async () => {
        if (!commentText.trim() || !firestore || !currentUser) return;
        setIsSending(true);
        try {
            await (await import('firebase/firestore')).addDoc(
                tCollection('er_documents', documentId, 'activity'),
                {
                    type: 'COMMENT',
                    actorId: currentUser.uid,
                    content: commentText,
                    createdAt: Timestamp.now(),
                }
            );
            setCommentText('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsSending(false);
        }
    };

    const handleApproveWithComment = async () => {
        if (!canApprove || !onApprove) return;
        if (isApproving) return;
        setIsApproving(true);
        try {
            const c = commentText.trim();
            await onApprove(c ? c : undefined);
            setCommentText('');
        } finally {
            setIsApproving(false);
        }
    };

    const handleRejectWithComment = async () => {
        if (!canApprove || !onReject) return;
        if (isRejecting) return;
        const c = commentText.trim();
        if (!c) return; // toast handle-лэгдэнэ handler-ын дотор
        setIsRejecting(true);
        try {
            await onReject(c);
            setCommentText('');
        } finally {
            setIsRejecting(false);
        }
    };

    const getUserInfo = (uid: string) => {
        const u = employeesList?.find((e) => e.id === uid);
        return {
            name: u ? `${u.firstName} ${u.lastName}` : 'Хэрэглэгч',
            avatar: u?.photoURL,
            initial: u?.firstName?.charAt(0) || '?',
        };
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {activities.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                        Түүх байхгүй
                    </div>
                )}
                {activities.map((act) => {
                    const user = getUserInfo(act.actorId);
                    const isMe = act.actorId === currentUser?.uid;
                    const isSys = act.type === 'STATUS_CHANGE';
                    const isApprove = act.type === 'APPROVE';
                    const isReject = act.type === 'REJECT';

                    if (isSys) {
                        return (
                            <div key={act.id} className="flex justify-center my-1">
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {act.content}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div key={act.id} className={cn('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                            <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="text-[10px] bg-slate-100">{user.initial}</AvatarFallback>
                            </Avatar>
                            <div
                                className={cn(
                                    'max-w-[80%] rounded-xl px-3 py-2 text-xs',
                                    isMe ? 'bg-primary/10 text-slate-800' : 'bg-slate-100 text-slate-700',
                                    isApprove && 'bg-emerald-50 text-emerald-800',
                                    isReject && 'bg-rose-50 text-rose-800'
                                )}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="font-medium">{user.name}</span>
                                    <span className="text-[9px] opacity-50">{formatDateTime(act.createdAt)}</span>
                                </div>
                                {isApprove && (
                                    <div className="flex items-center gap-1 font-medium text-[11px] mb-0.5">
                                        <CheckCircle2 className="h-3 w-3" /> Батлав
                                    </div>
                                )}
                                {isReject && (
                                    <div className="flex items-center gap-1 font-medium text-[11px] mb-0.5">
                                        <AlertCircle className="h-3 w-3" /> Буцаав
                                    </div>
                                )}
                                <p className="whitespace-pre-wrap">{act.content}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t shrink-0">
                <div className="flex gap-2">
                    <Input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Коммент..."
                        className="flex-1 h-8 text-xs"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendComment();
                            }
                        }}
                    />
                    {canApprove && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                onClick={handleRejectWithComment}
                                disabled={isRejecting || isApproving || !commentText.trim()}
                                title={commentText.trim() ? 'Засвар оруулахаар буцаах' : 'Коммент бичиж буцаагаарай'}
                            >
                                {isRejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                                Буцаах
                            </Button>
                            <Button
                                size="sm"
                                className="h-8 bg-emerald-600 hover:bg-emerald-700"
                                onClick={handleApproveWithComment}
                                disabled={isApproving || isRejecting}
                                title="Батлах"
                            >
                                <Check className="h-3.5 w-3.5 mr-1.5" />
                                Батлах
                            </Button>
                        </>
                    )}
                    {canFinalApprove && (
                        <Button
                            size="icon"
                            className="h-8 w-8 bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => onFinalApprove?.()}
                            title="Эцэслэн батлах"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleSendComment}
                        disabled={!commentText.trim() || isSending || isApproving || isRejecting}
                    >
                        {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
});
