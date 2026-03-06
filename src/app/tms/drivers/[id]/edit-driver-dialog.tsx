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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Camera, Sparkles, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TMS_DRIVERS_COLLECTION, TMS_LICENSE_CLASSES } from '@/app/tms/types';
import type { TmsDriver } from '@/app/tms/types';
import { cn } from '@/lib/utils';

const schema = z.object({
  lastName: z.string().min(1, 'Овог оруулна уу.'),
  firstName: z.string().min(1, 'Нэр оруулна уу.'),
  registerNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  phone: z.string().min(1, 'Утас оруулна уу.'),
  email: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  isAvailableForContracted: z.boolean(),
  licenseNumber: z.string().optional(),
  licenseExpiryDate: z.string().optional(),
  licenseClasses: z.array(z.string()).optional(),
  licenseImageFrontUrl: z.string().optional(),
  licenseImageBackUrl: z.string().optional(),
  nationalIdFrontUrl: z.string().optional(),
  nationalIdBackUrl: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: TmsDriver;
}

const STORAGE_PREFIX = 'tms_drivers';

export function EditDriverDialog({ open, onOpenChange, driver }: EditDriverDialogProps) {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadingField, setUploadingField] = React.useState<string | null>(null);
  const [isRecognizingLicense, setIsRecognizingLicense] = React.useState(false);
  const [isRecognizingNationalId, setIsRecognizingNationalId] = React.useState(false);
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const defaultValues: FormValues = {
    lastName: driver.lastName ?? '',
    firstName: driver.firstName ?? '',
    registerNumber: driver.registerNumber ?? '',
    dateOfBirth: driver.dateOfBirth ?? '',
    phone: driver.phone ?? '',
    email: driver.email ?? '',
    status: (driver.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    emergencyName: driver.emergencyContact?.name ?? '',
    emergencyPhone: driver.emergencyContact?.phone ?? '',
    isAvailableForContracted: driver.isAvailableForContracted ?? false,
    licenseNumber: driver.licenseNumber ?? '',
    licenseExpiryDate: driver.licenseExpiryDate ?? '',
    licenseClasses: driver.licenseClasses ?? [],
    licenseImageFrontUrl: driver.licenseImageFrontUrl ?? '',
    licenseImageBackUrl: driver.licenseImageBackUrl ?? '',
    nationalIdFrontUrl: driver.nationalIdFrontUrl ?? '',
    nationalIdBackUrl: driver.nationalIdBackUrl ?? '',
    note: driver.note ?? '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open && driver) {
      form.reset({
        lastName: driver.lastName ?? '',
        firstName: driver.firstName ?? '',
        registerNumber: driver.registerNumber ?? '',
        dateOfBirth: driver.dateOfBirth ?? '',
        phone: driver.phone ?? '',
        email: driver.email ?? '',
        status: (driver.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
        emergencyName: driver.emergencyContact?.name ?? '',
        emergencyPhone: driver.emergencyContact?.phone ?? '',
        isAvailableForContracted: driver.isAvailableForContracted ?? false,
        licenseNumber: driver.licenseNumber ?? '',
        licenseExpiryDate: driver.licenseExpiryDate ?? '',
        licenseClasses: driver.licenseClasses ?? [],
        licenseImageFrontUrl: driver.licenseImageFrontUrl ?? '',
        licenseImageBackUrl: driver.licenseImageBackUrl ?? '',
        nationalIdFrontUrl: driver.nationalIdFrontUrl ?? '',
        nationalIdBackUrl: driver.nationalIdBackUrl ?? '',
        note: driver.note ?? '',
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
    nationalIdFrontUrl: 'national_id_front',
    nationalIdBackUrl: 'national_id_back',
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
      if (d.lastName) form.setValue('lastName', d.lastName);
      if (d.firstName) form.setValue('firstName', d.firstName);
      if (d.dateOfBirth) form.setValue('dateOfBirth', d.dateOfBirth);
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
      if (d.lastName) form.setValue('lastName', d.lastName);
      if (d.firstName) form.setValue('firstName', d.firstName);
      if (d.dateOfBirth) form.setValue('dateOfBirth', d.dateOfBirth);
      if (d.registerNumber) form.setValue('registerNumber', d.registerNumber);
      toast({ title: 'Иргэний үнэмлэхний мэдээлэл танигдлаа.' });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'AI танихад алдаа гарлаа.' });
    } finally {
      setIsRecognizingNationalId(false);
    }
  };

  const handleImageUpload = async (fieldName: 'licenseImageFrontUrl' | 'licenseImageBackUrl' | 'nationalIdFrontUrl' | 'nationalIdBackUrl', file: File) => {
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
        lastName: values.lastName.trim(),
        firstName: values.firstName.trim(),
        registerNumber: values.registerNumber?.trim() || null,
        dateOfBirth: values.dateOfBirth || null,
        phone: values.phone.trim(),
        email: values.email?.trim() || null,
        status: values.status,
        emergencyContact:
          values.emergencyName || values.emergencyPhone
            ? { name: values.emergencyName?.trim() ?? '', phone: values.emergencyPhone?.trim() ?? '' }
            : null,
        isAvailableForContracted: values.isAvailableForContracted,
        licenseNumber: values.licenseNumber?.trim() || null,
        licenseExpiryDate: values.licenseExpiryDate || null,
        licenseClasses: values.licenseClasses?.length ? values.licenseClasses : null,
        licenseImageFrontUrl: values.licenseImageFrontUrl?.trim() || null,
        licenseImageBackUrl: values.licenseImageBackUrl?.trim() || null,
        nationalIdFrontUrl: values.nationalIdFrontUrl?.trim() || null,
        nationalIdBackUrl: values.nationalIdBackUrl?.trim() || null,
        note: values.note?.trim() || null,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Тээвэрчин шинэчлэгдлээ.' });
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Засах явцад алдаа гарлаа.';
      toast({ variant: 'destructive', title: 'Алдаа', description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="xl" showClose className="max-h-[90vh] overflow-y-auto">
        <AppDialogHeader>
          <AppDialogTitle>Тээвэрчин засах</AppDialogTitle>
          <AppDialogDescription>Хувийн мэдээлэл, жолооны үнэмлэх, иргэний үнэмлэх.</AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody className="space-y-6">
              <h3 className="text-lg font-medium">Хувийн мэдээлэл</h3>

              <div className="flex flex-col lg:flex-row gap-8">
                <div className="space-y-4 flex-1">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">Профайл зураг</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Овог *</FormLabel>
                        <FormControl><Input placeholder="Овог" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Нэр *</FormLabel>
                        <FormControl><Input placeholder="Нэр" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="registerNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Регистрийн дугаар</FormLabel>
                      <FormControl><Input placeholder="У..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Төрсөн огноо</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Утасны дугаар *</FormLabel>
                      <FormControl><Input placeholder="99..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Идэвхтэй</SelectItem>
                          <SelectItem value="inactive">Идэвхгүй</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="pt-2">
                    <FormLabel className="text-sm font-medium">Яаралтай үед холбоо барих</FormLabel>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <FormField control={form.control} name="emergencyName" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Хэний хэн</FormLabel>
                          <FormControl><Input placeholder="Эхнэр/Нөхөр..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="emergencyPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-muted-foreground">Холбоо барих утас</FormLabel>
                          <FormControl><Input placeholder="99..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <FormField control={form.control} name="isAvailableForContracted" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Гэрээт тээвэрт явах</FormLabel>
                          <FormDescription>Энэ жолооч гэрээт (тогтмол) тээвэрлэлтэд явах боломжтой эсэх.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </div>
                    </FormItem>
                  )} />
                </div>

                <div className="space-y-4 flex-1">
                  <h4 className="font-medium">Жолооны үнэмлэх</h4>
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
                    <Button type="button" variant="outline" size="sm" className="mt-2 gap-1" onClick={handleRecognizeLicense} disabled={isRecognizingLicense || !form.watch('licenseImageFrontUrl')}>
                      {isRecognizingLicense ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      AI-аар мэдээлэл таних
                    </Button>
                    <FormDescription className="block mt-1">Зургаас нэр, регистр, үнэмлэхний дугаар, ангилал зэргийг автоматаар таниулна.</FormDescription>
                  </div>

                  <h4 className="font-medium pt-2">Иргэний үнэмлэх</h4>
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
                  <Button type="button" variant="outline" size="sm" className="gap-1 mt-2" onClick={handleRecognizeNationalId} disabled={isRecognizingNationalId || !form.watch('nationalIdFrontUrl')}>
                    {isRecognizingNationalId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    AI-аар мэдээлэл таних
                  </Button>
                  <FormDescription className="block">Зургаас овог, нэр, регистр, төрсөн огноо зэргийг автоматаар таниулна.</FormDescription>
                </div>
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
