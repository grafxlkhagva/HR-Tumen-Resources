'use client';

import * as React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
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
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import {
    formatMoney,
    type Company,
    type Contact,
    type Deal,
    type PipelineStage,
    type Quote,
} from '../_types';

interface AIDraftPopoverProps {
    onDrafted: (subject: string, body: string) => void;
    contact?: Contact;
    company?: Company;
    deal?: Deal;
    dealStage?: PipelineStage;
    quote?: Quote;
    senderFullName?: string;
    orgName?: string;
}

type Tone = 'formal' | 'friendly' | 'urgent' | 'concise';

const TONE_LABELS: Record<Tone, string> = {
    formal: 'Албан ёсны',
    friendly: 'Нөхөрсөг',
    urgent: 'Яаралтай',
    concise: 'Товч',
};

const QUICK_INTENTS = [
    'Үнийн санал танилцуулах',
    'Дараагийн алхам товлох',
    'Уулзалт хүсэх',
    'Гэрээний нөхцөл лавлах',
    'Талархал илгээх',
];

export function AIDraftPopover({
    onDrafted,
    contact,
    company,
    deal,
    dealStage,
    quote,
    senderFullName,
    orgName,
}: AIDraftPopoverProps) {
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);
    const [intent, setIntent] = React.useState('');
    const [tone, setTone] = React.useState<Tone>('formal');
    const [isLoading, setIsLoading] = React.useState(false);

    const generate = async () => {
        if (!intent.trim()) {
            toast({
                variant: 'destructive',
                title: 'Зорилго оруулна уу',
                description: 'Юу бичих гэж байгаагаа товч бичнэ үү.',
            });
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/crm/ai/draft-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intent: intent.trim(),
                    tone,
                    language: 'mn',
                    context: {
                        contact: contact
                            ? {
                                  firstName: contact.firstName,
                                  lastName: contact.lastName,
                                  email: contact.email,
                                  jobTitle: contact.jobTitle,
                              }
                            : undefined,
                        company: company ? { name: company.name } : undefined,
                        deal: deal
                            ? {
                                  name: deal.name,
                                  amount: deal.amount
                                      ? formatMoney(deal.amount, deal.currency)
                                      : undefined,
                                  stage: dealStage?.label,
                              }
                            : undefined,
                        quote: quote
                            ? {
                                  number: quote.number,
                                  title: quote.title,
                                  total: formatMoney(quote.total, quote.currency),
                                  expiryDate: quote.expiryDate,
                              }
                            : undefined,
                        sender: senderFullName ? { fullName: senderFullName } : undefined,
                        org: orgName ? { name: orgName } : undefined,
                    },
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'AI бичиж чадсангүй');
            }
            onDrafted(data.subject || '', data.body || '');
            setOpen(false);
            setIntent('');
            toast({ title: 'AI ноорог гарлаа' });
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'AI алдаа',
                description: err instanceof Error ? err.message : 'Тодорхойгүй алдаа',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-cyan-200 bg-cyan-50/50 text-cyan-700 hover:bg-cyan-100"
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI бичих
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-3 space-y-3">
                <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-cyan-600" />
                    <span className="text-sm font-semibold">AI имэйл бичих</span>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs">Зорилго</Label>
                    <Input
                        value={intent}
                        onChange={(e) => setIntent(e.target.value)}
                        placeholder="Жишээ: Үнийн санал танилцуулж follow-up хийх"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate();
                        }}
                    />
                </div>

                <div className="flex flex-wrap gap-1">
                    {QUICK_INTENTS.map((q) => (
                        <button
                            key={q}
                            type="button"
                            onClick={() => setIntent(q)}
                            className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] text-cyan-700 hover:bg-cyan-100"
                        >
                            {q}
                        </button>
                    ))}
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs">Хэв маяг</Label>
                    <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(TONE_LABELS) as Tone[]).map((t) => (
                                <SelectItem key={t} value={t}>
                                    {TONE_LABELS[t]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    type="button"
                    size="sm"
                    onClick={generate}
                    disabled={isLoading || !intent.trim()}
                    className="w-full bg-cyan-600 hover:bg-cyan-600/90"
                >
                    {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Үүсгэх
                </Button>
            </PopoverContent>
        </Popover>
    );
}
