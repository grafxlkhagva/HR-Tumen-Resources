'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    where,
} from 'firebase/firestore';
import {
    addDocumentNonBlocking,
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    Briefcase,
    Building2,
    Calendar,
    FileText,
    Globe,
    Loader2,
    Phone,
    Plus,
    Smile,
    Trash2,
    Truck,
    Users,
} from 'lucide-react';
import type {
    Company,
    CompanyStats,
    Contact,
    CrmOrder,
    Deal,
    FunnelStage,
    Survey,
    Ticket,
} from '../../_types';
import type { Employee } from '@/types';
import {
    COMPANY_SOURCES,
    DEFAULT_PIPELINE,
    FUNNEL_STAGES,
    FUNNEL_STAGE_COLORS,
    FUNNEL_STAGE_LABELS,
    KAM_LIST,
    LOST_REASONS,
    NPS_ZONE_LABELS,
    SEGMENTS,
    formatMoney,
    getStage,
    npsZone,
} from '../../_types';
import { moveCompanyStage, logAudit } from '../../_lib/crm-actions';
import { formatM, normName, npsIndex, TONE_TEXT } from '../../_lib/stats';
import { useKamScope } from '../../_lib/use-kam-scope';
import { LifecycleBadge } from '../../_components/lifecycle-badge';
import { ActivityTimeline } from '../../_components/activity-timeline';
import { TicketsCard } from '../../_components/tickets-card';

const ALL_FUNNEL_STAGES: FunnelStage[] = [...FUNNEL_STAGES, 'lost'];

/** funnelStage байхгүй/танигдахгүй бол lead гэж үзнэ. */
function normStage(stage?: string): FunnelStage {
    return ALL_FUNNEL_STAGES.includes(stage as FunnelStage)
        ? (stage as FunnelStage)
        : 'lead';
}

function shortStageLabel(s: FunnelStage): string {
    const full = FUNNEL_STAGE_LABELS[s];
    return full.split(' · ')[1] ?? full;
}

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
    const { actor } = useKamScope();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const [isLostOpen, setIsLostOpen] = React.useState(false);

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

    const handleMoveStage = React.useCallback(
        async (newStage: FunnelStage, lostReason?: string) => {
            if (!firestore || !company) return;
            try {
                const res = await moveCompanyStage(
                    firestore,
                    actor,
                    company,
                    newStage,
                    lostReason,
                );
                if (res.ok) {
                    toast({
                        title: 'Амжилттай',
                        description: `Шат: ${shortStageLabel(newStage)}`,
                    });
                    setIsLostOpen(false);
                } else {
                    toast({
                        variant: 'destructive',
                        title: 'Алдаа',
                        description: res.error || 'Шат солиход алдаа гарлаа.',
                    });
                }
            } catch {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Шат солиход алдаа гарлаа.',
                });
            }
        },
        [firestore, company, actor, toast],
    );

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
                        <div className="flex items-center gap-2 min-w-0">
                            <h1 className="text-base font-semibold truncate">
                                {company.name}
                            </h1>
                            <span
                                title={FUNNEL_STAGE_LABELS[normStage(company.funnelStage)]}
                                className={cn(
                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0',
                                    FUNNEL_STAGE_COLORS[normStage(company.funnelStage)],
                                )}
                            >
                                {shortStageLabel(normStage(company.funnelStage))}
                            </span>
                        </div>
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

            {/* Funnel шатны stepper — lost руу шилжихэд шалтгаан заавал */}
            <div className="border-b px-6 py-3 bg-muted/20 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-fit">
                    {ALL_FUNNEL_STAGES.map((s) => {
                        const isActive = s === normStage(company.funnelStage);
                        return (
                            <button
                                key={s}
                                type="button"
                                title={FUNNEL_STAGE_LABELS[s]}
                                onClick={() => {
                                    if (isActive) return;
                                    if (s === 'lost') setIsLostOpen(true);
                                    else handleMoveStage(s);
                                }}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap',
                                    isActive
                                        ? FUNNEL_STAGE_COLORS[s]
                                        : 'bg-background text-muted-foreground hover:border-cyan-300 hover:text-foreground',
                                    s === 'lost' && !isActive && 'hover:border-rose-300',
                                )}
                            >
                                {shortStageLabel(s)}
                            </button>
                        );
                    })}
                </div>
            </div>

            <LostReasonDialog
                open={isLostOpen}
                onOpenChange={setIsLostOpen}
                onSubmit={(reason) => handleMoveStage('lost', reason)}
            />

            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-6">
                    <aside className="lg:col-span-3 space-y-4">
                        <PropertiesCard
                            company={company}
                            employeeMap={employeeMap}
                            onChange={update}
                        />
                        <QualificationCard company={company} onChange={update} />
                    </aside>

                    <section className="lg:col-span-6">
                        <Tabs defaultValue="activity" className="w-full">
                            <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-10 p-0 overflow-x-auto">
                                <TabsTrigger value="activity" className="rounded-none">
                                    Үйл ажиллагаа
                                </TabsTrigger>
                                <TabsTrigger value="notes" className="rounded-none">
                                    Тэмдэглэл
                                </TabsTrigger>
                                <TabsTrigger value="ships" className="rounded-none">
                                    Тээвэр
                                </TabsTrigger>
                                <TabsTrigger value="nps" className="rounded-none">
                                    NPS
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
                            <TabsContent value="ships" className="mt-4">
                                <ShipmentsTab companyName={company.name} />
                            </TabsContent>
                            <TabsContent value="nps" className="mt-4">
                                <NpsTab
                                    companyId={company.id}
                                    companyName={company.name}
                                    actor={actor}
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

            <div className="space-y-1.5 pt-2 border-t">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Сегмент
                </Label>
                <select
                    className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                    value={company.segment || ''}
                    onChange={(e) => onChange({ segment: e.target.value || undefined })}
                >
                    <option value="">—</option>
                    {SEGMENTS.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    KAM
                </Label>
                <select
                    className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                    value={company.kam || ''}
                    onChange={(e) => onChange({ kam: e.target.value || undefined })}
                >
                    <option value="">— оноогдоогүй —</option>
                    {KAM_LIST.map((k) => (
                        <option key={k} value={k}>
                            {k}
                        </option>
                    ))}
                </select>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Эх сурвалж
                </Label>
                <select
                    className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                    value={company.source || ''}
                    onChange={(e) => onChange({ source: e.target.value || undefined })}
                >
                    <option value="">—</option>
                    {Object.entries(COMPANY_SOURCES).map(([k, label]) => (
                        <option key={k} value={k}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <EditableField
                label="Регистр"
                value={company.registerNo}
                onSave={(v) => onChange({ registerNo: v || undefined })}
            />
            <EditableField
                label="Тариф / гэрээ"
                value={company.tariff}
                onSave={(v) => onChange({ tariff: v || undefined })}
            />

            {company.lostReason && (
                <div className="space-y-1">
                    <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Алдсан шалтгаан
                    </Label>
                    <div className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                        {company.lostReason}
                    </div>
                </div>
            )}

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

// ─────────────────────────────────────── Шалгуур (BANT)

function QualificationCard({
    company,
    onChange,
}: {
    company: Company;
    onChange: (patch: Partial<Company>) => void;
}) {
    return (
        <div className="rounded-xl border bg-card p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Шалгуур
            </h3>
            <EditableField
                label="Чиглэл"
                value={company.qRoute}
                onSave={(v) => onChange({ qRoute: v || undefined })}
            />
            <EditableField
                label="Ачааны төрөл"
                value={company.qCargo}
                onSave={(v) => onChange({ qCargo: v || undefined })}
            />
            <EditableField
                label="Хэмжээ / Давтамж"
                value={company.qVolume}
                onSave={(v) => onChange({ qVolume: v || undefined })}
            />
            <EditableField
                label="Хугацаа"
                value={company.qTiming}
                onSave={(v) => onChange({ qTiming: v || undefined })}
            />
        </div>
    );
}

// ─────────────────────────────────────── Алдсан шалтгааны dialog

function LostReasonDialog({
    open,
    onOpenChange,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (reason: string) => void;
}) {
    const [reason, setReason] = React.useState(LOST_REASONS[0]);
    const [note, setNote] = React.useState('');

    React.useEffect(() => {
        if (open) {
            setReason(LOST_REASONS[0]);
            setNote('');
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>✗ Алдсан шалтгаан</DialogTitle>
                    <DialogDescription>
                        Алдсан руу шилжүүлэхэд шалтгаан заавал бөглөнө.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Шалтгаан</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LOST_REASONS.map((r) => (
                                    <SelectItem key={r} value={r}>
                                        {r}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="lost-note" className="text-xs">
                            Тайлбар (заавал биш)
                        </Label>
                        <Input
                            id="lost-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Дэлгэрэнгүй..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Болих
                    </Button>
                    <Button
                        className="bg-rose-600 hover:bg-rose-700"
                        onClick={() => {
                            const full = note.trim()
                                ? `${reason} — ${note.trim()}`
                                : reason;
                            onSubmit(full);
                        }}
                    >
                        ✗ Алдсан болгох
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────── Тээвэр (Sheets orders + агрегат)

function ymLabel(ym: number): string {
    const y = Math.floor(ym / 100);
    const m = ym % 100;
    return `${y}-${String(m).padStart(2, '0')}`;
}

function fmtT(v: number): string {
    return `₮${Math.round(v).toLocaleString('en-US')}`;
}

function ShipmentsTab({ companyName }: { companyName: string }) {
    const { firestore } = useFirebase();
    const [orders, setOrders] = React.useState<CrmOrder[] | null>(null);
    const [stats, setStats] = React.useState<CompanyStats | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!firestore || !companyName) return;
        let cancelled = false;
        const key = normName(companyName);
        (async () => {
            try {
                const col = collection(firestore, 'crm_orders');
                let snap;
                try {
                    snap = await getDocs(
                        query(
                            col,
                            where('companyKey', '==', key),
                            orderBy('ym', 'desc'),
                            limit(50),
                        ),
                    );
                } catch {
                    // Composite index байхгүй бол: эрэмбэгүй татаад клиент дээр эрэмбэлнэ
                    snap = await getDocs(
                        query(col, where('companyKey', '==', key), limit(200)),
                    );
                }
                const rows = snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }) as CrmOrder)
                    .sort((a, b) => (b.ym || 0) - (a.ym || 0))
                    .slice(0, 50);

                const statsSnap = await getDocs(
                    query(
                        collection(firestore, 'crm_company_stats'),
                        where('companyKey', '==', key),
                        limit(1),
                    ),
                );
                if (cancelled) return;
                setOrders(rows);
                setStats(
                    statsSnap.empty
                        ? null
                        : ({
                              id: statsSnap.docs[0].id,
                              ...statsSnap.docs[0].data(),
                          } as CompanyStats),
                );
            } catch {
                if (!cancelled) setOrders([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [firestore, companyName]);

    if (loading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    const curYear = String(new Date().getFullYear());
    const cur = stats?.years?.[curYear];
    const monthly = cur?.monthlyRevenue ?? [];
    const maxMonthly = Math.max(0, ...monthly);
    const yearKeys = stats ? Object.keys(stats.years).sort().reverse() : [];

    return (
        <div className="space-y-4">
            {stats && (
                <div className="rounded-xl border bg-card p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Truck className="h-4 w-4 text-cyan-600" />
                        Борлуулалтын дүн (Sheets)
                    </div>

                    {yearKeys.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-[11px] uppercase text-muted-foreground text-left">
                                        <th className="py-1.5 pr-3 font-medium">Жил</th>
                                        <th className="py-1.5 pr-3 font-medium text-right">
                                            Борлуулалт
                                        </th>
                                        <th className="py-1.5 pr-3 font-medium text-right">
                                            Ашиг
                                        </th>
                                        <th className="py-1.5 font-medium text-right">Рейс</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yearKeys.map((y) => {
                                        const row = stats.years[y];
                                        return (
                                            <tr key={y} className="border-t">
                                                <td className="py-1.5 pr-3 font-medium">
                                                    {y}
                                                </td>
                                                <td className="py-1.5 pr-3 text-right tabular-nums">
                                                    {formatM(row.revenue)}
                                                </td>
                                                <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                                                    {formatM(row.profit)}
                                                </td>
                                                <td className="py-1.5 text-right tabular-nums">
                                                    {row.trips}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {monthly.length > 0 && maxMonthly > 0 && (
                        <div>
                            <div className="flex gap-1">
                                {Array.from({ length: 12 }).map((_, i) => {
                                    const v = monthly[i] || 0;
                                    const intensity =
                                        v > 0 ? 0.15 + 0.85 * (v / maxMonthly) : 0;
                                    return (
                                        <div
                                            key={i}
                                            title={`${i + 1}-р сар: ${formatM(v)}`}
                                            className="h-6 flex-1 rounded border"
                                            style={{
                                                backgroundColor:
                                                    v > 0
                                                        ? `rgba(8, 145, 178, ${intensity})`
                                                        : undefined,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                                1–12-р сар · борлуулалт ({curYear})
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Truck className="h-4 w-4 text-cyan-600" />
                        Дууссан захиалга (Sheets)
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                        Сүүлийн {orders?.length ?? 0}
                    </span>
                </div>
                {!orders || orders.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground">
                        Тээврийн бүртгэл алга.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[11px] uppercase text-muted-foreground text-left">
                                    <th className="px-4 py-2 font-medium">Огноо</th>
                                    <th className="px-2 py-2 font-medium">Шийт</th>
                                    <th className="px-2 py-2 font-medium text-right">
                                        Борлуулалт
                                    </th>
                                    <th className="px-2 py-2 font-medium text-right">Ашиг</th>
                                    <th className="px-4 py-2 font-medium">INV</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((o) => (
                                    <tr key={o.id} className="border-t hover:bg-muted/30">
                                        <td className="px-4 py-1.5 tabular-nums whitespace-nowrap">
                                            {ymLabel(o.ym)}
                                        </td>
                                        <td className="px-2 py-1.5">{o.sheet || '—'}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                                            {fmtT(o.revenue)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                            {fmtT(o.profit)}
                                        </td>
                                        <td className="px-4 py-1.5 text-muted-foreground">
                                            {o.invNo || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────── NPS

const NPS_ZONE_CLASS: Record<string, string> = {
    promoter: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    passive: 'bg-amber-100 text-amber-700 border-amber-200',
    detractor: 'bg-rose-100 text-rose-700 border-rose-200',
};

function NpsTab({
    companyId,
    companyName,
    actor,
}: {
    companyId: string;
    companyName: string;
    actor: { uid?: string; name?: string; kam?: string | null };
}) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [score, setScore] = React.useState('');
    const [note, setNote] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const surveysQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, 'crm_surveys'),
                      where('companyId', '==', companyId),
                  )
                : null,
        [firestore, companyId],
    );
    const { data: surveys, isLoading } = useCollection<Survey>(surveysQuery);

    const sorted = React.useMemo(
        () =>
            [...(surveys || [])].sort((a, b) => {
                const ta = (a.createdAt as unknown as { seconds?: number } | undefined)?.seconds || 0;
                const tb = (b.createdAt as unknown as { seconds?: number } | undefined)?.seconds || 0;
                return tb - ta;
            }),
        [surveys],
    );

    const index = npsIndex(sorted.map((s) => s.score));
    const indexTone = index === null ? null : index >= 30 ? 'good' : index >= 0 ? 'warn' : 'bad';

    const handleAdd = React.useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore) return;
            const n = Number(score);
            if (score.trim() === '' || isNaN(n) || n < 0 || n > 10) {
                toast({
                    variant: 'destructive',
                    title: 'Алдаа',
                    description: 'Оноо 0–10 хооронд байх ёстой.',
                });
                return;
            }
            setIsSaving(true);
            try {
                addDocumentNonBlocking(collection(firestore, 'crm_surveys'), {
                    companyId,
                    companyName,
                    score: n,
                    zone: npsZone(n),
                    note: note.trim() || null,
                    ownerId: actor.uid || null,
                    createdAt: serverTimestamp(),
                });
                logAudit(
                    firestore,
                    actor,
                    'create',
                    'crm_surveys',
                    undefined,
                    `${companyName}: NPS ${n}`,
                );
                toast({ title: 'Амжилттай', description: 'Үнэлгээ нэмэгдлээ.' });
                setScore('');
                setNote('');
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, score, note, companyId, companyName, actor, toast],
    );

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Smile className="h-4 w-4 text-cyan-600" />
                        Сэтгэл ханамж (NPS)
                    </div>
                    <div className="text-right">
                        <div
                            className={cn(
                                'text-2xl font-bold tabular-nums',
                                indexTone ? TONE_TEXT[indexTone] : 'text-muted-foreground',
                            )}
                        >
                            {index === null ? '—' : index}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            NPS индекс · {sorted.length} үнэлгээ
                        </div>
                    </div>
                </div>

                <form onSubmit={handleAdd} className="mt-4 flex items-end gap-2 flex-wrap">
                    <div className="space-y-1">
                        <Label htmlFor="nps-score" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Оноо (0–10)
                        </Label>
                        <Input
                            id="nps-score"
                            type="number"
                            min={0}
                            max={10}
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            className="h-9 w-24"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="space-y-1 flex-1 min-w-[160px]">
                        <Label htmlFor="nps-note" className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Тэмдэглэл
                        </Label>
                        <Input
                            id="nps-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Тайлбар..."
                            className="h-9"
                            disabled={isSaving}
                        />
                    </div>
                    <Button
                        type="submit"
                        size="sm"
                        className="h-9 bg-cyan-600 hover:bg-cyan-600/90"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4 mr-1" />
                        )}
                        Нэмэх
                    </Button>
                </form>
            </div>

            <div className="rounded-xl border bg-card">
                {isLoading ? (
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : sorted.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground">Үнэлгээ алга.</p>
                ) : (
                    <div className="divide-y">
                        {sorted.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                                <span className="text-lg font-bold tabular-nums w-8 text-center shrink-0">
                                    {s.score}
                                </span>
                                <span
                                    className={cn(
                                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0',
                                        NPS_ZONE_CLASS[s.zone] || 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {NPS_ZONE_LABELS[s.zone] ?? s.zone}
                                </span>
                                <span className="flex-1 text-sm text-muted-foreground truncate">
                                    {s.note || ''}
                                </span>
                                <span className="text-[11px] text-muted-foreground shrink-0">
                                    {formatDate(
                                        s.createdAt as unknown as { seconds: number } | null,
                                    )}
                                </span>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                            aria-label="Үнэлгээ устгах"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Үнэлгээ устгах уу?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                NPS {s.score} оноотой энэ үнэлгээг бүрмөсөн устгана.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Болих</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                onClick={() => {
                                                    if (!firestore) return;
                                                    deleteDocumentNonBlocking(
                                                        doc(firestore, 'crm_surveys', s.id),
                                                    );
                                                    logAudit(
                                                        firestore,
                                                        actor,
                                                        'delete',
                                                        'crm_surveys',
                                                        s.id,
                                                        `${companyName}: NPS ${s.score} устгав`,
                                                    );
                                                    toast({
                                                        title: 'Амжилттай',
                                                        description: 'Үнэлгээ устгагдлаа.',
                                                    });
                                                }}
                                            >
                                                Устгах
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
