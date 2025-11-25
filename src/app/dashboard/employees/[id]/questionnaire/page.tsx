'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
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
import { ArrowLeft, Calendar as CalendarIcon, Camera, Save, X, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
                    <Card>
                        <CardHeader><CardTitle>Холбоо барих</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground">Удахгүй...</p></CardContent>
                    </Card>
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
