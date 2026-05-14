'use client';

/**
 * DiscoveryWizardDialog — 6 алхамт ярилцлагаар Mission/Vision боловсруулна.
 * (5 Whys + Sinek Golden Circle + WIFI workshop methods)
 */

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2, ChevronLeft, ChevronRight, Sparkles, Check, RefreshCw, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { missionAuthFetch } from './auth-fetch';

interface Step {
    key: 'why' | 'who' | 'how' | 'what' | 'wifi' | 'beliefs';
    icon: string;
    title: string;
    question: string;
    hint: string;
    placeholder: string;
}

const STEPS: Step[] = [
    {
        key: 'why',
        icon: '🌱',
        title: 'Why — Яагаад?',
        question: 'Та яагаад энэ компанийг үүсгэсэн бэ? Гүн бод — "мөнгө" бус юм.',
        hint: '5 удаа "Яагаад?" гэж асууж гүн рүү ор. Жинхэнэ оршин тогтнох учрыг олох.',
        placeholder: 'Жишээ: Бизнес эрхлэгч найзууд маань санхүүгийн хяналтгүй байж дампуурдгийг хараад тэдэнд тусалмаар санагдсан...',
    },
    {
        key: 'who',
        icon: '👥',
        title: 'Who — Хэнд?',
        question: 'Хэнд үйлчилдэг? Ямар бэрхшээлийг шийдэж өгдөг вэ?',
        hint: 'Тодорхой "personas" — "бүгд" гэж хариулахгүй.',
        placeholder: 'Жишээ: 5-50 ажилтантай SME-ийн founder, CFO байхгүй, Excel-ээр санхүүгээ хянадаг...',
    },
    {
        key: 'how',
        icon: '⚙️',
        title: 'How — Хэрхэн?',
        question: 'Бусдаас юугаараа ялгардаг вэ? Ямар арга барилаар ажилладаг вэ?',
        hint: 'Sinek-ийн "How" — өвөрмөц процесс, технологи, философи.',
        placeholder: 'Жишээ: AI-аар автоматжуулсан, монгол хэлэнд орчуулсан, 1 цагт суурилдаг...',
    },
    {
        key: 'what',
        icon: '📦',
        title: 'What — Юу?',
        question: 'Юу үйлдвэрлэдэг / санал болгодог вэ?',
        hint: 'Sinek-ийн "What" — конкрет бүтээгдэхүүн / үйлчилгээ.',
        placeholder: 'Жишээ: SaaS платформ — нягтлан-аас илүү ухаалаг, цалин/татвар/тайлан бүгд нэг дор...',
    },
    {
        key: 'wifi',
        icon: '🔭',
        title: 'WIFI — Алсын хараа',
        question: '10 жилийн дараа таны компани оршин байгаагаас болж дэлхий ямар сайхан болсон байх вэ?',
        hint: '"Wouldn\'t It Be Fantastic If…" — амбициоз, үнэнч мөрөөдөл.',
        placeholder: 'Жишээ: Монголын бизнес эрхлэгчид санхүүгийн ашиггүй ажил хийхгүй, бүтээлчээр ажилладаг болсон байх...',
    },
    {
        key: 'beliefs',
        icon: '🛡️',
        title: 'Beliefs — Зарчим',
        question: 'Аль зарчмыг хэзээ ч буулт хийхгүй вэ?',
        hint: 'Соёлын суурь — үнэт зүйлийн үр.',
        placeholder: 'Жишээ: Үнэн ярих (хэрэглэгчдээ ч), хүний нууцыг хүндэтгэх, "хурдан ажил-сайн ажил" биш...',
    },
];

interface MissionVisionVariants {
    conservative: string;
    bold: string;
    inspiring: string;
}

interface DiscoveryResult {
    mission: MissionVisionVariants;
    vision: MissionVisionVariants;
    insights: string[];
    suggestedValues: string[];
}

interface DiscoveryWizardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    companyName?: string;
    industry?: string;
    onApply: (mission: string, vision: string) => void;
}

const VARIANT_META: Array<{ key: keyof MissionVisionVariants; label: string; hint: string; color: string }> = [
    { key: 'conservative', label: 'Найдвартай',  hint: 'Тогтворжсон, өргөн хүлээн зөвшөөрөгдсөн',  color: 'border-slate-300 bg-slate-50/50' },
    { key: 'bold',         label: 'Амбициоз',    hint: 'Эрсдэлтэй, ялгаатай, бүх гарчигаар',       color: 'border-orange-300 bg-orange-50/50' },
    { key: 'inspiring',    label: 'Сэтгэл хөдөлгөм', hint: 'Романтик, утга учиртай, эмзэг',         color: 'border-violet-300 bg-violet-50/50' },
];

export function DiscoveryWizardDialog({
    open, onOpenChange, companyName, industry, onApply,
}: DiscoveryWizardDialogProps) {
    const { toast } = useToast();
    const [step, setStep] = React.useState(0);
    const [answers, setAnswers] = React.useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = React.useState(false);
    const [result, setResult] = React.useState<DiscoveryResult | null>(null);
    const [missionPick, setMissionPick] = React.useState<keyof MissionVisionVariants>('bold');
    const [visionPick, setVisionPick] = React.useState<keyof MissionVisionVariants>('inspiring');

    React.useEffect(() => {
        if (!open) {
            setStep(0); setAnswers({}); setResult(null);
        }
    }, [open]);

    const currentStep = STEPS[step];
    const isLast = step === STEPS.length - 1;
    const isResultStage = result !== null;
    const totalSteps = STEPS.length;
    const progress = isResultStage ? 100 : Math.round(((step + 1) / (totalSteps + 1)) * 100);

    const canProceed = !isResultStage && (answers[currentStep.key] || '').trim().length >= 5;

    const handleNext = async () => {
        if (!canProceed) return;
        if (!isLast) {
            setStep(s => s + 1);
            return;
        }
        // Last step → generate
        setIsLoading(true);
        try {
            const res = await missionAuthFetch('/api/mission-assistant/discovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers: {
                        why: answers.why || '',
                        who: answers.who || '',
                        how: answers.how || '',
                        what: answers.what || '',
                        wifi: answers.wifi || '',
                        beliefs: answers.beliefs || '',
                    },
                    context: { companyName, industry },
                }),
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
        onApply(result.mission[missionPick], result.vision[visionPick]);
        toast({ title: 'Хэрэглэлээ', description: 'Mission + Vision талбарт оруулав.' });
        onOpenChange(false);
    };

    const handleRestart = () => {
        setResult(null);
        setStep(0);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-violet-600" />
                        Mission Discovery Wizard
                    </DialogTitle>
                    <DialogDescription>
                        {isResultStage
                            ? '3 хувилбараас сонгож, mission & vision-аа хэрэглээрэй.'
                            : `${step + 1} / ${totalSteps}-р алхам · ${currentStep.icon} ${currentStep.title}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Progress value={progress} className="h-1.5" />
                </div>

                {/* Question stage */}
                {!isResultStage && !isLoading && (
                    <div className="space-y-3 py-2">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">{currentStep.question}</h3>
                            <p className="text-xs text-slate-500 mt-1">💡 {currentStep.hint}</p>
                        </div>
                        <Textarea
                            value={answers[currentStep.key] || ''}
                            onChange={(e) => setAnswers(a => ({ ...a, [currentStep.key]: e.target.value }))}
                            placeholder={currentStep.placeholder}
                            className="min-h-[140px] resize-none"
                            autoFocus
                        />
                        <div className="text-[10px] text-slate-400 text-right">
                            {(answers[currentStep.key] || '').length} тэмдэгт
                        </div>
                    </div>
                )}

                {/* Loading */}
                {isLoading && (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                        <p className="text-sm text-slate-600">AI таны хариултуудыг боловсруулж байна…</p>
                        <p className="text-xs text-slate-400">3 хувилбар үүсгэхэд 15-30 секунд</p>
                    </div>
                )}

                {/* Result stage */}
                {isResultStage && result && !isLoading && (
                    <div className="space-y-5 py-2">
                        {/* Insights */}
                        {result.insights.length > 0 && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                                <div className="text-xs font-semibold text-amber-800 mb-1.5">🪄 AI-ийн ойлголт:</div>
                                <ul className="text-xs text-amber-900 space-y-1 list-disc pl-4">
                                    {result.insights.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* Mission variants */}
                        <div>
                            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                🎯 Эрхэм зорилго (Mission) — нэг хувилбар сонго
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {VARIANT_META.map(v => {
                                    const isPicked = missionPick === v.key;
                                    return (
                                        <button
                                            type="button"
                                            key={v.key}
                                            onClick={() => setMissionPick(v.key)}
                                            className={`text-left rounded-lg border-2 p-3 transition-all ${v.color} ${
                                                isPicked ? 'ring-2 ring-violet-500 border-violet-400' : 'hover:border-slate-400'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-slate-800">{v.label}</span>
                                                {isPicked && <Check className="h-3.5 w-3.5 text-violet-600" />}
                                            </div>
                                            <p className="text-sm text-slate-800 leading-relaxed">{result.mission[v.key]}</p>
                                            <p className="text-[10px] text-slate-500 mt-1.5">{v.hint}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Vision variants */}
                        <div>
                            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                🔭 Алсын хараа (Vision) — нэг хувилбар сонго
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {VARIANT_META.map(v => {
                                    const isPicked = visionPick === v.key;
                                    return (
                                        <button
                                            type="button"
                                            key={v.key}
                                            onClick={() => setVisionPick(v.key)}
                                            className={`text-left rounded-lg border-2 p-3 transition-all ${v.color} ${
                                                isPicked ? 'ring-2 ring-blue-500 border-blue-400' : 'hover:border-slate-400'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-slate-800">{v.label}</span>
                                                {isPicked && <Check className="h-3.5 w-3.5 text-blue-600" />}
                                            </div>
                                            <p className="text-sm text-slate-800 leading-relaxed">{result.vision[v.key]}</p>
                                            <p className="text-[10px] text-slate-500 mt-1.5">{v.hint}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Suggested values */}
                        {result.suggestedValues.length > 0 && (
                            <div className="rounded-lg border bg-slate-50 p-3">
                                <div className="text-xs font-semibold text-slate-700 mb-1.5">💎 Санал болгож буй үнэт зүйлс:</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {result.suggestedValues.map((v, i) => (
                                        <span key={i} className="text-xs px-2 py-1 rounded-md bg-white border text-slate-700">{v}</span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">⚠️ Эдгээрийг "Үнэт зүйлийн карт сонголт"-ыг ашиглан нэмж болно.</p>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                    {isResultStage ? (
                        <>
                            <Button variant="outline" type="button" onClick={handleRestart}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Эхнээс
                            </Button>
                            <Button type="button" onClick={handleApply}>
                                <Sparkles className="h-3.5 w-3.5 mr-1" /> Сонгосныг хэрэглэх
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => setStep(s => Math.max(0, s - 1))}
                                disabled={step === 0 || isLoading}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Буцах
                            </Button>
                            <Button type="button" onClick={handleNext} disabled={!canProceed || isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : isLast ? <Sparkles className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                                {isLast ? 'AI үүсгэх' : 'Цааш'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
