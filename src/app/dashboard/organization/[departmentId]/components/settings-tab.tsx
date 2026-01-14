'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Code2, Users, FileText, Check, X, Target, Edit3, Calendar as CalendarIcon, Hash, Activity, Palette, GitBranch, Briefcase, Save, Loader2, Trash2, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useFirebase, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Department, DepartmentType } from '@/app/dashboard/organization/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SettingsTabProps {
    department: Department;
    onSuccess?: () => void;
    mode?: 'live' | 'draft';
    validationChecklist?: {
        hasName: boolean;
        hasCode: boolean;
        hasVision: boolean;
        hasDescription: boolean;
        hasType: boolean;
        hasColor: boolean;
        hasPositions: boolean;
        allPositionsApproved: boolean;
        isComplete: boolean;
    };
}

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
                <div className="text-sm font-semibold text-foreground truncate">
                    {value || '-'}
                </div>
            </div>
        </div>
    )
}

function ValidationItem({ label, isDone }: { label: string; isDone: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all border",
            isDone ? "bg-emerald-50/50 text-emerald-700 border-emerald-100/50" : "bg-amber-50/50 text-amber-700 border-amber-100/50"
        )}>
            {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
                <Circle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
    );
}

function ValidationIndicator({ title, items }: { title: string; items: { label: string; isDone: boolean }[] }) {
    const completedCount = items.filter(item => item.isDone).length;
    const totalCount = items.length;
    const isComplete = completedCount === totalCount;

    return (
        <div className="mb-8 p-5 rounded-2xl border border-indigo-100 bg-indigo-50/20">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <Activity className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h4 className="font-bold text-sm text-indigo-950">{title}</h4>
                </div>
                <Badge className={cn(
                    "font-bold text-[10px] px-2.5 py-0.5 rounded-full border-none",
                    isComplete ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white"
                )}>
                    {isComplete ? 'ҮР ДҮН: БҮРЭН' : `${completedCount} / ${totalCount}`}
                </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {items.map((item, index) => (
                    <ValidationItem key={index} label={item.label} isDone={item.isDone} />
                ))}
            </div>
        </div>
    );
}

export const SettingsTab = ({ department, onSuccess, mode = 'live', validationChecklist }: SettingsTabProps) => {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Queries for dropdowns
    const typesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departmentTypes') : null), [firestore]);
    const deptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);

    const { data: departmentTypes } = useCollection<DepartmentType>(typesQuery);
    const { data: allDepartments } = useCollection<Department>(deptsQuery);

    // Local state for form fields
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        status: 'active',
        typeId: '',
        parentId: '',
        color: '#000000',
        createdAt: new Date(),
        description: '', // Чиг үүрэг
        vision: '',      // Зорилго
    });

    // Sync local state with department prop when it changes
    useEffect(() => {
        const source = mode === 'draft' && department.draftData ? { ...department, ...department.draftData } : department;

        setFormData({
            name: source.name || '',
            code: source.code || '',
            status: source.status || 'active',
            typeId: source.typeId || '',
            parentId: source.parentId || '',
            color: source.color || '#000000',
            createdAt: source.createdAt ? new Date(source.createdAt) : new Date(),
            description: source.description || '',
            vision: source.vision || '',
        });
    }, [department, mode]);

    const handleSave = async () => {
        if (!firestore) return;

        setIsLoading(true);
        try {
            const docRef = doc(firestore, 'departments', department.id);
            const dataToSave = {
                name: formData.name,
                code: formData.code,
                status: formData.status as 'active' | 'inactive',
                typeId: formData.typeId,
                parentId: formData.parentId === "root" ? "" : formData.parentId,
                color: formData.color,
                createdAt: formData.createdAt.toISOString(),
                description: formData.description,
                vision: formData.vision,
            };

            if (mode === 'draft') {
                await updateDocumentNonBlocking(docRef, {
                    draftData: dataToSave
                });
            } else {
                await updateDocumentNonBlocking(docRef, dataToSave);
            }

            toast({
                title: 'Амжилттай хадгалагдлаа',
                description: mode === 'draft' ? 'Төлөвлөж буй өөрчлөлт хадгалагдлаа.' : 'Нэгжийн мэдээлэл шинэчлэгдлээ.',
            });
            setIsEditing(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error updating department:", error);
            toast({
                title: 'Алдаа гарлаа',
                description: 'Мэдээллийг хадгалж чадсангүй.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Reset form data to original values
        const source = mode === 'draft' && department.draftData ? { ...department, ...department.draftData } : department;
        setFormData({
            name: source.name || '',
            code: source.code || '',
            status: source.status || 'active',
            typeId: source.typeId || '',
            parentId: source.parentId || '',
            color: source.color || '#000000',
            createdAt: source.createdAt ? new Date(source.createdAt) : new Date(),
            description: source.description || '',
            vision: source.vision || '',
        });
        setIsEditing(false);
    };


    const typeName = departmentTypes?.find(t => t.id === formData.typeId)?.name || 'Нэгж';
    const parentName = allDepartments?.find(d => d.id === formData.parentId)?.name || 'Үндсэн нэгж';

    return (
        <div className="space-y-8">
            {/* Main Info Card */}
            <Card className="overflow-hidden border bg-card shadow-sm rounded-xl">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Header Info */}
                        <div className="flex-1 space-y-4 w-full">
                            {/* Validation Checklist - Only in Draft Mode */}
                            {mode === 'draft' && validationChecklist && (
                                <ValidationIndicator
                                    title="Мэдээллийн бүрдэл"
                                    items={[
                                        { label: 'Нэр', isDone: validationChecklist.hasName },
                                        { label: 'Код', isDone: validationChecklist.hasCode },
                                        { label: 'Төрөл', isDone: validationChecklist.hasType },
                                        { label: 'Зорилго', isDone: validationChecklist.hasVision },
                                        { label: 'Чиг үүрэг', isDone: validationChecklist.hasDescription },
                                        { label: 'Өнгө', isDone: validationChecklist.hasColor },
                                        { label: 'Ажлын байр', isDone: validationChecklist.hasPositions },
                                        { label: 'Батламж', isDone: validationChecklist.allPositionsApproved },
                                    ]}
                                />
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                    <AnimatePresence mode="wait">
                                        {isEditing ? (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                key="edit-header"
                                                className="space-y-2 max-w-xl"
                                            >
                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Нэгжийн нэр</Label>
                                                <Input
                                                    value={formData.name}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                    className="text-2xl font-bold h-11 bg-muted/30 focus-visible:bg-background border-primary/20"
                                                    placeholder="Нэгжийн нэр..."
                                                />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                key="view-header"
                                                className="space-y-1"
                                            >
                                                <h2 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                                                    {formData.name}
                                                </h2>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-slate-100/80 text-slate-600 font-medium">
                                                        {typeName}
                                                    </Badge>
                                                    <Badge variant="outline" className={cn(
                                                        "font-medium",
                                                        formData.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-100"
                                                    )}>
                                                        {formData.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                                                    </Badge>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCancel}
                                                className="font-bold border-border/50 bg-background/50 hover:bg-background transition-all"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Болих
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleSave}
                                                disabled={isLoading}
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                                Хадгалах
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsEditing(true)}
                                            className="font-bold border-border/50 bg-background/50 hover:bg-background transition-all px-4"
                                        >
                                            <Edit3 className="w-4 h-4 mr-2" />
                                            Засах
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                                {isEditing ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Нэгжийн код</Label>
                                            <Input
                                                placeholder="HR-001"
                                                value={formData.code}
                                                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                                className="h-10 bg-muted/30 focus-visible:bg-background"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Дээд нэгж</Label>
                                            <Select
                                                value={formData.parentId || "root"}
                                                onValueChange={(val) => setFormData(prev => ({ ...prev, parentId: val === "root" ? "" : val }))}
                                            >
                                                <SelectTrigger className="h-10 bg-muted/30 focus-visible:bg-background">
                                                    <SelectValue placeholder="Дээд нэгж сонгох" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="root">(Үндсэн нэгж - Дээд нэгжгүй)</SelectItem>
                                                    {allDepartments?.filter(d => d.id !== department.id).map(d => (
                                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Батлагдсан огноо</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal h-10 bg-muted/30 focus-visible:bg-background border-input px-3",
                                                            !formData.createdAt && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {formData.createdAt ? format(formData.createdAt, "yyyy-MM-dd") : <span>Огноо сонгох</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={formData.createdAt}
                                                        onSelect={(date) => date && setFormData(prev => ({ ...prev, createdAt: date }))}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Систем өнгө</Label>
                                            <div className="flex gap-2 items-center">
                                                <div className="relative group">
                                                    <Input
                                                        type="color"
                                                        className="w-10 h-10 p-0 overflow-hidden rounded-lg border-none cursor-pointer ring-1 ring-border"
                                                        value={formData.color}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                                    />
                                                </div>
                                                <Input
                                                    placeholder="#000000"
                                                    value={formData.color}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                                    className="flex-1 h-10 bg-muted/30 focus-visible:bg-background font-mono text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Төрөл</Label>
                                            <Select
                                                value={formData.typeId}
                                                onValueChange={(val) => setFormData(prev => ({ ...prev, typeId: val }))}
                                            >
                                                <SelectTrigger className="h-10 bg-muted/30 focus-visible:bg-background">
                                                    <SelectValue placeholder="Төрөл сонгох" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {departmentTypes?.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Төлөв</Label>
                                            <Select
                                                value={formData.status}
                                                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                                            >
                                                <SelectTrigger className="h-10 bg-muted/30 focus-visible:bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">Идэвхтэй</SelectItem>
                                                    <SelectItem value="inactive">Идэвхгүй</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <InfoItem icon={Hash} label="Нэгжийн код" value={formData.code} />
                                        <InfoItem icon={GitBranch} label="Дээд нэгж" value={parentName} />
                                        <InfoItem
                                            icon={CalendarIcon}
                                            label="Батлагдсан огноо"
                                            value={formData.createdAt ? format(formData.createdAt, 'yyyy-MM-dd') : '-'}
                                        />
                                        <InfoItem
                                            icon={Palette}
                                            label="Систем өнгө"
                                            value={
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: formData.color || '#000' }} />
                                                    <span className="font-mono text-xs text-muted-foreground uppercase">{formData.color}</span>
                                                </div>
                                            }
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Goals & Functions Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Target className="w-4 h-4 text-primary" />
                                    <h4 className="text-sm font-semibold text-foreground">Зорилго</h4>
                                </div>
                            </div>
                            <AnimatePresence mode="wait">
                                {isEditing ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        key="edit-vision"
                                    >
                                        <Textarea
                                            placeholder="Нэгжийн хэтийн зорилго..."
                                            className="min-h-[100px] resize-none bg-muted/30 border border-border/50 rounded-xl text-sm"
                                            value={formData.vision}
                                            onChange={(e) => setFormData(prev => ({ ...prev, vision: e.target.value }))}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key="view-vision"
                                        className="p-4 rounded-xl bg-muted/30 border border-border/50 min-h-[100px]"
                                    >
                                        <p className="text-sm leading-relaxed text-muted-foreground italic font-medium">
                                            {formData.vision || 'Зорилго бүртгэгдээгүй байна...'}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <FileText className="w-4 h-4 text-primary" />
                                    <h4 className="text-sm font-semibold text-foreground">Чиг үүрэг</h4>
                                </div>
                            </div>
                            <AnimatePresence mode="wait">
                                {isEditing ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        key="edit-desc"
                                    >
                                        <Textarea
                                            placeholder="Нэгжийн үндсэн чиг үүрэг..."
                                            className="min-h-[100px] resize-none bg-muted/30 border border-border/50 rounded-xl text-sm"
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        key="view-desc"
                                        className="p-4 rounded-xl bg-muted/30 border border-border/50 min-h-[100px]"
                                    >
                                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium">
                                            {formData.description || 'Чиг үүрэг бүртгэгдээгүй байна...'}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
