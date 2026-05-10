'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import {
    deleteDocumentNonBlocking,
    updateDocumentNonBlocking,
    useCollection,
    useDoc,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
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
    Download,
    FileSpreadsheet,
    Send,
    Trash2,
} from 'lucide-react';
import {
    DEFAULT_CURRENCY,
    QUOTE_STATUSES,
    computeQuoteTotals,
    formatMoney,
    getQuoteStatus,
    type Company,
    type Contact,
    type Deal,
    type Product,
    type Quote,
    type QuoteLineItem,
    type QuoteStatus,
} from '../../_types';
import { LineItemsEditor } from '../_components/line-items-editor';
import { QuotePdfPreview } from '../_components/quote-pdf-preview';
import { SendEmailDialog } from '../../_components/send-email-dialog';

interface CompanyProfile {
    name?: string;
    logoUrl?: string;
}

export default function QuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const quoteRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, 'crm_quotes', id) : null),
        [firestore, id],
    );
    const { data: quote, isLoading } = useDoc<Quote>(quoteRef);

    const productsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_products') : null),
        [firestore],
    );
    const { data: products } = useCollection<Product>(productsRef);

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

    const orgRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'company', 'profile') : null),
        [firestore],
    );
    const { data: organization } = useDoc<CompanyProfile>(orgRef);

    const linkedContact = React.useMemo(
        () => (contacts || []).find((c) => c.id === quote?.contactId),
        [contacts, quote?.contactId],
    );
    const linkedCompany = React.useMemo(
        () => (companies || []).find((c) => c.id === quote?.companyId),
        [companies, quote?.companyId],
    );
    const linkedDeal = React.useMemo(
        () => (deals || []).find((d) => d.id === quote?.dealId),
        [deals, quote?.dealId],
    );

    const update = React.useCallback(
        (patch: Partial<Quote>) => {
            if (!quoteRef) return;
            updateDocumentNonBlocking(quoteRef, {
                ...patch,
                updatedAt: serverTimestamp(),
            });
        },
        [quoteRef],
    );

    const handleLineItemsChange = React.useCallback(
        (items: QuoteLineItem[]) => {
            const totals = computeQuoteTotals(items);
            update({ lineItems: items, ...totals });
        },
        [update],
    );

    const handleStatusChange = React.useCallback(
        (next: QuoteStatus) => {
            if (!quote) return;
            const patch: Record<string, unknown> = {
                status: next,
                updatedAt: serverTimestamp(),
            };
            if (next === 'sent' && !quote.sentAt) patch.sentAt = serverTimestamp();
            if (next === 'accepted' && !quote.acceptedAt)
                patch.acceptedAt = serverTimestamp();
            if (next === 'rejected' && !quote.rejectedAt)
                patch.rejectedAt = serverTimestamp();
            if (quoteRef) updateDocumentNonBlocking(quoteRef, patch);
        },
        [quote, quoteRef],
    );

    const handleDelete = React.useCallback(() => {
        if (!quoteRef) return;
        deleteDocumentNonBlocking(quoteRef);
        toast({ title: 'Устгагдлаа', description: 'Үнийн саналыг устгалаа.' });
        router.push('/crm/quotes');
    }, [quoteRef, toast, router]);

    const pdfRef = React.useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = React.useState(false);
    const [isSendOpen, setIsSendOpen] = React.useState(false);

    const handleExportPdf = React.useCallback(async () => {
        if (!quote || !pdfRef.current) return;
        setIsExporting(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const filename = `${quote.number || 'quote'}-${quote.title.replace(/\s+/g, '-')}.pdf`;
            await html2pdf()
                .set({
                    margin: 0,
                    filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                })
                .from(pdfRef.current)
                .save();
            toast({ title: 'PDF амжилттай татагдлаа' });
        } catch (err) {
            console.error('PDF export failed', err);
            toast({
                variant: 'destructive',
                title: 'PDF алдаа',
                description: 'PDF үүсгэхэд алдаа гарлаа.',
            });
        } finally {
            setIsExporting(false);
        }
    }, [quote, toast]);

    if (isLoading) {
        return (
            <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!quote) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                    <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
                </div>
                <h2 className="text-base font-semibold">Үнийн санал олдсонгүй</h2>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/crm/quotes">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        );
    }

    const status = getQuoteStatus(quote.status);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between gap-3 border-b px-6 py-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon-sm" asChild>
                        <Link href="/crm/quotes">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            {quote.number && (
                                <span className="text-[11px] text-muted-foreground font-mono">
                                    {quote.number}
                                </span>
                            )}
                            <span
                                className="inline-flex items-center gap-1 text-[11px]"
                                style={{ color: status?.color }}
                            >
                                <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: status?.color }}
                                />
                                {status?.label}
                            </span>
                        </div>
                        <h1 className="text-base font-semibold truncate">{quote.title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPdf}
                        disabled={isExporting || quote.lineItems.length === 0}
                    >
                        <Download className="h-4 w-4 mr-1.5" />
                        PDF
                    </Button>
                    <Button
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={() => setIsSendOpen(true)}
                        disabled={quote.lineItems.length === 0}
                    >
                        <Send className="h-4 w-4 mr-1.5" />
                        Имэйлээр илгээх
                    </Button>
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
                                <AlertDialogTitle>Үнийн санал устгах уу?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Энэ үйлдэл буцаагдахгүй. {quote.title}-ийг устгана.
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

            {/* Status workflow stepper */}
            <div className="border-b px-6 py-3 bg-muted/20 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-fit">
                    {QUOTE_STATUSES.map((s) => {
                        const isActive = s.id === quote.status;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                    if (!isActive) handleStatusChange(s.id);
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
                    {/* Left: properties */}
                    <aside className="lg:col-span-3 space-y-4">
                        <PropertiesCard
                            quote={quote}
                            contacts={contacts || []}
                            companies={companies || []}
                            deals={deals || []}
                            onChange={update}
                        />
                    </aside>

                    {/* Center: line items + tabs */}
                    <section className="lg:col-span-6 space-y-4">
                        <LineItemsEditor
                            items={quote.lineItems}
                            onChange={handleLineItemsChange}
                            products={products || []}
                            currency={quote.currency}
                            readonly={quote.status === 'accepted' || quote.status === 'rejected'}
                        />

                        <Tabs defaultValue="notes" className="w-full">
                            <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-10 p-0">
                                <TabsTrigger value="notes" className="rounded-none">
                                    Тэмдэглэл
                                </TabsTrigger>
                                <TabsTrigger value="terms" className="rounded-none">
                                    Гэрээний нөхцөл
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="notes" className="mt-4">
                                <NoteEditor
                                    label="Тэмдэглэл"
                                    initial={quote.notes || ''}
                                    onSave={(notes) => update({ notes })}
                                    placeholder="Дотоод тэмдэглэл (PDF дээр гарна)..."
                                />
                            </TabsContent>
                            <TabsContent value="terms" className="mt-4">
                                <NoteEditor
                                    label="Гэрээний нөхцөл"
                                    initial={quote.terms || ''}
                                    onSave={(terms) => update({ terms })}
                                    placeholder="Төлбөрийн нөхцөл, хүргэлт, баталгаа..."
                                />
                            </TabsContent>
                        </Tabs>
                    </section>

                    {/* Right: associations */}
                    <aside className="lg:col-span-3 space-y-4">
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
                                        <div className="text-[11px] text-muted-foreground tabular-nums">
                                            {formatMoney(linkedDeal.amount, linkedDeal.currency)}
                                        </div>
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
                                    </div>
                                </div>
                            </Link>
                        )}

                        {!linkedDeal && !linkedCompany && (
                            <div className="rounded-xl border bg-card p-4">
                                <p className="text-xs text-muted-foreground">
                                    Холбогдсон гэрээ/байгууллага байхгүй. Зүүн талаас сонгож холбоно уу.
                                </p>
                            </div>
                        )}

                        <SummaryCard quote={quote} />
                    </aside>
                </div>
            </div>

            {/* Off-screen PDF render target */}
            <div
                style={{
                    position: 'absolute',
                    left: -10000,
                    top: 0,
                    width: '210mm',
                    pointerEvents: 'none',
                }}
                aria-hidden="true"
            >
                <QuotePdfPreview
                    ref={pdfRef}
                    quote={quote}
                    contact={linkedContact}
                    company={linkedCompany}
                    organization={organization || undefined}
                />
            </div>

            <SendEmailDialog
                open={isSendOpen}
                onOpenChange={setIsSendOpen}
                contact={linkedContact}
                company={linkedCompany}
                deal={linkedDeal}
                quote={quote}
                markQuoteSent
            />
        </div>
    );
}

function PropertiesCard({
    quote,
    contacts,
    companies,
    deals,
    onChange,
}: {
    quote: Quote;
    contacts: Contact[];
    companies: Company[];
    deals: Deal[];
    onChange: (patch: Partial<Quote>) => void;
}) {
    const contactOptions = React.useMemo(
        () => [
            { value: '', label: '— Сонгоогүй —' },
            ...contacts.map((c) => ({
                value: c.id,
                label:
                    [c.lastName, c.firstName].filter(Boolean).join(' ') ||
                    c.email ||
                    c.id,
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

    const dealOptions = React.useMemo(
        () => [
            { value: '', label: '— Холбоогүй —' },
            ...deals.map((d) => ({ value: d.id, label: d.name })),
        ],
        [deals],
    );

    return (
        <div className="rounded-xl border bg-card p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Шинж чанар
            </h3>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Гарчиг
                </Label>
                <Input
                    value={quote.title}
                    onChange={(e) =>
                        onChange({ title: e.target.value || quote.title })
                    }
                    className="h-8"
                />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Валют
                </Label>
                <Select
                    value={quote.currency || DEFAULT_CURRENCY}
                    onValueChange={(v) => onChange({ currency: v })}
                >
                    <SelectTrigger className="h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {['MNT', 'USD', 'EUR', 'CNY', 'RUB'].map((c) => (
                            <SelectItem key={c} value={c}>
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Гарсан огноо
                    </Label>
                    <Input
                        type="date"
                        value={quote.issueDate || ''}
                        onChange={(e) =>
                            onChange({ issueDate: e.target.value || undefined })
                        }
                        className="h-8"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Дуусах огноо
                    </Label>
                    <Input
                        type="date"
                        value={quote.expiryDate || ''}
                        onChange={(e) =>
                            onChange({ expiryDate: e.target.value || undefined })
                        }
                        className="h-8"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Холбогдох гэрээ
                </Label>
                <SearchableSelect
                    options={dealOptions}
                    value={quote.dealId || ''}
                    onValueChange={(v) => onChange({ dealId: v || undefined })}
                    placeholder="— Сонгох —"
                />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Харилцагч
                </Label>
                <SearchableSelect
                    options={contactOptions}
                    value={quote.contactId || ''}
                    onValueChange={(v) => onChange({ contactId: v || undefined })}
                    placeholder="— Сонгох —"
                />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Байгууллага
                </Label>
                <SearchableSelect
                    options={companyOptions}
                    value={quote.companyId || ''}
                    onValueChange={(v) => onChange({ companyId: v || undefined })}
                    placeholder="— Сонгох —"
                />
            </div>

            {quote.sentAt && (
                <div className="space-y-1 pt-2 border-t">
                    <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Илгээсэн
                    </Label>
                    <div className="text-sm inline-flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(quote.sentAt.seconds * 1000).toLocaleDateString('mn-MN')}
                    </div>
                </div>
            )}
            {quote.acceptedAt && (
                <div className="space-y-1">
                    <Label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Зөвшөөрсөн
                    </Label>
                    <div className="text-sm inline-flex items-center gap-1.5 text-emerald-600">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(
                            quote.acceptedAt.seconds * 1000,
                        ).toLocaleDateString('mn-MN')}
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ quote }: { quote: Quote }) {
    return (
        <div className="rounded-xl border bg-card p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Хураангуй
            </h3>
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Бараа</span>
                <span>{quote.lineItems.length}</span>
            </div>
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Дэд дүн</span>
                <span className="tabular-nums">
                    {formatMoney(quote.subtotal, quote.currency)}
                </span>
            </div>
            {quote.totalDiscount > 0 && (
                <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Хөнгөлөлт</span>
                    <span className="tabular-nums text-emerald-700">
                        − {formatMoney(quote.totalDiscount, quote.currency)}
                    </span>
                </div>
            )}
            {quote.totalTax > 0 && (
                <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Татвар</span>
                    <span className="tabular-nums">
                        {formatMoney(quote.totalTax, quote.currency)}
                    </span>
                </div>
            )}
            <div className="flex justify-between pt-2 mt-1 border-t">
                <span className="text-sm font-semibold">Нийт</span>
                <span className="tabular-nums font-bold text-base">
                    {formatMoney(quote.total, quote.currency)}
                </span>
            </div>
        </div>
    );
}

function NoteEditor({
    label,
    initial,
    onSave,
    placeholder,
}: {
    label: string;
    initial: string;
    onSave: (v: string) => void;
    placeholder?: string;
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
                <span className="text-sm font-medium">{label}</span>
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
                placeholder={placeholder}
                className="border-0 resize-none min-h-[160px] focus-visible:ring-0 rounded-none"
            />
        </div>
    );
}
