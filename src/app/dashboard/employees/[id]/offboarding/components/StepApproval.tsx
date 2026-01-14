'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Loader2, UserCheck } from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { OffboardingProcess } from '../types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface StepApprovalProps {
    process: OffboardingProcess;
}

export function StepApproval({ process }: StepApprovalProps) {
    const { firestore } = useFirebase();
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { toast } = useToast();

    const [comments, setComments] = React.useState(process.approval?.comments || '');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const isReadOnly = process.approval?.isCompleted;
    const status = process.approval?.status;

    const handleAction = async (newStatus: 'APPROVED' | 'REJECTED') => {
        if (!firestore || !employeeId) return;

        setIsSubmitting(true);
        try {
            const docRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, process.id);

            await updateDocumentNonBlocking(docRef, {
                approval: {
                    status: newStatus,
                    comments,
                    approvedBy: 'Current User', // TODO: Get actual logged in user
                    approvedAt: new Date().toISOString(),
                    isCompleted: true
                },
                currentStep: newStatus === 'APPROVED' ? 3 : 2
            });

            toast({
                title: newStatus === 'APPROVED' ? 'Баталгаажлаа' : 'Татгалзлаа',
                description: `Хүсэлтийг амжилттай ${newStatus === 'APPROVED' ? 'зөвшөөрлөө' : 'татгалзлаа'}.`
            });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Үйлдэл хийхэд алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!process.notice?.isCompleted) {
        return (
            <Alert className="max-w-3xl mx-auto border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Хүлээгдэж байна</AlertTitle>
                <AlertDescription className="text-amber-700">
                    Эхлээд өмнөх шатны "Өргөдөл / Мэдэгдэл" хэсгийг бөглөж дуусгана уу.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="max-w-3xl mx-auto border-t-4 border-t-blue-500 shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    Баталгаажуулалт
                </CardTitle>
                <CardDescription>
                    Гаргасан хүсэлтийг шууд удирдлага болон HR хянаж шийдвэрлэнэ.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary of Step 1 */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 uppercase tracking-wider">Хүсэлтийн мэдээлэл</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-muted-foreground block">Төрөл</span>
                            <span className="font-semibold text-foreground">
                                {process.notice.type === 'RESIGNATION' ? '📝 Өргөдөл' : '🚫 Мэдэгдэл'}
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground block">Сүүлийн ажлын өдөр</span>
                            <span className="font-semibold text-foreground">
                                {new Date(process.notice.lastWorkingDate).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-xs text-muted-foreground block">Шалтгаан</span>
                            <p className="text-sm mt-1">{process.notice.reason}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Шийдвэрлэлтийн тэмдэглэл / Тайлбар</Label>
                    <Textarea
                        disabled={isReadOnly}
                        placeholder="Зөвшөөрсөн эсвэл татгалзсан шалтгаан..."
                        className="min-h-[100px]"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                    />
                </div>

                {isReadOnly && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 ${status === 'APPROVED' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {status === 'APPROVED' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        <div className="flex-1">
                            <p className="font-semibold">{status === 'APPROVED' ? 'Зөвшөөрсөн' : 'Татгалзсан'}</p>
                            <div className="flex items-center gap-2 text-xs opacity-90 mt-0.5">
                                <UserCheck className="h-3 w-3" />
                                {process.approval?.approvedBy} • {new Date(process.approval?.approvedAt || '').toLocaleString()}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 py-4">
                {!isReadOnly ? (
                    <>
                        <Button
                            variant="destructive"
                            onClick={() => handleAction('REJECTED')}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Татгалзах
                        </Button>
                        <Button
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAction('APPROVED')}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Зөвшөөрөх
                        </Button>
                    </>
                ) : (
                    <Button variant="ghost" disabled>Шийдвэрлэгдсэн</Button>
                )}
            </CardFooter>
        </Card>
    );
}
