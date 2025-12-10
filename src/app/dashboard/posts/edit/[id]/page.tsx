'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { useFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  Loader2,
  Save,
  X,
  ArrowLeft,
  Upload,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

const postSchema = z.object({
  title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
  content: z.string().min(1, 'Агуулга хоосон байж болохгүй.'),
  imageUrls: z.array(z.string()).optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

type Post = PostFormValues & { id: string; };

function EditFormSkeleton() {
    return (
        <div className="space-y-6">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-6 w-40" />
                </div>
                 <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function EditPostPage() {
  const router = useRouter();
  const { id } = useParams();
  const postId = Array.isArray(id) ? id[0] : id;

  const { firestore } = useFirebase();
  const { toast } = useToast();

  const postDocRef = React.useMemo(() => (firestore && postId ? doc(firestore, 'posts', postId) : null), [firestore, postId]);
  const { data: post, isLoading: isLoadingPost } = useDoc<Post>(postDocRef);
  
  const [imageFiles, setImageFiles] = React.useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
        title: '',
        content: '',
        imageUrls: [],
    }
  });

  React.useEffect(() => {
      if (post) {
          form.reset(post);
          setExistingImageUrls(post.imageUrls || []);
      }
  }, [post, form]);

  const { isSubmitting } = form.formState;
  
  const localImagePreviews = React.useMemo(() => imageFiles.map(file => URL.createObjectURL(file)), [imageFiles]);
  const allImagePreviews = [...existingImageUrls, ...localImagePreviews];


  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setImageFiles(prev => [...prev, ...newFiles]);
    }
  };
  
  const handleRemoveImage = (index: number) => {
      if (index < existingImageUrls.length) {
          // It's an existing image, just remove its URL
          setExistingImageUrls(urls => urls.filter((_, i) => i !== index));
      } else {
          // It's a new local file
          const localIndex = index - existingImageUrls.length;
          setImageFiles(files => files.filter((_, i) => i !== localIndex));
      }
  }


  const handleSave = async (values: PostFormValues) => {
    if (!postDocRef) return;

    setIsUploading(true);
    
    // Upload new files
    const newImageUrls: string[] = [];
    if (imageFiles.length > 0) {
        const storage = getStorage();
        for (const file of imageFiles) {
            const storageRef = ref(storage, `posts/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            newImageUrls.push(downloadURL);
        }
    }
    setIsUploading(false);
    
    const finalImageUrls = [...existingImageUrls, ...newImageUrls];

    updateDocumentNonBlocking(postDocRef, {
        ...values,
        imageUrls: finalImageUrls,
    });

    toast({
      title: 'Амжилттай хадгаллаа',
      description: 'Нийтлэл шинэчлэгдлээ.',
    });

    router.push('/dashboard/posts');
  };
  
  if (isLoadingPost) {
      return <div className="py-8"><EditFormSkeleton /></div>
  }

  if (!post) {
      return <div className="py-8 text-center">Нийтлэл олдсонгүй.</div>
  }

  return (
    <div className="py-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="outline" size="icon">
                <Link href="/dashboard/posts">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Буцах</span>
                </Link>
              </Button>
              <h1 className="text-xl font-semibold tracking-tight">
                Нийтлэл засах
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.push('/dashboard/posts')}
                disabled={isSubmitting || isUploading}
              >
                <X className="mr-2 h-4 w-4" />
                Цуцлах
              </Button>
              <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting || isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Хадгалах
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Нийтлэлийн агуулга</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Гарчиг</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Нийтлэлийн сэтгэл татам гарчиг"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дэлгэрэнгүй агуулга</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Таны бодол, мэдээлэл..."
                        rows={10}
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
              <CardTitle>Зураг</CardTitle>
              <CardDescription>
                Нийтлэлдээ зураг хавсаргах (заавал биш).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {allImagePreviews.map((src, index) => (
                        <div key={src} className="relative aspect-square">
                            <Image src={src} alt={`Preview ${index + 1}`} fill className="object-cover rounded-md" />
                            <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => handleRemoveImage(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                 </div>
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex items-center justify-center w-full rounded-md border-2 border-dashed p-8 text-muted-foreground hover:bg-muted/50"
                >
                    <div className="text-center">
                        <Upload className="mx-auto h-8 w-8" />
                        <p className="mt-2 text-sm">Зураг сонгох</p>
                    </div>
                    <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                    />
                </label>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
