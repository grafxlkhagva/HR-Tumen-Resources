'use client';

/**
 * MissionAiBanner — хуудасны дээр гарч ирэх AI агентын зар.
 * (StrategyBanner-тай ижил pattern.)
 */

import * as React from 'react';
import { Sparkles, ChevronRight, Mic } from 'lucide-react';
import { NegeAiIcon } from '@/components/icons/nege-ai-icon';

interface MissionAiBannerProps {
    onOpenWizard?: () => void;
    onOpenFreeTalk?: () => void;
    hasContent: boolean;
}

export function MissionAiBanner({ onOpenWizard, onOpenFreeTalk, hasContent }: MissionAiBannerProps) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-4 shadow-sm">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-blue-200/30 blur-3xl" />

            <div className="relative flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-md shrink-0">
                    <NegeAiIcon className="h-5 w-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-sm font-semibold text-slate-900">
                            Mission AI Coach
                        </h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">BETA</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {hasContent
                            ? 'Текст бүрийн хажууд ✨ AI сайжруулах · 📊 үнэлэх · 🔄 4 хувилбар товчнуудыг ашиглаарай.'
                            : '5 алхамт ярилцлагаар 5 минутад мэргэжлийн Mission/Vision/Values боловсруул.'}
                    </p>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                    {onOpenFreeTalk && (
                        <button
                            type="button"
                            onClick={onOpenFreeTalk}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 shadow-sm hover:bg-rose-50 transition"
                        >
                            <Mic className="h-3 w-3" />
                            Чөлөөт яриа
                        </button>
                    )}
                    {onOpenWizard && (
                        <button
                            type="button"
                            onClick={onOpenWizard}
                            className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
                        >
                            <Sparkles className="h-3 w-3" />
                            Wizard
                            <ChevronRight className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
