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
import { Stamp, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';

interface OfficialLettersAccessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
}

export function OfficialLettersAccessDialog({
    open,
    onOpenChange,
    employee,
}: OfficialLettersAccessDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const hasAccess = !!employee.officialLettersAccess;

    const handleConfirm = async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const employeeRef = doc(firestore, 'employees', employee.id);
            await updateDoc(employeeRef, { officialLettersAccess: !hasAccess });
            toast({
                title: 'Амжилттай',
                description: hasAccess
                    ? `${employee.firstName} ажилтны Албан бичиг эрхийг цуцаллаа.`
                    : `${employee.firstName} ажилтанд Албан бичиг эрх олголоо.`,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Error updating Official Letters access:', error);
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
                        <div className={`p-2 rounded-full ${hasAccess ? 'bg-orange-100' : 'bg-amber-100'}`}>
                            <Stamp
                                className={`h-5 w-5 ${hasAccess ? 'text-orange-600' : 'text-amber-700'}`}
                            />
                        </div>
                        <AlertDialogTitle>
                            {hasAccess ? 'Албан бичиг эрх цуцлах' : 'Албан бичиг эрх олгох'}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-left">
                        {hasAccess ? (
                            <>
                                <strong>
                                    {employee.lastName} {employee.firstName}
                                </strong>{' '}
                                ажилтны Албан бичиг модулд нэвтрэх эрхийг цуцлах гэж байна.
                                <br />
                                <br />
                                Энэ ажилтан албан бланк үүсгэх, загвар удирдах, нэгдсэн архив үзэх боломжгүй болно.
                            </>
                        ) : (
                            <>
                                <strong>
                                    {employee.lastName} {employee.firstName}
                                </strong>{' '}
                                ажилтанд Албан бичиг модулд нэвтрэх эрх олгох гэж байна.
                                <br />
                                <br />
                                Эрхтэй хэрэглэгч нэвтрэх үед Албан бичиг (бланк, загвар, архив) модулд нэвтрэх сонголт харагдана.
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
                                : 'bg-amber-700 hover:bg-amber-800'
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
