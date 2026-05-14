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
import { Badge } from '@/components/ui/badge';
import {
    UserPlus, Loader2, ChevronRight, ChevronLeft, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { AppointEmployeeDialogProps, WIZARD_STEPS, OnboardingStageId } from './types';
import { useAppointmentForm } from './use-appointment-form';
import { StepEmployeeSelect } from './step-employee-select';
import { StepAppointmentType, StepSalarySelect, StepIncentives, StepAllowances } from './step-salary';
import { StepOnboardingSelect, StepOnboardingTaskPlan, StepDocumentInputs } from './step-review';
import { AddEmployeeDialog } from '@/app/dashboard/employees/add-employee-dialog';
import type { Employee } from '@/types';

export { type AppointEmployeeDialogProps } from './types';

export function AppointEmployeeDialog({
    open,
    onOpenChange,
    position,
    initialEmployee,
    onSuccess,
    appointmentPath = 'prepared',
}: AppointEmployeeDialogProps) {
    const form = useAppointmentForm({
        open,
        position,
        initialEmployee,
        onOpenChange,
        onSuccess,
        appointmentPath,
    });

    const [showAddEmployee, setShowAddEmployee] = React.useState(false);

    // Determine the current onboarding stage ID for task planning steps
    const getOnboardingStageId = (): OnboardingStageId => {
        if (form.step === WIZARD_STEPS.ONBOARDING_PRE) return 'pre-onboarding';
        if (form.step === WIZARD_STEPS.ONBOARDING_ORIENTATION) return 'orientation';
        if (form.step === WIZARD_STEPS.ONBOARDING_INTEGRATION) return 'integration';
        return 'productivity';
    };

    const isOnboardingTaskStep =
        form.step === WIZARD_STEPS.ONBOARDING_PRE ||
        form.step === WIZARD_STEPS.ONBOARDING_ORIENTATION ||
        form.step === WIZARD_STEPS.ONBOARDING_INTEGRATION ||
        form.step === WIZARD_STEPS.ONBOARDING_PRODUCTIVITY;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] h-[700px] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border-none shadow-premium">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/5 to-background border-b shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-lg font-bold">
                                    Ажилтан томилох
                                </DialogTitle>
                                {appointmentPath === 'quick' && (
                                    <Badge
                                        variant="outline"
                                        className="border-amber-400 bg-amber-50 text-amber-700 text-[10px] font-semibold"
                                    >
                                        Шуурхай томилгоо
                                    </Badge>
                                )}
                            </div>
                            <DialogDescription className="text-xs">
                                <span className="font-semibold text-foreground">"{position?.title}"</span> ажлын байр
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Step Progress Indicator */}
                    {form.step > WIZARD_STEPS.EMPLOYEE_SELECT && (
                        <div className="flex items-center gap-1 mt-3">
                            {form.stepProgress.map((s, i) => (
                                <React.Fragment key={s.id}>
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all",
                                        s.id === form.step
                                            ? "bg-primary text-primary-foreground"
                                            : s.id < form.step
                                                ? "bg-primary/20 text-primary"
                                                : "bg-muted text-muted-foreground"
                                    )}>
                                        {s.id < form.step ? (
                                            <Check className="h-3 w-3" />
                                        ) : (
                                            <span>{i + 1}</span>
                                        )}
                                        <span className="hidden sm:inline">{s.name}</span>
                                    </div>
                                    {i < form.stepProgress.length - 1 && (
                                        <div className={cn(
                                            "h-0.5 w-3 rounded-full transition-all",
                                            s.id < form.step ? "bg-primary" : "bg-muted"
                                        )} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Debug: Show available data */}
                    {form.step === WIZARD_STEPS.APPOINTMENT_TYPE && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {form.isPositionLoading ? (
                                <Badge variant="outline" className="text-[9px]">
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Ачаалж байна...
                                </Badge>
                            ) : (
                                <>
                                    <Badge variant={form.salarySteps.length > 0 ? "default" : "outline"} className="text-[9px]">
                                        Цалин: {form.salarySteps.length}
                                    </Badge>
                                    <Badge variant={form.incentives.length > 0 ? "default" : "outline"} className="text-[9px]">
                                        Урамшуулал: {form.incentives.length}
                                    </Badge>
                                    <Badge variant={form.allowances.length > 0 ? "default" : "outline"} className="text-[9px]">
                                        Хангамж: {form.allowances.length}
                                    </Badge>
                                </>
                            )}
                        </div>
                    )}
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Step 1: Employee Selection */}
                    {form.step === WIZARD_STEPS.EMPLOYEE_SELECT && (
                        <StepEmployeeSelect
                            search={form.search}
                            onSearchChange={form.setSearch}
                            employeesLoading={form.employeesLoading}
                            filteredEmployees={form.filteredEmployees}
                            onSelectEmployee={form.handleEmployeeSelect}
                            onCreateNew={() => setShowAddEmployee(true)}
                        />
                    )}

                    {/* Nested: Шинэ ажилтан үүсгэж, амжилттай үүссэний дараа auto-select */}
                    <AddEmployeeDialog
                        open={showAddEmployee}
                        onOpenChange={setShowAddEmployee}
                        onCreated={(emp) => {
                            const employee = {
                                id: emp.id,
                                employeeCode: emp.employeeCode,
                                firstName: emp.firstName,
                                lastName: emp.lastName,
                                email: emp.email,
                                phoneNumber: emp.phoneNumber,
                                photoURL: emp.photoURL,
                                status: emp.status,
                                role: 'employee',
                            } as unknown as Employee;
                            form.handleEmployeeSelect(employee);
                        }}
                    />

                    {/* Step 2: Appointment Type */}
                    {form.step === WIZARD_STEPS.APPOINTMENT_TYPE && (
                        <StepAppointmentType
                            offboardingStatus={form.offboardingStatus}
                            eligibility={form.eligibility}
                            isPositionLoading={form.isPositionLoading}
                            salaryStepsCount={form.salarySteps.length}
                            incentivesCount={form.incentives.length}
                            allowancesCount={form.allowances.length}
                            onSelectType={form.handleSelectAppointmentType}
                        />
                    )}

                    {/* Step 3: Salary Step Selection */}
                    {form.step === WIZARD_STEPS.SALARY_STEP && (
                        <StepSalarySelect
                            salarySteps={form.salarySteps}
                            activeIndex={form.positionData?.salarySteps?.activeIndex}
                            onSelect={(index) => {
                                form.setSelectedSalaryStepIndex(index);
                                form.goToNextStep(WIZARD_STEPS.SALARY_STEP);
                            }}
                        />
                    )}

                    {/* Step 4: Incentives Selection */}
                    {form.step === WIZARD_STEPS.INCENTIVES && (
                        <StepIncentives
                            incentives={form.incentives}
                            selectedIncentives={form.selectedIncentives}
                            onToggle={(index, checked) => {
                                if (checked) {
                                    form.setSelectedIncentives(prev => [...prev, index]);
                                } else {
                                    form.setSelectedIncentives(prev => prev.filter(i => i !== index));
                                }
                            }}
                        />
                    )}

                    {/* Step 5: Allowances Selection */}
                    {form.step === WIZARD_STEPS.ALLOWANCES && (
                        <StepAllowances
                            allowances={form.allowances}
                            selectedAllowances={form.selectedAllowances}
                            onToggle={(index, checked) => {
                                if (checked) {
                                    form.setSelectedAllowances(prev => [...prev, index]);
                                } else {
                                    form.setSelectedAllowances(prev => prev.filter(i => i !== index));
                                }
                            }}
                        />
                    )}

                    {/* Step 6: Onboarding Selection */}
                    {form.step === WIZARD_STEPS.ONBOARDING && (
                        <StepOnboardingSelect
                            onEnableOnboarding={() => {
                                form.setEnableOnboarding(true);
                                form.setStep(WIZARD_STEPS.ONBOARDING_PRE);
                            }}
                            onSkipOnboarding={() => {
                                form.setEnableOnboarding(false);
                                if (form.templateData?.customInputs?.length) {
                                    form.setStep(WIZARD_STEPS.DOCUMENT_INPUTS);
                                } else {
                                    form.handleStartProcess();
                                }
                            }}
                        />
                    )}

                    {/* Step 7-10: Onboarding task planning (4 stages) */}
                    {isOnboardingTaskStep && (
                        <StepOnboardingTaskPlan
                            stageId={getOnboardingStageId()}
                            getStageConfig={form.getStageConfig}
                            onboardingTaskPlan={form.onboardingTaskPlan}
                            setOnboardingTaskPlan={form.setOnboardingTaskPlan}
                            allEmployees={form.allEmployees}
                            currentUserProfileId={form.currentUserProfile?.id}
                            getDefaultDueDateForStage={form.getDefaultDueDateForStage}
                            isValidDateString={form.isValidDateString}
                        />
                    )}

                    {/* Step 11: Document Custom Inputs */}
                    {form.step === WIZARD_STEPS.DOCUMENT_INPUTS && (
                        <StepDocumentInputs
                            templateLoading={form.templateLoading}
                            normalizedCustomInputs={form.normalizedCustomInputs}
                            customInputValues={form.customInputValues}
                            onCustomInputChange={form.handleCustomInputChange}
                        />
                    )}

                    {/* Loading Overlay */}
                    {form.isSubmitting && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
                            <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                            <div className="text-center">
                                <p className="font-bold">Томилгоо хийж байна</p>
                                <p className="text-xs text-muted-foreground">Түр хүлээнэ үү...</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50/50 shrink-0">
                    {form.step === WIZARD_STEPS.EMPLOYEE_SELECT ? (
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
                            Болих
                        </Button>
                    ) : form.step === WIZARD_STEPS.APPOINTMENT_TYPE || form.step === WIZARD_STEPS.SALARY_STEP || form.step === WIZARD_STEPS.ONBOARDING ? (
                        // Single-choice steps - only back button
                        <Button
                            variant="outline"
                            onClick={() => form.goToPreviousStep(form.step)}
                            className="rounded-xl"
                            disabled={form.isSubmitting}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Буцах
                        </Button>
                    ) : (
                        // Multi-choice steps - back and continue buttons
                        <div className="flex w-full gap-3">
                            <Button
                                variant="outline"
                                onClick={() => form.goToPreviousStep(form.step)}
                                className="flex-1 rounded-xl"
                                disabled={form.isSubmitting}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Буцах
                            </Button>
                            {form.step === WIZARD_STEPS.DOCUMENT_INPUTS ? (
                                <Button
                                    onClick={form.handleStartProcess}
                                    disabled={form.isSubmitting || form.normalizedCustomInputs.some((i: any) => i.required && !form.customInputValues[i.__normalizedKey])}
                                    className="flex-[2] bg-primary hover:bg-primary/90 rounded-xl"
                                >
                                    {form.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    Томилгоо эхлүүлэх
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => form.goToNextStep(form.step)}
                                    className="flex-[2] rounded-xl"
                                    disabled={form.isSubmitting}
                                >
                                    Үргэлжлүүлэх
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            )}
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
