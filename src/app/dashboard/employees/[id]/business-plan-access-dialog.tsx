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
import { Target, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';

interface BusinessPlanAccessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
}

export function BusinessPlanAccessDialog({
    open,
    onOpenChange,
    employee,
}: BusinessPlanAccessDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const hasAccess = !!employee.businessPlanAccess;

    const handleConfirm = async () => {
        if (!firestore) return;

        setIsLoading(true);

        try {
            const employeeRef = doc(firestore, 'employees', employee.id);
            await updateDoc(employeeRef, {
                businessPlanAccess: !hasAccess,
            });

            toast({
                title: 'Амжилттай',
                description: hasAccess
                    ? `${employee.firstName} ажилтны Бизнес төлөвлөгөө эрхийг цуцаллаа.`
                    : `${employee.firstName} ажилтанд Бизнес төлөвлөгөө эрх олголоо.`,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error updating Business Plan access:', error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'Эрх өөрчлөхөд алдаа гарлаа.',
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
                            className={`p-2 rounded-full ${hasAccess ? 'bg-orange-100' : 'bg-indigo-100'}`}
                        >
                            <Target
                                className={`h-5 w-5 ${hasAccess ? 'text-orange-600' : 'text-indigo-600'}`}
                            />
                        </div>
                        <AlertDialogTitle>
                            {hasAccess
                                ? 'Бизнес төлөвлөгөө эрх цуцлах'
                                : 'Бизнес төлөвлөгөө эрх олгох'}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-left">
                        {hasAccess ? (
                            <>
                                <strong>
                                    {employee.lastName} {employee.firstName}
                                </strong>{' '}
                                ажилтны Бизнес төлөвлөгөө модулд нэвтрэх эрхийг цуцлах гэж байна.
                                <br />
                                <br />
                                Энэ ажилтан стратеги, OKR, KPI, гүйцэтгэлийн модулд нэвтрэх боломжгүй болно.
                            </>
                        ) : (
                            <>
                                <strong>
                                    {employee.lastName} {employee.firstName}
                                </strong>{' '}
                                ажилтанд Бизнес төлөвлөгөө модулд нэвтрэх эрх олгох гэж байна.
                                <br />
                                <br />
                                Эрхтэй хэрэглэгч нэвтрэх үед Бизнес төлөвлөгөө (стратеги, OKR, KPI, гүйцэтгэл) модулд нэвтрэх сонголт харагдана.
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
                            hasAccess
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : 'bg-indigo-600 hover:bg-indigo-700'
                        }
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {hasAccess ? 'Эрх цуцлах' : 'Эрх олгох'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
