'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "../reference-table";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type SimpleReferenceItem = ReferenceItem & { name: string };
type JobCategoryReferenceItem = ReferenceItem & { name: string; code: string };


export default function QuestionnaireSettingsPage() {
  const { firestore } = useFirebase();

  const { data: questionnaireCountries, isLoading: loadingCountries } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireCountries') : null, [firestore]));
  const { data: questionnaireSchools, isLoading: loadingSchools } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireSchools') : null, [firestore]));
  const { data: questionnaireDegrees, isLoading: loadingDegrees } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireDegrees') : null, [firestore]));
  const { data: questionnaireAcademicRanks, isLoading: loadingRanks } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireAcademicRanks') : null, [firestore]));
  const { data: questionnaireLanguages, isLoading: loadingLanguages } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireLanguages') : null, [firestore]));
  const { data: questionnaireFamilyRelationships, isLoading: loadingFamilyR } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireFamilyRelationships') : null, [firestore]));
  const { data: questionnaireEmergencyRelationships, isLoading: loadingEmergencyR } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireEmergencyRelationships') : null, [firestore]));
  const { data: questionnaireEmploymentTypes, isLoading: loadingQuestionnaireEmpTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'questionnaireEmploymentTypes') : null, [firestore]));
  const { data: jobCategories, isLoading: loadingJobCategories } = useCollection<JobCategoryReferenceItem>(useMemoFirebase(() => firestore ? collection(firestore, 'jobCategories') : null, [firestore]));

  return (
    <div className="py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/dashboard/settings/general">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Буцах</span>
                </Link>
            </Button>
            <div>
                 <h1 className="text-3xl font-bold tracking-tight">Анкетын тохиргоо</h1>
                <p className="text-muted-foreground">Ажилтны анкетын сонголттой талбаруудыг эндээс удирдна.</p>
            </div>
        </div>
      </div>
      <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Анкетын лавлах сангууд</CardTitle>
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
  );
}
