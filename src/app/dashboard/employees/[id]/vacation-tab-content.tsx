'use client';

import * as React from 'react';
import { useFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { type Employee } from '../data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentWorkYear } from '@/lib/vacation-utils';
import { format } from 'date-fns';
import { Calendar, Settings2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function VacationTabContent({ employee }: { employee: Employee }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [baseDays, setBaseDays] = React.useState<number | string>(employee.vacationConfig?.baseDays || 15);
    const [isSaving, setIsSaving] = React.useState(false);

    // Calculate Work Year
    const workYear = React.useMemo(() => {
        if (!employee.hireDate) return null;
        return getCurrentWorkYear(employee.hireDate);
    }, [employee.hireDate]);

    const handleSaveConfig = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            const docRef = doc(firestore, 'employees', employee.id);
            await updateDocumentNonBlocking(docRef, {
                vacationConfig: {
                    baseDays: typeof baseDays === 'string' ? (baseDays === '' ? 0 : parseInt(baseDays)) : baseDays
                }
            });
            toast({ title: 'Амжилттай хадгалагдлаа' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа гарлаа' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!employee.hireDate) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">
                        Ажилтны "Ажилд орсон огноо" бүртгэгдээгүй тул ээлжийн амралт тооцох боломжгүй байна.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Тохиргоо
                    </CardTitle>
                    <CardDescription>Ээлжийн амралтын эрх болон тооцооллын суурь тохиргоо.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Үндсэн амрэх хоног (Жилд)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={baseDays}
                                    onChange={(e) => setBaseDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="max-w-[150px]"
                                />
                                <Button onClick={handleSaveConfig} disabled={isSaving}>
                                    {isSaving ? <span className="animate-spin mr-2">⏳</span> : <Save className="h-4 w-4 mr-2" />}
                                    Хадгалах
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Ажилтны ажилласан жилээс хамааран нэмэгдэл өдрүүд автоматаар бодогдоно (Хэрэв системд тохируулсан бол).
                            </p>
                        </div>

                        {workYear && (
                            <div className="bg-muted/30 p-4 rounded-lg border space-y-3">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Одоогийн Ажлын Жил
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Эхлэх</span>
                                        <span className="font-mono font-medium">{format(workYear.start, 'yyyy.MM.dd')}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs">Дуусах</span>
                                        <span className="font-mono font-medium">{format(workYear.end, 'yyyy.MM.dd')}</span>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t">
                                        <span className="text-muted-foreground text-xs">Таны ажиллаж буй</span>
                                        <div className="text-primary font-bold">{workYear.yearNumber}-р жил</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Амралтын түүх</CardTitle>
                    <CardDescription>Энэ ажлын жилд авсан амралтууд</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground border-dashed border-2 rounded-xl">
                        <p>Одоогоор амралтын түүх байхгүй байна.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
