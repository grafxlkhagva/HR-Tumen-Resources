'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, FileText, Wand2, ExternalLink, Calendar as CalendarIcon, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import type { Employee, OffboardingStage, ERTemplate } from './types';
import type { TaskPlanByStage } from './types';

interface StepReviewProps {
    step: number;
    employee: Employee | null;
    position: { title?: string } | null;
    templateData: ERTemplate | null | undefined;
    templateLoading: boolean;
    normalizedCustomInputs: any[];
    customInputValues: Record<string, any>;
    setCustomInputValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    enableOffboarding: boolean;
    setEnableOffboarding: (checked: boolean) => void;
    existingOffboardingProjects: any[] | undefined;
    toast: (opts: any) => void;
    // Offboarding stage rendering
    stageForStep: OffboardingStage | null;
    taskPlanByStage: TaskPlanByStage;
    stageCount: number;
    employees: Employee[] | undefined;
    startDateForPlanning: string;
    setTaskSelected: (stageId: string, taskId: string, selected: boolean, stageIdx: number, startDateStr: string) => void;
    setTaskDueDate: (stageId: string, taskId: string, dueDate: string) => void;
    setTaskOwner: (stageId: string, taskId: string, ownerId: string) => void;
}

export function StepReview({
    step,
    employee,
    position,
    templateData,
    templateLoading,
    normalizedCustomInputs,
    customInputValues,
    setCustomInputValues,
    enableOffboarding,
    setEnableOffboarding,
    existingOffboardingProjects,
    toast,
    stageForStep,
    taskPlanByStage,
    stageCount,
    employees,
    startDateForPlanning,
    setTaskSelected,
    setTaskDueDate,
    setTaskOwner,
}: StepReviewProps) {
    const renderOffboardingStageStep = (stage: OffboardingStage, stageIdx: number) => {
        const stagePlan = taskPlanByStage[stage.id] || {};
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700">
                        <span className="text-[10px] font-black uppercase tracking-widest">Offboarding {stageIdx + 1}/{stageCount}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{stage.title}</h3>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                </div>

                <div className="space-y-3">
                    {(stage.tasks || []).length === 0 ? (
                        <div className="p-6 rounded-2xl bg-amber-50/40 border border-amber-100 text-amber-800 text-sm font-medium">
                            Энэ үе шатанд тохируулсан таск алга байна. Дараагийн алхам руу шууд үргэлжлүүлж болно.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {stage.tasks.map((t) => {
                                const plan = stagePlan[t.id] || { selected: false };
                                return (
                                    <div key={t.id} className={cn("p-4 rounded-2xl border-2 bg-white transition-all", plan.selected ? "border-amber-200 shadow-sm" : "border-slate-100")}>
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={!!plan.selected}
                                                onCheckedChange={(checked) => setTaskSelected(stage.id, t.id, !!checked, stageIdx, startDateForPlanning)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-slate-900">{t.title}</div>
                                                {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                                            </div>
                                        </div>

                                        {plan.selected && (
                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Дуусах огноо</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "h-10 w-full justify-start text-left font-medium rounded-xl border-slate-200",
                                                                    !plan.dueDate && "text-muted-foreground"
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {plan.dueDate ? format(new Date(plan.dueDate), 'yyyy.MM.dd') : <span>Огноо сонгох</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={plan.dueDate ? new Date(plan.dueDate) : undefined}
                                                                onSelect={(date) => setTaskDueDate(stage.id, t.id, date ? format(date, 'yyyy-MM-dd') : '')}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Хариуцагч</Label>
                                                    <Select value={plan.ownerId || ''} onValueChange={(val) => setTaskOwner(stage.id, t.id, val)}>
                                                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                                                            <SelectValue placeholder="Хариуцагч сонгох" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(employees || []).map((e) => (
                                                                <SelectItem key={e.id} value={e.id}>
                                                                    {e.firstName} {e.lastName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <ScrollArea className="h-full">
            <div className="p-8 space-y-6">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-4 border-white shadow-sm">
                        <AvatarImage src={employee?.photoURL} />
                        <AvatarFallback className="bg-rose-50 text-rose-600 text-xl font-bold">
                            {employee?.firstName?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="text-lg font-bold text-slate-900">{employee?.firstName} {employee?.lastName}</div>
                        <div className="text-xs text-muted-foreground font-medium mt-0.5">
                            {position?.title}
                        </div>
                    </div>
                </div>

                {step >= 3 && enableOffboarding && stageForStep ? (
                    renderOffboardingStageStep(stageForStep, step - 3)
                ) : templateLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : templateData ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2 py-2 border-y border-dashed border-slate-200">
                            <FileText className="w-5 h-5 text-rose-500" />
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Ашиглах загвар</div>
                                <div className="text-sm font-bold text-slate-700">{templateData.name}</div>
                            </div>
                        </div>

                        {normalizedCustomInputs.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-rose-600">
                                    <Wand2 className="h-4 w-4" />
                                    <label className="text-xs font-bold uppercase tracking-widest">Шаардлагатай мэдээллүүд</label>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {normalizedCustomInputs.map((input: any) => (
                                        <div key={input.__normalizedKey} className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-600 ml-1">
                                                {input.label} {input.required && <span className="text-rose-500">*</span>}
                                            </Label>
                                            {input.type === 'date' ? (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "h-11 w-full justify-start text-left font-medium rounded-xl border-slate-200",
                                                                !customInputValues[input.__normalizedKey] && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {customInputValues[input.__normalizedKey] ? format(new Date(customInputValues[input.__normalizedKey]), "yyyy.MM.dd") : <span>Огноо сонгох</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={customInputValues[input.__normalizedKey] ? new Date(customInputValues[input.__normalizedKey]) : undefined}
                                                            onSelect={(date) => setCustomInputValues(prev => ({ ...prev, [input.__normalizedKey]: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            ) : input.type === 'number' ? (
                                                <Input
                                                    type="number"
                                                    value={customInputValues[input.__normalizedKey] || ''}
                                                    onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.__normalizedKey]: e.target.value }))}
                                                    placeholder={input.description || `${input.label} оруулна уу...`}
                                                    className="h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/10 transition-all font-medium"
                                                />
                                            ) : input.type === 'boolean' ? (
                                                <div className="flex items-center space-x-2 h-11 px-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                                    <Switch
                                                        checked={!!customInputValues[input.__normalizedKey]}
                                                        onCheckedChange={(checked) => setCustomInputValues(prev => ({ ...prev, [input.__normalizedKey]: checked }))}
                                                    />
                                                    <span className="text-sm text-slate-500">{customInputValues[input.__normalizedKey] ? 'Тийм' : 'Үгүй'}</span>
                                                </div>
                                            ) : (
                                                <Input
                                                    value={customInputValues[input.__normalizedKey] || ''}
                                                    onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.__normalizedKey]: e.target.value }))}
                                                    placeholder={input.description || `${input.label} оруулна уу...`}
                                                    className="h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/10 transition-all font-medium"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm space-y-4">
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold mb-1">Баримтын загвар тохируулаагүй</p>
                                <p className="opacity-80 leading-relaxed font-medium">Чөлөөлөх үйлдлийг үргэлжлүүлж болно. Гэхдээ баримт автоматаар үүсгэхгүй.</p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 h-9 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
                            onClick={() => window.open('/dashboard/organization/settings', '_blank')}
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Тохиргоо руу очих
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="mt-6 p-5 rounded-2xl border-2 border-slate-100 bg-white space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-sm font-bold text-slate-900">Offboarding хөтөлбөр эхлүүлэх үү?</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    Тийм гэж сонговол 4 үе шатны таскуудыг (огноо + хариуцагч) тохируулж байж төслүүд үүснэ.
                                </div>
                            </div>
                            <Switch
                                checked={enableOffboarding}
                                onCheckedChange={(checked) => {
                                    if (checked && (existingOffboardingProjects || []).length > 0) {
                                        toast({
                                            title: 'Offboarding аль хэдийн үүссэн байна',
                                            description: 'Энэ ажилтанд offboarding төслүүд өмнө нь үүссэн байна.',
                                            variant: 'destructive',
                                        });
                                        setEnableOffboarding(false);
                                        return;
                                    }
                                    setEnableOffboarding(checked);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
