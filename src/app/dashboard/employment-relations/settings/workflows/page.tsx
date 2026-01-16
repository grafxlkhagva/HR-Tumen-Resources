'use client';

import React, { useState } from 'react';
import { useCollection, useFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { ERWorkflow } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, GitBranch, Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function WorkflowsPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const workflowsQuery = React.useMemo(() =>
        firestore ? query(collection(firestore, 'er_workflows'), orderBy('name')) : null
        , [firestore]);

    const { data: workflows, isLoading } = useCollection<ERWorkflow>(workflowsQuery);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;

        try {
            // Create with empty steps initially
            await addDocumentNonBlocking(collection(firestore, 'er_workflows'), {
                ...formData,
                steps: [],
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });
            toast({ title: "Амжилттай", description: "Шинэ урсгал үүсгэгдлээ" });
            setIsDialogOpen(false);
            setFormData({ name: '', description: '' });
        } catch (error) {
            toast({ title: "Алдаа", description: "Үйлдэл амжилтгүй боллоо", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Та энэ урсгалыг устгахдаа итгэлтэй байна уу?')) return;
        if (!firestore) return;

        try {
            await deleteDocumentNonBlocking(doc(firestore, 'er_workflows', id));
            toast({ title: "Амжилттай", description: "Устгагдлаа" });
        } catch (error) {
            toast({ title: "Алдаа", description: "Устгахад алдаа гарлаа", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Ажлын урсгал (Workflows)</h3>
                    <p className="text-sm text-muted-foreground">Баримт бичиг хянах, батлах шат дамжлагуудыг тохируулах</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Шинэ урсгал
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Нэр</TableHead>
                            <TableHead>Тайлбар</TableHead>
                            <TableHead>Алхамын тоо</TableHead>
                            <TableHead>Төлөв</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workflows?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Одоогоор урсгал тохируулаагүй байна
                                </TableCell>
                            </TableRow>
                        )}
                        {workflows?.map((workflow) => (
                            <TableRow key={workflow.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <GitBranch className="h-4 w-4 text-purple-500" />
                                        {workflow.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{workflow.description}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">
                                        {workflow.steps?.length || 0} алхам
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {workflow.isActive ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Идэвхтэй</Badge>
                                    ) : (
                                        <Badge variant="outline">Идэвхгүй</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/employment-relations/settings/workflows/${workflow.id}`}>
                                                Засах
                                                <ArrowRight className="ml-2 h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(workflow.id)}>
                                            <Trash2 className="h-4 w-4 text-rose-500" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Шинэ урсгал үүсгэх</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Нэр</Label>
                            <Input
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Жишээ: Гэрээ батлах урсгал (Ерөнхий)"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Тайлбар</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Цуцлах</Button>
                            <Button type="submit">Үүсгэх</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
