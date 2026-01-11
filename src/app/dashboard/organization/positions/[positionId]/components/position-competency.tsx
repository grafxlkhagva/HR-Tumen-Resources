'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Target, MapPin, Edit2, Check, X, CheckCircle2, Plus, Trash2, FileText, Upload, Download, Loader2, Clock } from 'lucide-react';
import { Position } from '../../../types';
import { useFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { format } from 'date-fns';

interface PositionCompetencyProps {
    position: Position;
    onUpdate: (data: Partial<Position>) => Promise<void>;
    isEditing?: boolean;
}

export function PositionCompetency({
    position,
    onUpdate,
    isEditing = false
}: PositionCompetencyProps) {
    const { storage } = useFirebase();
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        purpose: position.purpose || '',
        responsibilities: position.responsibilities || []
    });
    const [newResponsibility, setNewResponsibility] = useState('');

    const handleFieldUpdate = (field: string, value: any) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);
        onUpdate({ [field]: value });
    };

    const addResponsibility = () => {
        if (!newResponsibility.trim()) return;
        const newResponsibilities = [...formData.responsibilities, newResponsibility.trim()];
        setFormData(prev => ({
            ...prev,
            responsibilities: newResponsibilities
        }));
        onUpdate({ responsibilities: newResponsibilities });
        setNewResponsibility('');
    };

    const removeResponsibility = (index: number) => {
        const newResponsibilities = formData.responsibilities.filter((_, i) => i !== index);
        setFormData(prev => ({
            ...prev,
            responsibilities: newResponsibilities
        }));
        onUpdate({ responsibilities: newResponsibilities });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !storage) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `job-descriptions/${position.id}/${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            await onUpdate({
                jobDescriptionFile: {
                    name: file.name,
                    url: url,
                    uploadedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Upload failed', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileDelete = async () => {
        if (!position.jobDescriptionFile || !storage) return;

        setIsUploading(true);
        try {
            // Optional: try to delete from storage if we have the url/path
            // Here we just clear the field from firestore for simplicity
            await onUpdate({
                // @ts-ignore
                jobDescriptionFile: null
            });
        } catch (error) {
            console.error('Delete failed', error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900 tracking-tight">Ажлын байрны тодорхойлолт</h3>
                        <p className="text-xs text-slate-400 font-medium">Зорилго, чиг үүрэг болон баримт бичгүүд</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Purpose */}
                <Card className="border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/60 overflow-hidden bg-white rounded-3xl">
                    <CardHeader className="bg-slate-50/30 border-b border-slate-100 flex flex-row items-center justify-between px-8 py-6">
                        <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2.5">
                            <Target className="w-4 h-4 text-primary/60" /> Ажлын байрны зорилго
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        {isEditing ? (
                            <Textarea
                                value={formData.purpose}
                                onChange={(e) => handleFieldUpdate('purpose', e.target.value)}
                                className="min-h-[180px] rounded-2xl border-slate-200 bg-slate-50/30 focus-visible:ring-primary/20 transition-all p-5 text-[15px] leading-relaxed"
                                placeholder="Энэхүү ажлын байрны үндсэн зорилгыг оруулна уу..."
                            />
                        ) : (
                            <div className="relative group/content">
                                {position.purpose ? (
                                    <p className="text-[15px] text-slate-600 leading-relaxed font-medium">
                                        {position.purpose}
                                    </p>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                            <Target className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Зорилго тодорхойлогдоогүй</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Responsibilities */}
                <Card className="border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/60 overflow-hidden bg-white rounded-3xl">
                    <CardHeader className="bg-slate-50/30 border-b border-slate-100 flex flex-row items-center justify-between px-8 py-6">
                        <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2.5">
                            <MapPin className="w-4 h-4 text-primary/60" /> Үндсэн чиг үүрэг
                        </CardTitle>
                        {isEditing && (
                            <Badge variant="outline" className="rounded-lg text-[9px] px-2 h-5 border-slate-200 text-slate-400 font-semibold uppercase">
                                {formData.responsibilities.length} ЧИГ ҮҮРЭГ
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="p-8">
                        {isEditing ? (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    {formData.responsibilities.map((req, i) => (
                                        <div key={i} className="flex gap-3 items-center group/item">
                                            <div className="h-10 w-full flex items-center relative">
                                                <Input
                                                    value={req}
                                                    onChange={(e) => {
                                                        const newReqs = [...formData.responsibilities];
                                                        newReqs[i] = e.target.value;
                                                        setFormData(prev => ({ ...prev, responsibilities: newReqs }));
                                                        onUpdate({ responsibilities: newReqs });
                                                    }}
                                                    className="h-12 w-full rounded-xl border-slate-200 bg-slate-50/30 pl-4 pr-10 focus-visible:ring-primary/20 transition-all font-medium text-sm"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeResponsibility(i)}
                                                    className="absolute right-1.5 h-9 w-9 opacity-0 group-hover/item:opacity-100 hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <Input
                                        value={newResponsibility}
                                        onChange={(e) => setNewResponsibility(e.target.value)}
                                        placeholder="Шинэ чиг үүрэг нэмэх..."
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibility())}
                                        className="h-12 rounded-xl border-slate-200 bg-white shadow-sm focus-visible:ring-primary/20 transition-all font-medium text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={addResponsibility}
                                        className="h-12 w-12 rounded-xl border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all shrink-0"
                                    >
                                        <Plus className="w-5 h-5 text-primary" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            position.responsibilities && position.responsibilities.length > 0 ? (
                                <ul className="space-y-5">
                                    {position.responsibilities.map((req, i) => (
                                        <li key={i} className="flex gap-4 group/item">
                                            <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5 group-hover/item:scale-110 transition-transform duration-300">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                            <p className="text-[14px] text-slate-600 font-medium leading-[1.6]">
                                                {req}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center opacity-30">
                                    <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                        <MapPin className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Чиг үүрэг бүртгэгдээгүй</p>
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>

                {/* Job Description File Upload */}
                <Card className="border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/60 overflow-hidden bg-white rounded-3xl md:col-span-2">
                    <CardHeader className="bg-slate-50/30 border-b border-slate-100 flex flex-row items-center justify-between px-8 py-6">
                        <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-primary/60" /> Ажлын байрны тодорхойлолт (Баримт бичиг)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8">
                        {position.jobDescriptionFile ? (
                            <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group/file hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500">
                                <div className="flex items-center gap-5">
                                    <div className="h-16 w-16 rounded-[22px] bg-white flex items-center justify-center text-primary shadow-xl shadow-slate-200/50 border border-slate-100 transition-transform group-hover/file:scale-105 duration-500">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[15px] font-semibold text-slate-900 tracking-tight leading-tight">{position.jobDescriptionFile.name}</p>
                                        <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-2">
                                            <Upload className="w-3 h-3" />
                                            {format(new Date(position.jobDescriptionFile.uploadedAt), 'yyyy-MM-dd HH:mm')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl h-10 px-5 font-semibold text-xs border-slate-200 bg-white hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-95"
                                        asChild
                                    >
                                        <a href={position.jobDescriptionFile.url} target="_blank" rel="noopener noreferrer">
                                            <Download className="w-4 h-4 mr-2" /> Татах
                                        </a>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/5 border border-transparent hover:border-destructive/10 transition-all"
                                        onClick={handleFileDelete}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative border-2 border-dashed border-slate-100 rounded-[32px] p-16 transition-all hover:border-primary/40 hover:bg-primary/5 group/dropzone bg-slate-50/20">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                                <div className="flex flex-col items-center justify-center text-center space-y-6">
                                    <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center text-slate-200 group-hover/dropzone:scale-110 group-hover/dropzone:text-primary transition-all duration-500 shadow-sm ring-1 ring-slate-100">
                                        {isUploading ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : <Upload className="h-12 w-12" />}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-lg font-semibold text-slate-900 tracking-tight">Ажлын байрны тодорхойлолт хавсаргах</p>
                                        <p className="text-sm text-slate-400 px-8 leading-relaxed max-w-sm">Файлаа энд чирч оруулна уу, эсвэл <span className="text-primary font-semibold">компьютерээсээ сонгох</span></p>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] uppercase font-bold text-slate-300 tracking-[0.2em] pt-4">
                                        <span>PDF</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                                        <span>DOCX</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-200"></span>
                                        <span>MAX 10MB</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
