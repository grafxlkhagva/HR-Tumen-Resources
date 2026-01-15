'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    PlusCircle,
    X,
    Target,
    MapPin,
    GraduationCap,
    Award,
    FileText,
    Clock,
    Download,
    Trash2,
    Edit3,
    Save,
    Target as TargetIcon
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Position } from '../../../types';
import { doc } from 'firebase/firestore';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';

interface PositionCompetencyProps {
    position: Position;
}

interface Skill {
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface Responsibility {
    title: string;
    description: string;
}

export function PositionCompetency({
    position
}: PositionCompetencyProps) {
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        purpose: position.purpose || '',
        responsibilities: position.responsibilities || [],
        skills: position.skills || [],
        experience: {
            totalYears: position.experience?.totalYears || 0,
            leadershipYears: position.experience?.leadershipYears || 0,
            educationLevel: position.experience?.educationLevel || '',
            professions: position.experience?.professions || [],
        }
    });

    const handleFieldUpdate = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleExperienceUpdate = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            experience: { ...prev.experience, [field]: value }
        }));
    };

    const handleAddSkill = (name: string, level: string) => {
        if (!name) return;
        setFormData(prev => ({
            ...prev,
            skills: [...prev.skills, { name, level: level as any }]
        }));
    };

    const removeSkill = (index: number) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter((_, i) => i !== index)
        }));
    };

    const handleAddResponsibility = () => {
        setFormData(prev => ({
            ...prev,
            responsibilities: [...prev.responsibilities, { title: '', description: '' }]
        }));
    };

    const removeResponsibility = (index: number) => {
        setFormData(prev => ({
            ...prev,
            responsibilities: prev.responsibilities.filter((_, i) => i !== index)
        }));
    };

    const updateResponsibility = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newList = [...prev.responsibilities];
            newList[index] = { ...newList[index], [field]: value };
            return { ...prev, responsibilities: newList };
        });
    };

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            await updateDocumentNonBlocking(doc(firestore, 'positions', position.id), {
                purpose: formData.purpose,
                responsibilities: formData.responsibilities,
                skills: formData.skills,
                experience: formData.experience,
                updatedAt: new Date().toISOString(),
            });
            toast({ title: "Чадвар & Туршлага хадгалагдлаа" });
            setIsEditing(false);
        } catch (e) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            purpose: position.purpose || '',
            responsibilities: position.responsibilities || [],
            skills: position.skills || [],
            experience: {
                totalYears: position.experience?.totalYears || 0,
                leadershipYears: position.experience?.leadershipYears || 0,
                educationLevel: position.experience?.educationLevel || '',
                professions: position.experience?.professions || [],
            }
        });
        setIsEditing(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !firestore) return;

        setIsSaving(true);
        try {
            const fileRef = ref(storage, `positions/${position.id}/jd/${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);

            await updateDocumentNonBlocking(doc(firestore, 'positions', position.id), {
                jobDescriptionFile: {
                    name: file.name,
                    url,
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                }
            });
            toast({ title: "JD Файл амжилттай хавсаргагдлаа" });
        } catch (e) {
            toast({ title: "Файл хуулахад алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="space-y-10">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ур чадвар & Туршлага</label>
                {!isEditing ? (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 gap-2 text-primary hover:text-primary/90 hover:bg-primary/10 font-bold text-[10px] uppercase tracking-widest rounded-lg">
                        <Edit3 className="w-3.5 h-3.5" />
                        Засах
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8 px-3 text-muted-foreground hover:text-foreground font-bold text-[10px] uppercase tracking-widest rounded-lg">
                            Болих
                        </Button>
                        <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} className="h-8 gap-2 bg-primary hover:bg-primary/90 shadow-sm font-bold text-[10px] uppercase tracking-widest rounded-lg">
                            <Save className="w-3.5 h-3.5" />
                            Хадгалах
                        </Button>
                    </div>
                )}
            </div>

            <div className="space-y-10">
                {/* Purpose Section */}
                <div className="space-y-4">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Ажлын байрны зорилго</label>
                    {isEditing ? (
                        <Textarea
                            value={formData.purpose}
                            onChange={(e) => handleFieldUpdate('purpose', e.target.value)}
                            placeholder="Энэхүү ажлын байрны үндсэн зорилгыг тодорхойлно уу..."
                            className="min-h-[120px] rounded-xl border-border p-4 leading-relaxed"
                        />
                    ) : (
                        <div className="p-6 rounded-xl border border-border bg-muted/30">
                            {position.purpose ? (
                                <p className="text-sm text-foreground/80 leading-relaxed font-medium italic">"{position.purpose}"</p>
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-center opacity-40">
                                    <TargetIcon className="w-8 h-8 text-muted-foreground mb-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Зорилго тодорхойлогдоогүй</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Responsibilities Section */}
                <div className="space-y-6">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Үндсэн чиг үүрэг</label>
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                {formData.responsibilities.map((res, i) => (
                                    <div key={i} className="group relative p-4 rounded-xl border border-slate-200 bg-white">
                                        <div className="flex gap-4 mb-2">
                                            <Input
                                                value={res.title}
                                                onChange={(e) => updateResponsibility(i, 'title', e.target.value)}
                                                placeholder="Чиг үүргийн нэр"
                                                className="font-bold border-none p-0 h-auto focus-visible:ring-0 shadow-none text-sm"
                                            />
                                            <button onClick={() => removeResponsibility(i)} className="text-slate-300 hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                                        </div>
                                        <Textarea
                                            value={res.description}
                                            onChange={(e) => updateResponsibility(i, 'description', e.target.value)}
                                            placeholder="Дэлгэрэнгүй тодорхойлолт..."
                                            className="min-h-[60px] border-none p-0 h-auto focus-visible:ring-0 shadow-none text-xs text-slate-500 resize-none"
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" onClick={handleAddResponsibility} className="w-full h-11 border-dashed border-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                                <PlusCircle className="w-4 h-4 mr-2" /> Чиг үүрэг нэмэх
                            </Button>
                        </div>
                    ) : (
                        position.responsibilities && position.responsibilities.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {position.responsibilities.map((res, i) => (
                                    <div key={i} className="p-5 rounded-xl border border-border bg-muted/30 space-y-2">
                                        <h4 className="text-sm font-bold text-foreground flex items-start gap-2">
                                            <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                            {res.title}
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed pl-7">{res.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-center opacity-40">
                                <MapPin className="w-8 h-8 text-slate-300 mb-2" />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Чиг үүрэг бүртгэгдээгүй</p>
                            </div>
                        )
                    )}
                </div>

                {/* Skills Section */}
                <div className="space-y-6">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Ур чадварын шаардлага</label>

                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-slate-200 min-h-[50px] bg-slate-50/50">
                                {formData.skills.map((skill, i) => (
                                    <Badge key={i} variant="outline" className="pl-3 pr-1 py-1 rounded-lg bg-white flex items-center gap-2 border-slate-200 text-sm h-8">
                                        <span className="font-semibold text-slate-700">{skill.name}</span>
                                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold uppercase text-slate-500">
                                            {skill.level === 'beginner' ? 'Анхан' : skill.level === 'intermediate' ? 'Дунд' : skill.level === 'advanced' ? 'Гүнзгий' : 'Мэргэшсэн'}
                                        </span>
                                        <button onClick={() => removeSkill(i)} className="p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors ml-1">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input id="skillName" placeholder="Ур чадварын нэр..." className="h-10 rounded-xl" />
                                <Select onValueChange={(val) => {
                                    const select = document.getElementById('skillLevelTrigger') as HTMLElement;
                                    if (select) select.dataset.value = val;
                                }} defaultValue="intermediate">
                                    <SelectTrigger id="skillLevelTrigger" className="w-40 h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Анхан</SelectItem>
                                        <SelectItem value="intermediate">Дунд</SelectItem>
                                        <SelectItem value="advanced">Гүнзгий</SelectItem>
                                        <SelectItem value="expert">Мэргэшсэн</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={() => {
                                        const nameInput = document.getElementById('skillName') as HTMLInputElement;
                                        const levelTrigger = document.getElementById('skillLevelTrigger') as HTMLElement;
                                        const name = nameInput.value;
                                        const level = levelTrigger.dataset.value || 'intermediate';
                                        handleAddSkill(name, level);
                                        nameInput.value = '';
                                    }}
                                    className="px-4 bg-slate-800 hover:bg-slate-900 rounded-xl"
                                >
                                    Нэмэх
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {position.skills?.map((skill, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background shadow-premium transition-all hover:shadow-premium-hover hover:border-primary/20 group">
                                    <div className="h-10 w-10 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-foreground">{skill.name}</p>
                                        <div className="flex gap-0.5">
                                            {[...Array(4)].map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`h-1 w-4 rounded-full ${idx < (skill.level === 'beginner' ? 1 : skill.level === 'intermediate' ? 2 : skill.level === 'advanced' ? 3 : 4)
                                                        ? 'bg-primary'
                                                        : 'bg-muted'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                                            {skill.level === 'beginner' ? 'Анхан шат' : skill.level === 'intermediate' ? 'Дунд шат' : skill.level === 'advanced' ? 'Ахисан шат' : 'Мэргэшсэн'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Experience Requirements Section */}
                <div className="space-y-6">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Тавигдах шаардлага</label>
                    {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-xl border border-border">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Нийт ажлын туршлага (жил)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.experience?.totalYears}
                                    onChange={(e) => handleExperienceUpdate('totalYears', Number(e.target.value))}
                                    className="h-10 rounded-lg border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Удирдах ажлын туршлага (жил)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.experience?.leadershipYears}
                                    onChange={(e) => handleExperienceUpdate('leadershipYears', Number(e.target.value))}
                                    className="h-10 rounded-lg border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Боловсролын зэрэг</label>
                                <Select
                                    value={formData.experience?.educationLevel || ''}
                                    onValueChange={(val) => handleExperienceUpdate('educationLevel', val)}
                                >
                                    <SelectTrigger className="h-10 rounded-lg border-border bg-background">
                                        <SelectValue placeholder="Сонгох..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="none">Боловсрол шаардлагагүй</SelectItem>
                                        <SelectItem value="diploma">Диплом</SelectItem>
                                        <SelectItem value="bachelor">Бакалавр</SelectItem>
                                        <SelectItem value="master">Магистр</SelectItem>
                                        <SelectItem value="doctorate">Доктор</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-4 md:col-span-2">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Мэргэжлүүд</label>
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-background min-h-[44px]">
                                        {formData.experience.professions.length === 0 && (
                                            <span className="text-xs text-muted-foreground italic py-1 px-2">Мэргэжил нэмээгүй...</span>
                                        )}
                                        {formData.experience.professions.map((prof, i) => (
                                            <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1 rounded-lg bg-primary/10 text-primary border-none flex items-center gap-1.5 h-8">
                                                <span className="font-bold text-xs">{prof}</span>
                                                <button
                                                    onClick={() => {
                                                        const newProfs = formData.experience.professions.filter((_, idx) => idx !== i);
                                                        handleExperienceUpdate('professions', newProfs);
                                                    }}
                                                    className="p-1 hover:bg-primary/20 hover:text-primary rounded-full transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            id="new-profession-input"
                                            placeholder="Жишээ: Программ хангамж"
                                            className="h-10 rounded-lg border-border bg-background"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const input = e.target as HTMLInputElement;
                                                    const val = input.value.trim();
                                                    if (val) {
                                                        handleExperienceUpdate('professions', [...formData.experience.professions, val]);
                                                        input.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            variant="outline"
                                            className="h-10 px-4 rounded-lg border-border text-foreground"
                                            onClick={() => {
                                                const input = document.getElementById('new-profession-input') as HTMLInputElement;
                                                const val = input.value.trim();
                                                if (val) {
                                                    handleExperienceUpdate('professions', [...formData.experience.professions, val]);
                                                    input.value = '';
                                                }
                                            }}
                                        >
                                            Нэмэх
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-5 rounded-xl border border-border bg-muted/30 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Нийт туршлага</p>
                                <p className="text-lg font-bold text-foreground">
                                    {position.experience?.totalYears ? `${position.experience.totalYears} жил` : 'Заагаагүй'}
                                </p>
                            </div>
                            <div className="p-5 rounded-xl border border-border bg-muted/30 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Удирдах туршлага</p>
                                <p className="text-lg font-bold text-foreground">
                                    {position.experience?.leadershipYears ? `${position.experience.leadershipYears} жил` : 'Шаардлагагүй'}
                                </p>
                            </div>
                            <div className="p-5 rounded-xl border border-border bg-muted/30 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Боловсрол</p>
                                <p className="text-lg font-bold text-foreground">
                                    {position.experience?.educationLevel ?
                                        (position.experience.educationLevel === 'bachelor' ? 'Бакалавр' :
                                            position.experience.educationLevel === 'master' ? 'Магистр' :
                                                position.experience.educationLevel === 'doctorate' ? 'Доктор' :
                                                    position.experience.educationLevel === 'diploma' ? 'Диплом' : 'Шаардлагагүй') : 'Заагаагүй'}
                                </p>
                            </div>
                            <div className="p-5 rounded-xl border border-border bg-muted/30 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Мэргэжлүүд</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {position.experience?.professions && position.experience.professions.length > 0 ? (
                                        position.experience.professions.map((prof, i) => (
                                            <Badge key={i} variant="outline" className="bg-background border-border text-muted-foreground font-bold text-[11px] px-2 py-0.5 rounded-lg">
                                                {prof}
                                            </Badge>
                                        ))
                                    ) : (
                                        <p className="text-lg font-bold text-foreground">Заагаагүй</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Job Description File Section */}
                <div className="space-y-4">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Хавсралт файл</label>
                    {position.jobDescriptionFile ? (
                        <div className="flex items-center justify-between p-5 rounded-xl border border-border bg-muted/30 group/file hover:bg-muted/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-background border border-border flex items-center justify-center text-primary shadow-sm transition-transform group-hover/file:scale-105">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-foreground truncate max-w-[200px] md:max-w-md">{position.jobDescriptionFile.name}</p>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(position.jobDescriptionFile.uploadedAt), 'yyyy.MM.dd')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Download className="w-3 h-3" />
                                            {(position.jobDescriptionFile.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl h-9 px-4 font-bold text-[11px] uppercase tracking-wider border-slate-200"
                                    asChild
                                >
                                    <a href={position.jobDescriptionFile.url} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-3.5 h-3.5 mr-2" />
                                        Татах
                                    </a>
                                </Button>
                                {isEditing && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-xl text-slate-400 hover:text-destructive hover:bg-destructive/10"
                                        onClick={async () => {
                                            if (!firestore) return;
                                            await updateDocumentNonBlocking(doc(firestore, 'positions', position.id), {
                                                jobDescriptionFile: null
                                            });
                                            toast({ title: "Файл устгагдлаа" });
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="relative group">
                            <input
                                type="file"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                accept=".pdf,.doc,.docx"
                            />
                            {isSaving ? (
                                <div className="py-12 flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Файл хуулж байна...</p>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/20 opacity-40 group-hover:opacity-100 group-hover:border-indigo-200 group-hover:bg-indigo-50/30 transition-all">
                                    <FileText className="w-8 h-8 text-slate-300 mb-2 group-hover:text-indigo-500" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">Файл хавсаргаагүй байна</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
