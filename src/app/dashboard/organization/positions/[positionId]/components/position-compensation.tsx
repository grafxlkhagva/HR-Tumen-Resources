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
        <div className="space-y-8">
            <Card className="border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/60 overflow-hidden bg-white rounded-3xl">
                <CardHeader className="bg-slate-50/30 border-b border-slate-100 flex flex-row items-center justify-between px-8 py-6">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Цалин хөлс</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="p-10 space-y-12">
                    {/* Salary Range Section */}
                    <div className="space-y-8">
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <div className="space-y-2.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Доод хэмжээ</label>
                                    <Input
                                        type="text"
                                        value={formData.salaryMin.toLocaleString('en-US')}
                                        onChange={e => {
                                            const value = e.target.value.replace(/,/g, '');
                                            const numValue = parseInt(value) || 0;
                                            handleFieldUpdate('salaryMin', numValue);
                                        }}
                                        className="h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Дундаж хэмжээ</label>
                                    <Input
                                        type="text"
                                        value={formData.salaryMid.toLocaleString('en-US')}
                                        onChange={e => {
                                            const value = e.target.value.replace(/,/g, '');
                                            const numValue = parseInt(value) || 0;
                                            handleFieldUpdate('salaryMid', numValue);
                                        }}
                                        className="h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Дээд хэмжээ</label>
                                    <Input
                                        type="text"
                                        value={formData.salaryMax.toLocaleString('en-US')}
                                        onChange={e => {
                                            const value = e.target.value.replace(/,/g, '');
                                            const numValue = parseInt(value) || 0;
                                            handleFieldUpdate('salaryMax', numValue);
                                        }}
                                        className="h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Валют</label>
                                    <Select value={formData.salaryCurrency} onValueChange={(val) => handleFieldUpdate('salaryCurrency', val)}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="MNT">MNT (₮)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Мөчлөг</label>
                                    <Select value={formData.salaryPeriod} onValueChange={(val) => handleFieldUpdate('salaryPeriod', val as 'monthly' | 'yearly')}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="monthly">Сараар</SelectItem>
                                            <SelectItem value="yearly">Жилээр</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Төлөвлөсөн дундаж цалин</p>
                                        <div className="flex items-baseline gap-2">
                                            <h2 className="text-4xl font-semibold text-slate-900 tracking-tight">
                                                {position.compensation?.salaryRange?.mid?.toLocaleString() || '-'}
                                            </h2>
                                            <span className="text-lg font-semibold text-slate-400">{position.compensation?.salaryRange?.currency || 'MNT'}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="rounded-full px-4 py-1.5 border-slate-200 bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                                        {position.compensation?.salaryRange?.period === 'monthly' ? 'Сар бүр' : 'Жил бүр'}
                                    </Badge>
                                </div>

                                {/* Modern Salary Range Bar */}
                                <div className="space-y-4">
                                    <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden ring-1 ring-slate-200/50">
                                        <div
                                            className="absolute inset-y-0 bg-gradient-to-r from-emerald-500/20 via-emerald-500/40 to-emerald-500/20 rounded-full"
                                            style={{ left: '20%', right: '20%' }}
                                        />
                                        <div
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-1.5 bg-emerald-500 rounded-full border-2 border-white shadow-sm z-10"
                                        />
                                    </div>
                                    <div className="flex justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Минимум</p>
                                            <p className="text-sm font-semibold text-slate-600">{position.compensation?.salaryRange?.min?.toLocaleString() || '0'}</p>
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Максимум</p>
                                            <p className="text-sm font-semibold text-slate-600">{position.compensation?.salaryRange?.max?.toLocaleString() || '0'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent w-full" />

                    {/* Variable Pay Section */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                            </div>
                            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-800">Нэмэлт урамшуулал</h4>
                        </div>

                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Бонус / Урамшуулал</label>
                                    <Input placeholder="Жишээ: Жилийн бүтээмжийн бонус 10-20%" value={formData.bonusDescription} onChange={e => handleFieldUpdate('bonusDescription', e.target.value)} className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Комисс</label>
                                    <Input placeholder="Жишээ: Борлуулалтын орлогын 2%" value={formData.commissionDescription} onChange={e => handleFieldUpdate('commissionDescription', e.target.value)} className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2.5 md:col-span-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Хувьцаа / ESOP</label>
                                    <Input placeholder="Жишээ: 1000 нэгж хувьцаа" value={formData.equityDescription} onChange={e => handleFieldUpdate('equityDescription', e.target.value)} className="h-12 rounded-xl" />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {position.compensation?.variablePay?.bonusDescription && (
                                    <div className="group/item flex flex-col gap-4 p-6 rounded-3xl bg-slate-50/50 ring-1 ring-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/30 transition-all duration-500">
                                        <div className="h-12 w-12 rounded-[18px] bg-white border border-slate-100 flex items-center justify-center text-amber-500 shadow-sm transition-transform group-hover/item:scale-110 duration-500">
                                            <Gift className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Бонус / Урамшуулал</p>
                                            <p className="text-sm font-semibold text-slate-700 leading-relaxed">{position.compensation.variablePay.bonusDescription}</p>
                                        </div>
                                    </div>
                                )}
                                {position.compensation?.variablePay?.commissionDescription && (
                                    <div className="group/item flex flex-col gap-4 p-6 rounded-3xl bg-slate-50/50 ring-1 ring-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/30 transition-all duration-500">
                                        <div className="h-12 w-12 rounded-[18px] bg-white border border-slate-100 flex items-center justify-center text-emerald-500 shadow-sm transition-transform group-hover/item:scale-110 duration-500">
                                            <Coins className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Комисс</p>
                                            <p className="text-sm font-semibold text-slate-700 leading-relaxed">{position.compensation.variablePay.commissionDescription}</p>
                                        </div>
                                    </div>
                                )}
                                {position.compensation?.variablePay?.equityDescription && (
                                    <div className="group/item flex flex-col gap-4 p-6 rounded-3xl bg-slate-50/50 ring-1 ring-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/30 transition-all duration-500">
                                        <div className="h-12 w-12 rounded-[18px] bg-white border border-slate-100 flex items-center justify-center text-blue-500 shadow-sm transition-transform group-hover/item:scale-110 duration-500">
                                            <CreditCard className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Хувьцаа / ESOP</p>
                                            <p className="text-sm font-semibold text-slate-700 leading-relaxed">{position.compensation.variablePay.equityDescription}</p>
                                        </div>
                                    </div>
                                )}
                                {!position.compensation?.variablePay?.bonusDescription &&
                                    !position.compensation?.variablePay?.commissionDescription &&
                                    !position.compensation?.variablePay?.equityDescription && (
                                        <div className="md:col-span-3 py-10 flex flex-col items-center justify-center text-center opacity-30">
                                            <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                                <Sparkles className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Нэмэлт урамшуулал бүртгэгдээгүй</p>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
