'use client';

/**
 * RefineButton — textarea-н хажууд гарч ирэх ✨ AI сайжруулах товч.
 * Хэрэглэгчийн бичсэн ноорогт refine API дуудаад diff preview харуулна.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { missionAuthFetch } from './auth-fetch';

type Field = 'mission' | 'vision' | 'value';

interface RefineButtonProps {
    field: Field;
    text: string;
    companyName?: string;
    industry?: string;
    onApply: (refined: string) => void;
    disabled?: boolean;
}

interface RefineResult {
    refined: string;
    changes: string[];
    wordCount: number;
}

export function RefineButton({ field, text, companyName, industry, onApply, disabled }: RefineButtonProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [result, setResult] = React.useState<RefineResult | null>(null);
    const [open, setOpen] = React.useState(false);

    const handleRefine = async () => {
        if (!text || text.trim().length < 5) {
            toast({ variant: 'destructive', title: 'Текст хэт богино байна', description: 'Хамгийн багадаа 5 тэмдэгт оруулна уу.' });
            return;
        }
        setIsLoading(true);
        try {
            const res = await missionAuthFetch('/api/mission-assistant/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, text, context: { companyName, industry } }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI алдаа');
            setResult(data);
            setOpen(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Сайжруулж чадсангүй', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (result) {
            onApply(result.refined);
            toast({ title: 'Хэрэглэлээ', description: 'AI хувилбарыг хэрэглэв.' });
        }
        setOpen(false);
        setResult(null);
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefine}
                disabled={disabled || isLoading || !text}
                className="gap-1.5 h-7 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
            >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI сайжруулах
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-600" />
                            AI сайжруулсан хувилбар
                        </DialogTitle>
                        <DialogDescription>
                            Хуучин ↔ шинэ хувилбарыг харьцуулаад сонгоорой.
                        </DialogDescription>
                    </DialogHeader>

                    {result && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="rounded-lg border bg-slate-50 p-3">
                                    <div className="text-xs font-medium text-slate-500 mb-2">Хуучин</div>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{text}</p>
                                </div>
                                <div className="rounded-lg border-2 border-violet-200 bg-violet-50/40 p-3">
                                    <div className="text-xs font-medium text-violet-700 mb-2 flex items-center justify-between">
                                        <span>Шинэ ({result.wordCount} үг)</span>
                                        <Sparkles className="h-3 w-3" />
                                    </div>
                                    <p className="text-sm text-slate-900 whitespace-pre-wrap">{result.refined}</p>
                                </div>
                            </div>

                            {result.changes && result.changes.length > 0 && (
                                <div className="rounded-lg bg-slate-50 p-3 border">
                                    <div className="text-xs font-medium text-slate-600 mb-2">Хийсэн өөрчлөлт:</div>
                                    <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4">
                                        {result.changes.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            <X className="h-4 w-4 mr-1" /> Татгалзах
                        </Button>
                        <Button type="button" onClick={handleApply}>
                            <Check className="h-4 w-4 mr-1" /> Хэрэглэх
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
