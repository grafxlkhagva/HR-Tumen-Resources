'use client';

/**
 * ValuesCardSortDialog — 40 AI үнэт зүйлийн картыг 3 баганад ангилж,
 * сонгосон 3-7-д нь behavior example нэмж form-д оруулна.
 * (Workshop "Attribute Listing Card Sort" — Big Bang Partnership pattern)
 */

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Check, RefreshCw, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { missionAuthFetch } from './auth-fetch';

interface ValueCard {
    name: string;
    emoji: string;
    color: string;
    description: string;
}

interface ElaboratedValue extends ValueCard {
    doExample?: string;
    dontExample?: string;
}

type Bucket = 'unsorted' | 'must' | 'maybe' | 'no';

interface ValuesCardSortDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mission?: string;
    vision?: string;
    companyName?: string;
    industry?: string;
    onApply: (values: ElaboratedValue[]) => void;
}

export function ValuesCardSortDialog({
    open, onOpenChange, mission, vision, companyName, industry, onApply,
}: ValuesCardSortDialogProps) {
    const { toast } = useToast();
    const [stage, setStage] = React.useState<'loading' | 'sort' | 'elaborating' | 'review'>('loading');
    const [cards, setCards] = React.useState<ValueCard[]>([]);
    const [buckets, setBuckets] = React.useState<Record<string, Bucket>>({});
    const [elaborated, setElaborated] = React.useState<ElaboratedValue[]>([]);

    React.useEffect(() => {
        if (!open) {
            setStage('loading'); setCards([]); setBuckets({}); setElaborated([]);
            return;
        }
        // Guard: Mission + Vision заавал бөглөгдсөн байх
        const m = (mission || '').trim();
        const v = (vision || '').trim();
        if (m.length < 20 || v.length < 15) {
            toast({
                variant: 'destructive',
                title: 'Эхлээд Mission + Vision-аа тодорхойлно уу',
                description: 'AI үнэт зүйлийн картыг компанийн Эрхэм зорилго & Алсын хараанд тулгуурлан үүсгэдэг.',
            });
            onOpenChange(false);
            return;
        }
        // Load cards on open
        (async () => {
            try {
                const res = await missionAuthFetch('/api/mission-assistant/values/card-bank', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mission: m, vision: v, companyName, industry }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'AI алдаа');
                setCards(data.values);
                setBuckets(Object.fromEntries((data.values as ValueCard[]).map(v => [v.name, 'unsorted'])));
                setStage('sort');
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Картууд ачаалж чадсангүй', description: e.message });
                onOpenChange(false);
            }
        })();
    }, [open]);

    const setBucket = (name: string, bucket: Bucket) => {
        setBuckets(b => ({ ...b, [name]: bucket }));
    };

    const mustCount = Object.values(buckets).filter(b => b === 'must').length;

    const handleElaborate = async () => {
        const selected = cards.filter(c => buckets[c.name] === 'must');
        if (selected.length < 3) {
            toast({ variant: 'destructive', title: 'Хамгийн багадаа 3 үнэт зүйл сонгоно уу' });
            return;
        }
        if (selected.length > 7) {
            toast({ variant: 'destructive', title: 'Хамгийн ихдээ 7 үнэт зүйл сонгоно уу' });
            return;
        }
        setStage('elaborating');
        try {
            const res = await missionAuthFetch('/api/mission-assistant/values/elaborate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    values: selected.map(s => ({ name: s.name, emoji: s.emoji, color: s.color })),
                    mission, companyName,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI алдаа');
            const merged: ElaboratedValue[] = selected.map(s => {
                const e = (data.values || []).find((x: any) => x.name === s.name);
                return { ...s, description: e?.description || s.description, doExample: e?.doExample, dontExample: e?.dontExample };
            });
            setElaborated(merged);
            setStage('review');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Дэлгэрэнгүй үүсгэж чадсангүй', description: e.message });
            setStage('sort');
        }
    };

    const handleApply = () => {
        onApply(elaborated);
        toast({ title: 'Үнэт зүйл нэмэгдлээ', description: `${elaborated.length} үнэт зүйл form-д орлоо.` });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        Үнэт зүйлийн карт сонголт
                    </DialogTitle>
                    <DialogDescription>
                        {stage === 'sort' && 'Картуудыг "Заавал / Магадгүй / Биш" гэж ангилаад 3-7 заавал сонгоно уу.'}
                        {stage === 'elaborating' && 'AI зан төлөвийн жишээ үүсгэж байна…'}
                        {stage === 'review' && 'Үнэт зүйлсийн дэлгэрэнгүйг хянаад form-д нэмнэ үү.'}
                    </DialogDescription>
                </DialogHeader>

                {stage === 'loading' && (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                        <p className="text-sm text-slate-600">AI 24 үнэт зүйлийн карт үүсгэж байна…</p>
                        <p className="text-xs text-slate-400">Танай Mission/Vision-д тохирсон карт боловсруулахад 20-40 секунд</p>
                        <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)} className="mt-2 h-7 text-xs">
                            Цуцлах
                        </Button>
                    </div>
                )}

                {stage === 'sort' && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 font-medium">Заавал: {mustCount}/7</span>
                            <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-700 font-medium">Магадгүй: {Object.values(buckets).filter(b => b === 'maybe').length}</span>
                            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-medium">Ангилагдаагүй: {Object.values(buckets).filter(b => b === 'unsorted').length}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto pr-1">
                            {cards.map(card => {
                                const bucket = buckets[card.name];
                                if (bucket === 'no') return null;
                                const opacity = bucket === 'maybe' ? 'opacity-60' : '';
                                return (
                                    <div
                                        key={card.name}
                                        className={`rounded-lg p-3 bg-white transition-all ${opacity}`}
                                        style={{
                                            borderTop: `2px solid ${bucket === 'must' ? card.color : '#e5e7eb'}`,
                                            borderRight: `2px solid ${bucket === 'must' ? card.color : '#e5e7eb'}`,
                                            borderBottom: `2px solid ${bucket === 'must' ? card.color : '#e5e7eb'}`,
                                            borderLeft: `${bucket === 'must' ? '4px' : '2px'} solid ${card.color}`,
                                        }}
                                    >
                                        <div className="flex items-start gap-2 mb-2">
                                            <span className="text-xl shrink-0">{card.emoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-slate-900">{card.name}</div>
                                                <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{card.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setBucket(card.name, 'must')}
                                                className={`flex-1 text-[10px] px-1.5 py-1 rounded font-medium transition ${
                                                    bucket === 'must' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                }`}
                                            >
                                                ✓ Заавал
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBucket(card.name, 'maybe')}
                                                className={`flex-1 text-[10px] px-1.5 py-1 rounded font-medium transition ${
                                                    bucket === 'maybe' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                }`}
                                            >
                                                ~ Магадгүй
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBucket(card.name, 'no')}
                                                className="text-[10px] px-1.5 py-1 rounded font-medium bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-700 transition"
                                                title="Хасах"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {stage === 'elaborating' && (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                        <p className="text-sm text-slate-600">AI зан төлөвийн жишээ боловсруулж байна…</p>
                    </div>
                )}

                {stage === 'review' && (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                        {elaborated.map((v, i) => (
                            <div key={i} className="rounded-lg p-3 bg-white border-2 border-slate-200" style={{ borderLeft: `4px solid ${v.color}` }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{v.emoji}</span>
                                    <span className="font-semibold text-sm">{v.name}</span>
                                </div>
                                <p className="text-xs text-slate-700 mb-2">{v.description}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                    {v.doExample && (
                                        <div className="rounded bg-emerald-50 border border-emerald-100 px-2 py-1.5 text-emerald-800">
                                            {v.doExample}
                                        </div>
                                    )}
                                    {v.dontExample && (
                                        <div className="rounded bg-red-50 border border-red-100 px-2 py-1.5 text-red-800">
                                            {v.dontExample}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    {stage === 'sort' && (
                        <>
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                            <Button type="button" onClick={handleElaborate} disabled={mustCount < 3}>
                                <Sparkles className="h-3.5 w-3.5 mr-1" /> Сонгосон ({mustCount}) дэлгэрүүлэх
                            </Button>
                        </>
                    )}
                    {stage === 'review' && (
                        <>
                            <Button variant="outline" type="button" onClick={() => setStage('sort')}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Сонголт өөрчлөх
                            </Button>
                            <Button type="button" onClick={handleApply}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Form-д нэмэх
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
