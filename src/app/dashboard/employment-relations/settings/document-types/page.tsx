'use client';

import React, { useState } from 'react';
import { useCollection, useFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { ERDocumentType, ERWorkflow } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DocumentTypesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingType, setEditingType] = useState<ERDocumentType | null>(null);
    const [formData, setFormData] = useState({ name: '' });

    const typesQuery = React.useMemo(() =>
        firestore ? query(collection(firestore, 'er_document_types'), orderBy('name')) : null
        , [firestore]);

    const { data: docTypes, isLoading } = useCollection<ERDocumentType>(typesQuery);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;

        try {
            const dataToSave = {
                ...formData,
                updatedAt: Timestamp.now()
            };

            if (editingType) {
                await updateDocumentNonBlocking(doc(firestore, 'er_document_types', editingType.id), dataToSave);
                toast({ title: "Амжилттай", description: "Баримтын төрөл шинэчлэгдлээ" });
            } else {
                await addDocumentNonBlocking(collection(firestore, 'er_document_types'), {
                    ...dataToSave,
                    createdAt: Timestamp.now()
                });
                toast({ title: "Амжилттай", description: "Шинэ төрөл үүсгэгдлээ" });
            }
            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            toast({ title: "Алдаа", description: "Үйлдэл амжилтгүй боллоо", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Та энэ төрлийг устгахдаа итгэлтэй байна уу?')) return;
        if (!firestore) return;

        try {
            await deleteDocumentNonBlocking(doc(firestore, 'er_document_types', id));
            toast({ title: "Амжилттай", description: "Устгагдлаа" });
        } catch (error) {
            toast({ title: "Алдаа", description: "Устгахад алдаа гарлаа", variant: "destructive" });
        }
    };

    const openEdit = (type: ERDocumentType) => {
        setEditingType(type);
        setFormData({ name: type.name });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingType(null);
        setFormData({ name: '' });
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Баримт бичгийн төрөл</h3>
                    <p className="text-sm text-muted-foreground">Системд ашиглагдах баримтын төрлүүдийг удирдах</p>
                </div>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Шинэ төрөл
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Нэр</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {docTypes?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                    Одоогоор бүртгэл байхгүй байна
                                </TableCell>
                            </TableRow>
                        )}
                        {docTypes?.map((type) => (
                            <TableRow key={type.id}>
                                <TableCell className="font-medium">{type.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(type)}>
                                            <Pencil className="h-4 w-4 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(type.id)}>
                                            <Trash2 className="h-4 w-4 text-rose-500" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingType ? 'Төрөл засах' : 'Шинэ төрөл үүсгэх'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Нэр</Label>
                            <Input
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Жишээ: Хөдөлмөрийн гэрээ"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Цуцлах</Button>
                            <Button type="submit">{editingType ? 'Хадгалах' : 'Үүсгэх'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
