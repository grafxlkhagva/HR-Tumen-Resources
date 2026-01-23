'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "@/components/ui/reference-table";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Button } from '@/components/ui/button';

type SimpleReferenceItem = ReferenceItem & { name: string };
type JobCategoryReferenceItem = ReferenceItem & { name: string; code: string };


export default function QuestionnaireSettingsPage() {
    const { data: questionnaireCountries, isLoading: loadingCountries } = useCollection<SimpleReferenceItem>(useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'questionnaireCountries') : null, []));
    const { data: questionnaireSchools, isLoading: loadingSchools } = useCollection<SimpleReferenceItem>(useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'questionnaireSchools') : null, []));
    const { data: questionnaireDegrees, isLoading: loadingDegrees } = useCollection<SimpleReferenceItem>(useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'questionnaireDegrees') : null, []));
    const { data: questionnaireAcademicRanks, isLoading: loadingRanks } = useCollection<SimpleReferenceItem>(useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'questionnaireAcademicRanks') : null, []));
    const { data: questionnaireLanguages, isLoading: loadingLanguages } = useCollection<SimpleReferenceItem>(useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'questionnaireLanguages') : null, []));
    const { data: questionnaireFamilyRelationships, isLoading: loadingFamilyR } = useCollection<SimpleReferenceItem>(useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'questionnaireFamilyRelationships') : null, []));
    const { data: questionnaireEmergencyRelationships, isLoading: loadingEmergencyR } = useCollection<SimpleReferenceItem>(useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'questionnaireEmergencyRelationships') : null, []));
    const { data: questionnaireEmploymentTypes, isLoading: loadingQuestionnaireEmpTypes } = useCollection<SimpleReferenceItem>(useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'questionnaireEmploymentTypes') : null, []));
    const { data: jobCategories, isLoading: loadingJobCategories } = useCollection<JobCategoryReferenceItem>(useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'jobCategories') : null, []));

    return (
        <div className="space-y-8 ">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Анкетын тохиргоо</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    Ажилтны анкетын сонголттой талбаруудыг эндээс удирдна. Сургууль, мэргэжил, хэлний мэдлэг зэрэг лавлах сангуудыг засах боломжтой.
                </p>
            </div>

            <Card className="shadow-premium border-slate-200/60 overflow-hidden">
                <CardContent className="space-y-12 p-8">
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800 border-l-4 border-primary pl-4">Үндсэн лавлах</h3>
                        <div className="space-y-8">
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
                                collectionName="questionnaireLanguages"
                                columns={[{ key: 'name', header: 'Гадаад хэл' }]}
                                itemData={questionnaireLanguages}
                                isLoading={loadingLanguages}
                                dialogTitle="Гадаад хэлний нэр"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800 border-l-4 border-indigo-500 pl-4">Хамаарал ба Төлөв</h3>
                        <div className="space-y-8">
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
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800 border-l-4 border-amber-500 pl-4">Боловсрол ба Ангилал</h3>
                        <div className="space-y-8">
                            <ReferenceTable
                                collectionName="questionnaireAcademicRanks"
                                columns={[{ key: 'name', header: 'Зэрэг, цол' }]}
                                itemData={questionnaireAcademicRanks}
                                isLoading={loadingRanks}
                                dialogTitle="Эрдмийн зэрэг, цол"
                            />
                            <ReferenceTable
                                collectionName="jobCategories"
                                columns={[{ key: 'code', header: 'Код' }, { key: 'name', header: 'Нэр' }]}
                                itemData={jobCategories}
                                isLoading={loadingJobCategories}
                                dialogTitle="Ажил мэргэжлийн ангилал"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
