'use client';

import * as React from 'react';
import { collection, serverTimestamp, Timestamp } from 'firebase/firestore';
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
import {
    KAM_LIST,
    TUMEN_TASK_PRIORITIES,
    TUMEN_TASK_TYPES,
    type Company,
    type TumenTaskPriority,
    type TumenTaskType,
} from '../_types';
import { logAudit } from '../_lib/crm-actions';
import { useKamScope } from '../_lib/use-kam-scope';

const NONE = 'none';

/** "YYYY-MM-DD" → локал Date (TZ гажилтгүй). */
function dateFromInput(value: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 9, 0, 0);
}

interface NewTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companies: Company[];
}

export function NewTaskDialog({ open, onOpenChange, companies }: NewTaskDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { kamName, actor } = useKamScope();
    const [isSaving, setIsSaving] = React.useState(false);

    const [title, setTitle] = React.useState('');
    const [taskType, setTaskType] = React.useState<TumenTaskType>('дуудлага');
    const [priority, setPriority] = React.useState<TumenTaskPriority>('дунд');
    const [dueDate, setDueDate] = React.useState('');
    const [companyId, setCompanyId] = React.useState('');
    const [kam, setKam] = React.useState<string>(kamName ?? NONE);

    // KAM хэрэглэгч нэвтэрсэн бол өөрийн нэрээр урьдчилан тавина.
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
        setTitle('');
        setTaskType('дуудлага');
        setPriority('дунд');
        setDueDate('');
        setCompanyId('');
        setKam(kamName ?? NONE);
    }, [kamName]);

    const handleSubmit = React.useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore) return;
            const trimmed = title.trim();
            if (!trimmed) {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Гарчиг заавал бөглөнө үү.',
                });
                return;
            }
            setIsSaving(true);
            try {
                const due = dueDate ? dateFromInput(dueDate) : null;
                addDocumentNonBlocking(collection(firestore, 'crm_activities'), {
                    type: 'task',
                    title: trimmed,
                    taskType,
                    priority,
                    dueAt: due ? Timestamp.fromDate(due) : null,
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
                    `Даалгавар үүсгэв: ${trimmed}`,
                );
                toast({ title: 'Амжилттай', description: 'Шинэ даалгавар нэмэгдлээ.' });
                reset();
                onOpenChange(false);
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, title, taskType, priority, dueDate, companyId, kam, actor, toast, reset, onOpenChange],
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
                    <DialogTitle>Шинэ даалгавар</DialogTitle>
                    <DialogDescription>
                        Дуудлага · уулзалт · үнийн санал · гэрээ · дагах — төрөл, чухалчлал,
                        хугацаагаар.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="task-title" className="text-xs">
                            Гарчиг *
                        </Label>
                        <Input
                            id="task-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="ж: Үнийн санал дагах"
                            disabled={isSaving}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Төрөл</Label>
                            <Select
                                value={taskType}
                                onValueChange={(v) => setTaskType(v as TumenTaskType)}
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TUMEN_TASK_TYPES.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Чухалчлал</Label>
                            <Select
                                value={priority}
                                onValueChange={(v) => setPriority(v as TumenTaskPriority)}
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TUMEN_TASK_PRIORITIES.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="task-due" className="text-xs">
                                Хугацаа
                            </Label>
                            <Input
                                id="task-due"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                disabled={isSaving}
                            />
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
                            {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}+ Нэмэх
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
