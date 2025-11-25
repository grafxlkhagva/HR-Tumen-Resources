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
  addDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
  useAuth,
} from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Loader2, Save, X, Calendar as CalendarIcon } from 'lucide-react';
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

const employeeSchema = z.object({
  firstName: z.string().min(1, 'Нэр хоосон байж болохгүй.'),
  lastName: z.string().min(1, 'Овог хоосон байж болохгүй.'),
  email: z.string().email('Имэйл хаяг буруу байна.'),
  password: z.string().min(6, 'Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.'),
  phoneNumber: z.string().optional(),
  positionId: z.string().min(1, 'Албан тушаал сонгоно уу.'),
  departmentId: z.string().min(1, 'Хэлтэс сонгоно уу.'),
  hireDate: z.date({
    required_error: 'Ажилд орсон огноог сонгоно уу.',
  }),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

type Position = { id: string; title: string };
type Department = { id: string; name: string };

function AddEmployeeFormSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div className="space-y-2" key={i}>
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
                 <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </CardContent>
        </Card>
    )
}

export default function AddEmployeePage() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const auth = useAuth();
  const { toast } = useToast();

  const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
  const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);

  const { data: positions, isLoading: isLoadingPositions } = useCollection<Position>(positionsQuery);
  const { data: departments, isLoading: isLoadingDepartments } = useCollection<Department>(departmentsQuery);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: 'password123'
    }
  });
  
  const { isSubmitting } = form.formState;

  const employeesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'employees') : null),
    [firestore]
  );
  
  const generateEmployeeCode = async (firstName: string, lastName: string): Promise<string> => {
    if (!firestore) throw new Error("Firestore is not initialized");
    
    const firstInitial = lastName.charAt(0).toLowerCase();
    let baseCode = `${firstInitial}.${firstName.toLowerCase().replace(/\s/g, '')}`;
    let finalCode = baseCode;
    let counter = 1;

    // Check for uniqueness
    while (true) {
        const q = query(collection(firestore, 'employees'), where("employeeCode", "==", finalCode));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return finalCode;
        }
        finalCode = `${baseCode}${counter}`;
        counter++;
    }
  };


  const handleSave = async (values: EmployeeFormValues) => {
    if (!employeesCollection || !auth || !firestore) return;
    
    try {
        const employeeCode = await generateEmployeeCode(values.firstName, values.lastName);
        const authEmail = `${employeeCode}@example.com`;

        // We can't use initiateEmailSignUp because we need the user's UID immediately.
        // This part needs to be awaited.
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, values.password);
        const user = userCredential.user;

        if (!user) {
          throw new Error("Хэрэглэгч үүсгэж чадсангүй.");
        }

        const position = positions?.find(p => p.id === values.positionId);
        
        const employeeData = {
            uid: user.uid,
            employeeCode: employeeCode,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phoneNumber: values.phoneNumber,
            departmentId: values.departmentId,
            positionId: values.positionId,
            hireDate: values.hireDate.toISOString(),
            jobTitle: position?.title || 'Тодорхойгүй', // Denormalize job title
        };

        addDocumentNonBlocking(employeesCollection, employeeData);
        
        toast({
          title: 'Амжилттай хадгаллаа',
          description: `${values.firstName} ${values.lastName} нэртэй ажилтан системд нэмэгдлээ. Ажилтны код: ${employeeCode}`,
        });
        
        router.push('/dashboard/employees');

    } catch(error: any) {
        console.error("Ажилтан нэмэхэд алдаа гарлаа: ", error);
        toast({
            variant: "destructive",
            title: "Алдаа гарлаа",
            description: error.message || "Ажилтан үүсгэхэд алдаа гарлаа. Имэйл бүртгэлтэй байж магадгүй."
        });
    }

  };

  const isLoading = isLoadingPositions || isLoadingDepartments;

  if (isLoading) {
      return (
          <div className="py-8">
              <AddEmployeeFormSkeleton />
          </div>
      )
  }

  return (
    <div className="py-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <Card>
            <CardHeader>
              <CardTitle>Шинэ ажилтан нэмэх</CardTitle>
              <CardDescription>
                Ажилтны дэлгэрэнгүй мэдээллийг энд оруулна уу.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Нэр</FormLabel>
                            <FormControl>
                            <Input placeholder="Жишээ нь: Дорж" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Овог</FormLabel>
                            <FormControl>
                            <Input placeholder="Жишээ нь: Бат" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Имэйл</FormLabel>
                            <FormControl>
                            <Input type="email" placeholder="dorj.bat@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Нэвтрэх нууц үг</FormLabel>
                            <FormControl>
                            <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Утасны дугаар</FormLabel>
                            <FormControl>
                            <Input placeholder="+976 9911..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="departmentId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Хэлтэс</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Харьяалагдах хэлтсийг сонгоно уу" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {departments?.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
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
                        name="positionId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Албан тушаал</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Албан тушаалыг сонгоно уу" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {positions?.map((pos) => (
                                    <SelectItem key={pos.id} value={pos.id}>
                                    {pos.title}
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
                        name="hireDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Ажилд орсон огноо</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "yyyy-MM-dd")
                                    ) : (
                                        <span>Огноо сонгох</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                     />

                </div>
                <div className="flex items-center gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Хадгалах
                    </Button>
                    <Button variant="outline" type="button" onClick={() => router.push('/dashboard/employees')} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" />
                        Цуцлах
                    </Button>
                </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
