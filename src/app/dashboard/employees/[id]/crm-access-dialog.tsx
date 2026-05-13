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
import { HeartHandshake, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';

interface CrmAccessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
}

export function CrmAccessDialog({
    open,
    onOpenChange,
    employee,
}: CrmAccessDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const hasCrmAccess = !!employee.crmAccess;

    const handleConfirm = async () => {
        if (!firestore) return;

        setIsLoading(true);

        try {
            const employeeRef = doc(firestore, 'employees', employee.id);
            await updateDoc(employeeRef, {
                crmAccess: !hasCrmAccess,
            });

            toast({
                title: 'Амжилттай',
                description: hasCrmAccess
                    ? `${employee.firstName} ажилтны CRM эрхийг цуцаллаа.`
                    : `${employee.firstName} ажилтанд CRM эрх олголоо.`,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error updating CRM access:', error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'CRM эрх өөрчлөхөд алдаа гарлаа.',
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
                        <div
                            className={`p-2 rounded-full ${hasCrmAccess ? 'bg-orange-100' : 'bg-cyan-100'}`}
                        >
                            <HeartHandshake
                                className={`h-5 w-5 ${hasCrmAccess ? 'text-orange-600' : 'text-cyan-600'}`}
                            />
                        </div>
                        <AlertDialogTitle>
                            {hasCrmAccess ? 'CRM эрх цуцлах' : 'CRM эрх олгох'}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-left">
                        {hasCrmAccess ? (
                            <>
                                <strong>
                                    {employee.lastName} {employee.firstName}
                                </strong>{' '}
                                ажилтны CRM нэвтрэх эрхийг цуцлах гэж байна.
                                <br />
                                <br />
                                Энэ ажилтан CRM (Харилцагчийн удирдлагын систем) руу
                                нэвтрэх боломжгүй болно.
                            </>
                        ) : (
                            <>
                                <strong>
                                    {employee.lastName} {employee.firstName}
                                </strong>{' '}
                                ажилтанд CRM нэвтрэх эрх олгох гэж байна.
                                <br />
                                <br />
                                CRM эрхтэй хэрэглэгч нэвтрэх үед CRM (Харилцагчийн
                                удирдлагын систем) руу нэвтрэх сонголт харагдана.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Буцах</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={
                            hasCrmAccess
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : 'bg-cyan-600 hover:bg-cyan-700'
                        }
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {hasCrmAccess ? 'CRM эрх цуцлах' : 'CRM эрх олгох'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
