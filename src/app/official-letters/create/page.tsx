'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp, addDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { useFirebase, useFirebaseApp, useMemoFirebase, useUser } from '@/firebase';
import { useTenantWrite, useFetchCollection, useFetchDoc, tenantCollection } from '@/firebase/tenant-compat';
import { Employee, Department, Position } from '@/types';
import { createOfficialLetter } from '../services/numbering';
import { OfficialLetterConfig, OfficialLetterTemplate, DEFAULT_CONFIG } from '../types';
import { LetterPaper } from '../components/letter-paper';
import '../official-letters.css';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
    Save, Printer, Loader2, Sparkles, Building2,
    FileText, Layout, Image as ImageIcon, ArrowLeft, Library, Users, Briefcase
} from 'lucide-react';
import { printLetter } from '../utils/pdf';
import { applyCompanyProfileToConfig } from '../lib/company-profile';
import { resolveCompensation, formatMoney, formatIncentives, formatAllowances } from '../lib/template-vars';

export default function CreateOfficialLetterPage() {
    const { firestore } = useFirebase();
    const app = useFirebaseApp();
    const { tCollection, tDoc, companyPath } = useTenantWrite();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const paperRef = useRef<HTMLDivElement>(null);

    const [config, setConfig] = useState<OfficialLetterConfig>(() => {
        const d = new Date();
        return { ...DEFAULT_CONFIG, docDate: d.toISOString().split('T')[0] };
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [selectedPositionId, setSelectedPositionId] = useState<string>('');

    // Templates
    const templatesQuery = React.useMemo(() =>
        firestore ? tCollection('official_letter_templates') : null
        , [firestore, tCollection]);
    const { data: templates } = useFetchCollection<OfficialLetterTemplate>(templatesQuery);

    // Company profile
    const profileRef = React.useMemo(() =>
        firestore ? tDoc('company', 'profile') : null
        , [firestore, tDoc]);
    const { data: companyProfile } = useFetchDoc<any>(profileRef as any);

    // Employees, Departments, Positions
    const employeesQuery = useMemoFirebase(({ firestore }) =>
        tenantCollection(firestore, null, 'employees'), []);
    const departmentsQuery = useMemoFirebase(({ firestore }) =>
        tenantCollection(firestore, null, 'departments'), []);
    const positionsQuery = useMemoFirebase(({ firestore }) =>
        tenantCollection(firestore, null, 'positions'), []);
    const { data: employees } = useFetchCollection<Employee>(employeesQuery);
    const { data: departments } = useFetchCollection<Department>(departmentsQuery);
    const { data: positions } = useFetchCollection<Position>(positionsQuery);

    const selectedEmployee = useMemo(() => employees?.find(e => e.id === selectedEmployeeId), [employees, selectedEmployeeId]);
    const selectedDepartment = useMemo(() => departments?.find(d => d.id === selectedDepartmentId), [departments, selectedDepartmentId]);
    const selectedPosition = useMemo(() => positions?.find(p => p.id === selectedPositionId), [positions, selectedPositionId]);

    // Company profile-аас initial config авах (snapshot, on-first-load)
    React.useEffect(() => {
        if (!companyProfile) return;
        setConfig(prev => applyCompanyProfileToConfig(prev, companyProfile));
    }, [companyProfile]);

    const resolvedConfig = useMemo(() => {
        let content = config.content || '';
        if (!content) return config;

        const now = new Date();
        const vars: Record<string, string> = {
            '{{company.name}}': config.orgName || '',
            '{{company.address}}': config.address || '',
            '{{company.phone}}': config.phone || '',
            '{{company.email}}': config.email || '',
            '{{company.ceo}}': config.signName || '',
            '{{company.website}}': config.web || '',
            '{{date.today}}': config.docDate || now.toISOString().split('T')[0],
            '{{date.year}}': String(now.getFullYear()),
            '{{date.month}}': String(now.getMonth() + 1).padStart(2, '0'),
            '{{date.day}}': String(now.getDate()).padStart(2, '0'),
            '{{document.number}}': config.docIndex || '',
            '{{user.name}}': config.signName || '',
        };

        if (selectedEmployee) {
            vars['{{employee.firstName}}'] = selectedEmployee.firstName || '';
            vars['{{employee.lastName}}'] = selectedEmployee.lastName || '';
            vars['{{employee.fullName}}'] = `${selectedEmployee.lastName || ''} ${selectedEmployee.firstName || ''}`.trim();
            vars['{{employee.email}}'] = selectedEmployee.email || '';
            vars['{{employee.phone}}'] = selectedEmployee.phoneNumber || '';
            vars['{{employee.code}}'] = selectedEmployee.employeeCode || '';
            vars['{{employee.jobTitle}}'] = selectedEmployee.jobTitle || '';
            vars['{{employee.hireDate}}'] = selectedEmployee.hireDate || '';

            // Цалин / нэмэгдэл / хангамж — appointedCompensation × position
            const resolved = resolveCompensation(
                selectedEmployee as any,
                selectedPosition as any,
            );
            vars['{{employee.salary}}'] = formatMoney(resolved.salary);
            vars['{{employee.incentives}}'] = formatIncentives(resolved.incentives);
            vars['{{employee.allowances}}'] = formatAllowances(resolved.allowances);
        }

        if (selectedDepartment) {
            vars['{{department.name}}'] = selectedDepartment.name || '';
        }

        if (selectedPosition) {
            vars['{{position.title}}'] = selectedPosition.title || '';
        }

        Object.entries(vars).forEach(([key, value]) => {
            if (value) content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        });

        return { ...config, content };
    }, [config, selectedEmployee, selectedDepartment, selectedPosition]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Зөвхөн зураг оруулна уу', variant: 'destructive' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast({ title: 'Зургийн хэмжээ 2MB-с хэтрэхгүй байх ёстой', variant: 'destructive' });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setConfig(prev => ({ ...prev, orgLogo: reader.result as string }));
        reader.readAsDataURL(file);
    };

    const handleApplyTemplate = (templateId: string) => {
        const tpl = templates?.find(t => t.id === templateId);
        if (tpl?.config) {
            setConfig(prev => ({ ...prev, ...tpl.config, orgLogo: tpl.config.orgLogo ?? prev.orgLogo }));
            toast({ title: 'Загвар хэрэглэгдлээ' });
        }
    };

    const handleAiGenerate = async () => {
        if (!config.subject) {
            toast({ title: 'Гарчиг оруулна уу', variant: 'destructive' });
            return;
        }
        setIsAiLoading(true);
        try {
            const res = await fetch('/api/official-letters/ai-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgName: config.orgName,
                    addresseeOrg: config.addresseeOrg,
                    addresseeName: config.addresseeName,
                    subject: config.subject,
                    contentHint: config.content,
                }),
            });
            const data = await res.json();
            if (data.content) {
                setConfig(prev => ({ ...prev, content: data.content }));
                if (data.fallback) {
                    toast({
                        title: 'AI ажиллахгүй байна',
                        description: data.error || 'Жишиг template оруулав — гараар засна уу.',
                        variant: 'destructive',
                    });
                } else {
                    toast({ title: 'AI агуулга үүслээ' });
                }
            }
        } catch {
            toast({ title: 'AI алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSave = async () => {
        if (!firestore || !user) return;
        setIsSaving(true);
        try {
            // 1) Upload logo to Storage BEFORE the transaction (Storage and Firestore
            //    can't be combined in a single transaction). If this fails, we never
            //    increment the letter-number counter — no gap.
            let logoUrl: string | null = config.orgLogo ?? null;
            if (logoUrl && logoUrl.startsWith('data:') && app) {
                try {
                    const storage = getStorage(app);
                    const companyId = companyPath?.split('/')[1] ?? user.uid;
                    const sRef = storageRef(storage, `official_letters/${companyId}/${Date.now()}_logo`);
                    await uploadString(sRef, logoUrl, 'data_url');
                    logoUrl = await getDownloadURL(sRef);
                } catch {
                    logoUrl = null;
                    toast({ title: 'Лого хадгалахад алдаа гарлаа', description: 'Бичиг логогүйгээр хадгалагдана', variant: 'destructive' });
                }
            }

            const resolvedContent = resolvedConfig.content;
            const finalConfig = { ...config, content: resolvedContent, orgLogo: logoUrl };

            // 2) Atomic: increment seq + create letter doc
            const result = await createOfficialLetter(firestore, companyPath, {
                config: { ...finalConfig, docIndex: finalConfig.docIndex || '' },
                createdBy: user.uid,
                extraFields: {
                    employeeId: selectedEmployeeId || null,
                    departmentId: selectedDepartmentId || null,
                    positionId: selectedPositionId || null,
                },
            });

            // 3) Keep docIndex === letterNumber behaviour: if user left it blank,
            //    patch the doc post-create so the header index matches.
            if (!finalConfig.docIndex) {
                const { updateDoc } = await import('firebase/firestore');
                await updateDoc(tDoc('official_letters', result.id), {
                    'config.docIndex': result.letterNumber,
                    updatedAt: Timestamp.now(),
                });
            }

            toast({ title: 'Хадгалагдлаа', description: `Дугаар: ${result.letterNumber}` });
            router.push('/official-letters');
        } catch (e: any) {
            toast({ title: 'Алдаа', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = async () => {
        setIsGeneratingPDF(true);
        try {
            await printLetter(paperRef.current, config);
        } catch (e: any) {
            toast({ title: 'Хэвлэх алдаа', description: e.message, variant: 'destructive' });
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto pb-20">
                <PageHeader
                    title="Шинэ албан бичиг"
                    description="Стандартын дагуу мэргэжлийн албан бланк бэлтгэх"
                    showBackButton hideBreadcrumbs backButtonPlacement="inline" backBehavior="history"
                    fallbackBackHref="/official-letters"
                    actions={
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handlePrint} disabled={isGeneratingPDF}>
                                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
                                Хэвлэх / PDF
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Хадгалах
                            </Button>
                        </div>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Templates */}
                        {templates && templates.length > 0 && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Library className="h-4 w-4" /> Хадгалсан загварууд
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Select onValueChange={handleApplyTemplate}>
                                        <SelectTrigger><SelectValue placeholder="Загвар сонгох..." /></SelectTrigger>
                                        <SelectContent>
                                            {templates.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>
                        )}

                        {/* Data selectors */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Мэдээлэл сонгох</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Ажилтан</Label>
                                    <Select value={selectedEmployeeId} onValueChange={id => {
                                        setSelectedEmployeeId(id);
                                        const emp = employees?.find(e => e.id === id);
                                        if (emp?.departmentId) setSelectedDepartmentId(emp.departmentId);
                                        if (emp?.positionId) setSelectedPositionId(emp.positionId);
                                    }}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Ажилтан сонгох..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {employees?.map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.lastName} {emp.firstName} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Албан нэгж</Label>
                                    <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Албан нэгж сонгох..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments?.map(dept => (
                                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Ажлын байр</Label>
                                    <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Ажлын байр сонгох..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {positions?.map(pos => (
                                                <SelectItem key={pos.id} value={pos.id}>{pos.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(selectedEmployee || selectedDepartment || selectedPosition) && (
                                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-700 space-y-0.5">
                                        {selectedEmployee && <div>👤 {selectedEmployee.lastName} {selectedEmployee.firstName}</div>}
                                        {selectedDepartment && <div>👥 {selectedDepartment.name}</div>}
                                        {selectedPosition && <div>💼 {selectedPosition.title}</div>}
                                        <p className="text-[10px] text-emerald-600 mt-1">Загварын хувьсагчууд автоматаар солигдоно</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Format */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2"><Layout className="h-4 w-4" /> Формат</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Цаасны хэмжээ</Label>
                                        <div className="flex gap-1">
                                            {(['A4', 'A5'] as const).map(s => (
                                                <button key={s} onClick={() => setConfig(p => ({ ...p, paperSize: s }))}
                                                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${config.paperSize === s ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600'}`}>{s}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Фонт</Label>
                                        <div className="flex gap-1">
                                            {(['Arial', 'Times New Roman'] as const).map(f => (
                                                <button key={f} onClick={() => setConfig(p => ({ ...p, fontFamily: f }))}
                                                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${config.fontFamily === f ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600'}`}>{f === 'Arial' ? 'Arial' : 'Times'}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Org info */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Байгууллагын мэдээлэл</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Logo */}
                                <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => document.getElementById('logo-input')?.click()}>
                                    {config.orgLogo
                                        ? <img src={config.orgLogo} alt="Logo" className="max-h-16 mx-auto object-contain" />
                                        : <div className="flex flex-col items-center gap-1 text-slate-400 text-xs"><ImageIcon className="h-6 w-6" /><span>Лого оруулах</span></div>}
                                    <input id="logo-input" type="file" hidden accept="image/*" onChange={handleLogoChange} />
                                </div>
                                {[
                                    { name: 'orgName', label: 'Байгууллагын нэр' },
                                    { name: 'orgTagline', label: 'Үйл ажиллагааны чиглэл' },
                                    { name: 'address', label: 'Хаяг' },
                                    { name: 'phone', label: 'Утас' },
                                    { name: 'email', label: 'И-мэйл' },
                                    { name: 'web', label: 'Вэб' },
                                ].map(f => (
                                    <div key={f.name} className="space-y-1">
                                        <Label className="text-xs">{f.label}</Label>
                                        <Input name={f.name} value={config[f.name as keyof OfficialLetterConfig] as string ?? ''} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Document content */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Бичгийн агуулга</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Индекст дугаар</Label>
                                        <Input name="docIndex" value={config.docIndex} onChange={handleChange} placeholder="Автомат" className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Огноо</Label>
                                        <Input type="date" name="docDate" value={config.docDate} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Танай (огноо)</Label>
                                        <Input name="tanaiRef" value={config.tanaiRef} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Танай №</Label>
                                        <Input name="tanaiNo" value={config.tanaiNo} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Хэнд (байгууллага)</Label>
                                    <Input name="addresseeOrg" value={config.addresseeOrg} onChange={handleChange} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Хэнд (нэр, албан тушаал)</Label>
                                    <Input name="addresseeName" value={config.addresseeName} onChange={handleChange} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Гарчиг</Label>
                                    <Input name="subject" value={config.subject} onChange={handleChange} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Агуулга</Label>
                                        <button onClick={handleAiGenerate} disabled={isAiLoading}
                                            className="flex items-center gap-1 text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md hover:bg-violet-100 disabled:opacity-50">
                                            {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                            AI
                                        </button>
                                    </div>
                                    <Textarea name="content" value={config.content} onChange={handleChange} rows={8} className="text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Гарын үсэг (Албан тушаал)</Label>
                                        <Input name="signPosition" value={config.signPosition} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Нэр</Label>
                                        <Input name="signName" value={config.signName} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Preview */}
                    <div className="lg:col-span-8">
                        <div className="bg-slate-400 rounded-2xl p-6 min-h-[900px] flex justify-center overflow-auto">
                            <LetterPaper config={resolvedConfig} wrapperRef={paperRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
