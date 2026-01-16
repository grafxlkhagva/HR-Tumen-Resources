import { collection, doc, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, Pencil, X, Check, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ERTemplate } from '../../../employment-relations/types';

export function OrganizationActionSettings() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editItemData, setEditItemData] = useState({ templateId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fixed System Actions
    const SYSTEM_ACTIONS = [
        { id: 'appointment', name: 'Томилгоо хийх', description: 'Ажилтныг албан тушаалд томилох үед үүсэх баримт' }
    ];

    // Fetch Actions from Firestore to get the configured templateId
    const actionsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'organization_actions') : null),
        [firestore]
    );
    const { data: configuredActions, isLoading: isLoadingActions } = useCollection<any>(actionsRef);

    // Fetch Templates
    const templatesRef = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'er_templates'), where('isActive', '==', true)) : null),
        [firestore]
    );
    const { data: templates } = useCollection<ERTemplate>(templatesRef as any);

    const handleUpdateAction = async (id: string) => {
        if (!firestore) return;

        if (!user) {
            toast({ title: 'Хандах эрхгүй', description: 'Та нэвтэрсэн байх шаардлагатай.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            // Use setDocumentNonBlocking with merge: true to handle both create and update
            const actionDocRef = doc(firestore, 'organization_actions', id);
            setDocumentNonBlocking(actionDocRef, {
                templateId: editItemData.templateId,
                updatedAt: Timestamp.now(),
                name: SYSTEM_ACTIONS.find(a => a.id === id)?.name || id
            }, { merge: true });

            setEditingId(null);
            toast({ title: 'Тохиргоо хадгалагдлаа' });
        } catch (e: any) {
            console.error("Update action error:", e);
            toast({ title: 'Алдаа гарлаа', description: e.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-semibold">Системийн үйлдлүүд</CardTitle>
                        <CardDescription>Байгууллагын бүтцийн өөрчлөлт, томилгоотой холбоотой автоматжуулсан үйлдлүүдийн тохиргоо.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[40%]">Үйлдлийн нэр</TableHead>
                                <TableHead className="w-[50%]">Холбосон загвар</TableHead>
                                <TableHead className="w-[100px] text-right">Тохиргоо</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingActions ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                SYSTEM_ACTIONS.map(action => {
                                    const config = configuredActions?.find(a => a.id === action.id);
                                    const isEditing = editingId === action.id;

                                    return (
                                        <TableRow key={action.id} className="group transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700 flex items-center gap-2">
                                                        <Zap className="w-4 h-4 text-amber-500" />
                                                        {action.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{action.description}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Select
                                                        value={editItemData.templateId}
                                                        onValueChange={(val) => setEditItemData({ templateId: val })}
                                                    >
                                                        <SelectTrigger className="h-9 bg-white">
                                                            <SelectValue placeholder="Загвар сонгох" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {templates?.map(tpl => (
                                                                <SelectItem key={tpl.id} value={tpl.id}>
                                                                    {tpl.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <FileText className="w-4 h-4 text-slate-300" />
                                                        {templates?.find(t => t.id === config?.templateId)?.name || (
                                                            <span className="text-amber-500 font-medium italic">Тохируулаагүй байна</span>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="sm" onClick={() => handleUpdateAction(action.id)} disabled={isSubmitting} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">
                                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingId(action.id);
                                                            setEditItemData({ templateId: config?.templateId || '' });
                                                        }}
                                                        className="h-8 px-3 text-xs font-bold border-slate-200 hover:bg-slate-50 hover:text-primary transition-all rounded-lg"
                                                    >
                                                        <Pencil className="h-3 w-3 mr-2" />
                                                        Засах
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
