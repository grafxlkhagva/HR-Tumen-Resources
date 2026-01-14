'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { STEPS } from '../types';
import { Check, Circle, Dot } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface OffboardingStepperProps {
    currentStep: number;
    onStepClick: (stepId: number) => void;
    completedSteps: number[];
}

export function OffboardingStepper({ currentStep, onStepClick, completedSteps }: OffboardingStepperProps) {
    return (
        <div className="w-full bg-background border-b z-20 sticky top-0 md:relative">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max items-center p-4">
                    {STEPS.map((step, index) => {
                        const isCompleted = completedSteps.includes(step.id);
                        const isCurrent = currentStep === step.id;
                        const isFuture = !isCompleted && !isCurrent;

                        return (
                            <div key={step.id} className="flex items-center">
                                {/* Step Item */}
                                <button
                                    onClick={() => onStepClick(step.id)}
                                    className={cn(
                                        "group flex items-center gap-2 px-3 py-2 rounded-lg transition-all border",
                                        isCurrent
                                            ? "bg-primary/10 border-primary/20 text-primary ring-2 ring-primary/10"
                                            : isCompleted
                                                ? "bg-muted/50 border-muted text-muted-foreground hover:bg-muted hover:text-foreground"
                                                : "bg-transparent border-transparent text-muted-foreground/60"
                                    )}
                                >
                                    <div className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                                        isCurrent ? "bg-primary text-primary-foreground" :
                                            isCompleted ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.id}
                                    </div>
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isCurrent && "font-bold"
                                    )}>
                                        {step.label}
                                    </span>
                                </button>

                                {/* Connector Line */}
                                {index < STEPS.length - 1 && (
                                    <div className="mx-2 h-[2px] w-6 bg-muted">
                                        <div
                                            className={cn(
                                                "h-full bg-green-500 transition-all duration-500",
                                                isCompleted ? "w-full" : "w-0"
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" className="invisible sm:visible" />
            </ScrollArea>
        </div>
    );
}
