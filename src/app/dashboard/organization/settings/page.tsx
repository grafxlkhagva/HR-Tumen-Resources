'use client';

import { PageHeader } from '@/components/patterns/page-layout';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Building2, Briefcase, FileText, Layers, Tag, Zap } from 'lucide-react';
import { LookupManagement } from './components/lookup-management';
import { OrganizationActionSettings } from './components/organization-action-settings';
import { PositionPreparationSettings } from './components/position-preparation-settings';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';

export default function OrganizationSettingsPage() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-6 md:p-8 space-y-8 pb-32 w-full">
                <PageHeader
                    title="Бүтэц, Ажлын байрны тохиргоо"
                    description="Байгууллагын бүтэц, албан тушаалтай холбоотой үндсэн тохиргоонууд."
                    showBackButton={true}
                    hideBreadcrumbs={true}
                    backButtonPlacement="inline"
                    backBehavior="history"
                    fallbackBackHref="/dashboard/organization"
                />

                <Tabs defaultValue="dept-types" className="w-full">
                    <div className="mb-6">
                        <VerticalTabMenu
                            orientation="horizontal"
                            items={[
                                { value: 'dept-types', label: 'Бүтцийн нэгжийн төрөл' },
                                { value: 'job-categories', label: 'Ажил мэргэжлийн код' },
                                { value: 'levels', label: 'Зэрэглэл' },
                                { value: 'emp-types', label: 'Ажлын байрны төрөл' },
                                { value: 'actions', label: 'Үйлдэл' },
                                { value: 'position-prep', label: 'Ажлын байр бэлтгэх' },
                            ]}
                        />
                    </div>

                    <div>
                        <TabsContent value="actions" className="space-y-4 focus-visible:outline-none">
                            <OrganizationActionSettings />
                        </TabsContent>
                        <TabsContent value="dept-types" className="space-y-4 focus-visible:outline-none">
                            <LookupManagement
                                collectionName="departmentTypes"
                                title="Бүтцийн нэгжийн төрөл"
                                description="Компанийн бүтцийн түвшин (Жишээ нь: Газар, Хэлтэс, Алба)"
                                columns={[
                                    { key: 'name', label: 'Нэр', type: 'text', required: true, width: '40%' },
                                    { key: 'level', label: 'Түвшин (Level)', type: 'number', required: true, width: '20%', defaultValue: 0 }
                                ]}
                                aiGenerationType="departmentTypes"
                                sortBy={{ key: 'level', direction: 'asc' }}
                                referenceCheck={{
                                    collection: 'departments',
                                    field: 'typeId',
                                    nameField: 'typeName',
                                    label: 'нэгж'
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="job-categories" className="space-y-4 focus-visible:outline-none">
                            <LookupManagement
                                collectionName="jobCategories"
                                title="Ажил мэргэжлийн код (ЯАМАТ)"
                                description="Үндэсний ажил мэргэжлийн ангилал, код."
                                columns={[
                                    { key: 'code', label: 'Код', type: 'text', required: true, width: '20%' },
                                    { key: 'name', label: 'Нэр', type: 'text', required: true, width: '40%' }
                                ]}
                                referenceCheck={{
                                    collection: 'positions',
                                    field: 'jobCategoryId',
                                    label: 'ажлын байр'
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="levels" className="space-y-4 focus-visible:outline-none">
                            <LookupManagement
                                collectionName="positionLevels"
                                title="Ажлын байрны зэрэглэл"
                                description="Албан тушаалын зэрэглэлүүд."
                                columns={[
                                    { key: 'name', label: 'Нэр', type: 'text', required: true, width: '60%' },
                                    { key: 'level', label: 'Эрэмбэ', type: 'number', width: '20%' }
                                ]}
                                aiGenerationType="positionLevels"
                                sortBy={{ key: 'level', direction: 'asc' }}
                                referenceCheck={{
                                    collection: 'positions',
                                    field: 'levelId',
                                    label: 'ажлын байр'
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="emp-types" className="space-y-4 focus-visible:outline-none">
                            <LookupManagement
                                collectionName="employmentTypes"
                                title="Ажлын байрны төрөл"
                                description="Ажлын байрны төрлүүд (Үндсэн, Гэрээт, Туршилт г.м)."
                                columns={[
                                    { key: 'name', label: 'Нэр', type: 'text', required: true, width: '80%' }
                                ]}
                                aiGenerationType="employmentTypes"
                                referenceCheck={{
                                    collection: 'positions',
                                    field: 'employmentTypeId',
                                    label: 'ажлын байр'
                                }}
                            />
                        </TabsContent>

                        <TabsContent value="position-prep" className="space-y-4 focus-visible:outline-none">
                            <PositionPreparationSettings />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
