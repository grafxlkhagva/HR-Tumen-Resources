'use client';

import * as React from 'react';
import { getJsonAuthHeaders } from '@/lib/api/client-auth';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
    Calendar as CalendarIcon,
    Save,
    Loader2,
    Phone,
    Mail,
    PlusCircle,
    Trash2,
    Facebook,
    Instagram,
    User,
    GraduationCap,
    Languages,
    Award,
    Users,
    Briefcase,
    FileText,
    File as FileIcon,
    Info,
    Sparkles,
} from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCollection, useDoc, useFirebase, useMemoFirebase, addDocumentNonBlocking, tenantCollection, tenantDoc, tenantEmployeeSubdoc, useTenantWrite } from '@/firebase';
import { useGlobalReferenceData } from '@/hooks/use-global-reference-data';
import { setDoc, updateDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import {
    FullQuestionnaireValues,
    generalInfoSchema,
    contactInfoSchema,
    educationHistorySchema,
    languageSkillsSchema,
    professionalTrainingSchema,
    familyInfoSchema,
    workExperienceHistorySchema,
} from '@/types/questionnaire';
import { Employee, ReferenceItem } from '@/types';
import { INSURANCE_TYPES } from '@/data/insurance-types';
import { CVUploadDialog } from './cv-upload-dialog';
import { CVTabContent } from './cv-tab-content';
import { DocumentsTabContent } from './documents-tab-content';
import { toDateSafe, transformQuestionnaireDates } from '@/lib/date-utils';
import { sanitizeForFirestore } from '@/lib/firestore-utils';
import { SettingRow, SettingRowField, SettingRowToggle, SettingGroup, GroupRow } from '@/components/ui/setting-row';

const calculateCompletionPercentage = (data: Partial<FullQuestionnaireValues>): number => {
    if (!data) return 0;

    const fields = [
        'lastName', 'firstName', 'registrationNumber', 'birthDate', 'gender',
        'personalPhone', 'personalEmail', 'homeAddress',
    ];

    const arrayFields = [
        { name: 'emergencyContacts', notApplicableKey: null },
        { name: 'education', notApplicableKey: 'educationNotApplicable' },
        { name: 'languages', notApplicableKey: 'languagesNotApplicable' },
        { name: 'trainings', notApplicableKey: 'trainingsNotApplicable' },
        { name: 'familyMembers', notApplicableKey: 'familyMembersNotApplicable' },
        { name: 'experiences', notApplicableKey: 'experienceNotApplicable' },
    ];

    const totalFields = fields.length + arrayFields.length;
    let filledFields = 0;

    fields.forEach(field => {
        const value = data[field as keyof typeof data];
        if (value !== null && value !== undefined && value !== '') {
            filledFields++;
        }
    });

    arrayFields.forEach(fieldInfo => {
        const notApplicable = fieldInfo.notApplicableKey ? data[fieldInfo.notApplicableKey as keyof typeof data] : false;
        if (notApplicable) {
            filledFields++;
        } else {
            const arrayData = data[fieldInfo.name as keyof typeof data] as unknown[] | undefined;
            if (Array.isArray(arrayData) && arrayData.length > 0) {
                filledFields++;
            }
        }
    });

    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
};

const transformDates = transformQuestionnaireDates;


function fuzzyMatchReferenceItem(input: string, items: { id: string; name: string }[]): string | null {
    if (!input || !items || items.length === 0) return null;
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();
    const names = items.map(i => i.name);

    const exact = names.find(n => n.toLowerCase() === lower);
    if (exact) return exact;

    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2) {
        const abbrev = words.map(w => w[0]).join('').toUpperCase();
        const m = names.find(n => n.toUpperCase() === abbrev);
        if (m) return m;
    }

    if (trimmed.length >= 2 && trimmed.length <= 8 && !/\s/.test(trimmed)) {
        const upper = trimmed.toUpperCase();
        const rev = names.find(n => {
            const nw = n.split(/\s+/).filter(w => w.length > 0);
            return nw.length >= 2 && nw.map(w => w[0]).join('').toUpperCase() === upper;
        });
        if (rev) return rev;
    }

    const contains = names.find(n =>
        n.toLowerCase().includes(lower) || lower.includes(n.toLowerCase())
    );
    if (contains) return contains;

    const wordSet = new Set(lower.split(/\s+/).filter(w => w.length > 1));
    let best: string | null = null;
    let bestScore = 0;
    for (const name of names) {
        const nSet = new Set(name.toLowerCase().split(/\s+/).filter(w => w.length > 1));
        const inter = [...wordSet].filter(w => nSet.has(w)).length;
        const union = new Set([...wordSet, ...nSet]).size;
        const score = union > 0 ? inter / union : 0;
        if (score > bestScore && score >= 0.25) { bestScore = score; best = name; }
    }
    return best;
}

const TABS = [
    { id: 'general', label: 'Ерөнхий', icon: User },
    { id: 'contact', label: 'Холбоо барих', icon: Phone },
    { id: 'education', label: 'Боловсрол', icon: GraduationCap },
    { id: 'language', label: 'Хэл', icon: Languages },
    { id: 'training', label: 'Мэргэшил', icon: Award },
    { id: 'family', label: 'Гэр бүл', icon: Users },
    { id: 'experience', label: 'Туршлага', icon: Briefcase },
    { id: 'cv', label: 'CV', icon: FileText },
    { id: 'documents', label: 'Баримт бичиг', icon: FileIcon },
];

function normalizeRegistrationNumber(value: string): string {
    return (value || '').trim().replace(/\s+/g, '');
}

class RegNoIndexError extends Error {
    constructor(message: string, public indexUrl: string) {
        super(message);
        this.name = 'RegNoIndexError';
    }
}

async function checkRegistrationNumberDuplicate(
    registrationNumber: string,
    currentEmployeeId: string
): Promise<{ duplicate: boolean; existingEmployeeId?: string }> {
    const normalized = normalizeRegistrationNumber(registrationNumber);
    if (!normalized) return { duplicate: false };
    const res = await fetch('/api/check-registration-number', {
        method: 'POST',
        headers: await getJsonAuthHeaders(),
        body: JSON.stringify({ registrationNumber: normalized, currentEmployeeId }),
    });
    let json: { error?: string; duplicate?: boolean; detail?: string; indexUrl?: string; existingEmployeeId?: string } = {};
    try {
        json = await res.json();
    } catch {
    }
    if (!res.ok) {
        const errMsg = json.detail || json.error || 'Регистрийн дугаар шалгахад алдаа гарлаа.';
        if (res.status === 503 && json.indexUrl) {
            throw new RegNoIndexError(errMsg, json.indexUrl);
        }
        throw new Error(errMsg);
    }
    return {
        duplicate: !!json.duplicate,
        existingEmployeeId: json.existingEmployeeId,
    };
}

function normalizeIdCardNumber(value: string): string {
    return (value || '').trim().replace(/\s+/g, '');
}

async function checkIdCardNumberDuplicate(
    idCardNumber: string,
    currentEmployeeId: string
): Promise<{ duplicate: boolean; existingEmployeeId?: string }> {
    const normalized = normalizeIdCardNumber(idCardNumber);
    if (!normalized) return { duplicate: false };
    const res = await fetch('/api/check-id-card-number', {
        method: 'POST',
        headers: await getJsonAuthHeaders(),
        body: JSON.stringify({ idCardNumber: normalized, currentEmployeeId }),
    });
    let json: { error?: string; duplicate?: boolean; detail?: string; indexUrl?: string; existingEmployeeId?: string } = {};
    try {
        json = await res.json();
    } catch {}
    if (!res.ok) {
        const errMsg = json.detail || json.error || 'ТТД шалгахад алдаа гарлаа.';
        if (res.status === 503 && json.indexUrl) {
            throw new RegNoIndexError(errMsg, json.indexUrl);
        }
        throw new Error(errMsg);
    }
    return {
        duplicate: !!json.duplicate,
        existingEmployeeId: json.existingEmployeeId,
    };
}

interface FormSectionProps<T extends z.ZodType<any, any>> {
    docRef: any;
    employeeDocRef: any;
    defaultValues: z.infer<T> | undefined;
    schema: T;
    beforeSubmit?: (data: z.infer<T>) => Promise<string | { error: string; indexUrl?: string; existingEmployeeId?: string } | null>;
    children: (form: any, isSubmitting: boolean) => React.ReactNode;
}

function FormSection<T extends z.ZodType<any, any>>({ docRef, employeeDocRef, defaultValues, schema, beforeSubmit, children }: FormSectionProps<T>) {
    const { toast } = useToast();
    const form = useForm<z.infer<T>>({
        resolver: zodResolver(schema),
        defaultValues,
    });

    React.useEffect(() => {
        if (defaultValues) {
            form.reset(defaultValues);
        }
    }, [defaultValues, form]);

    const { isSubmitting } = form.formState;

    const onSubmit = async (data: z.infer<T>) => {
        if (!docRef || !employeeDocRef) return;
        const merged = { ...defaultValues, ...data };
        const currentData = sanitizeForFirestore(merged);

        if (beforeSubmit) {
            const err = await beforeSubmit(currentData as z.infer<T>);
            if (err) {
                if (typeof err === 'object' && err?.indexUrl) {
                    toast({
                        variant: 'destructive',
                        title: 'Индекс шаардлагатай',
                        description: err.error,
                        action: (
                            <ToastAction asChild altText="Индекс үүсгэх">
                                <a href={err.indexUrl} target="_blank" rel="noopener noreferrer" className="font-medium">
                                    Индекс үүсгэх
                                </a>
                            </ToastAction>
                        ),
                    });
                } else if (typeof err === 'object' && err?.existingEmployeeId) {
                    toast({
                        variant: 'destructive',
                        title: 'Алдаа',
                        description: err.error,
                        action: (
                            <ToastAction asChild altText="Тэр ажилтан руу очих">
                                <Link href={`/dashboard/employees/${err.existingEmployeeId}`} className="font-medium">
                                    Тэр ажилтан руу очих
                                </Link>
                            </ToastAction>
                        ),
                    });
                } else {
                    toast({ variant: 'destructive', title: 'Алдаа', description: typeof err === 'string' ? err : err?.error });
                }
                return;
            }
        }

        try {
            await setDoc(docRef, currentData, { merge: true });
            const newCompletion = calculateCompletionPercentage(currentData);
            await updateDoc(employeeDocRef, { questionnaireCompletion: newCompletion });
            toast({ title: 'Амжилттай хадгаллаа' });
        } catch (e) {
            console.warn('Questionnaire save error:', e);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: 'Мэдээлэл хадгалахад алдаа гарлаа. Дахин оролдоно уу.',
            });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {children(form, isSubmitting)}
            </form>
        </Form>
    );
}

const FieldGroup = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-card rounded-xl border p-5", className)}>{children}</div>
);

const SectionTitle = ({ children }: { children: React.ReactNode; icon?: any }) => (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b">
        <h3 className="text-body font-semibold text-foreground">{children}</h3>
    </div>
);

const SaveButton = ({ isSubmitting }: { isSubmitting: boolean }) => (
    <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Хадгалах
        </Button>
    </div>
);

function GeneralInfoForm({ form, references, employeeId, docRef, employeeDocRef }: {
    form: any; references: any; employeeId: string;
    docRef: any; employeeDocRef: any;
}) {
    const hasDisability = form.watch("hasDisability");
    const hasDriversLicense = form.watch("hasDriversLicense");
    const driverLicenseCategoryItems = ["A", "B", "C", "D", "E", "M"];
    const { toast } = useToast();

    const [existingEmployeeIdForLink, setExistingEmployeeIdForLink] = React.useState<string | null>(null);
    const [existingEmployeeIdForTtdLink, setExistingEmployeeIdForTtdLink] = React.useState<string | null>(null);

    const saveField = React.useCallback(async (fields: Record<string, unknown>) => {
        if (!docRef || !employeeDocRef) return;
        const allValues = { ...form.getValues(), ...fields };
        const cleaned = sanitizeForFirestore(allValues);
        await setDoc(docRef, cleaned, { merge: true });
        const newCompletion = calculateCompletionPercentage(cleaned);
        await updateDoc(employeeDocRef, { questionnaireCompletion: newCompletion });
        toast({ title: 'Хадгалагдлаа' });
    }, [docRef, employeeDocRef, form, toast]);

    return (
        <>
            <FieldGroup>
                <SectionTitle icon={User}>Хувийн мэдээлэл</SectionTitle>

                {/* Simple text fields — per-field inline save via SettingRow */}
                <SettingRow
                    label="Овог"
                    value={form.watch('lastName') || ''}
                    placeholder="Овог"
                    onSave={async (v) => {
                        form.setValue('lastName', v);
                        await saveField({ lastName: v });
                    }}
                />
                <SettingRow
                    label="Нэр"
                    value={form.watch('firstName') || ''}
                    placeholder="Нэр"
                    onSave={async (v) => {
                        form.setValue('firstName', v);
                        await saveField({ firstName: v });
                    }}
                />
                <SettingRow
                    label="Регистрийн дугаар"
                    value={form.watch('registrationNumber') || ''}
                    placeholder="АА00112233"
                    onSave={async (v) => {
                        const normalized = normalizeRegistrationNumber(v);
                        if (employeeId) {
                            try {
                                const result = await checkRegistrationNumberDuplicate(normalized, employeeId);
                                if (result.duplicate) {
                                    if (result.existingEmployeeId) setExistingEmployeeIdForLink(result.existingEmployeeId);
                                    throw new Error('Энэ регистрийн дугаар өөр ажилтанд бүртгэгдсэн байна.');
                                }
                            } catch (e) {
                                if (e instanceof RegNoIndexError) throw new Error(e.message);
                                throw e;
                            }
                        }
                        setExistingEmployeeIdForLink(null);
                        form.setValue('registrationNumber', normalized);
                        await saveField({ registrationNumber: normalized });
                    }}
                />
                {existingEmployeeIdForLink && (
                    <div className="pl-44 -mt-1 pb-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                            <Link href={`/dashboard/employees/${existingEmployeeIdForLink}`}>
                                Бүртгэгдсэн ажилтан руу очих
                            </Link>
                        </Button>
                    </div>
                )}
                <SettingRow
                    label="ТТД"
                    hint="Татвар төлөгчийн дугаар"
                    value={form.watch('idCardNumber') || ''}
                    placeholder="Татвар төлөгчийн дугаар"
                    onSave={async (v) => {
                        const normalized = normalizeIdCardNumber(v);
                        if (employeeId) {
                            try {
                                const result = await checkIdCardNumberDuplicate(normalized, employeeId);
                                if (result.duplicate) {
                                    if (result.existingEmployeeId) setExistingEmployeeIdForTtdLink(result.existingEmployeeId);
                                    throw new Error('Энэ ТТД өөр ажилтанд бүртгэгдсэн байна.');
                                }
                            } catch (e) {
                                if (e instanceof RegNoIndexError) throw new Error(e.message);
                                throw e;
                            }
                        }
                        setExistingEmployeeIdForTtdLink(null);
                        form.setValue('idCardNumber', normalized);
                        await saveField({ idCardNumber: normalized });
                    }}
                />
                {existingEmployeeIdForTtdLink && (
                    <div className="pl-44 -mt-1 pb-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                            <Link href={`/dashboard/employees/${existingEmployeeIdForTtdLink}`}>
                                Бүртгэгдсэн ажилтан руу очих
                            </Link>
                        </Button>
                    </div>
                )}

                {/* Select + date fields — per-field save */}
                <SettingRowField<string>
                    label="Иргэншил"
                    value={form.watch('citizenshipCountryId') || ''}
                    onSave={async (v) => {
                        form.setValue('citizenshipCountryId', v || undefined);
                        await saveField({ citizenshipCountryId: v || undefined });
                    }}
                    renderInput={(draft, setDraft) => (
                        <SearchableSelect
                            value={draft || ''}
                            onValueChange={(val) => setDraft(val)}
                            options={[...(references?.countries || [])]
                                .sort((a: ReferenceItem, b: ReferenceItem) => (a.name || '').localeCompare(b.name || ''))
                                .map((item: ReferenceItem) => ({ value: item.id, label: item.name }))}
                            placeholder="Сонгох"
                            searchPlaceholder="Улс хайх..."
                            noneLabel="Сонгоогүй"
                        />
                    )}
                />
                <SettingRowField<Date | undefined>
                    label="Төрсөн огноо"
                    value={form.watch('birthDate')}
                    onSave={async (v) => {
                        form.setValue('birthDate', v);
                        await saveField({ birthDate: v });
                    }}
                    equal={(a, b) => String(a) === String(b)}
                    renderInput={(draft, setDraft) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn('h-9 w-full max-w-[200px] pl-3 text-left text-sm font-normal', !draft && 'text-muted-foreground')}>
                                    {draft ? format(new Date(draft), 'yyyy-MM-dd') : <span>Огноо сонгох</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" captionLayout="dropdown" fromYear={1960} toYear={new Date().getFullYear()} selected={draft} onSelect={setDraft} disabled={(date) => date > new Date()} initialFocus />
                            </PopoverContent>
                        </Popover>
                    )}
                />
                <SettingRowField<string>
                    label="Хүйс"
                    value={form.watch('gender') || ''}
                    onSave={async (v) => {
                        form.setValue('gender', v);
                        await saveField({ gender: v });
                    }}
                    renderInput={(draft, setDraft) => (
                        <Select value={draft} onValueChange={setDraft}>
                            <SelectTrigger className="h-9 text-sm border-0 bg-transparent shadow-none pl-0 focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Эрэгтэй</SelectItem>
                                <SelectItem value="female">Эмэгтэй</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </FieldGroup>

            <FieldGroup>
                <SectionTitle icon={Info}>НДШТ даатгуулагчийн төрөл</SectionTitle>
                <SettingRowField<string>
                    label="Даатгалын төрөл"
                    value={form.watch('insuranceTypeCode') || ''}
                    onSave={async (v) => {
                        form.setValue('insuranceTypeCode', v);
                        await saveField({ insuranceTypeCode: v });
                    }}
                    renderInput={(draft, setDraft) => (
                        <div className="space-y-1">
                            <SearchableSelect
                                value={draft}
                                onValueChange={setDraft}
                                options={INSURANCE_TYPES.map((type) => ({ value: type.code, label: type.name, prefix: type.code }))}
                                placeholder="НДШТ төрөл сонгоно уу"
                                searchPlaceholder="Код эсвэл нэрээр хайх..."
                                contentClassName="w-[420px]"
                            />
                            {draft && (
                                <p className="text-xs text-muted-foreground">
                                    {INSURANCE_TYPES.find(t => t.code === draft)?.name}
                                </p>
                            )}
                        </div>
                    )}
                />
            </FieldGroup>

            <FieldGroup>
                <SettingRowToggle
                    label="Хөгжлийн бэрхшээл"
                    description="Хөгжлийн бэрхшээлтэй эсэх"
                    checked={!!hasDisability}
                    onToggle={async (v) => {
                        form.setValue('hasDisability', v);
                        await saveField({ hasDisability: v });
                    }}
                />
                {hasDisability && (
                    <div className="pl-6 pt-1 animate-in slide-in-from-top-2 space-y-0">
                        <SettingRow
                            label="Чадвар алдалт %"
                            value={String(form.watch('disabilityPercentage') || '')}
                            placeholder="%"
                            inputClassName="font-mono"
                            onSave={async (v) => {
                                form.setValue('disabilityPercentage', v);
                                await saveField({ disabilityPercentage: v });
                            }}
                        />
                        <SettingRowField<Date | undefined>
                            label="Огноо"
                            value={form.watch('disabilityDate')}
                            onSave={async (v) => {
                                form.setValue('disabilityDate', v);
                                await saveField({ disabilityDate: v });
                            }}
                            equal={(a, b) => String(a) === String(b)}
                            renderInput={(draft, setDraft) => (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn('h-9 w-full max-w-[200px] pl-3 text-left text-sm font-normal', !draft && 'text-muted-foreground')}>
                                            {draft ? format(new Date(draft), 'yyyy-MM-dd') : <span>Огноо сонгох</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" captionLayout="dropdown" fromYear={1980} toYear={new Date().getFullYear()} selected={draft} onSelect={setDraft} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                    </div>
                )}
            </FieldGroup>

            <FieldGroup>
                <SettingRowToggle
                    label="Жолооны үнэмлэх"
                    description="Жолооны үнэмлэхтэй эсэх"
                    checked={!!hasDriversLicense}
                    onToggle={async (v) => {
                        form.setValue('hasDriversLicense', v);
                        await saveField({ hasDriversLicense: v });
                    }}
                />
                {hasDriversLicense && (
                    <div className="pl-6 pt-1 animate-in slide-in-from-top-2">
                        <SettingRowField<string[]>
                            label="Ангилал"
                            value={(form.watch('driverLicenseCategories') || []) as string[]}
                            onSave={async (v) => {
                                form.setValue('driverLicenseCategories', v);
                                await saveField({ driverLicenseCategories: v });
                            }}
                            equal={(a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())}
                            renderInput={(draft, setDraft) => (
                                <div className="flex flex-wrap gap-2 py-1">
                                    {driverLicenseCategoryItems.map((item) => {
                                        const active = draft.includes(item);
                                        return (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setDraft(active ? draft.filter(v => v !== item) : [...draft, item])}
                                                className={cn(
                                                    'px-4 py-1.5 rounded-lg border text-sm font-medium transition-all',
                                                    active ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-muted/50',
                                                )}
                                            >
                                                {item}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        />
                    </div>
                )}
            </FieldGroup>
        </>
    );
}

function ContactInfoForm({ form, references, docRef, employeeDocRef }: {
    form: any; references: any; docRef: any; employeeDocRef: any;
}) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'emergencyContacts' });
    const { toast } = useToast();
    const [isAddEmergencyRelOpen, setIsAddEmergencyRelOpen] = React.useState(false);
    const [newEmergencyRelName, setNewEmergencyRelName] = React.useState('');
    const [currentEmergencyFieldIndex, setCurrentEmergencyFieldIndex] = React.useState<number | null>(null);
    const emergencyRelCollection = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireEmergencyRelationships') : null, []);

    const handleAddEmergencyRel = async () => {
        if (!emergencyRelCollection || !newEmergencyRelName.trim() || currentEmergencyFieldIndex === null) return;
        try {
            await addDocumentNonBlocking(emergencyRelCollection, { name: newEmergencyRelName.trim() });
            form.setValue(`emergencyContacts.${currentEmergencyFieldIndex}.relationship`, newEmergencyRelName.trim());
        } finally {
            setNewEmergencyRelName(''); setIsAddEmergencyRelOpen(false); setCurrentEmergencyFieldIndex(null);
        }
    };

    const saveField = React.useCallback(async (patch: Record<string, unknown>) => {
        if (!docRef || !employeeDocRef) return;
        const allValues = { ...form.getValues(), ...patch };
        const cleaned = sanitizeForFirestore(allValues);
        await setDoc(docRef, cleaned, { merge: true });
        const newCompletion = calculateCompletionPercentage(cleaned);
        await updateDoc(employeeDocRef, { questionnaireCompletion: newCompletion });
        toast({ title: 'Хадгалагдлаа' });
    }, [docRef, employeeDocRef, form, toast]);

    const handleRemoveContact = async (index: number) => {
        const newContacts = (form.getValues('emergencyContacts') as any[]).filter((_: any, i: number) => i !== index);
        remove(index);
        await saveField({ emergencyContacts: newContacts });
    };

    return (
        <>
            <Dialog open={isAddEmergencyRelOpen} onOpenChange={setIsAddEmergencyRelOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Шинэ хамаарал</DialogTitle>
                        <DialogDescription>Жагсаалтад байхгүй хамаарлын нэрийг нэмнэ үү.</DialogDescription>
                    </DialogHeader>
                    <Input placeholder="Хамаарлын нэр (жишээ: Найз, Хамтран ажиллагч)" value={newEmergencyRelName} onChange={(e) => setNewEmergencyRelName(e.target.value)} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddEmergencyRelOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleAddEmergencyRel}>Нэмэх</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FieldGroup>
                <SectionTitle icon={Phone}>Холбоо барих мэдээлэл</SectionTitle>
                <SettingRow
                    label="Албан утас"
                    value={form.watch('workPhone') || ''}
                    placeholder="8811****"
                    onSave={async (v) => { form.setValue('workPhone', v); await saveField({ workPhone: v }); }}
                />
                <SettingRow
                    label="Хувийн утас"
                    value={form.watch('personalPhone') || ''}
                    placeholder="9911****"
                    onSave={async (v) => { form.setValue('personalPhone', v); await saveField({ personalPhone: v }); }}
                />
                <SettingRow
                    label="Албан и-мэйл"
                    value={form.watch('workEmail') || ''}
                    placeholder="name@company.com"
                    onSave={async (v) => { form.setValue('workEmail', v); await saveField({ workEmail: v }); }}
                />
                <SettingRow
                    label="Хувийн и-мэйл"
                    value={form.watch('personalEmail') || ''}
                    placeholder="personal@email.com"
                    onSave={async (v) => { form.setValue('personalEmail', v); await saveField({ personalEmail: v }); }}
                />
                <SettingRowField<string>
                    label="Гэрийн хаяг"
                    value={form.watch('homeAddress') || ''}
                    onSave={async (v) => { form.setValue('homeAddress', v); await saveField({ homeAddress: v }); }}
                    renderInput={(draft, setDraft) => (
                        <Textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Хаяг..."
                            className="resize-none text-sm min-h-[4rem]"
                            rows={2}
                        />
                    )}
                />
                <SettingRowField<string>
                    label="Түр хаяг"
                    value={form.watch('temporaryAddress') || ''}
                    onSave={async (v) => { form.setValue('temporaryAddress', v); await saveField({ temporaryAddress: v }); }}
                    renderInput={(draft, setDraft) => (
                        <Textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Түр оршин суугаа хаяг..."
                            className="resize-none text-sm min-h-[4rem]"
                            rows={2}
                        />
                    )}
                />
            </FieldGroup>

            <FieldGroup>
                <SectionTitle>Сошиал медиа</SectionTitle>
                <SettingRow
                    label="Facebook"
                    value={form.watch('facebook') || ''}
                    placeholder="facebook.com/username"
                    onSave={async (v) => { form.setValue('facebook', v); await saveField({ facebook: v }); }}
                />
                <SettingRow
                    label="Instagram"
                    value={form.watch('instagram') || ''}
                    placeholder="instagram.com/username"
                    onSave={async (v) => { form.setValue('instagram', v); await saveField({ instagram: v }); }}
                />
            </FieldGroup>

            <FieldGroup>
                <SectionTitle icon={Users}>Яаралтай үед холбоо барих</SectionTitle>
                <div className="space-y-3">
                    {fields.map((fieldItem, index) => (
                        <div key={fieldItem.id} className="rounded-xl border bg-muted/50 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
                                <span className="text-caption font-semibold text-muted-foreground uppercase tracking-wide">
                                    {index + 1}-р холбоо барих
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-caption text-muted-foreground/60 hover:text-error gap-1"
                                    onClick={() => handleRemoveContact(index)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Устгах
                                </Button>
                            </div>
                            <div className="px-4">
                                <SettingRow
                                    label="Нэр"
                                    value={form.watch(`emergencyContacts.${index}.fullName`) || ''}
                                    placeholder="Овог нэр"
                                    onSave={async (v) => {
                                        form.setValue(`emergencyContacts.${index}.fullName`, v);
                                        await saveField({ emergencyContacts: form.getValues('emergencyContacts') });
                                    }}
                                />
                                <SettingRowField<string>
                                    label="Хэн болох"
                                    value={form.watch(`emergencyContacts.${index}.relationship`) || ''}
                                    onSave={async (v) => {
                                        form.setValue(`emergencyContacts.${index}.relationship`, v);
                                        await saveField({ emergencyContacts: form.getValues('emergencyContacts') });
                                    }}
                                    renderInput={(draft, setDraft) => (
                                        <Select value={draft} onValueChange={(v) => {
                                            if (v === '__add_new__') { setCurrentEmergencyFieldIndex(index); setIsAddEmergencyRelOpen(true); }
                                            else setDraft(v);
                                        }}>
                                            <SelectTrigger className="h-9 text-sm border-0 bg-transparent shadow-none pl-0 focus:ring-0 focus:ring-offset-0">
                                                <SelectValue placeholder="Сонгох" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {references.emergencyRelationships?.map((item: ReferenceItem) => (
                                                    <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                                                ))}
                                                <SelectItem value="__add_new__" className="text-primary font-medium">+ Шинээр нэмэх</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <SettingRow
                                    label="Утас"
                                    value={form.watch(`emergencyContacts.${index}.phone`) || ''}
                                    placeholder="9911****"
                                    onSave={async (v) => {
                                        form.setValue(`emergencyContacts.${index}.phone`, v);
                                        await saveField({ emergencyContacts: form.getValues('emergencyContacts') });
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ fullName: '', relationship: '', phone: '' })}
                        className="gap-2"
                    >
                        <PlusCircle className="h-4 w-4" /> Нэмэх
                    </Button>
                </div>
            </FieldGroup>
        </>
    );
}

function EducationForm({ form, references, docRef, employeeDocRef }: {
    form: any; references: any; docRef: any; employeeDocRef: any;
}) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'education' });
    const [isAddSchoolOpen, setIsAddSchoolOpen] = React.useState(false);
    const [newSchoolName, setNewSchoolName] = React.useState('');
    const [isAddDegreeOpen, setIsAddDegreeOpen] = React.useState(false);
    const [newDegreeName, setNewDegreeName] = React.useState('');
    const [isAddCountryOpen, setIsAddCountryOpen] = React.useState(false);
    const [newCountryName, setNewCountryName] = React.useState('');
    const [isAddAcademicRankOpen, setIsAddAcademicRankOpen] = React.useState(false);
    const [newAcademicRankName, setNewAcademicRankName] = React.useState('');
    const [currentFieldIndex, setCurrentFieldIndex] = React.useState<number | null>(null);
    const { toast } = useToast();

    // Ref map: index → SettingGroup's setField, so dialogs can update the draft directly
    const setFieldRefs = React.useRef<Record<number, (key: string, val: any) => void>>({});

    const schoolsCollection = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireSchools') : null, []);
    const degreesCollection = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireDegrees') : null, []);
    const countriesCollection = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireCountries') : null, []);
    const academicRanksCollection = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireAcademicRanks') : null, []);
    const notApplicable = form.watch('educationNotApplicable');

    const saveField = React.useCallback(async (patch: Record<string, unknown>) => {
        if (!docRef || !employeeDocRef) return;
        const allValues = { ...form.getValues(), ...patch };
        const cleaned = sanitizeForFirestore(allValues);
        await setDoc(docRef, cleaned, { merge: true });
        const newCompletion = calculateCompletionPercentage(cleaned);
        await updateDoc(employeeDocRef, { questionnaireCompletion: newCompletion });
        toast({ title: 'Хадгалагдлаа' });
    }, [docRef, employeeDocRef, form, toast]);

    // "Шинэ сургууль" dialog — updates the SettingGroup draft directly via ref
    const handleAddSchool = async () => {
        if (!schoolsCollection || !newSchoolName.trim() || currentFieldIndex === null) return;
        try {
            await addDocumentNonBlocking(schoolsCollection, { name: newSchoolName.trim() });
            setFieldRefs.current[currentFieldIndex]?.('school', newSchoolName.trim());
        } finally {
            setNewSchoolName(''); setIsAddSchoolOpen(false); setCurrentFieldIndex(null);
        }
    };

    // "Шинэ мэргэжил" dialog — updates the SettingGroup draft directly via ref
    const handleAddDegree = async () => {
        if (!degreesCollection || !newDegreeName.trim() || currentFieldIndex === null) return;
        try {
            await addDocumentNonBlocking(degreesCollection, { name: newDegreeName.trim() });
            setFieldRefs.current[currentFieldIndex]?.('degree', newDegreeName.trim());
        } finally {
            setNewDegreeName(''); setIsAddDegreeOpen(false); setCurrentFieldIndex(null);
        }
    };

    const handleAddCountry = async () => {
        if (!countriesCollection || !newCountryName.trim() || currentFieldIndex === null) return;
        try {
            await addDocumentNonBlocking(countriesCollection, { name: newCountryName.trim() });
            setFieldRefs.current[currentFieldIndex]?.('country', newCountryName.trim());
        } finally {
            setNewCountryName(''); setIsAddCountryOpen(false); setCurrentFieldIndex(null);
        }
    };

    const handleAddAcademicRank = async () => {
        if (!academicRanksCollection || !newAcademicRankName.trim() || currentFieldIndex === null) return;
        try {
            await addDocumentNonBlocking(academicRanksCollection, { name: newAcademicRankName.trim() });
            setFieldRefs.current[currentFieldIndex]?.('academicRank', newAcademicRankName.trim());
        } finally {
            setNewAcademicRankName(''); setIsAddAcademicRankOpen(false); setCurrentFieldIndex(null);
        }
    };

    const handleRemove = async (index: number) => {
        const newList = (form.getValues('education') as any[]).filter((_: any, i: number) => i !== index);
        remove(index);
        await saveField({ education: newList });
    };

    return (
        <>
            <Dialog open={isAddSchoolOpen} onOpenChange={setIsAddSchoolOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Шинэ сургууль</DialogTitle>
                        <DialogDescription>Жагсаалтад байхгүй сургуулийн нэрийг нэмнэ үү.</DialogDescription>
                    </DialogHeader>
                    <Input placeholder="Сургуулийн нэр" value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddSchoolOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleAddSchool}>Нэмэх</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddDegreeOpen} onOpenChange={setIsAddDegreeOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Шинэ мэргэжил</DialogTitle>
                        <DialogDescription>Жагсаалтад байхгүй мэргэжлийн нэрийг нэмнэ үү.</DialogDescription>
                    </DialogHeader>
                    <Input placeholder="Мэргэжлийн нэр" value={newDegreeName} onChange={(e) => setNewDegreeName(e.target.value)} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDegreeOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleAddDegree}>Нэмэх</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddCountryOpen} onOpenChange={setIsAddCountryOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Шинэ улс</DialogTitle>
                        <DialogDescription>Жагсаалтад байхгүй улсын нэрийг нэмнэ үү.</DialogDescription>
                    </DialogHeader>
                    <Input placeholder="Улсын нэр" value={newCountryName} onChange={(e) => setNewCountryName(e.target.value)} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddCountryOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleAddCountry}>Нэмэх</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddAcademicRankOpen} onOpenChange={setIsAddAcademicRankOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Шинэ зэрэг</DialogTitle>
                        <DialogDescription>Жагсаалтад байхгүй зэргийн нэрийг нэмнэ үү.</DialogDescription>
                    </DialogHeader>
                    <Input placeholder="Зэргийн нэр" value={newAcademicRankName} onChange={(e) => setNewAcademicRankName(e.target.value)} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddAcademicRankOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleAddAcademicRank}>Нэмэх</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FieldGroup>
                <SettingRowToggle
                    label="Боловсролгүй"
                    description="Боловсролын мэдээлэл байхгүй"
                    checked={!!notApplicable}
                    onToggle={async (v) => {
                        form.setValue('educationNotApplicable', v);
                        await saveField({ educationNotApplicable: v });
                    }}
                />
            </FieldGroup>

            <div className={cn('space-y-4', notApplicable && 'pointer-events-none opacity-40')}>
                {fields.map((fieldItem, index) => {
                    const eduValue = form.watch(`education.${index}`) ?? {};
                    return (
                        <FieldGroup key={fieldItem.id}>
                            {/* Card header */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wide">
                                    Боловсрол #{index + 1}
                                </span>
                                <Button
                                    type="button" variant="ghost" size="sm"
                                    className="h-7 text-caption text-muted-foreground/60 hover:text-error gap-1"
                                    onClick={() => handleRemove(index)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Устгах
                                </Button>
                            </div>

                            {/* SettingGroup — one draft for the whole card, one save bar */}
                            <SettingGroup
                                value={eduValue}
                                onSave={async (draft) => {
                                    form.setValue(`education.${index}`, draft);
                                    await saveField({ education: form.getValues('education') });
                                }}
                            >
                                {(draft, setField) => {
                                    // Keep ref updated so dialogs can reach this card's setField
                                    setFieldRefs.current[index] = setField as any;
                                    return (
                                        <>
                                            <GroupRow label="Улс">
                                                <SearchableSelect
                                                    value={draft.country || ''}
                                                    onValueChange={(v) => setField('country' as any, v)}
                                                    options={(references.countries || []).map((item: ReferenceItem) => ({ value: item.name, label: item.name }))}
                                                    placeholder="Сонгох"
                                                    searchPlaceholder="Улс хайх..."
                                                    addNewLabel="+ Шинээр нэмэх"
                                                    onAddNew={() => { setCurrentFieldIndex(index); setIsAddCountryOpen(true); }}
                                                />
                                            </GroupRow>
                                            <GroupRow label="Сургууль">
                                                <SearchableSelect
                                                    value={draft.school || ''}
                                                    onValueChange={(v) => setField('school' as any, v)}
                                                    options={(references.schools || []).map((item: ReferenceItem, i: number) => ({ value: item.name, label: item.name }))}
                                                    placeholder="Сонгох"
                                                    searchPlaceholder="Сургууль хайх..."
                                                    addNewLabel="+ Шинээр нэмэх"
                                                    onAddNew={() => { setCurrentFieldIndex(index); setIsAddSchoolOpen(true); }}
                                                />
                                            </GroupRow>
                                            <GroupRow label="Мэргэжил">
                                                <SearchableSelect
                                                    value={draft.degree || ''}
                                                    onValueChange={(v) => setField('degree' as any, v)}
                                                    options={(references.degrees || []).map((item: ReferenceItem) => ({ value: item.name, label: item.name }))}
                                                    placeholder="Сонгох"
                                                    searchPlaceholder="Мэргэжил хайх..."
                                                    addNewLabel="+ Шинээр нэмэх"
                                                    onAddNew={() => { setCurrentFieldIndex(index); setIsAddDegreeOpen(true); }}
                                                />
                                            </GroupRow>
                                            <GroupRow label="Зэрэг">
                                                <SearchableSelect
                                                    value={draft.academicRank || ''}
                                                    onValueChange={(v) => setField('academicRank' as any, v)}
                                                    options={(references.academicRanks || []).map((item: ReferenceItem) => ({ value: item.name, label: item.name }))}
                                                    placeholder="Сонгох"
                                                    searchPlaceholder="Зэрэг хайх..."
                                                    addNewLabel="+ Шинээр нэмэх"
                                                    onAddNew={() => { setCurrentFieldIndex(index); setIsAddAcademicRankOpen(true); }}
                                                />
                                            </GroupRow>
                                            <GroupRow label="Элссэн огноо">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className={cn('h-9 w-full max-w-[200px] pl-3 text-left text-sm font-normal', !draft.entryDate && 'text-muted-foreground')}>
                                                            {draft.entryDate ? format(new Date(draft.entryDate), 'yyyy-MM-dd') : <span>Огноо</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar mode="single" captionLayout="dropdown" fromYear={1980} toYear={new Date().getFullYear()} selected={draft.entryDate} onSelect={(d) => setField('entryDate' as any, d)} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </GroupRow>
                                            <GroupRow label="Төгссөн огноо">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" disabled={!!draft.isCurrent} className={cn('h-9 w-full max-w-[200px] pl-3 text-left text-sm font-normal', !draft.gradDate && 'text-muted-foreground')}>
                                                            {draft.gradDate ? format(new Date(draft.gradDate), 'yyyy-MM-dd') : <span>Огноо</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar mode="single" captionLayout="dropdown" fromYear={1980} toYear={new Date().getFullYear()} selected={draft.gradDate} onSelect={(d) => setField('gradDate' as any, d)} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </GroupRow>
                                            <GroupRow label="Дипломын дугаар">
                                                <Input
                                                    value={draft.diplomaNumber || ''}
                                                    onChange={(e) => setField('diplomaNumber' as any, e.target.value)}
                                                    placeholder="Дугаар"
                                                    className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                                />
                                            </GroupRow>
                                            <GroupRow label="Одоо суралцаж байна" className="border-0">
                                                <Checkbox
                                                    checked={!!draft.isCurrent}
                                                    onCheckedChange={(v) => setField('isCurrent' as any, v === true)}
                                                />
                                            </GroupRow>
                                        </>
                                    );
                                }}
                            </SettingGroup>
                        </FieldGroup>
                    );
                })}
                <Button
                    type="button" variant="outline"
                    onClick={() => append({ country: '', school: '', degree: '', diplomaNumber: '', academicRank: '', entryDate: null, gradDate: null, isCurrent: false })}
                    className="gap-2"
                >
                    <PlusCircle className="h-4 w-4" /> Боловсрол нэмэх
                </Button>
            </div>
        </>
    );
}

function LanguageForm({ form, references, docRef, employeeDocRef }: {
    form: any; references: any; docRef: any; employeeDocRef: any;
}) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'languages' });
    const { toast } = useToast();
    const proficiencyLevels = ['Анхан', 'Дунд', 'Ахисан', 'Мэргэжлийн'];
    const notApplicable = form.watch('languagesNotApplicable');
    const [isAddLanguageOpen, setIsAddLanguageOpen] = React.useState(false);
    const [newLanguageName, setNewLanguageName] = React.useState('');
    const [currentLangFieldIndex, setCurrentLangFieldIndex] = React.useState<number | null>(null);
    const languagesCollection = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireLanguages') : null, []);
    const setLangFieldRefs = React.useRef<Record<number, (key: string, val: any) => void>>({});

    const handleAddLanguage = async () => {
        if (!languagesCollection || !newLanguageName.trim() || currentLangFieldIndex === null) return;
        try {
            await addDocumentNonBlocking(languagesCollection, { name: newLanguageName.trim() });
            setLangFieldRefs.current[currentLangFieldIndex]?.('language', newLanguageName.trim());
        } finally {
            setNewLanguageName(''); setIsAddLanguageOpen(false); setCurrentLangFieldIndex(null);
        }
    };

    const saveField = React.useCallback(async (patch: Record<string, unknown>) => {
        if (!docRef || !employeeDocRef) return;
        const allValues = { ...form.getValues(), ...patch };
        const cleaned = sanitizeForFirestore(allValues);
        await setDoc(docRef, cleaned, { merge: true });
        const newCompletion = calculateCompletionPercentage(cleaned);
        await updateDoc(employeeDocRef, { questionnaireCompletion: newCompletion });
        toast({ title: 'Хадгалагдлаа' });
    }, [docRef, employeeDocRef, form, toast]);

    const handleRemove = async (index: number) => {
        const newList = (form.getValues('languages') as any[]).filter((_: any, i: number) => i !== index);
        remove(index);
        await saveField({ languages: newList });
    };

    return (
        <>
            <Dialog open={isAddLanguageOpen} onOpenChange={setIsAddLanguageOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Шинэ хэл</DialogTitle>
                        <DialogDescription>Жагсаалтад байхгүй хэлний нэрийг нэмнэ үү.</DialogDescription>
                    </DialogHeader>
                    <Input placeholder="Хэлний нэр" value={newLanguageName} onChange={(e) => setNewLanguageName(e.target.value)} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddLanguageOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleAddLanguage}>Нэмэх</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FieldGroup>
                <SettingRowToggle
                    label="Хэлний мэдлэг байхгүй"
                    description="Гадаад хэлний мэдлэг байхгүй"
                    checked={!!notApplicable}
                    onToggle={async (v) => {
                        form.setValue('languagesNotApplicable', v);
                        await saveField({ languagesNotApplicable: v });
                    }}
                />
            </FieldGroup>

            <div className={cn('space-y-4', notApplicable && 'pointer-events-none opacity-40')}>
                {fields.map((fieldItem, index) => {
                    const langValue = form.watch(`languages.${index}`) ?? {};
                    return (
                        <FieldGroup key={fieldItem.id}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wide">
                                    Хэл #{index + 1}
                                </span>
                                <Button
                                    type="button" variant="ghost" size="sm"
                                    className="h-7 text-caption text-muted-foreground/60 hover:text-error gap-1"
                                    onClick={() => handleRemove(index)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Устгах
                                </Button>
                            </div>
                            <SettingGroup
                                value={langValue}
                                onSave={async (draft) => {
                                    form.setValue(`languages.${index}`, draft);
                                    await saveField({ languages: form.getValues('languages') });
                                }}
                            >
                                {(draft, setField) => {
                                    setLangFieldRefs.current[index] = setField as any;
                                    return (
                                    <>
                                        <GroupRow label="Хэл">
                                            <SearchableSelect
                                                value={(draft as any).language || ''}
                                                onValueChange={(v) => setField('language' as any, v)}
                                                options={(references.languages || []).map((lang: ReferenceItem) => ({ value: lang.name, label: lang.name }))}
                                                placeholder="Сонгох"
                                                searchPlaceholder="Хэл хайх..."
                                                addNewLabel="+ Шинээр нэмэх"
                                                onAddNew={() => { setCurrentLangFieldIndex(index); setIsAddLanguageOpen(true); }}
                                            />
                                        </GroupRow>
                                        {(['listening', 'reading', 'speaking', 'writing'] as const).map((skill) => (
                                            <GroupRow key={skill} label={skill === 'listening' ? 'Сонсох' : skill === 'reading' ? 'Унших' : skill === 'speaking' ? 'Ярих' : 'Бичих'}>
                                                <Select value={(draft as any)[skill] || ''} onValueChange={(v) => setField(skill as any, v)}>
                                                    <SelectTrigger className="h-9 text-sm border-0 bg-transparent shadow-none pl-0 focus:ring-0 focus:ring-offset-0">
                                                        <SelectValue placeholder="Түвшин" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {proficiencyLevels.map(level => (
                                                            <SelectItem key={level} value={level}>{level}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </GroupRow>
                                        ))}
                                        <GroupRow label="Шалгалтын оноо" className="border-0">
                                            <Input
                                                value={(draft as any).testScore || ''}
                                                onChange={(e) => setField('testScore' as any, e.target.value)}
                                                placeholder="TOEFL, IELTS гэх мэт"
                                                className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                            />
                                        </GroupRow>
                                    </>
                                    );
                                }}
                            </SettingGroup>
                        </FieldGroup>
                    );
                })}
                <Button
                    type="button" variant="outline"
                    onClick={() => append({ language: '', listening: '', reading: '', speaking: '', writing: '', testScore: '' })}
                    className="gap-2"
                >
                    <PlusCircle className="h-4 w-4" /> Хэл нэмэх
                </Button>
            </div>
        </>
    );
}

function TrainingForm({ form, docRef, employeeDocRef }: {
    form: any; docRef: any; employeeDocRef: any;
}) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'trainings' });
    const { toast } = useToast();
    const notApplicable = form.watch('trainingsNotApplicable');

    const saveField = React.useCallback(async (patch: Record<string, unknown>) => {
        if (!docRef || !employeeDocRef) return;
        const allValues = { ...form.getValues(), ...patch };
        const cleaned = sanitizeForFirestore(allValues);
        await setDoc(docRef, cleaned, { merge: true });
        const newCompletion = calculateCompletionPercentage(cleaned);
        await updateDoc(employeeDocRef, { questionnaireCompletion: newCompletion });
        toast({ title: 'Хадгалагдлаа' });
    }, [docRef, employeeDocRef, form, toast]);

    const handleRemove = async (index: number) => {
        const newList = (form.getValues('trainings') as any[]).filter((_: any, i: number) => i !== index);
        remove(index);
        await saveField({ trainings: newList });
    };

    return (
        <>
            <FieldGroup>
                <SettingRowToggle
                    label="Сургалт байхгүй"
                    description="Мэргэшлийн сургалтын мэдээлэл байхгүй"
                    checked={!!notApplicable}
                    onToggle={async (v) => {
                        form.setValue('trainingsNotApplicable', v);
                        await saveField({ trainingsNotApplicable: v });
                    }}
                />
            </FieldGroup>

            <div className={cn('space-y-4', notApplicable && 'pointer-events-none opacity-40')}>
                {fields.map((fieldItem, index) => {
                    const trainingValue = form.watch(`trainings.${index}`) ?? {};
                    return (
                        <FieldGroup key={fieldItem.id}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wide">
                                    Сургалт #{index + 1}
                                </span>
                                <Button
                                    type="button" variant="ghost" size="sm"
                                    className="h-7 text-caption text-muted-foreground/60 hover:text-error gap-1"
                                    onClick={() => handleRemove(index)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Устгах
                                </Button>
                            </div>
                            <SettingGroup
                                value={trainingValue}
                                onSave={async (draft) => {
                                    form.setValue(`trainings.${index}`, draft);
                                    await saveField({ trainings: form.getValues('trainings') });
                                }}
                            >
                                {(draft, setField) => (
                                    <>
                                        <GroupRow label="Сургалтын нэр">
                                            <Input
                                                value={(draft as any).name || ''}
                                                onChange={(e) => setField('name' as any, e.target.value)}
                                                placeholder="Нэр"
                                                className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                            />
                                        </GroupRow>
                                        <GroupRow label="Байгууллага">
                                            <Input
                                                value={(draft as any).organization || ''}
                                                onChange={(e) => setField('organization' as any, e.target.value)}
                                                placeholder="Байгууллага"
                                                className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                            />
                                        </GroupRow>
                                        <GroupRow label="Эхэлсэн">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn('h-9 w-full max-w-[200px] pl-3 text-left text-sm font-normal', !(draft as any).startDate && 'text-muted-foreground')}>
                                                        {(draft as any).startDate ? format(new Date((draft as any).startDate), 'yyyy-MM-dd') : <span>Огноо</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" captionLayout="dropdown" fromYear={1980} toYear={new Date().getFullYear()} selected={(draft as any).startDate} onSelect={(d) => setField('startDate' as any, d)} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </GroupRow>
                                        <GroupRow label="Дууссан">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn('h-9 w-full max-w-[200px] pl-3 text-left text-sm font-normal', !(draft as any).endDate && 'text-muted-foreground')}>
                                                        {(draft as any).endDate ? format(new Date((draft as any).endDate), 'yyyy-MM-dd') : <span>Огноо</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" captionLayout="dropdown" fromYear={1980} toYear={new Date().getFullYear()} selected={(draft as any).endDate} onSelect={(d) => setField('endDate' as any, d)} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </GroupRow>
                                        <GroupRow label="Сертификат №" className="border-0">
                                            <Input
                                                value={(draft as any).certificateNumber || ''}
                                                onChange={(e) => setField('certificateNumber' as any, e.target.value)}
                                                placeholder="Дугаар"
                                                className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                            />
                                        </GroupRow>
                                    </>
                                )}
                            </SettingGroup>
                        </FieldGroup>
                    );
                })}
                <Button
                    type="button" variant="outline"
                    onClick={() => append({ name: '', organization: '', startDate: null, endDate: null, certificateNumber: '' })}
                    className="gap-2"
                >
                    <PlusCircle className="h-4 w-4" /> Сургалт нэмэх
                </Button>
            </div>
        </>
    );
}

function FamilyInfoForm({ form, references, docRef, employeeDocRef }: {
    form: any; references: any; docRef: any; employeeDocRef: any;
}) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'familyMembers' });
    const { toast } = useToast();
    const notApplicable = form.watch('familyMembersNotApplicable');
    const [isAddFamilyRelOpen, setIsAddFamilyRelOpen] = React.useState(false);
    const [newFamilyRelName, setNewFamilyRelName] = React.useState('');
    const [currentFamilyFieldIndex, setCurrentFamilyFieldIndex] = React.useState<number | null>(null);
    const familyRelCollection = useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireFamilyRelationships') : null, []);
    const setFamilyFieldRefs = React.useRef<Record<number, (key: string, val: any) => void>>({});

    const handleAddFamilyRel = async () => {
        if (!familyRelCollection || !newFamilyRelName.trim() || currentFamilyFieldIndex === null) return;
        try {
            await addDocumentNonBlocking(familyRelCollection, { name: newFamilyRelName.trim() });
            setFamilyFieldRefs.current[currentFamilyFieldIndex]?.('relationship', newFamilyRelName.trim());
        } finally {
            setNewFamilyRelName(''); setIsAddFamilyRelOpen(false); setCurrentFamilyFieldIndex(null);
        }
    };

    const saveField = React.useCallback(async (patch: Record<string, unknown>) => {
        if (!docRef || !employeeDocRef) return;
        const allValues = { ...form.getValues(), ...patch };
        const cleaned = sanitizeForFirestore(allValues);
        await setDoc(docRef, cleaned, { merge: true });
        const newCompletion = calculateCompletionPercentage(cleaned);
        await updateDoc(employeeDocRef, { questionnaireCompletion: newCompletion });
        toast({ title: 'Хадгалагдлаа' });
    }, [docRef, employeeDocRef, form, toast]);

    const handleRemove = async (index: number) => {
        const newList = (form.getValues('familyMembers') as any[]).filter((_: any, i: number) => i !== index);
        remove(index);
        await saveField({ familyMembers: newList });
    };

    return (
        <>
            <Dialog open={isAddFamilyRelOpen} onOpenChange={setIsAddFamilyRelOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Шинэ хамаарал</DialogTitle>
                        <DialogDescription>Жагсаалтад байхгүй гэр бүлийн хамаарлын нэрийг нэмнэ үү.</DialogDescription>
                    </DialogHeader>
                    <Input placeholder="Хамаарлын нэр (жишээ: Ах, Эгч)" value={newFamilyRelName} onChange={(e) => setNewFamilyRelName(e.target.value)} />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddFamilyRelOpen(false)}>Цуцлах</Button>
                        <Button onClick={handleAddFamilyRel}>Нэмэх</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <FieldGroup>
                <SettingRowToggle
                    label="Гэр бүл байхгүй"
                    description="Гэр бүлийн мэдээлэл байхгүй"
                    checked={!!notApplicable}
                    onToggle={async (v) => {
                        form.setValue('familyMembersNotApplicable', v);
                        await saveField({ familyMembersNotApplicable: v });
                    }}
                />
            </FieldGroup>

            <FieldGroup>
                <SettingRowField<string>
                    label="Гэрлэлтийн байдал"
                    hint="Заавал биш"
                    value={form.watch('maritalStatus') || ''}
                    onSave={async (v) => {
                        form.setValue('maritalStatus', v || undefined);
                        await saveField({ maritalStatus: v || undefined });
                    }}
                    renderInput={(draft, setDraft) => (
                        <Select value={draft || '__none__'} onValueChange={(v) => setDraft(v === '__none__' ? '' : v)}>
                            <SelectTrigger className="h-9 text-sm border-0 bg-transparent shadow-none pl-0 focus:ring-0 focus:ring-offset-0">
                                <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Сонгоогүй</SelectItem>
                                <SelectItem value="Гэрлээгүй">Гэрлээгүй</SelectItem>
                                <SelectItem value="Гэрлэсэн">Гэрлэсэн</SelectItem>
                                <SelectItem value="Салсан">Салсан</SelectItem>
                                <SelectItem value="Бэлэвсэн">Бэлэвсэн</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </FieldGroup>

            <div className={cn('space-y-4', notApplicable && 'pointer-events-none opacity-40')}>
                {fields.map((fieldItem, index) => {
                    const memberValue = form.watch(`familyMembers.${index}`) ?? {};
                    return (
                        <FieldGroup key={fieldItem.id}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wide">
                                    Гэр бүлийн гишүүн #{index + 1}
                                </span>
                                <Button
                                    type="button" variant="ghost" size="sm"
                                    className="h-7 text-caption text-muted-foreground/60 hover:text-error gap-1"
                                    onClick={() => handleRemove(index)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Устгах
                                </Button>
                            </div>
                            <SettingGroup
                                value={memberValue}
                                onSave={async (draft) => {
                                    form.setValue(`familyMembers.${index}`, draft);
                                    await saveField({ familyMembers: form.getValues('familyMembers') });
                                }}
                            >
                                {(draft, setField) => {
                                    setFamilyFieldRefs.current[index] = setField as any;
                                    return (
                                    <>
                                        <GroupRow label="Хэн болох">
                                            <Select value={(draft as any).relationship || ''} onValueChange={(v) => {
                                                if (v === '__add_new__') { setCurrentFamilyFieldIndex(index); setIsAddFamilyRelOpen(true); }
                                                else setField('relationship' as any, v);
                                            }}>
                                                <SelectTrigger className="h-9 text-sm border-0 bg-transparent shadow-none pl-0 focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="Сонгох" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {references.familyRelationships?.map((opt: ReferenceItem) => (
                                                        <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                                                    ))}
                                                    <SelectItem value="__add_new__" className="text-primary font-medium">+ Шинээр нэмэх</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </GroupRow>
                                        <GroupRow label="Овог">
                                            <Input
                                                value={(draft as any).lastName || ''}
                                                onChange={(e) => setField('lastName' as any, e.target.value)}
                                                placeholder="Овог"
                                                className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                            />
                                        </GroupRow>
                                        <GroupRow label="Нэр">
                                            <Input
                                                value={(draft as any).firstName || ''}
                                                onChange={(e) => setField('firstName' as any, e.target.value)}
                                                placeholder="Нэр"
                                                className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                            />
                                        </GroupRow>
                                        <GroupRow label="Төрсөн огноо">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn('h-9 w-full max-w-[200px] pl-3 text-left text-sm font-normal', !(draft as any).birthDate && 'text-muted-foreground')}>
                                                        {(draft as any).birthDate ? format(new Date((draft as any).birthDate), 'yyyy-MM-dd') : <span>Огноо</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" captionLayout="dropdown" fromYear={1930} toYear={new Date().getFullYear()} selected={(draft as any).birthDate || undefined} onSelect={(d) => setField('birthDate' as any, d)} disabled={(d) => d > new Date()} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </GroupRow>
                                        <GroupRow label="Утас" className="border-0">
                                            <Input
                                                value={(draft as any).phone || ''}
                                                onChange={(e) => setField('phone' as any, e.target.value)}
                                                placeholder="Утас"
                                                className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                            />
                                        </GroupRow>
                                    </>
                                    );
                                }}
                            </SettingGroup>
                        </FieldGroup>
                    );
                })}
                <Button
                    type="button" variant="outline"
                    onClick={() => append({ relationship: '', lastName: '', firstName: '', birthDate: null, phone: '' })}
                    className="gap-2"
                >
                    <PlusCircle className="h-4 w-4" /> Гишүүн нэмэх
                </Button>
            </div>
        </>
    );
}

function WorkExperienceForm({ form, docRef, employeeDocRef }: {
    form: any; docRef: any; employeeDocRef: any;
}) {
    const { fields, append, remove } = useFieldArray({ control: form.control, name: 'experiences' });
    const { toast } = useToast();
    const notApplicable = form.watch('experienceNotApplicable');

    const saveField = React.useCallback(async (patch: Record<string, unknown>) => {
        if (!docRef || !employeeDocRef) return;
        const allValues = { ...form.getValues(), ...patch };
        const cleaned = sanitizeForFirestore(allValues);
        await setDoc(docRef, cleaned, { merge: true });
        const newCompletion = calculateCompletionPercentage(cleaned);
        await updateDoc(employeeDocRef, { questionnaireCompletion: newCompletion });
        toast({ title: 'Хадгалагдлаа' });
    }, [docRef, employeeDocRef, form, toast]);

    const handleRemove = async (index: number) => {
        const newList = (form.getValues('experiences') as any[]).filter((_: any, i: number) => i !== index);
        remove(index);
        await saveField({ experiences: newList });
    };

    return (
        <>
            <FieldGroup>
                <SettingRowToggle
                    label="Туршлага байхгүй"
                    description="Ажлын туршлагын мэдээлэл байхгүй"
                    checked={!!notApplicable}
                    onToggle={async (v) => {
                        form.setValue('experienceNotApplicable', v);
                        await saveField({ experienceNotApplicable: v });
                    }}
                />
            </FieldGroup>

            <div className={cn('space-y-4', notApplicable && 'pointer-events-none opacity-40')}>
                {fields.map((fieldItem, index) => {
                    const expValue = form.watch(`experiences.${index}`) ?? {};
                    return (
                        <FieldGroup key={fieldItem.id}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-caption font-semibold text-muted-foreground/60 uppercase tracking-wide">
                                    Туршлага #{index + 1}
                                </span>
                                <Button
                                    type="button" variant="ghost" size="sm"
                                    className="h-7 text-caption text-muted-foreground/60 hover:text-error gap-1"
                                    onClick={() => handleRemove(index)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" /> Устгах
                                </Button>
                            </div>
                            <SettingGroup
                                value={expValue}
                                onSave={async (draft) => {
                                    form.setValue(`experiences.${index}`, draft);
                                    await saveField({ experiences: form.getValues('experiences') });
                                }}
                            >
                                {(draft, setField) => (
                                    <>
                                        <GroupRow label="Компани">
                                            <Input
                                                value={(draft as any).company || ''}
                                                onChange={(e) => setField('company' as any, e.target.value)}
                                                placeholder="Компани"
                                                className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                            />
                                        </GroupRow>
                                        <GroupRow label="Албан тушаал">
                                            <Input
                                                value={(draft as any).position || ''}
                                                onChange={(e) => setField('position' as any, e.target.value)}
                                                placeholder="Албан тушаал"
                                                className="border-0 bg-transparent shadow-none px-0 h-8 text-sm focus-visible:ring-0 rounded-none border-b border-transparent focus-visible:border-border transition-colors"
                                            />
                                        </GroupRow>
                                        <GroupRow label="Эхэлсэн">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn('h-9 w-full max-w-[200px] pl-3 text-left text-sm font-normal', !(draft as any).startDate && 'text-muted-foreground')}>
                                                        {(draft as any).startDate ? format(new Date((draft as any).startDate), 'yyyy-MM-dd') : <span>Огноо</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" captionLayout="dropdown" fromYear={1980} toYear={new Date().getFullYear()} selected={(draft as any).startDate} onSelect={(d) => setField('startDate' as any, d)} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </GroupRow>
                                        <GroupRow label="Дууссан">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn('h-9 w-full max-w-[200px] pl-3 text-left text-sm font-normal', !(draft as any).endDate && 'text-muted-foreground')}>
                                                        {(draft as any).endDate ? format(new Date((draft as any).endDate), 'yyyy-MM-dd') : <span>Огноо</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" captionLayout="dropdown" fromYear={1980} toYear={new Date().getFullYear()} selected={(draft as any).endDate} onSelect={(d) => setField('endDate' as any, d)} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </GroupRow>
                                        <GroupRow label="Тодорхойлолт" className="border-0">
                                            <Textarea
                                                value={(draft as any).description || ''}
                                                onChange={(e) => setField('description' as any, e.target.value)}
                                                placeholder="Гүйцэтгэсэн үүрэг..."
                                                className="resize-none text-sm min-h-[80px] border-0 bg-transparent shadow-none px-0 focus-visible:ring-0"
                                                rows={3}
                                            />
                                        </GroupRow>
                                    </>
                                )}
                            </SettingGroup>
                        </FieldGroup>
                    );
                })}
                <Button
                    type="button" variant="outline"
                    onClick={() => append({ company: '', position: '', startDate: null, endDate: null, description: '' })}
                    className="gap-2"
                >
                    <PlusCircle className="h-4 w-4" /> Туршлага нэмэх
                </Button>
            </div>
        </>
    );
}

// ─── Main Tab Content Component ─────────────────────────────────────────────

interface QuestionnaireTabContentProps {
    employeeId: string;
    isCVDialogOpen?: boolean;
    onCVDialogChange?: (open: boolean) => void;
}

export function QuestionnaireTabContent({ employeeId, isCVDialogOpen: externalCVOpen, onCVDialogChange }: QuestionnaireTabContentProps) {
    const { firestore } = useFirebase();
    const { tCollection } = useTenantWrite();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = React.useState('general');
    const [internalCVOpen, setInternalCVOpen] = React.useState(false);
    const isCVDialogOpen = externalCVOpen ?? internalCVOpen;
    const setIsCVDialogOpen = onCVDialogChange ?? setInternalCVOpen;

    const employeeDocRef = useMemoFirebase(({ firestore, companyPath }) => (firestore && employeeId ? tenantDoc(firestore, companyPath, 'employees', employeeId) : null), [employeeId]);
    const questionnaireDocRef = useMemoFirebase(
      ({ firestore, companyPath }) =>
        firestore && employeeId ? tenantEmployeeSubdoc(firestore, companyPath, employeeId, 'questionnaire', 'data') : null,
      [employeeId]
    );

    const { data: employeeData, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef);
    const { data: questionnaireData, isLoading: isLoadingQuestionnaire } = useDoc<FullQuestionnaireValues>(questionnaireDocRef);

    // Company-specific reference data
    const { data: companyCountries } = useCollection<ReferenceItem>(useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireCountries') : null, []));
    const { data: companySchools } = useCollection<ReferenceItem>(useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireSchools') : null, []));
    const { data: companyDegrees } = useCollection<ReferenceItem>(useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireDegrees') : null, []));
    const { data: companyAcademicRanks } = useCollection<ReferenceItem>(useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireAcademicRanks') : null, []));
    const { data: companyLanguages } = useCollection<ReferenceItem>(useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireLanguages') : null, []));
    const { data: companyFamilyRelationships } = useCollection<ReferenceItem>(useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireFamilyRelationships') : null, []));
    const { data: companyEmergencyRelationships } = useCollection<ReferenceItem>(useMemoFirebase(({ firestore, companyPath }) => firestore ? tenantCollection(firestore, companyPath, 'questionnaireEmergencyRelationships') : null, []));

    // Global reference data (shared across all companies)
    const { data: globalCountries } = useGlobalReferenceData('questionnaireCountries');
    const { data: globalSchools } = useGlobalReferenceData('questionnaireSchools');
    const { data: globalDegrees } = useGlobalReferenceData('questionnaireDegrees');
    const { data: globalAcademicRanks } = useGlobalReferenceData('questionnaireAcademicRanks');
    const { data: globalLanguages } = useGlobalReferenceData('questionnaireLanguages');
    const { data: globalFamilyRelationships } = useGlobalReferenceData('questionnaireFamilyRelationships');
    const { data: globalEmergencyRelationships } = useGlobalReferenceData('questionnaireEmergencyRelationships');

    // Merge global + company data (global first, company additions after, deduplicated by name)
    const mergeRefData = React.useCallback((global: ReferenceItem[] | null, company: ReferenceItem[] | null): ReferenceItem[] => {
        const gItems = global || [];
        const cItems = company || [];
        const nameSet = new Set(gItems.map(i => (i.name || '').toLowerCase()));
        const unique = cItems.filter(i => !nameSet.has((i.name || '').toLowerCase()));
        return [...gItems, ...unique];
    }, []);

    const countries = React.useMemo(() => mergeRefData(globalCountries, companyCountries), [mergeRefData, globalCountries, companyCountries]);
    const schools = React.useMemo(() => mergeRefData(globalSchools, companySchools), [mergeRefData, globalSchools, companySchools]);
    const degrees = React.useMemo(() => mergeRefData(globalDegrees, companyDegrees), [mergeRefData, globalDegrees, companyDegrees]);
    const academicRanks = React.useMemo(() => mergeRefData(globalAcademicRanks, companyAcademicRanks), [mergeRefData, globalAcademicRanks, companyAcademicRanks]);
    const languages = React.useMemo(() => mergeRefData(globalLanguages, companyLanguages), [mergeRefData, globalLanguages, companyLanguages]);
    const familyRelationships = React.useMemo(() => mergeRefData(globalFamilyRelationships, companyFamilyRelationships), [mergeRefData, globalFamilyRelationships, companyFamilyRelationships]);
    const emergencyRelationships = React.useMemo(() => mergeRefData(globalEmergencyRelationships, companyEmergencyRelationships), [mergeRefData, globalEmergencyRelationships, companyEmergencyRelationships]);

    const defaultValues = React.useMemo(() => {
        const baseValues: Partial<FullQuestionnaireValues> = {
            lastName: '', firstName: '', registrationNumber: '', birthDate: null, gender: '', idCardNumber: '', insuranceTypeCode: '',
            hasDisability: false, disabilityPercentage: '', disabilityDate: null, hasDriversLicense: false, driverLicenseCategories: [],
            workPhone: '', personalPhone: '', workEmail: '', personalEmail: '', homeAddress: '', temporaryAddress: '', facebook: '', instagram: '',
            emergencyContacts: [], education: [], educationNotApplicable: false,
            languages: [], languagesNotApplicable: false, trainings: [], trainingsNotApplicable: false,
            familyMembers: [], familyMembersNotApplicable: false, maritalStatus: undefined, experiences: [], experienceNotApplicable: false
        };
        const employeeInfo = { ...employeeData, workEmail: employeeData?.email, personalPhone: employeeData?.phoneNumber };
        return transformDates({ ...baseValues, ...employeeInfo, ...(questionnaireData ?? {}) } as Record<string, unknown>) as Partial<FullQuestionnaireValues>;
    }, [employeeData, questionnaireData]);

    const references = { countries, schools, degrees, academicRanks, languages, familyRelationships, emergencyRelationships };
    const isLoading = isLoadingEmployee || isLoadingQuestionnaire;

    const handleCVDataExtracted = React.useCallback(async (cvData: any) => {
        if (!questionnaireDocRef || !employeeDocRef) return false;

        try {
            const transformedData: any = { ...cvData };

            if (cvData.birthDate) transformedData.birthDate = toDateSafe(cvData.birthDate);

            if (cvData.education?.length) {
                transformedData.education = cvData.education.map((edu: any) => ({
                    ...edu,
                    entryDate: toDateSafe(edu.entryDate),
                    gradDate: toDateSafe(edu.gradDate),
                    isCurrent: edu.isCurrent ?? false,
                }));
            }

            if (cvData.trainings?.length) {
                transformedData.trainings = cvData.trainings.map((t: any) => ({
                    ...t,
                    startDate: toDateSafe(t.startDate),
                    endDate: toDateSafe(t.endDate),
                }));
            }

            if (cvData.experiences?.length) {
                transformedData.experiences = cvData.experiences.map((exp: any) => ({
                    ...exp,
                    startDate: toDateSafe(exp.startDate),
                    endDate: toDateSafe(exp.endDate),
                    isCurrent: exp.isCurrent ?? false,
                }));
            }

            if (cvData.maritalStatus) {
                const validStatuses = ['Гэрлээгүй', 'Гэрлэсэн', 'Салсан', 'Бэлэвсэн'];
                if (!validStatuses.includes(cvData.maritalStatus)) {
                    delete transformedData.maritalStatus;
                }
            }

            const currentData = questionnaireData || {};
            const mergedData: any = { ...currentData };

            for (const [key, value] of Object.entries(transformedData)) {
                if (value === undefined || value === null || value === '') continue;
                if (Array.isArray(value) && value.length > 0) {
                    if (!mergedData[key] || (Array.isArray(mergedData[key]) && mergedData[key].length === 0)) {
                        mergedData[key] = value;
                    }
                } else if (!mergedData[key]) {
                    mergedData[key] = value;
                }
            }

            const cleanedData = sanitizeForFirestore(mergedData);

            try {
                const refCollections: { key: string; collectionName: string; currentItems: ReferenceItem[] }[] = [
                    { key: 'school', collectionName: 'questionnaireSchools', currentItems: schools || [] },
                    { key: 'degree', collectionName: 'questionnaireDegrees', currentItems: degrees || [] },
                    { key: 'country', collectionName: 'questionnaireCountries', currentItems: countries || [] },
                    { key: 'academicRank', collectionName: 'questionnaireAcademicRanks', currentItems: academicRanks || [] },
                ];

                const eduArray = cleanedData.education as Array<Record<string, any>> | undefined;
                if (eduArray?.length) {
                    for (const refDef of refCollections) {
                        const valuesToCheck = eduArray.map((edu: any) => edu[refDef.key]).filter((v: any) => typeof v === 'string' && v.trim());
                        const unique = [...new Set(valuesToCheck as string[])];
                        for (const val of unique) {
                            const match = fuzzyMatchReferenceItem(val, refDef.currentItems);
                            if (!match) {
                                const colRef = tCollection(refDef.collectionName);
                                if (colRef) {
                                    await addDoc(colRef, { name: val.trim() });
                                }
                            }
                        }
                    }
                }

                const langArray = cleanedData.languages as Array<Record<string, any>> | undefined;
                if (langArray?.length) {
                    const currentLangs = languages || [];
                    const langNames = langArray.map((l: any) => l.language).filter((v: any) => typeof v === 'string' && v.trim());
                    const uniqueLangs = [...new Set(langNames as string[])];
                    for (const val of uniqueLangs) {
                        const match = fuzzyMatchReferenceItem(val, currentLangs);
                        if (!match) {
                            const colRef = tCollection('questionnaireLanguages');
                            if (colRef) {
                                await addDoc(colRef, { name: val.trim() });
                            }
                        }
                    }
                }
            } catch (refError) {
                console.warn('Auto-create reference items error (non-blocking):', refError);
            }

            const regNo = cleanedData.registrationNumber as string | undefined;
            if (regNo && employeeId) {
                const normalized = normalizeRegistrationNumber(regNo);
                cleanedData.registrationNumber = normalized;
                try {
                    const duplicate = await checkRegistrationNumberDuplicate(normalized, employeeId);
                    if (duplicate.duplicate) {
                        toast({
                            variant: 'destructive',
                            title: 'Регистрийн дугаар давхардсан',
                            description: 'Энэ регистрийн дугаар өөр ажилтанд бүртгэгдсэн байна. CV-ийн мэдээллийг засаад дахин оролдоно уу.',
                        });
                        return false;
                    }
                } catch {
                }
            }

            await setDoc(questionnaireDocRef, cleanedData, { merge: true });

            const newCompletion = calculateCompletionPercentage(cleanedData);
            await updateDoc(employeeDocRef, { questionnaireCompletion: newCompletion });

            toast({
                title: 'Амжилттай!',
                description: 'CV-ийн мэдээлэл анкетэд амжилттай хадгалагдлаа.',
            });

            return true;
        } catch (error) {
            console.warn('Error saving CV data:', error);
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: error instanceof Error ? error.message : 'Мэдээлэл хадгалахад алдаа гарлаа. Дахин оролдоно уу.',
            });
            return false;
        }
    }, [questionnaireDocRef, employeeDocRef, questionnaireData, toast, employeeId, tCollection, schools, degrees, countries, academicRanks, languages]);

    const hireDateDisplay = React.useMemo(() => {
        const raw = employeeData?.hireDate;
        if (!raw) return null;
        try {
            const d = new Date(raw);
            if (isNaN(d.getTime())) return null;
            return format(d, 'yyyy-MM-dd');
        } catch {
            return null;
        }
    }, [employeeData?.hireDate]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Анх ажилд орсон огноо */}
            <div className="bg-card rounded-xl border px-4 py-3 flex items-center gap-3">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Анх ажилд орсон огноо:</span>
                <span className="text-sm font-medium">
                    {hireDateDisplay ?? <span className="text-muted-foreground font-normal">Тохируулаагүй</span>}
                </span>
            </div>

            {/* Tab Forms */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="bg-card rounded-xl border mb-6 p-1.5 overflow-x-auto no-scrollbar">
                    <VerticalTabMenu
                        orientation="horizontal"
                        className="flex-wrap gap-2"
                        triggerClassName="text-sm"
                        items={TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
                    />
                </div>

                <TabsContent value="general" className="mt-0">
                    <FormSection
                        docRef={questionnaireDocRef}
                        employeeDocRef={employeeDocRef}
                        defaultValues={defaultValues}
                        schema={generalInfoSchema}
                    >
                        {(form) => <GeneralInfoForm form={form} references={references} employeeId={employeeId ?? ''} docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="contact" className="mt-0">
                    <FormSection docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} defaultValues={defaultValues} schema={contactInfoSchema}>
                        {(form) => <ContactInfoForm form={form} references={references} docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="education" className="mt-0">
                    <FormSection docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} defaultValues={defaultValues as any} schema={educationHistorySchema}>
                        {(form) => <EducationForm form={form} references={references} docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="language" className="mt-0">
                    <FormSection docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} defaultValues={defaultValues as any} schema={languageSkillsSchema}>
                        {(form) => <LanguageForm form={form} references={references} docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="training" className="mt-0">
                    <FormSection docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} defaultValues={defaultValues as any} schema={professionalTrainingSchema}>
                        {(form) => <TrainingForm form={form} docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="family" className="mt-0">
                    <FormSection docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} defaultValues={defaultValues as any} schema={familyInfoSchema}>
                        {(form) => <FamilyInfoForm form={form} references={references} docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="experience" className="mt-0">
                    <FormSection docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} defaultValues={defaultValues as any} schema={workExperienceHistorySchema}>
                        {(form) => <WorkExperienceForm form={form} docRef={questionnaireDocRef} employeeDocRef={employeeDocRef} />}
                    </FormSection>
                </TabsContent>
                <TabsContent value="cv" className="mt-0">
                    {employeeData && <CVTabContent employee={employeeData as any} />}
                </TabsContent>
                <TabsContent value="documents" className="mt-0">
                    {employeeData && <DocumentsTabContent employee={employeeData as any} />}
                </TabsContent>
            </Tabs>

            <CVUploadDialog
                open={isCVDialogOpen}
                onOpenChange={setIsCVDialogOpen}
                onDataExtracted={handleCVDataExtracted}
                references={references}
            />
        </div>
    );
}
