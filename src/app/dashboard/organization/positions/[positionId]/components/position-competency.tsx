'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Target, MapPin, Edit2, Check, X, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Position } from '../../../types';

interface PositionCompetencyProps {
    position: Position;
    onUpdate: (data: Partial<Position>) => Promise<void>;
}

export function PositionCompetency({
    position,
    onUpdate
}: PositionCompetencyProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        description: position.description || '',
        requirements: position.requirements || []
    });
    const [newRequirement, setNewRequirement] = useState('');

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onUpdate(formData);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update competency', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            description: position.description || '',
            requirements: position.requirements || []
        });
        setNewRequirement('');
        setIsEditing(false);
    };

    const addRequirement = () => {
        if (!newRequirement.trim()) return;
        setFormData(prev => ({
            ...prev,
            requirements: [...prev.requirements, newRequirement.trim()]
        }));
        setNewRequirement('');
    };

    const removeRequirement = (index: number) => {
        setFormData(prev => ({
            ...prev,
            requirements: prev.requirements.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 hidden">Ур чадвар</h3>
                {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="ml-auto">
                        <Edit2 className="w-4 h-4 mr-2" /> Засах
                    </Button>
                )}
                {isEditing && (
                    <div className="ml-auto flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isLoading}>
                            <X className="w-4 h-4 mr-2" /> Цуцлах
                        </Button>
                        <Button variant="default" size="sm" onClick={handleSave} disabled={isLoading}>
                            <Check className="w-4 h-4 mr-2" /> Хадгалах
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Description */}
                <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" /> Албан тушаалын зорилго
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        {isEditing ? (
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="min-h-[150px]"
                                placeholder="Албан тушаалын зорилгыг оруулна уу..."
                            />
                        ) : (
                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                {position.description || 'Зорилго тодорхойлогдоогүй байна. "Засах" хэсгээс оруулна уу.'}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Requirements */}
                <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" /> Тавигдах шаардлага
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    {formData.requirements.map((req, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <Input
                                                value={req}
                                                onChange={(e) => {
                                                    const newReqs = [...formData.requirements];
                                                    newReqs[i] = e.target.value;
                                                    setFormData(prev => ({ ...prev, requirements: newReqs }));
                                                }}
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeRequirement(i)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={newRequirement}
                                        onChange={(e) => setNewRequirement(e.target.value)}
                                        placeholder="Шинэ шаардлага нэмэх..."
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                                    />
                                    <Button variant="outline" size="icon" onClick={addRequirement}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            position.requirements && position.requirements.length > 0 ? (
                                <ul className="space-y-4">
                                    {position.requirements.map((req, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-600 font-medium">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            {req}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-slate-400 italic font-medium">Шаардлага бүртгэгдээгүй байна.</p>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
