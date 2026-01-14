'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Sparkles, PlusCircle, Trash2 } from 'lucide-react';
import { Position } from '../../../types';
import { ValidationIndicator } from './validation-indicator';

interface Incentive {
    name: string;
    value: string;
    period?: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly' | 'one-time';
}

interface PositionCompensationProps {
    position: Position;
    onUpdate: (data: Partial<Position>) => Promise<void>;
    isEditing?: boolean;
    validationChecklist?: {
        hasSalary: boolean;
    };
}

export function PositionCompensation({
    position,
    onUpdate,
    isEditing = false,
    validationChecklist
}: PositionCompensationProps) {
    // Migrate legacy fields if they exist and incentives array is empty
    const initialIncentives = React.useMemo(() => {
        let list: Incentive[] = (position.compensation?.variablePay?.incentives || []).map((i: any) => ({
            name: i.name || '',
            value: i.value || '',
            period: i.period || 'yearly'
        }));

        if (list.length === 0) {
            if (position.compensation?.variablePay?.bonusDescription) {
                list.push({ name: 'Бонус', value: position.compensation.variablePay.bonusDescription, period: 'yearly' });
            }
            if (position.compensation?.variablePay?.commissionDescription) {
                list.push({ name: 'Комисс', value: position.compensation.variablePay.commissionDescription, period: 'yearly' });
            }
        }
        return list;
    }, [position]);

    const [formData, setFormData] = useState({
        salaryMin: position.compensation?.salaryRange?.min || 0,
        salaryMid: position.compensation?.salaryRange?.mid || 0,
        salaryMax: position.compensation?.salaryRange?.max || 0,
        salaryCurrency: position.compensation?.salaryRange?.currency || 'MNT',
        salaryPeriod: position.compensation?.salaryRange?.period || 'monthly',
        incentives: initialIncentives
    });

    const handleFieldUpdate = (field: string, value: any) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);

        // Map back to the Position structure
        onUpdate({
            compensation: {
                salaryRange: {
                    min: Number(field === 'salaryMin' ? value : formData.salaryMin),
                    mid: Number(field === 'salaryMid' ? value : formData.salaryMid),
                    max: Number(field === 'salaryMax' ? value : formData.salaryMax),
                    currency: field === 'salaryCurrency' ? value : formData.salaryCurrency,
                    period: (field === 'salaryPeriod' ? value : formData.salaryPeriod) as 'monthly' | 'yearly'
                },
                variablePay: {
                    incentives: field === 'incentives' ? value : formData.incentives
                }
            }
        });
    };

    const handleAddIncentive = () => {
        const newIncentives = [...formData.incentives, { name: '', value: '', period: 'yearly' }];
        handleFieldUpdate('incentives', newIncentives);
    };

    const handleRemoveIncentive = (index: number) => {
        const newIncentives = formData.incentives.filter((_: any, i: number) => i !== index);
        handleFieldUpdate('incentives', newIncentives);
    };

    const handleUpdateIncentive = (index: number, field: keyof Incentive, val: string) => {
        const newIncentives = [...formData.incentives];
        newIncentives[index] = { ...newIncentives[index], [field]: val };
        handleFieldUpdate('incentives', newIncentives);
    };

    return (
        <section className="space-y-8">
            {/* Validation Indicator */}
            {validationChecklist && (
                <ValidationIndicator
                    title="Цалин & Бонус мэдээлэл"
                    items={[
                        { label: 'Цалингийн муж', isDone: validationChecklist.hasSalary },
                    ]}
                />
            )}

            <div>
                <h3 className="text-lg font-semibold tracking-tight">Үндсэн цалин</h3>
                <p className="text-xs text-muted-foreground font-semibold">Ажлын байрны цалингийн ангилал ба нөхцөл</p>
            </div>

            <div className="space-y-10">
                {/* Salary Range Section */}
                <div className="space-y-6">
                    {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-xl border bg-muted/30">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Доод хэмжээ</label>
                                <Input
                                    type="text"
                                    value={formData.salaryMin.toLocaleString('en-US')}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const value = e.target.value.replace(/,/g, '');
                                        const numValue = parseInt(value) || 0;
                                        handleFieldUpdate('salaryMin', numValue);
                                    }}
                                    className="h-10 rounded-xl border bg-background focus-visible:ring-primary/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Дундаж хэмжээ</label>
                                <Input
                                    type="text"
                                    value={formData.salaryMid.toLocaleString('en-US')}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const value = e.target.value.replace(/,/g, '');
                                        const numValue = parseInt(value) || 0;
                                        handleFieldUpdate('salaryMid', numValue);
                                    }}
                                    className="h-10 rounded-xl border bg-background focus-visible:ring-primary/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Дээд хэмжээ</label>
                                <Input
                                    type="text"
                                    value={formData.salaryMax.toLocaleString('en-US')}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const value = e.target.value.replace(/,/g, '');
                                        const numValue = parseInt(value) || 0;
                                        handleFieldUpdate('salaryMax', numValue);
                                    }}
                                    className="h-10 rounded-xl border bg-background focus-visible:ring-primary/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Валют</label>
                                <Select value={formData.salaryCurrency} onValueChange={(val) => handleFieldUpdate('salaryCurrency', val)}>
                                    <SelectTrigger className="h-10 rounded-xl border bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="MNT">MNT (₮)</SelectItem>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">Мөчлөг</label>
                                <Select value={formData.salaryPeriod} onValueChange={(val) => handleFieldUpdate('salaryPeriod', val as 'monthly' | 'yearly')}>
                                    <SelectTrigger className="h-10 rounded-xl border bg-background"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="monthly">Сараар</SelectItem>
                                        <SelectItem value="yearly">Жилээр</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground">Төлөвлөсөн дундаж цалин</label>
                                    <div className="flex items-baseline gap-2">
                                        <h2 className="text-4xl font-black tracking-tight">
                                            {position.compensation?.salaryRange?.mid?.toLocaleString() || '-'}
                                        </h2>
                                        <span className="text-lg font-bold text-muted-foreground">{position.compensation?.salaryRange?.currency || 'MNT'}</span>
                                    </div>
                                </div>
                                <Badge variant="outline" className="w-fit rounded-lg px-3 py-1 border-primary/20 bg-primary/5 text-primary font-bold text-[10px] uppercase tracking-widest">
                                    {position.compensation?.salaryRange?.period === 'monthly' ? 'Сар бүр' : 'Жил бүр'}
                                </Badge>
                            </div>

                            {/* Modern Salary Range Bar */}
                            <div className="space-y-4 pt-4">
                                <div className="relative h-2.5 w-full bg-muted rounded-full">
                                    <div
                                        className="absolute inset-y-0 bg-primary/20 rounded-full"
                                        style={{ left: '20%', right: '20%' }}
                                    />
                                    <div
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 bg-background border-4 border-primary rounded-full shadow-lg z-10"
                                    />
                                </div>
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-medium text-muted-foreground">Минимум</p>
                                        <p className="text-sm font-bold">{position.compensation?.salaryRange?.min?.toLocaleString() || '0'}</p>
                                    </div>
                                    <div className="space-y-0.5 text-right">
                                        <p className="text-xs font-medium text-muted-foreground">Максимум</p>
                                        <p className="text-sm font-bold">{position.compensation?.salaryRange?.max?.toLocaleString() || '0'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-px bg-border/50" />

                {/* Variable Pay Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">Нэмэлт урамшуулал & Бонус</label>
                        {isEditing && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddIncentive}
                                className="h-8 rounded-lg border-dashed font-bold text-[10px] uppercase tracking-wider hover:bg-primary/5 hover:text-primary transition-all"
                            >
                                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                                Нэмэх
                            </Button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-3">
                            {formData.incentives.length === 0 ? (
                                <div className="py-10 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl bg-muted/30">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                        <Sparkles className="w-5 h-5 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">Урамшуулал нэмэгдээгүй байна</p>
                                </div>
                            ) : (
                                formData.incentives.map((incentive: Incentive, index: number) => (
                                    <div key={index} className="flex gap-3 p-3 rounded-xl border bg-muted/20 items-end">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Нэр</label>
                                            <Input
                                                value={incentive.name}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateIncentive(index, 'name', e.target.value)}
                                                placeholder="Жишээ: Жилийн бонус"
                                                className="h-10 rounded-lg border bg-background"
                                            />
                                        </div>
                                        <div className="flex-[2] space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Нөхцөл / Утга</label>
                                            <Input
                                                value={/^\d+$/.test(incentive.value.toString().replace(/,/g, '')) ? Number(incentive.value.toString().replace(/,/g, '')).toLocaleString('en-US') : incentive.value}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const val = e.target.value.replace(/,/g, '');
                                                    handleUpdateIncentive(index, 'value', val);
                                                }}
                                                placeholder="Жишээ: Гүйцэтгэлээс хамаарч 10-20%"
                                                className="h-10 rounded-lg border bg-background"
                                            />
                                        </div>
                                        <div className="w-36 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Хугацаа</label>
                                            <Select
                                                value={incentive.period || 'yearly'}
                                                onValueChange={(val: any) => handleUpdateIncentive(index, 'period', val)}
                                            >
                                                <SelectTrigger className="h-10 rounded-lg border bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="monthly">Сараар</SelectItem>
                                                    <SelectItem value="quarterly">Улирлаар</SelectItem>
                                                    <SelectItem value="half-yearly">Хагас жилээр</SelectItem>
                                                    <SelectItem value="yearly">Жилээр</SelectItem>
                                                    <SelectItem value="one-time">Нэг удаа</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveIncentive(index)}
                                            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {formData.incentives.length > 0 ? (
                                formData.incentives.map((incentive: Incentive, i: number) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-muted/5 group hover:bg-muted/10 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-xs font-medium text-muted-foreground">{incentive.name}</p>
                                                <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                                    {incentive.period === 'monthly' && 'Сараар'}
                                                    {incentive.period === 'quarterly' && 'Улирлаар'}
                                                    {incentive.period === 'half-yearly' && 'Хагас жилээр'}
                                                    {incentive.period === 'yearly' && 'Жилээр'}
                                                    {incentive.period === 'one-time' && 'Нэг удаа'}
                                                    {!incentive.period && 'Жилээр'}
                                                </p>
                                            </div>
                                            <p className="text-sm font-bold leading-relaxed">
                                                {/^\d+$/.test(incentive.value.toString().replace(/,/g, ''))
                                                    ? Number(incentive.value.toString().replace(/,/g, '')).toLocaleString()
                                                    : incentive.value}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="md:col-span-2 py-8 flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                        <Sparkles className="w-6 h-6 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Нэмэлт урамшуулал бүртгэгдээгүй</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
