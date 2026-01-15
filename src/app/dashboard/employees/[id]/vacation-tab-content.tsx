'use client';

import * as React from 'react';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { type Employee } from '../data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentWorkYear } from '@/lib/vacation-utils';
import { format } from 'date-fns';
import { Calendar, Settings2, Save, Info } from 'lucide-react';
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
            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 mb-4 transition-transform hover:scale-110">
                        <Info className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 max-w-sm">
                        Ажилтны "Ажилд орсон огноо" бүртгэгдээгүй тул ээлжийн амралт тооцох боломжгүй байна.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardHeader className="pb-3 border-b bg-slate-50/30 px-6">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5" />
                        Тооцооллын суурь тохиргоо
                    </CardTitle>
                    <CardDescription className="text-[11px] font-medium text-slate-400">Ээлжийн амралтын эрх болон тооцооллын суурь тохиргоо.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-3 block">Үндсэн амрэх хоног (Жилд)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={baseDays}
                                        onChange={(e) => setBaseDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        className="h-11 rounded-2xl border-slate-100 bg-slate-50/50 max-w-[120px] font-bold text-slate-700"
                                    />
                                    <Button onClick={handleSaveConfig} disabled={isSaving} className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all active:scale-95">
                                        {isSaving ? <span className="animate-spin mr-2">⏳</span> : <Save className="h-4 w-4 mr-2" />}
                                        Хадгалах
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/50">
                                <p className="text-[11px] font-medium text-amber-700/80 leading-relaxed">
                                    Ажилтны ажилласан жилээс хамааран нэмэгдэл өдрүүд автоматаар бодогдоно (Хэрэв системд тохируулсан бол).
                                </p>
                            </div>
                        </div>

                        {workYear && (
                            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100/50 space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ажлын Жил</label>
                                        <h4 className="text-sm font-bold text-slate-700">Одоогийн тооцоо</h4>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Эхлэх</p>
                                        <p className="text-sm font-bold text-slate-700 font-mono">{format(workYear.start, 'yyyy.MM.dd')}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Дуусах</p>
                                        <p className="text-sm font-bold text-slate-700 font-mono">{format(workYear.end, 'yyyy.MM.dd')}</p>
                                    </div>
                                    <div className="col-span-2 pt-2">
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Ажиллаж буй</span>
                                            <div className="text-indigo-600 font-black text-sm">{workYear.yearNumber}-р жил</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardHeader className="pb-3 border-b bg-slate-50/30 px-6">
                    <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Амралтын түүх</CardTitle>
                    <CardDescription className="text-[11px] font-medium text-slate-400">Энэ ажлын жилд авсан амралтууд</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="text-center py-12 flex flex-col items-center justify-center border-dashed border-2 border-slate-100 rounded-3xl opacity-50">
                        <Calendar className="h-10 w-10 text-slate-300 mb-3" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Одоогоор амралтын түүх байхгүй байна</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
