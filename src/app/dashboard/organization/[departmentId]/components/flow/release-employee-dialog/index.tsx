'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check, UserMinus } from 'lucide-react';
import type { ReleaseEmployeeDialogProps } from './types';
import { useReleaseForm } from './use-release-form';
import { StepReleaseInfo } from './step-release-info';
import { StepReview } from './step-review';

export function ReleaseEmployeeDialog(props: ReleaseEmployeeDialogProps) {
    const { open, onOpenChange, employee, position } = props;

    const form = useReleaseForm(props);

    const {
        step,
        setStep,
        isSubmitting,
        enableOffboarding,
        eligibility,
        hasPendingAppointment,
        offboardingStages,
        stageCount,
        canProceedCustomInputs,
        canGoNextOffboardingStage,
        handleSelectReleaseType,
        handleCancelPendingAppointment,
        handleRelease,
        toast,
    } = form;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
                <div className="flex flex-col h-[85vh] max-h-[700px]">
                    <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-slate-50/50 to-white shrink-0">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                                <UserMinus className="h-6 w-6 text-rose-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Ажилтан чөлөөлөх</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-muted-foreground mt-1">
                                    <span className="font-bold text-slate-700">{employee?.firstName} {employee?.lastName}</span> ажилтныг ажлаас чөлөөлөх үйлдэл.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden relative border-t">
                        {step === 1 ? (
                            <StepReleaseInfo
                                eligibility={eligibility}
                                hasPendingAppointment={hasPendingAppointment}
                                isSubmitting={isSubmitting}
                                handleCancelPendingAppointment={handleCancelPendingAppointment}
                                handleSelectReleaseType={handleSelectReleaseType}
                            />
                        ) : (
                            <StepReview
                                step={step}
                                employee={employee}
                                position={position}
                                templateData={form.templateData}
                                templateLoading={form.templateLoading}
                                normalizedCustomInputs={form.normalizedCustomInputs}
                                customInputValues={form.customInputValues}
                                setCustomInputValues={form.setCustomInputValues}
                                enableOffboarding={enableOffboarding}
                                setEnableOffboarding={form.setEnableOffboarding}
                                existingOffboardingProjects={form.existingOffboardingProjects}
                                toast={toast}
                                stageForStep={form.stageForStep}
                                taskPlanByStage={form.taskPlanByStage}
                                stageCount={stageCount}
                                employees={form.employees}
                                startDateForPlanning={form.startDateForPlanning}
                                setTaskSelected={form.setTaskSelected}
                                setTaskDueDate={form.setTaskDueDate}
                                setTaskOwner={form.setTaskOwner}
                            />
                        )}

                        {isSubmitting && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                                <Loader2 className="h-12 w-12 text-rose-600 animate-spin" />
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-900">Боловсруулж байна</p>
                                    <p className="text-xs text-muted-foreground">Түр хүлээнэ үү...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-slate-50/50 shrink-0">
                        {step === 1 ? (
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="rounded-xl px-6 h-11 font-bold uppercase tracking-wider text-[10px]"
                            >
                                Болих
                            </Button>
                        ) : (
                            <div className="flex w-full gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (step === 2) return setStep(1);
                                        if (step >= 3) return setStep(step - 1);
                                        setStep(1);
                                    }}
                                    className="flex-1 rounded-xl h-11 font-bold uppercase tracking-wider text-[10px]"
                                    disabled={isSubmitting}
                                >
                                    Буцах
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (step === 2) {
                                            if (!canProceedCustomInputs) return;
                                            if (enableOffboarding) {
                                                if (!offboardingStages?.length) {
                                                    toast({
                                                        title: 'Offboarding тохиргоо хоосон байна',
                                                        description: 'Эхлээд /dashboard/offboarding/settings дээр таскуудаа тохируулна уу.',
                                                        variant: 'destructive',
                                                    });
                                                    return;
                                                }
                                                return setStep(3);
                                            }
                                            return handleRelease({ createOffboarding: false });
                                        }

                                        if (step >= 3) {
                                            if (!canGoNextOffboardingStage) return;
                                            const isLast = step === (2 + stageCount);
                                            if (isLast) return handleRelease({ createOffboarding: true });
                                            return setStep(step + 1);
                                        }
                                    }}
                                    disabled={
                                        isSubmitting ||
                                        (step === 2 && !canProceedCustomInputs) ||
                                        (step >= 3 && !canGoNextOffboardingStage)
                                    }
                                    className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-11 font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-rose-200"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    {step === 2
                                        ? (enableOffboarding ? 'Offboarding тохируулах' : 'Чөлөөлөх үйлдэл баталгаажуулах')
                                        : (step === (2 + stageCount) ? 'Чөлөөлөх + Offboarding үүсгэх' : 'Дараах')}
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
