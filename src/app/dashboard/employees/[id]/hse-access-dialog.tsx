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
import { HardHat, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';

interface HseAccessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
}

export function HseAccessDialog({
    open,
    onOpenChange,
    employee,
}: HseAccessDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const hasHseAccess = !!employee.hseAccess;

    const handleConfirm = async () => {
        if (!firestore) return;

        setIsLoading(true);

        try {
            const employeeRef = doc(firestore, 'employees', employee.id);
            await updateDoc(employeeRef, {
                hseAccess: !hasHseAccess,
            });

            toast({
                title: 'Амжилттай',
                description: hasHseAccess
                    ? `${employee.firstName} ажилтны ХАБЭА эрхийг цуцаллаа.`
                    : `${employee.firstName} ажилтанд ХАБЭА эрх олголоо.`,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error updating HSE access:', error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'ХАБЭА эрх өөрчлөхөд алдаа гарлаа.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${hasHseAccess ? 'bg-orange-100' : 'bg-green-100'}`}>
                            <HardHat className={`h-5 w-5 ${hasHseAccess ? 'text-orange-600' : 'text-green-600'}`} />
                        </div>
                        <AlertDialogTitle>
                            {hasHseAccess ? 'ХАБЭА эрх цуцлах' : 'ХАБЭА эрх олгох'}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-left">
                        {hasHseAccess ? (
                            <>
                                <strong>{employee.lastName} {employee.firstName}</strong> ажилтны ХАБЭА нэвтрэх эрхийг цуцлах гэж байна.
                                <br />
                                <br />
                                Энэ ажилтан ХАБЭА (Хөдөлмөрийн аюулгүй байдал, эрүүл ахуй) модуль руу нэвтрэх боломжгүй болно.
                            </>
                        ) : (
                            <>
                                <strong>{employee.lastName} {employee.firstName}</strong> ажилтанд ХАБЭА нэвтрэх эрх олгох гэж байна.
                                <br />
                                <br />
                                ХАБЭА эрхтэй хэрэглэгч нэвтрэх үед ХАБЭА (Хөдөлмөрийн аюулгүй байдал, эрүүл ахуй) модуль руу нэвтрэх сонголт харагдана.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Буцах</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={hasHseAccess ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {hasHseAccess ? 'ХАБЭА эрх цуцлах' : 'ХАБЭА эрх олгох'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
