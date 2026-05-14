'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Loader2, AlertTriangle, UserX, Clock, XCircle, ExternalLink, CalendarRange, Baby, HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getReleaseDocumentUrl } from '@/lib/services/employee-release-service';
import type { EligibilityState, ReleaseType } from './types';

const RELEASE_TYPES: ReleaseType[] = [
    { id: 'release_company', name: 'Компанийн санаачилгаар бүрэн чөлөөлөх', icon: AlertTriangle, color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { id: 'release_employee', name: 'Ажилтны санаачилгаар бүрэн чөлөөлөх', icon: UserX, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { id: 'release_temporary', name: 'Түр чөлөөлөх', icon: Clock, color: 'bg-blue-50 text-blue-600 border-blue-100' },
];

const TEMPORARY_SUBTYPES: ReleaseType[] = [
    { id: 'release_temporary_longterm', name: 'Урт хугацааны чөлөө олгох', icon: CalendarRange, color: 'bg-sky-50 text-sky-600 border-sky-100' },
    { id: 'release_temporary_maternity', name: 'Жирэмсэн амаржсаны чөлөө олгох', icon: HeartHandshake, color: 'bg-pink-50 text-pink-600 border-pink-100' },
    { id: 'release_temporary_childcare', name: 'Хүүхэд асрах чөлөө олгох', icon: Baby, color: 'bg-violet-50 text-violet-600 border-violet-100' },
];

interface StepReleaseInfoProps {
    eligibility: EligibilityState;
    hasPendingAppointment: boolean;
    isSubmitting: boolean;
    handleCancelPendingAppointment: () => void;
    handleSelectReleaseType: (type: { id: string; name: string }) => void;
}

export function StepReleaseInfo({
    eligibility,
    hasPendingAppointment,
    isSubmitting,
    handleCancelPendingAppointment,
    handleSelectReleaseType,
}: StepReleaseInfoProps) {
    const [expandedTemporary, setExpandedTemporary] = React.useState(false);
    return (
        <ScrollArea className="h-full">
            <div className="p-8 space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <h3 className="text-lg font-bold text-slate-900">Чөлөөлөх төрөл сонгох</h3>
                    <p className="text-sm text-muted-foreground">Тохирох чөлөөлөлтийн төрлийг сонгоно уу.</p>
                </div>

                {eligibility && eligibility.allowed === false && (
                    <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-bold text-amber-900">Чөлөөлөх үйл явц аль хэдийн эхэлсэн</div>
                                <div className="text-sm text-amber-800 mt-1 font-medium">{eligibility.reason}</div>
                            </div>
                        </div>
                        {eligibility.activeReleaseDocId && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100 h-9 rounded-xl font-bold w-full"
                            >
                                <Link href={getReleaseDocumentUrl(eligibility.activeReleaseDocId)}>
                                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                    Одоо явагдаж буй баримт руу очих
                                </Link>
                            </Button>
                        )}
                    </div>
                )}

                <div className={cn(
                    "grid grid-cols-1 gap-4",
                    eligibility && eligibility.allowed === false && "opacity-40 pointer-events-none"
                )}>
                    {hasPendingAppointment && (
                        <button
                            onClick={handleCancelPendingAppointment}
                            disabled={isSubmitting}
                            className="flex items-center gap-4 p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/50 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-50 transition-all text-left group"
                        >
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 bg-amber-100 text-amber-600">
                                {isSubmitting ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <XCircle className="h-6 w-6" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-amber-900">Томилгоо цуцлах</div>
                                <div className="text-xs text-amber-700 mt-0.5">
                                    Бичиг баримт баталгаажаагүй тул шууд цуцална
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-amber-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                        </button>
                    )}

                    {hasPendingAppointment && (
                        <div className="relative flex items-center py-2">
                            <div className="flex-1 border-t border-slate-200" />
                            <span className="px-3 text-xs text-muted-foreground font-medium">эсвэл бүрэн чөлөөлөх</span>
                            <div className="flex-1 border-t border-slate-200" />
                        </div>
                    )}

                    {RELEASE_TYPES.map((type) => {
                        const isTemporary = type.id === 'release_temporary';
                        return (
                            <React.Fragment key={type.id}>
                                <button
                                    onClick={() => {
                                        if (isTemporary) {
                                            setExpandedTemporary((v) => !v);
                                            return;
                                        }
                                        handleSelectReleaseType(type);
                                    }}
                                    aria-expanded={isTemporary ? expandedTemporary : undefined}
                                    className={cn(
                                        "flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-rose-600 hover:shadow-xl hover:shadow-rose-50 transition-all text-left group",
                                        isTemporary && expandedTemporary && "border-blue-300 bg-blue-50/30"
                                    )}
                                >
                                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", type.color)}>
                                        <type.icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900">{type.name}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {isTemporary ? 'Дэд төрлүүдээс сонгоно уу' : 'Чөлөөлөх баримт үүсгэгдэх болно'}
                                        </div>
                                    </div>
                                    {isTemporary ? (
                                        <ChevronDown className={cn(
                                            "h-5 w-5 text-slate-400 transition-transform",
                                            expandedTemporary && "rotate-180 text-blue-600"
                                        )} />
                                    ) : (
                                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
                                    )}
                                </button>

                                {isTemporary && expandedTemporary && (
                                    <div className="ml-6 pl-4 border-l-2 border-blue-100 grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {TEMPORARY_SUBTYPES.map((sub) => (
                                            <button
                                                key={sub.id}
                                                onClick={() => handleSelectReleaseType(sub)}
                                                className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-100 bg-white hover:border-blue-500 hover:shadow-md transition-all text-left group"
                                            >
                                                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", sub.color)}>
                                                    <sub.icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-900 text-sm">{sub.name}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">Тушаалын загвар үүснэ</div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </ScrollArea>
    );
}
