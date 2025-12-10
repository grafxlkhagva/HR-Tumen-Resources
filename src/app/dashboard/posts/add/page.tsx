'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useFirebase, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Loader2,
  Save,
  X,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import Image from 'next/image';

const postSchema = z.object({
  title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
  content: z.string().min(1, 'Агуулга хоосон байж болохгүй.'),
  imageUrl: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

export default function AddPostPage() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { employeeProfile } = useEmployeeProfile();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      imageUrl: '',
    },
  });

  const { isSubmitting } = form.formState;

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (values: PostFormValues) => {
    if (!firestore || !employeeProfile) return;

    setIsUploading(true);
    let imageUrl = '';
    if (imageFile) {
      const storage = getStorage();
      const storageRef = ref(
        storage,
        `posts/${Date.now()}-${imageFile.name}`
      );
      await uploadBytes(storageRef, imageFile);
      imageUrl = await getDownloadURL(storageRef);
    }
    setIsUploading(false);

    const postsCollection = collection(firestore, 'posts');
    await addDocumentNonBlocking(postsCollection, {
      ...values,
      imageUrl,
      authorName: `${employeeProfile.firstName} ${employeeProfile.lastName}`,
      createdAt: new Date().toISOString(),
    });

    toast({
      title: 'Амжилттай хадгаллаа',
      description: 'Шинэ нийтлэл самбарт нэмэгдлээ.',
    });

    router.push('/dashboard/posts');
  };

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
                Шинэ нийтлэл нэмэх
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
                Нийтлэх
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
                              Зураг сонгох
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
