'use client';

import * as React from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Lock, KeyRound, Loader2, LogIn } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import type { Employee } from '../data';

export interface SystemSettingsTabContentProps {
    employee: Employee;
    currentUserId: string;
    currentUserRole?: 'admin' | 'employee';
}

export function SystemSettingsTabContent({
    employee,
    currentUserId,
    currentUserRole,
}: SystemSettingsTabContentProps) {
    const { firestore, auth } = useFirebase();
    const { toast } = useToast();
    const [disableConfirmOpen, setDisableConfirmOpen] = React.useState(false);
    const [enableConfirmOpen, setEnableConfirmOpen] = React.useState(false);
    const [isTogglingAccess, setIsTogglingAccess] = React.useState(false);
    const [isResettingPassword, setIsResettingPassword] = React.useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);

    const isAdmin = currentUserRole === 'admin';
    const isSelf = employee.id === currentUserId;
    const loginDisabled = !!employee.loginDisabled;
    const authEmail = `${employee.employeeCode}@example.com`;

    const handleDisableAccess = async () => {
        if (!firestore) return;
        setIsTogglingAccess(true);
        try {
            const ref = doc(firestore, 'employees', employee.id);
            await updateDoc(ref, { loginDisabled: true });
            toast({
                title: 'Амжилттай',
                description: `${employee.firstName} ${employee.lastName}-н нэвтрэх эрх идэвхгүй боллоо.`,
            });
            setDisableConfirmOpen(false);
        } catch (e) {
            console.error('Disable access error:', e);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Нэвтрэх эрх хаах үед алдаа гарлаа.',
            });
        } finally {
            setIsTogglingAccess(false);
        }
    };

    const handleEnableAccess = async () => {
        if (!firestore) return;
        setIsTogglingAccess(true);
        try {
            const ref = doc(firestore, 'employees', employee.id);
            await updateDoc(ref, { loginDisabled: false });
            toast({
                title: 'Амжилттай',
                description: `${employee.firstName} ${employee.lastName}-н нэвтрэх эрх дахин идэвхжлээ.`,
            });
            setEnableConfirmOpen(false);
        } catch (e) {
            console.error('Enable access error:', e);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Нэвтрэх эрх нээх үед алдаа гарлаа.',
            });
        } finally {
            setIsTogglingAccess(false);
        }
    };

    const handleResetPassword = async () => {
        if (!auth) return;
        setIsResettingPassword(true);
        try {
            await sendPasswordResetEmail(auth, authEmail);
            toast({
                title: 'Имэйл илгээгдлээ',
                description: 'Нууц үг сэргээх холбоос нэвтрэх имэйл рүү илгээгдлээ.',
            });
        } catch (e: unknown) {
            const err = e as { code?: string; message?: string };
            console.error('Password reset error:', err);
            let msg = 'Нууц үг сэргээх имэйл илгээхэд алдаа гарлаа.';
            if (err?.code === 'auth/user-not-found') {
                msg = 'Энэ нэвтрэх имэйлтэй хэрэглэгч олдсонгүй.';
            } else if (err?.message) {
                msg = err.message;
            }
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: msg,
            });
        } finally {
            setIsResettingPassword(false);
        }
    };

    const showDisableEnable = isAdmin && !isSelf;
    const showResetForOther = isAdmin && !isSelf;
    const showChangePassword = isSelf;

    return (
        <div className="space-y-6">
            {/* Нэвтрэх мэдээлэл */}
            <Card className="border-none shadow-sm bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <LogIn className="h-4 w-4" />
                        Нэвтрэх мэдээлэл
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Нэвтрэх нэр болон одоогийн төлөв.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">Нэвтрэх нэр:</span>
                        <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {employee.employeeCode}@example.com
                        </code>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Нэвтрэх эрх:</span>
                        {loginDisabled ? (
                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                                Идэвхгүй
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                Идэвхтэй
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Нэвтрэх эрх хаах/нээх */}
            {showDisableEnable && (
                <Card className="border-none shadow-sm bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <KeyRound className="h-4 w-4" />
                            Нэвтрэх эрх
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Энэ ажилтны системд нэвтрэх эрхийг идэвхгүй болгох эсвэл дахин идэвхжүүлэх.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loginDisabled ? (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => setEnableConfirmOpen(true)}
                                disabled={isTogglingAccess}
                            >
                                {isTogglingAccess ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <LogIn className="h-4 w-4" />
                                )}
                                Нэвтрэх эрх нээх
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                                onClick={() => setDisableConfirmOpen(true)}
                                disabled={isTogglingAccess}
                            >
                                {isTogglingAccess ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Lock className="h-4 w-4" />
                                )}
                                Нэвтрэх эрх хаах
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Нууц үг */}
            <Card className="border-none shadow-sm bg-white">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Нууц үг
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {showChangePassword
                            ? 'Өөрийн нууц үгээ солих.'
                            : showResetForOther
                              ? 'Нууц сэргээх холбоос нэвтрэх имэйл рүү илгээх.'
                              : 'Нууц үгтэй холбоотой үйлдэл хийх эрх байхгүй.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {showChangePassword && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setChangePasswordOpen(true)}
                        >
                            <Lock className="h-4 w-4" />
                            Нууц үг солих
                        </Button>
                    )}
                    {showResetForOther && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={handleResetPassword}
                            disabled={isResettingPassword}
                        >
                            {isResettingPassword ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <KeyRound className="h-4 w-4" />
                            )}
                            Нууц үг сэргээх
                        </Button>
                    )}
                    {!showChangePassword && !showResetForOther && (
                        <p className="text-xs text-muted-foreground">
                            Өөр хэрэглэгчийн нууц үг сэргээх эрх зөвхөн админд байна.
                        </p>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={disableConfirmOpen} onOpenChange={setDisableConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Нэвтрэх эрх хаах</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та <strong>{employee.lastName} {employee.firstName}</strong> ажилтны нэвтрэх эрхийг идэвхгүй болгох гэж байна.
                            Дахин нэвтрэх бол эрх нээгдэх хүртэл боломжгүй болно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isTogglingAccess}>Буцах</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDisableAccess();
                            }}
                            disabled={isTogglingAccess}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {isTogglingAccess && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Хаах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={enableConfirmOpen} onOpenChange={setEnableConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Нэвтрэх эрх нээх</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та <strong>{employee.lastName} {employee.firstName}</strong> ажилтны нэвтрэх эрхийг дахин идэвхжүүлэх гэж байна.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isTogglingAccess}>Буцах</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleEnableAccess();
                            }}
                            disabled={isTogglingAccess}
                        >
                            {isTogglingAccess && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Нээх
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
        </div>
    );
}
