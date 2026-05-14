import { collection, doc, query, where, Timestamp } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase, setDocumentNonBlocking, tenantCollection, useTenantWrite } from '@/firebase';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, Pencil, X, Check, Zap, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ERTemplate } from '../../../employment-relations/types';

type TemplateCustomInput = NonNullable<ERTemplate['customInputs']>[number];
import { ensureSystemTemplates } from '../../../employment-relations/seed';
import * as Sentry from '@sentry/nextjs';

type CustomInputOverride = {
    required?: boolean;
    hidden?: boolean;
    label?: string;
};

const ACTION_TEMPLATE_NAME: Record<string, string> = {
    'appointment_permanent': 'Үндсэн ажилтнаар томилох тушаал',
    'appointment_probation': 'Туршилтын хугацаатай томилох тушаал',
    'appointment_reappoint': 'Эргүүлэн томилох тушаал',
    'release_company': 'Компанийн санаачилгаар чөлөөлөх тушаал',
    'release_employee': 'Ажилтны хүсэлтээр чөлөөлөх тушаал',
    'release_temporary_longterm': 'Урт хугацааны чөлөө олгох тушаал',
    'release_temporary_maternity': 'Жирэмсэн амаржсаны чөлөө олгох тушаал',
    'release_temporary_childcare': 'Хүүхэд асрах чөлөө олгох тушаал',
};

export function OrganizationActionSettings() {
    const { firestore, user } = useFirebase();
    const { tDoc } = useTenantWrite();
    const { toast } = useToast();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editItemData, setEditItemData] = useState({
        templateId: '',
        dateMappings: {} as Record<string, string>,
        customInputOverrides: {} as Record<string, CustomInputOverride>,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Ensure system templates exist on first render (idempotent — skips if already created)
    const didInitRef = useRef(false);
    useEffect(() => {
        if (didInitRef.current || !firestore) return;
        didInitRef.current = true;
        ensureSystemTemplates().catch(e => Sentry.captureMessage('System template init:', { level: 'warning', tags: { module: 'organization' }, extra: { error: e } }));
    }, [firestore]);

    // Fixed System Actions
    const SYSTEM_ACTIONS = [
        { id: 'appointment_permanent', name: 'Үндсэн ажилтнаар томилох', description: 'Үндсэн ажилтны томилгооны баримтын загвар' },
        { id: 'appointment_probation', name: 'Туршилтын хугацаатай томилох', description: 'Туршилтын хугацаатай томилгооны баримтын загвар' },
        { id: 'appointment_reappoint', name: 'Эргүүлэн томилох', description: 'Ажилтныг эргүүлэн томилох баримтын загвар' },
        { id: 'release_company', name: 'Компанийн санаачилгаар бүрэн чөлөөлөх', description: 'Ажил олгогчийн санаачилгаар хөдөлмөрийн гэрээ цуцлах баримтын загвар' },
        { id: 'release_employee', name: 'Ажилтны санаачилгаар бүрэн чөлөөлөх', description: 'Ажилтны хүсэлтээр хөдөлмөрийн гэрээ цуцлах баримтын загвар' },
        { id: 'release_temporary_longterm', name: 'Урт хугацааны чөлөө олгох', description: 'Ажилтанд урт хугацааны чөлөө олгох баримтын загвар' },
        { id: 'release_temporary_maternity', name: 'Жирэмсэн амаржсаны чөлөө олгох', description: 'Жирэмсэн амаржсаны чөлөө олгох баримтын загвар' },
        { id: 'release_temporary_childcare', name: 'Хүүхэд асрах чөлөө олгох', description: 'Хүүхэд асрах чөлөө олгох баримтын загвар' },
    ];

    const ACTION_REQUIREMENTS: Record<string, { label: string, key: string }[]> = {
        'appointment_permanent': [
            { label: 'Томилогдсон огноо', key: 'appointmentDate' }
        ],
        'appointment_probation': [
            { label: 'Туршилтын эхлэх огноо', key: 'probationStartDate' },
            { label: 'Туршилтын дуусах огноо', key: 'probationEndDate' }
        ],
        'appointment_reappoint': [
            { label: 'Эргүүлэн томилсон огноо', key: 'reappointmentDate' }
        ],
        'release_company': [
            { label: 'Ажлаас чөлөөлөх огноо', key: 'releaseDate' }
        ],
        'release_employee': [
            { label: 'Ажлаас чөлөөлөх огноо', key: 'releaseDate' }
        ],
        'release_temporary_longterm': [
            { label: 'Эхлэх огноо', key: 'startDate' },
            { label: 'Дуусах огноо', key: 'endDate' }
        ],
        'release_temporary_maternity': [
            { label: 'Эхлэх огноо', key: 'startDate' },
            { label: 'Дуусах огноо', key: 'endDate' }
        ],
        'release_temporary_childcare': [
            { label: 'Эхлэх огноо', key: 'startDate' },
            { label: 'Дуусах огноо', key: 'endDate' }
        ]
    };

    // Fetch Actions from Firestore to get the configured templateId
    const actionsRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'organization_actions') : null),
        [firestore]
    );
    const { data: configuredActions, isLoading: isLoadingActions } = useCollection<any>(actionsRef);

    // Fetch only system templates (isSystem === true) for action configuration
    const templatesRef = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? query(tenantCollection(firestore, companyPath, 'er_templates'), where('isActive', '==', true), where('isSystem', '==', true)) : null),
        [firestore]
    );
    const { data: templates } = useCollection<ERTemplate>(templatesRef as any);

    const handleUpdateAction = async (id: string) => {
        if (!firestore) return;

        if (!user) {
            toast({ title: 'Хандах эрхгүй', description: 'Та нэвтэрсэн байх шаардлагатай.', variant: 'destructive' });
            return;
        }

        // Validation: ensure system template was resolved + required date mappings filled.
        const requirements = ACTION_REQUIREMENTS[id];
        if (!editItemData.templateId) {
            toast({
                title: 'Системийн загвар олдсонгүй',
                description: 'Системийн загвар хараахан үүсгэгдээгүй байна. Хуудсыг сэргээгээд дахин оролдоно уу.',
                variant: 'destructive',
            });
            return;
        }
        if (requirements) {
            const missing = requirements.some(req => !editItemData.dateMappings[req.key]);
            if (missing) {
                toast({
                    title: 'Мэдээлэл дутуу',
                    description: 'Шаардлагатай огнооны талбаруудыг холбоно уу.',
                    variant: 'destructive'
                });
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // Use setDocumentNonBlocking with merge: true to handle both create and update
            const actionDocRef = tDoc('organization_actions', id);
            setDocumentNonBlocking(actionDocRef, {
                templateId: editItemData.templateId,
                dateMappings: editItemData.dateMappings,
                customInputOverrides: editItemData.customInputOverrides,
                updatedAt: Timestamp.now(),
                name: SYSTEM_ACTIONS.find(a => a.id === id)?.name || id
            }, { merge: true });

            setEditingId(null);
            toast({ title: 'Тохиргоо хадгалагдлаа' });
        } catch (e: any) {
            Sentry.captureException(e, { tags: { module: 'organization' } });
            toast({ title: 'Алдаа гарлаа', description: e.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardContent className="px-0 pt-0">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[30%]">Үйлдлийн нэр</TableHead>
                                <TableHead className="w-[60%]">Тохиргоо</TableHead>
                                <TableHead className="w-[100px] text-right">Үйлдэл</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingActions ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                SYSTEM_ACTIONS.map(action => {
                                    const config = configuredActions?.find(a => a.id === action.id);
                                    const isEditing = editingId === action.id;
                                    const requirements = ACTION_REQUIREMENTS[action.id];

                                    // Auto-resolve the action's system template:
                                    // 1. Prefer the templateId saved by linkOrgAction()
                                    // 2. Fallback: match by canonical template name
                                    const expectedTemplateName = ACTION_TEMPLATE_NAME[action.id];
                                    const systemTemplate =
                                        (config?.templateId && templates?.find(t => t.id === config.templateId))
                                        || (expectedTemplateName ? templates?.find(t => t.name === expectedTemplateName) : undefined);
                                    const resolvedTemplateId = systemTemplate?.id || '';
                                    const allInputs: TemplateCustomInput[] = systemTemplate?.customInputs || [];
                                    const dateInputs = allInputs.filter((i: TemplateCustomInput) => i.type === 'date');
                                    const overrides = (isEditing ? editItemData.customInputOverrides : (config?.customInputOverrides || {})) as Record<string, CustomInputOverride>;

                                    return (
                                        <TableRow key={action.id} className="group transition-colors">
                                            <TableCell className="align-top py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700 flex items-center gap-2">
                                                        <Zap className="w-4 h-4 text-amber-500" />
                                                        {action.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium leading-tight mt-1">{action.description}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top py-4">
                                                <div className="space-y-4">
                                                    {/* Системийн загвар — read-only chip */}
                                                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-bold text-slate-700 truncate">
                                                                {systemTemplate?.name || (
                                                                    <span className="text-amber-600 italic font-medium">Системийн загвар бэлтгэгдэж байна…</span>
                                                                )}
                                                            </div>
                                                            {systemTemplate && (
                                                                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-0.5">
                                                                    <ShieldCheck className="w-3 h-3" />
                                                                    Системийн загвар — автомат холбогдсон
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {isEditing ? (
                                                        <div className="space-y-4">
                                                            {/* Date mappings */}
                                                            {requirements && resolvedTemplateId && (
                                                                <div className="space-y-2">
                                                                    <span className="text-[10px] font-bold uppercase text-slate-400">Огноо холболт</span>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white rounded-lg border border-slate-100">
                                                                        {requirements.map(req => {
                                                                            const value = editItemData.dateMappings[req.key] || '';
                                                                            const isAuto = value && value === req.key;
                                                                            return (
                                                                                <div key={req.key} className="flex flex-col gap-1.5">
                                                                                    <div className="flex items-center justify-between gap-2">
                                                                                        <span className="text-[10px] font-bold text-slate-500">{req.label}</span>
                                                                                        {isAuto && (
                                                                                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 flex items-center gap-1">
                                                                                                <Check className="w-2.5 h-2.5" /> Авто
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <Select
                                                                                        value={value}
                                                                                        onValueChange={(val) => setEditItemData(prev => ({
                                                                                            ...prev,
                                                                                            dateMappings: { ...prev.dateMappings, [req.key]: val }
                                                                                        }))}
                                                                                    >
                                                                                        <SelectTrigger className="h-8 bg-white text-xs">
                                                                                            <SelectValue placeholder="Талбар сонгох" />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            {dateInputs.map((input: TemplateCustomInput, idx: number) => (
                                                                                                <SelectItem key={`${input.key}-${input.order ?? idx}`} value={input.key}>
                                                                                                    {input.label}
                                                                                                </SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* customInput overrides */}
                                                            {allInputs.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <span className="text-[10px] font-bold uppercase text-slate-400">Хувьсагчийн тохиргоо</span>
                                                                    <div className="space-y-2 p-3 bg-white rounded-lg border border-slate-100">
                                                                        {allInputs.map((input: TemplateCustomInput) => {
                                                                            const ov = editItemData.customInputOverrides[input.key] || {};
                                                                            const effectiveLabel = ov.label ?? input.label;
                                                                            const effectiveRequired = ov.required ?? !!input.required;
                                                                            const isHidden = !!ov.hidden;
                                                                            const setOverride = (patch: CustomInputOverride) => setEditItemData(prev => ({
                                                                                ...prev,
                                                                                customInputOverrides: {
                                                                                    ...prev.customInputOverrides,
                                                                                    [input.key]: { ...prev.customInputOverrides[input.key], ...patch }
                                                                                }
                                                                            }));
                                                                            return (
                                                                                <div key={input.key} className={`flex flex-wrap items-center gap-2 p-2 rounded border ${isHidden ? 'bg-slate-50 border-dashed border-slate-200 opacity-60' : 'bg-white border-slate-100'}`}>
                                                                                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">{input.key}</span>
                                                                                    <Input
                                                                                        value={effectiveLabel}
                                                                                        onChange={(e) => setOverride({ label: e.target.value })}
                                                                                        className="h-7 text-xs flex-1 min-w-[140px]"
                                                                                        placeholder={input.label}
                                                                                    />
                                                                                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                                                                        <Switch
                                                                                            checked={effectiveRequired}
                                                                                            onCheckedChange={(checked) => setOverride({ required: !!checked })}
                                                                                        />
                                                                                        Заавал
                                                                                    </label>
                                                                                    <Button
                                                                                        type="button"
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        onClick={() => setOverride({ hidden: !isHidden })}
                                                                                        className="h-7 w-7 p-0"
                                                                                        title={isHidden ? 'Харагдуулах' : 'Нуух'}
                                                                                    >
                                                                                        {isHidden ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
                                                                                    </Button>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2">
                                                            {requirements && (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {requirements.map(req => {
                                                                        const mappedKey = config?.dateMappings?.[req.key] || req.key;
                                                                        const inputLabel = systemTemplate?.customInputs?.find((i: TemplateCustomInput) => i.key === mappedKey)?.label;
                                                                        const isMapped = !!systemTemplate?.customInputs?.find((i: TemplateCustomInput) => i.key === mappedKey);
                                                                        return (
                                                                            <div key={req.key} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border ${isMapped ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                                                <span>{req.label}:</span>
                                                                                <span className="text-slate-600">{inputLabel || (isMapped ? mappedKey : 'Тохируулаагүй')}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            {Object.keys(overrides).length > 0 && (
                                                                <div className="text-[10px] text-slate-500">
                                                                    {Object.keys(overrides).length} хувьсагчид тохиргоо хийгдсэн
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right align-top py-4">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="sm" onClick={() => handleUpdateAction(action.id)} disabled={isSubmitting} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">
                                                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 p-0">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={!resolvedTemplateId}
                                                        onClick={() => {
                                                            setEditingId(action.id);
                                                            // Auto-fill date mappings: prefer saved config, then auto-match by key,
                                                            // then leave blank for the admin to choose.
                                                            const autoMappings: Record<string, string> = { ...(config?.dateMappings || {}) };
                                                            if (requirements) {
                                                                requirements.forEach(req => {
                                                                    if (!autoMappings[req.key] && dateInputs.find((i: TemplateCustomInput) => i.key === req.key)) {
                                                                        autoMappings[req.key] = req.key;
                                                                    }
                                                                });
                                                            }
                                                            setEditItemData({
                                                                templateId: resolvedTemplateId,
                                                                dateMappings: autoMappings,
                                                                customInputOverrides: (config?.customInputOverrides || {}) as Record<string, CustomInputOverride>,
                                                            });
                                                        }}
                                                        className="h-8 px-3 text-xs font-bold border-slate-200 hover:bg-slate-50 hover:text-primary transition-all rounded-lg"
                                                    >
                                                        <Pencil className="h-3 w-3 mr-2" />
                                                        Засах
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
