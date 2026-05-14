'use client';

/**
 * CultureDocDialog — AI-аар бүхэл бүтэн соёлын баримт бичиг (Culture Document)
 * үүсгэх + tab-аар үзэх + Firestore-д хадгалах + .md файл татах.
 *
 * Загвар: Netflix/GitLab/HubSpot Culture Code patterns.
 */

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, Save, Download, Sparkles, FileText, AlertTriangle, Pencil, X, Plus, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { missionAuthFetch } from './auth-fetch';

interface ValueItem {
    name: string;
    emoji?: string;
    color?: string;
    description?: string;
    doExample?: string;
    dontExample?: string;
}

interface CultureDocSection {
    id: string;
    title: string;
    markdown: string;
}

interface CultureDocResult {
    title: string;
    tagline: string;
    summary: string;
    principles: string[];
    sections: CultureDocSection[];
    generatedAt: string;
}

interface CultureDocDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mission: string;
    vision: string;
    values: ValueItem[];
    companyName?: string;
    industry?: string;
    /** Хадгалсан doc байвал — generation алгасаж шууд харуулах/засах */
    existingDoc?: CultureDocResult | null;
    onSave?: (doc: CultureDocResult) => Promise<void>;
}

export function CultureDocDialog({
    open, onOpenChange, mission, vision, values, companyName, industry, existingDoc, onSave,
}: CultureDocDialogProps) {
    const { toast } = useToast();
    const [stage, setStage] = React.useState<'loading' | 'review' | 'error'>('loading');
    const [doc, setDoc] = React.useState<CultureDocResult | null>(null);
    const [activeTab, setActiveTab] = React.useState<string>('summary');
    const [isSaving, setIsSaving] = React.useState(false);
    const [editMode, setEditMode] = React.useState(false);
    const abortRef = React.useRef<AbortController | null>(null);

    const generate = React.useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setStage('loading');
        (async () => {
            try {
                const res = await missionAuthFetch('/api/mission-assistant/culture-doc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mission, vision, values, companyName, industry }),
                    signal: abortRef.current?.signal,
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'AI алдаа');
                setDoc(data);
                setStage('review');
                setEditMode(false);
            } catch (e: any) {
                if (e.name === 'AbortError') return;
                toast({ variant: 'destructive', title: 'Үүсгэж чадсангүй', description: e.message });
                setStage('error');
            }
        })();
    }, [mission, vision, values, companyName, industry, toast]);

    React.useEffect(() => {
        if (!open) {
            setStage('loading'); setDoc(null); setActiveTab('summary'); setEditMode(false);
            abortRef.current?.abort();
            return;
        }
        // Guard
        if (mission.trim().length < 20 || vision.trim().length < 15 || values.length < 3) {
            toast({
                variant: 'destructive',
                title: 'Шаардлага хангахгүй',
                description: 'Mission (≥20), Vision (≥15) ба 3+ үнэт зүйл шаардлагатай.',
            });
            onOpenChange(false);
            return;
        }
        // Хадгалсан doc байвал — шууд review-д аваачих, generate-ээс зайлсхийнэ
        if (existingDoc && existingDoc.sections?.length) {
            setDoc(existingDoc);
            setStage('review');
            return;
        }
        // Үгүй бол шинээр үүсгэнэ
        generate();
        return () => abortRef.current?.abort();
    }, [open]);

    const handleSave = async () => {
        if (!doc || !onSave) return;
        setIsSaving(true);
        try {
            await onSave(doc);
            toast({ title: 'Хадгаллаа', description: 'Соёлын баримт байгуулагын профайлд орлоо.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Хадгалж чадсангүй', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = () => {
        if (!doc) return;
        const md = [
            `# ${doc.title}`,
            doc.tagline ? `*${doc.tagline}*` : '',
            '',
            doc.summary ? `## Хураангуй\n\n${doc.summary}` : '',
            '',
            doc.principles.length > 0 ? `## Гол зарчим\n\n${doc.principles.map(p => `- ${p}`).join('\n')}` : '',
            '',
            ...doc.sections.map(s => `## ${s.title}\n\n${s.markdown}`),
            '',
            `---\nҮүсгэсэн: ${new Date(doc.generatedAt).toLocaleString('mn-MN')}`,
        ].filter(Boolean).join('\n');
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(doc.title || 'culture').replace(/\s+/g, '-')}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Татаж авлаа' });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        Соёлын баримт бичиг (Culture Document)
                    </DialogTitle>
                    <DialogDescription>
                        {stage === 'loading' && 'AI таны Mission/Vision/Values дээр тулгуурлан 8 хэсэгтэй соёлын баримт боловсруулж байна.'}
                        {stage === 'review' && (editMode ? '✏️ Засварын горим — гар аар засаад хадгална уу.' : 'Хэсэг бүрийг шалгаад "Засах", "Хадгалах" эсвэл .md татаж аваарай.')}
                        {stage === 'error' && 'Үүсгэх явцад алдаа гарлаа.'}
                    </DialogDescription>
                </DialogHeader>

                {stage === 'loading' && (
                    <div className="py-16 flex flex-col items-center justify-center gap-3 flex-1">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                        <p className="text-sm text-slate-700 font-medium">Соёлын баримт боловсруулж байна…</p>
                        <p className="text-xs text-slate-500 text-center max-w-md">
                            8 хэсэг (origin, values, decisions, communication, celebrate, non-negotiables, for-hires, for-leaders) — Netflix/GitLab Handbook загварын дагуу.
                        </p>
                        <p className="text-xs text-slate-400">⏱ 60-120 секунд хүлээгдэнэ</p>
                        <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)} className="mt-2 h-7 text-xs">
                            Цуцлах
                        </Button>
                    </div>
                )}

                {stage === 'error' && (
                    <div className="py-16 flex flex-col items-center justify-center gap-3 flex-1">
                        <AlertTriangle className="h-10 w-10 text-amber-500" />
                        <p className="text-sm text-slate-700">Дахин оролдоно уу</p>
                        <Button onClick={() => onOpenChange(false)} variant="outline" size="sm">Хаах</Button>
                    </div>
                )}

                {stage === 'review' && doc && (
                    <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
                        {/* Title block */}
                        <div className="rounded-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                            {editMode ? (
                                <div className="space-y-2">
                                    <Input
                                        value={doc.title}
                                        onChange={(e) => setDoc({ ...doc, title: e.target.value })}
                                        className="font-bold text-lg"
                                        placeholder="Соёлын баримтын нэр"
                                    />
                                    <Input
                                        value={doc.tagline}
                                        onChange={(e) => setDoc({ ...doc, tagline: e.target.value })}
                                        placeholder="Tagline (1 өгүүлбэр)"
                                        className="text-sm italic"
                                    />
                                    <Textarea
                                        value={doc.summary}
                                        onChange={(e) => setDoc({ ...doc, summary: e.target.value })}
                                        placeholder="Хураангуй (2-3 өгүүлбэр)"
                                        className="text-xs min-h-[60px] resize-none"
                                    />
                                </div>
                            ) : (
                                <>
                                    <h2 className="text-lg font-bold text-slate-900">{doc.title}</h2>
                                    {doc.tagline && <p className="text-sm text-indigo-700 italic mt-1">"{doc.tagline}"</p>}
                                    {doc.summary && <p className="text-xs text-slate-700 mt-2 leading-relaxed">{doc.summary}</p>}
                                </>
                            )}
                        </div>

                        {/* Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                            <div className="overflow-x-auto -mx-1 px-1">
                                <TabsList className="inline-flex w-auto">
                                    <TabsTrigger value="summary" className="text-xs">📋 Хураангуй</TabsTrigger>
                                    {doc.sections.map(s => (
                                        <TabsTrigger key={s.id} value={s.id} className="text-xs whitespace-nowrap">
                                            {s.title}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 mt-2">
                                <TabsContent value="summary" className="mt-0 space-y-3">
                                    <div className="rounded-lg border bg-white p-4">
                                        <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                                            <Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Гол зарчмууд
                                        </h3>
                                        {editMode ? (
                                            <div className="space-y-1.5">
                                                {doc.principles.map((p, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                                                        <Input
                                                            value={p}
                                                            onChange={(e) => {
                                                                const next = [...doc.principles];
                                                                next[i] = e.target.value;
                                                                setDoc({ ...doc, principles: next });
                                                            }}
                                                            className="h-8 text-sm"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 shrink-0"
                                                            onClick={() => setDoc({ ...doc, principles: doc.principles.filter((_, j) => j !== i) })}
                                                        >
                                                            <X className="h-3.5 w-3.5 text-slate-400" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs gap-1 mt-1"
                                                    onClick={() => setDoc({ ...doc, principles: [...doc.principles, ''] })}
                                                >
                                                    <Plus className="h-3 w-3" /> Зарчим нэмэх
                                                </Button>
                                            </div>
                                        ) : (
                                            <ol className="text-sm text-slate-700 space-y-1.5 list-decimal pl-5">
                                                {doc.principles.map((p, i) => <li key={i}>{p}</li>)}
                                            </ol>
                                        )}
                                    </div>
                                    <div className="rounded-lg border bg-white p-4">
                                        <h3 className="text-sm font-semibold text-slate-900 mb-2">Хэсгийн жагсаалт</h3>
                                        <ul className="text-xs text-slate-700 space-y-1">
                                            {doc.sections.map(s => (
                                                <li key={s.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveTab(s.id)}
                                                        className="hover:text-indigo-600 underline-offset-2 hover:underline"
                                                    >
                                                        {s.title}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </TabsContent>

                                {doc.sections.map((s, idx) => (
                                    <TabsContent key={s.id} value={s.id} className="mt-0">
                                        <div className="rounded-lg border bg-white p-4">
                                            {editMode ? (
                                                <>
                                                    <Input
                                                        value={s.title}
                                                        onChange={(e) => {
                                                            const next = [...doc.sections];
                                                            next[idx] = { ...s, title: e.target.value };
                                                            setDoc({ ...doc, sections: next });
                                                        }}
                                                        className="font-semibold mb-2"
                                                    />
                                                    <Textarea
                                                        value={s.markdown}
                                                        onChange={(e) => {
                                                            const next = [...doc.sections];
                                                            next[idx] = { ...s, markdown: e.target.value };
                                                            setDoc({ ...doc, sections: next });
                                                        }}
                                                        className="min-h-[400px] text-sm font-mono"
                                                        placeholder="Markdown агуулга (## subheaders, **bold**, - bullets)…"
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {s.markdown.length} тэмдэгт · Markdown ашиглаж болно
                                                    </p>
                                                </>
                                            ) : (
                                                <div className="prose prose-sm prose-slate max-w-none prose-headings:font-semibold prose-headings:text-slate-900 prose-p:leading-relaxed prose-p:text-slate-700">
                                                    <h2 className="!mt-0 !text-base">{s.title}</h2>
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {s.markdown}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                ))}
                            </div>
                        </Tabs>
                    </div>
                )}

                <DialogFooter className="border-t pt-3 flex-wrap gap-2 sm:justify-between">
                    {stage === 'review' && doc && (
                        <>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant={editMode ? 'default' : 'outline'}
                                    type="button"
                                    onClick={() => setEditMode(e => !e)}
                                    size="sm"
                                    className="h-8"
                                >
                                    <Pencil className="h-3.5 w-3.5 mr-1" />
                                    {editMode ? 'Засаж дууслаа' : 'Засах'}
                                </Button>
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => {
                                        if (confirm('AI-аар бүхэлд нь дахин үүсгэх үү? Одоогийн засвар алга болно.')) {
                                            generate();
                                        }
                                    }}
                                    size="sm"
                                    className="h-8"
                                    title="AI-аар дахин үүсгэх (одоогийн агуулгыг дарж бичнэ)"
                                >
                                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Дахин AI
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" type="button" onClick={handleDownload} size="sm" className="h-8">
                                    <Download className="h-3.5 w-3.5 mr-1" /> .md
                                </Button>
                                {onSave && (
                                    <Button type="button" onClick={handleSave} disabled={isSaving} size="sm" className="h-8">
                                        {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                                        Хадгалах
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
