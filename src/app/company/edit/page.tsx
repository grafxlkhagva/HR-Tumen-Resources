'use client';

import * as React from 'react';
import { getAuthHeaders } from '@/lib/api/client-auth';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { companyProfileSchema, CompanyProfileValues } from '../schemas';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirebase, useFetchDoc, useMemoFirebase, tenantDoc } from '@/firebase';
import { setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Save, X, Upload, Building, ArrowLeft, Trash, Image as ImageIcon, FileText, Sparkles, Landmark, Plus, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { PageHeader } from '@/components/patterns/page-layout';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGlobalReferenceData } from '@/hooks/use-global-reference-data';



function FormSkeleton() {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="flex flex-col items-start gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-24 w-24 rounded-lg" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div className="space-y-2" key={i}>
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-56" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>
            <div className="flex gap-2">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-24" />
            </div>
        </div>
    );
}

function EditCompanyForm({ initialData, docExists }: { initialData: CompanyProfileValues, docExists: boolean }) {
    const router = useRouter();
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();

    const [logoPreview, setLogoPreview] = React.useState<string | null>(initialData.logoUrl || null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [isProcessingCertificate, setIsProcessingCertificate] = React.useState(false);
    const [certMode, setCertMode] = React.useState<'image' | 'pdf'>(
        initialData.certificatePdfUrl ? 'pdf' : 'image'
    );
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const certificateFrontInputRef = React.useRef<HTMLInputElement>(null);
    const certificateBackInputRef = React.useRef<HTMLInputElement>(null);
    const certificatePdfInputRef = React.useRef<HTMLInputElement>(null);
    const [isProcessingPdf, setIsProcessingPdf] = React.useState(false);

    const companyProfileRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null),
        []
    );

    const form = useForm<CompanyProfileValues>({
        resolver: zodResolver(companyProfileSchema),
        defaultValues: initialData,
    });

    React.useEffect(() => {
        form.reset(initialData);
        setLogoPreview(initialData.logoUrl || null);
    }, [initialData, form]);

    const { isSubmitting } = form.formState;

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const storageRef = ref(storage, `company-assets/logo-${Date.now()}`);

        try {
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            form.setValue('logoUrl', downloadURL);
            setLogoPreview(downloadURL);
            toast({ title: 'Лого амжилттай байршлаа.' });
        } catch (error) {
            console.error("Лого байршуулахад алдаа гарлаа: ", error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Лого байршуулахад алдаа гарлаа.' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleCertificateUpload = async (side: 'front' | 'back', event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Зөвхөн зураг (JPG, PNG, WebP) оруулна уу.' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Файл хэт том байна (10MB-с бага байх ёстой).' });
            return;
        }

        setIsProcessingCertificate(true);
        const field = side === 'front' ? 'certificateFrontUrl' : 'certificateBackUrl';
        const inputRef = side === 'front' ? certificateFrontInputRef : certificateBackInputRef;
        try {
            const storageRef = ref(storage, `company-assets/certificate-${side}-${Date.now()}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            form.setValue(field, downloadURL);

            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/extract-company-info', { method: 'POST', headers: await getAuthHeaders(), body: formData });
            let result: { success?: boolean; data?: Record<string, string>; error?: string } = {};
            try { result = await response.json(); } catch { throw new Error('Серверийн хариуг уншихад алдаа гарлаа'); }
            if (!response.ok) throw new Error(result.error || 'Мэдээлэл задлахад алдаа гарлаа');

            const extractedData = (result.data && typeof result.data === 'object' ? result.data : {}) as Record<string, string>;
            const vals = form.getValues();

            const setIf = (key: keyof CompanyProfileValues, v: string | undefined) => {
                if (!v) return;
                if (side === 'front') form.setValue(key, v);
                else if (!(vals[key] as string)?.trim()) form.setValue(key, v);
            };
            setIf('name', extractedData.name);
            setIf('legalName', extractedData.legalName);
            setIf('registrationNumber', extractedData.registrationNumber);
            setIf('taxId', extractedData.taxId);
            setIf('industry', extractedData.industry);
            setIf('establishedDate', extractedData.establishedDate);
            setIf('address', extractedData.address);
            setIf('phoneNumber', extractedData.phoneNumber);
            setIf('contactEmail', extractedData.contactEmail);
            setIf('website', extractedData.website);
            setIf('ceo', extractedData.ceo);
            setIf('employeeCount', extractedData.employeeCount);
            setIf('executiveOrderName', extractedData.executiveOrderName);

            const count = Object.keys(extractedData).length;
            toast({
                title: '✅ Зураг хадгалагдаж, мэдээлэл задлагдлаа',
                description: count > 0 ? `${count} талбар AI-аар бөглөгдлөө` : 'Гэрчилгээний зураг хадгалагдлаа.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: error instanceof Error ? error.message : 'Гэрчилгээг боловсруулахад алдаа гарлаа.',
            });
        } finally {
            setIsProcessingCertificate(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleCertificatePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Зөвхөн PDF файл оруулна уу.' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Файл хэт том байна (10MB-с бага байх ёстой).' });
            return;
        }

        setIsProcessingPdf(true);
        try {
            // 1. Upload PDF to Firebase Storage
            const storageRef = ref(storage, `company-assets/certificate-pdf-${Date.now()}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            form.setValue('certificatePdfUrl', downloadURL);

            // 2. Send to AI for extraction
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/extract-company-info', { method: 'POST', headers: await getAuthHeaders(), body: formData });
            let result: { success?: boolean; data?: Record<string, string>; error?: string } = {};
            try { result = await response.json(); } catch { throw new Error('Серверийн хариуг уншихад алдаа гарлаа'); }
            if (!response.ok) throw new Error(result.error || 'Мэдээлэл задлахад алдаа гарлаа');

            const extractedData = (result.data && typeof result.data === 'object' ? result.data : {}) as Record<string, string>;
            // PDF нь бүрэн гэрчилгээ — бүх талбарыг бөглөнө
            const setField = (key: keyof CompanyProfileValues, v: string | undefined) => {
                if (v) form.setValue(key, v);
            };
            setField('name', extractedData.name);
            setField('legalName', extractedData.legalName);
            setField('registrationNumber', extractedData.registrationNumber);
            setField('taxId', extractedData.taxId);
            setField('industry', extractedData.industry);
            setField('establishedDate', extractedData.establishedDate);
            setField('address', extractedData.address);
            setField('phoneNumber', extractedData.phoneNumber);
            setField('contactEmail', extractedData.contactEmail);
            setField('website', extractedData.website);
            setField('ceo', extractedData.ceo);
            setField('employeeCount', extractedData.employeeCount);
            setField('executiveOrderName', extractedData.executiveOrderName);

            const count = Object.keys(extractedData).length;
            toast({
                title: '✅ PDF хадгалагдаж, мэдээлэл задлагдлаа',
                description: count > 0 ? `${count} талбар AI-аар бөглөгдлөө` : 'PDF файл хадгалагдлаа.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: error instanceof Error ? error.message : 'PDF боловсруулахад алдаа гарлаа.',
            });
        } finally {
            setIsProcessingPdf(false);
            if (certificatePdfInputRef.current) certificatePdfInputRef.current.value = '';
        }
    };

    const handleSave = async (values: CompanyProfileValues) => {
        if (!companyProfileRef) return;

        // Sanitize values to remove undefined, as Firestore doesn't support it
        const sanitizedValues = Object.fromEntries(
            Object.entries(values).filter(([_, v]) => v !== undefined)
        );

        try {
            if (docExists) {
                await updateDoc(companyProfileRef, sanitizedValues as Record<string, unknown>);
            } else {
                await setDoc(companyProfileRef, sanitizedValues as Record<string, unknown>, { merge: true });
            }
            toast({
                title: 'Амжилттай хадгаллаа',
                description: 'Компанийн мэдээлэл шинэчлэгдлээ.',
            });
            router.push('/company');
        } catch (err) {
            toast({
                title: 'Алдаа гарлаа',
                description: err instanceof Error ? err.message : 'Хадгалахад алдаа гарлаа.',
                variant: 'destructive',
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8 pb-32">
                <PageHeader
                    title="Байгууллагын үндсэн мэдээлэл"
                    showBackButton
                    backHref="/company"
                    hideBreadcrumbs
                    actions={
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push('/company')} disabled={isSubmitting || isUploading || isProcessingCertificate}>
                                Цуцлах
                            </Button>
                            <Button type="submit" disabled={isSubmitting || isUploading || isProcessingCertificate} size="sm">
                                {isSubmitting || isUploading || isProcessingCertificate ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Хадгалах
                            </Button>
                        </div>
                    }
                />

                <Card>
                    <CardHeader className="hidden">
                        <CardTitle>Үндсэн мэдээлэл</CardTitle>
                        <CardDescription>Компанийнхаа үндсэн мэдээллийг эндээс шинэчилнэ үү.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="md:col-span-2 flex flex-col items-start gap-4">
                            <FormLabel>Компанийн лого</FormLabel>
                            <Avatar className="h-24 w-24 rounded-lg border">
                                <AvatarImage src={logoPreview || undefined} className="object-contain" />
                                <AvatarFallback className="rounded-lg bg-muted">
                                    <Building className="h-10 w-10 text-muted-foreground" />
                                </AvatarFallback>
                            </Avatar>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Лого солих
                            </Button>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <FormLabel>Компанийн гэрчилгээ (AI автоматаар бөглөнө)</FormLabel>

                            {/* Certificate mode toggle */}
                            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                                <Button
                                    type="button"
                                    variant={certMode === 'image' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setCertMode('image')}
                                    className="h-8 px-4 text-xs"
                                >
                                    <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                                    Зураг (нүүр/ар)
                                </Button>
                                <Button
                                    type="button"
                                    variant={certMode === 'pdf' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setCertMode('pdf')}
                                    className="h-8 px-4 text-xs"
                                >
                                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                                    PDF файл
                                </Button>
                            </div>

                            {/* Image mode: front + back */}
                            {certMode === 'image' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-3 p-4 border border-dashed border-border rounded-md bg-muted/20">
                                            <p className="text-sm font-medium text-muted-foreground">Нүүрэн тал</p>
                                            {form.watch('certificateFrontUrl') ? (
                                                <div className="relative w-full">
                                                    <img
                                                        src={form.watch('certificateFrontUrl')!}
                                                        alt="Гэрчилгээний нүүрэн тал"
                                                        className="w-full h-auto max-h-40 object-contain rounded-lg border"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-1 right-1 h-6 w-6"
                                                        onClick={() => form.setValue('certificateFrontUrl', '')}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="aspect-[4/3] rounded-lg border border-dashed flex items-center justify-center bg-muted/50 text-muted-foreground text-sm">
                                                    Зураг оруулах
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                                ref={certificateFrontInputRef}
                                                onChange={(e) => handleCertificateUpload('front', e)}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => certificateFrontInputRef.current?.click()}
                                                disabled={isProcessingCertificate}
                                                className="w-full"
                                            >
                                                {isProcessingCertificate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                Нүүрэн тал оруулах
                                            </Button>
                                        </div>
                                        <div className="flex flex-col gap-3 p-4 border border-dashed border-border rounded-md bg-muted/20">
                                            <p className="text-sm font-medium text-muted-foreground">Ар тал</p>
                                            {form.watch('certificateBackUrl') ? (
                                                <div className="relative w-full">
                                                    <img
                                                        src={form.watch('certificateBackUrl')!}
                                                        alt="Гэрчилгээний ар тал"
                                                        className="w-full h-auto max-h-40 object-contain rounded-lg border"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-1 right-1 h-6 w-6"
                                                        onClick={() => form.setValue('certificateBackUrl', '')}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="aspect-[4/3] rounded-lg border border-dashed flex items-center justify-center bg-muted/50 text-muted-foreground text-sm">
                                                    Зураг оруулах
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                                ref={certificateBackInputRef}
                                                onChange={(e) => handleCertificateUpload('back', e)}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => certificateBackInputRef.current?.click()}
                                                disabled={isProcessingCertificate}
                                                className="w-full"
                                            >
                                                {isProcessingCertificate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                Ар тал оруулах
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Зураг оруулах бүрт хадгалагдаж, AI талбаруудыг бөглөнө. Нүүрэн тал — бүрэн дүүргэнэ; ар тал — хоосон талбаруудыг нэмнэ.
                                    </p>
                                </>
                            )}

                            {/* PDF mode */}
                            {certMode === 'pdf' && (
                                <>
                                    <div className="flex flex-col gap-3 p-6 border border-dashed border-border rounded-md bg-muted/20">
                                        {form.watch('certificatePdfUrl') ? (
                                            <div className="flex items-center gap-4">
                                                <div className="h-14 w-14 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                                                    <FileText className="h-7 w-7 text-red-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium">Гэрчилгээний PDF файл</p>
                                                    <p className="text-xs text-muted-foreground truncate">Хадгалагдсан</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => form.setValue('certificatePdfUrl', '')}
                                                >
                                                    <X className="h-3.5 w-3.5 mr-1" />
                                                    Устгах
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-medium text-muted-foreground mb-1">Гэрчилгээний PDF файл оруулах</p>
                                                <p className="text-xs text-muted-foreground mb-4">PDF дотор текст байх шаардлагатай (скан зураг биш)</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            ref={certificatePdfInputRef}
                                            onChange={handleCertificatePdfUpload}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => certificatePdfInputRef.current?.click()}
                                            disabled={isProcessingPdf}
                                            className="w-full"
                                        >
                                            {isProcessingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                            {isProcessingPdf ? 'Боловсруулж байна...' : 'PDF файл оруулах'}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        PDF файл оруулахад хадгалагдаж, AI бүх талбаруудыг автоматаар бөглөнө.
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <FormLabel>Байгууллагын ковер зураг (5 зураг оруулах боломжтой)</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {(form.watch('coverUrls') || []).map((url, index) => (
                                    <div key={index} className="relative aspect-video rounded-lg border overflow-hidden bg-muted group">
                                        <img src={url} alt={`Cover ${index + 1}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => {
                                                    const current = form.getValues('coverUrls') || [];
                                                    form.setValue('coverUrls', current.filter((_, i) => i !== index));
                                                }}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {(form.watch('coverUrls') || []).length < 5 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.multiple = true;
                                            input.onchange = async (e) => {
                                                const files = (e.target as HTMLInputElement).files;
                                                if (!files?.length) return;

                                                const currentUrls = form.getValues('coverUrls') || [];
                                                const remainingSlots = 5 - currentUrls.length;
                                                const filesToUpload = Array.from(files).slice(0, remainingSlots);

                                                if (files.length > remainingSlots) {
                                                    toast({
                                                        variant: 'destructive',
                                                        title: 'Хязгаар',
                                                        description: `Зөвхөн ${remainingSlots} зураг нэмж оруулах боломжтой.`
                                                    });
                                                }

                                                setIsUploading(true);
                                                const newUrls = [...currentUrls];

                                                try {
                                                    for (let i = 0; i < filesToUpload.length; i++) {
                                                        const file = filesToUpload[i];
                                                        const storageRef = ref(storage, `company-assets/cover-${Date.now()}-${i}`);
                                                        await uploadBytes(storageRef, file);
                                                        const downloadURL = await getDownloadURL(storageRef);
                                                        newUrls.push(downloadURL);
                                                    }
                                                    form.setValue('coverUrls', newUrls);
                                                    toast({ title: 'Зургууд амжилттай байршлаа.' });
                                                } catch (error) {
                                                    console.error("Cover upload error:", error);
                                                    toast({ variant: 'destructive', title: 'Алдаа', description: 'Зураг байршуулахад алдаа гарлаа.' });
                                                } finally {
                                                    setIsUploading(false);
                                                }
                                            };
                                            input.click();
                                        }}
                                        className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
                                        <span className="text-xs text-muted-foreground">Зураг нэмэх</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-[0.8rem] text-muted-foreground">Зургууд нь слайд хэлбэрээр харагдах болно.</p>
                        </div>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Компанийн нэр</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Хөхэнэгэ ХХК" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="legalName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Хуулийн этгээдийн нэр</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Түмэн ресурс Хязгаарлагдмал хариуцлагатай компани" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="registrationNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Регистрийн дугаар</FormLabel>
                                    <FormControl>
                                        <Input placeholder="1234567" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="taxId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Хувийн хэргийн дугаар</FormLabel>
                                    <FormControl>
                                        <Input placeholder="901234567" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="industry"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Үйл ажиллагааны чиглэл</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Технологи" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="establishedDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Үүсгэн байгуулагдсан огноо</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="introduction"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Байгууллагын танилцуулга</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Манай байгууллагын талаар товч танилцуулга..."
                                            className="min-h-[120px] resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Холбоо барих</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="website"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Веб хуудас</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://hrzen.example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Утасны дугаар</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center">
                                            <span className="h-10 px-3 flex items-center bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground font-medium">
                                                +976
                                            </span>
                                            <Input
                                                className="rounded-l-none"
                                                placeholder="7700 8800"
                                                {...field}
                                                onChange={(e) => {
                                                    // Remove prefix if user tries to paste it
                                                    let val = e.target.value;
                                                    if (val.startsWith('+976')) {
                                                        val = val.replace('+976', '').trim();
                                                    }
                                                    field.onChange(val);
                                                }}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contactEmail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ерөнхий имэйл</FormLabel>
                                    <FormControl>
                                        <Input placeholder="contact@hrzen.mn" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Хаяг</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Улаанбаатар, Сүхбаатар дүүрэг, 1-р хороо, ABC гудамж, 123" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <BankAccountsCard form={form} />

            </form>
        </Form>
    );
}

const defaultFormValues: CompanyProfileValues = {
    name: '',
    logoUrl: '',
    certificateFrontUrl: '',
    certificateBackUrl: '',
    certificatePdfUrl: '',
    legalName: '',
    registrationNumber: '',
    taxId: '',
    industry: '',
    website: '',
    phoneNumber: '',
    contactEmail: '',
    address: '',
    introduction: '',
    establishedDate: '',
    coverUrls: [],
    bankAccounts: [],
};

interface BankRef {
    id: string;
    name: string;
    code?: string;
    shortName?: string;
}

function BankAccountsCard({ form }: { form: ReturnType<typeof useForm<CompanyProfileValues>> }) {
    const { data: banks, isLoading: isLoadingBanks } = useGlobalReferenceData<BankRef>('banks');
    const bankAccounts = form.watch('bankAccounts') || [];

    const addAccount = () => {
        const current = form.getValues('bankAccounts') || [];
        form.setValue('bankAccounts', [
            ...current,
            {
                bankId: '',
                bankName: '',
                accountNumber: '',
                accountName: '',
                currency: 'MNT',
                isPrimary: current.length === 0,
            },
        ]);
    };

    const removeAccount = (index: number) => {
        const current = form.getValues('bankAccounts') || [];
        const next = current.filter((_, i) => i !== index);
        // Ensure at least one primary if any remain
        if (next.length > 0 && !next.some(a => a.isPrimary)) {
            next[0] = { ...next[0], isPrimary: true };
        }
        form.setValue('bankAccounts', next, { shouldDirty: true });
    };

    const setPrimary = (index: number) => {
        const current = form.getValues('bankAccounts') || [];
        form.setValue(
            'bankAccounts',
            current.map((a, i) => ({ ...a, isPrimary: i === index })),
            { shouldDirty: true }
        );
    };

    const updateField = (index: number, field: 'accountNumber' | 'accountName' | 'currency', value: string) => {
        const current = form.getValues('bankAccounts') || [];
        const next = current.map((a, i) => (i === index ? { ...a, [field]: value } : a));
        form.setValue('bankAccounts', next, { shouldDirty: true });
    };

    const onBankChange = (index: number, bankId: string) => {
        const bank = banks?.find(b => b.id === bankId);
        const current = form.getValues('bankAccounts') || [];
        const next = current.map((a, i) =>
            i === index ? { ...a, bankId, bankName: bank?.name || '' } : a
        );
        form.setValue('bankAccounts', next, { shouldDirty: true });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Банкны данс</CardTitle>
                        <CardDescription>Компанийн дансны мэдээлэл — олон данс нэмэх боломжтой.</CardDescription>
                    </div>
                    <Button type="button" onClick={addAccount} size="sm" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Данс нэмэх
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoadingBanks && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Банкнуудыг ачаалж байна...
                    </div>
                )}
                {!isLoadingBanks && (!banks || banks.length === 0) && (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground flex items-start gap-3">
                        <Landmark className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-foreground">Банкны жагсаалт хоосон байна</p>
                            <p className="text-xs mt-1">
                                Super admin хэрэглэгч /super-admin/reference-data → Банкууд хэсгээс банкуудыг нэмнэ үү.
                            </p>
                        </div>
                    </div>
                )}

                {bankAccounts.length === 0 && !isLoadingBanks && banks && banks.length > 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center">
                        <Landmark className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Данс нэмэгдээгүй байна</p>
                        <Button type="button" onClick={addAccount} size="sm" variant="outline" className="mt-3">
                            <Plus className="mr-2 h-4 w-4" />
                            Эхний данс нэмэх
                        </Button>
                    </div>
                )}

                {bankAccounts.map((account, index) => (
                    <div key={index} className="rounded-lg border p-4 space-y-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center">
                                    <Landmark className="h-4 w-4 text-sky-600" />
                                </div>
                                <span className="text-sm font-medium">Данс {index + 1}</span>
                                {account.isPrimary && (
                                    <Badge variant="secondary" className="gap-1 text-[10px]">
                                        <Star className="h-3 w-3" />
                                        Үндсэн
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {!account.isPrimary && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPrimary(index)}
                                        className="h-8 text-xs"
                                    >
                                        <Star className="h-3.5 w-3.5 mr-1" />
                                        Үндсэн болгох
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeAccount(index)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <FormLabel>Банк</FormLabel>
                                <Select
                                    value={account.bankId || ''}
                                    onValueChange={(v) => onBankChange(index, v)}
                                    disabled={isLoadingBanks || !banks || banks.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Банк сонгоно уу" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {banks?.map(bank => (
                                            <SelectItem key={bank.id} value={bank.id}>
                                                {bank.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <FormLabel>Дансны дугаар</FormLabel>
                                <Input
                                    value={account.accountNumber || ''}
                                    onChange={(e) => updateField(index, 'accountNumber', e.target.value)}
                                    placeholder="5001234567"
                                />
                            </div>
                            <div className="space-y-2">
                                <FormLabel>Хүлээн авагчийн нэр</FormLabel>
                                <Input
                                    value={account.accountName || ''}
                                    onChange={(e) => updateField(index, 'accountName', e.target.value)}
                                    placeholder="ХХК-ийн нэр эсвэл хүний нэр"
                                />
                            </div>
                            <div className="space-y-2">
                                <FormLabel>Валют</FormLabel>
                                <Select
                                    value={account.currency || 'MNT'}
                                    onValueChange={(v) => updateField(index, 'currency', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MNT">MNT — Төгрөг</SelectItem>
                                        <SelectItem value="USD">USD — Америк доллар</SelectItem>
                                        <SelectItem value="EUR">EUR — Евро</SelectItem>
                                        <SelectItem value="CNY">CNY — Юань</SelectItem>
                                        <SelectItem value="RUB">RUB — Орос рубль</SelectItem>
                                        <SelectItem value="JPY">JPY — Иэн</SelectItem>
                                        <SelectItem value="KRW">KRW — Вон</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default function EditCompanyPage() {
    const { firestore } = useFirebase();

    const companyProfileRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null),
        []
    );

    const { data: companyProfile, isLoading: isLoadingProfile } = useFetchDoc<CompanyProfileValues>(companyProfileRef as any);

    if (isLoadingProfile) {
        return (
            <div className="py-8">
                <FormSkeleton />
            </div>
        )
    }

    const initialData = {
        ...defaultFormValues,
        ...(companyProfile || {})
    };
    const docExists = !!companyProfile;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 md:pt-0 scroll-smooth">
                <EditCompanyForm initialData={initialData} docExists={docExists} />
            </div>
        </div>
    );
}
