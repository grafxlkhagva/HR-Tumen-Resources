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
}

export function PositionCompensation({
    position,
    onUpdate
}: PositionCompensationProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
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

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onUpdate({
                compensation: {
                    salaryRange: {
                        min: Number(formData.salaryMin),
                        mid: Number(formData.salaryMid),
                        max: Number(formData.salaryMax),
                        currency: formData.salaryCurrency,
                        period: formData.salaryPeriod as 'monthly' | 'yearly'
                    },
                    variablePay: {
                        bonusDescription: formData.bonusDescription,
                        commissionDescription: formData.commissionDescription,
                        equityDescription: formData.equityDescription
                    }
                }
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update compensation', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            salaryMin: position.compensation?.salaryRange?.min || 0,
            salaryMid: position.compensation?.salaryRange?.mid || 0,
            salaryMax: position.compensation?.salaryRange?.max || 0,
            salaryCurrency: position.compensation?.salaryRange?.currency || 'MNT',
            salaryPeriod: position.compensation?.salaryRange?.period || 'monthly',
            bonusDescription: position.compensation?.variablePay?.bonusDescription || '',
            commissionDescription: position.compensation?.variablePay?.commissionDescription || '',
            equityDescription: position.compensation?.variablePay?.equityDescription || ''
        });
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" /> Цалингийн мэдээлэл
                    </CardTitle>
                    {!isEditing ? (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
                            <Edit2 className="w-4 h-4 text-slate-400" />
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isLoading} className="h-8 w-8 p-0">
                                <X className="w-4 h-4 text-destructive" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleSave} disabled={isLoading} className="h-8 w-8 p-0">
                                <Check className="w-4 h-4 text-emerald-600" />
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    {/* Salary Range */}
                    <div className="space-y-4">
                        {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border p-4 rounded-lg bg-slate-50/50">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Доод (Min)</label>
                                    <Input type="number" value={formData.salaryMin} onChange={e => setFormData(prev => ({ ...prev, salaryMin: parseInt(e.target.value) || 0 }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Дундаж (Mid)</label>
                                    <Input type="number" value={formData.salaryMid} onChange={e => setFormData(prev => ({ ...prev, salaryMid: parseInt(e.target.value) || 0 }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Дээд (Max)</label>
                                    <Input type="number" value={formData.salaryMax} onChange={e => setFormData(prev => ({ ...prev, salaryMax: parseInt(e.target.value) || 0 }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Валют</label>
                                    <Select value={formData.salaryCurrency} onValueChange={(val) => setFormData(prev => ({ ...prev, salaryCurrency: val }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MNT">MNT (₮)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Мөчлөг</label>
                                    <Select value={formData.salaryPeriod} onValueChange={(val) => setFormData(prev => ({ ...prev, salaryPeriod: val as 'monthly' | 'yearly' }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Сараар</SelectItem>
                                            <SelectItem value="yearly">Жилээр</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Дундаж цалин</p>
                                        <p className="text-2xl font-bold text-primary">
                                            {position.compensation?.salaryRange?.mid?.toLocaleString() || '-'}
                                            <span className="text-sm ml-1 text-slate-400 font-bold">{position.compensation?.salaryRange?.currency || 'MNT'}</span>
                                        </p>
                                    </div>
                                    <Badge className="bg-primary/10 text-primary border-none font-bold text-[10px] h-6">
                                        {position.compensation?.salaryRange?.period === 'monthly' ? 'Сар бүр' : 'Жил бүр'}
                                    </Badge>
                                </div>

                                {/* Salary Range Bar */}
                                <div className="space-y-2">
                                    <div className="h-3 w-full bg-slate-100 rounded-full relative overflow-hidden ring-1 ring-slate-200/50">
                                        <div className="absolute inset-y-0 bg-primary/20 rounded-full" style={{ left: '25%', right: '25%' }} />
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-1 bg-primary rounded-full" />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                        <span>Минимум: {position.compensation?.salaryRange?.min?.toLocaleString() || '0'}</span>
                                        <span>Максимум: {position.compensation?.salaryRange?.max?.toLocaleString() || '0'}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* Variable Pay */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Нэмэлт урамшуулал
                        </h4>

                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Бонус / Урамшуулал</label>
                                    <Input placeholder="Жишээ: Жилийн бүтээмжийн бонус 10-20%" value={formData.bonusDescription} onChange={e => setFormData(prev => ({ ...prev, bonusDescription: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Комисс / Борлуулалтын шагнал</label>
                                    <Input placeholder="Жишээ: Борлуулалтын орлогын 2%" value={formData.commissionDescription} onChange={e => setFormData(prev => ({ ...prev, commissionDescription: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Хувьцаа / ESOP</label>
                                    <Input placeholder="Жишээ: 1000 нэгж хувьцаа" value={formData.equityDescription} onChange={e => setFormData(prev => ({ ...prev, equityDescription: e.target.value }))} />
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {position.compensation?.variablePay?.bonusDescription && (
                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                                            <Gift className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 leading-tight">Бонус / Урамшуулал</p>
                                            <p className="text-[11px] text-slate-600 font-medium mt-1">{position.compensation.variablePay.bonusDescription}</p>
                                        </div>
                                    </div>
                                )}
                                {position.compensation?.variablePay?.commissionDescription && (
                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
                                            <Coins className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 leading-tight">Комисс</p>
                                            <p className="text-[11px] text-slate-600 font-medium mt-1">{position.compensation.variablePay.commissionDescription}</p>
                                        </div>
                                    </div>
                                )}
                                {position.compensation?.variablePay?.equityDescription && (
                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 leading-tight">Хувьцаа / ESOP</p>
                                            <p className="text-[11px] text-slate-600 font-medium mt-1">{position.compensation.variablePay.equityDescription}</p>
                                        </div>
                                    </div>
                                )}
                                {!position.compensation?.variablePay?.bonusDescription &&
                                    !position.compensation?.variablePay?.commissionDescription &&
                                    !position.compensation?.variablePay?.equityDescription && (
                                        <p className="text-sm text-slate-400 italic font-medium">Нэмэлт урамшуулал бүртгэгдээгүй байна.</p>
                                    )}
                            </div>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
