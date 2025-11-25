'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ArrowLeft, Calendar as CalendarIcon, Camera, Save, X, Loader2, Phone, Mail, AlertCircle, PlusCircle, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';


const questionnaireSchema = z.object({
    lastName: z.string().min(1, "Овог хоосон байж болохгүй."),
    firstName: z.string().min(1, "Нэр хоосон байж болохгүй."),
    registrationNumber: z.string().min(1, "Регистрийн дугаар хоосон байж болохгүй."),
    birthDate: z.date({ required_error: "Төрсөн огноо сонгоно уу."}),
    gender: z.string().min(1, "Хүйс сонгоно уу."),
    idCardNumber: z.string().optional(),
    hasDisability: z.string().optional(),
    hasDriversLicense: z.string().optional(),
});

type QuestionnaireFormValues = z.infer<typeof questionnaireSchema>;


function GeneralInfoForm() {
    const form = useForm<QuestionnaireFormValues>({
        resolver: zodResolver(questionnaireSchema),
        defaultValues: {
            lastName: '',
            firstName: '',
            registrationNumber: '',
            gender: '',
            idCardNumber: '',
            hasDisability: 'false',
            hasDriversLicense: 'false',
        },
    });

    function onSubmit(data: QuestionnaireFormValues) {
        console.log(data);
    }
    
    const { isSubmitting } = form.formState;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Овог</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Ажилтны овог" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Нэр</FormLabel>
                                    <FormControl>
                                    <Input placeholder="Ажилтны бүтэн нэр" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="registrationNumber"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Регистрийн дугаар</FormLabel>
                                    <FormControl>
                                    <Input placeholder="АА00112233" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="birthDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Төрсөн огноо</FormLabel>
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
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Хүйс</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Хүйс сонгох" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="male">Эрэгтэй</SelectItem>
                                        <SelectItem value="female">Эмэгтэй</SelectItem>
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="idCardNumber"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ТТД</FormLabel>
                                    <FormControl>
                                    <Input placeholder="ТТД дугаар" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="hasDisability"
                                render={({ field }) => (
                                    <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex items-center"
                                            >
                                                <RadioGroupItem value="true" id="disability_yes" />
                                            </RadioGroup>
                                        </FormControl>
                                        <FormLabel className="font-normal" htmlFor="disability_yes">
                                            Хөгжлийн бэрхшээлтэй эсэх
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="hasDriversLicense"
                                render={({ field }) => (
                                    <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex items-center"
                                            >
                                                <RadioGroupItem value="true" id="drivers_license_yes" />
                                            </RadioGroup>
                                        </FormControl>
                                        <FormLabel className="font-normal" htmlFor="drivers_license_yes">
                                            Жолооны үнэмлэхтэй эсэх
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />

                        </div>
                    </CardContent>
                </Card>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button">
                        <X className="mr-2 h-4 w-4" />
                        Цуцлах
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Хадгалах
                    </Button>
                </div>
            </form>
        </Form>
    );
}

const contactInfoSchema = z.object({
  workPhone: z.string().optional(),
  personalPhone: z.string().optional(),
  workEmail: z.string().email({ message: "Албан ёсны имэйл хаяг буруу байна." }).optional().or(z.literal('')),
  personalEmail: z.string().email({ message: "Хувийн имэйл хаяг буруу байна." }).optional().or(z.literal('')),
  homeAddress: z.string().optional(),
});

type ContactInfoFormValues = z.infer<typeof contactInfoSchema>;

function ContactInfoForm() {
    const form = useForm<ContactInfoFormValues>({
        resolver: zodResolver(contactInfoSchema),
        defaultValues: {
            workPhone: '',
            personalPhone: '',
            workEmail: '',
            personalEmail: '',
            homeAddress: '',
        },
    });

    function onSubmit(data: ContactInfoFormValues) {
        console.log(data);
    }
    
    const { isSubmitting } = form.formState;

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Холбоо барих мэдээлэл</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="workPhone"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Гар утас (Албан)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="8811****" {...field} className="pl-10" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="personalPhone"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Гар утас (Хувийн)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="9911****" {...field} className="pl-10" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="workEmail"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Албан ёсны и-мэйл</FormLabel>
                                    <FormControl>
                                         <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input type="email" placeholder="name@example.com" {...field} className="pl-10" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="personalEmail"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Хувийн и-мэйл</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input type="email" placeholder="personal@example.com" {...field} className="pl-10" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="homeAddress"
                                render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Гэрийн хаяг (Үндсэн)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Сүхбаатар дүүрэг, 8-р хороо..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
                 <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button">
                        <X className="mr-2 h-4 w-4" />
                        Цуцлах
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Хадгалах
                    </Button>
                </div>
            </form>
        </Form>
    )
}

const educationSchema = z.object({
  country: z.string().min(1, "Улс сонгоно уу."),
  school: z.string().optional(),
  schoolCustom: z.string().optional(),
  degree: z.string().optional(),
  entryDate: z.date().nullable(),
  gradDate: z.date().nullable(),
  isCurrent: z.boolean().default(false),
}).refine(data => data.school || data.schoolCustom, {
    message: "Төгссөн сургуулиа сонгох эсвэл бичнэ үү.",
    path: ["school"],
});

const educationHistorySchema = z.object({
    education: z.array(educationSchema)
})

type EducationHistoryFormValues = z.infer<typeof educationHistorySchema>;

function EducationForm() {
    const form = useForm<EducationHistoryFormValues>({
        resolver: zodResolver(educationHistorySchema),
        defaultValues: {
            education: [{
                country: 'Монгол',
                school: '',
                schoolCustom: '',
                degree: '',
                entryDate: null,
                gradDate: null,
                isCurrent: false,
            }]
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "education"
    });

    function onSubmit(data: EducationHistoryFormValues) {
        console.log(data);
    }
    
    const { isSubmitting } = form.formState;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Анхаар</AlertTitle>
                    <AlertDescription>
                        Ерөнхий боловсролын сургуулиас эхлэн төгссөн дарааллын дагуу бичнэ үү.
                    </AlertDescription>
                </Alert>
                
                <div className="space-y-6">
                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-4">
                            <CardContent className="space-y-4 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name={`education.${index}.country`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Хаана</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                    <SelectValue placeholder="Улс сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Монгол">Монгол</SelectItem>
                                                    <SelectItem value="Бусад">Бусад</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`education.${index}.school`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Төгссөн сургууль</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                    <SelectValue placeholder="Сургууль сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {/* Сургуулийн жагсаалт энд орно */}
                                                    <SelectItem value="МУИС">МУИС</SelectItem>
                                                    <SelectItem value="ШУТИС">ШУТИС</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name={`education.${index}.schoolCustom`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Төгссөн сургууль /бичих/</FormLabel>
                                        <FormControl>
                                        <Input placeholder="Таны төгссөн сургууль дээд талын сонголтонд байхгүй бол энд бичнэ үү" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField
                                        control={form.control}
                                        name={`education.${index}.entryDate`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                            <FormLabel>Элссэн огноо</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "yyyy-MM-dd") : <span>Огноо сонгох</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`education.${index}.gradDate`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                            <FormLabel>Төгссөн огноо</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground", form.watch(`education.${index}.isCurrent`) && "disabled:opacity-50")}>
                                                    {field.value ? format(field.value, "yyyy-MM-dd") : <span>Огноо сонгох</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name={`education.${index}.isCurrent`}
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-sm font-normal">
                                                Одоо сурч байгаа
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`education.${index}.degree`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Эзэмшсэн мэргэжил</FormLabel>
                                        <FormControl>
                                        <Input placeholder="Мэргэжлийн нэр" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                {fields.length > 1 && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Устгах
                                </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
                 <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ country: 'Монгол', school: '', schoolCustom: '', degree: '', entryDate: null, gradDate: null, isCurrent: false })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Боловсрол нэмэх
                </Button>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button">
                        <X className="mr-2 h-4 w-4" />
                        Цуцлах
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Хадгалах
                    </Button>
                </div>
            </form>
        </Form>
    );
}


const languageSchema = z.object({
    language: z.string().min(1, "Хэл сонгоно уу."),
    listening: z.string().min(1, "Түвшин сонгоно уу."),
    reading: z.string().min(1, "Түвшин сонгоно уу."),
    speaking: z.string().min(1, "Түвшин сонгоно уу."),
    writing: z.string().min(1, "Түвшин сонгоно уу."),
    testScore: z.string().optional(),
});

const languageSkillsSchema = z.object({
    languages: z.array(languageSchema)
});

type LanguageSkillsFormValues = z.infer<typeof languageSkillsSchema>;

function LanguageForm() {
    const form = useForm<LanguageSkillsFormValues>({
        resolver: zodResolver(languageSkillsSchema),
        defaultValues: {
            languages: [{
                language: '',
                listening: '',
                reading: '',
                speaking: '',
                writing: '',
                testScore: '',
            }]
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "languages"
    });

    function onSubmit(data: LanguageSkillsFormValues) {
        console.log(data);
    }
    
    const { isSubmitting } = form.formState;

    const proficiencyLevels = ['Анхан', 'Дунд', 'Ахисан', 'Мэргэжлийн'];
    const languageOptions = ['Англи', 'Орос', 'Хятад', 'Япон', 'Солонгос', 'Герман'];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Түвшин оруулах</AlertTitle>
                    <AlertDescription>
                        *Олон улсад хүлээн зөвшөөрөгдөх түвшин тогтоох шалгалтын оноог оруулна уу.
                    </AlertDescription>
                </Alert>
                
                <div className="space-y-6">
                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-4">
                            <CardContent className="space-y-4 pt-4">
                                <FormField
                                    control={form.control}
                                    name={`languages.${index}.language`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Хэл</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder="Хэл сонгох" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {languageOptions.map(lang => (
                                                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {(['listening', 'Сонсох'] as const).map(([name, label]) => (
                                         <FormField
                                            key={name}
                                            control={form.control}
                                            name={`languages.${index}.${name}`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{label}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Түвшин" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {proficiencyLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    ))}
                                    {(['reading', 'Унших'] as const).map(([name, label]) => (
                                         <FormField
                                            key={name}
                                            control={form.control}
                                            name={`languages.${index}.${name}`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{label}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Түвшин" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {proficiencyLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    ))}
                                    {(['speaking', 'Ярих'] as const).map(([name, label]) => (
                                         <FormField
                                            key={name}
                                            control={form.control}
                                            name={`languages.${index}.${name}`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{label}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Түвшин" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {proficiencyLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    ))}
                                    {(['writing', 'Бичих'] as const).map(([name, label]) => (
                                         <FormField
                                            key={name}
                                            control={form.control}
                                            name={`languages.${index}.${name}`}
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{label}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Түвшин" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {proficiencyLevels.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                 <FormField
                                    control={form.control}
                                    name={`languages.${index}.testScore`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Шалгалтын оноо</FormLabel>
                                        <FormControl>
                                        <Input placeholder="TOEFL-ийн оноо..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                {fields.length > 1 && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Устгах
                                </Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
                 <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ language: '', listening: '', reading: '', speaking: '', writing: '', testScore: '' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Хэл нэмэх
                </Button>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button">
                        <X className="mr-2 h-4 w-4" />
                        Цуцлах
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Хадгалах
                    </Button>
                </div>
            </form>
        </Form>
    );
}

export default function QuestionnairePage() {
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;

    return (
        <div className="py-8">
            <div className="mb-6">
                 <h1 className="text-2xl font-bold tracking-tight">Ажилтны анкет</h1>
                 <p className="text-muted-foreground">Шинэ ажилтны анкетыг энд бөглөнө үү.</p>
            </div>
            
            <Tabs defaultValue="language" className="w-full">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-7 mb-6">
                    <TabsTrigger value="general">Ерөнхий мэдээлэл</TabsTrigger>
                    <TabsTrigger value="contact">Холбоо барих</TabsTrigger>
                    <TabsTrigger value="education">Боловсрол</TabsTrigger>
                    <TabsTrigger value="language">Гадаад хэл</TabsTrigger>
                    <TabsTrigger value="training">Мэргэшлийн бэлтгэл</TabsTrigger>
                    <TabsTrigger value="family">Гэр бүлийн мэдээлэл</TabsTrigger>
                    <TabsTrigger value="experience">Ажлын туршлага</TabsTrigger>
                </TabsList>
                <TabsContent value="general">
                    <GeneralInfoForm />
                </TabsContent>
                <TabsContent value="contact">
                    <ContactInfoForm />
                </TabsContent>
                 <TabsContent value="education">
                    <EducationForm />
                </TabsContent>
                <TabsContent value="language">
                    <LanguageForm />
                </TabsContent>
            </Tabs>

             <Button asChild variant="outline" size="sm" className="mt-8">
                <Link href={`/dashboard/employees/${employeeId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Буцах
                </Link>
            </Button>
        </div>
    );
}
