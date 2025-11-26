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
import { Loader2, Save, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

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

        if (initialData.prefix || initialData.nextNumber > 1) { 
            updateDocumentNonBlocking(codeConfigRef, data);
        } else {
            setDocumentNonBlocking(codeConfigRef, data, { merge: true });
        }
        
        toast({
            title: 'Амжилттай хадгаллаа',
            description: 'Ажилтны кодчлолын тохиргоо шинэчлэгдлээ.',
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="prefix"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Угтвар үсэг</FormLabel>
                                <FormControl>
                                    <Input placeholder="EMP" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="digitCount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Тооны орон</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="4" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="nextNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Эхлэх дугаар</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="1" {...field} />
                                </FormControl>
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
                     <Button asChild type="button" variant="outline" disabled={isSubmitting}>
                        <Link href="/dashboard/settings/code-log">
                           <History className="mr-2 h-4 w-4" />
                           Түүх харах
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

export default function SettingsPage() {
  const { firestore } = useFirebase();

  // Data hooks for each reference collection
  const { data: documentTypes, isLoading: loadingDocTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'documentTypes') : null, [firestore]));
  const { data: employmentTypes, isLoading: loadingEmpTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'employmentTypes') : null, [firestore]));
  const { data: positionStatuses, isLoading: loadingStatuses } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'positionStatuses') : null, [firestore]));
  const { data: jobCategories, isLoading: loadingJobCategories } = useCollection<JobCategoryReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'jobCategories') : null, [firestore]));
  const { data: positionLevels, isLoading: loadingLevels } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'positionLevels') : null, [firestore]));

  // Questionnaire references
  const { data: questionnaireCountries, isLoading: loadingCountries } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireCountries') : null, [firestore]));
  const { data: questionnaireSchools, isLoading: loadingSchools } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireSchools') : null, [firestore]));
  const { data: questionnaireDegrees, isLoading: loadingDegrees } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireDegrees') : null, [firestore]));
  const { data: questionnaireAcademicRanks, isLoading: loadingRanks } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireAcademicRanks') : null, [firestore]));
  const { data: questionnaireLanguages, isLoading: loadingLanguages } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireLanguages') : null, [firestore]));
  const { data: questionnaireFamilyRelationships, isLoading: loadingFamilyR } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireFamilyRelationships') : null, [firestore]));
  const { data: questionnaireEmergencyRelationships, isLoading: loadingEmergencyR } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireEmergencyRelationships') : null, [firestore]));
  const { data: questionnaireEmploymentTypes, isLoading: loadingQuestionnaireEmpTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireEmploymentTypes') : null, [firestore]));


  return (
    <div className="py-8">
       <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Тохиргоо
          </h1>
          <p className="text-muted-foreground">
            Системийн ерөнхий тохиргоо болон лавлах сангуудыг удирдах.
          </p>
        </div>
      </div>
      <div className="space-y-8">
        <EmployeeCodeConfigCard />

        <Card>
            <CardHeader>
                <CardTitle>Анкетын лавлах сан</CardTitle>
                <CardDescription>Ажилтны анкетын сонголтуудыг эндээс удирдна.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 <ReferenceTable 
                    collectionName="questionnaireCountries"
                    columns={[{ key: 'name', header: 'Улс' }]}
                    itemData={questionnaireCountries}
                    isLoading={loadingCountries}
                    dialogTitle="Улсын нэр"
                    />
                <ReferenceTable 
                    collectionName="questionnaireSchools"
                    columns={[{ key: 'name', header: 'Сургууль' }]}
                    itemData={questionnaireSchools}
                    isLoading={loadingSchools}
                    dialogTitle="Сургуулийн нэр"
                    />
                <ReferenceTable 
                    collectionName="questionnaireDegrees"
                    columns={[{ key: 'name', header: 'Мэргэжил' }]}
                    itemData={questionnaireDegrees}
                    isLoading={loadingDegrees}
                    dialogTitle="Мэргэжлийн нэр"
                    />
                <ReferenceTable 
                    collectionName="questionnaireAcademicRanks"
                    columns={[{ key: 'name', header: 'Зэрэг, цол' }]}
                    itemData={questionnaireAcademicRanks}
                    isLoading={loadingRanks}
                    dialogTitle="Эрдмийн зэрэг, цол"
                    />
                <ReferenceTable 
                    collectionName="questionnaireLanguages"
                    columns={[{ key: 'name', header: 'Гадаад хэл' }]}
                    itemData={questionnaireLanguages}
                    isLoading={loadingLanguages}
                    dialogTitle="Гадаад хэлний нэр"
                    />
                <ReferenceTable 
                    collectionName="questionnaireFamilyRelationships"
                    columns={[{ key: 'name', header: 'Гэр бүлийн хамаарал' }]}
                    itemData={questionnaireFamilyRelationships}
                    isLoading={loadingFamilyR}
                    dialogTitle="Гэр бүлийн гишүүний хамаарал"
                    />
                <ReferenceTable 
                    collectionName="questionnaireEmergencyRelationships"
                    columns={[{ key: 'name', header: 'Яаралтай үеийн хамаарал' }]}
                    itemData={questionnaireEmergencyRelationships}
                    isLoading={loadingEmergencyR}
                    dialogTitle="Яаралтай үед холбоо барих хүний хамаарал"
                    />
                <ReferenceTable 
                    collectionName="questionnaireEmploymentTypes"
                    columns={[{ key: 'name', header: 'Хөдөлмөрийн нөхцөл' }]}
                    itemData={questionnaireEmploymentTypes}
                    isLoading={loadingQuestionnaireEmpTypes}
                    dialogTitle="Ажлын туршлагын хөдөлмөрийн нөхцөл"
                    />
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Баримт бичгийн төрөл</CardTitle>
                    <CardDescription>Хөдөлмөрийн гэрээ, дотоод журам гэх мэт төрлүүдийг удирдах.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ReferenceTable 
                    collectionName="documentTypes"
                    columns={[{ key: 'name', header: 'Нэр' }]}
                    itemData={documentTypes}
                    isLoading={loadingDocTypes}
                    dialogTitle="Баримт бичгийн төрөл"
                    />
                </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Ажил эрхлэлтийн төрөл</CardTitle>
                <CardDescription>Үндсэн, гэрээт, цагийн гэх мэт төрлүүдийг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                collectionName="employmentTypes"
                columns={[{ key: 'name', header: 'Нэр' }]}
                itemData={employmentTypes}
                isLoading={loadingEmpTypes}
                dialogTitle="Ажил эрхлэлтийн төрөл"
                />
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Ажлын байрны зэрэглэл</CardTitle>
                <CardDescription>Удирдах, ахлах, мэргэжилтэн гэх мэт зэрэглэлүүдийг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                collectionName="positionLevels"
                columns={[{ key: 'name', header: 'Нэр' }]}
                itemData={positionLevels}
                isLoading={loadingLevels}
                dialogTitle="Албан тушаалын зэрэглэл"
                />
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Ажлын байрны төлөв</CardTitle>
                <CardDescription>Нээлттэй, хаалттай гэх мэт төлвүүдийг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                collectionName="positionStatuses"
                columns={[{ key: 'name', header: 'Нэр' }]}
                itemData={positionStatuses}
                isLoading={loadingStatuses}
                dialogTitle="Ажлын байрны төлөв"
                />
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Ажил мэргэжлийн ангилал (ҮАМАТ)</CardTitle>
                <CardDescription>Үндэсний ажил мэргэжлийн ангилал, тодорхойлолтын кодыг удирдах.</CardDescription>
            </CardHeader>
            <CardContent>
                <ReferenceTable 
                collectionName="jobCategories"
                columns={[{ key: 'code', header: 'Код' }, { key: 'name', header: 'Нэр' }]}
                itemData={jobCategories}
                isLoading={loadingJobCategories}
                dialogTitle="Ажил мэргэжлийн ангилал"
                />
            </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
