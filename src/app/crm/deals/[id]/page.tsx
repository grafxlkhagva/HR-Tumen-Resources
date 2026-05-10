'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, query, serverTimestamp, where } from 'firebase/firestore';
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
    Trash2,
    FileText,
} from 'lucide-react';
import {
    DEFAULT_CURRENCY,
    DEFAULT_PIPELINE,
    formatMoney,
    getStage,
    type Company,
    type Contact,
    type Deal,
    type Quote,
    type Ticket,
} from '../../_types';
import type { Employee } from '@/types';
import { ActivityTimeline } from '../../_components/activity-timeline';
import { TicketsCard } from '../../_components/tickets-card';
import { QuotesCard } from '../../_components/quotes-card';

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

export default function DealDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const dealRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, 'crm_deals', id) : null),
        [firestore, id],
    );
    const { data: deal, isLoading } = useDoc<Deal>(dealRef);

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

    const employeesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'employees') : null),
        [firestore],
    );
    const { data: employees } = useCollection<Employee>(employeesRef);

    const ticketsQuery = useMemoFirebase(
        () =>
            firestore && id
                ? query(collection(firestore, 'crm_tickets'), where('dealId', '==', id))
                : null,
        [firestore, id],
    );
    const { data: linkedTickets } = useCollection<Ticket>(ticketsQuery);

    const quotesQuery = useMemoFirebase(
        () =>
            firestore && id
                ? query(collection(firestore, 'crm_quotes'), where('dealId', '==', id))
                : null,
        [firestore, id],
    );
    const { data: linkedQuotes } = useCollection<Quote>(quotesQuery);

    const employeeMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (employees || []).forEach((e) => {
            const name = [e.lastName, e.firstName].filter(Boolean).join(' ').trim();
            map.set(e.id, name || e.email || e.id);
        });
        return map;
    }, [employees]);

    const linkedContact = React.useMemo(
        () => (contacts || []).find((c) => c.id === deal?.contactId),
        [contacts, deal?.contactId],
    );
    const linkedCompany = React.useMemo(
        () => (companies || []).find((c) => c.id === deal?.companyId),
        [companies, deal?.companyId],
    );

    const update = React.useCallback(
        (patch: Partial<Deal>) => {
            if (!dealRef) return;
            const next: Record<string, unknown> = {
                ...patch,
                updatedAt: serverTimestamp(),
            };
            if (patch.stageId) {
                const stage = getStage(DEFAULT_PIPELINE, patch.stageId);
                if (stage?.outcome) {
                    next.closedAt = serverTimestamp();
                } else {
                    next.closedAt = null;
                }
            }
            updateDocumentNonBlocking(dealRef, next);
        },
        [dealRef],
    );

    const handleDelete = React.useCallback(() => {
        if (!dealRef) return;
        deleteDocumentNonBlocking(dealRef);
        toast({ title: 'Устгагдлаа', description: 'Гэрээг устгалаа.' });
        router.push('/crm/deals');
    }, [dealRef, toast, router]);

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

    if (!deal) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Briefcase className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Гэрээ олдсонгүй</h2>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/crm/deals">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        );
    }

    const stage = getStage(DEFAULT_PIPELINE, deal.stageId);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between gap-3 border-b px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon-sm" asChild>
                        <Link href="/crm/deals">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                        <Briefcase className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-semibold truncate">{deal.name}</h1>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span
                                className="inline-flex items-center gap-1"
                                style={{ color: stage?.color }}
                            >
                                <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: stage?.color }}
                                />
                                {stage?.label}
                            </span>
                            <span>·</span>
                            <span className="font-medium text-foreground tabular-nums">
                                {formatMoney(deal.amount, deal.currency)}
                            </span>
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
                            <AlertDialogTitle>Гэрээ устгах уу?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Энэ үйлдэл буцаагдахгүй. {deal.name}-ийг устгана.
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

            {/* Stage stepper */}
            <div className="border-b px-6 py-3 bg-muted/20 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-fit">
                    {DEFAULT_PIPELINE.stages.map((s) => {
                        const isActive = s.id === deal.stageId;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                    if (!isActive) update({ stageId: s.id });
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
                            deal={deal}
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
                                <TabsTrigger value="notes" className="rounded-none">
                                    Тэмдэглэл
                                </TabsTrigger>
                                <TabsTrigger value="quotes" className="rounded-none" disabled>
                                    Үнийн санал
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="activity" className="mt-4">
                                <ActivityTimeline
                                    dealId={deal.id}
                                    summaryKind="deal"
                                    summaryName={deal.name}
                                />
                            </TabsContent>
                            <TabsContent value="notes" className="mt-4">
                                <NotesEditor
                                    initial={deal.notes || ''}
                                    onSave={(notes) => update({ notes })}
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

                        {!linkedContact && !linkedCompany && (
                            <div className="rounded-xl border bg-card p-4">
                                <p className="text-xs text-muted-foreground">
                                    Холбогдсон харилцагч эсвэл байгууллага байхгүй. Зүүн талаас сонгож холбоно уу.
                                </p>
                            </div>
                        )}

                        <QuotesCard quotes={linkedQuotes || []} />
                        <TicketsCard tickets={linkedTickets || []} />
                    </aside>
                </div>
            </div>
        </div>
    );
}

function PropertiesCard({
    deal,
    contacts,
    companies,
    employeeMap,
    onChange,
}: {
    deal: Deal;
    contacts: Contact[];
    companies: Company[];
    employeeMap: Map<string, string>;
    onChange: (patch: Partial<Deal>) => void;
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
                label="Нэр"
                value={deal.name}
                onSave={(v) => onChange({ name: v || deal.name })}
            />

            <div className="grid grid-cols-2 gap-2">
                <EditableField
                    label="Дүн"
                    value={deal.amount?.toString()}
                    onSave={(v) => {
                        const cleaned = v.replace(/[^\d.-]/g, '');
                        const n = cleaned ? Number(cleaned) : null;
                        if (n === null || isNaN(n)) onChange({ amount: undefined });
                        else onChange({ amount: n });
                    }}
                />
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Валют
                    </Label>
                    <select
                        className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                        value={deal.currency || DEFAULT_CURRENCY}
                        onChange={(e) => onChange({ currency: e.target.value })}
                    >
                        {['MNT', 'USD', 'EUR', 'CNY', 'RUB'].map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <EditableField
                label="Хаах огноо"
                value={deal.closeDate}
                type="date"
                onSave={(v) => onChange({ closeDate: v || undefined })}
                icon={<Calendar className="h-3.5 w-3.5" />}
            />

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Холбогдох харилцагч
                </Label>
                <SearchableSelect
                    options={contactOptions}
                    value={deal.contactId || ''}
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
                    value={deal.companyId || ''}
                    onValueChange={(v) => onChange({ companyId: v || undefined })}
                    placeholder="— Сонгох —"
                />
            </div>

            <div className="space-y-1 pt-2 border-t">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Эзэмшигч
                </Label>
                <div className="text-sm">
                    {deal.ownerId ? employeeMap.get(deal.ownerId) || '—' : '—'}
                </div>
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Үүсгэсэн
                </Label>
                <div className="text-sm inline-flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(
                        deal.createdAt as unknown as { seconds: number } | null,
                    )}
                </div>
            </div>

            {deal.closedAt && (
                <div className="space-y-1">
                    <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Хаасан
                    </Label>
                    <div className="text-sm inline-flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(
                            deal.closedAt as unknown as { seconds: number } | null,
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function EditableField({
    label,
    value,
    onSave,
    type = 'text',
    icon,
}: {
    label: string;
    value?: string;
    onSave: (v: string) => void;
    type?: string;
    icon?: React.ReactNode;
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
                    type={type}
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
                    {icon}
                    <span className={value ? '' : 'text-muted-foreground/50 italic'}>
                        {value || 'Хоосон'}
                    </span>
                </button>
            )}
        </div>
    );
}

function NotesEditor({
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
                    Тэмдэглэл
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
                placeholder="Тэмдэглэл бичих..."
                className="border-0 resize-none min-h-[200px] focus-visible:ring-0 rounded-none"
            />
        </div>
    );
}
