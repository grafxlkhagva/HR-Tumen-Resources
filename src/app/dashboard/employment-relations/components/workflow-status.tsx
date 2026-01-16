'use client';

import React from 'react';
import { ERWorkflowStep, DocumentStatus, ERDocumentHistory } from '../types';
import { CheckCircle2, Circle, Clock, XCircle, FileText, Check, FileCheck } from 'lucide-react';
import { formatDateTime } from '../utils';

interface WorkflowStatusProps {
    status: DocumentStatus;
    currentStepId?: string | null;
    steps?: ERWorkflowStep[];
    history?: ERDocumentHistory[];
}

export function WorkflowStatus({ status, currentStepId, steps, history = [] }: WorkflowStatusProps) {
    if (!steps) return null;

    const getHistoryForStep = (stepId: string) => {
        return history.findLast(h => h.stepId === stepId || (status === 'APPROVED' && currentStepId === stepId));
    };

    // Define the full sequence: Draft -> Workflow Steps -> Final (Approved/Signed)
    const allStates = [
        { id: 'DRAFT', name: 'Ноорог', type: 'system' },
        ...steps.map(s => ({ ...s, type: 'workflow' })),
        { id: 'FINAL', name: status === 'SIGNED' ? 'Гэрээлсэн' : 'Батлагдсан', type: 'system' }
    ];

    return (
        <div className="w-full py-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center min-w-max px-8 justify-center">
                {allStates.map((state, index) => {
                    let stepState: 'completed' | 'current' | 'pending' | 'rejected' = 'pending';

                    if (state.id === 'DRAFT') {
                        stepState = status !== 'DRAFT' ? 'completed' : 'current';
                    } else if (state.id === 'FINAL') {
                        stepState = (status === 'APPROVED' || status === 'SIGNED') ? 'completed' : 'pending';
                    } else {
                        const isCurrent = state.id === currentStepId && status === 'PENDING';
                        const isCompleted = history.some(h => h.stepId === state.id && h.action === 'APPROVE') || (status === 'APPROVED' || status === 'SIGNED');
                        const isRejected = history.some(h => h.stepId === state.id && h.action === 'REJECT') && isCurrent;

                        if (isRejected) stepState = 'rejected';
                        else if (isCompleted) stepState = 'completed';
                        else if (isCurrent) stepState = 'current';
                    }

                    // Icon selection
                    let Icon = Circle;
                    if (state.id === 'DRAFT') Icon = FileText;
                    else if (state.id === 'FINAL') Icon = status === 'SIGNED' ? FileCheck : CheckCircle2;
                    else if (stepState === 'completed') Icon = Check;
                    else if (stepState === 'current') Icon = Clock;
                    else if (stepState === 'rejected') Icon = XCircle;

                    return (
                        <React.Fragment key={state.id}>
                            <div className="flex flex-col items-center relative group">
                                <div className={`
                                    w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm border-2
                                    ${stepState === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200' :
                                        stepState === 'current' ? 'bg-white border-primary text-primary shadow-primary/20 ring-4 ring-primary/5 animate-pulse' :
                                            stepState === 'rejected' ? 'bg-rose-500 border-rose-500 text-white shadow-rose-200' :
                                                'bg-slate-50 border-slate-200 text-slate-300'}
                                `}>
                                    <Icon className={`h-6 w-6 ${stepState === 'current' ? 'animate-spin-slow' : ''}`} />
                                </div>
                                <div className="absolute -bottom-10 flex flex-col items-center w-32">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest text-center leading-tight transition-colors
                                        ${stepState === 'current' ? 'text-primary' : 'text-slate-500'}
                                    `}>
                                        {state.name}
                                    </span>
                                    {(stepState === 'completed' || state.id === 'DRAFT') && (
                                        <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                                            {state.id === 'DRAFT' ?
                                                formatDateTime(history.find(h => h.action === 'CREATE')?.timestamp || history[0]?.timestamp).split(' ')[0] :
                                                formatDateTime(getHistoryForStep(state.id)?.timestamp).split(' ')[0]
                                            }
                                        </span>
                                    )}
                                </div>
                            </div>

                            {index < allStates.length - 1 && (
                                <div className="flex-1 min-w-[40px] px-2 flex items-center mb-0">
                                    <div className={`h-[3px] w-full rounded-full transition-colors duration-700
                                        ${stepState === 'completed' ? 'bg-emerald-500' : 'bg-slate-100'}
                                    `} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
            <div className="h-10" /> {/* Spacer for labels */}
        </div>
    );
}
