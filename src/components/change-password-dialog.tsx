'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Одоогийн нууц үгээ оруулна уу.'),
    newPassword: z.string().min(6, 'Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх байх ёстой.'),
    confirmPassword: z.string().min(1, 'Нууц үгээ дахин оруулна уу.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Нууц үгүүд таарахгүй байна.",
    path: ["confirmPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface ChangePasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
    const auth = useAuth();
    const { toast } = useToast();
    const [showCurrent, setShowCurrent] = React.useState(false);
    const [showNew, setShowNew] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);

    const form = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    });

    const { isSubmitting } = form.formState;

    const onSubmit = async (data: ChangePasswordFormValues) => {
        if (!auth || !auth.currentUser || !auth.currentUser.email) return;

        try {
            // 1. Re-authenticate
            const credential = EmailAuthProvider.credential(auth.currentUser.email, data.currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);

            // 2. Update password
            await updatePassword(auth.currentUser, data.newPassword);

            toast({
                title: "Амжилттай",
                description: "Нууц үг амжилттай солигдлоо.",
            });

            form.reset();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Password change error:', error);
            let message = "Нууц үг солиход алдаа гарлаа.";

            if (error.code === 'auth/wrong-password' || error.message?.includes('invalid-credential')) {
                form.setError('currentPassword', { message: 'Одоогийн нууц үг буруу байна.' });
                return;
            }

            toast({
                variant: "destructive",
                title: "Алдаа",
                description: message,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <DialogHeader>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-full bg-primary/10">
                                    <Lock className="h-5 w-5 text-primary" />
                                </div>
                                <DialogTitle>Нууц үг солих</DialogTitle>
                            </div>
                            <DialogDescription>
                                Таны бүртгэлийн аюулгүй байдлыг хангахын тулд одоогийн нууц үгээ оруулан баталгаажуулна уу.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Одоогийн нууц үг</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showCurrent ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrent(!showCurrent)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Шинэ нууц үг</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showNew ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNew(!showNew)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Шинэ нууц үг давтах</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirm ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirm(!showConfirm)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                                Цуцлах
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Нууц үг шинэчлэх
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
