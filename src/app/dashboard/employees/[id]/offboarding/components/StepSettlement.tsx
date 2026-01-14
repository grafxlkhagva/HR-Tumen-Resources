'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, ArrowRight, Calculator, Coins } from 'lucide-react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { OffboardingProcess } from '../types';

interface StepSettlementProps {
    process: OffboardingProcess;
}

export function StepSettlement({ process }: StepSettlementProps) {
    const { firestore } = useFirebase();
    const { id } = useParams();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { toast } = useToast();

    // Default checklist items
    const defaultChecklist = [
        { id: 'lib', item: 'Номын сангийн тооцоо', status: 'PENDING' as const },
        { id: 'travel', item: 'Томилолтын тооцоо', status: 'PENDING' as const },
        { id: 'salary_advance', item: 'Цалингийн урьдчилгаа', status: 'PENDING' as const },
    ];

    const [checklist, setChecklist] = React.useState(
        process.settlement?.checklist && process.settlement.checklist.length > 0
            ? process.settlement.checklist
            : defaultChecklist
    );

    const [salaryCalculated, setSalaryCalculated] = React.useState(process.settlement?.salaryCalculated || false);
    const [bonusCalculated, setBonusCalculated] = React.useState(process.settlement?.bonusCalculated || false);
    const [vacationCalculated, setVacationCalculated] = React.useState(process.settlement?.vacationCalculated || false);
    const [totalAmount, setTotalAmount] = React.useState<string>(process.settlement?.totalAmount?.toString() || '');

    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const isReadOnly = process.settlement?.isCompleted;

    const toggleChecklistItem = (id: string, currentStatus: 'PENDING' | 'CLEARED') => {
        if (isReadOnly) return;
        setChecklist(checklist.map(item =>
            item.id === id
                ? { ...item, status: currentStatus === 'PENDING' ? 'CLEARED' : 'PENDING' }
                : item
        ));
    };

    const handleSave = async (completeStep: boolean = false) => {
        if (!firestore || !employeeId) return;

        if (completeStep) {
            const pendingItems = checklist.filter(i => i.status === 'PENDING');
            if (pendingItems.length > 0) {
                toast({ variant: 'destructive', title: 'Дутуу тооцоо', description: 'Бүх тооцоог "Дууссан" болгох шаардлагатай.' });
                return;
            }
            if (!salaryCalculated || !vacationCalculated) {
                toast({ variant: 'destructive', title: 'Цалин бодоогүй', description: 'Эцсийн цалин болон амралтын тооцоог хийнэ үү.' });
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const docRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, process.id);

            await updateDocumentNonBlocking(docRef, {
                settlement: {
                    checklist,
                    salaryCalculated,
                    bonusCalculated,
                    vacationCalculated,
                    totalAmount: totalAmount ? parseFloat(totalAmount) : 0,
                    isCompleted: completeStep
                },
                currentStep: completeStep ? 7 : 6
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
        <Card className="max-w-4xl mx-auto border-t-4 border-t-emerald-500 shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">6</span>
                    Тооцоо нийлэх
                </CardTitle>
                <CardDescription>
                    Санхүүгийн тооцоо, суутгал болон эцсийн олгох цалингийн мэдээлэл.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

                {/* 1. Basic Checklist */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">1. Бусад тооцоо</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {checklist.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${item.status === 'CLEARED' ? 'bg-emerald-50 border-emerald-200' : 'bg-card'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Checkbox
                                        checked={item.status === 'CLEARED'}
                                        onCheckedChange={() => toggleChecklistItem(item.id, item.status)}
                                        disabled={isReadOnly}
                                        id={item.id}
                                    />
                                    <Label htmlFor={item.id} className="cursor-pointer font-medium">{item.item}</Label>
                                </div>
                                <Badge variant={item.status === 'CLEARED' ? 'outline' : 'secondary'} className={item.status === 'CLEARED' ? "text-emerald-700 border-emerald-200 bg-white" : ""}>
                                    {item.status === 'CLEARED' ? 'Дууссан' : 'Хүлээгдэж буй'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Salary Calculation */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">2. Цалингийн тооцоолол</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-muted/20 rounded-xl border border-dashed">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="salary"
                                    checked={salaryCalculated}
                                    onCheckedChange={(c) => !isReadOnly && setSalaryCalculated(!!c)}
                                    disabled={isReadOnly}
                                />
                                <Label htmlFor="salary" className="font-medium">Ажилласан цагийн цалин</Label>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">Сүүлийн сарын ажилласан хоногийн тооцоо.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="vacation"
                                    checked={vacationCalculated}
                                    onCheckedChange={(c) => !isReadOnly && setVacationCalculated(!!c)}
                                    disabled={isReadOnly}
                                />
                                <Label htmlFor="vacation" className="font-medium">Ээлжийн амралтын тооцоо</Label>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">Амраагүй хоногийн нөхөн олговор.</p>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="bonus"
                                    checked={bonusCalculated}
                                    onCheckedChange={(c) => !isReadOnly && setBonusCalculated(!!c)}
                                    disabled={isReadOnly}
                                />
                                <Label htmlFor="bonus" className="font-medium">Бонус / Урамшуулал</Label>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">Улирлын эсвэл жилийн эцсийн.</p>
                        </div>
                    </div>

                    <div className="flex items-end gap-4 max-w-sm ml-auto pt-4">
                        <div className="flex-1 space-y-1.5">
                            <Label className="text-right block">Нийт олгох дүн (Гарт)</Label>
                            <div className="relative">
                                <Coins className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    value={totalAmount}
                                    onChange={(e) => setTotalAmount(e.target.value)}
                                    className="pl-9 text-right font-mono font-bold text-lg"
                                    placeholder="0.00"
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-between gap-3 border-t bg-muted/20 py-4">
                <Button variant="ghost" onClick={() => handleSave(false)} disabled={isSubmitting || isReadOnly}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Хадгалах
                </Button>
                {!isReadOnly ? (
                    <Button
                        onClick={() => handleSave(true)}
                        disabled={isSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                        Дуусгах & Үргэлжлүүлэх
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                        <span>✅ Тооцоо дууссан</span>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
