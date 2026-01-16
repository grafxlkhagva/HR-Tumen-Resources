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
import { Search, UserPlus, Loader2, GitBranch, ChevronRight, FileText, Check, X, Wand2 } from 'lucide-react';
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

interface AppointEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    position: Position | null;
}

export function AppointEmployeeDialog({
    open,
    onOpenChange,
    position,
}: AppointEmployeeDialogProps) {
    const { firestore, user: firebaseUser } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [search, setSearch] = React.useState('');
    const [step, setStep] = React.useState(1);
    const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [customInputValues, setCustomInputValues] = React.useState<Record<string, any>>({});

    // 1. Fetch unassigned employees
    const employeesQuery = React.useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'employees'),
            where('status', '==', 'Идэвхтэй'),
            where('positionId', '==', null)
        );
    }, [firestore]);

    const { data: allEmployees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);

    // 2. Fetch System Appointment Action Config
    const actionConfigRef = React.useMemo(() =>
        firestore ? doc(firestore, 'organization_actions', 'appointment') : null
        , [firestore]);
    const { data: appointmentAction } = useDoc<any>(actionConfigRef);

    // 3. Fetch Template if configured
    const templateRef = React.useMemo(() =>
        firestore && appointmentAction?.templateId ? doc(firestore, 'er_templates', appointmentAction.templateId) : null
        , [firestore, appointmentAction?.templateId]);
    const { data: templateData, isLoading: templateLoading } = useDoc<ERTemplate>(templateRef as any);

    const assignableEmployees = React.useMemo(() => {
        if (!allEmployees) return [];
        return allEmployees.filter(emp => !emp.positionId);
    }, [allEmployees]);

    const filteredEmployees = React.useMemo(() => {
        return assignableEmployees.filter(emp =>
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            emp.employeeCode?.toLowerCase().includes(search.toLowerCase())
        );
    }, [assignableEmployees, search]);

    // Initialize custom inputs when template takes effect
    React.useEffect(() => {
        if (templateData?.customInputs) {
            const initialValues: Record<string, any> = {};
            templateData.customInputs.forEach(input => {
                initialValues[input.key] = '';
            });
            setCustomInputValues(initialValues);
        } else {
            setCustomInputValues({});
        }
    }, [templateData]);

    React.useEffect(() => {
        if (!open) {
            setStep(1);
            setSelectedEmployee(null);
            setSearch('');
            setCustomInputValues({});
        }
    }, [open]);

    const handleEmployeeSelect = (employee: Employee) => {
        setSelectedEmployee(employee);
        setStep(2);
    };

    const handleStartProcess = async () => {
        if (!firestore || !position || !selectedEmployee || !firebaseUser) return;

        setIsSubmitting(true);
        try {
            const batch = writeBatch(firestore);

            // 1. Fetch required data for document replacement
            const companySnap = await getDocs(collection(firestore, 'company_profile'));
            const companyProfile = !companySnap.empty ? companySnap.docs[0].data() : null;

            const deptSnap = await getDoc(doc(firestore, 'departments', position.departmentId));
            const deptData = deptSnap.exists() ? { id: deptSnap.id, ...deptSnap.data() } : null;

            // 2. Generate Content if template exists
            let content = '';
            if (templateData) {
                content = generateDocumentContent(templateData.content || '', {
                    employee: selectedEmployee,
                    department: deptData,
                    position: position,
                    company: companyProfile,
                    system: {
                        date: format(new Date(), 'yyyy-MM-dd'),
                        year: format(new Date(), 'yyyy'),
                        month: format(new Date(), 'MM'),
                        day: format(new Date(), 'dd'),
                        user: firebaseUser.displayName || 'Системийн хэрэглэгч'
                    },
                    customInputs: customInputValues
                });

                // 3. Create er_document
                const docRef = doc(collection(firestore, 'er_documents'));
                batch.set(docRef, {
                    documentTypeId: templateData.documentTypeId,
                    templateId: templateData.id,
                    employeeId: selectedEmployee.id,
                    departmentId: position.departmentId,
                    positionId: position.id,
                    creatorId: firebaseUser.uid,
                    status: 'DRAFT',
                    content: content,
                    version: 1,
                    printSettings: templateData.printSettings || null,
                    customInputs: customInputValues,
                    metadata: {
                        employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`,
                        templateName: templateData.name,
                        departmentName: (deptData as any)?.name,
                        positionName: position.title,
                        actionId: 'appointment'
                    },
                    history: [{
                        stepId: 'CREATE',
                        action: 'CREATE',
                        actorId: firebaseUser.uid,
                        timestamp: Timestamp.now(),
                        comment: 'Томилгооны процесс эхлүүлэв (Бүтэц зураглалаас)'
                    }],
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                });
            }

            // 4. Update Employee
            const empRef = doc(firestore, 'employees', selectedEmployee.id);
            batch.update(empRef, {
                positionId: position.id,
                jobTitle: position.title,
                departmentId: position.departmentId,
                status: 'Томилогдож буй', // The requested status
                updatedAt: Timestamp.now()
            });

            // 5. Update Position filled count
            const posRef = doc(firestore, 'positions', position.id);
            batch.update(posRef, {
                filled: increment(1),
                updatedAt: Timestamp.now()
            });

            // 6. Commit Batch
            await batch.commit();

            toast({
                title: 'Томилгоо эхэллээ',
                description: `${selectedEmployee.firstName} ажилтныг "${position.title}" албан тушаалд томилох процесс эхэлж, баримт төлөвлөгдлөө.`,
            });

            onOpenChange(false);
        } catch (error: any) {
            console.error("Appointment error:", error);
            toast({
                title: 'Алдаа гарлаа',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] h-[650px] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border-none shadow-premium">
                <DialogHeader className="p-8 pb-6 bg-gradient-to-br from-primary/5 to-background border-b shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold">
                            {step === 1 ? 'Ажилтан томилох' : 'Томилгооны тохиргоо'}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm">
                        {step === 1 ? (
                            <>
                                <span className="font-bold text-foreground">"{position?.title}"</span> ажлын байранд томилох ажилтнаа сонгоно уу.
                            </>
                        ) : (
                            <>
                                <span className="font-bold text-foreground">{selectedEmployee?.firstName} {selectedEmployee?.lastName}</span> ажилтны томилгооны баримтыг бэлтгэж байна.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {step === 1 ? (
                        <>
                            <div className="px-8 py-4 border-b bg-muted/20 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Ажилтны нэр, кодоор хайх..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10 h-11 bg-background rounded-xl border-border focus-visible:ring-primary shadow-sm"
                                    />
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-2">
                                    {employeesLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Ажилтны жагсаалт уншиж байна...</p>
                                        </div>
                                    ) : filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((emp) => (
                                            <div
                                                key={emp.id}
                                                className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group cursor-pointer"
                                                onClick={() => handleEmployeeSelect(emp)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-border/20">
                                                        <AvatarImage src={emp.photoURL} />
                                                        <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                                            {emp.firstName?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">{emp.firstName} {emp.lastName}</div>
                                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-2">
                                                            <span className="bg-muted px-1.5 py-0.5 rounded">#{emp.employeeCode}</span>
                                                            {emp.jobTitle && <span>{emp.jobTitle}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-all bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                                >
                                                    <ChevronRight className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-20 text-center space-y-4">
                                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                                                <Search className="h-8 w-8 text-muted-foreground/30" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Илэрц олдсонгүй</p>
                                                <p className="text-xs text-muted-foreground mt-1">Томилогдоогүй, идэвхтэй ажилтан олдсонгүй.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </>
                    ) : (
                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-6">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                                    <Avatar className="h-14 w-14 border-4 border-white shadow-sm">
                                        <AvatarImage src={selectedEmployee?.photoURL} />
                                        <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                                            {selectedEmployee?.firstName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="text-lg font-bold text-slate-900">{selectedEmployee?.firstName} {selectedEmployee?.lastName}</div>
                                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2 mt-0.5">
                                            <span className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">#{selectedEmployee?.employeeCode}</span>
                                            <span>{position?.title}</span>
                                        </div>
                                    </div>
                                </div>

                                {templateLoading ? (
                                    <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                ) : templateData ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center gap-2 py-2 border-y border-dashed border-slate-200">
                                            <FileText className="w-5 h-5 text-indigo-500" />
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Ашиглах загвар</div>
                                                <div className="text-sm font-bold text-slate-700">{templateData.name}</div>
                                            </div>
                                        </div>

                                        {templateData.customInputs && templateData.customInputs.length > 0 && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-indigo-600">
                                                    <Wand2 className="h-4 w-4" />
                                                    <label className="text-xs font-bold uppercase tracking-widest">Шаардлагатай мэдээллүүд</label>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {templateData.customInputs.map(input => (
                                                        <div key={input.key} className="space-y-1.5">
                                                            <Label className="text-xs font-bold text-slate-600 ml-1">
                                                                {input.label} {input.required && <span className="text-rose-500">*</span>}
                                                            </Label>
                                                            <Input
                                                                value={customInputValues[input.key] || ''}
                                                                onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.key]: e.target.value }))}
                                                                placeholder={input.description || `${input.label} оруулна уу...`}
                                                                className="h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/10 transition-all font-medium"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
                                        <p className="font-bold flex items-center gap-2 mb-1">
                                            <GitBranch className="h-4 w-4" />
                                            Системийн тохиргоо дутуу
                                        </p>
                                        <p className="opacity-80">Томилгооны баримтын загвар тохируулаагүй байна. Процесс эхлүүлэхэд баримт үүсэхгүй болохыг анхаарна уу.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}

                    {isSubmitting && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                            <div className="relative">
                                <div className="h-24 w-24 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 text-primary/40" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-slate-900">Томилгоо хийж байна</p>
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
                                onClick={handleStartProcess}
                                disabled={isSubmitting || (templateData?.customInputs || []).some(i => i.required && !customInputValues[i.key])}
                                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-indigo-200"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                Томилгоо хийх үйлдэл эхлүүлэх
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
