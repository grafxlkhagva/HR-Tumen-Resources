'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    DollarSign,
    TrendingUp,
    PlusCircle,
    X,
    Save,
    Trash2,
    Target,
    Zap,
    Edit3,
    LayoutGrid,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Position, SalaryRangeVersion } from '../../../types';
import { doc, collection, addDoc } from 'firebase/firestore';
import { useFirebase, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    History,
    ChevronDown,
    ArrowRight
} from 'lucide-react';
import { CurrencyInput } from './currency-input';
import { cn } from '@/lib/utils';

interface PositionCompensationProps {
    position: Position;
}

export function PositionCompensation({
    position
}: PositionCompensationProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingRange, setIsAddingRange] = useState(false);
    const [newRangeName, setNewRangeName] = useState('');

    const { data: salaryRanges } = useCollection<SalaryRangeVersion>(
        firestore ? collection(firestore, 'salary_range_versions') : null
    );

    // Helper to normalize salary steps from any previous format
    const normalizeSteps = (pos: Position) => {
        if (pos.salarySteps?.items) return pos.salarySteps;

        // Migrate from old 'values' format if it exists
        const oldValues = (pos.salarySteps as any)?.values || [0];
        return {
            items: oldValues.map((v: number, i: number) => ({
                name: `Шатлал ${i + 1}`,
                value: v
            })),
            activeIndex: pos.salarySteps?.activeIndex ?? 0,
            currency: pos.salarySteps?.currency || 'MNT',
        };
    };

    const [formData, setFormData] = useState({
        salaryRange: {
            min: position.salaryRange?.min || 0,
            max: position.salaryRange?.max || 0,
            currency: position.salaryRange?.currency || 'MNT',
            id: position.salaryRange?.id || '',
        },
        salarySteps: normalizeSteps(position),
        incentives: position.incentives || [],
    });

    const handleSalaryUpdate = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            salaryRange: {
                ...prev.salaryRange,
                [field]: value,
                id: (field === 'min' || field === 'max') ? '' : prev.salaryRange.id
            }
        }));
    };

    const handleStepCountChange = (count: number) => {
        const currentItems = [...formData.salarySteps.items];
        let newItems = [];
        if (count > currentItems.length) {
            newItems = [
                ...currentItems,
                ...Array(count - currentItems.length).fill(0).map((_, i) => ({
                    name: `Шатлал ${currentItems.length + i + 1}`,
                    value: 0
                }))
            ];
        } else {
            newItems = currentItems.slice(0, count);
        }

        setFormData(prev => ({
            ...prev,
            salarySteps: {
                ...prev.salarySteps,
                items: newItems,
                activeIndex: Math.min(prev.salarySteps.activeIndex, newItems.length - 1)
            }
        }));
    };

    const updateStepValue = (index: number, value: number) => {
        const newItems = [...formData.salarySteps.items];
        newItems[index] = { ...newItems[index], value };
        setFormData(prev => ({
            ...prev,
            salarySteps: { ...prev.salarySteps, items: newItems }
        }));
    };

    const updateStepName = (index: number, name: string) => {
        const newItems = [...formData.salarySteps.items];
        newItems[index] = { ...newItems[index], name };
        setFormData(prev => ({
            ...prev,
            salarySteps: { ...prev.salarySteps, items: newItems }
        }));
    };

    const activateStep = (index: number) => {
        setFormData(prev => ({
            ...prev,
            salarySteps: { ...prev.salarySteps, activeIndex: index }
        }));
    };

    const handleAddIncentive = () => {
        setFormData(prev => ({
            ...prev,
            incentives: [...prev.incentives, { type: '', description: '', amount: 0, currency: 'MNT', unit: '%', frequency: 'Сар бүр' }]
        }));
    };

    const removeIncentive = (index: number) => {
        setFormData(prev => ({
            ...prev,
            incentives: prev.incentives.filter((_, i) => i !== index)
        }));
    };

    const updateIncentive = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const newList = [...prev.incentives];
            newList[index] = { ...newList[index], [field]: value };
            return { ...prev, incentives: newList };
        });
    };

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        if (formData.salarySteps.items.some((item: any) => item.value < 0)) {
            toast({ title: "Алдаа", description: "Цалингийн дүн 0-ээс бага байж болохгүй", variant: "destructive" });
            setIsSaving(false);
            return;
        }

        const values = formData.salarySteps.items.map((i: any) => i.value);
        const min = Math.min(...values);
        const max = Math.max(...values);

        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', position.id), {
                salarySteps: formData.salarySteps,
                salaryRange: {
                    ...formData.salaryRange,
                    min,
                    max
                },
                incentives: formData.incentives,
                updatedAt: new Date().toISOString(),
            });
            toast({ title: "Цалингийн мэдээлэл хадгалагдлаа" });
            setIsEditing(false);
        } catch (e) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            salaryRange: {
                min: position.salaryRange?.min || 0,
                max: position.salaryRange?.max || 0,
                currency: position.salaryRange?.currency || 'MNT',
                id: position.salaryRange?.id || '',
            },
            salarySteps: normalizeSteps(position),
            incentives: position.incentives || [],
        });
        setIsEditing(false);
    };

    const handleCreateVersion = async () => {
        if (!firestore || !newRangeName) {
            toast({ title: "Нэр оруулна уу", variant: "destructive" });
            return;
        }
        if (formData.salaryRange.min <= 0 || formData.salaryRange.max <= 0) {
            toast({ title: "Дүн оруулна уу", variant: "destructive" });
            return;
        }
        if (formData.salaryRange.min > formData.salaryRange.max) {
            toast({ title: "Утга буруу байна", description: "Доод дүн дээд дүнгээс их байна", variant: "destructive" });
            return;
        }

        try {
            const docRef = await addDoc(collection(firestore, 'salary_range_versions'), {
                name: newRangeName,
                min: formData.salaryRange.min,
                max: formData.salaryRange.max,
                currency: formData.salaryRange.currency,
                createdAt: new Date().toISOString()
            });

            // Auto-select the newly created version
            handleSalaryUpdate('id', docRef.id);
            setFormData(prev => ({
                ...prev,
                salaryRange: { ...prev.salaryRange, id: docRef.id }
            }));

            toast({ title: "Цалингийн хувилбар хадгалагдлаа" });
            setIsAddingRange(false);
            setNewRangeName('');
        } catch (e) {
            toast({ title: "Хувилбар хадгалахад алдаа гарлаа", variant: "destructive" });
        }
    };

    const activeItem = formData.salarySteps.items[formData.salarySteps.activeIndex] || { name: 'Тодорхойгүй', value: 0 };
    const activeSalary = activeItem.value;

    return (
        <section className="space-y-12">
            {position.isApproved && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 mb-6">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">Батлагдсан ажлын байр тул цалин, урамшууллын мэдээллийг өөрчлөх боломжгүй.</p>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Цалин & Бонус</label>
                        <h2 className="text-lg font-bold text-foreground">Нөхөн олговор</h2>
                    </div>
                </div>
                {!isEditing ? (
                    !position.isApproved && (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-9 gap-2 text-primary hover:text-primary/90 hover:bg-primary/10 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all">
                            <Edit3 className="w-3.5 h-3.5" />
                            Засах
                        </Button>
                    )
                ) : (
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-9 px-4 text-muted-foreground hover:text-foreground font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all">
                            Болих
                        </Button>
                        <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} className="h-9 gap-2 bg-primary hover:bg-primary/90 shadow-sm font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all">
                            <Save className="w-3.5 h-3.5" />
                            Хадгалах
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* 1. Salary Steps Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-primary" />
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Цалингийн шатлал</label>
                    </div>

                    <div className="bg-muted/50 p-6 rounded-2xl border border-border space-y-6">
                        {isEditing ? (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Шатлалын тоо</label>
                                    <Select
                                        value={formData.salarySteps.items.length.toString()}
                                        onValueChange={(val) => handleStepCountChange(parseInt(val))}
                                    >
                                        <SelectTrigger className="h-11 rounded-xl border-border bg-background shadow-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                <SelectItem key={n} value={n.toString()} className="rounded-lg">{n} шатлалт</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {formData.salarySteps.items.map((item: any, i: number) => (
                                        <div
                                            key={i}
                                            className={`p-6 rounded-xl border transition-all space-y-5 shadow-premium relative ${formData.salarySteps.activeIndex === i
                                                ? 'bg-primary/5 border-primary/30'
                                                : 'bg-background border-border'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between absolute top-4 right-6">
                                                <Badge
                                                    variant={formData.salarySteps.activeIndex === i ? "default" : "outline"}
                                                    className={cn(
                                                        "h-6 px-3 rounded-full text-[9px] font-bold uppercase tracking-widest cursor-pointer transition-all",
                                                        formData.salarySteps.activeIndex === i
                                                            ? "bg-primary text-primary-foreground shadow-sm"
                                                            : "text-muted-foreground hover:border-primary/50 hover:text-primary"
                                                    )}
                                                    onClick={() => activateStep(i)}
                                                >
                                                    {formData.salarySteps.activeIndex === i ? 'Идэвхтэй Шатлал' : 'Сонгох'}
                                                </Badge>
                                            </div>

                                            <div className="space-y-4 pt-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Шатлалын нэр</label>
                                                    <Input
                                                        value={item.name}
                                                        onChange={(e) => updateStepName(i, e.target.value)}
                                                        className="h-10 rounded-lg border-border bg-muted/30 focus:bg-background transition-all font-bold text-sm"
                                                        placeholder={`Шатлал ${i + 1}`}
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Цалингийн дүн</label>
                                                    <CurrencyInput
                                                        value={item.value}
                                                        onValueChange={(val) => updateStepValue(i, val)}
                                                        className="h-10 rounded-lg border-border bg-muted/30 focus:bg-background transition-all"
                                                        placeholder="Цалингийн дүн"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Үндсэн цалин</p>
                                        <Badge variant="outline" className="h-4 px-1.5 text-[8px] border-primary/20 text-primary bg-primary/5 font-bold uppercase rounded-md">{activeItem.name}</Badge>
                                    </div>
                                    <p className="text-3xl font-bold text-foreground">
                                        {activeSalary.toLocaleString()}<span className="text-sm ml-1 font-bold text-muted-foreground">₮</span>
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Шатлалууд</p>
                                    <div className="grid grid-cols-1 gap-3">
                                        {formData.salarySteps.items.map((item: any, i: number) => (
                                            <div
                                                key={i}
                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${formData.salarySteps.activeIndex === i
                                                    ? 'bg-primary border-primary text-primary-foreground shadow-md'
                                                    : 'bg-background border-border text-foreground hover:border-primary/20'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${formData.salarySteps.activeIndex === i ? 'bg-primary-foreground/20' : 'bg-muted'
                                                        }`}>
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${formData.salarySteps.activeIndex === i ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                                            {item.name}
                                                        </span>
                                                        <span className="text-sm font-bold">{item.value.toLocaleString()}₮</span>
                                                    </div>
                                                </div>
                                                {formData.salarySteps.activeIndex === i && (
                                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Incentives Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Урамшуулал & Нэмэгдэл</label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isEditing ? (
                            <>
                                {formData.incentives.map((inc: any, i: number) => (
                                    <div key={i} className="p-6 rounded-xl border border-border bg-background shadow-premium space-y-5 group relative">
                                        <button
                                            onClick={() => removeIncentive(i)}
                                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Урамшууллын нэр</label>
                                                <Input
                                                    value={inc.type}
                                                    onChange={(e) => updateIncentive(i, 'type', e.target.value)}
                                                    placeholder="Жишээ: KPI Бонус, Хоолны мөнгө"
                                                    className="h-10 rounded-lg border-border bg-muted/30 focus:bg-background transition-all font-bold text-sm"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Дүн / Хэмжээ</label>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            {inc.unit === '₮' ? (
                                                                <CurrencyInput
                                                                    value={inc.amount}
                                                                    onValueChange={(val) => updateIncentive(i, 'amount', val)}
                                                                    className="h-10 rounded-lg border-border bg-muted/30 focus:bg-background transition-all"
                                                                    placeholder="Дүн оруулна уу"
                                                                />
                                                            ) : (
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        value={inc.amount}
                                                                        onChange={(e) => updateIncentive(i, 'amount', Number(e.target.value))}
                                                                        className="h-10 rounded-lg border-border bg-muted/30 focus:bg-background transition-all pr-8 font-bold"
                                                                        placeholder="Хэмжээ"
                                                                    />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50">%</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Select
                                                            value={inc.unit}
                                                            onValueChange={(val) => updateIncentive(i, 'unit', val)}
                                                        >
                                                            <SelectTrigger className="w-16 h-10 rounded-lg border-border bg-background shadow-sm font-bold">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl border-border">
                                                                <SelectItem value="%" className="rounded-lg">%</SelectItem>
                                                                <SelectItem value="₮" className="rounded-lg">₮</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Олгох давтамж</label>
                                                    <Select
                                                        value={inc.frequency || 'Сар бүр'}
                                                        onValueChange={(val) => updateIncentive(i, 'frequency', val)}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-sm font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-border">
                                                            <SelectItem value="Өдөр бүр" className="rounded-lg">Өдөр бүр</SelectItem>
                                                            <SelectItem value="Сар бүр" className="rounded-lg">Сар бүр</SelectItem>
                                                            <SelectItem value="Улирал бүр" className="rounded-lg">Улирал бүр</SelectItem>
                                                            <SelectItem value="Хагас жил тутам" className="rounded-lg">Хагас жил тутам</SelectItem>
                                                            <SelectItem value="Жил бүр" className="rounded-lg">Жил бүр</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Тайлбар / Нөхцөл</label>
                                                <Input
                                                    value={inc.description}
                                                    onChange={(e) => updateIncentive(i, 'description', e.target.value)}
                                                    placeholder="Олгох нөхцөл, дүрмийн тайлбар..."
                                                    className="h-9 rounded-lg border-border bg-muted/30 focus:bg-background transition-all text-xs text-muted-foreground italic shadow-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    onClick={handleAddIncentive}
                                    className="h-full min-h-[180px] border-dashed border-2 rounded-xl text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col gap-3 group"
                                >
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-all">
                                        <PlusCircle className="w-6 h-6" />
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-widest">Урамшуулал нэмэх</span>
                                </Button>
                            </>
                        ) : (
                            formData.incentives.length > 0 ? (
                                formData.incentives.map((inc: any, i: number) => (
                                    <div key={i} className="p-6 rounded-xl border border-border bg-muted/30 group hover:border-primary/20 transition-all h-fit shadow-premium">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-foreground">{inc.type}</h4>
                                                <p className="text-xs text-muted-foreground font-medium italic">{inc.description}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge className="bg-primary/10 text-primary border-none font-bold text-sm px-3 py-1.5 rounded-lg shadow-sm">
                                                    {inc.unit === '₮' ? inc.amount.toLocaleString() : inc.amount}{inc.unit}
                                                </Badge>
                                                {inc.frequency && (
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{inc.frequency}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="md:col-span-2 py-12 flex flex-col items-center justify-center text-center opacity-40 border-dashed border-2 border-border rounded-xl">
                                    <Zap className="w-8 h-8 text-muted-foreground/30 mb-3" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Нэмэгдэл урамшуулал заагаагүй</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
