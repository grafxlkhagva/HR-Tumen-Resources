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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    Mail,
    Phone,
    Send,
    Trash2,
    User,
    FileText,
} from 'lucide-react';
import type { Contact, Company, Deal, Ticket } from '../../_types';
import { DEFAULT_PIPELINE, formatMoney, getStage } from '../../_types';
import { ActivityTimeline } from '../../_components/activity-timeline';
import { TicketsCard } from '../../_components/tickets-card';
import { SendEmailDialog } from '../../_components/send-email-dialog';
import {
    LEAD_STATUSES,
    LEAD_STATUS_LABELS,
    LIFECYCLE_STAGES,
    LIFECYCLE_STAGE_LABELS,
    type LeadStatus,
    type LifecycleStage,
} from '../../_types';
import { LifecycleBadge } from '../../_components/lifecycle-badge';
import type { Employee } from '@/types';

function fullName(c: Contact) {
    const parts = [c.lastName, c.firstName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : c.email || '—';
}

function initials(c: Contact) {
    const f = (c.firstName || '').charAt(0);
    const l = (c.lastName || '').charAt(0);
    if (f || l) return `${l}${f}`.toUpperCase();
    return (c.email || '?').charAt(0).toUpperCase();
}

function formatDate(ts?: { seconds: number } | null) {
    if (!ts || !ts.seconds) return '—';
    return new Date(ts.seconds * 1000).toLocaleDateString('mn-MN');
}

export default function ContactDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const contactRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, 'crm_contacts', id) : null),
        [firestore, id],
    );
    const { data: contact, isLoading } = useDoc<Contact>(contactRef);

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

    const dealsQuery = useMemoFirebase(
        () =>
            firestore && id
                ? query(collection(firestore, 'crm_deals'), where('contactId', '==', id))
                : null,
        [firestore, id],
    );
    const { data: linkedDeals } = useCollection<Deal>(dealsQuery);

    const ticketsQuery = useMemoFirebase(
        () =>
            firestore && id
                ? query(collection(firestore, 'crm_tickets'), where('contactId', '==', id))
                : null,
        [firestore, id],
    );
    const { data: linkedTickets } = useCollection<Ticket>(ticketsQuery);

    const employeeMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (employees || []).forEach((e) => {
            const name = [e.lastName, e.firstName].filter(Boolean).join(' ').trim();
            map.set(e.id, name || e.email || e.id);
        });
        return map;
    }, [employees]);

    const company = React.useMemo(
        () => (companies || []).find((c) => c.id === contact?.companyId),
        [companies, contact?.companyId],
    );

    const update = React.useCallback(
        (patch: Partial<Contact>) => {
            if (!contactRef) return;
            updateDocumentNonBlocking(contactRef, {
                ...patch,
                updatedAt: serverTimestamp(),
            });
        },
        [contactRef],
    );

    const handleDelete = React.useCallback(() => {
        if (!contactRef) return;
        deleteDocumentNonBlocking(contactRef);
        toast({ title: 'Устгагдлаа', description: 'Харилцагчийг устгалаа.' });
        router.push('/crm/contacts');
    }, [contactRef, toast, router]);

    const [isSendOpen, setIsSendOpen] = React.useState(false);

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

    if (!contact) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                    <User className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Харилцагч олдсонгүй</h2>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/crm/contacts">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between gap-3 border-b px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon-sm" asChild>
                        <Link href="/crm/contacts">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <Avatar className="h-9 w-9 rounded-full">
                        <AvatarFallback className="text-xs bg-cyan-100 text-cyan-700">
                            {initials(contact)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-semibold truncate">
                                {fullName(contact)}
                            </h1>
                            <LifecycleBadge stage={contact.lifecycleStage} />
                        </div>
                        {contact.jobTitle && (
                            <div className="text-[11px] text-muted-foreground truncate">
                                {contact.jobTitle}
                                {company ? ` · ${company.name}` : ''}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {contact.email && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsSendOpen(true)}
                        >
                            <Send className="h-4 w-4 mr-1.5" />
                            Имэйл
                        </Button>
                    )}
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700">
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Устгах
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Харилцагч устгах уу?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Энэ үйлдэл буцаагдахгүй. {fullName(contact)}-ийн бүх мэдээлэл устгагдана.
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
                </div>
            </header>

            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-6">
                    {/* LEFT: Properties */}
                    <aside className="lg:col-span-3 space-y-4">
                        <PropertiesCard
                            contact={contact}
                            companies={companies || []}
                            employeeMap={employeeMap}
                            onChange={update}
                        />
                    </aside>

                    {/* CENTER: Activity tabs */}
                    <section className="lg:col-span-6">
                        <Tabs defaultValue="activity" className="w-full">
                            <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-10 p-0">
                                <TabsTrigger value="activity" className="rounded-none">
                                    Үйл ажиллагаа
                                </TabsTrigger>
                                <TabsTrigger value="notes" className="rounded-none">
                                    Тэмдэглэл
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="activity" className="mt-4">
                                <ActivityTimeline
                                    contactId={contact.id}
                                    summaryKind="contact"
                                    summaryName={fullName(contact)}
                                />
                            </TabsContent>
                            <TabsContent value="notes" className="mt-4">
                                <NotesEditor
                                    initial={contact.notes || ''}
                                    onSave={(notes) => update({ notes })}
                                />
                            </TabsContent>
                        </Tabs>
                    </section>

                    {/* RIGHT: Associations */}
                    <aside className="lg:col-span-3 space-y-4">
                        <AssociationsCard
                            contact={contact}
                            company={company}
                            deals={linkedDeals || []}
                        />
                        <TicketsCard tickets={linkedTickets || []} />
                    </aside>
                </div>
            </div>

            <SendEmailDialog
                open={isSendOpen}
                onOpenChange={setIsSendOpen}
                contact={contact}
                company={company}
            />
        </div>
    );
}

function PropertiesCard({
    contact,
    companies,
    employeeMap,
    onChange,
}: {
    contact: Contact;
    companies: Company[];
    employeeMap: Map<string, string>;
    onChange: (patch: Partial<Contact>) => void;
}) {
    const companyOptions = React.useMemo(
        () => [
            { value: '', label: '— Холбоогүй —' },
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
                label="Овог"
                value={contact.lastName}
                onSave={(v) => onChange({ lastName: v || undefined })}
            />
            <EditableField
                label="Нэр"
                value={contact.firstName}
                onSave={(v) => onChange({ firstName: v || undefined })}
            />
            <EditableField
                label="Имэйл"
                value={contact.email}
                onSave={(v) => onChange({ email: v ? v.toLowerCase() : undefined })}
                type="email"
                icon={<Mail className="h-3.5 w-3.5" />}
            />
            <EditableField
                label="Утас"
                value={contact.phone}
                onSave={(v) => onChange({ phone: v || undefined })}
                icon={<Phone className="h-3.5 w-3.5" />}
            />
            <EditableField
                label="Албан тушаал"
                value={contact.jobTitle}
                onSave={(v) => onChange({ jobTitle: v || undefined })}
            />

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Байгууллага
                </Label>
                <SearchableSelect
                    options={companyOptions}
                    value={contact.companyId || ''}
                    onValueChange={(v) =>
                        onChange({ companyId: v || undefined })
                    }
                    placeholder="— Холбоогүй —"
                />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Lifecycle stage
                </Label>
                <Select
                    value={contact.lifecycleStage || 'lead'}
                    onValueChange={(v) =>
                        onChange({ lifecycleStage: v as LifecycleStage })
                    }
                >
                    <SelectTrigger className="h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LIFECYCLE_STAGES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {LIFECYCLE_STAGE_LABELS[s]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Лидийн статус
                </Label>
                <Select
                    value={contact.leadStatus || 'new'}
                    onValueChange={(v) =>
                        onChange({ leadStatus: v as LeadStatus })
                    }
                >
                    <SelectTrigger className="h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {LEAD_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {LEAD_STATUS_LABELS[s]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1 pt-2 border-t">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Эзэмшигч
                </Label>
                <div className="text-sm">
                    {contact.ownerId ? employeeMap.get(contact.ownerId) || '—' : '—'}
                </div>
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Үүсгэсэн
                </Label>
                <div className="text-sm inline-flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(
                        contact.createdAt as unknown as { seconds: number } | null,
                    )}
                </div>
            </div>
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

function AssociationsCard({
    contact,
    company,
    deals,
}: {
    contact: Contact;
    company?: Company;
    deals: Deal[];
}) {
    return (
        <>
            <div className="rounded-xl border bg-card p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Холбогдсон байгууллага
                </h3>
                {company ? (
                    <Link
                        href={`/crm/companies/${company.id}`}
                        className="flex items-start gap-3 p-2 -m-2 rounded-lg hover:bg-muted transition-colors"
                    >
                        <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{company.name}</div>
                            {company.domain && (
                                <div className="text-[11px] text-muted-foreground truncate">
                                    {company.domain}
                                </div>
                            )}
                        </div>
                    </Link>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Байгууллагатай холбогдоогүй. Зүүн талаас сонгож холбоно уу.
                    </p>
                )}
            </div>

            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        Гэрээ
                    </h3>
                    <span className="text-[11px] text-muted-foreground">{deals.length}</span>
                </div>
                {deals.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Холбогдсон гэрээ байхгүй.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {deals.map((d) => {
                            const stage = getStage(DEFAULT_PIPELINE, d.stageId);
                            return (
                                <Link
                                    key={d.id}
                                    href={`/crm/deals/${d.id}`}
                                    className="block p-2 -mx-2 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <div className="text-sm font-medium truncate">{d.name}</div>
                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                        <span
                                            className="text-[11px] inline-flex items-center gap-1"
                                            style={{ color: stage?.color }}
                                        >
                                            <span
                                                className="inline-block h-1.5 w-1.5 rounded-full"
                                                style={{ backgroundColor: stage?.color }}
                                            />
                                            {stage?.label}
                                        </span>
                                        <span className="text-[11px] tabular-nums font-medium text-foreground">
                                            {formatMoney(d.amount, d.currency)}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
