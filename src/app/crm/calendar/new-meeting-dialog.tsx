'use client';

import * as React from 'react';
import { collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { addDocumentNonBlocking, useFirebase } from '@/firebase';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { KAM_LIST, type Company } from '../_types';
import { logAudit } from '../_lib/crm-actions';
import { useKamScope } from '../_lib/use-kam-scope';

const NONE = 'none';

type MeetingKind = 'уулзалт' | 'дуудлага';

/** "YYYY-MM-DD" + "HH:mm" → локал Date (TZ гажилтгүй). */
function composeDate(dateStr: string, timeStr: string): Date | null {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!d) return null;
    const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
    const hh = t ? Number(t[1]) : 10;
    const mm = t ? Number(t[2]) : 0;
    return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), hh, mm, 0);
}

interface NewMeetingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companies: Company[];
}

export function NewMeetingDialog({ open, onOpenChange, companies }: NewMeetingDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { kamName, actor } = useKamScope();
    const [isSaving, setIsSaving] = React.useState(false);

    const [meetingKind, setMeetingKind] = React.useState<MeetingKind>('уулзалт');
    const [dateStr, setDateStr] = React.useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [timeStr, setTimeStr] = React.useState('10:00');
    const [companyId, setCompanyId] = React.useState('');
    const [note, setNote] = React.useState('');
    const [kam, setKam] = React.useState<string>(kamName ?? NONE);

    React.useEffect(() => {
        if (open) setKam(kamName ?? NONE);
    }, [open, kamName]);

    const companyOptions = React.useMemo(
        () => [
            { value: NONE, label: '— Компанигүй —' },
            ...[...companies]
                .sort((a, b) => a.name.localeCompare(b.name, 'mn-MN'))
                .map((c) => ({ value: c.id, label: c.name })),
        ],
        [companies],
    );

    const reset = React.useCallback(() => {
        setMeetingKind('уулзалт');
        setDateStr(format(new Date(), 'yyyy-MM-dd'));
        setTimeStr('10:00');
        setCompanyId('');
        setNote('');
        setKam(kamName ?? NONE);
    }, [kamName]);

    const handleSubmit = React.useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore) return;
            const due = composeDate(dateStr, timeStr);
            if (!due) {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Огноо заавал сонгоно уу.',
                });
                return;
            }
            setIsSaving(true);
            try {
                const trimmedNote = note.trim();
                addDocumentNonBlocking(collection(firestore, 'crm_activities'), {
                    type: 'meeting',
                    meetingKind,
                    body: trimmedNote || null,
                    dueAt: Timestamp.fromDate(due),
                    companyIds: companyId && companyId !== NONE ? [companyId] : [],
                    dealIds: [],
                    contactIds: [],
                    ticketIds: [],
                    kam: kam && kam !== NONE ? kam : null,
                    ownerId: actor.uid ?? null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                logAudit(
                    firestore,
                    actor,
                    'create',
                    'crm_activities',
                    undefined,
                    `${meetingKind === 'дуудлага' ? 'Дуудлага' : 'Уулзалт'} товлов: ${format(due, 'yyyy-MM-dd HH:mm')}${trimmedNote ? ` — ${trimmedNote}` : ''}`,
                );
                toast({
                    title: 'Амжилттай',
                    description:
                        meetingKind === 'дуудлага' ? 'Дуудлага товлогдлоо.' : 'Уулзалт товлогдлоо.',
                });
                reset();
                onOpenChange(false);
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, dateStr, timeStr, note, meetingKind, companyId, kam, actor, toast, reset, onOpenChange],
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                if (!o) reset();
                onOpenChange(o);
            }}
        >
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Уулзалт / Дуудлага товлох</DialogTitle>
                    <DialogDescription>
                        Товлосон уулзалт, дуудлага календарь дээр харагдана.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Төрөл</Label>
                            <Select
                                value={meetingKind}
                                onValueChange={(v) => setMeetingKind(v as MeetingKind)}
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="уулзалт">🤝 Уулзалт</SelectItem>
                                    <SelectItem value="дуудлага">📞 Дуудлага</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">KAM</Label>
                            <Select
                                value={kam}
                                onValueChange={setKam}
                                disabled={isSaving || !!kamName}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NONE}>— Оноогоогүй —</SelectItem>
                                    {KAM_LIST.map((k) => (
                                        <SelectItem key={k} value={k}>
                                            {k}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="meeting-date" className="text-xs">
                                Огноо *
                            </Label>
                            <Input
                                id="meeting-date"
                                type="date"
                                value={dateStr}
                                onChange={(e) => setDateStr(e.target.value)}
                                disabled={isSaving}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="meeting-time" className="text-xs">
                                Цаг
                            </Label>
                            <Input
                                id="meeting-time"
                                type="time"
                                value={timeStr}
                                onChange={(e) => setTimeStr(e.target.value)}
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Компани</Label>
                        <SearchableSelect
                            options={companyOptions}
                            value={companyId}
                            onValueChange={setCompanyId}
                            placeholder="Компани сонгох..."
                            disabled={isSaving}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="meeting-note" className="text-xs">
                            Тэмдэглэл
                        </Label>
                        <Input
                            id="meeting-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="ж: Гэрээний нөхцөл ярилцах"
                            disabled={isSaving}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Болих
                        </Button>
                        <Button
                            type="submit"
                            className="bg-cyan-600 hover:bg-cyan-600/90"
                            disabled={isSaving}
                        >
                            {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}+ Товлох
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
