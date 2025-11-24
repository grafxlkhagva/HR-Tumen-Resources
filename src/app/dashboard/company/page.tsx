'use client';

import * as React from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, DocumentData } from 'firebase/firestore';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const companyProfileSchema = z.object({
  name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url({ message: 'Вэбсайтын хаяг буруу байна.' }).optional().or(z.literal('')),
  logoUrl: z.string().url({ message: 'Логоны URL буруу байна.' }).optional().or(z.literal('')),
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

function CompanyFormSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
    )
}

export default function CompanyPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const { data: companyProfile, isLoading: isLoadingProfile, error } = useDoc<CompanyProfileFormValues>(companyProfileRef);

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      website: '',
      logoUrl: '',
    },
  });
  
  const { isSubmitting } = form.formState;

  React.useEffect(() => {
    if (companyProfile) {
      form.reset(companyProfile);
    }
  }, [companyProfile, form]);
  
  const onSubmit = (values: CompanyProfileFormValues) => {
    if (!companyProfileRef) return;
    
    setDocumentNonBlocking(companyProfileRef, values, { merge: true });

    toast({
      title: 'Амжилттай хадгаллаа',
      description: 'Компанийн мэдээлэл шинэчлэгдлээ.',
    });
  };

  if (error) {
      return (
          <div className="py-8">
              <Card>
                  <CardHeader>
                      <CardTitle>Алдаа гарлаа</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-destructive">Компанийн мэдээллийг ачаалахад алдаа гарлаа: {error.message}</p>
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="py-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Компанийн мэдээлэл</CardTitle>
              <CardDescription>
                Компанийн ерөнхий мэдээллийг эндээс удирдан, шинэчилнэ үү.
              </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingProfile ? <CompanyFormSkeleton /> : (
                <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Компанийн нэр</FormLabel>
                      <FormControl>
                        <Input placeholder="Teal HR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Хаяг</FormLabel>
                      <FormControl>
                        <Input placeholder="Улаанбаатар хот, Сүхбаатар дүүрэг, 8-р хороо..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Утас</FormLabel>
                      <FormControl>
                        <Input placeholder="+976 7777-8888" {...field} />
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
                      <FormLabel>Вэбсайт</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
                )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Хадгалах
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
