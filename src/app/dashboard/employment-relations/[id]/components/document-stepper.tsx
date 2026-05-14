'use client';

/**
 * DocumentStepper
 * ─────────────────────────────────────────────────────────────────────
 * ER баримтын явцын progress үе шат visualizer.
 * `[id]/page.tsx`-аас Phase 3.2 extraction үед тусдаа компонент болгов.
 *
 * Status machine-ийн happy path: DRAFT → IN_REVIEW → REVIEWED → APPROVED
 * → SIGNED → SENT_TO_EMPLOYEE → ACKNOWLEDGED. APPROVED болон SIGNED нь UI
 * дээр нэг "Баталгаажсан" шатанд нийлнэ. REJECTED нь DRAFT руу буцна гэж
 * visual-р харуулна.
 */

import * as React from 'react';
import { Check, Circle, Clock, CheckCircle2, FileText, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentStatus } from '../../types';

const STEPS = [
    { id: 'DRAFT', label: 'Төлөвлөх', icon: Circle, color: 'text-slate-400' },
    { id: 'IN_REVIEW', label: 'Хянах', icon: Clock, color: 'text-amber-500' },
    { id: 'REVIEWED', label: 'Хянагдсан', icon: CheckCircle2, color: 'text-blue-500' },
    { id: 'SIGNED', label: 'Баталгаажсан', icon: FileText, color: 'text-emerald-700' },
    { id: 'SENT_TO_EMPLOYEE', label: 'Танилцуулах', icon: Send, color: 'text-amber-700' },
    { id: 'ACKNOWLEDGED', label: 'Танилцсан', icon: CheckCircle2, color: 'text-teal-700' },
] as const;

/**
 * Баримтын бодит `currentStatus`-ыг stepper-ын stepId руу буулгана.
 * APPROVED → SIGNED (нэг "Баталгаажсан" цонх);
 * REJECTED → DRAFT (засвар хийж дахин илгээх шаттай харагдана).
 */
function statusToStepId(s: DocumentStatus | string): string {
    if (s === 'APPROVED') return 'SIGNED';
    if (s === 'REJECTED') return 'DRAFT';
    return s;
}

interface DocumentStepperProps {
    currentStatus: DocumentStatus;
}

export const DocumentStepper = React.memo(function DocumentStepper({ currentStatus }: DocumentStepperProps) {
    const effectiveStepId = statusToStepId(currentStatus);
    const currentIdx = STEPS.findIndex((s) => s.id === effectiveStepId);

    return (
        <div className="flex items-center gap-1 pb-3 overflow-x-auto no-scrollbar">
            {STEPS.map((step, idx) => {
                const isPast = currentIdx === -1 ? false : currentIdx > idx;
                const isCurrent = step.id === effectiveStepId;
                const isLast = idx === STEPS.length - 1;

                return (
                    <React.Fragment key={step.id}>
                        <div
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                                isCurrent ? 'bg-primary text-white' : isPast ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                            )}
                        >
                            <div
                                className={cn(
                                    'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                                    isPast ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-white/20' : 'bg-slate-200'
                                )}
                            >
                                {isPast ? <Check className="h-3 w-3" /> : idx + 1}
                            </div>
                            {step.label}
                        </div>
                        {!isLast && <div className="w-6 h-0.5 bg-slate-200 shrink-0" />}
                    </React.Fragment>
                );
            })}
        </div>
    );
});
