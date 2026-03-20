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
import { Newspaper, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';

interface NewsAccessDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
}

export function NewsAccessDialog({
    open,
    onOpenChange,
    employee,
}: NewsAccessDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(false);

    const hasNewsAccess = !!employee.newsAccess;

    const handleConfirm = async () => {
        if (!firestore) return;

        setIsLoading(true);

        try {
            const employeeRef = doc(firestore, 'employees', employee.id);
            await updateDoc(employeeRef, {
                newsAccess: !hasNewsAccess,
            });

            toast({
                title: 'Амжилттай',
                description: hasNewsAccess
                    ? `${employee.firstName} ажилтны Мэдээлэл эрхийг цуцаллаа.`
                    : `${employee.firstName} ажилтанд Мэдээлэл эрх олголоо.`,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error updating news access:', error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'Мэдээлэл эрх өөрчлөхөд алдаа гарлаа.',
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
                        <div className={`p-2 rounded-full ${hasNewsAccess ? 'bg-orange-100' : 'bg-orange-100'}`}>
                            <Newspaper className={`h-5 w-5 ${hasNewsAccess ? 'text-orange-600' : 'text-orange-600'}`} />
                        </div>
                        <AlertDialogTitle>
                            {hasNewsAccess ? 'Мэдээлэл эрх цуцлах' : 'Мэдээлэл эрх олгох'}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-left">
                        {hasNewsAccess ? (
                            <>
                                <strong>{employee.lastName} {employee.firstName}</strong> ажилтны Мэдээлэл нэвтрэх эрхийг цуцлах гэж байна.
                                <br />
                                <br />
                                Энэ ажилтан Мэдээлэл (Байгууллагын мэдээ, мэдээлэл) модуль руу нэвтрэх боломжгүй болно.
                            </>
                        ) : (
                            <>
                                <strong>{employee.lastName} {employee.firstName}</strong> ажилтанд Мэдээлэл нэвтрэх эрх олгох гэж байна.
                                <br />
                                <br />
                                Мэдээлэл эрхтэй хэрэглэгч нэвтрэх үед Мэдээлэл (Байгууллагын мэдээ, мэдээлэл) модуль руу нэвтрэх сонголт харагдана.
                            </>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Буцах</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={hasNewsAccess ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {hasNewsAccess ? 'Мэдээлэл эрх цуцлах' : 'Мэдээлэл эрх олгох'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
