'use client';

import React from 'react';
import { ERWorkflowStep, DocumentStatus, ERDocumentHistory } from '../types';
import { CheckCircle2, Circle, Clock, XCircle, FileText } from 'lucide-react';
import { formatDateTime } from '../utils';

interface WorkflowStatusProps {
    status: DocumentStatus;
    currentStepId?: string | null;
    steps?: ERWorkflowStep[];
    history?: ERDocumentHistory[];
}

export function WorkflowStatus({ status, currentStepId, steps, history = [] }: WorkflowStatusProps) {
    if (!steps || steps.length === 0) return null;

    // Helper to find history item for a step
    const getHistoryForStep = (stepId: string) => {
        // Find the latest history entry for this step? Or any matching?
        // Usually workflows go forward, but rejections might loop back.
        // We'll simplisticly look for the last approval/rejection for this step
        return history.findLast(h => h.stepId === stepId || (status === 'APPROVED' && currentStepId === stepId));
    };

    return (
        <div className="w-full py-4 overflow-x-auto">
            <div className="flex items-center min-w-max px-4">
                {/* Initial Step (Draft) */}
                <div className="flex flex-col items-center relative z-10">
                    <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white
                        ${status !== 'DRAFT' ? 'border-primary text-primary' : 'border-blue-500 text-blue-500'}
                    `}>
                        {status !== 'DRAFT' ? <CheckCircle2 className="h-5 w-5" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div className="mt-2 text-xs font-medium text-center max-w-[100px]">Ноорог</div>
                    <div className="text-[10px] text-muted-foreground">
                        {history.find(h => h.action === 'CREATE') ? formatDateTime(history.find(h => h.action === 'CREATE')?.timestamp) : '-'}
                    </div>
                </div>

                {/* Line to next */}
                <div className={`h-0.5 w-16 ${status !== 'DRAFT' ? 'bg-primary' : 'bg-slate-200'}`} />

                {steps.map((step, index) => {
                    // Determine state of this step
                    // 1. Completed: It's in history as approved OR current step is past this one
                    // 2. Current: id matches currentStepId
                    // 3. Pending: upcoming

                    const isCurrent = step.id === currentStepId && status === 'PENDING';
                    const isCompleted = history.some(h => h.stepId === step.id && h.action === 'APPROVE') || status === 'APPROVED' || status === 'SIGNED';
                    const isRejected = history.some(h => h.stepId === step.id && h.action === 'REJECT') && isCurrent; // if rejected and currently stuck here? Usually returns to draft or stays.

                    // Logic simplification:
                    // If status is APPROVED/SIGNED, all steps are done.

                    let state: 'completed' | 'current' | 'pending' | 'rejected' = 'pending';
                    if (status === 'APPROVED' || status === 'SIGNED' || status === 'ARCHIVED') {
                        state = 'completed';
                    } else if (isRejected) {
                        state = 'rejected';
                    } else if (isCurrent) {
                        state = 'current';
                    } else if (history.some(h => h.stepId === step.id && h.action === 'APPROVE')) {
                        // Check if later step is current, then this is definitely completed
                        // For now assume linear history
                        state = 'completed';
                    }

                    return (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center relative z-10 group">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white transition-colors
                                    ${state === 'completed' ? 'border-primary text-primary' :
                                        state === 'current' ? 'border-blue-500 text-blue-500 animate-pulse' :
                                            state === 'rejected' ? 'border-red-500 text-red-500' : 'border-slate-200 text-slate-300'}
                                `}>
                                    {state === 'completed' ? <CheckCircle2 className="h-5 w-5" /> :
                                        state === 'current' ? <Clock className="h-4 w-4" /> :
                                            state === 'rejected' ? <XCircle className="h-5 w-5" /> :
                                                <Circle className="h-4 w-4" />}
                                </div>
                                <div className={`mt-2 text-xs font-medium text-center max-w-[120px] ${state === 'current' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {step.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    {/* Show date if completed */}
                                    {state === 'completed' ?
                                        formatDateTime(getHistoryForStep(step.id)?.timestamp) : '-'}
                                </div>
                            </div>

                            {/* Connect line to next step or finish */}
                            {index < steps.length - 1 && (
                                <div className={`h-0.5 w-16 ${state === 'completed' ? 'bg-primary' : 'bg-slate-200'
                                    }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}
