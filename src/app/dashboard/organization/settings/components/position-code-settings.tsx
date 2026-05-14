'use client';

import * as React from 'react';
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
import {
  useMemoFirebase,
  useDoc,
  setDocumentNonBlocking,
  tenantDoc,
} from '@/firebase';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const positionCodeSchema = z
  .object({
    prefix: z.string().min(1, 'Угтвар үсэг хоосон байж болохгүй.'),
    digitCount: z
      .coerce
      .number()
      .min(1, 'Оронгийн тоо 1-ээс бага байж болохгүй.')
      .max(10, 'Оронгийн тоо 10-аас их байж болохгүй.'),
    nextNumber: z
      .coerce
      .number()
      .min(1, 'Эхлэх дугаар 1-ээс бага байж болохгүй.'),
  })
  .refine(
    (data) => {
      const maxNumber = Math.pow(10, data.digitCount);
      return data.nextNumber < maxNumber;
    },
    {
      message: 'Эхлэх дугаар нь тооны орноос хэтэрсэн байна.',
      path: ['nextNumber'],
    }
  );

type PositionCodeFormValues = z.infer<typeof positionCodeSchema>;

type PositionCodeConfig = {
  prefix: string;
  digitCount: number;
  nextNumber: number;
};

function ConfigCardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-28" />
    </div>
  );
}

function PositionCodeConfigForm({ initialData }: { initialData: PositionCodeFormValues }) {
  const { toast } = useToast();

  const codeConfigRef = useMemoFirebase(
    ({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'positionCodeConfig') : null),
    []
  );

  const form = useForm<PositionCodeFormValues>({
    resolver: zodResolver(positionCodeSchema),
    defaultValues: initialData,
  });

  const { isSubmitting } = form.formState;

  React.useEffect(() => {
    form.reset(initialData);
  }, [initialData, form]);

  const onSubmit = async (data: PositionCodeFormValues) => {
    if (!codeConfigRef) return;

    try {
      await setDocumentNonBlocking(codeConfigRef, data, { merge: true });
      toast({
        title: 'Амжилттай хадгаллаа',
        description: 'Ажлын байрны кодчлолын тохиргоо шинэчлэгдлээ.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Алдаа гарлаа',
        description: 'Тохиргоо хадгалах үед алдаа гарлаа. Дахин оролдож үзнэ үү.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="prefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Угтвар үсэг</FormLabel>
                <FormControl>
                  <Input placeholder="POS" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="digitCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Тооны орон</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="4" min={1} max={10} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nextNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Эхлэх дугаар</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="1" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 shrink-0 animate-spin" />
            ) : (
              <Save className="mr-2 size-4 shrink-0" />
            )}
            Хадгалах
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function PositionCodeSettings() {
  const codeConfigRef = useMemoFirebase(
    ({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'positionCodeConfig') : null),
    []
  );

  const { data: codeConfig, isLoading } = useDoc<PositionCodeConfig>(codeConfigRef as any);

  const initialData: PositionCodeFormValues = codeConfig || {
    prefix: '',
    digitCount: 4,
    nextNumber: 1,
  };

  return (
    <Card className="shadow-premium border-slate-200/60">
      <CardHeader>
        <CardTitle>Ажлын байрны кодчлол</CardTitle>
        <CardDescription>Ажлын байрны кодыг хэрхэн үүсгэхийг тохируулах. Жишээ: POS0001</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <ConfigCardSkeleton /> : <PositionCodeConfigForm initialData={initialData} />}
      </CardContent>
    </Card>
  );
}
