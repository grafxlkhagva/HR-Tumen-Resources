'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Laptop, Save, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { OffboardingProcess } from '../types';

interface StepAssetsProps {
    process: OffboardingProcess;
}

export function StepAssets({ process }: StepAssetsProps) {
    const { firestore } = useFirebase();
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { toast } = useToast();

    // Default checklist items that are commonly returned
    const defaultItems = [
        { id: '1', item: 'Ажлын үнэмлэх', returned: false, condition: 'GOOD' as const },
        { id: '2', item: 'Ноутбук / Компьютер', returned: false, condition: 'GOOD' as const },
        { id: '3', item: 'Оффис түлхүүр / Карт', returned: false, condition: 'GOOD' as const },
    ];

    const [items, setItems] = React.useState(
        process.assets?.items && process.assets.items.length > 0
            ? process.assets.items
            : defaultItems
    );
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // New Item State
    const [newItemName, setNewItemName] = React.useState('');

    const isReadOnly = process.assets?.isCompleted;

    const handleAddItem = () => {
        if (!newItemName.trim()) return;
        setItems([...items, {
            id: Math.random().toString(36).substring(7),
            item: newItemName,
            returned: false,
            condition: 'GOOD'
        }]);
        setNewItemName('');
    };

    const handleDeleteItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, updates: Partial<typeof items[0]>) => {
        if (isReadOnly) return;
        setItems(items.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    const handleSave = async (completeStep: boolean = false) => {
        if (!firestore || !employeeId) return;

        // Check if all items are returned before completing
        if (completeStep) {
            const notReturned = items.filter(i => !i.returned);
            if (notReturned.length > 0) {
                toast({ variant: 'destructive', title: 'Дутуу зүйлс байна', description: 'Бүх эд хөрөнгийг буцааж авсан байх шаардлагатай.' });
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const docRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, process.id);

            await updateDocumentNonBlocking(docRef, {
                assets: {
                    items,
                    isCompleted: completeStep
                },
                currentStep: completeStep ? 5 : 4
            });

            toast({ title: completeStep ? 'Амжилттай хадгалагдлаа' : 'Хадгалагдлаа', description: completeStep ? 'Дараагийн шат руу шилжлээ.' : 'Өөрчлөлтүүд хадгалагдлаа.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалах үед алдаа гарлаа.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="max-w-4xl mx-auto border-t-4 border-t-orange-500 shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                    Хөрөнгө буцаах
                </CardTitle>
                <CardDescription>
                    Ажилтанд олгосон эд хөрөнгө, техник хэрэгслийг буцаан авах хяналтын хуудас.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Add Item Input */}
                {!isReadOnly && (
                    <div className="flex w-full gap-2">
                        <Input
                            placeholder="Бусад хөрөнгө нэмэх..."
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                        />
                        <Button onClick={handleAddItem} variant="outline" className="shrink-0">
                            <Plus className="h-4 w-4 mr-2" />
                            Нэмэх
                        </Button>
                    </div>
                )}

                {/* Assets Table */}
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground font-medium text-left">
                            <tr>
                                <th className="p-3 pl-4">Хөрөнгийн нэр</th>
                                <th className="p-3 text-center w-[120px]">Буцаасан</th>
                                <th className="p-3 w-[150px]">Төлөв</th>
                                {!isReadOnly && <th className="p-3 w-[50px]"></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-4 text-center text-muted-foreground italic">Хөрөнгө бүртгэгдээгүй.</td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="border-t hover:bg-muted/20 transition-colors">
                                        <td className="p-3 pl-4 font-medium">{item.item}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center">
                                                <Button
                                                    variant={item.returned ? "default" : "outline"}
                                                    size="sm"
                                                    className={`h-7 px-3 rounded-full ${item.returned ? 'bg-green-600 hover:bg-green-700' : 'text-muted-foreground'}`}
                                                    onClick={() => updateItem(item.id, { returned: !item.returned })}
                                                    disabled={isReadOnly}
                                                >
                                                    {item.returned ? "Тийм" : "Үгүй"}
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <Select
                                                disabled={!item.returned || isReadOnly}
                                                value={item.condition}
                                                onValueChange={(val: any) => updateItem(item.id, { condition: val })}
                                            >
                                                <SelectTrigger className="h-8 w-full border-none bg-transparent hover:bg-muted/50 focus:ring-0">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="GOOD">Хэвийн</SelectItem>
                                                    <SelectItem value="DAMAGED">Гэмтэлтэй</SelectItem>
                                                    <SelectItem value="LOST">Алга болсон</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        {!isReadOnly && (
                                            <td className="p-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Alert for Damaged/Lost Items */}
                {items.some(i => i.returned && i.condition !== 'GOOD') && (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex items-center gap-3 text-sm border border-amber-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <div>
                            <strong>Анхаар:</strong> Зарим хөрөнгө гэмтэлтэй эсвэл дутсан байна. Тооцоо нийлэх хэсэгт суутгал хийгдэх эсэхийг шийдээрэй.
                        </div>
                    </div>
                )}

            </CardContent>
            <CardFooter className="flex justify-between gap-3 border-t bg-muted/20 py-4">
                <Button variant="ghost" onClick={() => handleSave(false)} disabled={isSubmitting || isReadOnly}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Хадгалах
                </Button>
                {!isReadOnly ? (
                    <Button
                        onClick={() => handleSave(true)}
                        disabled={isSubmitting || items.some(i => !i.returned)}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                        Дуусгах & Үргэлжлүүлэх
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                        <span>✅ Хөрөнгө хүлээлцсэн</span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
