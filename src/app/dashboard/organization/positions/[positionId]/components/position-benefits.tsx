'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Heart, Home, Clock, Plane, Edit2, Check, X } from 'lucide-react';
import { Position } from '../../../types';

interface PositionBenefitsProps {
    position: Position;
    onUpdate: (data: Partial<Position>) => Promise<void>;
}

export function PositionBenefits({
    position,
    onUpdate
}: PositionBenefitsProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        isRemoteAllowed: position.benefits?.isRemoteAllowed || false,
        flexibleHours: position.benefits?.flexibleHours || false,
        vacationDays: position.benefits?.vacationDays || 0,
        otherBenefits: position.benefits?.otherBenefits?.join('\n') || ''
    });

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onUpdate({
                benefits: {
                    isRemoteAllowed: formData.isRemoteAllowed,
                    flexibleHours: formData.flexibleHours,
                    vacationDays: Number(formData.vacationDays),
                    otherBenefits: formData.otherBenefits.split('\n').filter(r => r.trim() !== '')
                }
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update benefits', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            isRemoteAllowed: position.benefits?.isRemoteAllowed || false,
            flexibleHours: position.benefits?.flexibleHours || false,
            vacationDays: position.benefits?.vacationDays || 0,
            otherBenefits: position.benefits?.otherBenefits?.join('\n') || ''
        });
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-500" /> Хангамж ба Хөнгөлөлт
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
                    {/* Work Conditions Tags / Editors */}
                    <div className="space-y-6">
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <label className="text-base font-medium">Гэрээс ажиллах</label>
                                    <Switch checked={formData.isRemoteAllowed} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRemoteAllowed: checked }))} />
                                </div>
                                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <label className="text-base font-medium">Уян хатан цаг</label>
                                    <Switch checked={formData.flexibleHours} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, flexibleHours: checked }))} />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="text-sm font-medium">Нэмэлт амралтын хоног (Жилд)</label>
                                    <Input type="number" value={formData.vacationDays} onChange={e => setFormData(prev => ({ ...prev, vacationDays: parseInt(e.target.value) || 0 }))} />
                                    <p className="text-[10px] text-slate-500">Хуулийн дагуух 15 хоногоос гадуурх нэмэлт хоног.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {position.benefits?.isRemoteAllowed && (
                                    <Badge className="bg-blue-50 text-blue-600 border border-blue-100 rounded-lg px-4 py-1.5 font-bold text-[10px] uppercase gap-2">
                                        <Home className="w-3.5 h-3.5" /> Гэрээс ажиллах боломжтой
                                    </Badge>
                                )}
                                {position.benefits?.flexibleHours && (
                                    <Badge className="bg-amber-50 text-amber-600 border border-amber-100 rounded-lg px-4 py-1.5 font-bold text-[10px] uppercase gap-2">
                                        <Clock className="w-3.5 h-3.5" /> Уян хатан цаг
                                    </Badge>
                                )}
                                {position.benefits?.vacationDays && position.benefits.vacationDays > 0 ? (
                                    <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg px-4 py-1.5 font-bold text-[10px] uppercase gap-2">
                                        <Plane className="w-3.5 h-3.5" /> +{position.benefits.vacationDays} хоногийн амралт
                                    </Badge>
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-100 w-full" />

                    {/* List of Benefits */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800">Бусад хөнгөлөлтүүд</h4>
                        {isEditing ? (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500">Мөр бүрт нэг хөнгөлөлт бичнэ үү</label>
                                <Textarea
                                    className="min-h-[150px]"
                                    value={formData.otherBenefits}
                                    onChange={(e) => setFormData(prev => ({ ...prev, otherBenefits: e.target.value }))}
                                    placeholder="Жишээ нь:&#10;Үнэгүй хоол&#10;Фитнес"
                                />
                            </div>
                        ) : (
                            position.benefits?.otherBenefits && position.benefits.otherBenefits.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {position.benefits.otherBenefits.map((benefit, i) => (
                                        benefit.trim() && (
                                            <div key={i} className="flex items-center gap-4 group">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:scale-150 group-hover:bg-primary transition-all shrink-0" />
                                                <p className="text-sm text-slate-600 font-medium">{benefit}</p>
                                            </div>
                                        )
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic font-medium text-center py-8">Бүртгэлтэй бусад хөнгөлөлт байхгүй</p>
                            )
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
