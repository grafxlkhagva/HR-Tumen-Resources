'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, Briefcase, UserPlus, Zap } from 'lucide-react';
import type { Position } from '../../../types';
import type { PreparationStatus } from '../../../positions/hooks/use-position-preparation-status';

export interface AppointmentChoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    position: Position | null;
    prepStatus: PreparationStatus;
    onChoosePreparation: () => void;
    onChooseQuickAppoint: () => void;
}

/**
 * Бэлтгэл дуусаагүй ажлын байранд томилгоо хийх үед нээгдэнэ.
 * - `none` → "Ажлын байр бэлтгэх" + "Шуурхай томилгоо"
 * - `in_progress` → "Бэлтгэл үргэлжлүүлэх" (progress-тай) + "Шуурхай томилгоо"
 * - `completed` → caller энэ dialog-ийг нээлгүйгээр шууд `AppointEmployeeDialog` рүү шилжинэ.
 */
export function AppointmentChoiceDialog({
    open,
    onOpenChange,
    position,
    prepStatus,
    onChoosePreparation,
    onChooseQuickAppoint,
}: AppointmentChoiceDialogProps) {
    const [confirmQuick, setConfirmQuick] = React.useState(false);

    React.useEffect(() => {
        if (!open) setConfirmQuick(false);
    }, [open]);

    const isApproved = position?.isApproved !== false;
    const isInProgress = prepStatus.state === 'in_progress';
    const progressPct =
        isInProgress && prepStatus.total > 0
            ? Math.round((prepStatus.done / prepStatus.total) * 100)
            : 0;

    const prepLabel = isInProgress ? 'Бэлтгэл үргэлжлүүлэх' : 'Ажлын байр бэлтгэх';
    const prepSubLabel = isInProgress
        ? `Дутуу ${prepStatus.total - prepStatus.done}/${prepStatus.total} таск`
        : 'Бэлтгэлийн шат, таскуудыг эхлүүлнэ';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] rounded-3xl border-none shadow-premium p-0 overflow-hidden gap-0">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/5 to-background border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">
                                Томилгооны урсгал сонгох
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                <span className="font-semibold text-foreground">"{position?.title}"</span> ажлын байр
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-3">
                    {!confirmQuick ? (
                        <>
                            {isInProgress && (
                                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-indigo-900">
                                            Бэлтгэлийн явц
                                        </span>
                                        <span className="text-xs font-bold text-indigo-900">
                                            {prepStatus.done}/{prepStatus.total}
                                        </span>
                                    </div>
                                    <Progress value={progressPct} className="h-1.5" />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={onChoosePreparation}
                                className="w-full rounded-2xl border-2 border-indigo-200 hover:border-indigo-400 bg-white hover:bg-indigo-50 p-4 text-left transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                        <Briefcase className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900">{prepLabel}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{prepSubLabel}</p>
                                    </div>
                                </div>
                            </button>

                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={!isApproved}
                                            onClick={() => setConfirmQuick(true)}
                                            className="w-full rounded-2xl border-2 border-amber-200 hover:border-amber-400 bg-white hover:bg-amber-50 p-4 text-left transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-amber-200 disabled:hover:bg-white"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                    <Zap className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-slate-900">Шуурхай томилгоо</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">Бэлтгэлгүйгээр шууд томилно</p>
                                                </div>
                                            </div>
                                        </button>
                                    </TooltipTrigger>
                                    {!isApproved && (
                                        <TooltipContent>
                                            <span className="text-xs">Ажлын байр батлагдаагүй байна</span>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </>
                    ) : (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-amber-900">
                                        Шуурхай томилгоо хийх үү?
                                    </p>
                                    <p className="text-xs text-amber-800 leading-relaxed">
                                        Ажлын байрны бэлтгэлийг алгасаж томилгоо хийх гэж байна. Ажлын
                                        орчин, эрх нэвтрэлт, баримт бичиг гэх мэт бэлтгэлийн таскууд дутуу
                                        байж болно — дараа нь гараар нөхөх шаардлагатай.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50/50">
                    {!confirmQuick ? (
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
                            Болих
                        </Button>
                    ) : (
                        <div className="flex w-full gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl"
                                onClick={() => setConfirmQuick(false)}
                            >
                                Буцах
                            </Button>
                            <Button
                                className="flex-[2] rounded-xl bg-amber-500 hover:bg-amber-600"
                                onClick={() => {
                                    setConfirmQuick(false);
                                    onChooseQuickAppoint();
                                }}
                            >
                                <Zap className="h-4 w-4 mr-1" />
                                Үргэлжлүүлэх
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
