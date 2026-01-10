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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Loader2, Save, X, PlusCircle, Trash2, Upload, Film, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/page-header';

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
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();

    const [uploadingVideos, setUploadingVideos] = React.useState<{ [key: number]: number }>({});

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

        // Reset progress for this index
        setUploadingVideos(prev => ({ ...prev, [index]: 0 }));

        const storageRef = ref(storage, `company-videos/${Date.now()}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadingVideos(prev => ({ ...prev, [index]: Math.round(progress) }));
            },
            (error) => {
                console.error("Видео байршуулахад алдаа гарлаа: ", error);
                toast({ variant: 'destructive', title: 'Алдаа', description: 'Видео байршуулахад алдаа гарлаа.' });
                setUploadingVideos(prev => {
                    const next = { ...prev };
                    delete next[index];
                    return next;
                });
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                form.setValue(`videos.${index}.url`, downloadURL, { shouldValidate: true });
                toast({ title: 'Видео амжилттай байршлаа.' });
                setUploadingVideos(prev => {
                    const next = { ...prev };
                    delete next[index];
                    return next;
                });
            }
        );
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
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-8 pb-32">
                <PageHeader
                    title="Видео контент"
                    showBackButton
                    backHref="/dashboard/company"
                    hideBreadcrumbs
                    actions={
                        <div className="flex items-center gap-2">
                            <Button type="submit" disabled={isSubmitting || Object.keys(uploadingVideos).length > 0} size="sm">
                                {isSubmitting || Object.keys(uploadingVideos).length > 0 ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Хадгалах
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/company')} disabled={isSubmitting || Object.keys(uploadingVideos).length > 0}>
                                <X className="mr-2 h-4 w-4" />
                                Цуцлах
                            </Button>
                        </div>
                    }
                />
                <Card>
                    <CardHeader className="hidden">
                        <CardTitle>Видео контент засах</CardTitle>
                        <CardDescription>Компанийн танилцуулга, соёлын видеонуудыг энд оруулна уу.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <Card key={field.id} className="p-4 bg-muted/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <FormField control={form.control} name={`videos.${index}.title`} render={({ field }) => (<FormItem><FormLabel>Гарчиг</FormLabel><FormControl><Input placeholder="Компанийн танилцуулга" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name={`videos.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Товч тайлбар</FormLabel><FormControl><Textarea placeholder="Энэ видеонд юу гардаг вэ?" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
                                        <div className="flex flex-col gap-3">
                                            {uploadingVideos[index] !== undefined && (
                                                <div className="space-y-2 p-3 border rounded-md bg-background/50">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-medium text-primary flex items-center gap-2">
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            Байршуулж байна...
                                                        </span>
                                                        <span className="text-muted-foreground">{uploadingVideos[index]}%</span>
                                                    </div>
                                                    <Progress value={uploadingVideos[index]} className="h-1.5" />
                                                </div>
                                            )}
                                            <div className="flex gap-2 items-center">
                                                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`video-upload-${index}`)?.click()} disabled={uploadingVideos[index] !== undefined}>
                                                    {uploadingVideos[index] !== undefined ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                    Шинээр оруулах
                                                </Button>
                                                <input id={`video-upload-${index}`} type="file" accept="video/*" className="hidden" onChange={(e) => handleVideoUpload(e, index)} />

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button type="button" variant="destructive" size="sm">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Энэ видеог устгаснаар дахин сэргээх боломжгүй болно.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => remove(index)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Устгах
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                            <FormField control={form.control} name={`videos.${index}.url`} render={() => (<FormMessage />)} />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        <Button type="button" size="icon" onClick={() => append({ title: '', description: '', url: '' })} title="Видео нэмэх">
                            <PlusCircle className="h-5 w-5" />
                        </Button>
                    </CardContent>
                </Card>

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
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 md:pt-0 scroll-smooth">
                <EditVideosForm initialData={initialData} />
            </div>
        </div>
    );
}
