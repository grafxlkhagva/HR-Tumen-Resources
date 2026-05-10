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
    FileText,
    Globe,
    Phone,
    Trash2,
    Users,
} from 'lucide-react';
import type { Company, Contact, Deal, Ticket } from '../../_types';
import type { Employee } from '@/types';
import { DEFAULT_PIPELINE, formatMoney, getStage } from '../../_types';
import { LifecycleBadge } from '../../_components/lifecycle-badge';
import { ActivityTimeline } from '../../_components/activity-timeline';
import { TicketsCard } from '../../_components/tickets-card';

function fullContactName(c: Contact) {
    const parts = [c.lastName, c.firstName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : c.email || '—';
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

export default function CompanyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const companyRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, 'crm_companies', id) : null),
        [firestore, id],
    );
    const { data: company, isLoading } = useDoc<Company>(companyRef);

    const contactsQuery = useMemoFirebase(
        () =>
            firestore && id
                ? query(collection(firestore, 'crm_contacts'), where('companyId', '==', id))
                : null,
        [firestore, id],
    );
    const { data: linkedContacts } = useCollection<Contact>(contactsQuery);

    const dealsQuery = useMemoFirebase(
        () =>
            firestore && id
                ? query(collection(firestore, 'crm_deals'), where('companyId', '==', id))
                : null,
        [firestore, id],
    );
    const { data: linkedDeals } = useCollection<Deal>(dealsQuery);

    const ticketsQuery = useMemoFirebase(
        () =>
            firestore && id
                ? query(collection(firestore, 'crm_tickets'), where('companyId', '==', id))
                : null,
        [firestore, id],
    );
    const { data: linkedTickets } = useCollection<Ticket>(ticketsQuery);

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

    const update = React.useCallback(
        (patch: Partial<Company>) => {
            if (!companyRef) return;
            updateDocumentNonBlocking(companyRef, {
                ...patch,
                updatedAt: serverTimestamp(),
            });
        },
        [companyRef],
    );

    const handleDelete = React.useCallback(() => {
        if (!companyRef) return;
        deleteDocumentNonBlocking(companyRef);
        toast({ title: 'Устгагдлаа', description: 'Байгууллагыг устгалаа.' });
        router.push('/crm/companies');
    }, [companyRef, toast, router]);

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

    if (!company) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Building2 className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Байгууллага олдсонгүй</h2>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/crm/companies">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between gap-3 border-b px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon-sm" asChild>
                        <Link href="/crm/companies">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-semibold truncate">{company.name}</h1>
                        {company.domain && (
                            <div className="text-[11px] text-muted-foreground truncate">
                                {company.domain}
                            </div>
                        )}
                    </div>
                </div>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700">
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Устгах
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Байгууллага устгах уу?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Энэ үйлдэл буцаагдахгүй. {company.name}-ийн мэдээлэл устгагдана. Холбогдсон харилцагчид үлдэх боловч холбоо нь арилна.
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

            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-6">
                    <aside className="lg:col-span-3 space-y-4">
                        <PropertiesCard
                            company={company}
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
                            </TabsList>

                            <TabsContent value="activity" className="mt-4">
                                <ActivityTimeline
                                    companyId={company.id}
                                    summaryKind="company"
                                    summaryName={company.name}
                                />
                            </TabsContent>
                            <TabsContent value="notes" className="mt-4">
                                <NotesEditor
                                    initial={company.notes || ''}
                                    onSave={(notes) => update({ notes })}
                                />
                            </TabsContent>
                        </Tabs>
                    </section>

                    <aside className="lg:col-span-3 space-y-4">
                        <ContactsCard contacts={linkedContacts || []} />
                        <DealsCard deals={linkedDeals || []} />
                        <TicketsCard tickets={linkedTickets || []} />
                    </aside>
                </div>
            </div>
        </div>
    );
}

function PropertiesCard({
    company,
    employeeMap,
    onChange,
}: {
    company: Company;
    employeeMap: Map<string, string>;
    onChange: (patch: Partial<Company>) => void;
}) {
    return (
        <div className="rounded-xl border bg-card p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Шинж чанар
            </h3>

            <EditableField
                label="Нэр"
                value={company.name}
                onSave={(v) => onChange({ name: v || company.name })}
            />
            <EditableField
                label="Domain"
                value={company.domain}
                onSave={(v) => onChange({ domain: v ? v.toLowerCase() : undefined })}
                icon={<Globe className="h-3.5 w-3.5" />}
            />
            <EditableField
                label="Вэбсайт"
                value={company.website}
                onSave={(v) => onChange({ website: v || undefined })}
            />
            <EditableField
                label="Салбар"
                value={company.industry}
                onSave={(v) => onChange({ industry: v || undefined })}
            />
            <EditableField
                label="Утас"
                value={company.phone}
                onSave={(v) => onChange({ phone: v || undefined })}
                icon={<Phone className="h-3.5 w-3.5" />}
            />
            <EditableField
                label="Хот"
                value={company.city}
                onSave={(v) => onChange({ city: v || undefined })}
            />
            <EditableField
                label="Хаяг"
                value={company.address}
                onSave={(v) => onChange({ address: v || undefined })}
            />

            <div className="space-y-1 pt-2 border-t">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Эзэмшигч
                </Label>
                <div className="text-sm">
                    {company.ownerId ? employeeMap.get(company.ownerId) || '—' : '—'}
                </div>
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Үүсгэсэн
                </Label>
                <div className="text-sm inline-flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(
                        company.createdAt as unknown as { seconds: number } | null,
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
    icon,
}: {
    label: string;
    value?: string;
    onSave: (v: string) => void;
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

function DealsCard({ deals }: { deals: Deal[] }) {
    return (
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
    );
}

function ContactsCard({ contacts }: { contacts: Contact[] }) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Харилцагчид
                </h3>
                <span className="text-[11px] text-muted-foreground">{contacts.length}</span>
            </div>
            {contacts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    Холбогдсон харилцагч байхгүй байна.
                </p>
            ) : (
                <div className="space-y-2">
                    {contacts.map((c) => (
                        <Link
                            key={c.id}
                            href={`/crm/contacts/${c.id}`}
                            className="flex items-center gap-2.5 p-2 -mx-2 rounded-lg hover:bg-muted transition-colors"
                        >
                            <Avatar className="h-7 w-7 rounded-full">
                                <AvatarFallback className="text-[10px] bg-cyan-100 text-cyan-700">
                                    {contactInitials(c)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">
                                    {fullContactName(c)}
                                </div>
                                {c.email && (
                                    <div className="text-[11px] text-muted-foreground truncate">
                                        {c.email}
                                    </div>
                                )}
                            </div>
                            <LifecycleBadge stage={c.lifecycleStage} />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
