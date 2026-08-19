'use client';

import * as React from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Copy, Check } from 'lucide-react';

interface SendSurveyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companyId: string;
    companyName: string;
    kam?: string | null;
    defaultEmail?: string;
}

/** NPS судалгааны токентой холбоос үүсгээд имэйлээр илгээх (эсвэл линк хуулах). */
export function SendSurveyDialog({
    open,
    onOpenChange,
    companyId,
    companyName,
    kam,
    defaultEmail,
}: SendSurveyDialogProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [email, setEmail] = React.useState(defaultEmail ?? '');
    const [busy, setBusy] = React.useState(false);
    const [link, setLink] = React.useState('');
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setEmail(defaultEmail ?? '');
            setLink('');
            setCopied(false);
        }
    }, [open, defaultEmail]);

    /** Токентой линк үүсгэнэ (нэг удаа). */
    const ensureLink = React.useCallback(async (): Promise<string | null> => {
        if (link) return link;
        if (!user) {
            toast({ title: 'Нэвтрэлт шаардлагатай', variant: 'destructive' });
            return null;
        }
        const idToken = await user.getIdToken();
        const res = await fetch('/api/crm/survey', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ companyId, companyName, kam: kam ?? null }),
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error || 'Линк үүсгэхэд алдаа гарлаа');
        }
        setLink(data.url);
        return data.url as string;
    }, [link, user, companyId, companyName, kam, toast]);

    const handleCopy = async () => {
        try {
            const url = await ensureLink();
            if (!url) return;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) {
            toast({
                title: 'Алдаа',
                description: e instanceof Error ? e.message : 'Дахин оролдоно уу',
                variant: 'destructive',
            });
        }
    };

    const handleSend = async () => {
        if (!email.trim()) {
            toast({ title: 'Имэйл хаяг оруулна уу', variant: 'destructive' });
            return;
        }
        setBusy(true);
        try {
            const url = await ensureLink();
            if (!url) return;

            const html = `
                <p>Сайн байна уу,</p>
                <p><b>${escapeHtml(companyName)}</b>-д үзүүлж буй үйлчилгээгээ сайжруулахын тулд таны үнэлгээ бидэнд чухал.</p>
                <p>Доорх холбоосоор орж богино судалгааг (1 минут) бөглөж өгнө үү:</p>
                <p><a href="${url}" style="display:inline-block;background:#0891b2;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Үнэлгээ өгөх</a></p>
                <p style="color:#64748b;font-size:12px">Холбоос ажиллахгүй бол: ${url}</p>
                <p>Баярлалаа,<br/>Түмэн Тээх</p>
            `;

            const res = await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email.trim(),
                    subject: 'Үйлчилгээний үнэлгээ — Түмэн Тээх',
                    html,
                    text: `Үнэлгээ өгөх холбоос: ${url}`,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.details || data?.error || 'Имэйл илгээхэд алдаа гарлаа');
            }

            // Timeline-д бичих
            await addDoc(collection(firestore, 'crm_activities'), {
                type: 'email',
                emailSubject: 'NPS судалгаа илгээсэн',
                emailDirection: 'outbound',
                body: `Судалгааны холбоос ${email.trim()} руу илгээв.`,
                contactIds: [],
                companyIds: companyId ? [companyId] : [],
                dealIds: [],
                ticketIds: [],
                kam: kam ?? null,
                ownerId: user?.uid || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }).catch(() => {});

            toast({
                title: 'Судалгаа илгээгдлээ',
                description: `${email.trim()} руу холбоос илгээв.`,
            });
            onOpenChange(false);
        } catch (e) {
            toast({
                title: 'Алдаа',
                description: e instanceof Error ? e.message : 'Дахин оролдоно уу',
                variant: 'destructive',
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>NPS судалгаа илгээх</DialogTitle>
                    <DialogDescription>
                        {companyName}-д үнэлгээний холбоос илгээнэ. Харилцагч 0–10 оноо өгнө.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="survey-email">Хүлээн авагчийн имэйл</Label>
                        <Input
                            id="survey-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jishee@company.mn"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:border-primary/30"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        {copied ? 'Хуулагдлаа' : 'Имэйлгүйгээр линк хуулах'}
                    </button>
                    {link && (
                        <p className="break-all rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
                            {link}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
                        Болих
                    </Button>
                    <Button
                        onClick={handleSend}
                        disabled={busy}
                        className="bg-cyan-600 hover:bg-cyan-600/90"
                    >
                        {busy ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-1.5 h-4 w-4" />
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
        .replace(/"/g, '&quot;');
}
