'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "./reference-table";
import { useCollection, useFirebase, useMemoFirebase, useDoc, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, History, Settings, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

type FieldDefinition = {
    key: string;
    label: string;
    type: 'text' | 'number' | 'date';
};

type DocumentTypeReferenceItem = ReferenceItem & { name: string; fields?: FieldDefinition[] };
type SimpleReferenceItem = ReferenceItem & { name: string };
type JobCategoryReferenceItem = ReferenceItem & { name: string; code: string };

const employeeCodeSchema = z.object({
    prefix: z.string().min(1, 'Угтвар үсэг хоосон байж болохгүй.'),
    digitCount: z.coerce.number().min(1, 'Оронгийн тоо 1-ээс бага байж болохгүй.').max(10, 'Оронгийн тоо 10-аас их байж болохгүй.'),
    nextNumber: z.coerce.number().min(1, 'Эхлэх дугаар 1-ээс бага байж болохгүй.'),
}).refine((data) => {
    const maxNumber = Math.pow(10, data.digitCount);
    return data.nextNumber < maxNumber;
}, {
    message: "Эхлэх дугаар нь тооны орноос хэтэрсэн байна.",
    path: ["nextNumber"], 
});

type EmployeeCodeFormValues = z.infer<typeof employeeCodeSchema>;

type EmployeeCodeConfig = {
    id: string;
    prefix: string;
    digitCount: number;
    nextNumber: number;
};

const timeOffRequestSchema = z.object({
    requestDeadlineDays: z.coerce.number().min(0, 'Хязгаар 0-ээс бага байж болохгүй.'),
});

type TimeOffRequestFormValues = z.infer<typeof timeOffRequestSchema>;

type TimeOffRequestConfig = {
    requestDeadlineDays: number;
}

const pointsConfigSchema = z.object({
    monthlyAllocation: z.coerce.number().min(0, "Оноо 0-ээс бага байж болохгүй."),
    dailyAllocation: z.coerce.number().min(0, "Оноо 0-ээс бага байж болохгүй."),
    maxPerTransaction: z.coerce.number().min(0, "Оноо 0-ээс бага байж болохгүй."),
});

type PointsConfigFormValues = z.infer<typeof pointsConfigSchema>;

type PointsConfig = {
    monthlyAllocation: number;
    dailyAllocation: number;
    maxPerTransaction: number;
}


function EmployeeCodeConfigForm({ initialData }: { initialData: EmployeeCodeFormValues }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const codeConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'employeeCodeConfig') : null), [firestore]);

    const form = useForm<EmployeeCodeFormValues>({
        resolver: zodResolver(employeeCodeSchema),
        defaultValues: initialData,
    });

    const { isSubmitting } = form.formState;

    const onSubmit = (data: EmployeeCodeFormValues) => {
        if (!codeConfigRef) return;

        setDocumentNonBlocking(codeConfigRef, data, { merge: true });
        
        toast({
            title: 'Амжилттай хадгаллаа',
            description: 'Ажилтны кодчлолын тохиргоо шинэчлэгдлээ.',
        });
    };

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="prefix" render={({ field }) => ( <FormItem> <FormLabel>Угтвар үсэг</FormLabel> <FormControl> <Input placeholder="EMP" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="digitCount" render={({ field }) => ( <FormItem> <FormLabel>Тооны орон</FormLabel> <FormControl> <Input type="number" placeholder="4" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="nextNumber" render={({ field }) => ( <FormItem> <FormLabel>Эхлэх дугаар</FormLabel> <FormControl> <Input type="number" placeholder="1" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                </div>
                <div className="flex items-center gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 size-4 shrink-0" />
                        )}
                        Хадгалах
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href="/dashboard/settings/code-log">
                           <> 
                             <History className="mr-2 size-4 shrink-0" />
                             Түүх харах
                           </>
                        </Link>
                    </Button>
                </div>
            </form>
        </Form>
    );
}

function TimeOffRequestConfigForm({ initialData }: { initialData: TimeOffRequestFormValues }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'timeOffRequestConfig') : null), [firestore]);

    const form = useForm<TimeOffRequestFormValues>({
        resolver: zodResolver(timeOffRequestSchema),
        defaultValues: initialData,
    });

    const { isSubmitting } = form.formState;

    const onSubmit = (data: TimeOffRequestFormValues) => {
        if (!configRef) return;
        
        setDocumentNonBlocking(configRef, data, { merge: true });
        
        toast({
            title: 'Амжилттай хадгаллаа',
            description: 'Чөлөөний хүсэлтийн тохиргоо шинэчлэгдлээ.',
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                    control={form.control}
                    name="requestDeadlineDays"
                    render={({ field }) => (
                        <FormItem className="max-w-sm">
                            <FormLabel>Хүсэлт гаргах доод хязгаар (ажлын өдөр)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="Жишээ нь: 3" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSubmitting}>
                     {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 size-4 shrink-0" />
                    )}
                    Хадгалах
                </Button>
            </form>
        </Form>
    );
}

function PointsConfigForm({ initialData }: { initialData: PointsConfigFormValues }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'pointsConfig') : null), [firestore]);

    const form = useForm<PointsConfigFormValues>({
        resolver: zodResolver(pointsConfigSchema),
        defaultValues: initialData,
    });

    const { isSubmitting } = form.formState;

    const onSubmit = (data: PointsConfigFormValues) => {
        if (!configRef) return;
        setDocumentNonBlocking(configRef, data, { merge: true });
        toast({
            title: 'Амжилттай хадгаллаа',
            description: 'Онооны тохиргоо шинэчлэгдлээ.',
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField control={form.control} name="monthlyAllocation" render={({ field }) => ( <FormItem> <FormLabel>Ажилтанд сард өгөх оноо</FormLabel> <FormControl> <Input type="number" placeholder="100" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="dailyAllocation" render={({ field }) => ( <FormItem> <FormLabel>Ажилтанд өдөрт өгөх оноо</FormLabel> <FormControl> <Input type="number" placeholder="20" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="maxPerTransaction" render={({ field }) => ( <FormItem> <FormLabel>Нэг хүнд өгөх дээд оноо</FormLabel> <FormControl> <Input type="number" placeholder="20" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                </div>
                 <div className="flex items-center gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        ) : (
                            <Save className="mr-2 size-4 shrink-0" />
                        )}
                        Хадгалах
                    </Button>
                    <Button asChild type="button" variant="outline" disabled={isSubmitting}>
                       <Link href="/dashboard/scoring">
                        <> 
                         <Star className="mr-2 size-4 shrink-0" />
                         Онооны дүрэм
                        </>
                       </Link>
                    </Button>
                </div>
            </form>
        </Form>
    );
}

function EmployeeCodeConfigCard() {
    const { firestore } = useFirebase();

    const codeConfigRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'employeeCodeConfig') : null), [firestore]);
    const { data: codeConfig, isLoading } = useDoc<EmployeeCodeConfig>(codeConfigRef);

    const initialData = codeConfig || { prefix: '', digitCount: 4, nextNumber: 1 };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Ажилтны кодчлолын тохиргоо</CardTitle>
                <CardDescription>Байгууллагын ажилтны кодыг хэрхэн үүсгэхийг тохируулах.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Skeleton className="h-10 w-28" />
                           <Skeleton className="h-10 w-32" />
                        </div>
                    </div>
                ) : (
                  <EmployeeCodeConfigForm initialData={initialData} />
                )}
            </CardContent>
        </Card>
    )
}

function TimeOffRequestConfigCard() {
    const { firestore } = useFirebase();
    const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'timeOffRequestConfig') : null), [firestore]);
    const { data: config, isLoading } = useDoc<TimeOffRequestConfig>(configRef);
    const initialData = config || { requestDeadlineDays: 3 };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Хүсэлтийн тохиргоо</CardTitle>
                <CardDescription>Ажилтан чөлөөний хүсэлтээ хэдэн хоногийн дотор гаргахыг тохируулах.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="space-y-4">
                        <div className="space-y-2 max-w-sm"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-full" /></div>
                        <Skeleton className="h-10 w-28" />
                    </div>
                 ) : (
                    <TimeOffRequestConfigForm initialData={initialData} />
                 )}
            </CardContent>
        </Card>
    );
}

function PointsConfigCard() {
    const { firestore } = useFirebase();
    const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'company', 'pointsConfig') : null), [firestore]);
    const { data: config, isLoading } = useDoc<PointsConfig>(configRef);
    const initialData = config || { monthlyAllocation: 100, dailyAllocation: 20, maxPerTransaction: 20 };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Онооны системийн тохиргоо</CardTitle>
                <CardDescription>Ажилтан хооронд оноо шилжүүлэх болон системээс оноо авахтай холбоотой ерөнхий тохиргоо.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Skeleton className="h-10 w-28" />
                           <Skeleton className="h-10 w-36" />
                        </div>
                    </div>
                 ) : (
                    <PointsConfigForm initialData={initialData} />
                 )}
            </CardContent>
        </Card>
    );
}

export default function SettingsPage() {
  const { firestore } = useFirebase();

  // Data hooks for each reference collection
  const { data: documentTypes, isLoading: loadingDocTypes } = useCollection<DocumentTypeReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'documentTypes') : null, [firestore]));
  const { data: employmentTypes, isLoading: loadingEmpTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'employmentTypes') : null, [firestore]));
  const { data: positionStatuses, isLoading: loadingStatuses } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'positionStatuses') : null, [firestore]));
  const { data: jobCategories, isLoading: loadingJobCategories } = useCollection<JobCategoryReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'jobCategories') : null, [firestore]));
  const { data: positionLevels, isLoading: loadingLevels } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'positionLevels') : null, [firestore]));
  const { data: timeOffRequestTypes, isLoading: loadingTimeOffTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'timeOffRequestTypes') : null, [firestore]));
  const { data: questionnaireCountries, isLoading: loadingCountries } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireCountries') : null, [firestore]));
  const { data: questionnaireSchools, isLoading: loadingSchools } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireSchools') : null, [firestore]));
  const { data: questionnaireDegrees, isLoading: loadingDegrees } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireDegrees') : null, [firestore]));
  const { data: questionnaireRanks, isLoading: loadingRanks } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireAcademicRanks') : null, [firestore]));
  const { data: questionnaireLanguages, isLoading: loadingLanguages } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireLanguages') : null, [firestore]));
  const { data: questionnaireFamily, isLoading: loadingFamily } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireFamilyRelationships') : null, [firestore]));
  const { data: questionnaireEmergency, isLoading: loadingEmergency } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireEmergencyRelationships') : null, [firestore]));
  const { data: questionnaireEmpTypes, isLoading: loadingQEmpTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireEmploymentTypes') : null, [firestore]));


  const isLoading = loadingDocTypes || loadingEmpTypes || loadingStatuses || loadingJobCategories || loadingLevels || loadingTimeOffTypes || loadingCountries || loadingSchools || loadingDegrees || loadingRanks || loadingLanguages || loadingFamily || loadingEmergency || loadingQEmpTypes;

  const referenceTables = [
    { name: 'documentTypes', title: 'Баримт бичгийн төрөл', data: documentTypes, isLoading: loadingDocTypes, columns: [{key: 'name', header: 'Нэр'}, {key: 'fields', header: 'Нэмэлт талбарууд'}], enableFieldDefs: true },
    { name: 'employmentTypes', title: 'Ажил эрхлэлтийн төрөл', data: employmentTypes, isLoading: loadingEmpTypes, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'positionStatuses', title: 'Ажлын байрны төлөв', data: positionStatuses, isLoading: loadingStatuses, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'jobCategories', title: 'Ажил мэргэжлийн ангилал (ҮАМАТ)', data: jobCategories, isLoading: loadingJobCategories, columns: [{key: 'code', header: 'Код'}, {key: 'name', header: 'Нэр'}] },
    { name: 'positionLevels', title: 'Албан тушаалын зэрэглэл', data: positionLevels, isLoading: loadingLevels, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'timeOffRequestTypes', title: 'Чөлөөний хүсэлтийн төрөл', data: timeOffRequestTypes, isLoading: loadingTimeOffTypes, columns: [{key: 'name', header: 'Нэр'}] },
  ];

  const questionnaireReferenceTables = [
    { name: 'questionnaireCountries', title: 'Анкет: Улс', data: questionnaireCountries, isLoading: loadingCountries, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'questionnaireSchools', title: 'Анкет: Сургууль', data: questionnaireSchools, isLoading: loadingSchools, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'questionnaireDegrees', title: 'Анкет: Мэргэжил', data: questionnaireDegrees, isLoading: loadingDegrees, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'questionnaireAcademicRanks', title: 'Анкет: Эрдмийн зэрэг, цол', data: questionnaireRanks, isLoading: loadingRanks, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'questionnaireLanguages', title: 'Анкет: Гадаад хэл', data: questionnaireLanguages, isLoading: loadingLanguages, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'questionnaireFamilyRelationships', title: 'Анкет: Гэр бүлийн хамаарал', data: questionnaireFamily, isLoading: loadingFamily, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'questionnaireEmergencyRelationships', title: 'Анкет: Яаралтай үеийн хамаарал', data: questionnaireEmergency, isLoading: loadingEmergency, columns: [{key: 'name', header: 'Нэр'}] },
    { name: 'questionnaireEmploymentTypes', title: 'Анкет: Хөдөлмөрийн нөхцөл', data: questionnaireEmpTypes, isLoading: loadingQEmpTypes, columns: [{key: 'name', header: 'Нэр'}] },
  ]

  return (
    <div className="py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Тохиргоо</h1>
        <p className="text-muted-foreground">
          Системийн ерөнхий тохиргоо, лавлах сангийн утгуудыг эндээс удирдна.
        </p>
      </div>

        <EmployeeCodeConfigCard />

        <Card>
            <CardHeader>
                <CardTitle>Чөлөөний хүсэлтийн тохиргоо</CardTitle>
            </CardHeader>
            <CardContent>
                <TimeOffRequestConfigCard />
            </CardContent>
        </Card>

        <PointsConfigCard />
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="size-5" />Үндсэн лавлах сан</CardTitle>
                <CardDescription>
                Системийн үндсэн үйл ажиллагаанд хэрэглэгдэх лавлах сангийн утгууд.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {referenceTables.map(table => (
                    <div key={table.name}>
                        <h3 className="font-semibold mb-2">{table.title}</h3>
                        <ReferenceTable 
                            collectionName={table.name}
                            itemData={table.data}
                            isLoading={table.isLoading}
                            columns={table.columns}
                            dialogTitle={table.title}
                            enableFieldDefs={table.enableFieldDefs}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>

        <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="size-5" />Анкетын лавлах сан</CardTitle>
                <CardDescription>
                    Ажилтны анкетын сонголтот талбаруудад ашиглагдах лавлах сангийн утгууд.
                </CardDescription>
            </CardHeader>
             <CardContent className="space-y-8">
                {questionnaireReferenceTables.map(table => (
                        <div key={table.name}>
                            <h3 className="font-semibold mb-2">{table.title}</h3>
                            <ReferenceTable 
                                collectionName={table.name}
                                itemData={table.data}
                                isLoading={table.isLoading}
                                columns={table.columns}
                                dialogTitle={table.title}
                            />
                        </div>
                    ))}
            </CardContent>
        </Card>

    </div>
  );
}
