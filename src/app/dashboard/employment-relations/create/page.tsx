'use client';

import React, { useState, useMemo } from 'react';
import { useCollection, useFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { ERDocumentType, ERTemplate } from '../types';
import { Employee } from '@/types'; // Import main Employee type if needed, or define locally if specific
import { generateDocumentContent } from '../utils';
import { ERDocument } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check, FileText, User, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Simple Stepper UI
const Steps = ({ current }: { current: number }) => {
    const steps = ['Төрөл сонгох', 'Загвар сонгох', 'Ажилтан сонгох', 'Баталгаажуулах'];
    return (
        <div className="flex items-center justify-between gap-4 mb-8">
            {steps.map((step, index) => {
                const isActive = index === current;
                const isCompleted = index < current;
                return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                            ${isActive ? 'bg-primary text-primary-foreground' :
                                isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                        `}>
                            {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                        </div>
                        <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                            {step}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default function CreateDocumentPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const [step, setStep] = useState(0);
    const [selectedType, setSelectedType] = useState<string>('');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employeeSearch, setEmployeeSearch] = useState('');

    // Queries
    const docTypesQuery = useMemo(() => firestore ? collection(firestore, 'er_document_types') : null, [firestore]);
    const templatesQuery = useMemo(() =>
        firestore && selectedType ? query(collection(firestore, 'er_templates'), where('documentTypeId', '==', selectedType), where('isActive', '==', true)) : null
        , [firestore, selectedType]);

    // NOTE: This assumes 'employees' collection exists and follows the schema in my head.
    // In a real scenario with algolia/elastic this would be better searching. 
    // For now simple client-side filter of top results or simple query.
    const employeesQuery = useMemo(() => firestore ? collection(firestore, 'employees') : null, [firestore]);

    const { data: docTypes } = useCollection<ERDocumentType>(docTypesQuery);
    const { data: templates } = useCollection<ERTemplate>(templatesQuery);
    const { data: employees } = useCollection<Employee>(employeesQuery);

    const filteredEmployees = useMemo(() => {
        if (!employees || !employeeSearch) return [];
        const term = employeeSearch.toLowerCase();
        return employees.filter(e =>
            e.firstName.toLowerCase().includes(term) ||
            e.lastName.toLowerCase().includes(term) ||
            e.employeeCode?.toLowerCase().includes(term)
        ).slice(0, 5); // Limit results
    }, [employees, employeeSearch]);

    const selectedTemplateData = useMemo(() => templates?.find(t => t.id === selectedTemplate), [templates, selectedTemplate]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    // Additional Queries for Dynamic Data
    const positionQuery = useMemo(() =>
        firestore && selectedEmployee?.positionId ? doc(firestore, 'positions', selectedEmployee.positionId) : null
        , [firestore, selectedEmployee]);

    const departmentQuery = useMemo(() =>
        firestore && selectedEmployee?.departmentId ? doc(firestore, 'departments', selectedEmployee.departmentId) : null
        , [firestore, selectedEmployee]);

    const questionnaireQuery = useMemo(() =>
        firestore && selectedEmployee?.id ? doc(firestore, `employees/${selectedEmployee.id}/questionnaire`, 'data') : null
        , [firestore, selectedEmployee]);

    const { data: positionData } = useDoc(positionQuery as any);
    const { data: departmentData } = useDoc(departmentQuery as any);
    const { data: questionnaireData } = useDoc(questionnaireQuery as any);


    const handleCreate = async () => {
        if (!firestore || !selectedType || !selectedTemplate || !selectedEmployee) return;

        try {
            // Basic substitution logic
            let content = selectedTemplateData?.content || '';

            // Use the centralized generator
            content = generateDocumentContent(content, {
                employee: selectedEmployee,
                position: positionData,
                department: departmentData,
                questionnaire: questionnaireData,
                system: {
                    user: 'CURRENT_USER_ID' // Placeholder
                }
            });

            const newDoc: Partial<ERDocument> = {
                documentTypeId: selectedType,
                templateId: selectedTemplate,
                employeeId: selectedEmployee.id,
                creatorId: 'CURRENT_USER_ID', // TODO: Get from auth context
                status: 'DRAFT',
                content: content,
                version: 1,
                metadata: {
                    employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
                    templateName: selectedTemplateData?.name
                },
                history: [{
                    stepId: 'CREATE',
                    action: 'CREATE',
                    actorId: 'CURRENT_USER_ID', // TODO
                    timestamp: Timestamp.now(),
                    comment: 'Баримт үүсгэсэн'
                }],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDocumentNonBlocking(collection(firestore, 'er_documents'), newDoc);

            if (docRef && docRef.id) {
                toast({ title: "Амжилттай", description: "Баримт амжилттай үүслээ" });
                router.push(`/dashboard/employment-relations/${docRef.id}`);
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Алдаа", description: "Баримт үүсгэхэд алдаа гарлаа", variant: "destructive" });
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="mb-6 flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/employment-relations">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-xl font-semibold">Шинэ баримт үүсгэх</h2>
                    <p className="text-sm text-muted-foreground">Алхам алхамаар баримт бүрдүүлэх</p>
                </div>
            </div>

            <Steps current={step} />

            <Card className="min-h-[400px] flex flex-col">
                <CardContent className="p-6 flex-1">
                    {step === 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Баримтын төрөл сонгох</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {docTypes?.map((type) => (
                                    <div
                                        key={type.id}
                                        onClick={() => setSelectedType(type.id)}
                                        className={`
                                            p-4 border rounded-lg cursor-pointer transition-all hover:border-primary
                                            ${selectedType === type.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'}
                                        `}
                                    >
                                        <div className="font-medium mb-1">{type.name}</div>
                                        <div className="text-sm text-muted-foreground line-clamp-2">{type.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Загвар сонгох</h3>
                            {templates?.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    Энэ төрөлд хамаарах идэвхтэй загвар олдсонгүй
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {templates?.map((tpl) => (
                                        <div
                                            key={tpl.id}
                                            onClick={() => setSelectedTemplate(tpl.id)}
                                            className={`
                                                flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:border-primary
                                                ${selectedTemplate === tpl.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-card'}
                                            `}
                                        >
                                            <FileText className="h-8 w-8 text-blue-500" />
                                            <div>
                                                <div className="font-medium">{tpl.name}</div>
                                                <div className="text-xs text-muted-foreground">v{tpl.version}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium">Ажилтан сонгох</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Ажилтны нэрээр хайх..."
                                    className="pl-9"
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                />
                            </div>

                            {employeeSearch && filteredEmployees.length > 0 && (
                                <div className="border rounded-lg divide-y">
                                    {filteredEmployees.map((emp) => (
                                        <div
                                            key={emp.id}
                                            onClick={() => { setSelectedEmployee(emp); setEmployeeSearch(`${emp.lastName} ${emp.firstName}`) }}
                                            className={`
                                                flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors
                                                ${selectedEmployee?.id === emp.id ? 'bg-primary/5' : ''}
                                            `}
                                        >
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User className="h-4 w-4 text-slate-500" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{emp.lastName} {emp.firstName}</div>
                                                <div className="text-xs text-muted-foreground">{emp.employeeCode} • {emp.jobTitle}</div>
                                            </div>
                                            {selectedEmployee?.id === emp.id && <Check className="ml-auto h-4 w-4 text-primary" />}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedEmployee && (
                                <div className="p-4 bg-muted rounded-lg flex items-start gap-4 mt-4">
                                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                                        <User className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Сонгогдсон ажилтан</div>
                                        <div className="text-sm">{selectedEmployee.lastName} {selectedEmployee.firstName}</div>
                                        <div className="text-xs text-muted-foreground mt-1">{selectedEmployee.jobTitle}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium">Баталгаажуулах</h3>
                            <div className="grid gap-4 p-4 border rounded-lg bg-slate-50/50">
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <span className="text-muted-foreground">Баримтын төрөл:</span>
                                    <span className="col-span-2 font-medium">{docTypes?.find(t => t.id === selectedType)?.name}</span>

                                    <span className="text-muted-foreground">Загвар:</span>
                                    <span className="col-span-2 font-medium">{selectedTemplateData?.name}</span>

                                    <span className="text-muted-foreground">Ажилтан:</span>
                                    <span className="col-span-2 font-medium">
                                        {selectedEmployee?.lastName} {selectedEmployee?.firstName}
                                    </span>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                "Үүсгэх" товчыг дарснаар баримт ноорог төлөвт үүсэх ба та засварлах цонх руу шилжих болно.
                            </div>
                        </div>
                    )}
                </CardContent>

                <div className="p-6 border-t flex justify-between bg-muted/20">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={step === 0}
                    >
                        Буцах
                    </Button>

                    {step < 3 ? (
                        <Button
                            onClick={handleNext}
                            disabled={
                                (step === 0 && !selectedType) ||
                                (step === 1 && !selectedTemplate) ||
                                (step === 2 && !selectedEmployee)
                            }
                        >
                            Дараах <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleCreate}>
                            <Check className="mr-2 h-4 w-4" />
                            Үүсгэх
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
