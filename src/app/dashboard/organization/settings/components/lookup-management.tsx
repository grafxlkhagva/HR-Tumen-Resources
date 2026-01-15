import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, PlusCircle, Trash2, Pencil, Save, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ColumnConfig {
    key: string;
    label: string;
    type: 'text' | 'number';
    width?: string;
    required?: boolean;
    defaultValue?: any;
}

interface LookupManagementProps {
    collectionName: string;
    title: string;
    description?: string;
    columns: ColumnConfig[];
}

export function LookupManagement({ collectionName, title, description, columns }: LookupManagementProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newItemData, setNewItemData] = useState<Record<string, any>>({});
    const [editItemData, setEditItemData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const collectionRef = useMemoFirebase(
        () => (firestore ? collection(firestore, collectionName) : null),
        [firestore, collectionName]
    );

    const { data: items, isLoading } = useCollection<any>(collectionRef);

    const handleAddItem = async () => {
        if (!firestore) return;

        // Simple validation
        const missingRequired = columns.filter(c => c.required && !newItemData[c.key]);
        if (missingRequired.length > 0) {
            toast({ title: 'Мэдээлэл дутуу', description: `${missingRequired.map(c => c.label).join(', ')} оруулна уу.`, variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDocumentNonBlocking(collection(firestore, collectionName), newItemData);
            setNewItemData({});
            setIsAdding(false);
            toast({ title: 'Амжилттай нэмэгдлээ' });
        } catch (e) {
            toast({ title: 'Алдаа', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateItem = async (id: string) => {
        if (!firestore) return;
        setIsSubmitting(true);
        try {
            await updateDocumentNonBlocking(doc(firestore, collectionName, id), editItemData);
            setEditingId(null);
            setEditItemData({});
            toast({ title: 'Амжилттай шинэчлэгдлээ' });
        } catch (e) {
            toast({ title: 'Алдаа', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (!firestore) return;
        if (!confirm('Та итгэлтэй байна уу?')) return;
        try {
            await deleteDocumentNonBlocking(doc(firestore, collectionName, id));
            toast({ title: 'Устгагдлаа' });
        } catch (e) {
            toast({ title: 'Алдаа', variant: 'destructive' });
        }
    };

    const startEdit = (item: any) => {
        setEditingId(item.id);
        const data: Record<string, any> = {};
        columns.forEach(col => data[col.key] = item[col.key]);
        setEditItemData(data);
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                        {description && <CardDescription>{description}</CardDescription>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                {columns.map(col => (
                                    <TableHead key={col.key} style={{ width: col.width }}>{col.label}</TableHead>
                                ))}
                                <TableHead className="w-[100px] text-right">Үйлдэл</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Add Row */}
                            {isAdding ? (
                                <TableRow className="bg-indigo-50/30">
                                    {columns.map(col => (
                                        <TableCell key={col.key}>
                                            <Input
                                                autoFocus={columns[0].key === col.key}
                                                type={col.type}
                                                placeholder={col.label}
                                                value={newItemData[col.key] || ''}
                                                onChange={(e) => setNewItemData(prev => ({ ...prev, [col.key]: col.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }))}
                                                className="h-8 bg-white"
                                            />
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button size="sm" onClick={handleAddItem} disabled={isSubmitting} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">
                                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)} className="h-8 w-8 p-0">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 1} className="p-2">
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start text-muted-foreground hover:text-primary h-8 text-sm font-medium border border-dashed border-border/50 hover:border-primary/30 hover:bg-primary/5"
                                            onClick={() => {
                                                setIsAdding(true);
                                                setNewItemData(columns.reduce((acc, col) => ({ ...acc, [col.key]: col.defaultValue ?? '' }), {}));
                                            }}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Шинэ бичлэг нэмэх
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )}

                            {isLoading && (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {items?.map(item => (
                                <TableRow key={item.id} className="group transition-colors">
                                    {editingId === item.id ? (
                                        <>
                                            {columns.map(col => (
                                                <TableCell key={col.key}>
                                                    <Input
                                                        type={col.type}
                                                        value={editItemData[col.key] ?? ''}
                                                        onChange={(e) => setEditItemData(prev => ({ ...prev, [col.key]: col.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value }))}
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button size="sm" onClick={() => handleUpdateItem(item.id)} disabled={isSubmitting} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0">
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </>
                                    ) : (
                                        <>
                                            {columns.map(col => (
                                                <TableCell key={col.key} className="font-medium">
                                                    {item[col.key]}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="sm" variant="ghost" onClick={() => startEdit(item)} className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(item.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
