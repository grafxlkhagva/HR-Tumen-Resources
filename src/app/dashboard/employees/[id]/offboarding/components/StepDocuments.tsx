'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, ArrowRight, FileText, Download, Check, UploadCloud } from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { OffboardingProcess } from '../types';

interface StepDocumentsProps {
    process: OffboardingProcess;
}

export function StepDocuments({ process }: StepDocumentsProps) {
    const { firestore, firebaseApp } = useFirebase();
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { toast } = useToast();

    const [referenceLetterGenerated, setReferenceLetterGenerated] = React.useState(process.documents?.referenceLetterGenerated || false);
    const [socialInsuranceBookReturned, setSocialInsuranceBookReturned] = React.useState(process.documents?.socialInsuranceBookReturned || false);

    // File Upload State
    const [orderFile, setOrderFile] = React.useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // We can add more documents here in the future
    const [otherDocuments, setOtherDocuments] = React.useState(process.documents?.otherDocuments || []);

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const isReadOnly = process.documents?.isCompleted;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setOrderFile(selectedFile);
        }
    };

    const handleGenerateReference = () => {
        // In a real app, this would trigger a PDF generation or open a template
        toast({ title: 'Тодорхойлолт үүслээ', description: 'Ажлын байрны тодорхойлолт амжилттай татагдлаа.' });
        setReferenceLetterGenerated(true);
    };

    const handleSave = async (completeStep: boolean = false) => {
        if (!firestore || !employeeId) return;

        if (completeStep && !socialInsuranceBookReturned) {
            toast({ variant: 'destructive', title: 'Анхааруулга', description: 'Нийгмийн даатгалын дэвтрийг хүлээлгэн өгөх шаардлагатай.' });
            return;
        }

        setIsSubmitting(true);
        try {
            let updatedOtherDocuments = [...otherDocuments];

            // 1. Upload Order File if selected
            if (orderFile) {
                const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                const storage = getStorage(firebaseApp);
                const storageRef = ref(storage, `offboarding/${employeeId}/${process.id}/orders/${orderFile.name}`);
                await uploadBytes(storageRef, orderFile);
                const downloadURL = await getDownloadURL(storageRef);

                const orderDoc = { name: 'Ажлаас чөлөөлөх тушаал', url: downloadURL };
                const existingOrderIndex = updatedOtherDocuments.findIndex(d => d.name === 'Ажлаас чөлөөлөх тушаал');
                if (existingOrderIndex > -1) {
                    updatedOtherDocuments[existingOrderIndex] = orderDoc;
                } else {
                    updatedOtherDocuments.push(orderDoc);
                }
            }

            const docRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, process.id);

            await updateDocumentNonBlocking(docRef, {
                documents: {
                    referenceLetterGenerated,
                    socialInsuranceBookReturned,
                    otherDocuments: updatedOtherDocuments,
                    isCompleted: completeStep
                },
                currentStep: completeStep ? 8 : 7
            });

            toast({ title: completeStep ? 'Амжилттай хадгалагдлаа' : 'Хадгалагдлаа', description: completeStep ? 'Дараагийн шат руу шилжлээ.' : 'Өөрчлөлтүүд хадгалагдлаа.' });
            setOrderFile(null); // Clear local file state after successful save
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалах үед алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const terminationOrder = otherDocuments.find(d => d.name === 'Ажлаас чөлөөлөх тушаал');

    return (
        <Card className="max-w-3xl mx-auto border-t-4 border-t-indigo-500 shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">7</span>
                    Бичиг баримт
                </CardTitle>
                <CardDescription>
                    Ажлаас чөлөөлөх тушаал, тодорхойлолт болон хувийн бичиг баримтыг хүлээлгэн өгөх.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* 1. Reference Letter */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/20 transition-colors">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium">
                            <FileText className="h-4 w-4 text-indigo-600" />
                            Ажлын байрны тодорхойлолт
                        </div>
                        <p className="text-sm text-muted-foreground">Байгууллагын албан ёсны тодорхойлолт үүсгэх.</p>
                    </div>
                    {referenceLetterGenerated ? (
                        <Button variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700 pointer-events-none">
                            <Check className="mr-2 h-4 w-4" /> Үүсгэсэн
                        </Button>
                    ) : (
                        <Button onClick={handleGenerateReference} variant="outline" disabled={isReadOnly}>
                            <Download className="mr-2 h-4 w-4" /> Татах
                        </Button>
                    )}
                </div>

                {/* 2. Social Insurance Book */}
                <div className="flex items-center space-x-2 border p-4 rounded-lg bg-card hover:bg-muted/20 transition-colors">
                    <Checkbox
                        id="social-book"
                        checked={socialInsuranceBookReturned}
                        onCheckedChange={(c) => !isReadOnly && setSocialInsuranceBookReturned(!!c)}
                        disabled={isReadOnly}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label
                            htmlFor="social-book"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                            Нийгмийн даатгалын дэвтэр хүлээлгэн өгсөн
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Бичилт хийж, тамга даран ажилтанд буцаан өгсөн эсэх.
                        </p>
                    </div>
                </div>

                {/* 3. Termination Order Upload */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Ажлаас чөлөөлөх тушаал</Label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png"
                    />

                    {!orderFile && !terminationOrder ? (
                        <div
                            onClick={() => !isReadOnly && fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors",
                                !isReadOnly ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                            )}
                        >
                            <UploadCloud className="h-8 w-8 mb-3 text-muted-foreground/50" />
                            <p className="font-medium text-sm">Тушаал оруулах</p>
                            <p className="text-xs mt-1 text-muted-foreground/60">PDF, Image файл сонгох</p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-indigo-50/30 border-indigo-100">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-100 p-2 rounded-lg">
                                    <FileText className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium truncate max-w-[200px]">
                                        {orderFile ? orderFile.name : (terminationOrder?.name || 'Ажлаас чөлөөлөх тушаал')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {orderFile ? 'Оруулахад бэлэн' : 'Файл хавсаргагдсан'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {orderFile && (
                                    <Button variant="ghost" size="sm" onClick={() => setOrderFile(null)} disabled={isReadOnly}>
                                        Солих
                                    </Button>
                                )}
                                {terminationOrder && !orderFile && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={terminationOrder.url} target="_blank" rel="noopener noreferrer">
                                            Үзэх
                                        </a>
                                    </Button>
                                )}
                                {!isReadOnly && !orderFile && (
                                    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                                        Шинэчлэх
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
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
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                        Дуусгах & Үргэлжлүүлэх
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                        <span>✅ Бичиг баримт хүлээлцсэн</span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
