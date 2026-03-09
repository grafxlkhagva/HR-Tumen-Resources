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
import { Truck, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';

interface TmsAccessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
}

export function TmsAccessDialog({
    open,
    onOpenChange,
    employee,
}: TmsAccessDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const hasTmsAccess = !!employee.tmsAccess;

    const handleConfirm = async () => {
        if (!firestore) return;

        setIsLoading(true);

        try {
            const employeeRef = doc(firestore, 'employees', employee.id);
            await updateDoc(employeeRef, {
                tmsAccess: !hasTmsAccess,
            });

            toast({
                title: 'Амжилттай',
                description: hasTmsAccess
                    ? `${employee.firstName} ажилтны TMS эрхийг цуцаллаа.`
                    : `${employee.firstName} ажилтанд TMS эрх олголоо.`,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error updating TMS access:', error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'TMS эрх өөрчлөхөд алдаа гарлаа.',
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
                        <div className={`p-2 rounded-full ${hasTmsAccess ? 'bg-orange-100' : 'bg-violet-100'}`}>
                            <Truck className={`h-5 w-5 ${hasTmsAccess ? 'text-orange-600' : 'text-violet-600'}`} />
                        </div>
                        <AlertDialogTitle>
                            {hasTmsAccess ? 'TMS эрх цуцлах' : 'TMS эрх олгох'}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-left">
                        {hasTmsAccess ? (
                            <>
                                <strong>{employee.lastName} {employee.firstName}</strong> ажилтны TMS нэвтрэх эрхийг цуцлах гэж байна.
                                <br />
                                <br />
                                Энэ ажилтан TMS (Тээврийн удирдлагын систем) руу нэвтрэх боломжгүй болно.
                            </>
                        ) : (
                            <>
                                <strong>{employee.lastName} {employee.firstName}</strong> ажилтанд TMS нэвтрэх эрх олгох гэж байна.
                                <br />
                                <br />
                                TMS эрхтэй хэрэглэгч нэвтрэх үед TMS (Тээврийн удирдлагын систем) руу нэвтрэх сонголт харагдана.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Буцах</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={hasTmsAccess ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {hasTmsAccess ? 'TMS эрх цуцлах' : 'TMS эрх олгох'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
