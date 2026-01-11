'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Edit2, Check, X, PlusCircle, Trash2, DollarSign } from 'lucide-react';
import { Position } from '../../../types';

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
        allowances: position.benefits?.allowances || []
    });

    const handleFieldUpdate = (field: string, value: any) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);

        // Map back to the Position structure
        onUpdate({
            benefits: {
                allowances: field === 'allowances' ? value : formData.allowances
            }
        });
    };

    const handleAddAllowance = () => {
        const newAllowances = [...formData.allowances, { name: '', amount: 0, currency: 'MNT' }];
        handleFieldUpdate('allowances', newAllowances);
    };

    const handleRemoveAllowance = (index: number) => {
        const newAllowances = formData.allowances.filter((_, i) => i !== index);
        handleFieldUpdate('allowances', newAllowances);
    };

    const handleUpdateAllowance = (index: number, field: 'name' | 'amount' | 'currency', value: any) => {
        const newAllowances = [...formData.allowances];
        newAllowances[index] = { ...newAllowances[index], [field]: value };
        handleFieldUpdate('allowances', newAllowances);
    };

    return (
        <div className="space-y-8">
            <Card className="border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/60 overflow-hidden bg-white rounded-3xl">
                <CardHeader className="bg-slate-50/30 border-b border-slate-100 flex flex-row items-center justify-between px-8 py-6">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                        </div>
                        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Хамгамж ба хөнгөлөлт</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="p-10 space-y-12">


                    {/* Allowances Section */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                </div>
                                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-800">Хангамжийн мөнгөн дүн</h4>
                            </div>
                            {isEditing && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddAllowance}
                                    className="rounded-xl border-dashed"
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    Нэмэх
                                </Button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="space-y-4">
                                {formData.allowances.length === 0 ? (
                                    <div className="py-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                                        <DollarSign className="w-8 h-8 text-slate-300 mb-2" />
                                        <p className="text-xs font-medium text-slate-400">Хангамж нэмэгдээгүй байна</p>
                                        <p className="text-[10px] text-slate-300 mt-1">Дээрх "Нэмэх" товчийг дарж эхлүүлнэ үү</p>
                                    </div>
                                ) : (
                                    formData.allowances.map((allowance, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-3 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
                                            <div className="col-span-12 sm:col-span-6">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">Нэр</label>
                                                <Input
                                                    value={allowance.name}
                                                    onChange={(e) => handleUpdateAllowance(index, 'name', e.target.value)}
                                                    placeholder="Жишээ: Хоолны мөнгө"
                                                    className="h-10 rounded-xl border-slate-200 bg-slate-50/50"
                                                />
                                            </div>
                                            <div className="col-span-9 sm:col-span-4">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">Дүн</label>
                                                <Input
                                                    type="text"
                                                    value={allowance.amount.toLocaleString('en-US')}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/,/g, '');
                                                        const numValue = parseFloat(value) || 0;
                                                        handleUpdateAllowance(index, 'amount', numValue);
                                                    }}
                                                    placeholder="0"
                                                    className="h-10 rounded-xl border-slate-200 bg-slate-50/50"
                                                />
                                            </div>
                                            <div className="col-span-3 sm:col-span-2 flex items-end">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveAllowance(index)}
                                                    className="h-10 w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            position.benefits?.allowances && position.benefits.allowances.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {position.benefits.allowances.map((allowance, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100 group hover:bg-emerald-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                                    <DollarSign className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{allowance.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">Сар бүр</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-emerald-600">{allowance.amount.toLocaleString()}</p>
                                                <p className="text-[10px] text-slate-400 font-semibold">{allowance.currency || 'MNT'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-center opacity-30">
                                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                                        <DollarSign className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Хангамж бүртгэгдээгүй</p>
                                </div>
                            )
                        )}
                    </div>


                </CardContent>
            </Card>
        </div>
    );
}
