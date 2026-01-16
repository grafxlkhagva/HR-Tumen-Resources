'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc, getDocs, getDoc } from 'firebase/firestore';
import { ERDocumentType, ERTemplate, ERDocument } from '../types';
import { Employee } from '@/types';
import { generateDocumentContent } from '../utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, ArrowRight, Check, FileText, User, Search,
    Loader2, ChevronRight, Home, Layout, FilePlus, Users, Wand2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function CreateDocumentPage() {
    const { firestore, user: firebaseUser } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const [selectedType, setSelectedType] = useState<string>('');
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employeeSearch, setEmployeeSearch] = useState('');

    const searchParams = useSearchParams();
    const qEmployeeId = searchParams.get('employeeId');
    const qWorkflowId = searchParams.get('workflowId');

    // Pre-fill logic
    useEffect(() => {
        if (!firestore) return;
        const prefill = async () => {
            if (qEmployeeId) {
                const empDoc = await getDoc(doc(firestore, 'employees', qEmployeeId));
                if (empDoc.exists()) {
                    setSelectedEmployee({ id: empDoc.id, ...empDoc.data() } as Employee);
                }
            }
            if (qWorkflowId) {
                const typeQuery = query(collection(firestore, 'er_document_types'), where('workflowId', '==', qWorkflowId));
                const typeSnap = await getDocs(typeQuery);
                if (!typeSnap.empty) setSelectedType(typeSnap.docs[0].id);
            }
        };
        prefill();
    }, [firestore, qEmployeeId, qWorkflowId]);

    const docTypesQuery = useMemo(() => firestore ? collection(firestore, 'er_document_types') : null, [firestore]);
    const templatesQuery = useMemo(() =>
        firestore && selectedType ? query(collection(firestore, 'er_templates'), where('documentTypeId', '==', selectedType), where('isActive', '==', true)) : null
        , [firestore, selectedType]);
    const employeesQuery = useMemo(() => firestore ? collection(firestore, 'employees') : null, [firestore]);

    const { data: docTypes } = useCollection<ERDocumentType>(docTypesQuery);
    const { data: templates } = useCollection<ERTemplate>(templatesQuery);
    const { data: employees } = useCollection<Employee>(employeesQuery);

    const filteredEmployees = useMemo(() => {
        if (!employees || !employeeSearch) return [];
        const term = employeeSearch.toLowerCase();
        return employees.filter(e =>
            e.firstName.toLowerCase().includes(term) ||
            e.lastName.toLowerCase().includes(term)
        ).slice(0, 5);
    }, [employees, employeeSearch]);

    const selectedTemplateData = useMemo(() => templates?.find(t => t.id === selectedTemplate), [templates, selectedTemplate]);

    const handleCreate = async () => {
        if (!firestore || !selectedType || !selectedTemplate || !selectedEmployee) {
            toast({ title: "Дутуу мэдээлэл", description: "Бүх талбарыг сонгоно уу", variant: "destructive" });
            return;
        }

        try {
            // Generate content
            // Assuming generating logic is handled or initial standard content is used
            let content = selectedTemplateData?.content || '';
            // We can do improved generation in the next step (Document Detail) or here.
            // For now simple generation:
            // Note: generateDocumentContent needs to be imported or logic moved.
            // Assume generateDocumentContent is available in utils as per import.

            const newDoc: Partial<ERDocument> = {
                documentTypeId: selectedType,
                templateId: selectedTemplate,
                employeeId: selectedEmployee.id,
                creatorId: firebaseUser?.uid || 'SYSTEM',
                status: 'DRAFT',
                content: content, // Initial raw content
                version: 1,
                printSettings: selectedTemplateData?.printSettings,
                metadata: {
                    employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
                    templateName: selectedTemplateData?.name
                },
                history: [{
                    stepId: 'CREATE',
                    action: 'CREATE',
                    actorId: firebaseUser?.uid || 'SYSTEM',
                    timestamp: Timestamp.now(),
                    comment: 'Баримт төлөвлөж эхлэв'
                }],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDocumentNonBlocking(collection(firestore, 'er_documents'), newDoc);
            toast({ title: "Амжилттай", description: "Баримт үүслээ. Төлөвлөх хэсэг рүү шилжиж байна." });
            router.push(`/dashboard/employment-relations/${docRef.id}`);

        } catch (error) {
            console.error(error);
            toast({ title: "Алдаа", description: "Баримт үүсгэхэд алдаа гарлаа", variant: "destructive" });
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 p-6 md:p-8 space-y-8 overflow-y-auto">
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Link href="/dashboard/employment-relations" className="hover:text-primary">
                    Процесс удирдлага
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground font-medium">Шинэ процесс эхлүүлэх</span>
            </nav>

            <div className="max-w-4xl mx-auto w-full space-y-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Шинэ процесс эхлүүлэх</h1>
                    <p className="text-muted-foreground">Баримтын загвар болон ажилтнаа сонгоод "Төлөвлөх" үе шатыг эхлүүлнэ үү.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Col: Setup */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-md bg-white">
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">1. Баримтын төрөл</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {docTypes?.map(type => (
                                            <div
                                                key={type.id}
                                                onClick={() => setSelectedType(type.id)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedType === type.id ? 'bg-primary/5 border-primary text-primary' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="font-medium text-sm">{type.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {selectedType && (
                                    <div className="space-y-2 animate-in fade-in">
                                        <label className="text-sm font-medium text-slate-700">2. Загвар сонгох</label>
                                        <div className="space-y-2">
                                            {templates?.length === 0 && <p className="text-xs text-muted-foreground">Энэ төрөлд загвар алга.</p>}
                                            {templates?.map(tpl => (
                                                <div
                                                    key={tpl.id}
                                                    onClick={() => setSelectedTemplate(tpl.id)}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${selectedTemplate === tpl.id ? 'bg-primary/5 border-primary ring-1 ring-primary/20' : 'hover:bg-slate-50'}`}
                                                >
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm font-medium">{tpl.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">3. Ажилтан сонгох</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Хайх..."
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    {filteredEmployees.length > 0 && (
                                        <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                                            {filteredEmployees.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => { setSelectedEmployee(emp); setEmployeeSearch(`${emp.lastName} ${emp.firstName}`) }}
                                                    className="p-2 text-sm hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                                >
                                                    <span>{emp.lastName} {emp.firstName}</span>
                                                    {selectedEmployee?.id === emp.id && <Check className="h-3 w-3 text-primary" />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedEmployee && (
                                        <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3 border">
                                            <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center font-bold text-xs">
                                                {selectedEmployee.firstName.charAt(0)}
                                            </div>
                                            <div className="text-sm font-medium">{selectedEmployee.lastName} {selectedEmployee.firstName}</div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Col: Summary & Action */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-xl bg-slate-900 text-white h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <CardContent className="p-8 flex flex-col h-full relative z-10">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Layout className="h-5 w-5 text-primary" /> Хураангуй
                                </h3>

                                <div className="space-y-6 flex-1">
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Төрөл</div>
                                        <div className="font-medium text-lg">{docTypes?.find(t => t.id === selectedType)?.name || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Загвар</div>
                                        <div className="font-medium text-lg">{selectedTemplateData?.name || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Ажилтан</div>
                                        <div className="font-medium text-lg">{selectedEmployee ? `${selectedEmployee.lastName} ${selectedEmployee.firstName}` : '-'}</div>
                                    </div>
                                </div>

                                <Button
                                    size="lg"
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl mt-8"
                                    disabled={!selectedType || !selectedTemplate || !selectedEmployee}
                                    onClick={handleCreate}
                                >
                                    Процесс эхлүүлэх <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
