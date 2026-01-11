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
        <section className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-bold tracking-tight">Ажлын байрны тодорхойлолт</h3>
                    <p className="text-xs text-muted-foreground font-semibold">Зорилго, чиг үүрэг болон баримт бичгүүд</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Purpose */}
                <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b p-6">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" /> Ажлын байрны зорилго
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isEditing ? (
                            <Textarea
                                value={formData.purpose}
                                onChange={(e) => handleFieldUpdate('purpose', e.target.value)}
                                className="min-h-[140px] rounded-xl border bg-muted/30 focus-visible:ring-primary/20 transition-all p-4 text-sm leading-relaxed"
                                placeholder="Энэхүү ажлын байрны үндсэн зорилгыг оруулна уу..."
                            />
                        ) : (
                            <div className="relative">
                                {position.purpose ? (
                                    <p className="text-sm text-foreground leading-relaxed font-medium">
                                        {position.purpose}
                                    </p>
                                ) : (
                                    <div className="py-8 flex flex-col items-center justify-center text-center">
                                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                            <Target className="w-6 h-6 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Зорилго тодорхойлогдоогүй</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Responsibilities */}
                <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b p-6 flex flex-row items-center justify-between">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" /> Үндсэн чиг үүрэг
                        </CardTitle>
                        <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-[10px] font-bold">
                            {formData.responsibilities.length}
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-6">
                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    {formData.responsibilities.map((req, i) => (
                                        <div key={i} className="flex gap-2 items-center group/item">
                                            <Input
                                                value={req}
                                                onChange={(e) => {
                                                    const newReqs = [...formData.responsibilities];
                                                    newReqs[i] = e.target.value;
                                                    setFormData(prev => ({ ...prev, responsibilities: newReqs }));
                                                    onUpdate({ responsibilities: newReqs });
                                                }}
                                                className="h-10 rounded-xl border bg-muted/30 px-4 focus-visible:ring-primary/20 transition-all text-sm font-medium"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeResponsibility(i)}
                                                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-4 border-t border-dashed">
                                    <Input
                                        value={newResponsibility}
                                        onChange={(e) => setNewResponsibility(e.target.value)}
                                        placeholder="Шинэ чиг үүрэг нэмэх..."
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibility())}
                                        className="h-10 rounded-xl border bg-background shadow-sm focus-visible:ring-primary/20 transition-all text-sm font-medium"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={addResponsibility}
                                        className="h-10 w-10 rounded-xl border-dashed hover:bg-primary/5 hover:text-primary transition-all shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            position.responsibilities && position.responsibilities.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {position.responsibilities.map((req, i) => (
                                        <div key={i} className="flex gap-3 p-3 rounded-xl border bg-muted/5 group hover:bg-muted/10 transition-colors">
                                            <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed">
                                                {req}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-center">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                        <MapPin className="w-6 h-6 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Чиг үүрэг бүртгэгдээгүй</p>
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>

                {/* Job Description File */}
                <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-muted/10 border-b p-6">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" /> Хавсралт файл
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {position.jobDescriptionFile ? (
                            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/10 group/file hover:bg-muted/20 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-xl bg-background border flex items-center justify-center text-primary shadow-sm group-hover/file:scale-105 transition-transform">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold truncate max-w-[200px] md:max-w-md">{position.jobDescriptionFile.name}</p>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(position.jobDescriptionFile.uploadedAt), 'yyyy.MM.dd')}
                                            </span>
                                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                            <span>PDF / DOCX</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-lg h-9 px-4 font-bold text-xs"
                                        asChild
                                    >
                                        <a href={position.jobDescriptionFile.url} target="_blank" rel="noopener noreferrer">
                                            <Download className="w-4 h-4 mr-2 text-primary" /> Татах
                                        </a>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={handleFileDelete}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative border-2 border-dashed rounded-2xl p-10 transition-all hover:border-primary/40 hover:bg-primary/5 group/dropzone bg-muted/5">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                                <div className="flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="h-16 w-16 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover/dropzone:scale-110 group-hover/dropzone:text-primary transition-all shadow-sm">
                                        {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Upload className="h-8 w-8" />}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold">Ажлын байрны тодорхойлолт хавсаргах</p>
                                        <p className="text-xs text-muted-foreground">PDF, DOCX файлууд, дээд тал нь 10MB</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
