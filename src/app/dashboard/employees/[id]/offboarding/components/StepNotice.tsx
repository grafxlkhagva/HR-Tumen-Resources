'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, UploadCloud, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { OffboardingProcess } from '../types';

interface StepNoticeProps {
    process: OffboardingProcess;
}

export function StepNotice({ process }: StepNoticeProps) {
    const { firestore, firebaseApp } = useFirebase();
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { toast } = useToast();

    // Convert string date to Date object safely
    const initialDate = process.notice?.lastWorkingDate ? new Date(process.notice.lastWorkingDate) : undefined;

    const [type, setType] = React.useState<'RESIGNATION' | 'TERMINATION'>(process.notice?.type || 'RESIGNATION');
    const [reason, setReason] = React.useState(process.notice?.reason || '');
    const [date, setDate] = React.useState<Date | undefined>(initialDate);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // File Upload State
    const [file, setFile] = React.useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const isReadOnly = process.notice?.isCompleted;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleSubmit = async () => {
        if (!firestore || !employeeId || !date || !reason) {
            toast({ variant: 'destructive', title: 'Мэдээлэл дутуу', description: 'Та бүх талбарыг бөглөнө үү.' });
            return;
        }

        setIsSubmitting(true);
        try {
            let attachments: string[] = process.notice?.attachments || [];

            // 1. Upload file if selected
            if (file) {
                const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                const storage = getStorage(firebaseApp);
                const storageRef = ref(storage, `offboarding/${employeeId}/${process.id}/${file.name}`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);
                attachments = [downloadURL];
            }

            const docRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, process.id);

            await updateDocumentNonBlocking(docRef, {
                notice: {
                    type,
                    reason,
                    lastWorkingDate: date.toISOString(),
                    submittedAt: new Date().toISOString(),
                    isCompleted: true,
                    attachments
                },
                // Automatically move to next step if needed, or wait for approval
                currentStep: 2
            });

            toast({ title: 'Амжилттай илгээгдлээ', description: 'Өргөдөл/Мэдэгдэл баталгаажуулах шатанд шилжлээ.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалах үед алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="max-w-3xl mx-auto border-t-4 border-t-primary shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    Өргөдөл / Мэдэгдэл
                </CardTitle>
                <CardDescription>
                    Ажилтан ажлаас гарах өргөдөл гаргах эсвэл байгууллагын зүгээс ажлаас чөлөөлөх мэдэгдэл үүсгэх.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <Label className="text-base">Төрөл</Label>
                    <RadioGroup
                        disabled={isReadOnly}
                        value={type}
                        onValueChange={(v) => setType(v as any)}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="RESIGNATION" id="resignation" className="peer sr-only" />
                            <Label
                                htmlFor="resignation"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                            >
                                <span className="text-lg mb-1">📝 Өргөдөл</span>
                                <span className="text-sm text-muted-foreground font-normal">Ажилтан өөрийн хүсэлтээр</span>
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="TERMINATION" id="termination" className="peer sr-only" />
                            <Label
                                htmlFor="termination"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:text-destructive peer-data-[state=checked]:bg-destructive/5 cursor-pointer transition-all"
                            >
                                <span className="text-lg mb-1">🚫 Мэдэгдэл</span>
                                <span className="text-sm text-muted-foreground font-normal">Байгууллагын санаачилгаар</span>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Сүүлийн ажлын өдөр</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    disabled={isReadOnly}
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Огноо сонгох</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Хавсралт файл (Өргөдөл/Тушаал)</Label>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            disabled={isReadOnly}
                        />
                        {!file && !process.notice?.attachments?.[0] ? (
                            <div
                                onClick={() => !isReadOnly && fileInputRef.current?.click()}
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-2 flex items-center justify-center text-sm text-muted-foreground h-10 hover:bg-muted/50 transition-colors",
                                    !isReadOnly ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                                )}
                            >
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Файл сонгох
                            </div>
                        ) : (
                            <div className="border border-input rounded-lg p-2 flex items-center justify-between text-sm h-10 bg-accent/20">
                                <span className="truncate max-w-[150px] font-medium">
                                    {file ? file.name : "Файл хавсаргасан"}
                                </span>
                                {(!isReadOnly && file) ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => setFile(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                ) : process.notice?.attachments?.[0] && (
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-primary"
                                    >
                                        <a href={process.notice.attachments[0]} target="_blank" rel="noopener noreferrer">
                                            Үзэх
                                        </a>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Шалтгаан / Тайлбар</Label>
                    <Textarea
                        disabled={isReadOnly}
                        placeholder="Ажлаас гарч буй үндсэн шалтгаан..."
                        className="min-h-[100px] resize-none"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>

                {process.notice?.isCompleted && (
                    <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Илгээсэн огноо:</span>
                        <span className="font-medium">{new Date(process.notice.submittedAt).toLocaleString()}</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 py-4">
                {!isReadOnly ? (
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[150px]">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Илгээх & Үргэлжлүүлэх
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                        <span>✅ Энэ шат дууссан</span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
