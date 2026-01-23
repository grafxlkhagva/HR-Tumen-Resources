'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    PlusCircle,
    X,
    Save,
    Coffee,
    Smartphone,
    Car,
    Laptop,
    Gift,
    Shield,
    Edit3,
    AlertCircle
} from 'lucide-react';
import { Position } from '../../../types';
import { doc } from 'firebase/firestore';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { CurrencyInput } from './currency-input';

interface PositionBenefitsProps {
    position: Position;
}

export function PositionBenefits({
    position
}: PositionBenefitsProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        allowances: position.allowances || [],
    });

    const handleAddAllowance = () => {
        setFormData(prev => ({
            ...prev,
            allowances: [...prev.allowances, { type: '', amount: 0, currency: 'MNT', period: 'monthly' }]
        }));
    };

    const removeAllowance = (index: number) => {
        setFormData(prev => ({
            ...prev,
            allowances: prev.allowances.filter((_, i) => i !== index)
        }));
    };

    const updateAllowance = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const newList = [...prev.allowances];
            newList[index] = { ...newList[index], [field]: value };
            return { ...prev, allowances: newList };
        });
    };

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', position.id), {
                allowances: formData.allowances,
                updatedAt: new Date().toISOString(),
            });
            toast({ title: "Хангамжийн мэдээлэл хадгалагдлаа" });
            setIsEditing(false);
        } catch (e) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            allowances: position.allowances || [],
        });
        setIsEditing(false);
    };

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('утас') || t.includes('phone')) return <Smartphone className="w-5 h-5" />;
        if (t.includes('хоол') || t.includes('meal') || t.includes('food')) return <Coffee className="w-5 h-5" />;
        if (t.includes('бензин') || t.includes('car') || t.includes('transport')) return <Car className="w-5 h-5" />;
        if (t.includes('компьютер') || t.includes('laptop')) return <Laptop className="w-5 h-5" />;
        return <Gift className="w-5 h-5" />;
    };

    return (
        <section className="space-y-12">
            {position.isApproved && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 mb-6">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">Батлагдсан ажлын байр тул хангамжийн мэдээллийг өөрчлөх боломжгүй.</p>
                </div>
            )}

            <div className="flex items-center justify-end gap-2">
                {!isEditing ? (
                    !position.isApproved && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8 gap-2">
                            <Edit3 className="w-3.5 h-3.5" />
                            Засах
                        </Button>
                    )
                ) : (
                    <>
                        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8">
                            Болих
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 gap-2">
                            <Save className="w-3.5 h-3.5" />
                            Хадгалах
                        </Button>
                    </>
                )}
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Мөнгөн бус болон тогтмол хангамжууд</label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isEditing ? (
                        <>
                            {formData.allowances.map((al, i) => (
                                <div key={i} className="p-6 rounded-xl border border-border bg-background shadow-premium space-y-5 group relative">
                                    <button
                                        onClick={() => removeAllowance(i)}
                                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Хангамжийн төрөл</label>
                                            <Input
                                                value={al.type}
                                                onChange={(e) => updateAllowance(i, 'type', e.target.value)}
                                                placeholder="Жишээ: Гар утас, Унааны зардал"
                                                className="h-10 rounded-lg border-border bg-muted/30 focus:bg-background transition-all font-bold text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Мөнгөн дүн & Хугацаа</label>
                                            <div className="flex gap-2">
                                                <CurrencyInput
                                                    value={al.amount}
                                                    onValueChange={(val) => updateAllowance(i, 'amount', val)}
                                                    className="h-10 rounded-lg border-border bg-muted/30 focus:bg-background transition-all flex-1"
                                                    placeholder="Дүн"
                                                />
                                                <select
                                                    value={al.period}
                                                    onChange={(e) => updateAllowance(i, 'period', e.target.value)}
                                                    className="w-28 rounded-lg border border-border bg-background text-[9px] font-bold uppercase px-2 shadow-sm focus:ring-1 focus:ring-primary outline-none"
                                                >
                                                    <option value="once">Нэг удаа</option>
                                                    <option value="daily">Өдөр бүр</option>
                                                    <option value="monthly">Сар бүр</option>
                                                    <option value="quarterly">Улирал бүр</option>
                                                    <option value="semi-annually">Хагас жил тутам</option>
                                                    <option value="yearly">Жил бүр</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                onClick={handleAddAllowance}
                                className="h-full min-h-[160px] border-dashed border-2 rounded-xl text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col gap-3 group"
                            >
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-all">
                                    <PlusCircle className="w-6 h-6" />
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-widest">Хангамж нэмэх</span>
                            </Button>
                        </>
                    ) : (
                        formData.allowances.length > 0 ? (
                            formData.allowances.map((al, i) => (
                                <div key={i} className="p-6 rounded-xl border border-border bg-muted/30 group hover:border-primary/20 transition-all shadow-premium">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-12 w-12 rounded-lg bg-background border border-border flex items-center justify-center text-primary shadow-premium transition-transform group-hover:scale-110">
                                            {getIcon(al.type)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground">{al.type}</h4>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                {al.period === 'once' ? 'Нэг удаа' :
                                                    al.period === 'daily' ? 'Өдөр бүр' :
                                                        al.period === 'monthly' ? 'Сар бүр' :
                                                            al.period === 'quarterly' ? 'Улирал бүр' :
                                                                al.period === 'semi-annually' ? 'Хагас жил тутам' :
                                                                    al.period === 'yearly' ? 'Жил бүр' : al.period}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-foreground">{al.amount.toLocaleString()}</span>
                                        <span className="text-sm font-bold text-muted-foreground">₮</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="lg:col-span-3 py-16 flex flex-col items-center justify-center text-center opacity-40 border-dashed border-2 border-border rounded-xl">
                                <Gift className="w-10 h-10 text-muted-foreground/30 mb-3" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Хөнгөлөлт хангамж бүртгэгдээгүй</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </section>
    );
}

