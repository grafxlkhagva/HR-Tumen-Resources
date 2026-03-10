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
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Camera, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_DRIVERS_COLLECTION, TMS_LICENSE_CLASSES } from '@/app/tms/types';
import type { TmsDriver } from '@/app/tms/types';
import { cn } from '@/lib/utils';

const schema = z.object({
    licenseNumber: z.string().optional(),
    licenseExpiryDate: z.string().optional(),
    licenseClasses: z.array(z.string()).optional(),
    licenseImageFrontUrl: z.string().optional(),
    licenseImageBackUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    driver: TmsDriver;
}

const STORAGE_PREFIX = 'tms_drivers';

export function EditDriverLicenseDialog({ open, onOpenChange, driver }: Props) {
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [uploadingField, setUploadingField] = React.useState<string | null>(null);
    const [isRecognizingLicense, setIsRecognizingLicense] = React.useState(false);
    const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            licenseNumber: driver.licenseNumber ?? '',
            licenseExpiryDate: driver.licenseExpiryDate ?? '',
            licenseClasses: driver.licenseClasses ?? [],
            licenseImageFrontUrl: driver.licenseImageFrontUrl ?? '',
            licenseImageBackUrl: driver.licenseImageBackUrl ?? '',
        },
    });

    React.useEffect(() => {
        if (open && driver) {
            form.reset({
                licenseNumber: driver.licenseNumber ?? '',
                licenseExpiryDate: driver.licenseExpiryDate ?? '',
                licenseClasses: driver.licenseClasses ?? [],
                licenseImageFrontUrl: driver.licenseImageFrontUrl ?? '',
                licenseImageBackUrl: driver.licenseImageBackUrl ?? '',
            });
        }
    }, [open, driver, form]);

    const toggleLicenseClass = (cls: string) => {
        const current = form.getValues('licenseClasses') ?? [];
        const next = current.includes(cls) ? current.filter((c) => c !== cls) : [...current, cls];
        form.setValue('licenseClasses', next);
    };

    const imagePathSegments: Record<string, string> = {
        licenseImageFrontUrl: 'license_front',
        licenseImageBackUrl: 'license_back',
    };

    const handleRecognizeLicense = async () => {
        const frontUrl = form.getValues('licenseImageFrontUrl')?.trim();
        if (!frontUrl) {
            toast({ variant: 'destructive', title: 'Зураг оруулна уу', description: 'Жолооны үнэмлэхний урд талын зургийг эхлээд оруулна уу.' });
            return;
        }
        const backUrl = form.getValues('licenseImageBackUrl')?.trim();
        setIsRecognizingLicense(true);
        try {
            const res = await fetch('/api/parse-driver-license', {
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
            if (d.licenseNumber) form.setValue('licenseNumber', d.licenseNumber);
            if (d.licenseExpiryDate) form.setValue('licenseExpiryDate', d.licenseExpiryDate);
            if (Array.isArray(d.licenseClasses) && d.licenseClasses.length > 0) form.setValue('licenseClasses', d.licenseClasses);
            toast({ title: 'Үнэмлэхний мэдээлэл танигдлаа.' });
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'AI танихад алдаа гарлаа.' });
        } finally {
            setIsRecognizingLicense(false);
        }
    };

    const handleImageUpload = async (fieldName: 'licenseImageFrontUrl' | 'licenseImageBackUrl', file: File) => {
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
                licenseNumber: values.licenseNumber?.trim() || null,
                licenseExpiryDate: values.licenseExpiryDate || null,
                licenseClasses: values.licenseClasses?.length ? values.licenseClasses : null,
                licenseImageFrontUrl: values.licenseImageFrontUrl?.trim() || null,
                licenseImageBackUrl: values.licenseImageBackUrl?.trim() || null,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Жолооны үнэмлэх шинэчлэгдлээ.' });
            onOpenChange(false);
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'Засах явцад алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppDialog open={open} onOpenChange={onOpenChange}>
            <AppDialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <AppDialogHeader>
                    <AppDialogTitle>Жолооны үнэмлэх засах</AppDialogTitle>
                    <AppDialogDescription>Үнэмлэхний мэдээлэл болон зураг</AppDialogDescription>
                </AppDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AppDialogBody className="space-y-4">
                            <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Үнэмлэхний дугаар</FormLabel>
                                    <FormControl><Input placeholder="123456" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="licenseExpiryDate" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Хугацаа дуусах огноо</FormLabel>
                                    <FormControl><Input type="date" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div>
                                <FormLabel className="mb-2 block">Ангилал</FormLabel>
                                <div className="flex flex-wrap gap-2">
                                    {TMS_LICENSE_CLASSES.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => toggleLicenseClass(c)}
                                            className={cn(
                                                'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2 text-sm font-medium transition-colors',
                                                form.watch('licenseClasses')?.includes(c)
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-input bg-muted/50 hover:bg-muted'
                                            )}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <FormLabel className="mb-2 block">Үнэмлэхний зураг</FormLabel>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="licenseImageFrontUrl" render={({ field }) => (
                                        <FormItem>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={(el) => { fileInputRefs.current.licenseImageFrontUrl = el; }}
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) handleImageUpload('licenseImageFrontUrl', f);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => fileInputRefs.current.licenseImageFrontUrl?.click()}
                                                onKeyDown={(e) => e.key === 'Enter' && fileInputRefs.current.licenseImageFrontUrl?.click()}
                                                className={cn(
                                                    'aspect-[4/3] rounded-lg border border-dashed flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors relative',
                                                    uploadingField === 'licenseImageFrontUrl' && 'opacity-70 pointer-events-none'
                                                )}
                                            >
                                                {uploadingField === 'licenseImageFrontUrl' ? (
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
                                    <FormField control={form.control} name="licenseImageBackUrl" render={({ field }) => (
                                        <FormItem>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={(el) => { fileInputRefs.current.licenseImageBackUrl = el; }}
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) handleImageUpload('licenseImageBackUrl', f);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => fileInputRefs.current.licenseImageBackUrl?.click()}
                                                onKeyDown={(e) => e.key === 'Enter' && fileInputRefs.current.licenseImageBackUrl?.click()}
                                                className={cn(
                                                    'aspect-[4/3] rounded-lg border border-dashed flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors relative',
                                                    uploadingField === 'licenseImageBackUrl' && 'opacity-70 pointer-events-none'
                                                )}
                                            >
                                                {uploadingField === 'licenseImageBackUrl' ? (
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
                                <Button type="button" variant="outline" size="sm" className="mt-2 gap-1 w-full" onClick={handleRecognizeLicense} disabled={isRecognizingLicense || !form.watch('licenseImageFrontUrl')}>
                                    {isRecognizingLicense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    AI-аар мэдээлэл таних
                                </Button>
                                <FormDescription className="mt-1">Зургаас дугаар, ангилал зэргийг автоматаар таниулна.</FormDescription>
                            </div>
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
