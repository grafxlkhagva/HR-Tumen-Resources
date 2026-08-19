'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    addDoc,
    collection,
    doc,
    serverTimestamp,
    setDoc,
    Timestamp,
} from 'firebase/firestore';
import { Zap, Check, Plus, ArrowRight, Loader2, Settings2 } from 'lucide-react';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    type Activity,
    type CompanyStats,
    type Deal,
    type Quote,
    type Survey,
} from '../_types';
import { useKamScope } from '../_lib/use-kam-scope';
import { logAudit } from '../_lib/crm-actions';
import {
    AUTOMATION_RULE_META,
    DEFAULT_AUTOMATION_CONFIG,
    evaluateAutomations,
    existingAutoKeys,
    type AutomationConfig,
    type AutomationSuggestion,
} from '../_lib/automation';

export default function CrmAutomationPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { actor, isDirector } = useKamScope();

    // ── Тохиргоо ──
    const configRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'crm_settings', 'automation') : null),
        [firestore],
    );
    const { data: configDoc, isLoading: configLoading } = useDoc<AutomationConfig>(configRef);
    const config: AutomationConfig = { ...DEFAULT_AUTOMATION_CONFIG, ...(configDoc || {}) };

    // ── Дата ──
    const dealsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_deals') : null),
        [firestore],
    );
    const { data: deals } = useCollection<Deal>(dealsRef);

    const activitiesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_activities') : null),
        [firestore],
    );
    const { data: activities } = useCollection<Activity>(activitiesRef);

    const quotesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_quotes') : null),
        [firestore],
    );
    const { data: quotes } = useCollection<Quote>(quotesRef);

    const surveysRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_surveys') : null),
        [firestore],
    );
    const { data: surveys } = useCollection<Survey>(surveysRef);

    const statsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_company_stats') : null),
        [firestore],
    );
    const { data: companyStats } = useCollection<CompanyStats>(statsRef);

    const [creating, setCreating] = React.useState<Set<string>>(new Set());
    const [done, setDone] = React.useState<Set<string>>(new Set());

    const suggestions = React.useMemo(() => {
        const nowMs = Date.now();
        const nowMonth = new Date().getMonth() + 1;
        const all = evaluateAutomations({
            deals: deals || [],
            activities: activities || [],
            quotes: quotes || [],
            surveys: surveys || [],
            companyStats: companyStats || [],
            config,
            nowMs,
            nowMonth,
        });
        const existing = existingAutoKeys(activities || []);
        return all.filter((s) => !existing.has(s.autoKey) && !done.has(s.autoKey));
    }, [deals, activities, quotes, surveys, companyStats, config, done]);

    const createTask = React.useCallback(
        async (s: AutomationSuggestion) => {
            if (!firestore) return;
            setCreating((prev) => new Set(prev).add(s.autoKey));
            try {
                const due = new Date();
                due.setDate(due.getDate() + s.dueInDays);
                await addDoc(collection(firestore, 'crm_activities'), {
                    type: 'task',
                    title: s.title,
                    taskType: s.taskType,
                    priority: s.priority,
                    dueAt: Timestamp.fromDate(due),
                    companyIds: s.companyId ? [s.companyId] : [],
                    dealIds: s.dealId ? [s.dealId] : [],
                    contactIds: [],
                    ticketIds: [],
                    kam: actor.kam ?? null,
                    ownerId: actor.uid ?? null,
                    autoKey: s.autoKey,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                logAudit(firestore, actor, 'create', 'crm_activities', undefined, `Auto: ${s.title}`);
                setDone((prev) => new Set(prev).add(s.autoKey));
                toast({ title: 'Даалгавар үүслээ', description: s.title });
            } catch (e) {
                toast({
                    title: 'Алдаа',
                    description: e instanceof Error ? e.message : 'Дахин оролдоно уу',
                    variant: 'destructive',
                });
            } finally {
                setCreating((prev) => {
                    const n = new Set(prev);
                    n.delete(s.autoKey);
                    return n;
                });
            }
        },
        [firestore, actor, toast],
    );

    const createAll = React.useCallback(async () => {
        for (const s of suggestions) {
            // eslint-disable-next-line no-await-in-loop
            await createTask(s);
        }
    }, [suggestions, createTask]);

    // ── Admin тохиргоо хадгалах ──
    const [saving, setSaving] = React.useState(false);
    const saveConfig = React.useCallback(
        async (next: AutomationConfig) => {
            if (!firestore) return;
            setSaving(true);
            try {
                await setDoc(doc(firestore, 'crm_settings', 'automation'), next, { merge: true });
                logAudit(firestore, actor, 'update', 'crm_settings', 'automation', 'Автоматжуулалт');
            } finally {
                setSaving(false);
            }
        },
        [firestore, actor],
    );

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                        <Zap className="h-5 w-5 text-cyan-600" />
                        Автоматжуулалт
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Дүрмүүд датаг шалгаж, хийх ёстой ажлыг санал болгоно.
                    </p>
                </div>
                {suggestions.length > 0 && (
                    <Button size="sm" onClick={createAll} className="bg-cyan-600 hover:bg-cyan-600/90">
                        <Plus className="mr-1.5 h-4 w-4" />
                        Бүгдийг үүсгэх ({suggestions.length})
                    </Button>
                )}
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-3xl space-y-6">
                    {/* Санал болгосон үйлдлүүд */}
                    <section>
                        <h2 className="mb-3 text-sm font-semibold">
                            Санал болгож буй үйлдэл ({suggestions.length})
                        </h2>
                        {suggestions.length === 0 ? (
                            <div className="rounded-xl border border-dashed bg-muted/20 py-10 text-center text-sm text-muted-foreground">
                                Одоогоор шаардлагатай үйлдэл алга 👍
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {suggestions.map((s) => (
                                    <div
                                        key={s.autoKey}
                                        className={cn(
                                            'flex items-center gap-3 rounded-xl border bg-card p-3',
                                            s.severity === 'bad'
                                                ? 'border-rose-200 dark:border-rose-500/30'
                                                : 'border-amber-200 dark:border-amber-500/30',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'h-2 w-2 shrink-0 rounded-full',
                                                s.severity === 'bad' ? 'bg-rose-500' : 'bg-amber-500',
                                            )}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={s.href}
                                                className="block truncate text-sm font-medium hover:text-cyan-700"
                                            >
                                                {s.title}
                                            </Link>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {s.detail}
                                            </p>
                                        </div>
                                        <Link
                                            href={s.href}
                                            className="shrink-0 text-muted-foreground hover:text-foreground"
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0"
                                            disabled={creating.has(s.autoKey)}
                                            onClick={() => createTask(s)}
                                        >
                                            {creating.has(s.autoKey) ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                                    Даалгавар
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Admin тохиргоо */}
                    {isDirector && (
                        <section className="rounded-xl border bg-card">
                            <div className="flex items-center gap-2 border-b px-4 py-3">
                                <Settings2 className="h-4 w-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold">Дүрмийн тохиргоо</h2>
                                {saving && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                            {configLoading ? (
                                <div className="space-y-2 p-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-12 w-full" />
                                    ))}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {AUTOMATION_RULE_META.map((meta) => {
                                        const rule = config[meta.key];
                                        return (
                                            <div key={meta.key} className="flex items-start gap-3 p-4">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-medium">{meta.label}</div>
                                                    <p className="text-xs text-muted-foreground">{meta.desc}</p>
                                                    {'days' in rule && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">Хоног:</span>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                value={rule.days}
                                                                onChange={(e) =>
                                                                    saveConfig({
                                                                        ...config,
                                                                        [meta.key]: {
                                                                            ...rule,
                                                                            days: Math.max(1, Number(e.target.value) || 1),
                                                                        },
                                                                    })
                                                                }
                                                                className="h-7 w-20"
                                                            />
                                                        </div>
                                                    )}
                                                    {'threshold' in rule && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">Босго (≤):</span>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={10}
                                                                value={rule.threshold}
                                                                onChange={(e) =>
                                                                    saveConfig({
                                                                        ...config,
                                                                        [meta.key]: {
                                                                            ...rule,
                                                                            threshold: Math.min(
                                                                                10,
                                                                                Math.max(0, Number(e.target.value) || 0),
                                                                            ),
                                                                        },
                                                                    })
                                                                }
                                                                className="h-7 w-20"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <Switch
                                                    checked={rule.enabled}
                                                    onCheckedChange={(v) =>
                                                        saveConfig({
                                                            ...config,
                                                            [meta.key]: { ...rule, enabled: v },
                                                        })
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
