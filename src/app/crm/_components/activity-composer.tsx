'use client';

import * as React from 'react';
import { collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, useFirebase, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    StickyNote,
    Phone,
    Mail,
    Calendar,
    CheckSquare,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ACTIVITY_TYPE_COLORS,
    CALL_OUTCOMES,
    CALL_OUTCOME_LABELS,
    type ActivityType,
    type CallOutcome,
    type EmailDirection,
} from '../_types';

const TYPE_TABS: { value: ActivityType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'note', label: 'Тэмдэглэл', icon: StickyNote },
    { value: 'call', label: 'Дуудлага', icon: Phone },
    { value: 'email', label: 'Имэйл', icon: Mail },
    { value: 'meeting', label: 'Уулзалт', icon: Calendar },
    { value: 'task', label: 'Даалгавар', icon: CheckSquare },
];

interface ActivityComposerProps {
    /** Тухайн detail хуудсаас үүсгэхэд auto-link хийнэ. */
    contactId?: string;
    companyId?: string;
    dealId?: string;
    ticketId?: string;
    onCreated?: () => void;
}

function toTimestampFromDateTimeLocal(value: string): Timestamp | null {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return Timestamp.fromDate(d);
}

export function ActivityComposer({
    contactId,
    companyId,
    dealId,
    ticketId,
    onCreated,
}: ActivityComposerProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = React.useState<ActivityType>('note');
    const [isSaving, setIsSaving] = React.useState(false);

    // Common fields
    const [body, setBody] = React.useState('');

    // Call-specific
    const [callOutcome, setCallOutcome] = React.useState<CallOutcome>('connected');
    const [callDuration, setCallDuration] = React.useState('');

    // Email-specific
    const [emailSubject, setEmailSubject] = React.useState('');
    const [emailDirection, setEmailDirection] = React.useState<EmailDirection>('outbound');

    // Meeting-specific
    const [meetingLocation, setMeetingLocation] = React.useState('');
    const [meetingDuration, setMeetingDuration] = React.useState('');
    const [meetingDueAt, setMeetingDueAt] = React.useState('');

    // Task-specific
    const [taskTitle, setTaskTitle] = React.useState('');
    const [taskDueAt, setTaskDueAt] = React.useState('');

    const reset = React.useCallback(() => {
        setBody('');
        setCallOutcome('connected');
        setCallDuration('');
        setEmailSubject('');
        setEmailDirection('outbound');
        setMeetingLocation('');
        setMeetingDuration('');
        setMeetingDueAt('');
        setTaskTitle('');
        setTaskDueAt('');
    }, []);

    const canSubmit = React.useMemo(() => {
        if (activeTab === 'task') return taskTitle.trim().length > 0;
        if (activeTab === 'email') return body.trim().length > 0 || emailSubject.trim().length > 0;
        return body.trim().length > 0;
    }, [activeTab, body, taskTitle, emailSubject]);

    const handleSubmit = React.useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore || !canSubmit) return;

            setIsSaving(true);
            try {
                const ref = collection(firestore, 'crm_activities');
                const base: Record<string, unknown> = {
                    type: activeTab,
                    body: body.trim() || null,
                    ownerId: user?.uid || null,
                    contactIds: contactId ? [contactId] : [],
                    companyIds: companyId ? [companyId] : [],
                    dealIds: dealId ? [dealId] : [],
                    ticketIds: ticketId ? [ticketId] : [],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };

                if (activeTab === 'call') {
                    base.callOutcome = callOutcome;
                    if (callDuration) {
                        const n = Number(callDuration);
                        if (!isNaN(n)) base.durationMinutes = n;
                    }
                } else if (activeTab === 'email') {
                    base.emailSubject = emailSubject.trim() || null;
                    base.emailDirection = emailDirection;
                } else if (activeTab === 'meeting') {
                    base.meetingLocation = meetingLocation.trim() || null;
                    if (meetingDuration) {
                        const n = Number(meetingDuration);
                        if (!isNaN(n)) base.durationMinutes = n;
                    }
                    const ts = toTimestampFromDateTimeLocal(meetingDueAt);
                    if (ts) base.dueAt = ts;
                } else if (activeTab === 'task') {
                    base.title = taskTitle.trim();
                    const ts = toTimestampFromDateTimeLocal(taskDueAt);
                    if (ts) base.dueAt = ts;
                }

                addDocumentNonBlocking(ref, base);
                toast({ title: 'Нэмэгдлээ' });
                reset();
                onCreated?.();
            } finally {
                setIsSaving(false);
            }
        },
        [
            firestore,
            canSubmit,
            activeTab,
            body,
            user,
            contactId,
            companyId,
            dealId,
            ticketId,
            callOutcome,
            callDuration,
            emailSubject,
            emailDirection,
            meetingLocation,
            meetingDuration,
            meetingDueAt,
            taskTitle,
            taskDueAt,
            toast,
            reset,
            onCreated,
        ],
    );

    return (
        <div className="rounded-xl border bg-card">
            {/* Tab bar */}
            <div className="flex items-center gap-0 border-b px-1.5 overflow-x-auto">
                {TYPE_TABS.map(({ value, label, icon: Icon }) => {
                    const isActive = activeTab === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setActiveTab(value)}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px',
                                isActive
                                    ? 'border-current'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                            style={isActive ? { color: ACTIVITY_TYPE_COLORS[value] } : undefined}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </button>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="p-3 space-y-3">
                {activeTab === 'task' && (
                    <Input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Даалгаврын нэр (жишээ: Дараагийн уулзалт төлөвлө)"
                        disabled={isSaving}
                    />
                )}

                {activeTab === 'email' && (
                    <Input
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Имэйлийн гарчиг"
                        disabled={isSaving}
                    />
                )}

                <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={
                        activeTab === 'note'
                            ? 'Тэмдэглэл бичих...'
                            : activeTab === 'call'
                                ? 'Дуудлагын товч агуулга...'
                                : activeTab === 'email'
                                    ? 'Имэйлийн агуулга...'
                                    : activeTab === 'meeting'
                                        ? 'Уулзалтын тэмдэглэл...'
                                        : 'Дэлгэрэнгүй тайлбар...'
                    }
                    className="min-h-[80px] resize-none"
                    disabled={isSaving}
                />

                {activeTab === 'call' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Үр дүн
                            </Label>
                            <Select
                                value={callOutcome}
                                onValueChange={(v) => setCallOutcome(v as CallOutcome)}
                                disabled={isSaving}
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CALL_OUTCOMES.map((o) => (
                                        <SelectItem key={o} value={o}>
                                            {CALL_OUTCOME_LABELS[o]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Үргэлжилсэн (мин)
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                value={callDuration}
                                onChange={(e) => setCallDuration(e.target.value)}
                                placeholder="0"
                                disabled={isSaving}
                                className="h-8"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'email' && (
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Чиглэл
                        </Label>
                        <Select
                            value={emailDirection}
                            onValueChange={(v) => setEmailDirection(v as EmailDirection)}
                            disabled={isSaving}
                        >
                            <SelectTrigger className="h-8 w-fit">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="outbound">Илгээсэн</SelectItem>
                                <SelectItem value="inbound">Хүлээн авсан</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {activeTab === 'meeting' && (
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Цаг
                            </Label>
                            <Input
                                type="datetime-local"
                                value={meetingDueAt}
                                onChange={(e) => setMeetingDueAt(e.target.value)}
                                disabled={isSaving}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Үргэлжлэх (мин)
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                value={meetingDuration}
                                onChange={(e) => setMeetingDuration(e.target.value)}
                                placeholder="30"
                                disabled={isSaving}
                                className="h-8"
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                Байршил / линк
                            </Label>
                            <Input
                                value={meetingLocation}
                                onChange={(e) => setMeetingLocation(e.target.value)}
                                placeholder="Оффис, Google Meet линк..."
                                disabled={isSaving}
                                className="h-8"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'task' && (
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Дуусах огноо
                        </Label>
                        <Input
                            type="datetime-local"
                            value={taskDueAt}
                            onChange={(e) => setTaskDueAt(e.target.value)}
                            disabled={isSaving}
                            className="h-8 w-fit"
                        />
                    </div>
                )}

                <div className="flex justify-end pt-1">
                    <Button
                        type="submit"
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-600/90"
                        disabled={isSaving || !canSubmit}
                    >
                        {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                        Нэмэх
                    </Button>
                </div>
            </form>
        </div>
    );
}
