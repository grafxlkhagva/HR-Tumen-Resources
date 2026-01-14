'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp, collection } from 'firebase/firestore';
import { ERTemplate, ERDocumentType } from '../../../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TemplateBuilder } from '../../../components/template-builder';
import { useCollection } from '@/firebase';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function TemplateEditPage({ params }: PageProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    // Unwrap params using React.use()
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    const docRef = React.useMemo(() => firestore ? doc(firestore, 'er_templates', id) : null, [firestore, id]);
    const docTypesQuery = React.useMemo(() => firestore ? collection(firestore, 'er_document_types') : null, [firestore]);

    const { data: template, isLoading } = useDoc<ERTemplate>(docRef);
    const { data: docTypes } = useCollection<ERDocumentType>(docTypesQuery);

    const [form, setForm] = useState<Partial<ERTemplate>>({
        name: '',
        documentTypeId: '',
        content: ''
    });

    useEffect(() => {
        if (template) {
            setForm({
                name: template.name,
                documentTypeId: template.documentTypeId,
                content: template.content || ''
            });
        }
    }, [template]);

    const handleSave = async () => {
        if (!firestore || !template) return;

        try {
            // Simple logic to extract fields: find all {{...}} patterns
            const regex = /{{(.*?)}}/g;
            const matches = form.content?.match(regex) || [];
            const requiredFields = matches.map(m => m.replace('{{', '').replace('}}', '').trim());
            const uniqueFields = Array.from(new Set(requiredFields));

            await updateDocumentNonBlocking(docRef!, {
                ...form,
                requiredFields: uniqueFields,
                updatedAt: Timestamp.now()
            });
            toast({ title: "Амжилттай", description: "Загвар хадгалагдлаа" });
        } catch (error) {
            toast({ title: "Алдаа", description: "Хадгалахад алдаа гарлаа", variant: "destructive" });
        }
    };

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!template) return <div className="p-8">Template not found</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex items-center gap-4 shrink-0">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/employment-relations/settings/templates">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-xl font-semibold">{template.name}</h2>
                    <p className="text-sm text-muted-foreground">v{template.version}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Хадгалах
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="space-y-2">
                    <Label htmlFor="name">Нэр</Label>
                    <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Баримтын төрөл</Label>
                    <Select
                        value={form.documentTypeId}
                        onValueChange={(val) => setForm({ ...form, documentTypeId: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {docTypes?.map((type) => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <TemplateBuilder
                    content={form.content || ''}
                    onChange={(val) => setForm({ ...form, content: val })}
                />
            </div>
        </div>
    );
}
