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
import { DollarSign, Sparkles, Gift, Coins, CreditCard, Edit2, Check, X } from 'lucide-react';
import { Position } from '../../../types';

interface PositionCompensationProps {
    position: Position;
    onUpdate: (data: Partial<Position>) => Promise<void>;
    isEditing?: boolean;
}

export function PositionCompensation({
    position,
    onUpdate,
    isEditing = false
}: PositionCompensationProps) {
    const [formData, setFormData] = useState({
        salaryMin: position.compensation?.salaryRange?.min || 0,
        salaryMid: position.compensation?.salaryRange?.mid || 0,
        salaryMax: position.compensation?.salaryRange?.max || 0,
        salaryCurrency: position.compensation?.salaryRange?.currency || 'MNT',
        salaryPeriod: position.compensation?.salaryRange?.period || 'monthly',
        bonusDescription: position.compensation?.variablePay?.bonusDescription || '',
        commissionDescription: position.compensation?.variablePay?.commissionDescription || '',
        equityDescription: position.compensation?.variablePay?.equityDescription || ''
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
                    bonusDescription: field === 'bonusDescription' ? value : formData.bonusDescription,
                    commissionDescription: field === 'commissionDescription' ? value : formData.commissionDescription,
                    equityDescription: field === 'equityDescription' ? value : formData.equityDescription
                }
            }
        });
    };

    return (
        <section className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold tracking-tight">Цалин хөлс</h3>
                    <p className="text-xs text-muted-foreground font-semibold">Ажлын байрны цалингийн ангилал ба нөхцөл</p>
                </div>
            </div>

            <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-6">
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
                                            onChange={e => {
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
                                            onChange={e => {
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
                                            onChange={e => {
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
                            <label className="text-sm font-medium text-muted-foreground">Нэмэлт урамшуулал & Бонус</label>

                            {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-foreground">Бонус / Урамшуулал</p>
                                        <Input placeholder="Жишээ: Жилийн бүтээмжийн бонус 10-20%" value={formData.bonusDescription} onChange={e => handleFieldUpdate('bonusDescription', e.target.value)} className="h-10 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-foreground">Комисс</p>
                                        <Input placeholder="Жишээ: Борлуулалтын орлогын 2%" value={formData.commissionDescription} onChange={e => handleFieldUpdate('commissionDescription', e.target.value)} className="h-10 rounded-xl" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <p className="text-xs font-bold text-foreground">Хувьцаа / ESOP</p>
                                        <Input placeholder="Жишээ: 1000 нэгж хувьцаа" value={formData.equityDescription} onChange={e => handleFieldUpdate('equityDescription', e.target.value)} className="h-10 rounded-xl" />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {position.compensation?.variablePay?.bonusDescription && (
                                        <div className="flex flex-col gap-4 p-5 rounded-xl border bg-muted/5 hover:bg-muted/10 transition-colors">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                                <Gift className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Бонус</p>
                                                <p className="text-sm font-bold leading-relaxed">{position.compensation.variablePay.bonusDescription}</p>
                                            </div>
                                        </div>
                                    )}
                                    {position.compensation?.variablePay?.commissionDescription && (
                                        <div className="flex flex-col gap-4 p-5 rounded-xl border bg-muted/5 hover:bg-muted/10 transition-colors">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                                <Coins className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Комисс</p>
                                                <p className="text-sm font-bold leading-relaxed">{position.compensation.variablePay.commissionDescription}</p>
                                            </div>
                                        </div>
                                    )}
                                    {position.compensation?.variablePay?.equityDescription && (
                                        <div className="flex flex-col gap-4 p-5 rounded-xl border bg-muted/5 hover:bg-muted/10 transition-colors">
                                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Хувьцаа</p>
                                                <p className="text-sm font-bold leading-relaxed">{position.compensation.variablePay.equityDescription}</p>
                                            </div>
                                        </div>
                                    )}
                                    {!position.compensation?.variablePay?.bonusDescription &&
                                        !position.compensation?.variablePay?.commissionDescription &&
                                        !position.compensation?.variablePay?.equityDescription && (
                                            <div className="md:col-span-3 py-8 flex flex-col items-center justify-center text-center opacity-40">
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
                </CardContent>
            </Card>
        </section>
    );
}
