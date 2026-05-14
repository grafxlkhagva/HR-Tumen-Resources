'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Loader2, UserPlus, GitBranch, Clock, X, ExternalLink,
    DollarSign, Zap, Gift, ArrowRight, AlertTriangle
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getAppointmentDocumentUrl } from '@/lib/services/employee-appointment-service';
import { getReleaseDocumentUrl } from '@/lib/services/employee-release-service';
import { EligibilityState, OffboardingStatus } from './types';

// ─── Appointment Type Step ──────────────────────────────────────────────────

interface StepAppointmentTypeProps {
    offboardingStatus: OffboardingStatus;
    eligibility: EligibilityState | null;
    isPositionLoading: boolean;
    salaryStepsCount: number;
    incentivesCount: number;
    allowancesCount: number;
    onSelectType: (type: { id: string; name: string }) => void;
}

export function StepAppointmentType({
    offboardingStatus,
    eligibility,
    isPositionLoading,
    salaryStepsCount,
    incentivesCount,
    allowancesCount,
    onSelectType,
}: StepAppointmentTypeProps) {
    return (
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
                {/* Offboarding warnings */}
                {offboardingStatus === 'checking' && (
                    <div className="p-3 rounded-xl bg-slate-50 border flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Төлөв шалгаж байна...</span>
                    </div>
                )}
                {offboardingStatus === 'active' && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                        <X className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                            <div className="font-semibold text-red-800 text-sm">Offboarding идэвхтэй</div>
                            <p className="text-xs text-red-600">Томилох боломжгүй</p>
                        </div>
                    </div>
                )}

                {/* Cross-workflow eligibility banner */}
                {eligibility && eligibility.allowed === false && (
                    <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-bold text-amber-900">Томилгоо эхлүүлэх боломжгүй</div>
                                <div className="text-sm text-amber-800 mt-1 font-medium">{eligibility.reason}</div>
                            </div>
                        </div>
                        {(eligibility.activeReleaseDocId || eligibility.activeAppointmentDocId) && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100 h-9 rounded-xl font-bold w-full"
                            >
                                <Link
                                    href={
                                        eligibility.activeReleaseDocId
                                            ? getReleaseDocumentUrl(eligibility.activeReleaseDocId)
                                            : getAppointmentDocumentUrl(eligibility.activeAppointmentDocId!)
                                    }
                                >
                                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                    Одоо явагдаж буй баримт руу очих
                                </Link>
                            </Button>
                        )}
                    </div>
                )}

                <div className="text-center mb-4">
                    <h3 className="font-bold">Томилгооны төрөл сонгох</h3>
                    <p className="text-xs text-muted-foreground mt-1">Сонголт дарахад автоматаар үргэлжилнэ</p>
                </div>

                {[
                    { id: 'appointment_permanent', name: 'Үндсэн ажилтнаар томилох', desc: 'Байнгын гэрээтэй', icon: UserPlus, color: 'bg-indigo-50 text-indigo-600' },
                    { id: 'appointment_probation', name: 'Туршилтын хугацаатай томилох', desc: 'Туршилтын гэрээтэй', icon: Clock, color: 'bg-amber-50 text-amber-600' },
                    { id: 'appointment_reappoint', name: 'Эргүүлэн томилох', desc: 'Дахин томилолт', icon: GitBranch, color: 'bg-emerald-50 text-emerald-600' },
                ].map((type) => (
                    <button
                        key={type.id}
                        onClick={() => onSelectType(type)}
                        disabled={
                            offboardingStatus === 'active' ||
                            offboardingStatus === 'checking' ||
                            (eligibility !== null && eligibility.allowed === false)
                        }
                        className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-xl border-2 bg-white transition-all text-left group",
                            offboardingStatus !== 'none' || (eligibility !== null && eligibility.allowed === false)
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:border-primary hover:shadow-md"
                        )}
                    >
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", type.color)}>
                            <type.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold">{type.name}</div>
                            <div className="text-xs text-muted-foreground">{type.desc}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </button>
                ))}
            </div>
        </ScrollArea>
    );
}

// ─── Salary Step Selection ──────────────────────────────────────────────────

interface StepSalarySelectProps {
    salarySteps: { name: string; value: number }[];
    activeIndex?: number;
    onSelect: (index: number) => void;
}

export function StepSalarySelect({
    salarySteps,
    activeIndex,
    onSelect,
}: StepSalarySelectProps) {
    return (
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 mb-2">
                        <DollarSign className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold">Цалингийн шатлал сонгох</h3>
                    <p className="text-xs text-muted-foreground mt-1">Сонголт дарахад автоматаар үргэлжилнэ</p>
                </div>

                <div className="space-y-2">
                    {salarySteps.map((salaryStep, index) => (
                        <button
                            key={index}
                            onClick={() => onSelect(index)}
                            className={cn(
                                "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left group",
                                activeIndex === index
                                    ? "border-emerald-300 bg-emerald-50"
                                    : "border-slate-200 bg-white hover:border-primary hover:shadow-md"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                                    activeIndex === index
                                        ? "bg-emerald-500 text-white"
                                        : "bg-slate-100 text-slate-600"
                                )}>
                                    {index + 1}
                                </div>
                                <div>
                                    <div className="font-semibold">{salaryStep.name}</div>
                                    {activeIndex === index && (
                                        <Badge variant="outline" className="text-[9px] h-4 border-emerald-300 text-emerald-600">
                                            Анхдагч
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{salaryStep.value.toLocaleString()}&#8366;</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </ScrollArea>
    );
}

// ─── Incentives Selection ──────────────────────────────────────────────────

interface StepIncentivesProps {
    incentives: { type: string; description: string; amount: number; unit: string; frequency?: string }[];
    selectedIncentives: number[];
    onToggle: (index: number, checked: boolean) => void;
}

export function StepIncentives({
    incentives,
    selectedIncentives,
    onToggle,
}: StepIncentivesProps) {
    return (
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-amber-100 text-amber-600 mb-2">
                        <Zap className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold">Урамшуулал & Нэмэгдэл сонгох</h3>
                    <p className="text-xs text-muted-foreground mt-1">Олгохыг хүссэн урамшууллуудаа сонгоно уу</p>
                </div>

                <div className="space-y-2">
                    {incentives.map((inc, index) => (
                        <label
                            key={index}
                            className={cn(
                                "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                selectedIncentives.includes(index)
                                    ? "border-amber-300 bg-amber-50"
                                    : "border-slate-200 bg-white hover:border-amber-200"
                            )}
                        >
                            <Checkbox
                                checked={selectedIncentives.includes(index)}
                                onCheckedChange={(checked) => onToggle(index, !!checked)}
                                className="h-5 w-5"
                            />
                            <div className="flex-1">
                                <div className="font-semibold text-sm">{inc.type}</div>
                                {inc.description && (
                                    <p className="text-xs text-muted-foreground">{inc.description}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <Badge variant="secondary" className="font-bold">
                                    {inc.unit === '₮' ? inc.amount.toLocaleString() : inc.amount}{inc.unit}
                                </Badge>
                                {inc.frequency && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{inc.frequency}</p>
                                )}
                            </div>
                        </label>
                    ))}
                </div>

                {incentives.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Урамшуулал тохируулаагүй</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}

// ─── Allowances Selection ──────────────────────────────────────────────────

interface StepAllowancesProps {
    allowances: { type: string; amount: number; period: string }[];
    selectedAllowances: number[];
    onToggle: (index: number, checked: boolean) => void;
}

export function StepAllowances({
    allowances,
    selectedAllowances,
    onToggle,
}: StepAllowancesProps) {
    return (
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-violet-100 text-violet-600 mb-2">
                        <Gift className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold">Хангамж сонгох</h3>
                    <p className="text-xs text-muted-foreground mt-1">Олгохыг хүссэн хангамжуудаа сонгоно уу</p>
                </div>

                <div className="space-y-2">
                    {allowances.map((all, index) => (
                        <label
                            key={index}
                            className={cn(
                                "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                selectedAllowances.includes(index)
                                    ? "border-violet-300 bg-violet-50"
                                    : "border-slate-200 bg-white hover:border-violet-200"
                            )}
                        >
                            <Checkbox
                                checked={selectedAllowances.includes(index)}
                                onCheckedChange={(checked) => onToggle(index, !!checked)}
                                className="h-5 w-5"
                            />
                            <div className="flex-1">
                                <div className="font-semibold text-sm">{all.type}</div>
                            </div>
                            <div className="text-right">
                                <Badge variant="secondary" className="font-bold">
                                    {all.amount.toLocaleString()}&#8366;
                                </Badge>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {all.period === 'monthly' ? 'Сар бүр' :
                                     all.period === 'yearly' ? 'Жил бүр' :
                                     all.period === 'once' ? 'Нэг удаа' : all.period}
                                </p>
                            </div>
                        </label>
                    ))}
                </div>

                {allowances.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Gift className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Хангамж тохируулаагүй</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
