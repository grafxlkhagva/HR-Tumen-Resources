'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar as CalendarIcon, Camera, Save, X, Loader2, Phone, Mail, AlertCircle, PlusCircle, Trash2, Facebook, Instagram } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useDoc, useFirebase, useMemoFirebase, setDocumentNonBlocking, useEmployeeProfile } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// Schemas
const generalInfoSchema = z.object({
    lastName: z.string().min(1, "Овог хоосон байж болохгүй."),
    firstName: z.string().min(1, "Нэр хоосон байж болохгүй."),
    registrationNumber: z.string().min(1, "Регистрийн дугаар хоосон байж болохгүй."),
    birthDate: z.date({ required_error: "Төрсөн огноо сонгоно уу."}).nullable(),
    gender: z.string().min(1, "Хүйс сонгоно уу."),
    idCardNumber: z.string().optional(),
    hasDisability: z.boolean().default(false).optional(),
    disabilityPercentage: z.string().optional(),
    disabilityDate: z.date().optional().nullable(),
    hasDriversLicense: z.boolean().default(false).optional(),
    driverLicenseCategories: z.array(z.string()).optional(),
});

const emergencyContactSchema = z.object({
  fullName: z.string().min(1, "Овог, нэр хоосон байж болохгүй."),
  relationship: z.string().min(1, "Таны хэн болохыг сонгоно уу."),
  phone: z.string().min(1, "Утасны дугаар хоосон байж болохгүй."),
});

const contactInfoSchema = z.object({
  workPhone: z.string().optional(),
  personalPhone: z.string().optional(),
  workEmail: z.string().email({ message: "Албан ёсны имэйл хаяг буруу байна." }).optional().or(z.literal('')),
  personalEmail: z.string().email({ message: "Хувийн имэйл хаяг буруу байна." }).optional().or(z.literal('')),
  homeAddress: z.string().optional(),
  temporaryAddress: z.string().optional(),
  facebook: z.string().url({ message: 'Facebook хаяг буруу байна.' }).optional().or(z.literal('')),
  instagram: z.string().url({ message: 'Instagram хаяг буруу байна.' }).optional().or(z.literal('')),
  emergencyContacts: z.array(emergencyContactSchema).optional(),
});

const educationSchema = z.object({
  country: z.string().min(1, "Улс сонгоно уу."),
  school: z.string().optional(),
  schoolCustom: z.string().optional(),
  degree: z.string().optional(),
  diplomaNumber: z.string().optional(),
  academicRank: z.string().optional(),
  entryDate: z.date().nullable(),
  gradDate: z.date().nullable(),
  isCurrent: z.boolean().default(false),
}).refine(data => data.school || data.schoolCustom, {
    message: "Төгссөн сургуулиа сонгох эсвэл бичнэ үү.",
    path: ["school"],
});

const educationHistorySchema = z.object({ education: z.array(educationSchema) });

const languageSchema = z.object({
    language: z.string().min(1, "Хэл сонгоно уу."),
    listening: z.string().min(1, "Түвшин сонгоно уу."),
    reading: z.string().min(1, "Түвшин сонгоно уу."),
    speaking: z.string().min(1, "Түвшин сонгоно уу."),
    writing: z.string().min(1, "Түвшин сонгоно уу."),
    testScore: z.string().optional(),
});

const languageSkillsSchema = z.object({ languages: z.array(languageSchema) });

const trainingSchema = z.object({
  name: z.string().min(1, "Сургалтын нэр хоосон байж болохгүй."),
  organization: z.string().min(1, "Байгууллагын нэр хоосон байж болохгүй."),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  certificateNumber: z.string().optional(),
});

const professionalTrainingSchema = z.object({ trainings: z.array(trainingSchema) });

const familyMemberSchema = z.object({
  relationship: z.string().min(1, "Таны хэн болохыг сонгоно уу."),
  lastName: z.string().min(1, "Овог хоосон байж болохгүй."),
  firstName: z.string().min(1, "Нэр хоосон байж болохгүй."),
  phone: z.string().optional(),
});

const familyInfoSchema = z.object({ familyMembers: z.array(familyMemberSchema) });

const workExperienceSchema = z.object({
  company: z.string().min(1, "Компанийн нэр хоосон байж болохгүй."),
  position: z.string().min(1, "Ажлын байрны нэр хоосон байж болохгүй."),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  employmentType: z.string().min(1, "Хөдөлмөрийн нөхцөл сонгоно уу."),
  description: z.string().optional(),
});

const workExperienceHistorySchema = z.object({ experiences: z.array(workExperienceSchema) });

const fullQuestionnaireSchema = generalInfoSchema
    .merge(contactInfoSchema)
    .merge(educationHistorySchema)
    .merge(languageSkillsSchema)
    .merge(professionalTrainingSchema)
    .merge(familyInfoSchema)
    .merge(workExperienceHistorySchema);

type FullQuestionnaireValues = z.infer<typeof fullQuestionnaireSchema>;

// Helper for date transformation
const transformDates = (data: any) => {
  const dateFields = ['birthDate', 'disabilityDate'];
  const arrayDateFields = ['entryDate', 'gradDate', 'startDate', 'endDate'];
  
  for (const field of dateFields) {
    if (data[field] && typeof data[field] === 'object' && 'seconds' in data[field]) {
      data[field] = data[field].toDate();
    }
  }

  ['education', 'trainings', 'experiences'].forEach(arrayKey => {
    if (data[arrayKey]) {
      data[arrayKey].forEach((item: any) => {
        for (const field of arrayDateFields) {
          if (item[field] && typeof item[field] === 'object' && 'seconds' in item[field]) {
            item[field] = item[field].toDate();
          }
        }
      });
    }
  });

  return data;
}

function PageSkeleton() {
    return (
      <div className="p-4">
        <header className="py-4 relative flex items-center justify-center">
            <Skeleton className="h-6 w-6 absolute left-0" />
            <Skeleton className="h-7 w-32" />
        </header>
        <div className="flex flex-col items-center gap-4 my-4">
            <Skeleton className="h-24 w-24 rounded-full" />
        </div>
        <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
        </div>
      </div>
    );
}

interface FormSectionProps<T extends z.ZodType<any, any>> {
    docRef: any;
    defaultValues: z.infer<T> | undefined;
    schema: T;
    children: (form: any, isSubmitting: boolean) => React.ReactNode;
}

function FormSection<T extends z.ZodType<any, any>>({ docRef, defaultValues, schema, children }: FormSectionProps<T>) {
    const { toast } = useToast();
    const form = useForm<z.infer<T>>({
        resolver: zodResolver(schema),
        defaultValues,
    });
    
    const { isSubmitting } = form.formState;

    const onSubmit = (data: z.infer<T>) => {
        if (!docRef) return;
        setDocumentNonBlocking(docRef, data, { merge: true });
        toast({ title: 'Амжилттай хадгаллаа' });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {children(form, isSubmitting)}
            </form>
        </Form>
    );
}

// Child Form Components
function GeneralInfoForm({ form, isSubmitting }: { form: any, isSubmitting: boolean }) {
    const hasDisability = form.watch("hasDisability");
    const hasDriversLicense = form.watch("hasDriversLicense");
    const driverLicenseCategoryItems = ["A", "B", "C", "D", "E", "M"];
    
    return (
        <>
            <div className="grid grid-cols-1 gap-4">
                <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Овог</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Нэр</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="registrationNumber" render={({ field }) => ( <FormItem><FormLabel>Регистрийн дугаар</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="birthDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Төрсөн огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(new Date(field.value), "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown-nav" fromYear={1960} toYear={new Date().getFullYear()} selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Хүйс</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Хүйс сонгох" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Эрэгтэй</SelectItem><SelectItem value="female">Эмэгтэй</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="idCardNumber" render={({ field }) => ( <FormItem><FormLabel>ТТД</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="hasDisability" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Хөгжлийн бэрхшээлтэй эсэх</FormLabel></FormItem> )} />
                {hasDisability && (
                    <>
                        <FormField control={form.control} name="disabilityPercentage" render={({ field }) => ( <FormItem><FormLabel>Хөдөлмөрийн чадвар алдалтын хувь (%)</FormLabel><FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="disabilityDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Хөдөлмөрийн чадвар алдсан огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(new Date(field.value), "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                    </>
                )}
                <FormField control={form.control} name="hasDriversLicense" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Жолооны үнэмлэхтэй эсэх</FormLabel></FormItem> )} />
                {hasDriversLicense && (
                        <Card className="p-4 bg-muted/50"><FormLabel>Жолооны ангилал</FormLabel><FormField control={form.control} name="driverLicenseCategories" render={() => ( <FormItem className="grid grid-cols-3 gap-4 mt-4">{driverLicenseCategoryItems.map((item) => ( <FormField key={item} control={form.control} name="driverLicenseCategories" render={({ field }) => { return ( <FormItem key={item} className="flex flex-row items-start space-x-2"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => { return checked ? form.setValue("driverLicenseCategories", [...(field.value || []), item]) : form.setValue("driverLicenseCategories", field.value?.filter((value) => value !== item)) }} /></FormControl><FormLabel className="font-normal">{item}</FormLabel></FormItem> ) }} /> ))}<FormMessage /></FormItem> )}/></Card>
                )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                Хадгалах
            </Button>
        </>
    );
}

function ContactInfoForm({ form, isSubmitting }: { form: any, isSubmitting: boolean }) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "emergencyContacts" });

    return (
        <>
            <div className="space-y-4">
                <FormField control={form.control} name="workPhone" render={({ field }) => ( <FormItem><FormLabel>Гар утас (Албан)</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="8811****" {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="personalPhone" render={({ field }) => ( <FormItem><FormLabel>Гар утас (Хувийн)</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="9911****" {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="workEmail" render={({ field }) => ( <FormItem><FormLabel>Албан ёсны и-мэйл</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="name@example.com" {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="personalEmail" render={({ field }) => ( <FormItem><FormLabel>Хувийн и-мэйл</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="personal@example.com" {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="homeAddress" render={({ field }) => ( <FormItem><FormLabel>Гэрийн хаяг (Үндсэн)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="temporaryAddress" render={({ field }) => ( <FormItem><FormLabel>Гэрийн хаяг (Түр)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            
            <Card className="bg-muted/50"><CardHeader><CardTitle className="text-base">Сошиал медиа</CardTitle></CardHeader><CardContent className="space-y-4">
                <FormField control={form.control} name="facebook" render={({ field }) => (<FormItem><FormLabel>Facebook</FormLabel><FormControl><div className="relative"><Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="instagram" render={({ field }) => (<FormItem><FormLabel>Instagram</FormLabel><FormControl><div className="relative"><Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem>)} />
            </CardContent></Card>

            <Card className="bg-muted/50"><CardHeader><CardTitle className="text-base">Яаралтай үед холбоо барих</CardTitle></CardHeader><CardContent className="space-y-4">
                    {fields.map((field, index) => (
                    <Card key={field.id} className="p-4 relative bg-background"><Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /><span className="sr-only">Устгах</span></Button><div className="space-y-4 pt-6">
                        <FormField control={form.control} name={`emergencyContacts.${index}.fullName`} render={({ field }) => ( <FormItem><FormLabel>Овог, нэр</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name={`emergencyContacts.${index}.relationship`} render={({ field }) => ( <FormItem><FormLabel>Таны хэн болох</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger></FormControl><SelectContent><SelectItem value="parent">Эцэг/Эх</SelectItem><SelectItem value="spouse">Эхнэр/Нөхөр</SelectItem><SelectItem value="sibling">Ах/Эгч/Дүү</SelectItem><SelectItem value="child">Хүүхэд</SelectItem><SelectItem value="other">Бусад</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name={`emergencyContacts.${index}.phone`} render={({ field }) => ( <FormItem><FormLabel>Утас</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input {...field} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                    </div></Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="w-full bg-background" onClick={() => append({ fullName: '', relationship: '', phone: '' })}><PlusCircle className="mr-2 h-4 w-4" />Нэмэх</Button>
            </CardContent></Card>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                Хадгалах
            </Button>
        </>
    );
}

// Placeholder forms for other sections for now
const PlaceholderForm = ({ title }: { title: string }) => (
    <div>
        <p className="text-muted-foreground text-sm">{title} оруулах форм энд харагдана.</p>
        <Button className="w-full mt-4"><Save className="mr-2 h-4 w-4" />Хадгалах</Button>
    </div>
);


export default function MobileProfileEditPage() {
    const { employeeProfile, isProfileLoading } = useEmployeeProfile();
    const { firestore } = useFirebase();

    const questionnaireDocRef = useMemoFirebase(
        () => (firestore && employeeProfile ? doc(firestore, `employees/${employeeProfile.id}/questionnaire`, 'data') : null),
        [firestore, employeeProfile]
    );

    const { data: questionnaireData, isLoading: isQuestionnaireLoading } = useDoc<FullQuestionnaireValues>(questionnaireDocRef);
    
    const defaultValues = React.useMemo(() => {
        const initialData = {
            lastName: '', firstName: '', registrationNumber: '', birthDate: null, gender: '', idCardNumber: '',
            hasDisability: false, disabilityPercentage: '', disabilityDate: null, hasDriversLicense: false, driverLicenseCategories: [],
            workPhone: '', personalPhone: '', workEmail: '', personalEmail: '', homeAddress: '', temporaryAddress: '', facebook: '', instagram: '',
            emergencyContacts: [], education: [], languages: [], trainings: [], familyMembers: [], experiences: []
        };

        if (questionnaireData) {
            return transformDates({ ...initialData, ...questionnaireData });
        }
        return initialData;
    }, [questionnaireData]);

    const isLoading = isProfileLoading || isQuestionnaireLoading;

    if (isLoading) {
        return <PageSkeleton />;
    }

    return (
        <div className="p-4">
            <header className="py-4 relative flex items-center justify-center">
                <Button asChild variant="ghost" size="icon" className="absolute left-0">
                    <Link href="/mobile/home">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Буцах</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-bold">Анкет засах</h1>
            </header>
            
            <div className="flex flex-col items-center gap-4 my-4">
                <div className="relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src="" alt="Profile picture" />
                        <AvatarFallback className="bg-muted">
                            <Camera className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                    </Avatar>
                    <Button size="icon" variant="outline" className="absolute bottom-0 right-0 h-8 w-8 rounded-full">
                        <Camera className="h-4 w-4"/>
                        <span className="sr-only">Зураг солих</span>
                    </Button>
                </div>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
                <AccordionItem value="general" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Ерөнхий мэдээлэл</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <FormSection docRef={questionnaireDocRef} defaultValues={defaultValues} schema={generalInfoSchema}>
                            {(form, isSubmitting) => <GeneralInfoForm form={form} isSubmitting={isSubmitting} />}
                        </FormSection>
                    </AccordionContent>
                </AccordionItem>
                
                 <AccordionItem value="contact" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Холбоо барих</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <FormSection docRef={questionnaireDocRef} defaultValues={defaultValues} schema={contactInfoSchema}>
                            {(form, isSubmitting) => <ContactInfoForm form={form} isSubmitting={isSubmitting} />}
                        </FormSection>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="education" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Боловсрол</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                         <PlaceholderForm title="Боловсрол" />
                    </AccordionContent>
                </AccordionItem>
                
                 <AccordionItem value="language" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Гадаад хэл</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <PlaceholderForm title="Гадаад хэлний мэдлэг" />
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="training" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Мэргэшлийн бэлтгэл</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <PlaceholderForm title="Мэргэшлийн бэлтгэл" />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="family" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Гэр бүлийн мэдээлэл</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <PlaceholderForm title="Гэр бүлийн мэдээлэл" />
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="experience" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Ажлын туршлага</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <PlaceholderForm title="Ажлын туршлага" />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}
