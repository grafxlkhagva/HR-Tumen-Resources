'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    Sparkles,
    Loader2,
    CheckCircle2,
    Lightbulb,
    RefreshCw,
} from 'lucide-react';
import type { Activity } from '../_types';

interface AISummaryCardProps {
    objectKind: 'contact' | 'company' | 'deal' | 'ticket';
    objectName: string;
    activities: Activity[];
}

interface SummaryResult {
    summary: string;
    keyPoints: string[];
    nextActions: string[];
}

function formatActivityForApi(a: Activity) {
    const created = a.createdAt as unknown as { seconds: number } | undefined;
    const completed = a.completedAt as unknown as { seconds: number } | undefined;
    return {
        type: a.type,
        body: a.body,
        title: a.title,
        emailSubject: a.emailSubject,
        callOutcome: a.callOutcome,
        createdAt: created
            ? new Date(created.seconds * 1000).toISOString().slice(0, 10)
            : undefined,
        completedAt: completed
            ? new Date(completed.seconds * 1000).toISOString().slice(0, 10)
            : undefined,
    };
}

export function AISummaryCard({
    objectKind,
    objectName,
    activities,
}: AISummaryCardProps) {
    const { toast } = useToast();
    const [result, setResult] = React.useState<SummaryResult | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    const generate = async () => {
        if (activities.length === 0) {
            toast({
                title: 'Үйл ажиллагаа байхгүй',
                description: 'Хураангуй гаргахад үйл ажиллагаа шаардлагатай.',
            });
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/crm/ai/summarize-timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    objectKind,
                    objectName,
                    language: 'mn',
                    activities: activities.slice(0, 30).map(formatActivityForApi),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Хураангуй гаргахад алдаа');
            }
            setResult({
                summary: data.summary || '',
                keyPoints: data.keyPoints || [],
                nextActions: data.nextActions || [],
            });
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

    if (!result && !isLoading) {
        return (
            <div className="rounded-xl border border-dashed bg-cyan-50/30 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-medium">AI хураангуй</div>
                        <div className="text-[11px] text-muted-foreground">
                            {activities.length} үйл ажиллагаанаас гол санааг гаргана
                        </div>
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={generate}
                    disabled={activities.length === 0}
                    className="border-cyan-300 text-cyan-700 hover:bg-cyan-100"
                >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Үүсгэх
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="rounded-xl border bg-cyan-50/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI боловсруулж байна...
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        );
    }

    if (!result) return null;

    return (
        <div className="rounded-xl border bg-cyan-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-700">
                    <Sparkles className="h-4 w-4" />
                    AI хураангуй
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={generate}
                    className="h-7 text-cyan-700 hover:bg-cyan-100"
                >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Шинэчлэх
                </Button>
            </div>

            <p className="text-sm leading-relaxed">{result.summary}</p>

            {result.keyPoints.length > 0 && (
                <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Гол санаа
                    </div>
                    <ul className="space-y-1">
                        {result.keyPoints.map((p, i) => (
                            <li key={i} className="flex gap-2 text-xs">
                                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 shrink-0 mt-0.5" />
                                <span>{p}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {result.nextActions.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-cyan-200/50">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Дараагийн алхам
                    </div>
                    <ul className="space-y-1">
                        {result.nextActions.map((a, i) => (
                            <li key={i} className="flex gap-2 text-xs">
                                <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <span>{a}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
