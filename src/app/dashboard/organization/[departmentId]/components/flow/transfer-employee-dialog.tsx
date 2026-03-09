'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Search, Loader2, ChevronRight, FileText, Check, Wand2,
    ExternalLink, Calendar as CalendarIcon, Info, ArrowRightLeft,
    Building2, MapPin, Users
} from 'lucide-react';
import { Employee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, Timestamp, writeBatch, increment, getDoc, getDocs, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Position } from '../../../types';
import { ERTemplate } from '../../../../employment-relations/types';
import { generateDocumentContent } from '../../../../employment-relations/utils';
import { getNextDocumentNumber } from '../../../../employment-relations/services/document-numbering';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

const WIZARD_STEPS = {
    DOCUMENT_INPUTS: 1,
    POSITION_SELECT: 2,
};

interface TransferEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    position: Position | null;
}

export function TransferEmployeeDialog({
    open,
    onOpenChange,
    employee,
    position,
}: TransferEmployeeDialogProps) {
    const { firestore, user: firebaseUser } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [step, setStep] = React.useState(WIZARD_STEPS.DOCUMENT_INPUTS);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [customInputValues, setCustomInputValues] = React.useState<Record<string, any>>({});
    const [selectedTargetPositionId, setSelectedTargetPositionId] = React.useState<string | null>(null);
    const [positionSearch, setPositionSearch] = React.useState('');

    React.useEffect(() => {
        if (open) {
            setStep(WIZARD_STEPS.DOCUMENT_INPUTS);
            setCustomInputValues({});
            setSelectedTargetPositionId(null);
            setPositionSearch('');
        }
    }, [open]);

    const actionConfigRef = React.useMemo(() =>
        firestore ? doc(firestore, 'organization_actions', 'transfer') : null
    , [firestore]);
    const { data: actionConfig } = useDoc<any>(actionConfigRef);

    const templateRef = React.useMemo(() =>
        firestore && actionConfig?.templateId ? doc(firestore, 'er_templates', actionConfig.templateId) : null
    , [firestore, actionConfig?.templateId]);
    const { data: templateData, isLoading: templateLoading } = useDoc<ERTemplate>(templateRef as any);

    // All positions for target selection
    const allPositionsQuery = React.useMemo(() =>
        firestore ? collection(firestore, 'positions') : null
    , [firestore]);
    const { data: allPositions } = useCollection<Position>(allPositionsQuery);

    // All departments for display
    const allDepartmentsQuery = React.useMemo(() =>
        firestore ? collection(firestore, 'departments') : null
    , [firestore]);
    const { data: allDepartments } = useCollection<any>(allDepartmentsQuery);

    const departmentMap = React.useMemo(() => {
        const map = new Map<string, string>();
        allDepartments?.forEach(d => map.set(d.id, d.name));
        return map;
    }, [allDepartments]);

    // Vacant positions: approved, filled === 0, excluding current position
    const vacantPositions = React.useMemo(() => {
        if (!allPositions) return [];
        return allPositions.filter(p =>
            p.id !== position?.id &&
            p.isApproved &&
            (p.filled || 0) < 1
        );
    }, [allPositions, position?.id]);

    const filteredVacantPositions = React.useMemo(() => {
        if (!positionSearch.trim()) return vacantPositions;
        const q = positionSearch.toLowerCase();
        return vacantPositions.filter(p =>
            p.title?.toLowerCase().includes(q) ||
            departmentMap.get(p.departmentId)?.toLowerCase().includes(q)
        );
    }, [vacantPositions, positionSearch, departmentMap]);

    const selectedTargetPosition = React.useMemo(() =>
        allPositions?.find(p => p.id === selectedTargetPositionId) || null
    , [allPositions, selectedTargetPositionId]);

    const normalizedCustomInputs = React.useMemo(() => {
        const inputs = templateData?.customInputs || [];
        const counts = new Map<string, number>();
        return inputs.map((input: any, index: number) => {
            const baseKey = String(input?.key || '').trim();
            const prev = counts.get(baseKey) ?? 0;
            counts.set(baseKey, prev + 1);
            const normalizedKey = baseKey
                ? (prev === 0 ? baseKey : `${baseKey}__${prev + 1}`)
                : `__input_${index}`;
            return {
                ...input,
                __baseKey: baseKey,
                __normalizedKey: normalizedKey,
                __index: index,
            };
        });
    }, [templateData]);

    React.useEffect(() => {
        if (normalizedCustomInputs.length > 0) {
            const initialValues: Record<string, any> = {};
            normalizedCustomInputs.forEach((input: any) => {
                initialValues[input.__normalizedKey] = '';
            });
            setCustomInputValues(initialValues);
            return;
        }
        setCustomInputValues({});
    }, [normalizedCustomInputs]);

    const canProceedCustomInputs = React.useMemo(() => {
        if (!templateData) return true;
        return !normalizedCustomInputs.some((i: any) => i.required && !customInputValues[i.__normalizedKey]);
    }, [normalizedCustomInputs, customInputValues, templateData]);

    const isActionConfigured = !!actionConfig?.templateId;

    const handleTransfer = async () => {
        if (!firestore || !employee || !position || !firebaseUser || !selectedTargetPositionId) return;

        const targetPos = allPositions?.find(p => p.id === selectedTargetPositionId);
        if (!targetPos) return;

        setIsSubmitting(true);
        try {
            const customInputsPayload: Record<string, any> = {};
            normalizedCustomInputs.forEach((input: any) => {
                const normalizedKey = input.__normalizedKey as string;
                const baseKey = input.__baseKey as string;
                const val = customInputValues?.[normalizedKey] ?? '';
                customInputsPayload[normalizedKey] = val;
                if (baseKey && customInputsPayload[baseKey] === undefined) {
                    customInputsPayload[baseKey] = val;
                }
            });

            const batch = writeBatch(firestore);
            const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();

            // 1. Decrement old position filled + actionHistory
            const oldPosRef = doc(firestore, 'positions', position.id);
            batch.update(oldPosRef, {
                filled: increment(-1),
                actionHistory: arrayUnion({
                    action: 'transfer_out' as const,
                    employeeId: employee.id,
                    employeeName,
                    date: new Date().toISOString(),
                    note: `${employeeName} → ${targetPos.title} руу шилжсэн`,
                    userId: firebaseUser?.uid || '',
                    userName: firebaseUser?.displayName || '',
                }),
                updatedAt: Timestamp.now()
            });

            // 2. Increment new position filled + actionHistory
            const newPosRef = doc(firestore, 'positions', selectedTargetPositionId);
            batch.update(newPosRef, {
                filled: increment(1),
                actionHistory: arrayUnion({
                    action: 'transfer_in' as const,
                    employeeId: employee.id,
                    employeeName,
                    date: new Date().toISOString(),
                    note: `${employeeName} ← ${position.title}-с шилжиж ирсэн`,
                    userId: firebaseUser?.uid || '',
                    userName: firebaseUser?.displayName || '',
                }),
                updatedAt: Timestamp.now()
            });

            // 3. Update employee: move to new position + employmentHistory array
            const transferHistoryEntry = {
                type: 'transfer',
                date: new Date().toISOString(),
                fromPosition: position?.title || null,
                fromPositionId: position?.id || null,
                fromDepartmentId: position?.departmentId || null,
                toPosition: targetPos.title || null,
                toPositionId: selectedTargetPositionId,
                toDepartmentId: targetPos.departmentId || null,
                note: `${position.title} → ${targetPos.title} шилжүүлэн томилогдсон`
            };
            const empRef = doc(firestore, 'employees', employee.id);
            batch.update(empRef, {
                positionId: selectedTargetPositionId,
                jobTitle: targetPos.title || null,
                departmentId: targetPos.departmentId || null,
                status: 'active',
                employmentHistory: arrayUnion(transferHistoryEntry),
                updatedAt: Timestamp.now()
            });

            // 3b. Employee employment history subcollection
            try {
                const historyRef = doc(collection(firestore, `employees/${employee.id}/employmentHistory`));
                batch.set(historyRef, {
                    eventType: 'Шилжүүлэн томилсон',
                    eventDate: new Date().toISOString(),
                    notes: `${position.title} → ${targetPos.title} шилжүүлэн томилогдсон`,
                    createdAt: new Date().toISOString(),
                });
            } catch (e) {
                console.error("Employment history write failed:", e);
            }

            // 3c. Delete old position preparation projects so it can be re-prepared
            try {
                const prepQuery = query(
                    collection(firestore, 'projects'),
                    where('type', '==', 'position_preparation'),
                    where('positionPreparationPositionId', '==', position.id)
                );
                const prepSnap = await getDocs(prepQuery);
                for (const prepDoc of prepSnap.docs) {
                    batch.delete(prepDoc.ref);
                }
            } catch (e) {
                console.error("Prep project cleanup failed:", e);
            }

            // 4. Create ER Document if template is configured
            if (templateData) {
                try {
                    let documentNumber: string | undefined;
                    if (templateData.documentTypeId) {
                        try {
                            documentNumber = await getNextDocumentNumber(firestore, templateData.documentTypeId);
                        } catch (numErr) {
                            console.warn("Document number generation failed:", numErr);
                        }
                    }

                    const docContent = generateDocumentContent(templateData.content || '', {
                        employee,
                        position,
                        customInputs: customInputsPayload,
                        company: null,
                        system: {
                            date: format(new Date(), 'yyyy-MM-dd'),
                            year: format(new Date(), 'yyyy'),
                            month: format(new Date(), 'MM'),
                            day: format(new Date(), 'dd'),
                            user: firebaseUser?.displayName || 'Системийн хэрэглэгч',
                            ...(documentNumber ? { documentNumber } : {})
                        },
                    });

                    const erDocRef = doc(collection(firestore, 'er_documents'));
                    batch.set(erDocRef, {
                        ...(documentNumber ? { documentNumber } : {}),
                        documentTypeId: templateData.documentTypeId || null,
                        templateId: templateData.id || null,
                        employeeId: employee.id,
                        positionId: position?.id || null,
                        targetPositionId: selectedTargetPositionId,
                        departmentId: position?.departmentId || null,
                        targetDepartmentId: targetPos.departmentId || null,
                        creatorId: firebaseUser.uid,
                        status: 'DRAFT',
                        content: docContent,
                        version: 1,
                        metadata: {
                            employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
                            positionTitle: position?.title || '',
                            targetPositionTitle: targetPos.title || '',
                            templateName: templateData.name || '',
                            actionId: 'transfer',
                            ...(documentNumber ? { documentNumber } : {})
                        },
                        customInputs: customInputsPayload,
                        history: [{
                            action: 'CREATE',
                            actorId: firebaseUser.uid,
                            timestamp: Timestamp.now(),
                            note: documentNumber
                                ? `Баримт ${documentNumber} үүсгэв (Шилжүүлэн томилох)`
                                : 'Шилжүүлэн томилох үед системээс автоматаар үүсгэв.'
                        }],
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    });
                } catch (docError) {
                    console.error("ER Document creation error:", docError);
                }
            }

            await batch.commit();

            toast({
                title: 'Шилжүүлэн томилогдлоо',
                description: `${employee.firstName} ${employee.lastName} → ${targetPos.title} ажлын байранд шилжүүлэн томилогдлоо.`,
            });
            onOpenChange(false);
            router.push(`/dashboard/organization/positions/${selectedTargetPositionId}`);
        } catch (e: any) {
            console.error("Transfer error:", e);
            toast({ variant: 'destructive', title: 'Алдаа гарлаа', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
                <div className="flex flex-col h-[85vh] max-h-[750px]">
                    <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-slate-50/50 to-white shrink-0">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <ArrowRightLeft className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Шилжүүлэн томилох</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-muted-foreground mt-1">
                                    <span className="font-bold text-slate-700">{employee?.firstName} {employee?.lastName}</span> ажилтныг өөр ажлын байранд шилжүүлэн томилох.
                                </DialogDescription>
                            </div>
                        </div>
                        {/* Step indicator */}
                        <div className="flex items-center gap-2 mt-4">
                            {[
                                { step: WIZARD_STEPS.DOCUMENT_INPUTS, label: 'Тушаал' },
                                { step: WIZARD_STEPS.POSITION_SELECT, label: 'Ажлын байр сонгох' },
                            ].map((s, i) => (
                                <React.Fragment key={s.step}>
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                                        step >= s.step
                                            ? "bg-indigo-100 text-indigo-700"
                                            : "bg-slate-100 text-slate-400"
                                    )}>
                                        <span className={cn(
                                            "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black",
                                            step >= s.step ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                                        )}>
                                            {step > s.step ? <Check className="h-3 w-3" /> : i + 1}
                                        </span>
                                        {s.label}
                                    </div>
                                    {i < 1 && <ChevronRight className="h-4 w-4 text-slate-300" />}
                                </React.Fragment>
                            ))}
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden relative border-t">
                        <ScrollArea className="h-full">
                            <div className="p-8 space-y-6">
                                {/* Employee info card */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                    <Avatar className="h-14 w-14 border-4 border-white shadow-sm">
                                        <AvatarImage src={(employee as any)?.photoURL} />
                                        <AvatarFallback className="bg-indigo-50 text-indigo-600 text-xl font-bold">
                                            {employee?.firstName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="text-lg font-bold text-slate-900">{employee?.firstName} {employee?.lastName}</div>
                                        <div className="text-xs text-muted-foreground font-medium mt-0.5">
                                            {position?.title} • {departmentMap.get(position?.departmentId || '')}
                                        </div>
                                    </div>
                                    <ArrowRightLeft className="h-5 w-5 text-indigo-400" />
                                </div>

                                {step === WIZARD_STEPS.DOCUMENT_INPUTS && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {!isActionConfigured ? (
                                            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm space-y-4">
                                                <div className="flex items-start gap-3">
                                                    <Info className="h-5 w-5 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-bold mb-1">Баримтын загвар тохируулаагүй</p>
                                                        <p className="opacity-80 leading-relaxed font-medium">
                                                            "Шилжүүлэн томилох" үйлдлийн загвар тохируулаагүй байна. Тохиргоо хэсгээс тохируулна уу.
                                                            Загвар тохируулаагүй ч шилжүүлэн томилох үйлдлийг үргэлжлүүлж болно.
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 h-9 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
                                                    onClick={() => window.open('/dashboard/organization/settings', '_blank')}
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Тохиргоо руу очих
                                                </Button>
                                            </div>
                                        ) : templateLoading ? (
                                            <div className="flex justify-center py-10">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : templateData ? (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-2 py-2 border-y border-dashed border-slate-200">
                                                    <FileText className="w-5 h-5 text-indigo-500" />
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Ашиглах загвар</div>
                                                        <div className="text-sm font-bold text-slate-700">{templateData.name}</div>
                                                    </div>
                                                </div>

                                                {normalizedCustomInputs.length > 0 && (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 text-indigo-600">
                                                            <Wand2 className="h-4 w-4" />
                                                            <label className="text-xs font-bold uppercase tracking-widest">Шаардлагатай мэдээллүүд</label>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-4">
                                                            {normalizedCustomInputs.map((input: any) => (
                                                                <div key={input.__normalizedKey} className="space-y-1.5">
                                                                    <Label className="text-xs font-bold text-slate-600 ml-1">
                                                                        {input.label} {input.required && <span className="text-rose-500">*</span>}
                                                                    </Label>
                                                                    {input.type === 'date' ? (
                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    className={cn(
                                                                                        "h-11 w-full justify-start text-left font-medium rounded-xl border-slate-200",
                                                                                        !customInputValues[input.__normalizedKey] && "text-muted-foreground"
                                                                                    )}
                                                                                >
                                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                    {customInputValues[input.__normalizedKey]
                                                                                        ? format(new Date(customInputValues[input.__normalizedKey]), "yyyy.MM.dd")
                                                                                        : <span>Огноо сонгох</span>
                                                                                    }
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-auto p-0" align="start">
                                                                                <Calendar
                                                                                    mode="single"
                                                                                    selected={customInputValues[input.__normalizedKey] ? new Date(customInputValues[input.__normalizedKey]) : undefined}
                                                                                    onSelect={(date) => setCustomInputValues(prev => ({ ...prev, [input.__normalizedKey]: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                                                                    initialFocus
                                                                                />
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    ) : (
                                                                        <Input
                                                                            value={customInputValues[input.__normalizedKey] || ''}
                                                                            onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.__normalizedKey]: e.target.value }))}
                                                                            placeholder={input.description || `${input.label} оруулна уу...`}
                                                                            className="h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/10 transition-all font-medium"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
                                                <div className="flex items-start gap-3">
                                                    <Info className="h-5 w-5 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="font-bold mb-1">Загвар олдсонгүй</p>
                                                        <p className="opacity-80">Тохиргоонд холбогдсон загвар устсан эсвэл идэвхгүй болсон байна.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {step === WIZARD_STEPS.POSITION_SELECT && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="text-center space-y-2">
                                            <h3 className="text-lg font-bold text-slate-900">Шилжих ажлын байр сонгох</h3>
                                            <p className="text-sm text-muted-foreground">Хүн томилоогүй, сул байгаа ажлын байруудаас сонгоно уу.</p>
                                        </div>

                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                value={positionSearch}
                                                onChange={(e) => setPositionSearch(e.target.value)}
                                                placeholder="Ажлын байр хайх..."
                                                className="pl-10 h-11 bg-white border-slate-200 rounded-xl"
                                            />
                                        </div>

                                        {filteredVacantPositions.length === 0 ? (
                                            <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-100">
                                                <MapPin className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                                                <p className="font-bold text-slate-700">Сул ажлын байр олдсонгүй</p>
                                                <p className="text-xs text-muted-foreground mt-1">Батлагдсан, хүн томилоогүй ажлын байр байхгүй байна.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                                                {filteredVacantPositions.map((pos) => {
                                                    const isSelected = selectedTargetPositionId === pos.id;
                                                    return (
                                                        <button
                                                            key={pos.id}
                                                            onClick={() => setSelectedTargetPositionId(pos.id)}
                                                            className={cn(
                                                                "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group",
                                                                isSelected
                                                                    ? "border-indigo-400 bg-indigo-50/50 shadow-md shadow-indigo-100"
                                                                    : "border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                                                isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                                                            )}>
                                                                {isSelected ? <Check className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-slate-900 truncate">{pos.title}</div>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <Building2 className="h-3 w-3 text-muted-foreground" />
                                                                    <span className="text-xs text-muted-foreground truncate">
                                                                        {departmentMap.get(pos.departmentId) || 'Тодорхойгүй'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0">
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                                                                    <Users className="h-3 w-3" /> Сул
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {selectedTargetPosition && (
                                            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
                                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Шилжих ажлын байр</div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                                        <MapPin className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-indigo-900">{selectedTargetPosition.title}</div>
                                                        <div className="text-xs text-indigo-600">
                                                            {departmentMap.get(selectedTargetPosition.departmentId) || ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {isSubmitting && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-900">Боловсруулж байна</p>
                                    <p className="text-xs text-muted-foreground">Түр хүлээнэ үү...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-slate-50/50 shrink-0">
                        <div className="flex w-full gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (step === WIZARD_STEPS.DOCUMENT_INPUTS) {
                                        onOpenChange(false);
                                    } else {
                                        setStep(step - 1);
                                    }
                                }}
                                className="flex-1 rounded-xl h-11 font-bold uppercase tracking-wider text-[10px]"
                                disabled={isSubmitting}
                            >
                                {step === WIZARD_STEPS.DOCUMENT_INPUTS ? 'Болих' : 'Буцах'}
                            </Button>
                            <Button
                                onClick={() => {
                                    if (step === WIZARD_STEPS.DOCUMENT_INPUTS) {
                                        if (!canProceedCustomInputs) return;
                                        setStep(WIZARD_STEPS.POSITION_SELECT);
                                    } else if (step === WIZARD_STEPS.POSITION_SELECT) {
                                        if (!selectedTargetPositionId) return;
                                        handleTransfer();
                                    }
                                }}
                                disabled={
                                    isSubmitting ||
                                    (step === WIZARD_STEPS.DOCUMENT_INPUTS && !canProceedCustomInputs) ||
                                    (step === WIZARD_STEPS.POSITION_SELECT && !selectedTargetPositionId)
                                }
                                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-indigo-200"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {step === WIZARD_STEPS.DOCUMENT_INPUTS
                                    ? 'Дараах: Ажлын байр сонгох'
                                    : (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Шилжүүлэн томилох
                                        </>
                                    )
                                }
                            </Button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
