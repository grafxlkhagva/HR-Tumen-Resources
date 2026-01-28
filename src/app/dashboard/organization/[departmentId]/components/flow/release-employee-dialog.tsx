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
import { Search, UserPlus, Loader2, GitBranch, ChevronRight, FileText, Check, X, Wand2, ExternalLink, Calendar as CalendarIcon, Clock, UserX, AlertTriangle, UserMinus, XCircle, Info } from 'lucide-react';
import { Employee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, getDoc, getDocs, Timestamp, addDoc, writeBatch, increment, setDoc, arrayUnion } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Position } from '../../../types';
import { ERTemplate, ERDocument } from '../../../../employment-relations/types';
import { generateDocumentContent } from '../../../../employment-relations/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { mn } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';

interface ReleaseEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    position: Position | null;
}

export function ReleaseEmployeeDialog({
    open,
    onOpenChange,
    employee,
    position,
}: ReleaseEmployeeDialogProps) {
    const { firestore, user: firebaseUser } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [step, setStep] = React.useState(1);
    const [selectedActionId, setSelectedActionId] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [customInputValues, setCustomInputValues] = React.useState<Record<string, any>>({});

    // Reset state on open
    React.useEffect(() => {
        if (open) {
            setStep(1);
            setSelectedActionId(null);
            setCustomInputValues({});
        }
    }, [open]);

    // Fetch System Action Config based on selection
    const actionConfigRef = React.useMemo(() =>
        firestore && selectedActionId ? doc(firestore, 'organization_actions', selectedActionId) : null
        , [firestore, selectedActionId]);
    const { data: actionConfig } = useDoc<any>(actionConfigRef);

    // Fetch Template if configured
    const templateRef = React.useMemo(() =>
        firestore && actionConfig?.templateId ? doc(firestore, 'er_templates', actionConfig.templateId) : null
        , [firestore, actionConfig?.templateId]);
    const { data: templateData, isLoading: templateLoading } = useDoc<ERTemplate>(templateRef as any);

    // Normalize customInputs to guarantee unique keys in UI/state, even if template contains duplicates.
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

    // Initialize custom inputs when template takes effect
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

    const handleRelease = async () => {
        if (!firestore || !employee || !position || !firebaseUser) return;

        setIsSubmitting(true);
        try {
            // Build customInputs payload with unique keys (and keep the first occurrence of base keys for compatibility)
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

            if (!employee?.id || !position?.id) {
                throw new Error('Ажилтан эсвэл ажлын байрны мэдээлэл дутуу байна');
            }

            const batch = writeBatch(firestore);

            // 1. Update Employee: Clear position data and set lifecycleStage to offboarding
            const departureHistoryEntry = {
                type: 'departure',
                date: new Date().toISOString(),
                position: position?.title || null,
                positionId: position?.id || null,
                departmentId: position?.departmentId || null,
                reason: selectedActionId || null,
                lastWorkingDate: customInputsPayload['releaseDate'] || customInputsPayload['Ажлаас чөлөөлөх огноо'] || null,
                note: `${new Date().getFullYear()} онд ажлаас гарсан`
            };

            const empRef = doc(firestore, 'employees', employee.id);
            batch.update(empRef, {
                positionId: null,
                jobTitle: null,
                departmentId: null,
                lifecycleStage: 'offboarding', // Set to offboarding stage
                employmentHistory: arrayUnion(departureHistoryEntry),
                updatedAt: Timestamp.now()
            });

            // 2. Decrement Position Filled Count
            const posRef = doc(firestore, 'positions', position.id);
            batch.update(posRef, {
                filled: increment(-1),
                updatedAt: Timestamp.now()
            });

            // 3. Create ER Document if template is configured (optional)
            if (templateData) {
                try {
                    const docContent = generateDocumentContent(templateData.content || '', {
                        employee,
                        position,
                        customInputs: customInputsPayload,
                        company: null,
                        system: null,
                    });

                    const erDocRef = doc(collection(firestore, 'er_documents'));
                    batch.set(erDocRef, {
                        documentTypeId: templateData.documentTypeId || null,
                        templateId: templateData.id || null,
                        employeeId: employee.id,
                        positionId: position?.id || null,
                        departmentId: position?.departmentId || null,
                        creatorId: firebaseUser.uid,
                        status: 'DRAFT',
                        content: docContent,
                        version: 1,
                        metadata: {
                            employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
                            positionTitle: position?.title || '',
                            templateName: templateData.name || '',
                            actionId: selectedActionId
                        },
                        customInputs: customInputsPayload,
                        history: [{
                            action: 'CREATE',
                            actorId: firebaseUser.uid,
                            timestamp: Timestamp.now(),
                            note: 'Ажилтан чөлөөлөх үед системээс автоматаар үүсгэв.'
                        }],
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    });
                } catch (docError) {
                    console.error("ER Document creation error:", docError);
                    // Continue without creating ER document
                }
            }

            await batch.commit();

            // 4. Close/Freeze Onboarding Process if exists (employee is leaving, no point continuing onboarding)
            try {
                const onboardingSnap = await getDoc(doc(firestore, 'onboarding_processes', employee.id));
                if (onboardingSnap.exists()) {
                    const onboardingData = onboardingSnap.data();
                    // Mark onboarding as CLOSED (frozen at current progress)
                    await setDoc(doc(firestore, 'onboarding_processes', employee.id), {
                        ...onboardingData,
                        status: 'CLOSED',
                        closedAt: new Date().toISOString(),
                        closedReason: 'offboarding_started',
                        updatedAt: new Date().toISOString()
                    });
                }
            } catch (onboardingCloseError) {
                console.error("Onboarding close error:", onboardingCloseError);
            }

            // 5. Create Offboarding Process (outside batch to get config first)
            try {
                const configSnap = await getDoc(doc(firestore, 'settings', 'offboarding'));
                const config = configSnap.exists() ? configSnap.data() : { stages: [] };

                // Get position-specific offboarding task IDs (if configured)
                // Use optional chaining and nullish coalescing for safety
                const positionOffboardingTaskIds: string[] = (position as any)?.offboardingProgramIds ?? [];

                const newStages = (config.stages || []).map((s: any) => ({
                    id: s.id,
                    title: s.title,
                    icon: s.icon,
                    completed: false,
                    progress: 0,
                    tasks: (s.tasks || [])
                        // If position has specific tasks configured, filter by them; otherwise include all
                        .filter((t: any) => positionOffboardingTaskIds.length === 0 || positionOffboardingTaskIds.includes(t.id))
                        .map((t: any) => ({
                            id: t.id,
                            title: t.title,
                            description: t.description,
                            completed: false,
                            policyId: t.policyId
                        }))
                })).filter((s: any) => s.tasks.length > 0);

                if (newStages.length > 0) {
                    const offboardingProcess = {
                        id: employee.id,
                        employeeId: employee.id,
                        positionId: position?.id || null,
                        positionTitle: position?.title || null,
                        stages: newStages,
                        progress: 0,
                        status: 'IN_PROGRESS',
                        reason: selectedActionId,
                        lastWorkingDate: customInputValues['releaseDate'] || customInputValues['Ажлаас чөлөөлөх огноо'] || null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    await setDoc(doc(firestore, 'offboarding_processes', employee.id), offboardingProcess);
                }
            } catch (offboardingError) {
                console.error("Offboarding process creation error:", offboardingError);
                // Don't fail the whole operation if offboarding process creation fails
            }

            toast({
                title: "Ажилтан чөлөөлөгдлөө",
                description: templateData 
                    ? "Offboarding хөтөлбөр үүсгэгдлээ. Холбогдох баримтын ноорог үүсгэгдсэн."
                    : "Offboarding хөтөлбөр үүсгэгдлээ."
            });
            onOpenChange(false);
        } catch (e: any) {
            console.error("Release error:", e);
            toast({ variant: 'destructive', title: 'Алдаа гарлаа', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const RELEASE_TYPES = [
        { id: 'release_company', name: 'Компанийн санаачилгаар бүрэн чөлөөлөх', icon: AlertTriangle, color: 'bg-rose-50 text-rose-600 border-rose-100' },
        { id: 'release_employee', name: 'Ажилтны санаачилгаар бүрэн чөлөөлөх', icon: UserX, color: 'bg-amber-50 text-amber-600 border-amber-100' },
        { id: 'release_temporary', name: 'Түр чөлөөлөх', icon: Clock, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
                <div className="flex flex-col h-[85vh] max-h-[700px]">
                    <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-slate-50/50 to-white shrink-0">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                                <UserMinus className="h-6 w-6 text-rose-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Ажилтан чөлөөлөх</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-muted-foreground mt-1">
                                    <span className="font-bold text-slate-700">{employee?.firstName} {employee?.lastName}</span> ажилтныг ажлаас чөлөөлөх үйлдэл.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden relative border-t">
                        {step === 1 ? (
                            <ScrollArea className="h-full">
                                <div className="p-8 space-y-6">
                                    <div className="text-center space-y-2 mb-8">
                                        <h3 className="text-lg font-bold text-slate-900">Чөлөөлөх төрөл сонгох</h3>
                                        <p className="text-sm text-muted-foreground">Тохирох чөлөөлөлтийн төрлийг сонгоно уу.</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {RELEASE_TYPES.map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => {
                                                    setSelectedActionId(type.id);
                                                    setStep(2);
                                                }}
                                                className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-rose-600 hover:shadow-xl hover:shadow-rose-50 transition-all text-left group"
                                            >
                                                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", type.color)}>
                                                    <type.icon className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-900">{type.name}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">Чөлөөлөх баримт үүсгэгдэх болно</div>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </ScrollArea>
                        ) : (
                            <ScrollArea className="h-full">
                                <div className="p-8 space-y-6">
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                        <Avatar className="h-14 w-14 border-4 border-white shadow-sm">
                                            <AvatarImage src={employee?.photoURL} />
                                            <AvatarFallback className="bg-rose-50 text-rose-600 text-xl font-bold">
                                                {employee?.firstName?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="text-lg font-bold text-slate-900">{employee?.firstName} {employee?.lastName}</div>
                                            <div className="text-xs text-muted-foreground font-medium mt-0.5">
                                                {position?.title}
                                            </div>
                                        </div>
                                    </div>

                                    {templateLoading ? (
                                        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                    ) : templateData ? (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="flex items-center gap-2 py-2 border-y border-dashed border-slate-200">
                                                <FileText className="w-5 h-5 text-rose-500" />
                                                <div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Ашиглах загвар</div>
                                                    <div className="text-sm font-bold text-slate-700">{templateData.name}</div>
                                                </div>
                                            </div>

                                            {normalizedCustomInputs.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 text-rose-600">
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
                                                                                variant={"outline"}
                                                                                className={cn(
                                                                                    "h-11 w-full justify-start text-left font-medium rounded-xl border-slate-200",
                                                                                    !customInputValues[input.__normalizedKey] && "text-muted-foreground"
                                                                                )}
                                                                            >
                                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                {customInputValues[input.__normalizedKey] ? format(new Date(customInputValues[input.__normalizedKey]), "PPP", { locale: mn }) : <span>Огноо сонгох</span>}
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
                                                                ) : input.type === 'number' ? (
                                                                    <Input
                                                                        type="number"
                                                                        value={customInputValues[input.__normalizedKey] || ''}
                                                                        onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.__normalizedKey]: e.target.value }))}
                                                                        placeholder={input.description || `${input.label} оруулна уу...`}
                                                                        className="h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/10 transition-all font-medium"
                                                                    />
                                                                ) : input.type === 'boolean' ? (
                                                                    <div className="flex items-center space-x-2 h-11 px-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                                                        <Switch
                                                                            checked={!!customInputValues[input.__normalizedKey]}
                                                                            onCheckedChange={(checked) => setCustomInputValues(prev => ({ ...prev, [input.__normalizedKey]: checked }))}
                                                                        />
                                                                        <span className="text-sm text-slate-500">{customInputValues[input.__normalizedKey] ? 'Тийм' : 'Үгүй'}</span>
                                                                    </div>
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
                                        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm space-y-4">
                                            <div className="flex items-start gap-3">
                                                <Info className="h-5 w-5 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="font-bold mb-1">Баримтын загвар тохируулаагүй</p>
                                                    <p className="opacity-80 leading-relaxed font-medium">Чөлөөлөх үйлдлийг үргэлжлүүлж болно. Гэхдээ баримт автоматаар үүсгэхгүй.</p>
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
                                    )}
                                </div>
                            </ScrollArea>
                        )}

                        {isSubmitting && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                                <Loader2 className="h-12 w-12 text-rose-600 animate-spin" />
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-900">Боловсруулж байна</p>
                                    <p className="text-xs text-muted-foreground">Түр хүлээнэ үү...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-slate-50/50 shrink-0">
                        {step === 1 ? (
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="rounded-xl px-6 h-11 font-bold uppercase tracking-wider text-[10px]"
                            >
                                Болих
                            </Button>
                        ) : (
                            <div className="flex w-full gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(1)}
                                    className="flex-1 rounded-xl h-11 font-bold uppercase tracking-wider text-[10px]"
                                    disabled={isSubmitting}
                                >
                                    Буцах
                                </Button>
                                <Button
                                    onClick={handleRelease}
                                    disabled={isSubmitting || normalizedCustomInputs.some((i: any) => i.required && !customInputValues[i.__normalizedKey])}
                                    className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-11 font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-rose-200"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    Чөлөөлөх үйлдэл баталгаажуулах
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
