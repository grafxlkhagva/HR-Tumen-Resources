'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import {
    deleteDocumentNonBlocking,
    updateDocumentNonBlocking,
    useCollection,
    useDoc,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft,
    Briefcase,
    Building2,
    Calendar,
    LifeBuoy,
    Trash2,
    FileText,
} from 'lucide-react';
import {
    TICKET_PRIORITIES,
    TICKET_PRIORITY_LABELS,
    TICKET_SOURCES,
    TICKET_SOURCE_LABELS,
    TICKET_STATUSES,
    getTicketStatus,
    type Company,
    type Contact,
    type Deal,
    type Ticket,
    type TicketPriority,
    type TicketSource,
    type TicketStatus,
} from '../../_types';
import type { Employee } from '@/types';
import { ActivityTimeline } from '../../_components/activity-timeline';
import { PriorityBadge } from '../../_components/priority-badge';

function fullContactName(c: Contact): string {
    const parts = [c.lastName, c.firstName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : c.email || c.id;
}

function contactInitials(c: Contact) {
    const f = (c.firstName || '').charAt(0);
    const l = (c.lastName || '').charAt(0);
    if (f || l) return `${l}${f}`.toUpperCase();
    return (c.email || '?').charAt(0).toUpperCase();
}

function formatDate(ts?: { seconds: number } | null) {
    if (!ts || !ts.seconds) return '—';
    return new Date(ts.seconds * 1000).toLocaleDateString('mn-MN');
}

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const ticketRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, 'crm_tickets', id) : null),
        [firestore, id],
    );
    const { data: ticket, isLoading } = useDoc<Ticket>(ticketRef);

    const contactsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_contacts') : null),
        [firestore],
    );
    const { data: contacts } = useCollection<Contact>(contactsRef);

    const companiesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_companies') : null),
        [firestore],
    );
    const { data: companies } = useCollection<Company>(companiesRef);

    const dealsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_deals') : null),
        [firestore],
    );
    const { data: deals } = useCollection<Deal>(dealsRef);

    const employeesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'employees') : null),
        [firestore],
    );
    const { data: employees } = useCollection<Employee>(employeesRef);

    const employeeMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (employees || []).forEach((e) => {
            const name = [e.lastName, e.firstName].filter(Boolean).join(' ').trim();
            map.set(e.id, name || e.email || e.id);
        });
        return map;
    }, [employees]);

    const linkedContact = React.useMemo(
        () => (contacts || []).find((c) => c.id === ticket?.contactId),
        [contacts, ticket?.contactId],
    );
    const linkedCompany = React.useMemo(
        () => (companies || []).find((c) => c.id === ticket?.companyId),
        [companies, ticket?.companyId],
    );
    const linkedDeal = React.useMemo(
        () => (deals || []).find((d) => d.id === ticket?.dealId),
        [deals, ticket?.dealId],
    );

    const update = React.useCallback(
        (patch: Partial<Ticket>) => {
            if (!ticketRef || !ticket) return;
            const next: Record<string, unknown> = {
                ...patch,
                updatedAt: serverTimestamp(),
            };
            if (patch.status) {
                if (patch.status === 'resolved' && !ticket.resolvedAt) {
                    next.resolvedAt = serverTimestamp();
                }
                if (patch.status === 'closed' && !ticket.closedAt) {
                    next.closedAt = serverTimestamp();
                }
                const newStatus = getTicketStatus(patch.status);
                if (newStatus && !newStatus.terminal) {
                    if (ticket.resolvedAt) next.resolvedAt = null;
                    if (ticket.closedAt) next.closedAt = null;
                }
            }
            updateDocumentNonBlocking(ticketRef, next);
        },
        [ticketRef, ticket],
    );

    const handleDelete = React.useCallback(() => {
        if (!ticketRef) return;
        deleteDocumentNonBlocking(ticketRef);
        toast({ title: 'Устгагдлаа', description: 'Тасалбарыг устгалаа.' });
        router.push('/crm/tickets');
    }, [ticketRef, toast, router]);

    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-12 gap-4">
                    <Skeleton className="col-span-3 h-96" />
                    <Skeleton className="col-span-6 h-96" />
                    <Skeleton className="col-span-3 h-96" />
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                    <LifeBuoy className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Тасалбар олдсонгүй</h2>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/crm/tickets">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        );
    }

    const status = getTicketStatus(ticket.status);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between gap-3 border-b px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon-sm" asChild>
                        <Link href="/crm/tickets">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                        <LifeBuoy className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-semibold truncate">
                                {ticket.subject}
                            </h1>
                            <PriorityBadge priority={ticket.priority} />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span
                                className="inline-flex items-center gap-1"
                                style={{ color: status?.color }}
                            >
                                <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: status?.color }}
                                />
                                {status?.label}
                            </span>
                            {ticket.source && (
                                <>
                                    <span>·</span>
                                    <span>{TICKET_SOURCE_LABELS[ticket.source]}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700"
                        >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Устгах
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Тасалбар устгах уу?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Энэ үйлдэл буцаагдахгүй. {ticket.subject}-ийг устгана.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Болих</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-rose-600 hover:bg-rose-700"
                            >
                                Устгах
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </header>

            {/* Status stepper */}
            <div className="border-b px-6 py-3 bg-muted/20 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-fit">
                    {TICKET_STATUSES.map((s) => {
                        const isActive = s.id === ticket.status;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                    if (!isActive) update({ status: s.id });
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors hover:border-cyan-300"
                                style={{
                                    borderColor: isActive ? s.color : undefined,
                                    backgroundColor: isActive ? `${s.color}12` : undefined,
                                    color: isActive ? s.color : undefined,
                                }}
                            >
                                <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: s.color }}
                                />
                                {s.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-6">
                    <aside className="lg:col-span-3 space-y-4">
                        <PropertiesCard
                            ticket={ticket}
                            contacts={contacts || []}
                            companies={companies || []}
                            employeeMap={employeeMap}
                            onChange={update}
                        />
                    </aside>

                    <section className="lg:col-span-6">
                        <Tabs defaultValue="activity" className="w-full">
                            <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-10 p-0">
                                <TabsTrigger value="activity" className="rounded-none">
                                    Үйл ажиллагаа
                                </TabsTrigger>
                                <TabsTrigger value="description" className="rounded-none">
                                    Тайлбар
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="activity" className="mt-4">
                                <ActivityTimeline
                                    ticketId={ticket.id}
                                    summaryKind="ticket"
                                    summaryName={ticket.subject}
                                />
                            </TabsContent>
                            <TabsContent value="description" className="mt-4">
                                <DescriptionEditor
                                    initial={ticket.body || ''}
                                    onSave={(body) => update({ body })}
                                />
                            </TabsContent>
                        </Tabs>
                    </section>

                    <aside className="lg:col-span-3 space-y-4">
                        {linkedContact && (
                            <Link
                                href={`/crm/contacts/${linkedContact.id}`}
                                className="block rounded-xl border bg-card p-4 hover:border-cyan-300 transition-colors"
                            >
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                    Харилцагч
                                </h3>
                                <div className="flex items-center gap-2.5">
                                    <Avatar className="h-9 w-9 rounded-full">
                                        <AvatarFallback className="text-xs bg-cyan-100 text-cyan-700">
                                            {contactInitials(linkedContact)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">
                                            {fullContactName(linkedContact)}
                                        </div>
                                        {linkedContact.email && (
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                {linkedContact.email}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        )}

                        {linkedCompany && (
                            <Link
                                href={`/crm/companies/${linkedCompany.id}`}
                                className="block rounded-xl border bg-card p-4 hover:border-cyan-300 transition-colors"
                            >
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                    Байгууллага
                                </h3>
                                <div className="flex items-center gap-2.5">
                                    <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                                        <Building2 className="h-4 w-4 text-cyan-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">
                                            {linkedCompany.name}
                                        </div>
                                        {linkedCompany.domain && (
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                {linkedCompany.domain}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        )}

                        {linkedDeal && (
                            <Link
                                href={`/crm/deals/${linkedDeal.id}`}
                                className="block rounded-xl border bg-card p-4 hover:border-cyan-300 transition-colors"
                            >
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                    Гэрээ
                                </h3>
                                <div className="flex items-center gap-2.5">
                                    <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                                        <Briefcase className="h-4 w-4 text-cyan-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">
                                            {linkedDeal.name}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}

                        {!linkedContact && !linkedCompany && !linkedDeal && (
                            <div className="rounded-xl border bg-card p-4">
                                <p className="text-xs text-muted-foreground">
                                    Холбогдсон харилцагч / байгууллага / гэрээ байхгүй. Зүүн талаас сонгож холбоно уу.
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}

function PropertiesCard({
    ticket,
    contacts,
    companies,
    employeeMap,
    onChange,
}: {
    ticket: Ticket;
    contacts: Contact[];
    companies: Company[];
    employeeMap: Map<string, string>;
    onChange: (patch: Partial<Ticket>) => void;
}) {
    const contactOptions = React.useMemo(
        () => [
            { value: '', label: '— Сонгоогүй —' },
            ...contacts.map((c) => ({
                value: c.id,
                label: fullContactName(c),
            })),
        ],
        [contacts],
    );

    const companyOptions = React.useMemo(
        () => [
            { value: '', label: '— Сонгоогүй —' },
            ...companies.map((c) => ({ value: c.id, label: c.name })),
        ],
        [companies],
    );

    return (
        <div className="rounded-xl border bg-card p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Шинж чанар
            </h3>

            <EditableField
                label="Гарчиг"
                value={ticket.subject}
                onSave={(v) => onChange({ subject: v || ticket.subject })}
            />

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Чухал зэрэг
                </Label>
                <Select
                    value={ticket.priority}
                    onValueChange={(v) => onChange({ priority: v as TicketPriority })}
                >
                    <SelectTrigger className="h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TICKET_PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>
                                {TICKET_PRIORITY_LABELS[p]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Эх сурвалж
                </Label>
                <Select
                    value={ticket.source || 'manual'}
                    onValueChange={(v) => onChange({ source: v as TicketSource })}
                >
                    <SelectTrigger className="h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TICKET_SOURCES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {TICKET_SOURCE_LABELS[s]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <DueDateField
                value={ticket.dueAt as unknown as { seconds: number } | undefined}
                onChange={(iso) => {
                    if (!iso) {
                        onChange({ dueAt: undefined });
                        return;
                    }
                    const d = new Date(iso);
                    if (isNaN(d.getTime())) return;
                    onChange({ dueAt: Timestamp.fromDate(d) });
                }}
            />

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Холбогдох харилцагч
                </Label>
                <SearchableSelect
                    options={contactOptions}
                    value={ticket.contactId || ''}
                    onValueChange={(v) => onChange({ contactId: v || undefined })}
                    placeholder="— Сонгох —"
                />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Холбогдох байгууллага
                </Label>
                <SearchableSelect
                    options={companyOptions}
                    value={ticket.companyId || ''}
                    onValueChange={(v) => onChange({ companyId: v || undefined })}
                    placeholder="— Сонгох —"
                />
            </div>

            <div className="space-y-1 pt-2 border-t">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Эзэмшигч
                </Label>
                <div className="text-sm">
                    {ticket.ownerId ? employeeMap.get(ticket.ownerId) || '—' : '—'}
                </div>
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Үүсгэсэн
                </Label>
                <div className="text-sm inline-flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(
                        ticket.createdAt as unknown as { seconds: number } | null,
                    )}
                </div>
            </div>

            {ticket.resolvedAt && (
                <div className="space-y-1">
                    <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Шийдэгдсэн
                    </Label>
                    <div className="text-sm inline-flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(
                            ticket.resolvedAt as unknown as { seconds: number } | null,
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function DueDateField({
    value,
    onChange,
}: {
    value?: { seconds: number };
    onChange: (iso: string) => void;
}) {
    const dateValue = value
        ? new Date(value.seconds * 1000).toISOString().slice(0, 10)
        : '';
    return (
        <div className="space-y-1.5">
            <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                SLA дуусах огноо
            </Label>
            <Input
                type="date"
                value={dateValue}
                onChange={(e) => onChange(e.target.value)}
                className="h-8"
            />
        </div>
    );
}

function EditableField({
    label,
    value,
    onSave,
}: {
    label: string;
    value?: string;
    onSave: (v: string) => void;
}) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(value || '');

    React.useEffect(() => {
        if (!editing) setDraft(value || '');
    }, [value, editing]);

    const commit = () => {
        if ((draft || '') !== (value || '')) onSave(draft.trim());
        setEditing(false);
    };

    return (
        <div className="space-y-1.5">
            <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {label}
            </Label>
            {editing ? (
                <Input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') {
                            setDraft(value || '');
                            setEditing(false);
                        }
                    }}
                    className="h-8"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="w-full text-left text-sm rounded-md px-2 py-1.5 -mx-2 hover:bg-muted transition-colors min-h-[32px] inline-flex items-center gap-2"
                >
                    <span className={value ? '' : 'text-muted-foreground/50 italic'}>
                        {value || 'Хоосон'}
                    </span>
                </button>
            )}
        </div>
    );
}

function DescriptionEditor({
    initial,
    onSave,
}: {
    initial: string;
    onSave: (v: string) => void;
}) {
    const [draft, setDraft] = React.useState(initial);
    const [savedFlash, setSavedFlash] = React.useState(false);
    const initialRef = React.useRef(initial);

    React.useEffect(() => {
        initialRef.current = initial;
        setDraft(initial);
    }, [initial]);

    const dirty = draft !== initialRef.current;

    const handleSave = () => {
        onSave(draft);
        initialRef.current = draft;
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
    };

    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-cyan-600" />
                    Тайлбар
                </div>
                <div className="flex items-center gap-2">
                    {savedFlash && (
                        <span className="text-[11px] text-emerald-600">Хадгалагдсан</span>
                    )}
                    <Button
                        size="sm"
                        variant={dirty ? 'default' : 'ghost'}
                        className={dirty ? 'bg-cyan-600 hover:bg-cyan-600/90 h-7' : 'h-7'}
                        disabled={!dirty}
                        onClick={handleSave}
                    >
                        Хадгалах
                    </Button>
                </div>
            </div>
            <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Асуудлын дэлгэрэнгүй..."
                className="border-0 resize-none min-h-[200px] focus-visible:ring-0 rounded-none"
            />
        </div>
    );
}
