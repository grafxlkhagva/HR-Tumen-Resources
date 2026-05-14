'use client';

/**
 * CritiqueButton — текстийг 5 хэмжүүрээр оноожуулна.
 * (Clarity / Specificity / Inspiration / Memorability / Action-orientation)
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Gauge, Lightbulb, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { missionAuthFetch } from './auth-fetch';

type Field = 'mission' | 'vision' | 'value';

interface CritiqueButtonProps {
    field: Field;
    text: string;
    disabled?: boolean;
}

interface CritiqueResult {
    scores: {
        clarity: number;
        specificity: number;
        inspiration: number;
        memorability: number;
        actionOrientation: number;
    };
    overall: number;
    weakest: string;
    tips: string[];
    verdict: string;
}

const SCORE_LABELS: Record<keyof CritiqueResult['scores'], string> = {
    clarity: 'Тодорхой',
    specificity: 'Ялгарал',
    inspiration: 'Урам',
    memorability: 'Цээжлэхүйц',
    actionOrientation: 'Үйлдэлд чиглэсэн',
};

function scoreColor(score: number): string {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
}

function scoreTextColor(score: number): string {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
}

export function CritiqueButton({ field, text, disabled }: CritiqueButtonProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [result, setResult] = React.useState<CritiqueResult | null>(null);
    const [open, setOpen] = React.useState(false);

    const handleCritique = async () => {
        if (!text || text.trim().length < 10) {
            toast({ variant: 'destructive', title: 'Текст хэт богино', description: 'Хамгийн багадаа 10 тэмдэгт оруулна уу.' });
            return;
        }
        setIsLoading(true);
        try {
            const res = await missionAuthFetch('/api/mission-assistant/critique', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, text }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI алдаа');
            setResult(data);
            setOpen(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Үнэлэж чадсангүй', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCritique}
                disabled={disabled || isLoading || !text}
                className="gap-1.5 h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gauge className="h-3 w-3" />}
                AI үнэлэх
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Gauge className="h-4 w-4 text-blue-600" />
                            AI үнэлгээ
                        </DialogTitle>
                        <DialogDescription>
                            5 хэмжүүрээр шинжлэв. Сул хэсэгт зөвлөмж өглөө.
                        </DialogDescription>
                    </DialogHeader>

                    {result && (
                        <div className="space-y-4">
                            {/* Overall score circle */}
                            <div className="flex items-center justify-center py-2">
                                <div className="relative h-24 w-24">
                                    <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="#e5e7eb"
                                            strokeWidth="3"
                                        />
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke={result.overall >= 80 ? '#10b981' : result.overall >= 60 ? '#f59e0b' : '#ef4444'}
                                            strokeWidth="3"
                                            strokeDasharray={`${result.overall}, 100`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className={`text-2xl font-bold ${scoreTextColor(result.overall)}`}>{result.overall}</span>
                                        <span className="text-[10px] text-slate-500">/ 100</span>
                                    </div>
                                </div>
                            </div>

                            {/* Verdict */}
                            {result.verdict && (
                                <p className="text-sm text-center text-slate-700 italic">"{result.verdict}"</p>
                            )}

                            {/* Score breakdown */}
                            <div className="space-y-2.5">
                                {(Object.keys(result.scores) as Array<keyof CritiqueResult['scores']>).map(key => (
                                    <div key={key}>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="font-medium text-slate-700">{SCORE_LABELS[key]}</span>
                                            <span className={`font-semibold ${scoreTextColor(result.scores[key])}`}>{result.scores[key]}</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${scoreColor(result.scores[key])}`}
                                                style={{ width: `${result.scores[key]}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Weakest */}
                            {result.weakest && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-xs font-medium text-amber-800">Хамгийн сул хэсэг</div>
                                        <div className="text-xs text-amber-700 mt-0.5">{result.weakest}</div>
                                    </div>
                                </div>
                            )}

                            {/* Tips */}
                            {result.tips.length > 0 && (
                                <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <Lightbulb className="h-4 w-4 text-violet-600" />
                                        <span className="text-xs font-medium text-violet-800">Сайжруулах санал</span>
                                    </div>
                                    <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                                        {result.tips.map((t, i) => <li key={i}>{t}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
