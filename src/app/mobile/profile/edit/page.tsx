'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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

// Re-using schemas from the dashboard questionnaire page
const questionnaireSchema = z.object({
    lastName: z.string().min(1, "Овог хоосон байж болохгүй."),
    firstName: z.string().min(1, "Нэр хоосон байж болохгүй."),
    registrationNumber: z.string().min(1, "Регистрийн дугаар хоосон байж болохгүй."),
    birthDate: z.date({ required_error: "Төрсөн огноо сонгоно уу."}),
    gender: z.string().min(1, "Хүйс сонгоно уу."),
    idCardNumber: z.string().optional(),
    hasDisability: z.boolean().default(false).optional(),
    disabilityPercentage: z.string().optional(),
    disabilityDate: z.date().optional().nullable(),
    hasDriversLicense: z.boolean().default(false).optional(),
    driverLicenseCategories: z.array(z.string()).optional(),
});
type QuestionnaireFormValues = z.infer<typeof questionnaireSchema>;


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

type ContactInfoFormValues = z.infer<typeof contactInfoSchema>;

// Mock form component for now
const GeneralInfoForm = () => {
    const form = useForm<QuestionnaireFormValues>({
        resolver: zodResolver(questionnaireSchema),
        defaultValues: {
            driverLicenseCategories: [],
        },
    });

    const { isSubmitting } = form.formState;
    const hasDisability = form.watch("hasDisability");
    const hasDriversLicense = form.watch("hasDriversLicense");
    const driverLicenseCategoryItems = ["A", "B", "C", "D", "E", "M"];
    
    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(() => {})} className="space-y-4">
                 <div className="grid grid-cols-1 gap-4">
                    <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Овог</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Нэр</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="registrationNumber" render={({ field }) => ( <FormItem><FormLabel>Регистрийн дугаар</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="birthDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Төрсөн огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Хүйс</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Хүйс сонгох" /></SelectTrigger></FormControl><SelectContent><SelectItem value="male">Эрэгтэй</SelectItem><SelectItem value="female">Эмэгтэй</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="idCardNumber" render={({ field }) => ( <FormItem><FormLabel>ТТД</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="hasDisability" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Хөгжлийн бэрхшээлтэй эсэх</FormLabel></FormItem> )} />
                    {hasDisability && (
                        <>
                            <FormField control={form.control} name="disabilityPercentage" render={({ field }) => ( <FormItem><FormLabel>Хөдөлмөрийн чадвар алдалтын хувь (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="disabilityDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Хөдөлмөрийн чадвар алдсан огноо</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus/></PopoverContent></Popover><FormMessage /></FormItem> )} />
                        </>
                    )}
                    <FormField control={form.control} name="hasDriversLicense" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Жолооны үнэмлэхтэй эсэх</FormLabel></FormItem> )} />
                    {hasDriversLicense && (
                         <Card className="p-4 bg-muted/50"><FormLabel>Жолооны ангилал</FormLabel><FormField control={form.control} name="driverLicenseCategories" render={() => ( <FormItem className="grid grid-cols-3 gap-4 mt-4">{driverLicenseCategoryItems.map((item) => ( <FormField key={item} control={form.control} name="driverLicenseCategories" render={({ field }) => ( <FormItem key={item} className="flex flex-row items-start space-x-2"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item)) }} /></FormControl><FormLabel className="font-normal">{item}</FormLabel></FormItem> )} /> ))}<FormMessage /></FormItem> )}/></Card>
                    )}
                 </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    Хадгалах
                </Button>
            </form>
         </Form>
    );
}

const ContactInfoForm = () => {
    const form = useForm<ContactInfoFormValues>({
        resolver: zodResolver(contactInfoSchema),
        defaultValues: { emergencyContacts: [] },
    });
     const { fields, append, remove } = useFieldArray({ control: form.control, name: "emergencyContacts" });

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(() => {})} className="space-y-4">
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
                 
                <Button type="submit" className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Хадгалах
                </Button>
            </form>
        </Form>
    );
}

export default function MobileProfileEditPage() {

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
                        <GeneralInfoForm />
                    </AccordionContent>
                </AccordionItem>
                
                 <AccordionItem value="contact" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Холбоо барих</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                         <ContactInfoForm />
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="education" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Боловсрол</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <p className="text-muted-foreground text-sm">Боловсролын мэдээлэл оруулах форм энд харагдана.</p>
                    </AccordionContent>
                </AccordionItem>
                
                 <AccordionItem value="language" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Гадаад хэл</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <p className="text-muted-foreground text-sm">Гадаад хэлний мэдлэг оруулах форм энд харагдана.</p>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="training" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Мэргэшлийн бэлтгэл</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <p className="text-muted-foreground text-sm">Мэргэшлийн бэлтгэлийн мэдээлэл оруулах форм энд харагдана.</p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="family" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Гэр бүлийн мэдээлэл</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <p className="text-muted-foreground text-sm">Гэр бүлийн мэдээлэл оруулах форм энд харагдана.</p>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="experience" className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <AccordionTrigger className="p-4 font-semibold text-base">Ажлын туршлага</AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <p className="text-muted-foreground text-sm">Ажлын туршлага оруулах форм энд харагдана.</p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}
