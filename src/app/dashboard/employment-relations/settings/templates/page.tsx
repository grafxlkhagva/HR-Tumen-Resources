'use client';

import React, { useState } from 'react';
import { useCollection, useFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { ERTemplate, ERDocumentType } from '../../types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, PenTool, Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function TemplatesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newTemplateForm, setNewTemplateForm] = useState({ name: '', documentTypeId: '' });

    const templatesQuery = React.useMemo(() =>
        firestore ? query(collection(firestore, 'er_templates'), orderBy('name')) : null
        , [firestore]);

    const docTypesQuery = React.useMemo(() => firestore ? collection(firestore, 'er_document_types') : null, [firestore]);

    const { data: templates, isLoading } = useCollection<ERTemplate>(templatesQuery);
    const { data: docTypes } = useCollection<ERDocumentType>(docTypesQuery);

    const docTypeMap = React.useMemo(() => {
        return docTypes?.reduce((acc, type) => ({ ...acc, [type.id]: type.name }), {} as Record<string, string>) || {};
    }, [docTypes]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;

        try {
            const docRef = await addDocumentNonBlocking(collection(firestore, 'er_templates'), {
                ...newTemplateForm,
                content: '',
                requiredFields: [],
                version: 1,
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            toast({ title: "Амжилттай", description: "Шинэ загвар үүсгэгдлээ" });
            setIsCreateDialogOpen(false);
            setNewTemplateForm({ name: '', documentTypeId: '' });

            // Redirect to builder
            // window.location.href = `/dashboard/employment-relations/settings/templates/${docRef.id}`;
        } catch (error) {
            toast({ title: "Алдаа", description: "Үйлдэл амжилтгүй боллоо", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Та энэ загварыг устгахдаа итгэлтэй байна уу?')) return;
        if (!firestore) return;

        try {
            await deleteDocumentNonBlocking(collection(firestore, 'er_templates'), id);
            toast({ title: "Амжилттай", description: "Устгагдлаа" });
        } catch (error) {
            toast({ title: "Алдаа", description: "Устгахад алдаа гарлаа", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Загварууд (Templates)</h3>
                    <p className="text-sm text-muted-foreground">Баримт бичгийн загваруудыг үүсгэх, засах</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Шинэ загвар
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Нэр</TableHead>
                            <TableHead>Төрөл</TableHead>
                            <TableHead>Хувилбар</TableHead>
                            <TableHead>Төлөв</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {templates?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Одоогоор загвар үүсгэглээгүй байна
                                </TableCell>
                            </TableRow>
                        )}
                        {templates?.map((template) => (
                            <TableRow key={template.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <PenTool className="h-4 w-4 text-orange-500" />
                                        {template.name}
                                    </div>
                                </TableCell>
                                <TableCell>{docTypeMap[template.documentTypeId] || 'Тодорхойгүй'}</TableCell>
                                <TableCell className="font-mono text-xs">v{template.version}</TableCell>
                                <TableCell>
                                    {template.isActive ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Идэвхтэй</Badge>
                                    ) : (
                                        <Badge variant="outline">Идэвхгүй</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/employment-relations/settings/templates/${template.id}`}>
                                                Засах
                                                <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                                            <Trash2 className="h-4 w-4 text-rose-500" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Шинэ загвар үүсгэх</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Нэр</Label>
                            <Input
                                id="name"
                                required
                                value={newTemplateForm.name}
                                onChange={(e) => setNewTemplateForm({ ...newTemplateForm, name: e.target.value })}
                                placeholder="Жишээ: Хөдөлмөрийн гэрээ 2024"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">Баримтын төрөл</Label>
                            <Select
                                value={newTemplateForm.documentTypeId}
                                onValueChange={(val) => setNewTemplateForm({ ...newTemplateForm, documentTypeId: val })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Төрөл сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {docTypes?.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Цуцлах</Button>
                            <Button type="submit">Үүсгэх</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
