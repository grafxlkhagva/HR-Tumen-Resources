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
import { Loader2, ArrowRight, UserMinus, LogOut, Coffee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, doc, writeBatch, increment } from 'firebase/firestore';
import type { Employee } from '../data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

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
                toast({ variant: 'destructive', title: 'Чөлөөний төрлөө сонгоно уу.'});
                return;
            }
            if (employee.positionId) {
                const positionRef = doc(firestore, 'positions', employee.positionId);
                batch.update(positionRef, { filled: increment(-1) });
            }
            batch.update(employeeRef, { status: leaveReason, positionId: null, jobTitle: 'Томилгоогүй' });
            historyNote = `${leaveReason} шалтгаанаар урт хугацааны чөлөө олгов.`;
            toastMessage = 'Ажилтанд амжилттай чөлөө олголоо.';
        } else if (action === 'terminate') {
            if (!terminationReason) {
                toast({ variant: 'destructive', title: 'Халагдах шалтгаанаа сонгоно уу.'});
                return;
            }
            if (employee.positionId) {
                const positionRef = doc(firestore, 'positions', employee.positionId);
                batch.update(positionRef, { filled: increment(-1) });
            }
            batch.update(employeeRef, { status: 'Ажлаас гарсан', positionId: null, jobTitle: 'Томилгоогүй', terminationDate: new Date().toISOString() });
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
    <div className="grid grid-cols-1 gap-4 py-4">
        <Card onClick={() => handleAction('transfer')} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
                <UserMinus className="h-8 w-8 text-primary" />
                <div>
                    <h3 className="font-semibold">Шилжүүлэн томилох</h3>
                    <p className="text-sm text-muted-foreground">Ажилтныг одоогийн албан тушаалаас чөлөөлж, томилгоогүй болгох.</p>
                </div>
            </CardContent>
        </Card>
        <Card onClick={() => setStep('leave')} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
                <Coffee className="h-8 w-8 text-purple-500" />
                <div>
                    <h3 className="font-semibold">Урт хугацааны чөлөө</h3>
                    <p className="text-sm text-muted-foreground">Жирэмсний, хүүхэд асрах болон бусад чөлөө олгох.</p>
                </div>
            </CardContent>
        </Card>
         <Card onClick={() => setStep('terminate')} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4 flex items-center gap-4">
                <LogOut className="h-8 w-8 text-red-500" />
                <div>
                    <h3 className="font-semibold">Ажлаас чөлөөлөх</h3>
                    <p className="text-sm text-muted-foreground">Ажилтны хөдөлмөрийн харилцааг дуусгавар болгох.</p>
                </div>
            </CardContent>
        </Card>
    </div>
  );

  const renderLeaveStep = () => (
    <div className="py-4 space-y-4">
        <RadioGroup value={leaveReason} onValueChange={(value: LeaveReason) => setLeaveReason(value)}>
            <div className="space-y-2">
                <Label htmlFor="maternity" className="flex items-center gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="Жирэмсний амралттай" id="maternity" />
                    Жирэмсний амралттай
                </Label>
                 <Label htmlFor="parental" className="flex items-center gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="Хүүхэд асрах чөлөөтэй" id="parental" />
                    Хүүхэд асрах чөлөөтэй
                </Label>
                 <Label htmlFor="long-term" className="flex items-center gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="Урт хугацааны чөлөөтэй" id="long-term" />
                    Урт хугацааны чөлөөтэй
                </Label>
            </div>
        </RadioGroup>
        <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>Буцах</Button>
            <Button onClick={() => handleAction('leave')} disabled={isSubmitting || !leaveReason}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Баталгаажуулах
            </Button>
        </DialogFooter>
    </div>
  );
  
  const renderTerminateStep = () => (
    <div className="py-4 space-y-4">
        <RadioGroup value={terminationReason} onValueChange={(value: TerminationReason) => setTerminationReason(value)}>
            <div className="space-y-2">
                <Label htmlFor="request" className="flex items-center gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="Өөрийн хүсэлтээр" id="request" />
                    Өөрийн хүсэлтээр
                </Label>
                 <Label htmlFor="company" className="flex items-center gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="Компанийн санаачилгаар" id="company" />
                    Компанийн санаачилгаар
                </Label>
                 <Label htmlFor="other" className="flex items-center gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="Бусад шалтгаан" id="other" />
                    Бусад шалтгаан
                </Label>
            </div>
        </RadioGroup>
        <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>Буцах</Button>
            <Button variant="destructive" onClick={() => handleAction('terminate')} disabled={isSubmitting || !terminationReason}>
                 {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Ажлаас чөлөөлөх
            </Button>
        </DialogFooter>
    </div>
  );

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Чөлөөлөх / Халах үйлдэл</DialogTitle>
            <DialogDescription>
                {employee?.firstName} {employee?.lastName}-г {employee?.jobTitle} албан тушаалаас чөлөөлөх гэж байна. Хийх үйлдлээ сонгоно уу.
            </DialogDescription>
          </DialogHeader>
          {isSubmitting && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          {step === 1 && renderStepOne()}
          {step === 'leave' && renderLeaveStep()}
          {step === 'terminate' && renderTerminateStep()}
        </DialogContent>
      </Dialog>
  );
}
