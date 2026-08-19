'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Send, Loader2, User } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    type CompanyStats,
    type Company,
    type Deal,
    type OrderYearStats,
    type Quote,
    type Survey,
} from '../_types';
import { buildAiSnapshot } from '../_lib/ai-snapshot';

const CUR_YEAR = 2026;

interface Msg {
    role: 'user' | 'assistant';
    content: string;
}

const SUGGESTIONS = [
    'Энэ оны ашгийн зорилтын биелэлт хэд вэ?',
    'Хамгийн өндөр churn эрсдэлтэй харилцагчид хэн бэ?',
    'KAM тус бүрийн план биелэлтийг харьцуул.',
    'Deal-ийн win rate хэд вэ, сайжруулах юу санал болгох вэ?',
];

export default function CrmAssistantPage() {
    const { firestore } = useFirebase();
    const [messages, setMessages] = React.useState<Msg[]>([]);
    const [input, setInput] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // ── Дата ──
    const yearStatsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_order_stats') : null),
        [firestore],
    );
    const { data: yearStats } = useCollection<OrderYearStats>(yearStatsRef);

    const dealsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_deals') : null),
        [firestore],
    );
    const { data: deals } = useCollection<Deal>(dealsRef);

    const quotesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_quotes') : null),
        [firestore],
    );
    const { data: quotes } = useCollection<Quote>(quotesRef);

    const companiesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_companies') : null),
        [firestore],
    );
    const { data: companies } = useCollection<Company>(companiesRef);

    const companyStatsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_company_stats') : null),
        [firestore],
    );
    const { data: companyStats } = useCollection<CompanyStats>(companyStatsRef);

    const surveysRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_surveys') : null),
        [firestore],
    );
    const { data: surveys } = useCollection<Survey>(surveysRef);

    const snapshot = React.useMemo(() => {
        const nowMonth = new Date().getMonth() + 1;
        return buildAiSnapshot({
            yearStats: yearStats || [],
            deals: deals || [],
            quotes: quotes || [],
            companies: companies || [],
            companyStats: companyStats || [],
            surveys: surveys || [],
            nowMonth,
            curYear: CUR_YEAR,
        });
    }, [yearStats, deals, quotes, companies, companyStats, surveys]);

    React.useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, busy]);

    const send = React.useCallback(
        async (text: string) => {
            const q = text.trim();
            if (!q || busy) return;
            const history = messages.slice(-6);
            setMessages((m) => [...m, { role: 'user', content: q }]);
            setInput('');
            setBusy(true);
            try {
                const res = await fetch('/api/crm/ai/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: q, snapshot, history, language: 'mn' }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Алдаа гарлаа');
                setMessages((m) => [...m, { role: 'assistant', content: data.answer }]);
            } catch (e) {
                setMessages((m) => [
                    ...m,
                    {
                        role: 'assistant',
                        content: `⚠️ ${e instanceof Error ? e.message : 'Алдаа гарлаа'}`,
                    },
                ]);
            } finally {
                setBusy(false);
            }
        },
        [busy, messages, snapshot],
    );

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                        <Sparkles className="h-5 w-5 text-cyan-600" />
                        AI туслах
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        CRM датадаа тулгуурлан асуу — орлого, зорилт, эрсдэл, pipeline.
                    </p>
                </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="mx-auto max-w-3xl space-y-4">
                    {messages.length === 0 && (
                        <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10">
                                <Sparkles className="h-6 w-6 text-cyan-600" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Дараах асуултуудаас эхлүүлж болно:
                            </p>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {SUGGESTIONS.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => send(s)}
                                        className="rounded-lg border bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-cyan-400 hover:text-foreground"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
                        >
                            {m.role === 'assistant' && (
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                                    <Sparkles className="h-4 w-4 text-cyan-600" />
                                </div>
                            )}
                            <div
                                className={cn(
                                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                                    m.role === 'user'
                                        ? 'bg-cyan-600 text-white'
                                        : 'border bg-card',
                                )}
                            >
                                {m.role === 'assistant' ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5">
                                        <ReactMarkdown>{m.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    m.content
                                )}
                            </div>
                            {m.role === 'user' && (
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    ))}

                    {busy && (
                        <div className="flex gap-3">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                                <Sparkles className="h-4 w-4 text-cyan-600" />
                            </div>
                            <div className="rounded-2xl border bg-card px-4 py-3">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t p-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        send(input);
                    }}
                    className="mx-auto flex max-w-3xl items-end gap-2"
                >
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                send(input);
                            }
                        }}
                        rows={1}
                        placeholder="Асуултаа бичээд Enter дар..."
                        className="max-h-32 flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-cyan-400"
                    />
                    <Button
                        type="submit"
                        disabled={busy || !input.trim()}
                        className="h-10 w-10 shrink-0 rounded-xl bg-cyan-600 p-0 hover:bg-cyan-600/90"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
                    AI зөвхөн агрегат дата дээр хариулна. Тоог шалгаж баталгаажуулна уу.
                </p>
            </div>
        </div>
    );
}
