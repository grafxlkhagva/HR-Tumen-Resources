'use client';

/**
 * VersionPickerButton — Long/Medium/Short/Micro 4 хувилбар үүсгэнэ.
 * (CopyHackers pattern — channel бүрт өөр урт)
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Layers, Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { missionAuthFetch } from './auth-fetch';

type Field = 'mission' | 'vision';

interface VersionPickerButtonProps {
    field: Field;
    text: string;
    companyName?: string;
    onApply: (selected: string) => void;
    disabled?: boolean;
}

interface VersionResult {
    versions: { long: string; medium: string; short: string; micro: string };
    coreMessage: string;
}

const VERSION_META: Array<{ key: keyof VersionResult['versions']; label: string; hint: string; color: string }> = [
    { key: 'long',   label: 'Long',   hint: '40-60 үг — вебсайт, "About"',          color: 'border-indigo-200 bg-indigo-50/40' },
    { key: 'medium', label: 'Medium', hint: '20-30 үг — email, slide footer',       color: 'border-violet-200 bg-violet-50/40' },
    { key: 'short',  label: 'Short',  hint: '8-12 үг — slide title, internal',      color: 'border-emerald-200 bg-emerald-50/40' },
    { key: 'micro',  label: 'Micro',  hint: '3-5 үг — tagline, logo lockup',        color: 'border-amber-200 bg-amber-50/40' },
];

export function VersionPickerButton({ field, text, companyName, onApply, disabled }: VersionPickerButtonProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [result, setResult] = React.useState<VersionResult | null>(null);
    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = React.useState<keyof VersionResult['versions']>('medium');

    const handleGenerate = async () => {
        if (!text || text.trim().length < 10) {
            toast({ variant: 'destructive', title: 'Эх текст хэрэгтэй', description: 'Хамгийн багадаа 10 тэмдэгт оруулна уу.' });
            return;
        }
        setIsLoading(true);
        try {
            const res = await missionAuthFetch('/api/mission-assistant/multi-version', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, source: text, context: { companyName } }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'AI алдаа');
            setResult(data);
            setOpen(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Үүсгэж чадсангүй', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (result) {
            onApply(result.versions[selected]);
            toast({ title: 'Хэрэглэлээ', description: `${VERSION_META.find(v => v.key === selected)?.label} хувилбарыг сонголоо.` });
        }
        setOpen(false);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Хуулагдлаа' });
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={disabled || isLoading || !text}
                className="gap-1.5 h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Layers className="h-3 w-3" />}
                4 хувилбар
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-emerald-600" />
                            4 уртын хувилбар
                        </DialogTitle>
                        <DialogDescription>
                            Channel бүрт зориулсан өөр урттай хувилбарыг сонгоно уу.
                        </DialogDescription>
                    </DialogHeader>

                    {result && (
                        <div className="space-y-3">
                            {result.coreMessage && (
                                <div className="rounded-md bg-slate-50 border px-3 py-2 text-xs text-slate-600">
                                    <span className="font-medium">Гол санаа:</span> {result.coreMessage}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {VERSION_META.map(v => {
                                    const isSelected = selected === v.key;
                                    const value = result.versions[v.key];
                                    const wordCount = value.split(/\s+/).length;
                                    return (
                                        <button
                                            type="button"
                                            key={v.key}
                                            onClick={() => setSelected(v.key)}
                                            className={`text-left rounded-lg border-2 p-3 transition-all ${v.color} ${
                                                isSelected ? 'ring-2 ring-emerald-500 border-emerald-400' : 'hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-800">{v.label}</span>
                                                    <span className="ml-2 text-[10px] text-slate-500">{wordCount} үг</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                                                    <span
                                                        role="button"
                                                        onClick={(e) => { e.stopPropagation(); handleCopy(value); }}
                                                        className="p-1 rounded hover:bg-white/60"
                                                    >
                                                        <Copy className="h-3 w-3 text-slate-500" />
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-700 leading-relaxed">{value}</p>
                                            <p className="text-[10px] text-slate-500 mt-1.5">{v.hint}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Хаах
                        </Button>
                        <Button type="button" onClick={handleApply}>
                            <Check className="h-4 w-4 mr-1" />
                            "{VERSION_META.find(v => v.key === selected)?.label}"-ыг хэрэглэх
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
