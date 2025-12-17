'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { Loader2, Save, X, PlusCircle, Trash2, Upload, Film, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const videoSchema = z.object({
    title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
    description: z.string().optional(),
    url: z.string().url('URL хаяг буруу байна.'),
});

const videosSchema = z.object({
    videos: z.array(videoSchema).optional(),
});

type VideosFormValues = z.infer<typeof videosSchema>;

function VideoFormSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
                <Card className="p-4 bg-muted/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Skeleton className="h-4 w-24" />
                            <Skeleton className="aspect-video w-full rounded-md" />
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-32" />
                                <Skeleton className="h-9 w-24" />
                            </div>
                        </div>
                    </div>
                </Card>
                <Skeleton className="h-9 w-36" />
            </CardContent>
        </Card>
    )
}


function EditVideosForm({ initialData }: { initialData: VideosFormValues }) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [uploadingVideoIndex, setUploadingVideoIndex] = React.useState<number | null>(null);

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const form = useForm<VideosFormValues>({
    resolver: zodResolver(videosSchema),
    defaultValues: initialData,
  });

  React.useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "videos",
  });

  const { isSubmitting } = form.formState;
  
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingVideoIndex(index);
    const storage = getStorage();
    const storageRef = ref(storage, `company-videos/${Date.now()}-${file.name}`);

    try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        form.setValue(`videos.${index}.url`, downloadURL, { shouldValidate: true });
        toast({ title: 'Видео амжилттай байршлаа.' });
    } catch (error) {
        console.error("Видео байршуулахад алдаа гарлаа: ", error);
        toast({ variant: 'destructive', title: 'Алдаа', description: 'Видео байршуулахад алдаа гарлаа.' });
    } finally {
        setUploadingVideoIndex(null);
    }
  };


  const handleSave = (values: VideosFormValues) => {
    if (!companyProfileRef) return;
    
    const finalValues = {
        videos: values.videos?.filter(v => v.url)
    };

    updateDocumentNonBlocking(companyProfileRef, finalValues);
    
    toast({
      title: 'Амжилттай хадгаллаа',
      description: 'Видео контент шинэчлэгдлээ.',
    });
    router.push('/dashboard/company');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Видео контент засах</CardTitle>
                <CardDescription>Компанийн танилцуулга, соёлын видеонуудыг энд оруулна уу.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.map((field, index) => (
                    <Card key={field.id} className="p-4 bg-muted/20">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-4">
                                <FormField control={form.control} name={`videos.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Видеоны гарчиг</FormLabel><FormControl><Input placeholder="Компанийн танилцуулга" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField control={form.control} name={`videos.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Товч тайлбар</FormLabel><FormControl><Textarea placeholder="Энэ видеонд юу гардаг вэ?" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="space-y-2">
                                <FormLabel>Видео файл</FormLabel>
                                {form.watch(`videos.${index}.url`) ? (
                                    <div className="aspect-video rounded-md overflow-hidden bg-background">
                                        <video src={form.watch(`videos.${index}.url`)} controls className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                     <div className="aspect-video flex items-center justify-center rounded-md border-2 border-dashed">
                                        <div className="text-center">
                                            <Film className="mx-auto h-12 w-12 text-gray-400" />
                                            <p className="mt-2 text-sm text-muted-foreground">Видео байршуулаагүй байна</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2 items-center">
                                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`video-upload-${index}`)?.click()} disabled={uploadingVideoIndex === index}>
                                    {uploadingVideoIndex === index ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Видео солих
                                </Button>
                                <input id={`video-upload-${index}`} type="file" accept="video/*" className="hidden" onChange={(e) => handleVideoUpload(e, index)} />
                                <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                </Button>
                                </div>
                                <FormField control={form.control} name={`videos.${index}.url`} render={() => ( <FormMessage /> )}/>
                            </div>
                        </div>
                    </Card>
                ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ title: '', description: '', url: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Видео нэмэх
                </Button>
            </CardContent>
        </Card>
        
        <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting || uploadingVideoIndex !== null}>
            {isSubmitting || uploadingVideoIndex !== null ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Save className="mr-2 h-4 w-4" />
            )}
            Хадгалах
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/company')} disabled={isSubmitting || uploadingVideoIndex !== null}>
                <X className="mr-2 h-4 w-4" />
                Цуцлах
            </Button>
        </div>
      </form>
    </Form>
  );
}

const defaultFormValues: VideosFormValues = {
  videos: [],
};

export default function EditCompanyVideosPage() {
  const { firestore } = useFirebase();

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<VideosFormValues>(companyProfileRef);

  if (isLoadingProfile) {
    return (
        <div className="py-8">
            <VideoFormSkeleton />
        </div>
    )
  }

  const initialData = companyProfile || defaultFormValues;

  return (
    <div className="py-8">
        <div className="mb-4 flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Буцах</span>
                </Link>
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">Видео контент засах</h1>
        </div>
      <EditVideosForm initialData={initialData} />
    </div>
  );
}
