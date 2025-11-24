'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { useFirebase, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const companyProfileSchema = z.object({
  name: z.string().min(2, { message: 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.' }),
  legalName: z.string().optional(),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.string().optional(),
  ceo: z.string().optional(),
  website: z.string().url({ message: 'Вэбсайтын хаяг буруу байна.' }).optional().or(z.literal('')),
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

function FormSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div className="space-y-2" key={i}>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </CardContent>
            <CardFooter className="gap-2">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-24" />
            </CardFooter>
        </Card>
    );
}

export default function EditCompanyPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );
  
  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<CompanyProfileFormValues>(companyProfileRef);

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    values: companyProfile || {
        name: '',
        legalName: '',
        registrationNumber: '',
        taxId: '',
        industry: '',
        employeeCount: '',
        ceo: '',
        website: '',
    },
  });

  const { isSubmitting } = form.formState;

  const handleSave = (values: CompanyProfileFormValues) => {
    if (!companyProfileRef) return;
    
    setDocumentNonBlocking(companyProfileRef, values, { merge: true });

    toast({
      title: 'Амжилттай хадгаллаа',
      description: 'Компанийн мэдээлэл шинэчлэгдлээ.',
    });
    router.push('/dashboard/company');
  };

  if (isLoadingProfile) {
    return (
        <div className="py-8">
            <FormSkeleton />
        </div>
    )
  }

  return (
    <div className="py-8">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
            <Card>
            <CardHeader>
                <CardTitle>Ерөнхий мэдээлэл засах</CardTitle>
                <CardDescription>Компанийнхаа үндсэн мэдээллийг эндээс шинэчилнэ үү.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
            <CardFooter className="gap-2">
                <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Save className="mr-2 h-4 w-4" />
                )}
                Хадгалах
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/company')} disabled={isSubmitting}>
                    <X className="mr-2 h-4 w-4" />
                    Цуцлах
                </Button>
            </CardFooter>
            </Card>
        </form>
        </Form>
    </div>
  );
}