'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { Loader2, UserMinus, LogOut, Coffee, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, doc, writeBatch, increment } from 'firebase/firestore';
import type { Employee } from '../data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface OffboardingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
}

type Step = 1 | 'leave' | 'terminate';
type LeaveReason = 'Жирэмсний амралттай' | 'Хүүхэд асрах чөлөөтэй' | 'Урт хугацааны чөлөөтэй';
type TerminationReason = 'Өөрийн хүсэлтээр' | 'Компанийн санаачилгаар' | 'Бусад шалтгаан';

export function OffboardingDialog({
    open,
    onOpenChange,
    employee,
}: OffboardingDialogProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [step, setStep] = React.useState<Step>(1);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [leaveReason, setLeaveReason] = React.useState<LeaveReason | ''>('');
    const [terminationReason, setTerminationReason] = React.useState<TerminationReason | ''>('');

    React.useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setStep(1);
                setLeaveReason('');
                setTerminationReason('');
            }, 200);
        }
    }, [open]);

    const handleAction = async (action: 'transfer' | 'leave' | 'terminate') => {
        if (!firestore || !employee) return;
        setIsSubmitting(true);

        try {
            const batch = writeBatch(firestore);
            const employeeRef = doc(firestore, 'employees', employee.id);
            const historyCollectionRef = collection(firestore, `employees/${employee.id}/employmentHistory`);
            const historyDocRef = doc(historyCollectionRef);
            let toastMessage = '';
            let historyNote = '';

            if (action === 'transfer') {
                if (employee.positionId) {
                    const positionRef = doc(firestore, 'positions', employee.positionId);
                    batch.update(positionRef, { filled: increment(-1) });
                }
                batch.update(employeeRef, { positionId: null, jobTitle: 'Томилгоогүй' });
                historyNote = `${employee.jobTitle} албан тушаалаас чөлөөлж, шилжүүлэн томилохоор томилгоогүй болгов.`;
                toastMessage = 'Ажилтан амжилттай томилгоогүй боллоо.';
            } else if (action === 'leave') {
                if (!leaveReason) {
                    toast({ variant: 'destructive', title: 'Чөлөөний төрлөө сонгоно уу.' });
                    return;
                }
                if (employee.positionId) {
                    const positionRef = doc(firestore, 'positions', employee.positionId);
                    batch.update(positionRef, { filled: increment(-1) });
                }
                batch.update(employeeRef, {
                    status: leaveReason,
                    positionId: null,
                    jobTitle: 'Томилгоогүй',
                    lifecycleStage: 'offboarding'
                });
                historyNote = `${leaveReason} шалтгаанаар урт хугацааны чөлөө олгов.`;
                toastMessage = 'Ажилтанд амжилттай чөлөө олголоо.';
            } else if (action === 'terminate') {
                if (!terminationReason) {
                    toast({ variant: 'destructive', title: 'Халагдах шалтгаанаа сонгоно уу.' });
                    return;
                }
                if (employee.positionId) {
                    const positionRef = doc(firestore, 'positions', employee.positionId);
                    batch.update(positionRef, { filled: increment(-1) });
                }
                batch.update(employeeRef, {
                    status: 'Ажлаас гарсан',
                    positionId: null,
                    jobTitle: 'Томилгоогүй',
                    terminationDate: new Date().toISOString(),
                    lifecycleStage: 'alumni'
                });
                historyNote = `${terminationReason} шалтгаанаар ажлаас чөлөөлөв.`;
                toastMessage = 'Ажилтан амжилттай ажлаас чөлөөлөгдлөө.';
            }

            batch.set(historyDocRef, {
                eventType: 'Албан тушаалын өөрчлөлт',
                eventDate: new Date().toISOString(),
                notes: historyNote,
                createdAt: new Date().toISOString(),
            });

            await batch.commit();
            toast({ title: 'Амжилттай', description: toastMessage });
            onOpenChange(false);

        } catch (error) {
            console.error("Error during offboarding action: ", error);
            toast({ variant: "destructive", title: "Алдаа гарлаа", description: "Үйлдлийг гүйцэтгэхэд алдаа гарлаа." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStepOne = () => (
        <div className="space-y-4 py-6">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Хийх үйлдлээ сонгоно уу</label>
            <div className="grid gap-3">
                <Card onClick={() => handleAction('transfer')} className="group cursor-pointer border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all rounded-2xl overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-5">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center transition-transform group-hover:scale-110">
                            <UserMinus className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-800">Шилжүүлэн томилох</h3>
                            <p className="text-[11px] font-medium text-slate-400">Албан тушаалаас чөлөөлж, томилгоогүй болгох.</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </CardContent>
                </Card>

                <Card onClick={() => setStep('leave')} className="group cursor-pointer border-slate-100 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-50 transition-all rounded-2xl overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-5">
                        <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center transition-transform group-hover:scale-110">
                            <Coffee className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-800">Урт хугацааны чөлөө</h3>
                            <p className="text-[11px] font-medium text-slate-400">Жирэмсний, хүүхэд асрах болон бусад чөлөө.</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-purple-400 transition-colors" />
                    </CardContent>
                </Card>

                <Card onClick={() => setStep('terminate')} className="group cursor-pointer border-slate-100 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-50 transition-all rounded-2xl overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-5">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center transition-transform group-hover:scale-110">
                            <LogOut className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-800">Ажлаас чөлөөлөх</h3>
                            <p className="text-[11px] font-medium text-slate-400">Хөдөлмөрийн харилцааг бүрмөсөн дуусгавар болгох.</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-rose-400 transition-colors" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    const renderLeaveStep = () => (
        <div className="py-6 space-y-6">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Чөлөөний шалтгаан</label>
            <RadioGroup value={leaveReason} onValueChange={(value: LeaveReason) => setLeaveReason(value)} className="grid gap-3">
                {[
                    { id: 'maternity', value: 'Жирэмсний амралттай' },
                    { id: 'parental', value: 'Хүүхэд асрах чөлөөтэй' },
                    { id: 'long-term', value: 'Урт хугацааны чөлөөтэй' }
                ].map((reason) => (
                    <Label
                        key={reason.id}
                        htmlFor={reason.id}
                        className={cn(
                            "flex items-center gap-4 rounded-2xl border p-5 cursor-pointer transition-all hover:bg-slate-50",
                            leaveReason === reason.value ? "border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600" : "border-slate-100"
                        )}
                    >
                        <RadioGroupItem value={reason.value} id={reason.id} className="text-indigo-600" />
                        <span className="text-sm font-bold text-slate-700">{reason.value}</span>
                    </Label>
                ))}
            </RadioGroup>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting} className="rounded-xl font-bold text-[10px] uppercase tracking-wider">Буцах</Button>
                <Button onClick={() => handleAction('leave')} disabled={isSubmitting || !leaveReason} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl px-6 font-bold text-[10px] uppercase tracking-wider shadow-md shadow-indigo-100 transition-all active:scale-95">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Батлах
                </Button>
            </DialogFooter>
        </div>
    );

    const renderTerminateStep = () => (
        <div className="py-6 space-y-6">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Чөлөөлөх үндэслэл</label>
            <RadioGroup value={terminationReason} onValueChange={(value: TerminationReason) => setTerminationReason(value)} className="grid gap-3">
                {[
                    { id: 'request', value: 'Өөрийн хүсэлтээр' },
                    { id: 'company', value: 'Компанийн санаачилгаар' },
                    { id: 'other', value: 'Бусад шалтгаан' }
                ].map((reason) => (
                    <Label
                        key={reason.id}
                        htmlFor={reason.id}
                        className={cn(
                            "flex items-center gap-4 rounded-2xl border p-5 cursor-pointer transition-all hover:bg-slate-50",
                            terminationReason === reason.value ? "border-rose-600 bg-rose-50/30 ring-1 ring-rose-600" : "border-slate-100"
                        )}
                    >
                        <RadioGroupItem value={reason.value} id={reason.id} className="text-rose-600" />
                        <span className="text-sm font-bold text-slate-700">{reason.value}</span>
                    </Label>
                ))}
            </RadioGroup>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium text-rose-700 leading-relaxed">Анхаар: Ажлаас чөлөөлөх үйлдлийг буцаах боломжгүй бөгөөд ажилтны статус "Ажлаас гарсан" төлөвт шилжинэ.</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting} className="rounded-xl font-bold text-[10px] uppercase tracking-wider">Буцах</Button>
                <Button variant="destructive" onClick={() => handleAction('terminate')} disabled={isSubmitting || !terminationReason} className="bg-rose-500 hover:bg-rose-600 rounded-xl px-6 font-bold text-[10px] uppercase tracking-wider shadow-md shadow-rose-100 transition-all active:scale-95">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                    Ажлаас чөлөөлөх
                </Button>
            </DialogFooter>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-none p-10 shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="h-12 w-12 rounded-[1.25rem] bg-slate-50 flex items-center justify-center text-slate-400">
                            <UserMinus className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                            <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1.5 block">Offboarding</label>
                            <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">Хөдөлмөрийн харилцааг зохицуулах</DialogTitle>
                        </div>
                    </div>
                    <DialogDescription className="text-sm font-medium text-slate-400 text-left pt-2">
                        <span className="font-bold text-slate-600">{employee?.lastName} {employee?.firstName}</span> ажилтныг одоогийн албан тушаал болон хөдөлмөрийн харилцаанаас чөлөөлөх үйлдлийг эхлүүлж байна.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    {isSubmitting && (
                        <div className="absolute inset-x-0 -top-2 flex justify-center z-50">
                            <div className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 border shadow-xl flex items-center gap-3 animate-bounce">
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Шинэчилж байна...</span>
                            </div>
                        </div>
                    )}
                    <div className={cn("transition-all duration-300", isSubmitting && "opacity-50 pointer-events-none")}>
                        {step === 1 && renderStepOne()}
                        {step === 'leave' && renderLeaveStep()}
                        {step === 'terminate' && renderTerminateStep()}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
