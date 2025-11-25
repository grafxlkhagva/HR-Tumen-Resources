'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
import {
  useFirebase,
  updateDocumentNonBlocking,
  useCollection,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2, Save, X, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { type Employee } from '../../data';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';


const editEmployeeSchema = z.object({
  firstName: z.string().min(1, 'Нэр хоосон байж болохгүй.'),
  lastName: z.string().min(1, 'Овог хоосон байж болохгүй.'),
  email: z.string().email('Имэйл хаяг буруу байна.'),
  phoneNumber: z.string().optional(),
  positionId: z.string().min(1, 'Албан тушаал сонгоно уу.'),
  departmentId: z.string().min(1, 'Хэлтэс сонгоно уу.'),
  hireDate: z.date({
    required_error: 'Ажилд орсон огноог сонгоно уу.',
  }),
  avatarId: z.string().optional(),
});

type EditEmployeeFormValues = z.infer<typeof editEmployeeSchema>;

type Position = { id: string; title: string };
type Department = { id: string; name: string };

function EditEmployeeFormSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div className="space-y-2" key={i}>
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
                 <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                         {Array.from({ length: 8 }).map((_, i) => (
                             <Skeleton key={i} className="h-16 w-16 rounded-full" />
                         ))}
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </CardContent>
        </Card>
    )
}

function EditEmployeeForm({ employeeData }: { employeeData: Employee }) {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);

    const { data: positions, isLoading: isLoadingPositions } = useCollection<Position>(positionsQuery);
    const { data: departments, isLoading: isLoadingDepartments } = useCollection<Department>(departmentsQuery);

    const form = useForm<EditEmployeeFormValues>({
        resolver: zodResolver(editEmployeeSchema),
        defaultValues: {
            ...employeeData,
            hireDate: employeeData.hireDate ? new Date(employeeData.hireDate) : new Date(),
        },
    });

    const { isSubmitting } = form.formState;

    const employeeDocRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'employees', employeeData.id) : null),
        [firestore, employeeData.id]
    );

    const handleSave = (values: EditEmployeeFormValues) => {
        if (!employeeDocRef || !firestore) return;

        const position = positions?.find(p => p.id === values.positionId);

        const updatedData = {
            ...values,
            hireDate: values.hireDate.toISOString(),
            jobTitle: position?.title || 'Тодорхойгүй',
        };

        updateDocumentNonBlocking(employeeDocRef, updatedData);

        toast({
          title: 'Амжилттай хадгаллаа',
          description: `${values.firstName} ${values.lastName}-н мэдээлэл шинэчлэгдлээ.`,
        });
        
        router.push(`/dashboard/employees/${employeeData.id}`);
    };

    const isLoading = isLoadingPositions || isLoadingDepartments;

    if (isLoading) {
        return <EditEmployeeFormSkeleton />;
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)}>
            <Card>
                <CardHeader>
                <CardTitle>Ажилтны мэдээлэл засах</CardTitle>
                <CardDescription>
                    Ажилтны дэлгэрэнгүй мэдээллийг эндээс шинэчилнэ үү.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Нэр</FormLabel><FormControl><Input placeholder="Жишээ нь: Дорж" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Овог</FormLabel><FormControl><Input placeholder="Жишээ нь: Бат" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Имэйл</FormLabel><FormControl><Input type="email" placeholder="dorj.bat@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="phoneNumber" render={({ field }) => ( <FormItem><FormLabel>Утасны дугаар</FormLabel><FormControl><Input placeholder="+976 9911..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="departmentId" render={({ field }) => ( <FormItem><FormLabel>Хэлтэс</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Харьяалагдах хэлтсийг сонгоно уу" /></SelectTrigger></FormControl><SelectContent>{departments?.map((dept) => (<SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="positionId" render={({ field }) => ( <FormItem><FormLabel>Албан тушаал</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Албан тушаалыг сонгоно уу" /></SelectTrigger></FormControl><SelectContent>{positions?.map((pos) => (<SelectItem key={pos.id} value={pos.id}>{pos.title}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="hireDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Ажилд орсон огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    </div>

                     <FormField
                        control={form.control}
                        name="avatarId"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel>Профайл зураг</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4"
                                >
                                {PlaceHolderImages.map((img) => (
                                    <FormItem key={img.id} className="relative flex items-center justify-center">
                                        <FormControl>
                                            <RadioGroupItem value={img.id} className="sr-only" />
                                        </FormControl>
                                        <FormLabel className="cursor-pointer">
                                            <Avatar className={cn(
                                                "h-16 w-16 border-2 border-transparent transition-all",
                                                field.value === img.id && "border-primary ring-2 ring-primary"
                                            )}>
                                                <AvatarImage src={img.imageUrl} alt={img.description} data-ai-hint={img.imageHint} />
                                                <AvatarFallback>{img.id}</AvatarFallback>
                                            </Avatar>
                                        </FormLabel>
                                    </FormItem>
                                ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                    <div className="flex items-center gap-2">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Хадгалах
                        </Button>
                        <Button variant="outline" type="button" onClick={() => router.push(`/dashboard/employees/${employeeData.id}`)} disabled={isSubmitting}>
                            <X className="mr-2 h-4 w-4" />
                            Цуцлах
                        </Button>
                    </div>
                </CardContent>
            </Card>
            </form>
        </Form>
    );
}

export default function EditEmployeePage() {
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { firestore } = useFirebase();

    const employeeDocRef = useMemoFirebase(
        () => (firestore && employeeId ? doc(firestore, 'employees', employeeId) : null),
        [firestore, employeeId]
    );

    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef);

    if (isLoadingEmployee) {
        return (
            <div className="py-8">
                <EditEmployeeFormSkeleton />
            </div>
        )
    }

    if (!employee) {
        return (
             <div className="py-8 text-center">
                <p>Ажилтан олдсонгүй.</p>
                <Button asChild variant="link">
                    <Link href="/dashboard/employees">Жагсаалт руу буцах</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="py-8">
            <div className="mb-4 flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href={`/dashboard/employees/${employeeId}`}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Буцах</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold tracking-tight">Мэдээлэл засах</h1>
            </div>
            <EditEmployeeForm employeeData={employee} />
        </div>
    )
}
