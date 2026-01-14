'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, ArrowRight } from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { OffboardingProcess } from '../types';

interface StepExitInterviewProps {
    process: OffboardingProcess;
}

export function StepExitInterview({ process }: StepExitInterviewProps) {
    const { firestore } = useFirebase();
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { toast } = useToast();

    const [feedback, setFeedback] = React.useState(process.exitInterview?.feedback || '');
    const [selectedReasons, setSelectedReasons] = React.useState<string[]>(process.exitInterview?.reasons || []);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const isReadOnly = process.exitInterview?.isCompleted;

    const reasonsList = [
        "Цалин хөлс, урамшуулал",
        "Карьерын өсөлт байхгүй",
        "Удирдлагын арга барил",
        "Ажлын ачаалал / Стресс",
        "Ажил амьдралын тэнцвэр",
        "Байгууллагын соёл",
        "Гэр бүлийн шалтгаан",
        "Суралцах / Хувийн хөгжил",
        "Эрүүл мэндийн шалтгаан"
    ];

    const toggleReason = (reason: string) => {
        if (isReadOnly) return;
        if (selectedReasons.includes(reason)) {
            setSelectedReasons(selectedReasons.filter(r => r !== reason));
        } else {
            setSelectedReasons([...selectedReasons, reason]);
        }
    };

    const handleSave = async (completeStep: boolean = false) => {
        if (!firestore || !employeeId) return;

        if (completeStep && !feedback) {
            toast({ variant: 'destructive', title: 'Дутуу мэдээлэл', description: 'Санал сэтгэгдлээ бичнэ үү.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const docRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, process.id);

            await updateDocumentNonBlocking(docRef, {
                exitInterview: {
                    feedback,
                    reasons: selectedReasons,
                    conductedAt: new Date().toISOString(),
                    isCompleted: completeStep
                },
                currentStep: completeStep ? 6 : 5
            });

            toast({ title: completeStep ? 'Амжилттай хадгалагдлаа' : 'Хадгалагдлаа', description: completeStep ? 'Дараагийн шат руу шилжлээ.' : 'Өөрчлөлтүүд хадгалагдлаа.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалах үед алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="max-w-3xl mx-auto border-t-4 border-t-pink-500 shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">5</span>
                    Гарах ярилцлага
                </CardTitle>
                <CardDescription>
                    Ажилтнаас санал асуулга авч, ажлаас гарч буй шалтгааныг тодруулах.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="space-y-3">
                    <Label className="text-base">Гарч буй үндсэн шалтгаанууд (Олон сонголттой)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {reasonsList.map((reason) => (
                            <div key={reason} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 cursor-pointer" onClick={() => toggleReason(reason)}>
                                <Checkbox id={reason} checked={selectedReasons.includes(reason)} onCheckedChange={() => toggleReason(reason)} disabled={isReadOnly} />
                                <label
                                    htmlFor={reason}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                                >
                                    {reason}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-base">Санал сэтгэгдэл / Сайжруулах зүйлс</Label>
                    <Textarea
                        disabled={isReadOnly}
                        placeholder="Байгууллагын үйл ажиллагаа, соёл, удирдлагын талаарх таны бодол..."
                        className="min-h-[150px]"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                    />
                </div>

            </CardContent>
            <CardFooter className="flex justify-between gap-3 border-t bg-muted/20 py-4">
                <Button variant="ghost" onClick={() => handleSave(false)} disabled={isSubmitting || isReadOnly}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Хадгалах
                </Button>
                {!isReadOnly ? (
                    <Button
                        onClick={() => handleSave(true)}
                        disabled={isSubmitting}
                        className="bg-pink-600 hover:bg-pink-700"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                        Дуусгах & Үргэлжлүүлэх
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                        <span>✅ Ярилцлага бөглөсөн</span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
