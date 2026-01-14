'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, CheckCircle2, HeartHandshake, Mail, Archive } from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { OffboardingProcess } from '../types';

interface StepFarewellProps {
    process: OffboardingProcess;
}

export function StepFarewell({ process }: StepFarewellProps) {
    const { firestore } = useFirebase();
    const { id } = useParams();
    const router = useRouter();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { toast } = useToast();

    const [messageSent, setMessageSent] = React.useState(process.farewell?.messageSent || false);
    const [eventOrganized, setEventOrganized] = React.useState(process.farewell?.eventOrganized || false);

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const isCompleted = process.farewell?.isCompleted;

    const handleCompleteProcess = async () => {
        if (!firestore || !employeeId) return;

        setIsSubmitting(true);
        try {
            const processDocRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, process.id);
            const employeeDocRef = doc(firestore, 'employees', employeeId);

            // 1. Complete Offboarding Process
            await updateDocumentNonBlocking(processDocRef, {
                farewell: {
                    messageSent,
                    eventOrganized,
                    isCompleted: true
                },
                currentStep: 9,
                status: 'COMPLETED',
                completedAt: new Date().toISOString()
            });

            // 2. Archive Employee (Update status to TERMINATED or similar)
            // Note: In a real world, we might want to ask for specific status (Resigned vs Terminated) based on Step 1
            const newStatus = process.notice?.type === 'RESIGNATION' ? 'RESIGNED' : 'TERMINATED';

            await updateDoc(employeeDocRef, { // Using updateDoc for critical status change
                status: newStatus,
                employmentEndDate: process.notice?.lastWorkingDate || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            toast({ title: 'Процесс дууслаа', description: 'Ажилтан амжилттай чөлөөлөгдлөө.' });

            // Redirect or refresh
            // router.push('/dashboard/employees'); 
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалах үед алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="max-w-3xl mx-auto border-t-4 border-t-green-600 shadow-lg">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                    <HeartHandshake className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">Үдэлт ба Хаалт</CardTitle>
                <CardDescription className="text-base">
                    Сүүлийн алхамууд болон процессыг албан ёсоор хаах.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 px-8 py-6">

                {isCompleted ? (
                    <div className="text-center py-6 space-y-4">
                        <h3 className="text-xl font-bold text-green-700">Ажил хүлээлцэх процесс амжилттай дууслаа!</h3>
                        <p className="text-muted-foreground">Энэхүү процесс хаагдсан бөгөөд архивлагдсан байна.</p>
                        <Button variant="outline" onClick={() => router.push('/dashboard/employees')}>
                            Ажилтны жагсаалт руу буцах
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div
                                className={`flex flex-col items-center justify-center p-6 border rounded-xl gap-3 cursor-pointer transition-all ${messageSent ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : 'bg-card hover:border-primary/50'}`}
                                onClick={() => setMessageSent(!messageSent)}
                            >
                                <Mail className={`h-8 w-8 ${messageSent ? 'text-green-600' : 'text-muted-foreground'}`} />
                                <span className="font-medium">Үдэлтийн имэйл илгээх</span>
                                <Checkbox checked={messageSent} className="sr-only" />
                                {messageSent && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                            </div>

                            <div
                                className={`flex flex-col items-center justify-center p-6 border rounded-xl gap-3 cursor-pointer transition-all ${eventOrganized ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : 'bg-card hover:border-primary/50'}`}
                                onClick={() => setEventOrganized(!eventOrganized)}
                            >
                                <HeartHandshake className={`h-8 w-8 ${eventOrganized ? 'text-green-600' : 'text-muted-foreground'}`} />
                                <span className="font-medium">Үдэлтийн уулзалт хийх</span>
                                <Checkbox checked={eventOrganized} className="sr-only" />
                                {eventOrganized && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                            </div>
                        </div>

                        <div className="rounded-lg bg-muted/50 p-4 border flex items-start gap-4">
                            <Archive className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="font-medium text-sm">Системийн статус шинэчлэлт</h4>
                                <p className="text-sm text-muted-foreground">
                                    "Процесс дуусгах" товчийг дарснаар ажилтны статус <strong>{process.notice?.type === 'RESIGNATION' ? 'Resigned (Өргөдлөөр гарсан)' : 'Terminated (Халагдсан)'}</strong> төлөвт шилжиж, энэхүү Offboarding процесс хаагдана.
                                </p>
                            </div>
                        </div>
                    </>
                )}

            </CardContent>
            {!isCompleted && (
                <CardFooter className="flex justify-center border-t bg-muted/20 py-6">
                    <Button
                        size="lg"
                        onClick={handleCompleteProcess}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-lg px-8 h-12"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        Процесс дуусгах & Ажилтныг хаах
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
