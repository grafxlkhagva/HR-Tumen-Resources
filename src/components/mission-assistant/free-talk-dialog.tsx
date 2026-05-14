'use client';

/**
 * FreeTalkDialog — Founder чөлөөтэй бичсэн ярианаас AI mission/vision/values гаргана.
 * (Big Bang Partnership "natural language capture" principle)
 */

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mic, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { missionAuthFetch } from './auth-fetch';

interface ExtractResult {
    keywords: string[];
    tone: string;
    suggestedValues: string[];
    missionDraft: string;
    visionDraft: string;
    summary: string;
}

interface FreeTalkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companyName?: string;
    onApply: (mission: string, vision: string) => void;
}

const PROMPTS = [
    'Та яагаад энэ компанийг эхлүүлсэн бэ?',
    'Хэрэглэгчдээ юу мэдрүүлэхийг хүсдэг вэ?',
    'Хамгийн ялгардаг бахархмаар амжилт чинь юу вэ?',
    '5 жилийн дараа компани чинь яаж яригдмаар байна вэ?',
];

export function FreeTalkDialog({ open, onOpenChange, companyName, onApply }: FreeTalkDialogProps) {
    const { toast } = useToast();
    const [text, setText] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [result, setResult] = React.useState<ExtractResult | null>(null);

    React.useEffect(() => {
        if (!open) { setText(''); setResult(null); }
    }, [open]);

    const handleExtract = async () => {
        if (text.trim().length < 30) {
            toast({ variant: 'destructive', title: 'Текст хэт богино', description: 'Хамгийн багадаа 30 тэмдэгт бичнэ үү.' });
            return;
        }
        setIsLoading(true);
        try {
            const res = await missionAuthFetch('/api/mission-assistant/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, context: { companyName } }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI алдаа');
            setResult(data);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Боловсруулж чадсангүй', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (!result) return;
        onApply(result.missionDraft, result.visionDraft);
        toast({ title: 'Хэрэглэлээ', description: 'Mission + Vision-д ноорог орлоо.' });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mic className="h-4 w-4 text-rose-600" />
                        Чөлөөт яриа → AI боловсруулалт
                    </DialogTitle>
                    <DialogDescription>
                        Чөлөөтэй, эмх замбараагүй бичээрэй — AI өөрөө утгыг гарган авна. Жинхэнэ үг хэллэг хадгалагдана.
                    </DialogDescription>
                </DialogHeader>

                {!result && !isLoading && (
                    <div className="space-y-3 py-1">
                        <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3">
                            <div className="text-xs font-medium text-rose-800 mb-1.5">💭 Эхлэхэд тус болох асуултууд</div>
                            <ul className="text-xs text-rose-700 space-y-1 list-disc pl-4">
                                {PROMPTS.map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                        </div>
                        <Textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Чөлөөтэй бичээрэй... Дүрэм байхгүй, утгагүй санагдсан ч хайхрахгүй. AI өөрөө таних болно."
                            className="min-h-[260px] resize-none"
                            autoFocus
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{text.length} тэмдэгт · {text.trim().split(/\s+/).filter(Boolean).length} үг</span>
                            <span>Зөвлөмж: 100-300 үг</span>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
                        <p className="text-sm text-slate-600">AI таны яриаг боловсруулж байна…</p>
                    </div>
                )}

                {result && !isLoading && (
                    <div className="space-y-4">
                        {result.summary && (
                            <div className="rounded-lg border-l-4 border-rose-400 bg-rose-50/40 p-3">
                                <div className="text-xs font-medium text-rose-800 mb-1">Хураангуй</div>
                                <p className="text-sm text-slate-800 italic">"{result.summary}"</p>
                                {result.tone && <p className="text-[11px] text-slate-500 mt-1">Өнгө аяс: {result.tone}</p>}
                            </div>
                        )}

                        {result.keywords.length > 0 && (
                            <div>
                                <div className="text-xs font-medium text-slate-700 mb-1.5">🔑 Гол түлхүүр үгс</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {result.keywords.map((k, i) => (
                                        <span key={i} className="text-xs px-2 py-1 rounded-md bg-violet-100 text-violet-800 font-medium">{k}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                            <div className="rounded-lg border-2 border-orange-200 bg-orange-50/40 p-3">
                                <div className="text-xs font-bold text-orange-700 mb-1.5">🎯 Mission ноорог</div>
                                <p className="text-sm text-slate-800">{result.missionDraft}</p>
                            </div>
                            <div className="rounded-lg border-2 border-blue-200 bg-blue-50/40 p-3">
                                <div className="text-xs font-bold text-blue-700 mb-1.5">🔭 Vision ноорог</div>
                                <p className="text-sm text-slate-800">{result.visionDraft}</p>
                            </div>
                        </div>

                        {result.suggestedValues.length > 0 && (
                            <div className="rounded-lg border bg-slate-50 p-3">
                                <div className="text-xs font-medium text-slate-700 mb-1.5">💎 Боломжит үнэт зүйлс</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {result.suggestedValues.map((v, i) => (
                                        <span key={i} className="text-xs px-2 py-1 rounded-md bg-white border text-slate-700">{v}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {!result ? (
                        <>
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                            <Button type="button" onClick={handleExtract} disabled={isLoading || text.trim().length < 30}>
                                {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                                AI-аар боловсруулах
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" type="button" onClick={() => setResult(null)}>Дахин</Button>
                            <Button type="button" onClick={handleApply}>
                                <Check className="h-4 w-4 mr-1" /> Mission/Vision-д хэрэглэх
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
