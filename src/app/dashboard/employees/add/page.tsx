
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
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
    useCollection,
    useMemoFirebase,
    useAuth,
    useDoc,
    createUserWithSecondaryAuth,
} from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Save, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Employee } from '../data';


const employeeSchema = z.object({
    firstName: z.string().min(1, 'Нэр хоосон байж болохгүй.'),
    lastName: z.string().min(1, 'Овог хоосон байж болохгүй.'),
    email: z.string().email('Имэйл хаяг буруу байна.'),
    phoneNumber: z.string().min(6, 'Утасны дугаар дор хаяж 6 оронтой байх ёстой.'),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

type EmployeeCodeConfig = {
    id: string;
    prefix: string;
    digitCount: number;
    nextNumber: number;
}


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

interface AddEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddEmployeeDialog({
    open,
    onOpenChange,
}: AddEmployeeDialogProps) {
    const router = useRouter();
    const { firestore } = useFirebase();
    const auth = useAuth();
    const { toast } = useToast();
    const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
    const [photoFile, setPhotoFile] = React.useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const codeConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'employeeCodeConfig') : null), [firestore]) as any;
    const { data: codeConfig } = useDoc<EmployeeCodeConfig>(codeConfigRef);


    const form = useForm<EmployeeFormValues>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
        }
    });

    const employeesCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'employees') : null),
        [firestore]
    );

    const generateEmployeeCode = async (): Promise<string> => {
        if (!firestore || !codeConfigRef || !codeConfig) {
            throw new Error("Кодчлолын тохиргоо олдсонгүй.");
        }

        const { prefix, digitCount, nextNumber } = codeConfig;
        const codeNumber = nextNumber.toString().padStart(digitCount, '0');
        const newCode = `${prefix}${codeNumber}`;

        await setDoc(codeConfigRef, { nextNumber: nextNumber + 1 }, { merge: true });

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

        setIsSubmitting(true);

        try {
            const employeeCode = await generateEmployeeCode();
            const authEmail = `${employeeCode}@example.com`;

            // Secondary Firebase App ашиглан хэрэглэгч үүсгэх
            // Энэ нь админы session-д нөлөөлөхгүй!
            const newUser = await createUserWithSecondaryAuth(authEmail, values.phoneNumber);

            if (!newUser.uid) {
                throw new Error("Хэрэглэгч үүсгэж чадсангүй.");
            }

            let photoURL = '';
            if (photoFile) {
                const storage = getStorage();
                const storageRef = ref(storage, `employee-photos/${newUser.uid}/${photoFile.name}`);
                await uploadBytes(storageRef, photoFile);
                photoURL = await getDownloadURL(storageRef);
            }

            const employeeData = {
                id: newUser.uid,
                employeeCode: employeeCode,
                role: 'employee',
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                status: 'Идэвхтэй',
                phoneNumber: values.phoneNumber,
                departmentId: '',
                positionId: '',
                hireDate: new Date().toISOString(),
                jobTitle: '',
                photoURL: photoURL,
                lifecycleStage: 'onboarding',
            };

            // Create employee document
            const employeeDocRef = doc(firestore, 'employees', newUser.uid);
            await setDoc(employeeDocRef, employeeData);

            toast({
                title: 'Амжилттай хадгаллаа',
                description: `${values.firstName} ${values.lastName} нэртэй ажилтан системд нэмэгдлээ. Код: ${employeeCode}`,
            });
            
            // Form-ийг цэвэрлэх
            form.reset();
            setPhotoPreview(null);
            setPhotoFile(null);
            onOpenChange(false);

        } catch (error: any) {
            console.error("Ажилтан нэмэхэд алдаа гарлаа: ", error);

            let errorMessage = "Ажилтан үүсгэхэд алдаа гарлаа.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Энэ имэйл хаягтай хэрэглэгч аль хэдийн бүртгэгдсэн байна.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Нууц үг хэт богино байна. 6-аас дээш тэмдэгт оруулна уу.";
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast({
                variant: "destructive",
                title: "Алдаа гарлаа",
                description: errorMessage
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)}>
                        <DialogHeader>
                            <DialogTitle>Шинэ ажилтан нэмэх</DialogTitle>
                            <DialogDescription>
                                Ажилтны үндсэн мэдээллийг бүртгэнэ үү.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="flex flex-col items-center gap-3">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={photoPreview || undefined} />
                                    <AvatarFallback className="text-lg">
                                        {form.watch('firstName')?.charAt(0) || ''}
                                        {form.watch('lastName')?.charAt(0) || ''}
                                    </AvatarFallback>
                                </Avatar>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handlePhotoSelect}
                                    className="hidden"
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Зураг
                                </Button>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Овог</FormLabel><FormControl><Input placeholder="Бат" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>Нэр</FormLabel><FormControl><Input placeholder="Дорж" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Имэйл</FormLabel><FormControl><Input type="email" placeholder="dorj@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Утас (Нууц үг болно)</FormLabel><FormControl><Input placeholder="9911-1234" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Цуцлах
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Нэмэх
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function AddEmployeePage() {
    const router = useRouter();

    const handleClose = (open: boolean) => {
        if (!open) {
            router.back();
        }
    }

    return (
        <div className="py-6 flex flex-col gap-6">
            <PageHeader
                title="Шинэ ажилтан нэмэх"
                description="Байгууллагын багт шинэ гишүүн нэмж, мэдээллийг нь бүртгэх"
                showBackButton
                backHref="/dashboard/employees"
            />

            <div className="mt-2">
                <AddEmployeeDialog
                    open={true}
                    onOpenChange={handleClose}
                />
            </div>
        </div>
    );
}
