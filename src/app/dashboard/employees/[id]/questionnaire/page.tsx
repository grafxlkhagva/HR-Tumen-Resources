'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
    hasDisability: z.boolean().default(false).optional(),
    disabilityPercentage: z.string().optional(),
    disabilityDate: z.date().optional().nullable(),
    hasDriversLicense: z.boolean().default(false).optional(),
    driverLicenseCategories: z.array(z.string()).optional(),
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
            hasDisability: false,
            disabilityPercentage: '',
            disabilityDate: null,
            hasDriversLicense: false,
            driverLicenseCategories: [],
        },
    });

    function onSubmit(data: QuestionnaireFormValues) {
        console.log(data);
    }
    
    const { isSubmitting } = form.formState;
    const hasDisability = form.watch("hasDisability");
    const hasDriversLicense = form.watch("hasDriversLicense");
    const driverLicenseCategoryItems = ["A", "B", "C", "D", "E", "M"];


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
                                            captionLayout="dropdown-nav"
                                            fromYear={1960}
                                            toYear={new Date().getFullYear()}
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
                                    <Input placeholder="ТТД дугаар" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="hasDisability"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                    <FormLabel>
                                        Хөгжлийн бэрхшээлтэй эсэх
                                    </FormLabel>
                                    </div>
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="hasDriversLicense"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Жолооны үнэмлэхтэй эсэх
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {hasDisability && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="disabilityPercentage"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Хөдөлмөрийн чадвар алдалтын хувь (%)</FormLabel>
                                            <FormControl>
                                            <Input type="number" placeholder="Хувь..." {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="disabilityDate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                            <FormLabel>Хөдөлмөрийн чадвар алдсан огноо</FormLabel>
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
                                                    disabled={(date) => date > new Date()}
                                                    initialFocus
                                                />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </div>
                        {hasDriversLicense && (
                            <Card className="p-4">
                                <FormLabel>Жолооны ангилал</FormLabel>
                                <FormField
                                    control={form.control}
                                    name="driverLicenseCategories"
                                    render={() => (
                                        <FormItem className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">
                                            {driverLicenseCategoryItems.map((item) => (
                                            <FormField
                                                key={item}
                                                control={form.control}
                                                name="driverLicenseCategories"
                                                render={({ field }) => {
                                                return (
                                                    <FormItem
                                                    key={item}
                                                    className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(item)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                ? field.onChange([...(field.value || []), item])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                        (value) => value !== item
                                                                    )
                                                                    )
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        {item}
                                                    </FormLabel>
                                                    </FormItem>
                                                )
                                                }}
                                            />
                                            ))}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </Card>
                        )}
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

function ContactInfoForm() {
    const form = useForm<ContactInfoFormValues>({
        resolver: zodResolver(contactInfoSchema),
        defaultValues: {
            workPhone: '',
            personalPhone: '',
            workEmail: '',
            personalEmail: '',
            homeAddress: '',
            temporaryAddress: '',
            facebook: '',
            instagram: '',
            emergencyContacts: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: "emergencyContacts",
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
                        <CardTitle>Үндсэн мэдээлэл</CardTitle>
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
                            <FormField
                                control={form.control}
                                name="temporaryAddress"
                                render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Гэрийн хаяг (Түр)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Түр оршин суугаа хаяг..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Сошиал медиа</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="facebook"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Facebook</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="https://facebook.com/username" {...field} className="pl-10" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="instagram"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Instagram</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder="https://instagram.com/username" {...field} className="pl-10" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
                
                <Card>
                  <CardHeader><CardTitle>Яаралтай үед холбоо барих</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                     {fields.map((field, index) => (
                        <Card key={field.id} className="p-4 relative">
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 text-destructive"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Устгах</span>
                            </Button>
                           <CardContent className="space-y-4 pt-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`emergencyContacts.${index}.fullName`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Овог, нэр</FormLabel>
                                      <FormControl><Input placeholder="Яаралтай үед холбоо барих хүний нэр" {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`emergencyContacts.${index}.relationship`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Таны хэн болох</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                              <SelectTrigger>
                                                  <SelectValue placeholder="Сонгох" />
                                              </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                              <SelectItem value="parent">Эцэг/Эх</SelectItem>
                                              <SelectItem value="spouse">Эхнэр/Нөхөр</SelectItem>
                                              <SelectItem value="sibling">Ах/Эгч/Дүү</SelectItem>
                                              <SelectItem value="child">Хүүхэд</SelectItem>
                                              <SelectItem value="other">Бусад</SelectItem>
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                             </div>
                             <FormField
                                control={form.control}
                                name={`emergencyContacts.${index}.phone`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Утас</FormLabel>
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
                           </CardContent>
                        </Card>
                     ))}
                     <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ fullName: '', relationship: '', phone: '' })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Яаралтай үед холбоо барих хүн нэмэх
                      </Button>
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
  diplomaNumber: z.string().optional(),
  academicRank: z.string().optional(),
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
                diplomaNumber: '',
                academicRank: '',
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
                                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder="Мэргэжил сонгох" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {/* Мэргэжлийн жагсаалт энд орно */}
                                                <SelectItem value="Нягтлан бодогч">Нягтлан бодогч</SelectItem>
                                                <SelectItem value="Программист">Программист</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`education.${index}.diplomaNumber`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Диплом, үнэмлэхний дугаар</FormLabel>
                                        <FormControl>
                                        <Input placeholder="Дипломын дугаарыг оруулна уу" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`education.${index}.academicRank`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Зэрэг, цол</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                <SelectValue placeholder="Зэрэг, цол сонгох" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {/* Зэрэг цолны жагсаалт энд орно */}
                                                <SelectItem value="Бакалавр">Бакалавр</SelectItem>
                                                <SelectItem value="Магистр">Магистр</SelectItem>
                                                <SelectItem value="Доктор">Доктор (Ph.D)</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                    onClick={() => append({ country: 'Монгол', school: '', schoolCustom: '', degree: '', diplomaNumber: '', academicRank: '', entryDate: null, gradDate: null, isCurrent: false })}
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
                                        <FormLabel>Гадаад хэл</FormLabel>
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
                                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name={`languages.${index}.listening`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Сонсох</FormLabel>
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
                                    <FormField
                                        control={form.control}
                                        name={`languages.${index}.reading`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Унших</FormLabel>
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
                                    <FormField
                                        control={form.control}
                                        name={`languages.${index}.speaking`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ярих</FormLabel>
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
                                    <FormField
                                        control={form.control}
                                        name={`languages.${index}.writing`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Бичих</FormLabel>
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

const trainingSchema = z.object({
  name: z.string().min(1, "Сургалтын нэр хоосон байж болохгүй."),
  organization: z.string().min(1, "Байгууллагын нэр хоосон байж болохгүй."),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  certificateNumber: z.string().optional(),
});

const professionalTrainingSchema = z.object({
    trainings: z.array(trainingSchema)
});

type ProfessionalTrainingFormValues = z.infer<typeof professionalTrainingSchema>;

function TrainingForm() {
    const form = useForm<ProfessionalTrainingFormValues>({
        resolver: zodResolver(professionalTrainingSchema),
        defaultValues: {
            trainings: [{
                name: '',
                organization: '',
                startDate: null,
                endDate: null,
                certificateNumber: '',
            }]
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "trainings"
    });

    function onSubmit(data: ProfessionalTrainingFormValues) {
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
                        Мэргэжлээрээ болон бусад төрлөөр 1 сараас дээш хугацаагаар хамрагдаж байсан сургалт.
                    </AlertDescription>
                </Alert>
                
                <div className="space-y-6">
                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-4">
                            <CardContent className="space-y-4 pt-4">
                               <FormField
                                    control={form.control}
                                    name={`trainings.${index}.name`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Сургалтын нэр</FormLabel>
                                        <FormControl>
                                        <Input placeholder="Сургалтын нэрийг оруулна уу" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`trainings.${index}.organization`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Сургалт явуулсан байгууллага</FormLabel>
                                        <FormControl>
                                        <Input placeholder="Байгууллагын нэрийг оруулна уу" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField
                                        control={form.control}
                                        name={`trainings.${index}.startDate`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                            <FormLabel>Эхэлсэн огноо</FormLabel>
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
                                        name={`trainings.${index}.endDate`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                            <FormLabel>Дууссан огноо</FormLabel>
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
                                </div>
                                <FormField
                                    control={form.control}
                                    name={`trainings.${index}.certificateNumber`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Үнэмлэх, сертификатын дугаар</FormLabel>
                                        <FormControl>
                                        <Input placeholder="Дугаарыг оруулна уу" {...field} />
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
                    onClick={() => append({ name: '', organization: '', startDate: null, endDate: null, certificateNumber: '' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Мэргэшлийн бэлтгэл нэмэх
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

const familyMemberSchema = z.object({
  relationship: z.string().min(1, "Таны хэн болохыг сонгоно уу."),
  lastName: z.string().min(1, "Овог хоосон байж болохгүй."),
  firstName: z.string().min(1, "Нэр хоосон байж болохгүй."),
  phone: z.string().optional(),
});

const familyInfoSchema = z.object({
    familyMembers: z.array(familyMemberSchema)
});

type FamilyInfoFormValues = z.infer<typeof familyInfoSchema>;

function FamilyInfoForm() {
    const form = useForm<FamilyInfoFormValues>({
        resolver: zodResolver(familyInfoSchema),
        defaultValues: {
            familyMembers: [{
                relationship: '',
                lastName: '',
                firstName: '',
                phone: '',
            }]
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "familyMembers"
    });

    function onSubmit(data: FamilyInfoFormValues) {
        console.log(data);
    }
    
    const { isSubmitting } = form.formState;
    
    const relationshipOptions = ["Эхнэр", "Нөхөр", "Аав", "Ээж", "Ах", "Эгч", "Дүү", "Хүү", "Охин"];

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-6">
                    {fields.map((field, index) => (
                        <Card key={field.id} className="relative p-4">
                             <CardContent className="space-y-4 pt-6">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-destructive"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Устгах</span>
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField
                                        control={form.control}
                                        name={`familyMembers.${index}.relationship`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Таны хэн болох</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {relationshipOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`familyMembers.${index}.lastName`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Овог</FormLabel>
                                            <FormControl><Input placeholder="Овог" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`familyMembers.${index}.firstName`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Нэр</FormLabel>
                                            <FormControl><Input placeholder="Нэр" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`familyMembers.${index}.phone`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Холбоо барих утас</FormLabel>
                                            <FormControl><Input placeholder="Утасны дугаар" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                             </CardContent>
                        </Card>
                    ))}
                </div>
                 <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ relationship: '', lastName: '', firstName: '', phone: '' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Гэр бүлийн гишүүн нэмэх
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
    )
}

const workExperienceSchema = z.object({
  company: z.string().min(1, "Компанийн нэр хоосон байж болохгүй."),
  position: z.string().min(1, "Ажлын байрны нэр хоосон байж болохгүй."),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  employmentType: z.string().min(1, "Хөдөлмөрийн нөхцөл сонгоно уу."),
  description: z.string().optional(),
});

const workExperienceHistorySchema = z.object({
    experiences: z.array(workExperienceSchema)
});

type WorkExperienceFormValues = z.infer<typeof workExperienceHistorySchema>;

function WorkExperienceForm() {
    const form = useForm<WorkExperienceFormValues>({
        resolver: zodResolver(workExperienceHistorySchema),
        defaultValues: {
            experiences: [{
                company: '',
                position: '',
                startDate: null,
                endDate: null,
                employmentType: '',
                description: '',
            }]
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "experiences"
    });

    function onSubmit(data: WorkExperienceFormValues) {
        console.log(data);
    }
    
    const { isSubmitting } = form.formState;

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-6">
                    {fields.map((field, index) => (
                        <Card key={field.id} className="relative p-4">
                             <CardContent className="space-y-4 pt-6">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-destructive"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Устгах</span>
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name={`experiences.${index}.company`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Компани</FormLabel>
                                            <FormControl><Input placeholder="Ажиллаж байсан компани" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`experiences.${index}.position`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ажлын байр</FormLabel>
                                            <FormControl><Input placeholder="Албан тушаал" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`experiences.${index}.startDate`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                            <FormLabel>Эхэлсэн огноо</FormLabel>
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
                                        name={`experiences.${index}.endDate`}
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                            <FormLabel>Дууссан огноо</FormLabel>
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
                                        name={`experiences.${index}.employmentType`}
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Хөдөлмөрийн нөхцөл</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Нөхцөл сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="full-time">Бүтэн цаг</SelectItem>
                                                    <SelectItem value="part-time">Цагаар</SelectItem>
                                                    <SelectItem value="contract">Гэрээт</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name={`experiences.${index}.description`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ажлын тодорхойлолт</FormLabel>
                                        <FormControl>
                                        <Textarea placeholder="Гүйцэтгэсэн үүрэг, хариуцлагын талаар товч бичнэ үү..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                             </CardContent>
                        </Card>
                    ))}
                </div>
                 <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ company: '', position: '', startDate: null, endDate: null, employmentType: '', description: '' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ажлын туршлага нэмэх
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
            
            <Tabs defaultValue="general" className="w-full">
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
                <TabsContent value="training">
                    <TrainingForm />
                </TabsContent>
                <TabsContent value="family">
                    <FamilyInfoForm />
                </TabsContent>
                 <TabsContent value="experience">
                    <WorkExperienceForm />
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
