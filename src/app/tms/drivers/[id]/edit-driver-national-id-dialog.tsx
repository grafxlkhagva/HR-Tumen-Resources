'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    AppDialog,
    AppDialogContent,
    AppDialogFooter,
    AppDialogHeader,
    AppDialogTitle,
    AppDialogDescription,
    AppDialogBody,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormDescription,
} from '@/components/ui/form';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Camera, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_DRIVERS_COLLECTION } from '@/app/tms/types';
import type { TmsDriver } from '@/app/tms/types';
import { cn } from '@/lib/utils';

const nationalIdSchema = z.object({
    nationalIdFrontUrl: z.string().optional(),
    nationalIdBackUrl: z.string().optional(),
});

type FormValues = z.infer<typeof nationalIdSchema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    driver: TmsDriver;
}

const STORAGE_PREFIX = 'tms_drivers';

export function EditDriverNationalIdDialog({ open, onOpenChange, driver }: Props) {
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [uploadingField, setUploadingField] = React.useState<string | null>(null);
    const [isRecognizingNationalId, setIsRecognizingNationalId] = React.useState(false);
    const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    const form = useForm<FormValues>({
        resolver: zodResolver(nationalIdSchema),
        defaultValues: {
            nationalIdFrontUrl: driver.nationalIdFrontUrl ?? '',
            nationalIdBackUrl: driver.nationalIdBackUrl ?? '',
        },
    });

    React.useEffect(() => {
        if (open && driver) {
            form.reset({
                nationalIdFrontUrl: driver.nationalIdFrontUrl ?? '',
                nationalIdBackUrl: driver.nationalIdBackUrl ?? '',
            });
        }
    }, [open, driver, form]);

    const imagePathSegments: Record<string, string> = {
        nationalIdFrontUrl: 'national_id_front',
        nationalIdBackUrl: 'national_id_back',
    };

    const handleRecognizeNationalId = async () => {
        const frontUrl = form.getValues('nationalIdFrontUrl')?.trim();
        if (!frontUrl) {
            toast({ variant: 'destructive', title: 'Зураг оруулна уу', description: 'Иргэний үнэмлэхний урд талын зургийг эхлээд оруулна уу.' });
            return;
        }
        const backUrl = form.getValues('nationalIdBackUrl')?.trim();
        setIsRecognizingNationalId(true);
        try {
            const res = await fetch('/api/parse-national-id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frontImageUrl: frontUrl,
                    backImageUrl: backUrl || undefined,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Танихад алдаа гарлаа');
            const d = json.data;

            const updateData: Record<string, any> = {};
            if (d.lastName) updateData.lastName = d.lastName;
            if (d.firstName) updateData.firstName = d.firstName;
            if (d.dateOfBirth) updateData.dateOfBirth = d.dateOfBirth;
            if (d.registerNumber) updateData.registerNumber = d.registerNumber;

            if (Object.keys(updateData).length > 0 && firestore && driver.id) {
                await updateDoc(doc(firestore, TMS_DRIVERS_COLLECTION, driver.id), updateData);
            }
            toast({ title: 'Иргэний үнэмлэхний мэдээлэл танигдаж хадгалагдлаа.' });
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'AI танихад алдаа гарлаа.' });
        } finally {
            setIsRecognizingNationalId(false);
        }
    };

    const handleImageUpload = async (fieldName: 'nationalIdFrontUrl' | 'nationalIdBackUrl', file: File) => {
        if (!storage || !driver.id) return;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const pathSegment = imagePathSegments[fieldName] || fieldName;
        const storagePath = `${STORAGE_PREFIX}/${driver.id}/${pathSegment}_${Date.now()}.${ext}`;
        setUploadingField(fieldName);
        try {
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            form.setValue(fieldName, url);
            toast({ title: 'Зураг амжилттай байршууллаа.' });
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Зураг байршуулах алдаа', description: e instanceof Error ? e.message : 'Дахин оролдоно уу.' });
        } finally {
            setUploadingField(null);
        }
    };

    const onSubmit = async (values: FormValues) => {
        if (!firestore || !driver.id) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(firestore, TMS_DRIVERS_COLLECTION, driver.id), {
                nationalIdFrontUrl: values.nationalIdFrontUrl?.trim() || null,
                nationalIdBackUrl: values.nationalIdBackUrl?.trim() || null,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Иргэний үнэмлэх шинэчлэгдлээ.' });
            onOpenChange(false);
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'Засах явцад алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent className="sm:max-w-md">
                <AppDialogHeader>
                    <AppDialogTitle>Иргэний үнэмлэх</AppDialogTitle>
                    <AppDialogDescription>Иргэний үнэмлэхний зураг байршуулах</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="nationalIdFrontUrl" render={({ field }) => (
                                    <FormItem>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            ref={(el) => { fileInputRefs.current.nationalIdFrontUrl = el; }}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleImageUpload('nationalIdFrontUrl', f);
                                                e.target.value = '';
                                            }}
                                        />
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => fileInputRefs.current.nationalIdFrontUrl?.click()}
                                            onKeyDown={(e) => e.key === 'Enter' && fileInputRefs.current.nationalIdFrontUrl?.click()}
                                            className={cn(
                                                'aspect-[4/3] rounded-lg border border-dashed flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors relative',
                                                uploadingField === 'nationalIdFrontUrl' && 'opacity-70 pointer-events-none'
                                            )}
                                        >
                                            {uploadingField === 'nationalIdFrontUrl' ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                            ) : field.value ? (
                                                <>
                                                    <img src={field.value} alt="Урд тал" className="w-full h-full object-cover" />
                                                    <button type="button" className="absolute top-1 right-1 rounded-full bg-background/80 p-1 shadow" onClick={(e) => { e.stopPropagation(); field.onChange(''); }}>
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="flex flex-col items-center gap-1 text-muted-foreground text-sm">
                                                    <Camera className="h-8 w-8" />
                                                    Урд тал
                                                </span>
                                            )}
                                        </div>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="nationalIdBackUrl" render={({ field }) => (
                                    <FormItem>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            ref={(el) => { fileInputRefs.current.nationalIdBackUrl = el; }}
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) handleImageUpload('nationalIdBackUrl', f);
                                                e.target.value = '';
                                            }}
                                        />
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => fileInputRefs.current.nationalIdBackUrl?.click()}
                                            onKeyDown={(e) => e.key === 'Enter' && fileInputRefs.current.nationalIdBackUrl?.click()}
                                            className={cn(
                                                'aspect-[4/3] rounded-lg border border-dashed flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors relative',
                                                uploadingField === 'nationalIdBackUrl' && 'opacity-70 pointer-events-none'
                                            )}
                                        >
                                            {uploadingField === 'nationalIdBackUrl' ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                            ) : field.value ? (
                                                <>
                                                    <img src={field.value} alt="Ар тал" className="w-full h-full object-cover" />
                                                    <button type="button" className="absolute top-1 right-1 rounded-full bg-background/80 p-1 shadow" onClick={(e) => { e.stopPropagation(); field.onChange(''); }}>
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="flex flex-col items-center gap-1 text-muted-foreground text-sm">
                                                    <Camera className="h-8 w-8" />
                                                    Ар тал
                                                </span>
                                            )}
                                        </div>
                                    </FormItem>
                                )} />
                            </div>
                            <Button type="button" variant="outline" size="sm" className="gap-1 mt-2 w-full" onClick={handleRecognizeNationalId} disabled={isRecognizingNationalId || !form.watch('nationalIdFrontUrl')}>
                                {isRecognizingNationalId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                AI-аар мэдээлэл таних
                            </Button>
                            <FormDescription className="mt-1">Зургаас овог, нэр, регистр, төрсөн огноо зэргийг автоматаар таниулна.</FormDescription>
                        </AppDialogBody>
                        <AppDialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Хадгалах
                            </Button>
                        </AppDialogFooter>
                    </form>
                </Form>
            </AppDialogContent>
        </AppDialog>
    );
}
