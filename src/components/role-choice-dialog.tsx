'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Shield, User, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleChoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onChooseAdmin: () => void;
    onChooseEmployee: () => void;
    companyName?: string;
}

export function RoleChoiceDialog({
    open,
    onOpenChange,
    onChooseAdmin,
    onChooseEmployee,
    companyName = 'Систем',
}: RoleChoiceDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden rounded-2xl border border-border/50 shadow-xl">
                <DialogHeader className="text-center px-6 pt-8 pb-6 space-y-3">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center ring-4 ring-primary/5">
                        <Building className="h-7 w-7 text-primary" />
                    </div>
                    <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight">
                        {companyName}-д тавтай морил
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        Та админ эрхтэй хэрэглэгч байна. Аль хэлбэрээр нэвтрэхээ сонгоно уу.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 px-6 pb-8">
                    <button
                        type="button"
                        onClick={onChooseAdmin}
                        className={cn(
                            "flex items-start gap-4 w-full rounded-xl border-2 border-transparent p-5 text-left",
                            "bg-slate-50 dark:bg-slate-900/50 hover:border-primary/30 hover:bg-primary/5",
                            "dark:hover:bg-primary/10 transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        )}
                    >
                        <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="font-semibold text-base mb-1">Админаар нэвтрэх</div>
                            <div className="text-sm text-muted-foreground leading-snug">
                                Системийн удирдлага, тохиргоо, ажилтнуудын мэдээлэл
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={onChooseEmployee}
                        className={cn(
                            "flex items-start gap-4 w-full rounded-xl border-2 border-transparent p-5 text-left",
                            "bg-slate-50 dark:bg-slate-900/50 hover:border-primary/30 hover:bg-primary/5",
                            "dark:hover:bg-primary/10 transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        )}
                    >
                        <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <div className="font-semibold text-base mb-1">Ажилтнаар нэвтрэх</div>
                            <div className="text-sm text-muted-foreground leading-snug">
                                Өөрийн мэдээлэл, ирц, амралт, чөлөө
                            </div>
                        </div>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
