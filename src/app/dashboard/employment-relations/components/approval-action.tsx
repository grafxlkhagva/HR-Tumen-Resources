'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ERWorkflowStep, ActionType } from '../types';
import { Check, X, Send, Loader2 } from 'lucide-react';

interface ApprovalActionProps {
    step: ERWorkflowStep;
    onAction: (action: ActionType, comment?: string) => Promise<void>;
    isProcessing?: boolean;
}

export function ApprovalAction({ step, onAction, isProcessing = false }: ApprovalActionProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [actionType, setActionType] = useState<ActionType | null>(null);
    const [comment, setComment] = useState('');

    const handleOpen = (type: ActionType) => {
        setActionType(type);
        setComment('');
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!actionType) return;
        await onAction(actionType, comment);
        setIsDialogOpen(false);
    };

    const getDialogTitle = () => {
        switch (actionType) {
            case 'APPROVE': return 'Зөвшөөрөх';
            case 'SIGN': return 'Гарын үсэг зурах';
            // We implement REJECT as a conceptual action, although type might be update status
            // For this component assuming parent handles mapping 'REJECT' if needed or using a different type
            default: return 'Үйлдэл хийх';
        }
    };

    // Determine buttons based on step action type
    // If step.actionType is SIGN, show Sign button.
    // If step.actionType is REVIEW/APPROVE, show Approve & Reject buttons.

    return (
        <div className="flex flex-col gap-4 p-4 border rounded-lg bg-blue-50/50 border-blue-100">
            <h4 className="font-medium text-sm text-blue-900">Таны хийх үйлдэл: {step.name}</h4>
            <div className="flex gap-3">
                {step.actionType === 'SIGN' ? (
                    <Button
                        onClick={() => handleOpen('SIGN')}
                        disabled={isProcessing}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Гарын үсэг зурах
                    </Button>
                ) : (
                    <>
                        <Button
                            onClick={() => handleOpen('APPROVE')}
                            disabled={isProcessing}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Зөвшөөрөх
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => handleOpen('UPDATE')} // Using generic update for 'Reject' conceptually for now, parent logic handles it
                            disabled={isProcessing}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Татгалзах
                        </Button>
                    </>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{getDialogTitle()}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Тайлбар (Заавал биш)</Label>
                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Тайлбар бичих..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleSubmit} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Батлах
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
