'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { History as HistoryIcon, CalendarIcon, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Position } from '../../types';

// ─── Approve Confirmation Dialog ─────────────────────────────────
interface ApproveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    pendingCount: number;
    isApproving: boolean;
    approvalDate: Date;
    onApprovalDateChange: (date: Date) => void;
    approvalNote: string;
    onApprovalNoteChange: (note: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ApproveDialog = ({
    open,
    onOpenChange,
    selectedCount,
    pendingCount,
    isApproving,
    approvalDate,
    onApprovalDateChange,
    approvalNote,
    onApprovalNoteChange,
    onConfirm,
    onCancel,
}: ApproveDialogProps) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="sm:max-w-[500px]">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="h-5 w-5" />
                    {selectedCount > 0 ? 'Ажлын байр баталгаажуулах' : 'Бүтэц баталгаажуулах'}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-600" asChild>
                    <div>
                        {selectedCount === 0 && pendingCount > 0 ? (
                            <div role="alert" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium mb-2 flex items-start gap-2">
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>Анхааруулга: {pendingCount} ажлын байр батлагдаагүй байна. Бүтцийг батлахын тулд бүх ажлын байрнууд батлагдсан байх ёстой.</span>
                            </div>
                        ) : (
                            <span>
                                {selectedCount > 0
                                    ? `Сонгосон ${selectedCount} ажлын байрыг батлахдаа итгэлтэй байна уу?`
                                    : "Ажлын байрны бүтцийг баталснаар орон тоо албан ёсоор бүртгэгдэж, түүхэнд хадгалагдана."
                                }
                            </span>
                        )}
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Батлах огноо (Тушаалын огноо)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal h-11 rounded-xl border-slate-200",
                                    !approvalDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {approvalDate ? format(approvalDate, "yyyy оны MM сарын dd", { locale: mn }) : <span>Огноо сонгох</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={approvalDate}
                                onSelect={(date) => date && onApprovalDateChange(date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Тэмдэглэл (Сонголттой)</Label>
                    <Textarea
                        placeholder="Батлахтай холбоотой тайлбар оруулна уу..."
                        value={approvalNote}
                        onChange={(e) => onApprovalNoteChange(e.target.value)}
                        className="min-h-[100px] rounded-xl border-slate-200 resize-none focus:ring-primary"
                    />
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={onCancel}>Цуцлах</AlertDialogCancel>
                <AlertDialogAction
                    onClick={(e) => {
                        e.preventDefault();
                        onConfirm();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 px-6 rounded-xl transition-all"
                    disabled={isApproving}
                >
                    {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Ажлын байр батлах
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

// ─── Disapprove Confirmation Dialog ──────────────────────────────
interface DisapproveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isApproving: boolean;
    disapproveDate: Date;
    onDisapproveDateChange: (date: Date) => void;
    disapproveNote: string;
    onDisapproveNoteChange: (note: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const DisapproveDialog = ({
    open,
    onOpenChange,
    isApproving,
    disapproveDate,
    onDisapproveDateChange,
    disapproveNote,
    onDisapproveNoteChange,
    onConfirm,
    onCancel,
}: DisapproveDialogProps) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="sm:max-w-[500px]">
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                    <HistoryIcon className="h-5 w-5" />
                    Батламж цуцлахыг баталгаажуулах
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-600">
                    Сонгосон ажлын байрнуудын батламжийг цуцалснаар эдгээр нь "Батлагдаагүй" төлөвт шилжинэ.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Цуцлах огноо (Тушаалын огноо)</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full pl-3 text-left font-normal h-10 border-slate-200",
                                    !disapproveDate && "text-muted-foreground"
                                )}
                            >
                                {disapproveDate ? (
                                    format(disapproveDate, "yyyy оны MM сарын dd", { locale: mn })
                                ) : (
                                    <span>Огноо сонгох</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={disapproveDate}
                                onSelect={(date) => date && onDisapproveDateChange(date)}
                                disabled={(date) => date > new Date()}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="disapprove-note" className="text-sm font-medium">Цуцлах шалтгаан (заавал биш)</Label>
                    <Textarea
                        id="disapprove-note"
                        placeholder="Шалтгаан эсвэл нэмэлт тайлбар..."
                        value={disapproveNote}
                        onChange={(e) => onDisapproveNoteChange(e.target.value)}
                        className="min-h-[100px] resize-none border-slate-200 focus:border-amber-500 focus:ring-amber-500"
                    />
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={onCancel}>Цуцлах</AlertDialogCancel>
                <AlertDialogAction
                    onClick={(e) => {
                        e.preventDefault();
                        onConfirm();
                    }}
                    variant="warning"
                    disabled={isApproving}
                >
                    {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HistoryIcon className="w-4 h-4" />}
                    Батламж цуцлах
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

// ─── Bulk Delete Confirmation Dialog ─────────────────────────────
interface DeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    onConfirm: () => void;
}

export const DeleteDialog = ({
    open,
    onOpenChange,
    selectedCount,
    onConfirm,
}: DeleteDialogProps) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Устгахдаа итгэлтэй байна уу?</AlertDialogTitle>
                <AlertDialogDescription>
                    Сонгосон {selectedCount} ажлын байрыг устгах гэж байна. Энэ үйлдлийг буцаах боломжгүй.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Болих</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onConfirm}>
                    Тийм, устгах
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

// ─── Department Delete Confirmation Dialog ───────────────────────
interface DeptDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isDeptDeleting: boolean;
    onConfirm: () => void;
}

export const DeptDeleteDialog = ({
    open,
    onOpenChange,
    isDeptDeleting,
    onConfirm,
}: DeptDeleteDialogProps) => (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">Нэгжийг устгах уу?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium">
                    Энэ нэгж нь батлагдсан түүхгүй тул шууд устгах боломжтой. Энэ үйлдлийг буцаах боломжгүй.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="font-bold rounded-xl border-none bg-muted hover:bg-muted/80">Болих</AlertDialogCancel>
                <AlertDialogAction
                    onClick={onConfirm}
                    className="bg-destructive hover:bg-destructive/90 font-bold rounded-xl shadow-lg shadow-destructive/20"
                    disabled={isDeptDeleting}
                >
                    {isDeptDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Устгах'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);

// ─── Department Disband Dialog ───────────────────────────────────
interface DeptDisbandDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isDeptDeleting: boolean;
    disbandReason: string;
    onDisbandReasonChange: (reason: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const DeptDisbandDialog = ({
    open,
    onOpenChange,
    isDeptDeleting,
    disbandReason,
    onDisbandReasonChange,
    onConfirm,
    onCancel,
}: DeptDisbandDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-2xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-xl">
                    <AlertTriangle className="w-6 h-6" />
                    Нэгжийг татан буулгах
                </DialogTitle>
                <DialogDescription className="font-medium text-slate-500 pt-2">
                    Энэ нэгж нь өмнө нь батлагдсан түүхтэй тул "Татан буулгах" бүртгэл үүсгэж хаах шаардлагатай.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
                <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-400">Татан буулгах шалтгаан / Тушаалын дугаар</Label>
                    <Textarea
                        placeholder="Жишээ: Гүйцэтгэх захирлын тушаал №..."
                        value={disbandReason}
                        onChange={(e) => onDisbandReasonChange(e.target.value)}
                        className="min-h-[120px] rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20"
                    />
                </div>
                <div role="alert" className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-[11px] text-amber-900 leading-relaxed font-medium">
                    <strong className="block mb-1">Анхааруулга:</strong>
                    Татан буулгаснаар энэ нэгжийн түүх архивлагдаж, идэвхтэй бүтцээс хасагдана. Доторх бүх идэвхтэй ажлын байрууд мөн архивлагдах болно.
                </div>
            </div>

            <DialogFooter className="gap-2">
                <Button variant="outline" className="font-bold rounded-xl border-none bg-muted hover:bg-muted/80" onClick={onCancel}>Болих</Button>
                <Button
                    variant="destructive"
                    onClick={onConfirm}
                    className="font-bold rounded-xl shadow-lg shadow-destructive/20"
                    disabled={isDeptDeleting || !disbandReason.trim()}
                >
                    {isDeptDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Татан буулгах
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

// ─── Position Disband Dialog ─────────────────────────────────────
interface PosDisbandDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isDeleting: boolean;
    disbandPosition: Position | null;
    disbandReason: string;
    onDisbandReasonChange: (reason: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const PosDisbandDialog = ({
    open,
    onOpenChange,
    isDeleting,
    disbandPosition,
    disbandReason,
    onDisbandReasonChange,
    onConfirm,
    onCancel,
}: PosDisbandDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-2xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-xl">
                    <AlertTriangle className="w-6 h-6" />
                    Ажлын байр татан буулгах
                </DialogTitle>
                <DialogDescription className="font-medium text-slate-500 pt-2">
                    "{disbandPosition?.title}" ажлын байрыг татан буулгаж, идэвхгүй төлөвт шилжүүлэх гэж байна.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
                <div className="space-y-2">
                    <Label className="font-bold text-xs uppercase tracking-wider text-slate-400">Татан буулгах шалтгаан / Тушаалын дугаар</Label>
                    <Textarea
                        placeholder="Жишээ: Гүйцэтгэх захирлын тушаал №..."
                        value={disbandReason}
                        onChange={(e) => onDisbandReasonChange(e.target.value)}
                        className="min-h-[120px] rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20"
                    />
                </div>
                <div role="alert" className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-[11px] text-amber-900 leading-relaxed font-medium">
                    <strong className="block mb-1">Мэдээлэл:</strong>
                    Ажлын байрыг татан буулгаснаар тухайн ажлын байр идэвхгүй болж, бүтэц дээр харагдахаа болино. Түүхэн мэдээлэл хэвээр үлдэнэ.
                </div>
            </div>

            <DialogFooter className="gap-2">
                <Button variant="outline" className="font-bold rounded-xl border-none bg-muted hover:bg-muted/80" onClick={onCancel}>Болих</Button>
                <Button
                    variant="destructive"
                    onClick={onConfirm}
                    className="font-bold rounded-xl shadow-lg shadow-destructive/20"
                    disabled={isDeleting || !disbandReason.trim()}
                >
                    {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Татан буулгах
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
