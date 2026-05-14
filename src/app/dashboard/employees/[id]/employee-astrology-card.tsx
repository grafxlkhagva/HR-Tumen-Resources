'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { buildAstrologyProfile, type AstrologyProfile } from '@/lib/astrology';
import { Sparkles, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
    birthDate?: string | Date | any; // Firestore Timestamp ч байж болно
}

function parseBirthDate(raw: any): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === 'string') {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
    }
    // Firestore Timestamp
    if (typeof raw === 'object' && 'seconds' in raw) {
        return new Date(raw.seconds * 1000);
    }
    return null;
}

const TABS = ['western', 'chinese', 'lifepath'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
    western: '♈ Баруун',
    chinese: '🐉 Хятад',
    lifepath: '🔢 Тоот',
};

export function EmployeeAstrologyCard({ birthDate }: Props) {
    const [expanded, setExpanded] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<Tab>('western');

    const date = parseBirthDate(birthDate);
    const profile: AstrologyProfile | null = React.useMemo(
        () => (date ? buildAstrologyProfile(date) : null),
        [date]
    );

    if (!profile) {
        return (
            <div className="bg-white rounded-2xl border px-5 py-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center text-lg shrink-0">🔭</div>
                <div>
                    <p className="text-sm font-bold text-slate-700">Зурхай</p>
                    <p className="text-xs text-slate-400">
                        Зурхай харахын тулд анкетийн <span className="font-medium text-slate-600">төрсөн огноо</span>-г бөглөнө үү.
                    </p>
                </div>
            </div>
        );
    }

    const { western, chinese, lifePath, lifePathCalc } = profile;

    const formattedDate = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        : '';

    return (
        <div className="bg-white rounded-2xl border overflow-hidden">
            {/* Header — always visible */}
            <button
                type="button"
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center text-lg">
                        🔭
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">Зурхай</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-200 text-violet-600 bg-violet-50">
                                3 систем
                            </Badge>
                        </div>
                        {/* Summary chips */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-slate-500">
                                {western.symbol} {western.nameEn}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs text-slate-500">
                                {chinese.symbol} {chinese.name}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs text-slate-500">
                                {lifePath.symbol} {lifePath.name}
                            </span>
                        </div>
                    </div>
                </div>
                {expanded
                    ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                }
            </button>

            {expanded && (
                <div className="border-t">
                    {/* Tabs */}
                    <div className="flex border-b px-4 pt-1 gap-1">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    'px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors',
                                    activeTab === tab
                                        ? 'text-violet-700 border-b-2 border-violet-500 bg-violet-50/50'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                )}
                            >
                                {TAB_LABELS[tab]}
                            </button>
                        ))}
                    </div>

                    <div className="p-5">
                        {activeTab === 'western' && (
                            <WesternPanel sign={western} />
                        )}
                        {activeTab === 'chinese' && (
                            <ChinesePanel sign={chinese} birthYear={date?.getFullYear()} />
                        )}
                        {activeTab === 'lifepath' && (
                            <LifePathPanel info={lifePath} calc={lifePathCalc} birthDate={formattedDate} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Western Panel ────────────────────────────────────────────────────────────
function WesternPanel({ sign }: { sign: AstrologyProfile['western'] }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex items-center justify-center text-3xl shrink-0">
                    {sign.symbol}
                </div>
                <div>
                    <h4 className="text-base font-bold text-slate-900">{sign.name}</h4>
                    <p className="text-xs text-slate-500">{sign.dateRange} · {sign.element} · {sign.ruling}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {sign.traits.map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{t}</Badge>
                        ))}
                    </div>
                </div>
            </div>

            <InfoSection title="💪 Давуу тал" items={sign.strengths} color="emerald" />
            <InfoSection title="⚠️ Сул тал" items={sign.weaknesses} color="rose" />

            <div className="space-y-2">
                <InfoRow label="🏢 Ажлын хэв маяг" value={sign.workStyle} />
                <InfoRow label="👥 Багийн үүрэг" value={sign.teamRole} />
                <InfoRow label="🎯 Урамшуулагч зүйл" value={sign.motivation} />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1">💡 Зөвлөмж</p>
                <p className="text-xs text-blue-700 leading-relaxed">{sign.advice}</p>
            </div>
        </div>
    );
}

// ─── Chinese Panel ────────────────────────────────────────────────────────────
function ChinesePanel({ sign, birthYear }: { sign: AstrologyProfile['chinese']; birthYear?: number }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 flex items-center justify-center text-3xl shrink-0">
                    {sign.symbol}
                </div>
                <div>
                    <h4 className="text-base font-bold text-slate-900">{sign.name}</h4>
                    <p className="text-xs text-slate-500">{sign.element} · {sign.yin_yang}</p>
                    {birthYear && (
                        <p className="text-xs text-slate-400 mt-0.5">
                            {sign.years.filter(y => y >= birthYear - 12 && y <= birthYear + 12).join(', ')} ...
                        </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {sign.traits.map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-red-200">{t}</Badge>
                        ))}
                    </div>
                </div>
            </div>

            <InfoSection title="💪 Давуу тал" items={sign.strengths} color="emerald" />
            <InfoSection title="⚠️ Сул тал" items={sign.weaknesses} color="rose" />

            <div className="space-y-2">
                <InfoRow label="🏢 Ажлын хэв маяг" value={sign.workStyle} />
                <InfoRow label="👥 Багийн үүрэг" value={sign.teamRole} />
                <InfoRow label="🎯 Урамшуулагч зүйл" value={sign.motivation} />
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-800 mb-1">💡 Зөвлөмж</p>
                <p className="text-xs text-red-700 leading-relaxed">{sign.advice}</p>
            </div>
        </div>
    );
}

// ─── Life Path Panel ──────────────────────────────────────────────────────────
function LifePathPanel({ info, calc, birthDate }: { info: AstrologyProfile['lifePath']; calc: string; birthDate: string }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-black text-violet-600">{info.number}</span>
                </div>
                <div>
                    <h4 className="text-base font-bold text-slate-900">{info.name}</h4>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <p className="text-xs text-slate-400 mt-0.5 cursor-help flex items-center gap-1">
                                    Тооцоо: {info.symbol} <Info className="h-3 w-3" />
                                </p>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs font-mono">{birthDate}: {calc}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {info.traits.map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200">{t}</Badge>
                        ))}
                    </div>
                </div>
            </div>

            <InfoSection title="💪 Давуу тал" items={info.strengths} color="emerald" />
            <InfoSection title="⚠️ Сул тал" items={info.weaknesses} color="rose" />

            <div className="space-y-2">
                <InfoRow label="🏢 Ажлын хэв маяг" value={info.workStyle} />
                <InfoRow label="👥 Багийн үүрэг" value={info.teamRole} />
                <InfoRow label="🎯 Урамшуулагч зүйл" value={info.motivation} />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Тохиромжтой карьер</p>
                <div className="flex flex-wrap gap-1.5">
                    {info.idealCareers.map(c => (
                        <Badge key={c} variant="outline" className="text-[10px] text-slate-600">{c}</Badge>
                    ))}
                </div>
            </div>

            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-violet-800 mb-1">💡 Зөвлөмж</p>
                <p className="text-xs text-violet-700 leading-relaxed">{info.advice}</p>
            </div>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InfoSection({ title, items, color }: { title: string; items: string[]; color: 'emerald' | 'rose' }) {
    const cls = color === 'emerald'
        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
        : 'bg-rose-50 border-rose-100 text-rose-700';
    return (
        <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{title}</p>
            <div className="flex flex-wrap gap-1.5">
                {items.map(item => (
                    <span key={item} className={cn('text-xs px-2 py-0.5 rounded-full border', cls)}>{item}</span>
                ))}
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-xs text-slate-700 leading-relaxed">{value}</p>
        </div>
    );
}
