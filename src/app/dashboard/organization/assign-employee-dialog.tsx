

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
    useFirebase,
    useMemoFirebase,
    useCollection,
    useTenantWrite,
} from '@/firebase';
import { doc, collection, getDocs, addDoc, runTransaction, Timestamp } from 'firebase/firestore';
import {
    checkAppointmentEligibility,
    getAppointmentDocumentUrl,
    readAndGuardAppointmentInTransaction,
    applyAppointmentPositionWrites,
} from '@/lib/services/employee-appointment-service';
import { getReleaseDocumentUrl } from '@/lib/services/employee-release-service';
import { logAudit } from '@/lib/client/audit-client';
import { Loader2, UserPlus, UserRoundCheck, Calendar as CalendarIcon, X, Save, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { EmployeeStatus } from '@/types';
import type { Employee } from '../employees/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { add, format } from 'date-fns';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// defining local interface to avoid import issues
interface OnboardingProgram {
    id: string;
    title: string;
    description: string;
    appliesTo?: {
        departmentIds?: string[];
        positionIds?: string[];
    }
}

import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';


import { Position as JobPosition } from './types';
import { isActiveStatus } from '@/types';
import * as Sentry from '@sentry/nextjs';

const assignmentSchema = z.object({
    assignmentDate: z.date({ required_error: 'Томилох огноог сонгоно уу.' }),
    assignmentType: z.enum(['direct', 'trial']),
    trialEndDate: z.date().optional(),
}).refine(data => {
    if (data.assignmentType === 'trial') {
        return !!data.trialEndDate;
    }
    return true;
}, { message: "Туршилтын хугацаа дуусах огноог оруулна уу.", path: ["trialEndDate"] });

type AssignmentFormValues = z.infer<typeof assignmentSchema>;


interface AssignEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    position: JobPosition | null;
    employees: Employee[];
    selectedEmployee: Employee | null;
    onAssignmentComplete: () => void;
}

export function AssignEmployeeDialog({
    open,
    onOpenChange,
    position,
    employees,
    selectedEmployee,
    onAssignmentComplete,
}: AssignEmployeeDialogProps) {
    const { firestore } = useFirebase();
    const { tDoc, tCollection, companyPath } = useTenantWrite();
    const { toast } = useToast();
    const [step, setStep] = React.useState(1);
    const [localSelectedEmployee, setLocalSelectedEmployee] = React.useState<Employee | null>(null);

    // Cross-workflow eligibility guard — Layer C2.
    const [eligibility, setEligibility] = React.useState<
        | null
        | { allowed: true }
        | {
              allowed: false;
              reason: string;
              activeAppointmentDocId?: string;
              activeReleaseDocId?: string;
          }
    >(null);

    const form = useForm<AssignmentFormValues>({
        resolver: zodResolver(assignmentSchema),
        defaultValues: {
            assignmentDate: new Date(),
            assignmentType: 'direct',
        }
    });

    const { isSubmitting } = form.formState;
    const assignmentType = form.watch('assignmentType');



    React.useEffect(() => {
        if (open) {
            // If an employee is pre-selected (e.g., from drag-and-drop),
            // go directly to the assignment details step.
            if (selectedEmployee) {
                setLocalSelectedEmployee(selectedEmployee);
                setStep(2);
            } else {
                // Otherwise, start from the employee selection step.
                setStep(1);
                setLocalSelectedEmployee(null);
            }
            form.reset({
                assignmentDate: new Date(),
                assignmentType: 'direct',
                trialEndDate: undefined,
            });
        } else {
            setEligibility(null);
        }
    }, [open, selectedEmployee, form]);

    // Cross-workflow eligibility шалгалт — Layer C2.
    // localSelectedEmployee солигдох болгонд checkAppointmentEligibility-г дуудаж
    // дуусаагүй release/appointment doc-уудыг илрүүлнэ.
    React.useEffect(() => {
        if (!open || !firestore || !companyPath || !localSelectedEmployee?.id) {
            setEligibility(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const result = await checkAppointmentEligibility({
                    firestore,
                    companyPath,
                    employeeId: localSelectedEmployee.id,
                    employeeStatus: localSelectedEmployee.status as EmployeeStatus,
                });
                if (cancelled) return;
                if (result.allowed) {
                    setEligibility({ allowed: true });
                } else {
                    setEligibility({
                        allowed: false,
                        reason: result.reason,
                        activeAppointmentDocId: result.activeAppointmentDoc?.id,
                        activeReleaseDocId: result.activeReleaseDoc?.id,
                    });
                }
            } catch (e) {
                Sentry.captureException(e, { tags: { module: 'organization' } });
                if (!cancelled) setEligibility({ allowed: true });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, firestore, companyPath, localSelectedEmployee?.id, localSelectedEmployee?.status]);

    const assignableEmployees = React.useMemo(() => {
        return employees.filter(emp => isActiveStatus(emp.status) && !emp.positionId);
    }, [employees]);


    const handleFinalAssignment = async (values: AssignmentFormValues) => {
        if (!firestore || !position || !localSelectedEmployee) return;
        if (eligibility && eligibility.allowed === false) {
            toast({
                variant: 'destructive',
                title: 'Томилгоо хийх боломжгүй',
                description: eligibility.reason,
            });
            return;
        }

        try {
            // Refs-ийг transaction-аас гадна үүсгэнэ
            const employeeDocRef = tDoc('employees', localSelectedEmployee.id);
            const positionDocRef = tDoc('positions', position.id);
            const historyCollectionRef = tCollection('employees', localSelectedEmployee.id, 'employmentHistory');
            const historyDocRef = doc(historyCollectionRef);

            let historyNotes = `${position.title} албан тушаалд ${format(values.assignmentDate, 'yyyy-MM-dd')}-нд томилов.`;
            if (values.assignmentType === 'trial' && values.trialEndDate) {
                historyNotes += ` Туршилтын хугацаа ${format(values.trialEndDate, 'yyyy-MM-dd')} хүртэл.`
            }

            // ─── Atomic transaction ──────────────────────────────────────
            // Capacity check + old position decrement + employee/position
            // update + history entry — бүгд атомик. Concurrent томилгоо race
            // condition үүсгэхгүй.
            await runTransaction(firestore, async (transaction) => {
                // Layer E4: shared helper — read + status guard + capacity guard +
                // reassignment-ийн хуучин position уншилт.
                const ctx = await readAndGuardAppointmentInTransaction(
                    transaction,
                    employeeDocRef,
                    positionDocRef,
                );

                // --- WRITES ---
                // Position filled count бичилтүүд (шинэ +1, хуучин -1)
                applyAppointmentPositionWrites(transaction, ctx, positionDocRef);

                transaction.update(employeeDocRef, {
                    positionId: position.id,
                    jobTitle: position.title,
                    departmentId: position.departmentId ?? null,
                    updatedAt: Timestamp.now(),
                });

                transaction.set(historyDocRef, {
                    eventType: 'Албан тушаалд томилогдсон',
                    eventDate: values.assignmentDate.toISOString(),
                    notes: historyNotes,
                    createdAt: new Date().toISOString(),
                });
            });

            toast({
                title: 'Амжилттай томилогдлоо',
            });

            // Audit log — direct assignment (ER doc-гүй шууд томилгоо)
            try {
                const employeeName = `${localSelectedEmployee.firstName || ''} ${localSelectedEmployee.lastName || ''}`.trim() || 'Ажилтан';
                logAudit({
                    action: 'create',
                    resource: 'employee',
                    resourceId: localSelectedEmployee.id,
                    resourceName: employeeName,
                    description: `Ажилтан ${position.title}-д шууд томилогдлоо: ${employeeName}`,
                    metadata: {
                        kind: 'direct_assignment',
                        positionId: position.id,
                        positionName: position.title,
                        departmentId: position.departmentId ?? null,
                        assignmentType: values.assignmentType,
                        assignmentDate: values.assignmentDate.toISOString(),
                    },
                });
            } catch (auditErr) {
                Sentry.captureMessage('[handleFinalAssignment] audit log failed:', { level: 'warning', tags: { module: 'organization' }, extra: { error: auditErr } });
            }

        } catch (error: any) {
            Sentry.captureException(error, { tags: { module: 'organization' } });
            toast({
                variant: "destructive",
                title: "Алдаа",
                description: error?.message || "Ажилтан томилоход алдаа гарлаа."
            });
        } finally {
            onOpenChange(false);
            onAssignmentComplete();
        }
    };

    const handleEmployeeSelect = (employee: Employee) => {
        setLocalSelectedEmployee(employee);
        setStep(2);
    }

    const renderStepOne = () => (
        <div className="pt-4">
            <ScrollArea className="h-72">
                <div className="space-y-2 pr-4">
                    {assignableEmployees.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            Томилгоогүй, идэвхтэй ажилтан байхгүй байна.
                        </div>
                    ) : (
                        assignableEmployees.map((emp) => (
                            <Card key={emp.id} onClick={() => handleEmployeeSelect(emp)} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                <CardContent className="p-3 flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={emp.photoURL} />
                                        <AvatarFallback>{emp.firstName.charAt(0)}{emp.lastName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{emp.firstName} {emp.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );

    const renderStepTwo = () => (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFinalAssignment)} className="space-y-4 pt-4">
                <div className="p-3 rounded-md border bg-muted/50 flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={localSelectedEmployee?.photoURL} />
                        <AvatarFallback>{localSelectedEmployee?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{localSelectedEmployee?.firstName} {localSelectedEmployee?.lastName}</p>
                        <p className="text-xs text-muted-foreground">Дээрх ажилтанг томилох гэж байна.</p>
                    </div>
                </div>

                {/* Cross-workflow eligibility banner — Layer C2 */}
                {eligibility && eligibility.allowed === false && (
                    <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 space-y-3">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-bold text-amber-900 text-sm">Томилгоо хийх боломжгүй</div>
                                <div className="text-xs text-amber-800 mt-1 font-medium">{eligibility.reason}</div>
                            </div>
                        </div>
                        {(eligibility.activeReleaseDocId || eligibility.activeAppointmentDocId) && (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100 h-8 rounded-lg font-bold w-full"
                            >
                                <Link
                                    href={
                                        eligibility.activeReleaseDocId
                                            ? getReleaseDocumentUrl(eligibility.activeReleaseDocId)
                                            : getAppointmentDocumentUrl(eligibility.activeAppointmentDocId!)
                                    }
                                >
                                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                                    Одоо явагдаж буй баримт руу очих
                                </Link>
                            </Button>
                        )}
                    </div>
                )}
                <FormField
                    control={form.control}
                    name="assignmentDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Томилогдох огноо</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="assignmentType" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>Томилгооны төрөл</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="direct" /></FormControl><FormLabel className="font-normal">Шууд томилох</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="trial" /></FormControl><FormLabel className="font-normal">Туршилтаар томилох</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                {assignmentType === 'trial' && (
                    <FormField
                        control={form.control}
                        name="trialEndDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Туршилт дуусах огноо</FormLabel>
                                <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => selectedEmployee ? onOpenChange(false) : setStep(1)} disabled={isSubmitting}>
                        Болих
                    </Button>
                    <Button
                        type="submit"
                        variant="success"
                        disabled={isSubmitting || (eligibility !== null && eligibility.allowed === false)}
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Баталгаажуулах
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>"{position?.title}" ажлын байранд томилгоо хийх</DialogTitle>
                    {position?.isApproved === false && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-xs font-medium flex items-center gap-2">
                            <Sparkles className="h-4 w-4 shrink-0" />
                            Анхааруулга: Энэ албан тушаал батлагдаагүй бүтцэд хамаарч байна. Ийм ажлын байранд хүн томилох нь эрсдэлтэй байж болзошгүй.
                        </div>
                    )}
                    <DialogDescription className="mt-2">
                        {step === 1 && 'Томилох ажилтнаа сонгоно уу.'}
                        {step === 2 && 'Томилгооны мэдээллийг оруулна уу.'}
                    </DialogDescription>
                </DialogHeader>

                {isSubmitting && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}

                {step === 1 && renderStepOne()}
                {step === 2 && localSelectedEmployee && renderStepTwo()}

            </DialogContent>
        </Dialog>
    );
}
