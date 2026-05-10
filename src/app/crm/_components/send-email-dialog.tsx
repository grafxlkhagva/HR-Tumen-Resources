'use client';

import * as React from 'react';
import {
    addDoc,
    collection,
    doc,
    orderBy,
    query,
    serverTimestamp,
} from 'firebase/firestore';
import {
    updateDocumentNonBlocking,
    useCollection,
    useFirebase,
    useMemoFirebase,
    useUser,
} from '@/firebase';
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
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DEFAULT_PIPELINE,
    EMAIL_TEMPLATE_CATEGORY_LABELS,
    formatMoney,
    getStage,
    substituteVariables,
    type Company,
    type Contact,
    type Deal,
    type EmailTemplate,
    type EmailVariableContext,
    type Quote,
} from '../_types';
import type { Employee } from '@/types';
import { AIDraftPopover } from './ai-draft-popover';

interface SendEmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Anchor — аль обьектоос илгээж байна. */
    contact?: Contact;
    company?: Company;
    deal?: Deal;
    quote?: Quote;
    /** Илгээсэн үед status='sent' гэж тэмдэглэх эсэх (зөвхөн quote-д ач холбогдол). */
    markQuoteSent?: boolean;
}

interface CompanyProfile {
    name?: string;
}

export function SendEmailDialog({
    open,
    onOpenChange,
    contact,
    company,
    deal,
    quote,
    markQuoteSent,
}: SendEmailDialogProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSending, setIsSending] = React.useState(false);
    const [view, setView] = React.useState<'edit' | 'preview'>('edit');

    const templatesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, 'crm_email_templates'),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: templates } = useCollection<EmailTemplate>(templatesQuery);

    const ownerRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'employees', user.uid) : null),
        [firestore, user],
    );
    const orgRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'company', 'profile') : null),
        [firestore],
    );

    const [ownerData, setOwnerData] = React.useState<Employee | null>(null);
    const [orgData, setOrgData] = React.useState<CompanyProfile | null>(null);

    React.useEffect(() => {
        if (!ownerRef) return;
        let cancelled = false;
        import('firebase/firestore').then(({ getDoc }) => {
            getDoc(ownerRef).then((snap) => {
                if (!cancelled && snap.exists()) {
                    setOwnerData({ id: snap.id, ...(snap.data() as Employee) });
                }
            });
        });
        return () => {
            cancelled = true;
        };
    }, [ownerRef]);

    React.useEffect(() => {
        if (!orgRef) return;
        let cancelled = false;
        import('firebase/firestore').then(({ getDoc }) => {
            getDoc(orgRef).then((snap) => {
                if (!cancelled && snap.exists()) {
                    setOrgData(snap.data() as CompanyProfile);
                }
            });
        });
        return () => {
            cancelled = true;
        };
    }, [orgRef]);

    const variableContext = React.useMemo<EmailVariableContext>(() => {
        const ownerFullName = ownerData
            ? [ownerData.lastName, ownerData.firstName].filter(Boolean).join(' ').trim()
            : '';
        const contactFullName = contact
            ? [contact.lastName, contact.firstName].filter(Boolean).join(' ').trim()
            : '';
        return {
            contact: contact
                ? {
                      firstName: contact.firstName,
                      lastName: contact.lastName,
                      fullName: contactFullName || contact.email,
                      email: contact.email,
                      phone: contact.phone,
                      jobTitle: contact.jobTitle,
                  }
                : undefined,
            company: company ? { name: company.name, domain: company.domain } : undefined,
            deal: deal
                ? {
                      name: deal.name,
                      amount: formatMoney(deal.amount, deal.currency),
                  }
                : undefined,
            quote: quote
                ? {
                      number: quote.number,
                      title: quote.title,
                      total: formatMoney(quote.total, quote.currency),
                      issueDate: quote.issueDate,
                      expiryDate: quote.expiryDate,
                  }
                : undefined,
            owner: ownerData
                ? {
                      firstName: ownerData.firstName,
                      lastName: ownerData.lastName,
                      fullName: ownerFullName || ownerData.email,
                      email: ownerData.email,
                      phone: ownerData.phoneNumber,
                  }
                : undefined,
            org: orgData ? { name: orgData.name } : undefined,
        };
    }, [contact, company, deal, quote, ownerData, orgData]);

    const [form, setForm] = React.useState({
        templateId: '',
        to: '',
        subject: '',
        body: '',
    });

    React.useEffect(() => {
        if (open) {
            setForm({
                templateId: '',
                to: contact?.email || '',
                subject: '',
                body: '',
            });
            setView('edit');
        }
    }, [open, contact?.email]);

    const handleTemplateChange = (id: string) => {
        setForm((p) => ({ ...p, templateId: id }));
        if (!id) return;
        const tpl = (templates || []).find((t) => t.id === id);
        if (!tpl) return;
        setForm((p) => ({
            ...p,
            templateId: id,
            subject: tpl.subject,
            body: tpl.body,
        }));
    };

    const renderedSubject = React.useMemo(
        () => substituteVariables(form.subject, variableContext),
        [form.subject, variableContext],
    );
    const renderedBody = React.useMemo(
        () => substituteVariables(form.body, variableContext),
        [form.body, variableContext],
    );

    const templateOptions = React.useMemo(
        () => [
            { value: '', label: '— Загвар сонгох —' },
            ...(templates || []).map((t) => ({
                value: t.id,
                label: t.name,
                description: EMAIL_TEMPLATE_CATEGORY_LABELS[t.category],
            })),
        ],
        [templates],
    );

    const canSend =
        form.to.trim().length > 0 &&
        form.subject.trim().length > 0 &&
        form.body.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.to.trim());

    const handleSend = async () => {
        if (!firestore || !canSend) return;

        setIsSending(true);
        try {
            const html = renderedBody
                .split('\n')
                .map((line) => line.trim() === '' ? '<br/>' : `<p>${escapeHtml(line)}</p>`)
                .join('\n');

            const res = await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: form.to.trim(),
                    subject: renderedSubject,
                    html,
                    text: renderedBody,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.details || data?.error || 'Илгээхэд алдаа гарлаа.');
            }

            // Activity бичих
            const ownerFullName = ownerData
                ? [ownerData.lastName, ownerData.firstName].filter(Boolean).join(' ').trim()
                : '';
            const activityRef = collection(firestore, 'crm_activities');
            await addDoc(activityRef, {
                type: 'email',
                emailSubject: renderedSubject,
                emailDirection: 'outbound',
                body: renderedBody,
                contactIds: contact ? [contact.id] : [],
                companyIds: company ? [company.id] : [],
                dealIds: deal ? [deal.id] : [],
                ticketIds: [],
                ownerId: user?.uid || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Quote-ийг "Илгээсэн" гэж тэмдэглэх
            if (markQuoteSent && quote) {
                const quoteRef = doc(firestore, 'crm_quotes', quote.id);
                updateDocumentNonBlocking(quoteRef, {
                    status: 'sent',
                    sentAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }

            const status = data?.status === 'simulated_success' ? 'simulated' : 'sent';
            toast({
                title: status === 'simulated' ? 'Симуляци (RESEND_API_KEY суулгаагүй)' : 'Имэйл илгээгдлээ',
                description: `${ownerFullName || 'Илгээгч'} → ${form.to.trim()}`,
            });
            onOpenChange(false);
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Илгээж чадсангүй',
                description: err instanceof Error ? err.message : 'Тодорхойгүй алдаа',
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Имэйл илгээх</DialogTitle>
                    <DialogDescription>
                        Загвар сонгож хувьсагч автоматаар орлуулах боломжтой.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Хэнд</Label>
                            <Input
                                type="email"
                                value={form.to}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, to: e.target.value }))
                                }
                                disabled={isSending}
                                placeholder="user@example.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Загвар</Label>
                            <SearchableSelect
                                options={templateOptions}
                                value={form.templateId}
                                onValueChange={handleTemplateChange}
                                placeholder="— Сонгох —"
                                disabled={isSending}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Гарчиг</Label>
                        <Input
                            value={form.subject}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, subject: e.target.value }))
                            }
                            disabled={isSending}
                            placeholder="Имэйлийн гарчиг"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs">Агуулга</Label>
                            <div className="flex items-center gap-2">
                                <AIDraftPopover
                                    onDrafted={(subject, body) => {
                                        setForm((p) => ({
                                            ...p,
                                            subject: subject || p.subject,
                                            body,
                                        }));
                                    }}
                                    contact={contact}
                                    company={company}
                                    deal={deal}
                                    dealStage={
                                        deal ? getStage(DEFAULT_PIPELINE, deal.stageId) : undefined
                                    }
                                    quote={quote}
                                    senderFullName={
                                        ownerData
                                            ? [ownerData.lastName, ownerData.firstName]
                                                  .filter(Boolean)
                                                  .join(' ')
                                                  .trim()
                                            : undefined
                                    }
                                    orgName={orgData?.name}
                                />
                                <div className="inline-flex items-center rounded-md border bg-background p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setView('edit')}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                                            view === 'edit'
                                                ? 'bg-cyan-600 text-white'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        <Pencil className="h-3 w-3" />
                                        Засах
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('preview')}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                                            view === 'preview'
                                                ? 'bg-cyan-600 text-white'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        <Eye className="h-3 w-3" />
                                        Урьдчилан харах
                                    </button>
                                </div>
                            </div>
                        </div>
                        {view === 'edit' ? (
                            <Textarea
                                value={form.body}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, body: e.target.value }))
                                }
                                disabled={isSending}
                                placeholder={`Сайн байна уу, {{contact.firstName}} аа,...`}
                                className="min-h-[260px] resize-none font-mono text-xs"
                            />
                        ) : (
                            <div className="rounded-md border bg-muted/20 p-4 min-h-[260px]">
                                <div className="text-xs text-muted-foreground mb-2">
                                    <span className="text-foreground font-semibold">Гарчиг:</span>{' '}
                                    {renderedSubject || '(хоосон)'}
                                </div>
                                <div className="border-t pt-3 text-sm whitespace-pre-wrap">
                                    {renderedBody || '(хоосон)'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSending}
                    >
                        Болих
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSend}
                        className="bg-cyan-600 hover:bg-cyan-600/90"
                        disabled={isSending || !canSend}
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4 mr-1.5" />
                        )}
                        Илгээх
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
