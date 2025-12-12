'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useCollection, useDoc, useFirebase, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { type Employee } from '../../../data';


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
type ReferenceItem = { id: string; name: string };


// Helper for date transformation
const transformDates = (data: any) => {
  if (!data) return data;
  const transformedData = { ...data };
  const dateFields = ['birthDate', 'disabilityDate'];
  const arrayDateFields = ['entryDate', 'gradDate', 'startDate', 'endDate'];
  
  for (const field of dateFields) {
    if (transformedData[field] && typeof transformedData[field] === 'object' && 'seconds' in transformedData[field]) {
      transformedData[field] = transformedData[field].toDate();
    }
  }

  ['education', 'trainings', 'experiences'].forEach(arrayKey => {
    if (transformedData[arrayKey]) {
      transformedData[arrayKey] = transformedData[arrayKey].map((item: any) => {
        const newItem = { ...item };
        for (const field of arrayDateFields) {
          if (newItem[field] && typeof newItem[field] === 'object' && 'seconds' in newItem[field]) {
            newItem[field] = newItem[field].toDate();
          }
        }
        return newItem;
      });
    }
  });

  return transformedData;
}


function FormSkeleton() {
    return <Skeleton className="h-[500px] w-full" />;
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
    
    React.useEffect(() => {
        if(defaultValues) {
            form.reset(defaultValues);
        }
    }, [defaultValues, form]);

    const { isSubmitting } = form.formState;

    const onSubmit = (data: z.infer<T>) => {
        if (!docRef) return;
        setDocumentNonBlocking(docRef, data, { merge: true });
        toast({ title: 'Амжилттай хадгаллаа' });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
        <Card>
            <CardHeader className="items-center">
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
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Овог</FormLabel><FormControl><Input placeholder="Ажилтны овог" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Нэр</FormLabel><FormControl><Input placeholder="Ажилтны бүтэн нэр" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="registrationNumber" render={({ field }) => ( <FormItem><FormLabel>Регистрийн дугаар</FormLabel><FormControl><Input placeholder="АА00112233" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="birthDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Төрсөн огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(new Date(field.value), "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown-nav" fromYear={1960} toYear={new Date().getFullYear()} selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Хүйс</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Хүйс сонгох" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Эрэгтэй</SelectItem><SelectItem value="female">Эмэгтэй</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="idCardNumber" render={({ field }) => ( <FormItem><FormLabel>ТТД</FormLabel><FormControl><Input placeholder="ТТД дугаар" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="hasDisability" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Хөгжлийн бэрхшээлтэй эсэх</FormLabel></div></FormItem> )} />
                    <FormField control={form.control} name="hasDriversLicense" render={({ field }) => ( <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Жолооны үнэмлэхтэй эсэх</FormLabel></div></FormItem> )} />
                    {hasDisability && ( <> <FormField control={form.control} name="disabilityPercentage" render={({ field }) => ( <FormItem><FormLabel>Хөдөлмөрийн чадвар алдалтын хувь (%)</FormLabel><FormControl><Input type="number" placeholder="Хувь..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /> <FormField control={form.control} name="disabilityDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Хөдөлмөрийн чадвар алдсан огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(new Date(field.value), "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown-nav" fromYear={1980} toYear={new Date().getFullYear()} selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} /> </> )}
                </div>
                {hasDriversLicense && ( <Card className="p-4"><FormLabel>Жолооны ангилал</FormLabel><FormField control={form.control} name="driverLicenseCategories" render={() => ( <FormItem className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">{driverLicenseCategoryItems.map((item) => ( <FormField key={item} control={form.control} name="driverLicenseCategories" render={({ field }) => { return ( <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => { return checked ? form.setValue("driverLicenseCategories", [...(field.value || []), item]) : form.setValue("driverLicenseCategories", field.value?.filter((value) => value !== item)) }} /></FormControl><FormLabel className="font-normal">{item}</FormLabel></FormItem> ) }} /> ))}<FormMessage /></FormItem> )}/></Card> )}
            </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => form.reset()}><X className="mr-2 h-4 w-4" />Цуцлах</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}Хадгалах</Button>
        </div>
        </>
    );
}

function ContactInfoForm({ form, isSubmitting, references }: { form: any, isSubmitting: boolean, references: any }) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "emergencyContacts" });

    return (
        <>
            <Card>
                <CardHeader><CardTitle>Үндсэн мэдээлэл</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="workPhone" render={({ field }) => ( <FormItem><FormLabel>Гар утас (Албан)</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="8811****" {...field} value={field.value || ''} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="personalPhone" render={({ field }) => ( <FormItem><FormLabel>Гар утас (Хувийн)</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="9911****" {...field} value={field.value || ''} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="workEmail" render={({ field }) => ( <FormItem><FormLabel>Албан ёсны и-мэйл</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="name@example.com" {...field} value={field.value || ''} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="personalEmail" render={({ field }) => ( <FormItem><FormLabel>Хувийн и-мэйл</FormLabel><FormControl><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="personal@example.com" {...field} value={field.value || ''} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="homeAddress" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Гэрийн хаяг (Үндсэн)</FormLabel><FormControl><Textarea placeholder="Сүхбаатар дүүрэг, 8-р хороо..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="temporaryAddress" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Гэрийн хаяг (Түр)</FormLabel><FormControl><Textarea placeholder="Түр оршин суугаа хаяг..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Сошиал медиа</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="facebook" render={({ field }) => ( <FormItem><FormLabel>Facebook</FormLabel><FormControl><div className="relative"><Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="https://facebook.com/username" {...field} value={field.value || ''} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="instagram" render={({ field }) => ( <FormItem><FormLabel>Instagram</FormLabel><FormControl><div className="relative"><Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="https://instagram.com/username" {...field} value={field.value || ''} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Яаралтай үед холбоо барих</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {fields.map((field, index) => ( <Card key={field.id} className="p-4 relative"><Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /><span className="sr-only">Устгах</span></Button><CardContent className="space-y-4 pt-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={form.control} name={`emergencyContacts.${index}.fullName`} render={({ field }) => ( <FormItem><FormLabel>Овог, нэр</FormLabel><FormControl><Input placeholder="Яаралтай үед холбоо барих хүний нэр" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} /><FormField control={form.control} name={`emergencyContacts.${index}.relationship`} render={({ field }) => ( <FormItem><FormLabel>Таны хэн болох</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger></FormControl><SelectContent>{references.emergencyRelationships?.map((item: ReferenceItem) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} /></div><FormField control={form.control} name={`emergencyContacts.${index}.phone`} render={({ field }) => ( <FormItem><FormLabel>Утас</FormLabel><FormControl><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="9911****" {...field} value={field.value || ''} className="pl-10" /></div></FormControl><FormMessage /></FormItem> )} /></CardContent></Card> ))}
                    <Button type="button" variant="outline" onClick={() => append({ fullName: '', relationship: '', phone: '' })}><PlusCircle className="mr-2 h-4 w-4" />Яаралтай үед холбоо барих хүн нэмэх</Button>
                </CardContent>
            </Card>
            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => form.reset()}><X className="mr-2 h-4 w-4" />Цуцлах</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}Хадгалах</Button>
            </div>
        </>
    );
}

function EducationForm({ form, isSubmitting, references }: { form: any, isSubmitting: boolean, references: any }) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "education" });
    const { firestore } = useFirebase();
    const [isAddSchoolOpen, setIsAddSchoolOpen] = React.useState(false);
    const [newSchoolName, setNewSchoolName] = React.useState('');
    const [isAddDegreeOpen, setIsAddDegreeOpen] = React.useState(false);
    const [newDegreeName, setNewDegreeName] = React.useState('');
    const [currentFieldIndex, setCurrentFieldIndex] = React.useState<number | null>(null);

    const schoolsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireSchools') : null, [firestore]);
    const degreesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireDegrees') : null, [firestore]);

    const handleAddSchool = async () => {
        if (!schoolsCollection || !newSchoolName.trim() || currentFieldIndex === null) return;
        
        try {
            const newDoc = await addDocumentNonBlocking(schoolsCollection, { name: newSchoolName.trim() });
            if (newDoc) {
                form.setValue(`education.${currentFieldIndex}.school`, newSchoolName.trim());
            }
        } catch (e) {
            console.error("Error adding new school: ", e);
        } finally {
            setNewSchoolName('');
            setIsAddSchoolOpen(false);
            setCurrentFieldIndex(null);
        }
    };
    
    const handleAddDegree = async () => {
        if (!degreesCollection || !newDegreeName.trim() || currentFieldIndex === null) return;
        
        try {
            const newDoc = await addDocumentNonBlocking(degreesCollection, { name: newDegreeName.trim() });
            if (newDoc) {
                form.setValue(`education.${currentFieldIndex}.degree`, newDegreeName.trim());
            }
        } catch (e) {
            console.error("Error adding new degree: ", e);
        } finally {
            setNewDegreeName('');
            setIsAddDegreeOpen(false);
            setCurrentFieldIndex(null);
        }
    };


    return (
        <>
            <Dialog open={isAddSchoolOpen} onOpenChange={setIsAddSchoolOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Шинэ сургууль нэмэх</DialogTitle>
                        <DialogDescription>
                            Жагсаалтад байхгүй сургуулийн нэрийг энд нэмнэ үү.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input 
                            placeholder="Сургуулийн нэр" 
                            value={newSchoolName} 
                            onChange={(e) => setNewSchoolName(e.target.value)} 
                        />
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setIsAddSchoolOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleAddSchool}>Хадгалах</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isAddDegreeOpen} onOpenChange={setIsAddDegreeOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Шинэ мэргэжил нэмэх</DialogTitle>
                        <DialogDescription>
                            Жагсаалтад байхгүй мэргэжлийн нэрийг энд нэмнэ үү.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input 
                            placeholder="Мэргэжлийн нэр" 
                            value={newDegreeName} 
                            onChange={(e) => setNewDegreeName(e.target.value)} 
                        />
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setIsAddDegreeOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleAddDegree}>Хадгалах</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Анхаар</AlertTitle><AlertDescription>Ерөнхий боловсролын сургуулиас эхлэн төгссөн дарааллын дагуу бичнэ үү.</AlertDescription></Alert>
            <div className="space-y-6">
                {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                        <CardContent className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`education.${index}.country`} render={({ field }) => ( <FormItem><FormLabel>Хаана</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Улс сонгох" /></SelectTrigger></FormControl><SelectContent>{references.countries?.map((item: ReferenceItem) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`education.${index}.school`} render={({ field }) => ( <FormItem><FormLabel>Төгссөн сургууль</FormLabel><Select onValueChange={(value) => { if(value === '__add_new__') { setCurrentFieldIndex(index); setIsAddSchoolOpen(true); } else { field.onChange(value) } }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сургууль сонгох" /></SelectTrigger></FormControl><SelectContent>{references.schools?.map((item: ReferenceItem, index: number) => <SelectItem key={`${item.id}-${index}`} value={item.name}>{item.name}</SelectItem>)}<SelectItem value="__add_new__" className="font-bold text-primary">Шинээр нэмэх...</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`education.${index}.entryDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Элссэн огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Огноо сонгох</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown-nav" fromYear={1980} toYear={new Date().getFullYear()} selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`education.${index}.gradDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Төгссөн огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} disabled={form.watch(`education.${index}.isCurrent`)} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Огноо сонгох</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown-nav" fromYear={1980} toYear={new Date().getFullYear()} selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                            </div>
                            <FormField control={form.control} name={`education.${index}.isCurrent`} render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="text-sm font-normal">Одоо сурч байгаа</FormLabel></FormItem> )} />
                            <FormField control={form.control} name={`education.${index}.degree`} render={({ field }) => ( <FormItem><FormLabel>Эзэмшсэн мэргэжил</FormLabel><Select onValueChange={(value) => { if(value === '__add_new__') { setCurrentFieldIndex(index); setIsAddDegreeOpen(true); } else { field.onChange(value) } }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Мэргэжил сонгох" /></SelectTrigger></FormControl><SelectContent>{references.degrees?.map((item: ReferenceItem) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}<SelectItem value="__add_new__" className="font-bold text-primary">Шинээр нэмэх...</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name={`education.${index}.diplomaNumber`} render={({ field }) => ( <FormItem><FormLabel>Диплом, үнэмлэхний дугаар</FormLabel><FormControl><Input placeholder="Дипломын дугаарыг оруулна уу" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name={`education.${index}.academicRank`} render={({ field }) => ( <FormItem><FormLabel>Зэрэг, цол</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Зэрэг, цол сонгох" /></SelectTrigger></FormControl><SelectContent>{references.academicRanks?.map((item: ReferenceItem) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            {fields.length > 1 && ( <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}><Trash2 className="mr-2 h-4 w-4" />Устгах</Button> )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Button type="button" variant="outline" onClick={() => append({ country: '', school: '', degree: '', diplomaNumber: '', academicRank: '', entryDate: null, gradDate: null, isCurrent: false })}><PlusCircle className="mr-2 h-4 w-4" />Боловсрол нэмэх</Button>
            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => form.reset()}><X className="mr-2 h-4 w-4" />Цуцлах</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}Хадгалах</Button>
            </div>
        </>
    );
}

function LanguageForm({ form, isSubmitting, references }: { form: any, isSubmitting: boolean, references: any }) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "languages" });
    const proficiencyLevels = ['Анхан', 'Дунд', 'Ахисан', 'Мэргэжлийн'];

    return (
        <>
            <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Түвшин оруулах</AlertTitle><AlertDescription>*Олон улсад хүлээн зөвшөөрөгдөх түвшин тогтоох шалгалтын оноог оруулна уу.</AlertDescription></Alert>
            <div className="space-y-6">
                {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                        <CardContent className="space-y-4 pt-4">
                            <FormField control={form.control} name={`languages.${index}.language`} render={({ field }) => ( <FormItem><FormLabel>Гадаад хэл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Хэл сонгох" /></SelectTrigger></FormControl><SelectContent>{references.languages?.map((lang: ReferenceItem) => ( <SelectItem key={lang.id} value={lang.name}>{lang.name}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )} />
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`languages.${index}.listening`} render={({ field }) => ( <FormItem><FormLabel>Сонсох</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Түвшин" /></SelectTrigger></FormControl><SelectContent>{proficiencyLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`languages.${index}.reading`} render={({ field }) => ( <FormItem><FormLabel>Унших</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Түвшин" /></SelectTrigger></FormControl><SelectContent>{proficiencyLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`languages.${index}.speaking`} render={({ field }) => ( <FormItem><FormLabel>Ярих</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Түвшин" /></SelectTrigger></FormControl><SelectContent>{proficiencyLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`languages.${index}.writing`} render={({ field }) => ( <FormItem><FormLabel>Бичих</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Түвшин" /></SelectTrigger></FormControl><SelectContent>{proficiencyLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            </div>
                            <FormField control={form.control} name={`languages.${index}.testScore`} render={({ field }) => ( <FormItem><FormLabel>Шалгалтын оноо</FormLabel><FormControl><Input placeholder="TOEFL-ийн оноо..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                            {fields.length > 1 && ( <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}><Trash2 className="mr-2 h-4 w-4" />Устгах</Button> )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Button type="button" variant="outline" onClick={() => append({ language: '', listening: '', reading: '', speaking: '', writing: '', testScore: '' })}><PlusCircle className="mr-2 h-4 w-4" />Хэл нэмэх</Button>
            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => form.reset()}><X className="mr-2 h-4 w-4" />Цуцлах</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}Хадгалах</Button>
            </div>
        </>
    );
}

function TrainingForm({ form, isSubmitting }: { form: any, isSubmitting: boolean }) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "trainings" });

    return (
        <>
            <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Анхаар</AlertTitle><AlertDescription>Мэргэжлээрээ болон бусад төрлөөр 1 сараас дээш хугацаагаар хамрагдаж байсан сургалт.</AlertDescription></Alert>
            <div className="space-y-6">
                {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                        <CardContent className="space-y-4 pt-4">
                            <FormField control={form.control} name={`trainings.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Сургалтын нэр</FormLabel><FormControl><Input placeholder="Сургалтын нэрийг оруулна уу" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name={`trainings.${index}.organization`} render={({ field }) => ( <FormItem><FormLabel>Сургалт явуулсан байгууллага</FormLabel><FormControl><Input placeholder="Байгууллагын нэрийг оруулна уу" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`trainings.${index}.startDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Эхэлсэн огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Огноо сонгох</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown-nav" fromYear={1980} toYear={new Date().getFullYear()} selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`trainings.${index}.endDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Дууссан огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Огноо сонгох</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown-nav" fromYear={1980} toYear={new Date().getFullYear()} selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                            </div>
                            <FormField control={form.control} name={`trainings.${index}.certificateNumber`} render={({ field }) => ( <FormItem><FormLabel>Үнэмлэх, сертификатын дугаар</FormLabel><FormControl><Input placeholder="Дугаарыг оруулна уу" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                            {fields.length > 1 && ( <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}><Trash2 className="mr-2 h-4 w-4" />Устгах</Button> )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Button type="button" variant="outline" onClick={() => append({ name: '', organization: '', startDate: null, endDate: null, certificateNumber: '' })}><PlusCircle className="mr-2 h-4 w-4" />Мэргэшлийн бэлтгэл нэмэх</Button>
            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => form.reset()}><X className="mr-2 h-4 w-4" />Цуцлах</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}Хадгалах</Button>
            </div>
        </>
    );
}

function FamilyInfoForm({ form, isSubmitting, references }: { form: any, isSubmitting: boolean, references: any }) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "familyMembers" });
    
    return (
        <>
            <div className="space-y-6">
                {fields.map((field, index) => (
                    <Card key={field.id} className="relative p-4">
                        <CardContent className="space-y-4 pt-6">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /><span className="sr-only">Устгах</span></Button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`familyMembers.${index}.relationship`} render={({ field }) => ( <FormItem><FormLabel>Таны хэн болох</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger></FormControl><SelectContent>{references.familyRelationships?.map((opt: ReferenceItem) => <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`familyMembers.${index}.lastName`} render={({ field }) => ( <FormItem><FormLabel>Овог</FormLabel><FormControl><Input placeholder="Овог" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`familyMembers.${index}.firstName`} render={({ field }) => ( <FormItem><FormLabel>Нэр</FormLabel><FormControl><Input placeholder="Нэр" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`familyMembers.${index}.phone`} render={({ field }) => ( <FormItem><FormLabel>Холбоо барих утас</FormLabel><FormControl><Input placeholder="Утасны дугаар" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Button type="button" variant="outline" onClick={() => append({ relationship: '', lastName: '', firstName: '', phone: '' })}><PlusCircle className="mr-2 h-4 w-4" />Гэр бүлийн гишүүн нэмэх</Button>
            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => form.reset()}><X className="mr-2 h-4 w-4" />Цуцлах</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}Хадгалах</Button>
            </div>
        </>
    );
}

function WorkExperienceForm({ form, isSubmitting, references }: { form: any, isSubmitting: boolean, references: any }) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: "experiences" });

    return (
        <>
            <div className="space-y-6">
                {fields.map((field, index) => (
                    <Card key={field.id} className="relative p-4">
                        <CardContent className="space-y-4 pt-6">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /><span className="sr-only">Устгах</span></Button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`experiences.${index}.company`} render={({ field }) => ( <FormItem><FormLabel>Компани</FormLabel><FormControl><Input placeholder="Ажиллаж байсан компани" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`experiences.${index}.position`} render={({ field }) => ( <FormItem><FormLabel>Ажлын байр</FormLabel><FormControl><Input placeholder="Албан тушаал" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`experiences.${index}.startDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Эхэлсэн огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Огноо сонгох</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown-nav" fromYear={1980} toYear={new Date().getFullYear()} selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`experiences.${index}.endDate`} render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Дууссан огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Огноо сонгох</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" captionLayout="dropdown-nav" fromYear={1980} toYear={new Date().getFullYear()} selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`experiences.${index}.employmentType`} render={({ field }) => ( <FormItem><FormLabel>Хөдөлмөрийн нөхцөл</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Нөхцөл сонгох" /></SelectTrigger></FormControl><SelectContent>{references.employmentTypes?.map((item: ReferenceItem) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            </div>
                            <FormField control={form.control} name={`experiences.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Ажлын тодорхойлолт</FormLabel><FormControl><Textarea placeholder="Гүйцэтгэсэн үүрэг, хариуцлагын талаар товч бичнэ үү..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Button type="button" variant="outline" onClick={() => append({ company: '', position: '', startDate: null, endDate: null, employmentType: '', description: '' })}><PlusCircle className="mr-2 h-4 w-4" />Ажлын туршлага нэмэх</Button>
            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => form.reset()}><X className="mr-2 h-4 w-4" />Цуцлах</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}Хадгалах</Button>
            </div>
        </>
    );
}

export default function QuestionnairePage() {
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { firestore } = useFirebase();

    const employeeDocRef = useMemoFirebase(
        () => (firestore && employeeId ? doc(firestore, 'employees', employeeId) : null),
        [firestore, employeeId]
    );

    const questionnaireDocRef = useMemoFirebase(
        () => (firestore && employeeId ? doc(firestore, `employees/${employeeId}/questionnaire`, 'data') : null),
        [firestore, employeeId]
    );

    const { data: employeeData, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef);
    const { data: questionnaireData, isLoading: isLoadingQuestionnaire } = useDoc<FullQuestionnaireValues>(questionnaireDocRef);

    // Questionnaire references
    const { data: countries, isLoading: isLoadingCountries } = useCollection<ReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireCountries') : null, [firestore]));
    const { data: schools, isLoading: isLoadingSchools } = useCollection<ReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireSchools') : null, [firestore]));
    const { data: degrees, isLoading: isLoadingDegrees } = useCollection<ReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireDegrees') : null, [firestore]));
    const { data: academicRanks, isLoading: isLoadingRanks } = useCollection<ReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireAcademicRanks') : null, [firestore]));
    const { data: languages, isLoading: isLoadingLanguages } = useCollection<ReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireLanguages') : null, [firestore]));
    const { data: familyRelationships, isLoading: isLoadingFamilyR } = useCollection<ReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireFamilyRelationships') : null, [firestore]));
    const { data: emergencyRelationships, isLoading: isLoadingEmergencyR } = useCollection<ReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireEmergencyRelationships') : null, [firestore]));
    const { data: questionnaireEmploymentTypes, isLoading: isLoadingEmpTypes } = useCollection<ReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireEmploymentTypes') : null, [firestore]));
    const { data: jobCategories, isLoading: isLoadingJobCategories } = useCollection<ReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'jobCategories') : null, [firestore]));

    
    const defaultValues = React.useMemo(() => {
        // Start with all possible fields from the full schema, initialized to prevent 'undefined'
        const baseValues: Partial<FullQuestionnaireValues> = {
            lastName: '', firstName: '', registrationNumber: '', birthDate: null, gender: '', idCardNumber: '',
            hasDisability: false, disabilityPercentage: '', disabilityDate: null, hasDriversLicense: false, driverLicenseCategories: [],
            workPhone: '', personalPhone: '', workEmail: '', personalEmail: '', homeAddress: '', temporaryAddress: '', facebook: '', instagram: '',
            emergencyContacts: [], education: [], languages: [], trainings: [], familyMembers: [], experiences: []
        };
        
        const employeeInfo = {
            ...employeeData,
            workEmail: employeeData?.email,
            personalPhone: employeeData?.phoneNumber,
        };

        const initialData = {
          ...baseValues,
          ...employeeInfo,
          ...questionnaireData,
        };
      
        return transformDates(initialData);
      }, [employeeData, questionnaireData]);

    const references = {
        countries, schools, degrees, academicRanks, languages, familyRelationships, emergencyRelationships,
        employmentTypes: questionnaireEmploymentTypes,
    };

    const isLoading = isLoadingEmployee || isLoadingQuestionnaire || isLoadingCountries || isLoadingSchools || isLoadingDegrees || isLoadingRanks || isLoadingLanguages || isLoadingFamilyR || isLoadingEmergencyR || isLoadingEmpTypes;


    if (isLoading) {
        return (
            <div className="py-8">
                <FormSkeleton />
            </div>
        )
    }

    return (
        <div className="py-8">
            <div className="mb-6 flex items-center justify-between">
                 <h1 className="text-2xl font-bold tracking-tight">Ажилтны анкет</h1>
                 <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/employees/${employeeId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Буцах
                    </Link>
                </Button>
            </div>
            
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="h-auto flex flex-wrap justify-start gap-2 mb-6">
                    <TabsTrigger value="general">Ерөнхий мэдээлэл</TabsTrigger>
                    <TabsTrigger value="contact">Холбоо барих</TabsTrigger>
                    <TabsTrigger value="education">Боловсрол</TabsTrigger>
                    <TabsTrigger value="language">Гадаад хэл</TabsTrigger>
                    <TabsTrigger value="training">Мэргэшлийн бэлтгэл</TabsTrigger>
                    <TabsTrigger value="family">Гэр бүлийн мэдээлэл</TabsTrigger>
                    <TabsTrigger value="experience">Ажлын туршлага</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general">
                    <FormSection docRef={questionnaireDocRef} defaultValues={defaultValues} schema={generalInfoSchema}>
                        {(form, isSubmitting) => <GeneralInfoForm form={form} isSubmitting={isSubmitting} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="contact">
                    <FormSection docRef={questionnaireDocRef} defaultValues={defaultValues} schema={contactInfoSchema}>
                        {(form, isSubmitting) => <ContactInfoForm form={form} isSubmitting={isSubmitting} references={references} />}
                    </FormSection>
                </TabsContent>
                 <TabsContent value="education">
                    <FormSection docRef={questionnaireDocRef} defaultValues={defaultValues} schema={educationHistorySchema}>
                        {(form, isSubmitting) => <EducationForm form={form} isSubmitting={isSubmitting} references={references} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="language">
                     <FormSection docRef={questionnaireDocRef} defaultValues={defaultValues} schema={languageSkillsSchema}>
                        {(form, isSubmitting) => <LanguageForm form={form} isSubmitting={isSubmitting} references={references} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="training">
                     <FormSection docRef={questionnaireDocRef} defaultValues={defaultValues} schema={professionalTrainingSchema}>
                        {(form, isSubmitting) => <TrainingForm form={form} isSubmitting={isSubmitting} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="family">
                     <FormSection docRef={questionnaireDocRef} defaultValues={defaultValues} schema={familyInfoSchema}>
                        {(form, isSubmitting) => <FamilyInfoForm form={form} isSubmitting={isSubmitting} references={references} />}
                    </FormSection>
                </TabsContent>
                 <TabsContent value="experience">
                     <FormSection docRef={questionnaireDocRef} defaultValues={defaultValues} schema={workExperienceHistorySchema}>
                        {(form, isSubmitting) => <WorkExperienceForm form={form} isSubmitting={isSubmitting} references={references} />}
                    </FormSection>
                </TabsContent>
            </Tabs>
        </div>
    );
}
