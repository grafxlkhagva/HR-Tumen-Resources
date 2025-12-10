'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Save, X, PlusCircle, Trash2, Upload, Building, Film, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const valueSchema = z.object({
  title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
  description: z.string().min(1, 'Тайлбар хоосон байж болохгүй.'),
  icon: z.string().min(1, 'Дүрс сонгоно уу.'),
});

const companyProfileSchema = z.object({
  name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
  logoUrl: z.string().optional(),
  legalName: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  ceo: z.string().optional(),
  website: z.string().url({ message: 'Вэбсайтын хаяг буруу байна.' }).optional().or(z.literal('')),
  mission: z.string().optional(),
  vision: z.string().optional(),
  values: z.array(valueSchema).optional(),
  phoneNumber: z.string().optional(),
  contactEmail: z.string().email({ message: 'Имэйл хаяг буруу байна.' }).optional().or(z.literal('')),
  address: z.string().optional(),
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

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
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
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

function EditCompanyForm({ initialData, docExists }: { initialData: CompanyProfileFormValues, docExists: boolean }) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [logoPreview, setLogoPreview] = React.useState<string | null>(initialData.logoUrl || null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: initialData,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "values",
  });

  const { isSubmitting } = form.formState;

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const storage = getStorage();
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
  
  const handleSave = (values: CompanyProfileFormValues) => {
    if (!companyProfileRef) return;
    
    if (docExists) {
        updateDocumentNonBlocking(companyProfileRef, values);
    } else {
        setDocumentNonBlocking(companyProfileRef, values, { merge: true });
    }

    toast({
      title: 'Амжилттай хадгаллаа',
      description: 'Компанийн мэдээлэл шинэчлэгдлээ.',
    });
    router.push('/dashboard/company');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Ерөнхий мэдээлэл засах</CardTitle>
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
                    <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Лого солих
                    </Button>
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
                        <Input placeholder="Эйч Ар Зен ХХК" {...field} />
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
                        <FormLabel>Улсын бүртгэлийн дугаар</FormLabel>
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
                        <FormLabel>Татвар төлөгчийн дугаар</FormLabel>
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
                    name="employeeCount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ажилтны тоо</FormLabel>
                        <FormControl>
                        <Input placeholder="51-100 ажилтан" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                    <FormField
                    control={form.control}
                    name="ceo"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Гүйцэтгэх захирал</FormLabel>
                        <FormControl>
                        <Input placeholder="Ж. Ганбаатар" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Эрхэм зорилго, Алсын хараа, Үнэт зүйлс</CardTitle>
                <CardDescription>Байгууллагын соёл, чиг хандлагыг тодорхойлно уу.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <FormField
                    control={form.control}
                    name="mission"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Эрхэм зорилго</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Бидний эрхэм зорилго бол..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="vision"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Алсын хараа</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Бид ирээдүйд..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div>
                  <FormLabel>Үнэт зүйлс</FormLabel>
                  <div className="mt-2 space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 gap-4 items-end md:grid-cols-[1fr_1fr_1fr_auto]">
                        <FormField
                          control={form.control}
                          name={`values.${index}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Гарчиг</FormLabel>
                              <FormControl>
                                <Input placeholder="Жишээ нь: Хариуцлага" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`values.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Тайлбар</FormLabel>
                              <FormControl>
                                <Input placeholder="Богино тайлбар..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name={`values.${index}.icon`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Дүрс</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Дүрс сонгох" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="responsibility">Хариуцлага (Handshake)</SelectItem>
                                  <SelectItem value="innovation">Инноваци (Zap)</SelectItem>
                                  <SelectItem value="collaboration">Хамтын ажиллагаа (Users2)</SelectItem>
                                  <SelectItem value="default">Бусад (Shield)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Устгах</span>
                            </Button>
                         
                         {index < fields.length - 1 && <Separator className="my-4 col-span-1 md:col-span-4"/>}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => append({ title: '', description: '', icon: 'default' })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Үнэт зүйл нэмэх
                    </Button>
                  </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Холбоо барих мэдээлэл засах</CardTitle>
            </CardHeader>
             <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                 <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Утасны дугаар</FormLabel>
                        <FormControl>
                        <Input placeholder="+976 7700 8800" {...field} />
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
        
        <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting || isUploading}>
            {isSubmitting || isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Save className="mr-2 h-4 w-4" />
            )}
            Хадгалах
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/company')} disabled={isSubmitting || isUploading}>
                <X className="mr-2 h-4 w-4" />
                Цуцлах
            </Button>
        </div>
      </form>
    </Form>
  );
}

const defaultFormValues: CompanyProfileFormValues = {
  name: '',
  logoUrl: '',
  legalName: '',
  registrationNumber: '',
  taxId: '',
  industry: '',
  employeeCount: '',
  ceo: '',
  website: '',
  mission: '',
  vision: '',
  values: [],
  phoneNumber: '',
  contactEmail: '',
  address: '',
};

export default function EditCompanyPage() {
  const { firestore } = useFirebase();

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfileFormValues>(companyProfileRef);

  if (isLoadingProfile) {
    return (
        <div className="py-8">
            <FormSkeleton />
        </div>
    )
  }

  const initialData = companyProfile || defaultFormValues;
  const docExists = !!companyProfile;

  return (
    <div className="py-8">
      <EditCompanyForm initialData={initialData} docExists={docExists} />
    </div>
  );
}
