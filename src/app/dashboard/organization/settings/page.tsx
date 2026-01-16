'use client';

import { PageHeader } from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Briefcase, FileText, Layers, Tag, Zap } from 'lucide-react';
import { LookupManagement } from './components/lookup-management';
import { OrganizationActionSettings } from './components/organization-action-settings';

export default function OrganizationSettingsPage() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-6 md:p-8 space-y-8 pb-32 w-full">
                <PageHeader
                    title="Бүтэц, Ажлын байрны тохиргоо"
                    description="Байгууллагын бүтэц, албан тушаалтай холбоотой үндсэн тохиргоонууд."
                    showBackButton
                    backHref="/dashboard/organization"
                />

                <Tabs defaultValue="dept-types" className="w-full">
                    <TabsList className="bg-muted/50 p-1 rounded-xl w-full justify-start h-auto flex-wrap">
                        <TabsTrigger value="dept-types" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                            <Building2 className="w-4 h-4" />
                            Бүтцийн нэгжийн төрөл
                        </TabsTrigger>
                        <TabsTrigger value="job-categories" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                            <Layers className="w-4 h-4" />
                            Ажил мэргэжлийн код
                        </TabsTrigger>
                        <TabsTrigger value="levels" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                            <Tag className="w-4 h-4" />
                            Зэрэглэл
                        </TabsTrigger>
                        <TabsTrigger value="emp-types" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                            <FileText className="w-4 h-4" />
                            Ажлын байрны төрөл
                        </TabsTrigger>
                        <TabsTrigger value="actions" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 py-2">
                            <Zap className="w-4 h-4" />
                            Үйлдэл
                        </TabsTrigger>
                    </TabsList>

                    <div className="mt-8">
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
                            />
                        </TabsContent>

                        <TabsContent value="levels" className="space-y-4 focus-visible:outline-none">
                            <LookupManagement
                                collectionName="positionLevels"
                                title="Ажлын байрны зэрэглэл"
                                description="Албан тушаалын зэрэглэлүүд."
                                columns={[
                                    { key: 'name', label: 'Нэр', type: 'text', required: true, width: '60%' },
                                    { key: 'level', label: 'Эрэмбэ (Optional)', type: 'number', width: '20%' }
                                ]}
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
                            />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
