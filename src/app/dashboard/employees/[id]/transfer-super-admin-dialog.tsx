'use client';

import * as React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Crown, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';
import { getJsonAuthHeaders } from '@/lib/api/client-auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TransferSuperAdminDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetEmployee: Employee;
    onSuccess?: () => void;
}

const CONFIRM_PHRASE = 'ШИЛЖҮҮЛЭХ';

export function TransferSuperAdminDialog({
    open,
    onOpenChange,
    targetEmployee,
    onSuccess,
}: TransferSuperAdminDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);
    const [confirmText, setConfirmText] = React.useState('');

    React.useEffect(() => {
        if (!open) setConfirmText('');
    }, [open]);

    const canConfirm = confirmText === CONFIRM_PHRASE;

    const handleConfirm = async () => {
        if (!canConfirm) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/transfer-super-admin', {
                method: 'POST',
                headers: await getJsonAuthHeaders(),
                body: JSON.stringify({ targetUid: targetEmployee.id }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Алдаа гарлаа' }));
                throw new Error(err?.error || 'Шилжүүлэхэд алдаа гарлаа');
            }

            toast({
                title: 'Амжилттай шилжүүллээ',
                description: `${targetEmployee.lastName} ${targetEmployee.firstName} нь байгуулагын ерөнхий админ боллоо. Та дахин нэвтэрч орсноор эрх шинэчлэгдэнэ.`,
            });
            onOpenChange(false);
            onSuccess?.();
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: e?.message || 'Шилжүүлэхэд алдаа гарлаа.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-[480px]">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-full bg-amber-100">
                            <Crown className="h-5 w-5 text-amber-600" />
                        </div>
                        <AlertDialogTitle>Ерөнхий админ шилжүүлэх</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
                        <div className="text-left space-y-3 text-sm text-muted-foreground">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-amber-800">
                                    Энэ үйлдлийг буцаах <strong>боломжгүй</strong>. Та байгуулагын ерөнхий админ эрхийг алдаж, өөрөө энгийн админ болно.
                                </span>
                            </div>
                            <div className="text-sm">
                                <strong>{targetEmployee.lastName} {targetEmployee.firstName}</strong> нь шинэ байгуулагын ерөнхий админ болно.
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm">
                                    Баталгаажуулахын тулд <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono font-bold">ШИЛЖҮҮЛЭХ</code> гэж бичнэ үү
                                </Label>
                                <Input
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="ШИЛЖҮҮЛЭХ"
                                    disabled={isLoading}
                                    className="font-mono"
                                />
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Буцах</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={!canConfirm || isLoading}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Шилжүүлэх
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
