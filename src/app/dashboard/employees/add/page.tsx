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
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
  useAuth,
  useDoc,
} from '@/firebase';
import { collection, getDocs, query, where, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Save, X, Calendar as CalendarIcon, Upload } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const employeeSchema = z.object({
  firstName: z.string().min(1, 'Нэр хоосон байж болохгүй.'),
  lastName: z.string().min(1, 'Овог хоосон байж болохгүй.'),
  email: z.string().email('Имэйл хаяг буруу байна.'),
  phoneNumber: z.string().min(6, 'Утасны дугаар дор хаяж 6 оронтой байх ёстой.'),
  positionId: z.string().min(1, 'Албан тушаал сонгоно уу.'),
  departmentId: z.string().min(1, 'Хэлтэс сонгоно уу.'),
  workScheduleId: z.string().min(1, 'Ажлын цагийн хуваарь сонгоно уу.'),
  status: z.string().min(1, 'Төлөв сонгоно уу.'),
  hireDate: z.date({
    required_error: 'Ажилд орсон огноог сонгоно уу.',
  }),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

type Position = { id: string; title: string; departmentId: string; };
type Department = { id: string; name: string };
type WorkSchedule = { id: string; name: string };
type EmployeeCodeConfig = {
    id: string;
    prefix: string;
    digitCount: number;
    nextNumber: number;
}
const employeeStatuses = ["Идэвхтэй", "Жирэмсний амралттай", "Хүүхэд асрах чөлөөтэй", "Урт хугацааны чөлөөтэй", "Ажлаас гарсан"];


function AddEmployeeFormSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 9 }).map((_, i) => (
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
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  const positionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'positions') : null), [firestore]);
  const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
  const workSchedulesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'workSchedules') : null), [firestore]);
  const codeConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'employeeCodeConfig') : null), [firestore]);


  const { data: positions, isLoading: isLoadingPositions } = useCollection<Position>(positionsQuery);
  const { data: departments, isLoading: isLoadingDepartments } = useCollection<Department>(departmentsQuery);
  const { data: workSchedules, isLoading: isLoadingSchedules } = useCollection<WorkSchedule>(workSchedulesQuery);
  const { data: codeConfig, isLoading: isLoadingCodeConfig } = useDoc<EmployeeCodeConfig>(codeConfigRef);


  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      status: 'Идэвхтэй',
    }
  });
  
  const { isSubmitting } = form.formState;

  const employeesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'employees') : null),
    [firestore]
  );
  
  const watchedDepartmentId = form.watch('departmentId');
  const filteredPositions = React.useMemo(() => {
    if (!positions) return [];
    if (!watchedDepartmentId) return [];
    return positions.filter(pos => pos.departmentId === watchedDepartmentId);
  }, [positions, watchedDepartmentId]);

  React.useEffect(() => {
    form.resetField('positionId');
  }, [watchedDepartmentId, form]);

  const generateEmployeeCode = async (): Promise<string> => {
    if (!firestore || !codeConfigRef || !codeConfig) {
      throw new Error("Кодчлолын тохиргоо олдсонгүй.");
    }
  
    const { prefix, digitCount, nextNumber } = codeConfig;
    const codeNumber = nextNumber.toString().padStart(digitCount, '0');
    const newCode = `${prefix}${codeNumber}`;
  
    // Increment the number for the next user
    updateDocumentNonBlocking(codeConfigRef, { nextNumber: nextNumber + 1 });
  
    return newCode;
  };
  
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };


  const handleSave = async (values: EmployeeFormValues) => {
    if (!employeesCollection || !auth || !firestore) return;
    
    const originalUser = auth.currentUser;
    if (!originalUser) {
        toast({ variant: "destructive", title: "Алдаа", description: "Админ хэрэглэгч нэвтрээгүй байна." });
        return;
    }

    setIsUploading(true);
    try {
        const { createUserWithEmailAndPassword, signOut: firebaseSignOut, signInWithCredential, EmailAuthProvider } = await import('firebase/auth');
        
        const employeeCode = await generateEmployeeCode();
        const authEmail = `${employeeCode}@example.com`;

        // Create the new user. This will sign in the new user and sign out the admin.
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, values.phoneNumber);
        const newUser = userCredential.user;

        if (!newUser) {
          throw new Error("Хэрэглэгч үүсгэж чадсангүй.");
        }

        let photoURL = '';
        if (photoFile) {
            const storage = getStorage();
            const storageRef = ref(storage, `employee-photos/${newUser.uid}/${photoFile.name}`);
            await uploadBytes(storageRef, photoFile);
            photoURL = await getDownloadURL(storageRef);
        }

        const position = positions?.find(p => p.id === values.positionId);
        
        const employeeData = {
            id: newUser.uid,
            employeeCode: employeeCode,
            role: 'employee',
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            status: values.status,
            phoneNumber: values.phoneNumber,
            departmentId: values.departmentId,
            positionId: values.positionId,
            workScheduleId: values.workScheduleId,
            hireDate: values.hireDate.toISOString(),
            jobTitle: position?.title || 'Тодорхойгүй', // Denormalize job title
            photoURL: photoURL,
        };
        
        const docRef = doc(firestore, 'employees', newUser.uid);
        await setDocumentNonBlocking(docRef, employeeData, { merge: true });
        
        // Sign out the newly created user and redirect. The admin will have to log back in.
        await firebaseSignOut(auth);

        toast({
          title: 'Амжилттай хадгаллаа',
          description: `${values.firstName} ${values.lastName} нэртэй ажилтан системд нэмэгдлээ.`,
        });
        
        // Redirect to login page as admin is now signed out.
        router.push('/login');

    } catch(error: any) {
        console.error("Ажилтан нэмэхэд алдаа гарлаа: ", error);
        
        toast({
            variant: "destructive",
            title: "Алдаа гарлаа",
            description: error.message || "Ажилтан үүсгэхэд алдаа гарлаа."
        });
        
        // Attempt to sign the admin back in if something went wrong
        if (auth.currentUser?.uid !== originalUser.uid) {
            try {
                // This is a basic re-sign-in attempt; might not always work depending on auth state.
                // A more robust solution might involve storing credentials securely or using custom tokens.
                await auth.updateCurrentUser(originalUser);
            } catch (reauthError) {
                 console.error("Админыг буцаан нэвтрүүлэхэд ноцтой алдаа гарлаа: ", reauthError);
                 router.push('/login'); // Force logout if re-auth fails
            }
        }
    } finally {
        setIsUploading(false);
    }
  };

  const isLoading = isLoadingPositions || isLoadingDepartments || isLoadingCodeConfig || isLoadingSchedules;

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
                Та ажилтны ерөнхий мэдээллийг бүртгэж, системд нэвтрэх эрхийг олгоно.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 flex flex-col items-center gap-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={photoPreview || undefined} />
                            <AvatarFallback>
                                {form.getValues('firstName')?.charAt(0)}
                                {form.getValues('lastName')?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <input 
                            type="file" 
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handlePhotoSelect}
                            className="hidden"
                        />
                        <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Зураг хуулах
                        </Button>
                    </div>
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
                        name="phoneNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Утасны дугаар (Нууц үг болно)</FormLabel>
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
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger disabled={!watchedDepartmentId}>
                                    <SelectValue placeholder={!watchedDepartmentId ? "Эхлээд хэлтэс сонгоно уу" : "Албан тушаалыг сонгоно уу"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {filteredPositions.map((pos) => (
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
                        name="workScheduleId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ажлын цагийн хуваарь</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Ажлын хуваарь сонгоно уу" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {workSchedules?.map((schedule) => (
                                    <SelectItem key={schedule.id} value={schedule.id}>
                                    {schedule.name}
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
                    <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Ажилтны төлөв</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Ажилтны төлөвийг сонгоно уу" /></SelectTrigger></FormControl><SelectContent>{employeeStatuses.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />

                </div>

                <div className="flex items-center gap-2">
                    <Button type="submit" disabled={isSubmitting || isUploading}>
                        {isSubmitting || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Хадгалах
                    </Button>
                    <Button variant="outline" type="button" onClick={() => router.push('/dashboard/employees')} disabled={isSubmitting || isUploading}>
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

    