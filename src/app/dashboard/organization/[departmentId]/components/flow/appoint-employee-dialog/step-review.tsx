'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2, Check, X, GraduationCap, ArrowRight, FileText,
    Calendar as CalendarIcon,
} from 'lucide-react';
import { Employee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { OnboardingStage } from '@/lib/onboarding-project-creator';
import {
    WIZARD_STEPS,
    OnboardingStageId,
    ONBOARDING_STAGE_TITLES,
    OnboardingTaskPlanState,
} from './types';

// ─── Onboarding Selection Step ──────────────────────────────────────────────

interface StepOnboardingSelectProps {
    onEnableOnboarding: () => void;
    onSkipOnboarding: () => void;
}

export function StepOnboardingSelect({
    onEnableOnboarding,
    onSkipOnboarding,
}: StepOnboardingSelectProps) {
    return (
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-blue-100 text-blue-600 mb-2">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold">Чиглүүлэх хөтөлбөр (Onboarding)</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Тийм гэж сонговол дараагийн алхмуудаар таск сонгож (хугацаа/хариуцагч) onboarding төслүүд үүсгэнэ.
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={onEnableOnboarding}
                        className={cn(
                            "w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left group",
                            "border-slate-200 bg-white hover:border-blue-400 hover:shadow-md"
                        )}
                    >
                        <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                            <Check className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold">Тийм, эхлүүлэх</div>
                            <div className="text-xs text-muted-foreground">Onboarding хөтөлбөр автоматаар эхэлнэ</div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </button>

                    <button
                        onClick={onSkipOnboarding}
                        className={cn(
                            "w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left group",
                            "border-slate-200 bg-white hover:border-slate-400 hover:shadow-md"
                        )}
                    >
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                            <X className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <div className="font-bold">Үгүй, алгасах</div>
                            <div className="text-xs text-muted-foreground">Onboarding хөтөлбөргүйгээр томилно</div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            </div>
        </ScrollArea>
    );
}

// ─── Onboarding Task Planning Step (for each stage) ─────────────────────────

interface StepOnboardingTaskPlanProps {
    stageId: OnboardingStageId;
    getStageConfig: (stageId: OnboardingStageId) => OnboardingStage | undefined;
    onboardingTaskPlan: OnboardingTaskPlanState;
    setOnboardingTaskPlan: React.Dispatch<React.SetStateAction<OnboardingTaskPlanState>>;
    allEmployees: Employee[] | undefined;
    currentUserProfileId?: string;
    getDefaultDueDateForStage: (stageId: OnboardingStageId) => string;
    isValidDateString: (val?: string) => boolean;
}

export function StepOnboardingTaskPlan({
    stageId,
    getStageConfig,
    onboardingTaskPlan,
    setOnboardingTaskPlan,
    allEmployees,
    currentUserProfileId,
    getDefaultDueDateForStage,
    isValidDateString,
}: StepOnboardingTaskPlanProps) {
    const stage = getStageConfig(stageId);
    const tasks = stage?.tasks || [];
    const stagePlan = onboardingTaskPlan[stageId] || {};

    return (
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-5">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 mb-2">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold">{ONBOARDING_STAGE_TITLES[stageId]}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Сонгосон таск: <span className="font-bold">{Object.values(stagePlan).filter(p => p?.selected).length}</span>
                    </p>
                </div>

                {!stage ? (
                    <div className="p-4 rounded-xl border bg-slate-50 text-slate-700 text-sm">
                        Onboarding тохиргоо олдсонгүй. `/dashboard/onboarding/settings` дээр тохируулна уу.
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="p-4 rounded-xl border bg-slate-50 text-slate-700 text-sm">
                        Энэ үе шатанд таск тохируулаагүй байна.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tasks.map((t: any, idx: number) => {
                            const plan = stagePlan[t.id] || { selected: false };
                            const selected = !!plan.selected;
                            const dueDate = plan.dueDate;
                            const ownerId = plan.ownerId;

                            return (
                                <div
                                    key={t.id}
                                    className={cn(
                                        'rounded-2xl border p-4 transition-all',
                                        selected ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-white'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            checked={selected}
                                            onCheckedChange={(val) => {
                                                const checked = !!val;
                                                setOnboardingTaskPlan(prev => {
                                                    const prevStage = prev[stageId] || {};
                                                    const existing = prevStage[t.id] || { selected: false };
                                                    const nextStage = {
                                                        ...prevStage,
                                                        [t.id]: {
                                                            ...existing,
                                                            selected: checked,
                                                            dueDate: checked && !isValidDateString(existing.dueDate)
                                                                ? getDefaultDueDateForStage(stageId)
                                                                : existing.dueDate,
                                                            ownerId: checked && !existing.ownerId
                                                                ? (currentUserProfileId || undefined)
                                                                : existing.ownerId,
                                                        }
                                                    };
                                                    return { ...prev, [stageId]: nextStage };
                                                });
                                            }}
                                            className="mt-0.5"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400">{idx + 1}.</span>
                                                <div className="font-semibold text-sm text-slate-800 truncate">{t.title}</div>
                                                {selected && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        Сонгосон
                                                    </Badge>
                                                )}
                                            </div>
                                            {t.description ? (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                                            ) : null}

                                            {selected ? (
                                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold">Хугацаа</Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        'h-10 w-full justify-start text-left font-medium rounded-xl bg-white',
                                                                        !dueDate && 'text-muted-foreground'
                                                                    )}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {dueDate ? format(new Date(dueDate), 'yyyy.MM.dd') : 'Огноо сонгох'}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={dueDate ? new Date(dueDate) : undefined}
                                                                    onSelect={(date) => {
                                                                        setOnboardingTaskPlan(prev => ({
                                                                            ...prev,
                                                                            [stageId]: {
                                                                                ...(prev[stageId] || {}),
                                                                                [t.id]: {
                                                                                    ...((prev[stageId] || {})[t.id] || { selected: true }),
                                                                                    selected: true,
                                                                                    dueDate: date ? format(date, 'yyyy-MM-dd') : undefined,
                                                                                }
                                                                            }
                                                                        }));
                                                                    }}
                                                                    initialFocus
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-semibold">Хариуцагч</Label>
                                                        <Select
                                                            value={ownerId || ''}
                                                            onValueChange={(val) => {
                                                                setOnboardingTaskPlan(prev => ({
                                                                    ...prev,
                                                                    [stageId]: {
                                                                        ...(prev[stageId] || {}),
                                                                        [t.id]: {
                                                                            ...((prev[stageId] || {})[t.id] || { selected: true }),
                                                                            selected: true,
                                                                            ownerId: val || undefined,
                                                                        }
                                                                    }
                                                                }));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-10 rounded-xl bg-white">
                                                                <SelectValue placeholder="Хариуцагч сонгох..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {(allEmployees || []).map((emp) => {
                                                                    const label = `${emp.lastName || ''} ${emp.firstName || ''}`.trim() || emp.email || emp.id;
                                                                    return (
                                                                        <SelectItem key={emp.id} value={emp.id}>
                                                                            {label}
                                                                        </SelectItem>
                                                                    );
                                                                })}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}

// ─── Document Custom Inputs Step ────────────────────────────────────────────

interface StepDocumentInputsProps {
    templateLoading: boolean;
    normalizedCustomInputs: any[];
    customInputValues: Record<string, any>;
    onCustomInputChange: (key: string, value: any) => void;
}

export function StepDocumentInputs({
    templateLoading,
    normalizedCustomInputs,
    customInputValues,
    onCustomInputChange,
}: StepDocumentInputsProps) {
    return (
        <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 mb-2">
                        <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold">Баримтын мэдээлэл бөглөх</h3>
                    <p className="text-xs text-muted-foreground mt-1">Томилгооны баримтад шаардлагатай мэдээллүүд</p>
                </div>

                {templateLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : normalizedCustomInputs.length ? (
                    <div className="space-y-4">
                        {normalizedCustomInputs.map((input: any) => (
                            <div key={input.__normalizedKey} className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    {input.label} {input.required && <span className="text-rose-500">*</span>}
                                </Label>
                                {input.type === 'date' ? (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "h-10 w-full justify-start text-left font-medium rounded-xl",
                                                    !customInputValues[input.__normalizedKey] && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {customInputValues[input.__normalizedKey]
                                                    ? format(new Date(customInputValues[input.__normalizedKey]), "yyyy.MM.dd")
                                                    : "Огноо сонгох"
                                                }
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={customInputValues[input.__normalizedKey] ? new Date(customInputValues[input.__normalizedKey]) : undefined}
                                                onSelect={(date) => onCustomInputChange(input.__normalizedKey, date ? format(date, 'yyyy-MM-dd') : '')}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                ) : input.type === 'number' ? (
                                    <Input
                                        type="number"
                                        value={customInputValues[input.__normalizedKey] || ''}
                                        onChange={(e) => onCustomInputChange(input.__normalizedKey, e.target.value)}
                                        placeholder={input.description || `${input.label} оруулна уу`}
                                        className="h-10 rounded-xl"
                                    />
                                ) : input.type === 'boolean' ? (
                                    <div className="flex items-center space-x-2 h-10 px-4 bg-slate-50 rounded-xl border">
                                        <Switch
                                            checked={!!customInputValues[input.__normalizedKey]}
                                            onCheckedChange={(checked) => onCustomInputChange(input.__normalizedKey, checked)}
                                        />
                                        <span className="text-sm">{customInputValues[input.__normalizedKey] ? 'Тийм' : 'Үгүй'}</span>
                                    </div>
                                ) : (
                                    <Input
                                        value={customInputValues[input.__normalizedKey] || ''}
                                        onChange={(e) => onCustomInputChange(input.__normalizedKey, e.target.value)}
                                        placeholder={input.description || `${input.label} оруулна уу`}
                                        className="h-10 rounded-xl"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Нэмэлт мэдээлэл шаардлагагүй</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
