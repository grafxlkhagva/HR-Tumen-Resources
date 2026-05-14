'use client';

import * as React from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Check, X, MessageSquareText, CalendarDays, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, updateDocumentNonBlocking, useUser } from '@/firebase';
import { useTenantWrite } from '@/hooks/use-tenant-write';
import { doc } from 'firebase/firestore';
import { format } from 'date-fns';
import type {
    TimeOffRequestDoc,
    AttendanceRequestDoc,
} from '../hooks/use-attendance-month-stats';
import {
    REQUEST_STATUS,
    normalizeRequestStatus,
    getRequestStatusLabel,
    type CanonicalRequestStatus,
} from '@/lib/attendance-status';

const STATUS_CLS: Record<CanonicalRequestStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ATT_REQ_LABEL: Record<string, string> = {
    OVERTIME: 'Илүү цаг',
    LATE_ARRIVAL: 'Оройтож ирэх',
    REMOTE_WORK: 'Зайнаас ажиллах',
    CORRECTION: 'Ирц засах',
};

function safeDate(s: string): string {
    if (!s) return '—';
    const d = s.length >= 10 ? s.slice(0, 10) : s;
    try {
        return format(new Date(d + 'T00:00:00'), 'yyyy-MM-dd');
    } catch {
        return s;
    }
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employeeId: string | null;
    employeeName: string;
    timeOffRequests: TimeOffRequestDoc[];
    attendanceRequests: AttendanceRequestDoc[];
}

export function EmployeeRequestsSheet({
    open,
    onOpenChange,
    employeeId,
    employeeName,
    timeOffRequests,
    attendanceRequests,
}: Props) {
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { companyPath } = useTenantWrite();
    const { user } = useUser();

    const [rejectTarget, setRejectTarget] = React.useState<
        { kind: 'timeOff' | 'attendance'; id: string } | null
    >(null);
    const [rejectNote, setRejectNote] = React.useState('');

    React.useEffect(() => {
        if (!open) {
            setRejectTarget(null);
            setRejectNote('');
        }
    }, [open]);

    const updateRequest = (
        kind: 'timeOff' | 'attendance',
        requestId: string,
        status: typeof REQUEST_STATUS.APPROVED | typeof REQUEST_STATUS.REJECTED,
        note?: string,
    ) => {
        if (!firestore || !employeeId) return;
        const sub = kind === 'timeOff' ? 'timeOffRequests' : 'attendanceRequests';
        const ref = doc(firestore, `employees/${employeeId}/${sub}`, requestId);
        const payload: Record<string, any> = {
            status,
            decidedAt: new Date().toISOString(),
            decidedBy: user?.uid || null,
        };
        if (note) payload.decisionNote = note;
        updateDocumentNonBlocking(ref, payload);
        toast({
            title: status === REQUEST_STATUS.APPROVED ? 'Хүсэлт зөвшөөрөгдлөө' : 'Хүсэлт татгалзагдлаа',
        });
    };

    const handleConfirmReject = () => {
        if (!rejectTarget) return;
        updateRequest(rejectTarget.kind, rejectTarget.id, REQUEST_STATUS.REJECTED, rejectNote.trim() || undefined);
        setRejectTarget(null);
        setRejectNote('');
    };

    // Pending хүсэлтийг дээр харуулах sort
    const isPending = (s?: string) => normalizeRequestStatus(s) === REQUEST_STATUS.PENDING;
    const sortedTimeOff = React.useMemo(() => {
        return [...timeOffRequests].sort((a, b) => {
            const ap = isPending(a.status) ? 0 : 1;
            const bp = isPending(b.status) ? 0 : 1;
            if (ap !== bp) return ap - bp;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
    }, [timeOffRequests]);

    const sortedAttReq = React.useMemo(() => {
        return [...attendanceRequests].sort((a, b) => {
            const ap = isPending(a.status) ? 0 : 1;
            const bp = isPending(b.status) ? 0 : 1;
            if (ap !== bp) return ap - bp;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
    }, [attendanceRequests]);

    const pendingCount =
        sortedTimeOff.filter(r => isPending(r.status)).length +
        sortedAttReq.filter(r => isPending(r.status)).length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-[480px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        {employeeName}
                        {pendingCount > 0 && (
                            <Badge className="bg-yellow-500 text-white">{pendingCount} хүлээгдэж буй</Badge>
                        )}
                    </SheetTitle>
                    <SheetDescription>
                        Энэ ажилтны чөлөө болон ирцийн хүсэлтийг шууд шийдвэрлэнэ.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    <Section
                        icon={<CalendarDays className="h-4 w-4" />}
                        title="Чөлөөний хүсэлт"
                        emptyText="Чөлөөний хүсэлт байхгүй."
                    >
                        {sortedTimeOff.map(req => (
                            <RequestCard
                                key={req.id}
                                title={req.type || 'Чөлөө'}
                                dateRange={`${safeDate(req.startDate)} – ${safeDate(req.endDate)}`}
                                reason={req.reason}
                                status={req.status}
                                decisionNote={req.decisionNote}
                                isRejecting={rejectTarget?.kind === 'timeOff' && rejectTarget.id === req.id}
                                rejectNote={rejectNote}
                                onRejectNoteChange={setRejectNote}
                                onApprove={() => updateRequest('timeOff', req.id, REQUEST_STATUS.APPROVED)}
                                onStartReject={() => setRejectTarget({ kind: 'timeOff', id: req.id })}
                                onCancelReject={() => { setRejectTarget(null); setRejectNote(''); }}
                                onConfirmReject={handleConfirmReject}
                            />
                        ))}
                    </Section>

                    <Separator />

                    <Section
                        icon={<Clock className="h-4 w-4" />}
                        title="Ирцийн хүсэлт"
                        emptyText="Ирцийн хүсэлт байхгүй."
                    >
                        {sortedAttReq.map(req => {
                            const typeLabel = ATT_REQ_LABEL[req.type ?? ''] || req.type || 'Ирц';
                            return (
                                <RequestCard
                                    key={req.id}
                                    title={typeLabel}
                                    dateRange={
                                        req.startTime || req.endTime
                                            ? `${safeDate(req.startDate)} ${req.startTime ?? ''}${req.endTime ? ' – ' + req.endTime : ''}`
                                            : `${safeDate(req.startDate)} – ${safeDate(req.endDate)}`
                                    }
                                    reason={req.reason}
                                    status={req.status}
                                    decisionNote={req.decisionNote}
                                    isRejecting={rejectTarget?.kind === 'attendance' && rejectTarget.id === req.id}
                                    rejectNote={rejectNote}
                                    onRejectNoteChange={setRejectNote}
                                    onApprove={() => updateRequest('attendance', req.id, REQUEST_STATUS.APPROVED)}
                                    onStartReject={() => setRejectTarget({ kind: 'attendance', id: req.id })}
                                    onCancelReject={() => { setRejectTarget(null); setRejectNote(''); }}
                                    onConfirmReject={handleConfirmReject}
                                />
                            );
                        })}
                    </Section>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function Section({
    icon, title, children, emptyText,
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    emptyText: string;
}) {
    const arr = React.Children.toArray(children);
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h4 className="text-sm font-semibold">{title}</h4>
                <span className="text-xs text-muted-foreground">({arr.length})</span>
            </div>
            {arr.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{emptyText}</p>
            ) : (
                <div className="space-y-2">{children}</div>
            )}
        </div>
    );
}

function RequestCard({
    title, dateRange, reason, status, decisionNote,
    isRejecting, rejectNote, onRejectNoteChange,
    onApprove, onStartReject, onCancelReject, onConfirmReject,
}: {
    title: string;
    dateRange: string;
    reason?: string;
    status: string;
    decisionNote?: string;
    isRejecting: boolean;
    rejectNote: string;
    onRejectNoteChange: (s: string) => void;
    onApprove: () => void;
    onStartReject: () => void;
    onCancelReject: () => void;
    onConfirmReject: () => void;
}) {
    const canonical = normalizeRequestStatus(status);
    const isPending = canonical === REQUEST_STATUS.PENDING;
    const statusCls = STATUS_CLS[canonical] || 'bg-slate-100 text-slate-700 border-slate-200';
    const statusLabel = getRequestStatusLabel(status);

    return (
        <div className="rounded-md border bg-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{title}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{dateRange}</div>
                </div>
                <Badge variant="outline" className={statusCls}>{statusLabel}</Badge>
            </div>
            {reason && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 flex gap-1.5">
                    <MessageSquareText className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{reason}</span>
                </div>
            )}
            {decisionNote && !isPending && (
                <div className="text-xs text-muted-foreground italic">Тэмдэглэл: {decisionNote}</div>
            )}
            {isPending && (
                isRejecting ? (
                    <div className="space-y-2">
                        <Textarea
                            placeholder="Татгалзах шалтгаан (заавал биш)"
                            value={rejectNote}
                            onChange={(e) => onRejectNoteChange(e.target.value)}
                            rows={2}
                            className="text-xs"
                        />
                        <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="ghost" onClick={onCancelReject}>Буцах</Button>
                            <Button size="sm" variant="destructive" onClick={onConfirmReject}>
                                <X className="h-3.5 w-3.5 mr-1" /> Татгалзах
                            </Button>
                        </div>
                    </div>
                ) : (
                    <TooltipProvider>
                        <div className="flex justify-end gap-1.5">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline" onClick={onStartReject}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Татгалзах</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={onApprove}>
                                        <Check className="h-3.5 w-3.5 mr-1" /> Зөвшөөрөх
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Хүсэлтийг зөвшөөрөх</TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                )
            )}
        </div>
    );
}
