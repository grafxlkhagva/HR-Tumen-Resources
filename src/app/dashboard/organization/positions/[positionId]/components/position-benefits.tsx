'use client';

import React, { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, PlusCircle, Trash2, DollarSign } from 'lucide-react';
import { Position } from '../../../types';

interface Allowance {
    name: string;
    amount: number;
    currency?: string;
    period?: 'daily' | 'monthly';
}

interface PositionBenefitsProps {
    position: Position;
    onUpdate: (data: Partial<Position>) => Promise<void>;
    isEditing?: boolean;
}

export function PositionBenefits({
    position,
    onUpdate,
    isEditing = false
}: PositionBenefitsProps) {
    const [formData, setFormData] = useState({
        allowances: (position.benefits?.allowances || []).map((a: any) => ({
            name: a.name || '',
            amount: a.amount || 0,
            currency: a.currency || 'MNT',
            period: a.period || 'monthly'
        }))
    });

    const handleFieldUpdate = (field: string, value: any) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);

        // Map back to the Position structure
        onUpdate({
            benefits: {
                ...position.benefits,
                allowances: field === 'allowances' ? value : formData.allowances
            }
        });
    };

    const handleAddAllowance = () => {
        const newAllowances = [...formData.allowances, { name: '', amount: 0, currency: 'MNT', period: 'monthly' }];
        handleFieldUpdate('allowances', newAllowances);
    };

    const handleRemoveAllowance = (index: number) => {
        const newAllowances = formData.allowances.filter((_: any, i: number) => i !== index);
        handleFieldUpdate('allowances', newAllowances);
    };

    const handleUpdateAllowance = (index: number, field: keyof Allowance, value: any) => {
        const newAllowances = [...formData.allowances];
        newAllowances[index] = { ...newAllowances[index], [field]: value };
        handleFieldUpdate('allowances', newAllowances);
    };

    return (
        <section className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold tracking-tight">Хамгамж ба хөнгөлөлт</h3>
                <p className="text-xs text-muted-foreground font-semibold">Ажлын байрны нэмэлт хангамж, хөнгөлөлтүүд</p>
            </div>

            <div className="space-y-10">
                {/* Allowances Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-muted-foreground">Мөнгөн хангамж</label>
                        {isEditing && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddAllowance}
                                className="h-8 rounded-lg border-dashed font-bold text-[10px] uppercase tracking-wider hover:bg-primary/5 hover:text-primary transition-all"
                            >
                                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                                Нэмэх
                            </Button>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="space-y-3">
                            {formData.allowances.length === 0 ? (
                                <div className="py-10 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl bg-muted/30">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                        <DollarSign className="w-5 h-5 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">Хангамж нэмэгдээгүй байна</p>
                                </div>
                            ) : (
                                formData.allowances.map((allowance: Allowance, index: number) => (
                                    <div key={index} className="flex gap-3 p-3 rounded-xl border bg-muted/20 items-end">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Нэр</label>
                                            <Input
                                                value={allowance.name}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateAllowance(index, 'name', e.target.value)}
                                                placeholder="Жишээ: Хоолны мөнгө"
                                                className="h-10 rounded-lg border bg-background"
                                            />
                                        </div>
                                        <div className="w-40 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Дүн</label>
                                            <Input
                                                type="text"
                                                value={allowance.amount.toLocaleString('en-US')}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const value = e.target.value.replace(/,/g, '');
                                                    const numValue = parseFloat(value) || 0;
                                                    handleUpdateAllowance(index, 'amount', numValue);
                                                }}
                                                placeholder="0"
                                                className="h-10 rounded-lg border bg-background"
                                            />
                                        </div>
                                        <div className="w-32 space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">Мөчлөг</label>
                                            <Select
                                                value={allowance.period || 'monthly'}
                                                onValueChange={(val) => handleUpdateAllowance(index, 'period', val)}
                                            >
                                                <SelectTrigger className="h-10 rounded-lg border bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="monthly">Сараар</SelectItem>
                                                    <SelectItem value="daily">Өдөрөөр</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveAllowance(index)}
                                            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        position.benefits?.allowances && position.benefits.allowances.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {position.benefits.allowances.map((allowance: Allowance, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-muted/5 group hover:bg-muted/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                                                <DollarSign className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{allowance.name}</p>
                                                <p className="text-xs font-medium text-muted-foreground">
                                                    {allowance.period === 'daily' ? 'Өдөр бүр' : 'Сар бүр'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-primary">{allowance.amount.toLocaleString()}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">{allowance.currency || 'MNT'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <DollarSign className="w-6 h-6 text-muted-foreground/30" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Хангамж бүртгэгдээгүй</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </section>
    );
}
