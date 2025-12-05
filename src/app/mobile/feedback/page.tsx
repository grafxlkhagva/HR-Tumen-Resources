'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, History } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const feedbackSchema = z.object({
  subject: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
  message: z.string().min(10, 'Агуулга дор хаяж 10 тэмдэгттэй байх ёстой.'),
  category: z.enum(['Санал', 'Гомдол', 'Асуулт']),
  isAnonymous: z.boolean().default(false),
});
type FeedbackFormValues = z.infer<typeof feedbackSchema>;

type Feedback = {
  id: string;
  subject: string;
  category: 'Санал' | 'Гомдол' | 'Асуулт';
  status: 'Шинэ' | 'Хянаж буй' | 'Шийдвэрлэсэн';
  createdAt: string;
  isAnonymous: boolean;
};

const statusConfig: Record<Feedback['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'Шинэ': { label: 'Шинэ', variant: 'secondary' },
  'Хянаж буй': { label: 'Хянаж буй', variant: 'outline' },
  'Шийдвэрлэсэн': { label: 'Шийдвэрлэсэн', variant: 'default' },
};


function FeedbackHistoryItem({ item }: { item: Feedback }) {
    const config = statusConfig[item.status];
    return (
        <div className="flex items-start justify-between rounded-lg border p-4">
            <div>
                <p className="font-semibold">{item.subject}</p>
                <div className="text-sm text-muted-foreground space-x-2">
                    <span>{item.category}</span>
                    <span>·</span>
                    <span>{format(new Date(item.createdAt), 'yyyy-MM-dd')}</span>
                </div>
            </div>
            <Badge variant={config.variant}>{config.label}</Badge>
        </div>
    )
}

function PageSkeleton() {
    return (
        <div className="p-4 space-y-6">
            <header className="py-4">
                <Skeleton className="h-8 w-40" />
            </header>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function FeedbackPage() {
  const { employeeProfile, isProfileLoading } = useEmployeeProfile();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      subject: '',
      message: '',
      category: 'Санал',
      isAnonymous: false,
    },
  });

  const feedbackQuery = useMemoFirebase(() => (
    firestore && employeeProfile
      ? query(
          collection(firestore, 'feedback'),
          where('employeeId', '==', employeeProfile.id),
          orderBy('createdAt', 'desc')
        )
      : null
  ), [firestore, employeeProfile]);
  
  const { data: history, isLoading: isHistoryLoading } = useCollection<Feedback>(feedbackQuery);

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: FeedbackFormValues) => {
    if (!firestore || !employeeProfile) return;

    await addDocumentNonBlocking(collection(firestore, 'feedback'), {
      ...values,
      employeeId: values.isAnonymous ? null : employeeProfile.id,
      employeeName: values.isAnonymous ? null : `${employeeProfile.firstName} ${employeeProfile.lastName}`,
      employeePhotoURL: values.isAnonymous ? null : employeeProfile.photoURL,
      status: 'Шинэ',
      createdAt: new Date().toISOString(),
    });

    toast({
      title: 'Амжилттай илгээлээ',
      description: 'Таны санал хүсэлтийг хүлээн авлаа.',
    });
    form.reset();
  };
  
  if(isProfileLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-4 space-y-6 animate-in fade-in-50">
      <header className="py-4">
        <h1 className="text-2xl font-bold">Санал хүсэлт</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Шинэ санал, хүсэлт илгээх</CardTitle>
          <CardDescription>
            Танд ямар нэгэн санал, гомдол, асуулт байвал энд бичнэ үү.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Гарчиг</FormLabel>
                    <FormControl>
                      <Input placeholder="Санал хүсэлтийн товч гарчиг" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Агуулга</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Санал хүсэлтийн дэлгэрэнгүй агуулгыг энд бичнэ үү..."
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ангилал</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Ангилал сонгоно уу..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Санал">Санал</SelectItem>
                        <SelectItem value="Гомдол">Гомдол</SelectItem>
                        <SelectItem value="Асуулт">Асуулт</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isAnonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Нэрээ нууцлах</FormLabel>
                      <FormDescription>
                        Хэрэв та нэрээ нууцлахыг хүсвэл энд дарна уу.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Илгээх
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Илгээсэн түүх
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
             {isHistoryLoading && Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
             {!isHistoryLoading && history?.map(item => <FeedbackHistoryItem key={item.id} item={item} />)}
             {!isHistoryLoading && (!history || history.length === 0) && (
                <p className="text-center text-sm text-muted-foreground py-4">Илгээсэн түүх байхгүй байна.</p>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
