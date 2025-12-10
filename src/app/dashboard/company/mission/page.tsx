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
import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Save, X, PlusCircle, Trash2, ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import Image from 'next/image';

const valueSchema = z.object({
  title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
  description: z.string().min(1, 'Тайлбар хоосон байж болохгүй.'),
  icon: z.string().min(1, 'Дүрс оруулна уу.'),
});

const missionVisionSchema = z.object({
  mission: z.string().optional(),
  vision: z.string().optional(),
  values: z.array(valueSchema).optional(),
});

type MissionVisionFormValues = z.infer<typeof missionVisionSchema>;

function FormSkeleton() {
    return (
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
    );
}

function EditMissionVisionForm({ initialData }: { initialData: MissionVisionFormValues }) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = React.useState<number | null>(null);

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const form = useForm<MissionVisionFormValues>({
    resolver: zodResolver(missionVisionSchema),
    defaultValues: initialData,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "values",
  });

  const { isSubmitting } = form.formState;

  const handleIconUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(index);
    const storage = getStorage();
    const storageRef = ref(storage, `company-assets/value-icons/${Date.now()}-${file.name}`);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      form.setValue(`values.${index}.icon`, downloadURL, { shouldValidate: true });
      toast({ title: 'Дүрс амжилттай байршлаа.' });
    } catch (error) {
      console.error("Дүрс байршуулахад алдаа гарлаа: ", error);
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Дүрс байршуулахад алдаа гарлаа.' });
    } finally {
      setIsUploading(null);
    }
  };

  const handleSave = (values: MissionVisionFormValues) => {
    if (!companyProfileRef) return;
    
    updateDocumentNonBlocking(companyProfileRef, values);

    toast({
      title: 'Амжилттай хадгаллаа',
      description: 'Компанийн соёлын мэдээлэл шинэчлэгдлээ.',
    });
    router.push('/dashboard/company');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
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
                            <Textarea placeholder="Бидний эрхэм зорилго бол..." {...field} value={field.value ?? ''} />
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
                            <Textarea placeholder="Бид ирээдүйд..." {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div>
                  <FormLabel>Үнэт зүйлс</FormLabel>
                  <div className="mt-2 space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 items-start gap-4 rounded-md border p-4 md:grid-cols-[1fr_2fr_1fr]">
                        <div className="flex flex-col items-center gap-2">
                            <FormField
                                control={form.control}
                                name={`values.${index}.icon`}
                                render={({ field: iconField }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div>
                                                <label htmlFor={`icon-upload-${index}`} className="cursor-pointer">
                                                    <div className="h-20 w-20 flex items-center justify-center rounded-lg border-2 border-dashed bg-muted hover:bg-muted/50">
                                                        {iconField.value ? (
                                                            <Image src={iconField.value} alt="Icon preview" width={80} height={80} className="object-contain h-full w-full p-1" />
                                                        ) : (
                                                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </label>
                                                <Input id={`icon-upload-${index}`} type="file" accept="image/*" className="hidden" onChange={(e) => handleIconUpload(e, index)} />
                                            </div>
                                        </FormControl>
                                         <FormMessage />
                                    </FormItem>
                                )}
                            />
                             {isUploading === index && <p className="text-xs text-muted-foreground animate-pulse">Зураг хуулж байна...</p>}
                        </div>

                        <div className="space-y-4">
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
                                        <Textarea placeholder="Богино тайлбар..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <div className="flex justify-end items-start h-full">
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Устгах</span>
                            </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => append({ title: '', description: '', icon: '' })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Үнэт зүйл нэмэх
                    </Button>
                  </div>
                </div>
            </CardContent>
        </Card>
        
        <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting || isUploading !== null}>
            {isSubmitting || isUploading !== null ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Save className="mr-2 h-4 w-4" />
            )}
            Хадгалах
            </Button>
            <Button asChild variant="outline" disabled={isSubmitting || isUploading !== null}>
              <Link href="/dashboard/company">
                <X className="mr-2 h-4 w-4" />
                Цуцлах
              </Link>
            </Button>
        </div>
      </form>
    </Form>
  );
}

const defaultFormValues: MissionVisionFormValues = {
  mission: '',
  vision: '',
  values: [],
};

export default function EditMissionPage() {
  const { firestore } = useFirebase();

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<MissionVisionFormValues>(companyProfileRef);

  if (isLoadingProfile) {
    return (
        <div className="py-8">
            <FormSkeleton />
        </div>
    )
  }

  const initialData = companyProfile || defaultFormValues;

  return (
    <div className="py-8">
       <div className="mb-4">
            <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/company">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Буцах
                </Link>
            </Button>
        </div>
      <EditMissionVisionForm initialData={initialData} />
    </div>
  );
}
