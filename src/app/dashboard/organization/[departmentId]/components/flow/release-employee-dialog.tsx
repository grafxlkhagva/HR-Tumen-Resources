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
import { Search, UserPlus, Loader2, GitBranch, ChevronRight, FileText, Check, X, Wand2, ExternalLink, Calendar as CalendarIcon, Clock, UserX, AlertTriangle, UserMinus, XCircle } from 'lucide-react';
import { Employee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, getDoc, getDocs, Timestamp, addDoc, writeBatch, increment } from 'firebase/firestore';
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

    // Initialize custom inputs when template takes effect
    React.useEffect(() => {
        if (templateData?.customInputs) {
            const initialValues: Record<string, any> = {};
            templateData.customInputs.forEach(input => {
                initialValues[input.key] = '';
            });
            setCustomInputValues(initialValues);
        }
    }, [templateData]);

    const handleRelease = async () => {
        if (!firestore || !employee || !position || !firebaseUser) return;

        // Block if no template is configured
        if (!templateData) {
            toast({
                variant: 'destructive',
                title: 'Загвар тохируулаагүй',
                description: 'Үргэлжлүүлэхийн тулд эхлээд баримтын загвар тохируулна уу.'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Update Employee: Clear position data and set status
            // Note: For temporary release, maybe status is different, but user asked for "чөлөөлөх"
            const empRef = doc(firestore, 'employees', employee.id);
            batch.update(empRef, {
                positionId: null,
                jobTitle: null,
                departmentId: null,
                status: 'Идэвхтэй', // Re-available for hire
                updatedAt: Timestamp.now()
            });

            // 2. Decrement Position Filled Count
            const posRef = doc(firestore, 'positions', position.id);
            batch.update(posRef, {
                filled: increment(-1),
                updatedAt: Timestamp.now()
            });

            // 3. Create ER Document if template is selected
            if (templateData) {
                const docContent = generateDocumentContent(templateData.content, {
                    employee,
                    position,
                    customInputs: customInputValues,
                    company: null, // Add placeholders as needed by the interface
                    system: null,
                });

                const erDocRef = doc(collection(firestore, 'er_documents'));
                batch.set(erDocRef, {
                    documentTypeId: templateData.documentTypeId,
                    templateId: templateData.id,
                    employeeId: employee.id,
                    positionId: position.id,
                    departmentId: position.departmentId,
                    creatorId: firebaseUser.uid,
                    status: 'DRAFT',
                    content: docContent,
                    version: 1,
                    metadata: {
                        employeeName: `${employee.firstName} ${employee.lastName}`,
                        positionTitle: position.title,
                        templateName: templateData.name,
                        actionId: selectedActionId
                    },
                    customInputs: customInputValues,
                    history: [{
                        action: 'CREATE',
                        actorId: firebaseUser.uid,
                        timestamp: Timestamp.now(),
                        note: 'Ажилтан чөлөөлөх үед системээс автоматаар үүсгэв.'
                    }],
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }

            await batch.commit();

            toast({
                title: "Ажилтан чөлөөлөгдлөө",
                description: templateData ? "Холбогдох баримтын ноорог үүсгэгдсэн." : "Ажилтныг амжилттай чөлөөллөө."
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

                                            {templateData.customInputs && templateData.customInputs.length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 text-rose-600">
                                                        <Wand2 className="h-4 w-4" />
                                                        <label className="text-xs font-bold uppercase tracking-widest">Шаардлагатай мэдээллүүд</label>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {templateData.customInputs.map(input => (
                                                            <div key={input.key} className="space-y-1.5">
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
                                                                                    !customInputValues[input.key] && "text-muted-foreground"
                                                                                )}
                                                                            >
                                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                {customInputValues[input.key] ? format(new Date(customInputValues[input.key]), "PPP", { locale: mn }) : <span>Огноо сонгох</span>}
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0" align="start">
                                                                            <Calendar
                                                                                mode="single"
                                                                                selected={customInputValues[input.key] ? new Date(customInputValues[input.key]) : undefined}
                                                                                onSelect={(date) => setCustomInputValues(prev => ({ ...prev, [input.key]: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                                                                initialFocus
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                ) : input.type === 'number' ? (
                                                                    <Input
                                                                        type="number"
                                                                        value={customInputValues[input.key] || ''}
                                                                        onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.key]: e.target.value }))}
                                                                        placeholder={input.description || `${input.label} оруулна уу...`}
                                                                        className="h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/10 transition-all font-medium"
                                                                    />
                                                                ) : input.type === 'boolean' ? (
                                                                    <div className="flex items-center space-x-2 h-11 px-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                                                        <Switch
                                                                            checked={!!customInputValues[input.key]}
                                                                            onCheckedChange={(checked) => setCustomInputValues(prev => ({ ...prev, [input.key]: checked }))}
                                                                        />
                                                                        <span className="text-sm text-slate-500">{customInputValues[input.key] ? 'Тийм' : 'Үгүй'}</span>
                                                                    </div>
                                                                ) : (
                                                                    <Input
                                                                        value={customInputValues[input.key] || ''}
                                                                        onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.key]: e.target.value }))}
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
                                        <div className="p-8 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm space-y-4">
                                            <div className="flex items-start gap-3">
                                                <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="font-bold mb-1">Тохиргоо дутуу байна</p>
                                                    <p className="opacity-80 leading-relaxed font-medium">Энэ үйлдлийг хийхийн тулд эхлээд "Байгууллагын тохиргоо" хэсэгт баримтын загвар холбосон байх шаардлагатай.</p>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                className="w-full bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 h-10 rounded-xl font-bold uppercase tracking-widest text-[10px] gap-2"
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
                                    disabled={isSubmitting || !templateData || (templateData?.customInputs || []).some(i => i.required && !customInputValues[i.key])}
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
