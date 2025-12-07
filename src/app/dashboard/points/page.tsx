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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Send, History, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCollection, useFirebase, useMemoFirebase, useEmployeeProfile, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Employee } from '../employees/data';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const pointsTransferSchema = z.object({
  recipientId: z.string().min(1, 'Хүлээн авах ажилтныг сонгоно уу.'),
  points: z.coerce.number().min(1, 'Оноо 0-ээс их байх ёстой.'),
  reason: z.string().min(10, 'Шалтгаан дор хаяж 10 тэмдэгттэй байх ёстой.'),
});

type PointsTransferFormValues = z.infer<typeof pointsTransferSchema>;

type PointsLedger = {
    id: string;
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    points: number;
    reason: string;
    ruleId?: string;
    ruleName?: string;
    createdAt: string;
}

export default function PointsTransferPage() {
  const { employeeProfile, isProfileLoading } = useEmployeeProfile();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const employeesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const ledgerQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'pointsLedger'), orderBy('createdAt', 'desc')) : null), [firestore]);
  const { data: ledger, isLoading: isLoadingLedger } = useCollection<PointsLedger>(ledgerQuery);


  const form = useForm<PointsTransferFormValues>({
    resolver: zodResolver(pointsTransferSchema),
  });

  const { isSubmitting } = form.formState;

  const onSubmit = (values: PointsTransferFormValues) => {
    if (!firestore || !employeeProfile) return;
    
    const recipient = employees?.find(e => e.id === values.recipientId);
    if (!recipient) return;

    addDocumentNonBlocking(collection(firestore, 'pointsLedger'), {
        fromId: employeeProfile.id,
        fromName: `${employeeProfile.firstName} ${employeeProfile.lastName}`,
        toId: values.recipientId,
        toName: `${recipient.firstName} ${recipient.lastName}`,
        points: values.points,
        reason: values.reason,
        createdAt: new Date().toISOString(),
    });
    
    toast({ title: "Амжилттай", description: `${recipient.firstName}-д ${values.points} оноо амжилттай шилжүүллээ.` });
    form.reset({ recipientId: '', points: 0, reason: '' });
  };
  
  const selectableEmployees = React.useMemo(() => {
    if (!employees || !employeeProfile) return [];
    return employees.filter(e => e.id !== employeeProfile.id);
  }, [employees, employeeProfile]);
  
  const isLoading = isProfileLoading || isLoadingEmployees || isLoadingLedger;

  return (
    <div className="py-8 grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Оноо шилжүүлэх</CardTitle>
          <CardDescription>
            Хамтран ажиллагсаддаа талархлаа илэрхийлж, оноо бэлэглээрэй.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-64 w-full" /> : (
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="recipientId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Хүлээн авагч</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Ажилтан сонгох..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {selectableEmployees.map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                     <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={emp.photoURL} />
                                                            <AvatarFallback>{emp.firstName?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span>{emp.firstName} {emp.lastName}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="points"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Оноо</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Шалтгаан</FormLabel>
                                    <FormControl><Textarea placeholder="Ямар шалтгаанаар оноо өгч байгаагаа бичнэ үү..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Илгээх
                        </Button>
                    </form>
                </Form>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Онооны түүх</CardTitle>
          <CardDescription>
            Бүх онооны гүйлгээний түүх.
          </CardDescription>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Гүйлгээ</TableHead>
                        <TableHead className="text-right">Оноо</TableHead>
                        <TableHead className="text-right">Огноо</TableHead>
                        <TableHead className="text-right"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoadingLedger && Array.from({length: 4}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto"/></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto"/></TableCell>
                        </TableRow>
                    ))}
                    {ledger?.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <div className="font-medium">{item.fromName} &rarr; {item.toName}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{item.reason}</div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">+{item.points}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                    <Link href={`/dashboard/points/${item.id}`}>
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                     {!isLoadingLedger && (!ledger || ledger.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">Онооны гүйлгээний түүх байхгүй.</TableCell>
                        </TableRow>
                     )}
                </TableBody>
             </Table>
        </CardContent>
      </Card>
    </div>
  );
}
