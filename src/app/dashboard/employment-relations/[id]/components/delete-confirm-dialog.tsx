'use client';

/**
 * delete-confirm-dialog.tsx
 *
 * ER document устгах баталгаажуулах dialog. Устгах үйлдэл нь rollback
 * trigger хийдэг тул text-ийг "буцаах боломжгүй" шиг тодорхой сануулга
 * өгнө.
 *
 * Phase 3 extraction — `[id]/page.tsx`-ээс хуваав. Зан үйл өөрчлөгдөөгүй.
 */

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';

interface DeleteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isSaving: boolean;
}

function DeleteConfirmDialogImpl({
    open,
    onOpenChange,
    onConfirm,
    isSaving,
}: DeleteConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Баримт устгах</DialogTitle>
                    <DialogDescription>
                        Та энэ баримтыг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Болих
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                        )}
                        Устгах
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export const DeleteConfirmDialog = React.memo(DeleteConfirmDialogImpl);
