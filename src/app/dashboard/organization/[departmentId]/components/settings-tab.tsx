'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Loader2, Calendar as CalendarIcon, Trash2, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirebase, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Department, DepartmentType } from '@/app/dashboard/organization/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SettingsTabProps {
    department: Department;
    onSuccess?: () => void;
}

export const SettingsTab = ({ department, onSuccess }: SettingsTabProps) => {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

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
        setFormData({
            name: department.name || '',
            code: department.code || '',
            status: department.status || 'active',
            typeId: department.typeId || '',
            parentId: department.parentId || '',
            color: department.color || '#000000',
            createdAt: department.createdAt ? new Date(department.createdAt) : new Date(),
            description: department.description || '',
            vision: department.vision || '',
        });
    }, [department]);

    const handleSave = async () => {
        if (!firestore) return;

        setIsLoading(true);
        try {
            const docRef = doc(firestore, 'departments', department.id);
            await updateDocumentNonBlocking(docRef, {
                name: formData.name,
                code: formData.code,
                status: formData.status,
                typeId: formData.typeId,
                parentId: formData.parentId === "root" ? "" : formData.parentId,
                color: formData.color,
                createdAt: formData.createdAt.toISOString(),
                description: formData.description,
                vision: formData.vision,
            });
            toast({
                title: 'Амжилттай хадгалагдлаа',
                description: 'Нэгжийн мэдээлэл шинэчлэгдлээ.',
            });
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

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Identity & Settings Card */}
                <Card className="shadow-sm border-border/50">
                    <CardHeader>
                        <CardTitle>Үндсэн тохиргоо</CardTitle>
                        <CardDescription>Нэгжийн код, төрөл, төлөв болон бусад тохиргоо.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Нэгжийн нэр</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="bg-muted/30 focus-visible:bg-background"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Албан код</Label>
                                <Input
                                    placeholder="HR-001"
                                    value={formData.code}
                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Төлөв</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Идэвхтэй</SelectItem>
                                        <SelectItem value="inactive">Идэвхгүй</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Төрөл</Label>
                                <Select
                                    value={formData.typeId}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, typeId: val }))}
                                >
                                    <SelectTrigger>
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
                                <Label>Батлагдсан огноо</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.createdAt && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.createdAt ? format(formData.createdAt, "yyyy-MM-dd") : <span>Огноо сонгох</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.createdAt}
                                            onSelect={(date) => date && setFormData(prev => ({ ...prev, createdAt: date }))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Харьяалах дээд нэгж</Label>
                            <Select
                                value={formData.parentId || "root"}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, parentId: val === "root" ? "" : val }))}
                            >
                                <SelectTrigger>
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
                            <Label>Өнгө (Дотоод системд ялгах)</Label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="color"
                                    className="w-12 h-10 p-1 px-2 border-none ring-1 ring-border"
                                    value={formData.color}
                                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                />
                                <Input
                                    placeholder="#000000"
                                    value={formData.color}
                                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                    className="w-32"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Strategy Card */}
                <div className="space-y-6 flex flex-col">
                    <Card className="shadow-sm border-border/50 flex-1">
                        <CardHeader>
                            <CardTitle>Контент & Зорилго</CardTitle>
                            <CardDescription>Нэгжийн чиг үүрэг болон алсын зорилгыг засварлах.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 flex flex-col h-full">
                            <div className="space-y-2">
                                <Label>Чиг үүрэг</Label>
                                <Textarea
                                    placeholder="Нэгжийн үндсэн чиг үүрэг..."
                                    className="min-h-[120px] resize-none"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Зорилго</Label>
                                <Textarea
                                    placeholder="Нэгжийн хэтийн зорилго..."
                                    className="min-h-[100px] resize-none"
                                    value={formData.vision}
                                    onChange={(e) => setFormData(prev => ({ ...prev, vision: e.target.value }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive/20 bg-destructive/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-destructive text-base flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Аюултай үйлдэг
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">Нэгжийг устгаснаар доорх бүх өгөгдөл архивлах буюу устана. Энэ үйлдлийг буцаах боломжгүй.</p>
                            <Button variant="destructive" size="sm" className="w-full">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Нэгжийг устгах
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button size="lg" onClick={handleSave} disabled={isLoading} className="px-8 shadow-lg shadow-primary/20">
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Шинэчлэлийг хадгалах
                </Button>
            </div>
        </div>
    );
};
