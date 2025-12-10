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
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

const postSchema = z.object({
  title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
  content: z.string().min(1, 'Агуулга хоосон байж болохгүй.'),
  imageUrl: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

type Post = PostFormValues & { id: string };

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
                    <div className="flex flex-col items-center gap-4">
                        <Skeleton className="h-64 w-full max-w-2xl" />
                        <Skeleton className="h-9 w-32" />
                    </div>
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

  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
        title: '',
        content: '',
        imageUrl: '',
    }
  });

  React.useEffect(() => {
      if (post) {
          form.reset(post);
          setImagePreview(post.imageUrl || null);
      }
  }, [post, form]);

  const { isSubmitting } = form.formState;

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (values: PostFormValues) => {
    if (!postDocRef) return;

    let newImageUrl = values.imageUrl;

    if (imageFile) {
        setIsUploading(true);
        // If there was an old image, delete it
        if (post?.imageUrl) {
            try {
                const oldImageRef = ref(getStorage(), post.imageUrl);
                await deleteObject(oldImageRef);
            } catch (error) {
                console.warn("Old image deletion failed, it might not exist:", error);
            }
        }
        
        const storage = getStorage();
        const storageRef = ref(storage,`posts/${Date.now()}-${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        newImageUrl = await getDownloadURL(storageRef);
        setIsUploading(false);
    }
    
    updateDocumentNonBlocking(postDocRef, {
        ...values,
        imageUrl: newImageUrl,
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
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative h-64 w-full max-w-2xl rounded-md border-2 border-dashed">
                          {imagePreview ? (
                            <Image
                              src={imagePreview}
                              alt="Post image preview"
                              fill
                              className="object-contain"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-12 w-12" />
                              <p className="mt-2 text-sm">
                                Зураг урьдчилан харах
                              </p>
                            </div>
                          )}
                        </div>
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer"
                        >
                          <Button type="button" asChild>
                            <span>
                              <Upload className="mr-2 h-4 w-4" />
                              Зураг солих
                            </span>
                          </Button>
                          <Input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageSelect}
                          />
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
