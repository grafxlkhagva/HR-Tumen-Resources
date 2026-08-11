'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { LOST_REASONS } from '../../_types';

interface StageReasonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Аль шат руу шилжиж байгаа — pending эсвэл lost. */
    stage: 'pending' | 'lost';
    dealName?: string;
    /** Шалтгаан баталгаажсан үед — цуцалбал огт дуудагдахгүй. */
    onConfirm: (reason: string) => void;
}

/**
 * pending/lost руу шилжихэд шалтгаан ЗААВАЛ асуудаг диалог
 * (прототипийн prompt-ын оронд: LOST_REASONS сонголт + нэмэлт тайлбар).
 */
export function StageReasonDialog({
    open,
    onOpenChange,
    stage,
    dealName,
    onConfirm,
}: StageReasonDialogProps) {
    const [reason, setReason] = React.useState('');
    const [detail, setDetail] = React.useState('');

    React.useEffect(() => {
        if (open) {
            setReason('');
            setDetail('');
        }
    }, [open]);

    const title =
        stage === 'lost' ? '✗ Алдсан шалтгаан (заавал)' : '⏳ Хүлээгдэж буй шалтгаан (заавал)';

    const handleConfirm = () => {
        if (!reason) return;
        const full = detail.trim() ? `${reason} — ${detail.trim()}` : reason;
        onOpenChange(false);
        onConfirm(full);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {dealName ? `«${dealName}» — ш` : 'Ш'}алтгаанаа заавал сонгоно уу.
                        Цуцалбал шат солигдохгүй.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs">
                            Шалтгаан <span className="text-rose-600">*</span>
                        </Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue placeholder="— Сонгох —" />
                            </SelectTrigger>
                            <SelectContent>
                                {LOST_REASONS.map((r) => (
                                    <SelectItem key={r} value={r}>
                                        {r}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Дэлгэрэнгүй (заавал биш)</Label>
                        <Textarea
                            value={detail}
                            onChange={(e) => setDetail(e.target.value)}
                            placeholder="Нэмэлт тайлбар..."
                            className="min-h-[60px] resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Болих
                    </Button>
                    <Button
                        type="button"
                        disabled={!reason}
                        onClick={handleConfirm}
                        className={
                            stage === 'lost'
                                ? 'bg-rose-600 hover:bg-rose-600/90'
                                : 'bg-amber-600 hover:bg-amber-600/90'
                        }
                    >
                        {stage === 'lost' ? '✗ Алдсан болгох' : '⏳ Хүлээлгэх'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
