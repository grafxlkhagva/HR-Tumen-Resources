'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeSignature } from '@/hooks/use-employee-signature';
import { SignaturePad, type SignaturePadHandle } from './signature-pad';
import { Eraser, PenLine, CheckCircle2 } from 'lucide-react';

export function SignDialog({
    open,
    onOpenChange,
    itemTitle,
    actionLabel,
    employeeName,
    onConfirm,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    itemTitle: string;
    actionLabel: string; // "Хамрагдсан" / "Танилцсан"
    employeeName?: string;
    onConfirm: () => void;
}) {
    const { signature, isLoading, saveSignature } = useEmployeeSignature();
    const padRef = React.useRef<SignaturePadHandle>(null);
    const [redraw, setRedraw] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');

    // Диалог хаагдахад дахин-зурах төлөвийг цэвэрлэнэ.
    React.useEffect(() => {
        if (!open) {
            setRedraw(false);
            setError('');
        }
    }, [open]);

    const drawMode = !isLoading && (!signature?.dataUrl || redraw);

    const handleSave = async () => {
        setError('');
        if (!padRef.current || padRef.current.isEmpty()) {
            setError('Гарын үсгээ зурна уу.');
            return;
        }
        setSaving(true);
        try {
            await saveSignature(padRef.current.toDataURL());
            setRedraw(false);
        } catch {
            setError('Хадгалахад алдаа гарлаа. Дахин оролдоно уу.');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Гарын үсэг зурах</DialogTitle>
                    <DialogDescription className="line-clamp-2">{itemTitle}</DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <Skeleton className="h-[200px] w-full rounded-lg" />
                ) : drawMode ? (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                            {signature?.dataUrl ? 'Гарын үсгээ дахин зурна уу.' : 'Доорх талбарт гарын үсгээ зурна уу.'}
                        </p>
                        <div className="rounded-lg border bg-white">
                            <SignaturePad ref={padRef} onBeginDraw={() => setError('')} className="rounded-lg" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-muted-foreground"
                                onClick={() => padRef.current?.clear()}
                            >
                                <Eraser className="h-3.5 w-3.5" />
                                Цэвэрлэх
                            </Button>
                            {signature?.dataUrl && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => setRedraw(false)}>
                                    Болих
                                </Button>
                            )}
                        </div>
                        {error && <p className="text-xs text-error">{error}</p>}
                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
                                <CheckCircle2 className="h-4 w-4" />
                                {saving ? 'Хадгалж байна…' : 'Гарын үсэг хадгалах'}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">Хадгалсан гарын үсгээрээ баталгаажуулна уу.</p>
                        <div className="flex items-center justify-center rounded-lg border bg-white p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={signature!.dataUrl} alt="Гарын үсэг" className="max-h-32 object-contain" />
                        </div>
                        <div className="flex items-center justify-between">
                            {employeeName ? (
                                <span className="text-sm font-medium">{employeeName}</span>
                            ) : (
                                <span />
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-muted-foreground"
                                onClick={() => setRedraw(true)}
                            >
                                <PenLine className="h-3.5 w-3.5" />
                                Дахин зурах
                            </Button>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button className="w-full gap-2" onClick={handleConfirm}>
                                <CheckCircle2 className="h-4 w-4" />
                                {actionLabel} гэж баталгаажуулах
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
