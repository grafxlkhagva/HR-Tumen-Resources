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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    Search, UserPlus, Loader2, GitBranch, ChevronRight, ChevronLeft, FileText, Check, X, Wand2, 
    ExternalLink, Calendar as CalendarIcon, Clock, DollarSign, Zap, Gift, GraduationCap,
    ArrowRight
} from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { mn } from 'date-fns/locale';

interface AppointEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    position: Position | null;
    initialEmployee?: Employee | null;
    onSuccess?: (employeeId: string) => void;
}

// Full position data fetched from Firestore
interface FullPositionData extends Position {
    salarySteps?: {
        items: { name: string; value: number }[];
        activeIndex: number;
        currency: string;
    };
    incentives?: {
        type: string;
        description: string;
        amount: number;
        currency: string;
        unit: string;
        frequency?: string;
    }[];
    allowances?: {
        type: string;
        amount: number;
        currency: string;
        period: string;
    }[];
}

// Wizard steps
const WIZARD_STEPS = {
    EMPLOYEE_SELECT: 1,
    APPOINTMENT_TYPE: 2,
    SALARY_STEP: 3,
    INCENTIVES: 4,
    ALLOWANCES: 5,
    ONBOARDING: 6,
    DOCUMENT_INPUTS: 7,
};

export function AppointEmployeeDialog({
    open,
    onOpenChange,
    position,
    initialEmployee,
    onSuccess,
}: AppointEmployeeDialogProps) {
    const { firestore, user: firebaseUser } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    
    // Fetch full position data from Firestore (position prop might be incomplete)
    const fullPositionRef = React.useMemo(() => 
        firestore && position?.id && open ? doc(firestore, 'positions', position.id) : null
    , [firestore, position?.id, open]);
    const { data: fullPosition, isLoading: isPositionLoading } = useDoc<FullPositionData>(fullPositionRef as any);
    
    // Use full position data if available, fallback to prop
    const positionData = fullPosition || position;
    
    // Basic states
    const [search, setSearch] = React.useState('');
    const [step, setStep] = React.useState(WIZARD_STEPS.EMPLOYEE_SELECT);
    const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [offboardingStatus, setOffboardingStatus] = React.useState<'checking' | 'active' | 'none'>('none');

    // Wizard selection states
    const [selectedActionId, setSelectedActionId] = React.useState<string | null>(null);
    const [selectedSalaryStepIndex, setSelectedSalaryStepIndex] = React.useState<number>(0);
    const [selectedIncentives, setSelectedIncentives] = React.useState<number[]>([]);
    const [selectedAllowances, setSelectedAllowances] = React.useState<number[]>([]);
    const [enableOnboarding, setEnableOnboarding] = React.useState<boolean | null>(null);
    const [customInputValues, setCustomInputValues] = React.useState<Record<string, any>>({});

    // Fetch all active employees (filter for unassigned on client-side)
    // Note: Firestore doesn't support OR queries, so we fetch active employees and filter
    const employeesQuery = React.useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'employees'),
            where('status', '==', 'Идэвхтэй')
        );
    }, [firestore]);

    const { data: allEmployees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);

    // Fetch System Appointment Action Config
    const actionConfigRef = React.useMemo(() =>
        firestore && selectedActionId ? doc(firestore, 'organization_actions', selectedActionId) : null
        , [firestore, selectedActionId]);
    const { data: appointmentAction } = useDoc<any>(actionConfigRef);

    // Fetch Template if configured
    const templateRef = React.useMemo(() =>
        firestore && appointmentAction?.templateId ? doc(firestore, 'er_templates', appointmentAction.templateId) : null
        , [firestore, appointmentAction?.templateId]);
    const { data: templateData, isLoading: templateLoading } = useDoc<ERTemplate>(templateRef as any);

    const assignableEmployees = React.useMemo(() => {
        if (!allEmployees) return [];
        // Filter employees without a position (null, undefined, or empty string)
        return allEmployees.filter(emp => !emp.positionId || emp.positionId === '');
    }, [allEmployees]);

    const filteredEmployees = React.useMemo(() => {
        return assignableEmployees.filter(emp =>
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            emp.employeeCode?.toLowerCase().includes(search.toLowerCase())
        );
    }, [assignableEmployees, search]);

    // Normalize salary steps (handle old format with 'values' array)
    const normalizeSalarySteps = React.useCallback((pos: Position | FullPositionData | null) => {
        if (!pos?.salarySteps) return [];
        // New format with items array
        if (pos.salarySteps.items && Array.isArray(pos.salarySteps.items)) {
            return pos.salarySteps.items;
        }
        // Old format with values array
        const oldValues = (pos.salarySteps as any)?.values;
        if (oldValues && Array.isArray(oldValues)) {
            return oldValues.map((v: number, i: number) => ({
                name: `Шатлал ${i + 1}`,
                value: v
            }));
        }
        return [];
    }, []);

    // Get position data with normalization - use fullPosition from Firestore
    const salarySteps = React.useMemo(() => normalizeSalarySteps(positionData), [positionData, normalizeSalarySteps]);
    const incentives = positionData?.incentives || [];
    const allowances = positionData?.allowances || [];

    // Debug logging
    React.useEffect(() => {
        if (open) {
            console.log('AppointDialog - Position prop:', {
                id: position?.id,
                title: position?.title,
                hasSalarySteps: !!position?.salarySteps,
                hasIncentives: !!position?.incentives,
                hasAllowances: !!position?.allowances,
            });
            console.log('AppointDialog - Full Position (Firestore):', {
                id: fullPosition?.id,
                title: fullPosition?.title,
                salarySteps: fullPosition?.salarySteps,
                incentives: fullPosition?.incentives,
                allowances: fullPosition?.allowances,
                isLoading: isPositionLoading,
            });
            console.log('AppointDialog - Normalized data:', {
                salarySteps,
                incentives,
                allowances,
            });
        }
    }, [open, position, fullPosition, isPositionLoading, salarySteps, incentives, allowances]);
    const hasOnboardingProgram = (positionData?.onboardingProgramIds?.length || 0) > 0;

    // Calculate total steps based on position data
    const getMaxSteps = () => {
        let max = WIZARD_STEPS.APPOINTMENT_TYPE; // Always have appointment type
        if (salarySteps.length > 0) max = WIZARD_STEPS.SALARY_STEP;
        if (incentives.length > 0) max = WIZARD_STEPS.INCENTIVES;
        if (allowances.length > 0) max = WIZARD_STEPS.ALLOWANCES;
        max = WIZARD_STEPS.ONBOARDING; // Always have onboarding selection
        if (templateData?.customInputs?.length) max = WIZARD_STEPS.DOCUMENT_INPUTS;
        return max;
    };

    // Initialize custom inputs when template loads
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

    // Handle initial employee from dashboard drag & drop
    React.useEffect(() => {
        if (open && initialEmployee) {
            setSelectedEmployee(initialEmployee);
            setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
        }
    }, [open, initialEmployee]);

    // Check for active offboarding
    React.useEffect(() => {
        const checkOffboarding = async () => {
            if (!firestore || !initialEmployee?.id || !open) return;

            setOffboardingStatus('checking');
            try {
                const offboardingSnap = await getDoc(doc(firestore, 'offboarding_processes', initialEmployee.id));
                if (offboardingSnap.exists() && offboardingSnap.data()?.status === 'IN_PROGRESS') {
                    setOffboardingStatus('active');
                    toast({
                        title: 'Анхааруулга: Offboarding идэвхтэй',
                        description: `${initialEmployee.firstName} ${initialEmployee.lastName} ажилтанд ажилаас чөлөөлөх хөтөлбөр явагдаж байна.`,
                        variant: 'destructive',
                    });
                    return;
                }
                setOffboardingStatus('none');
            } catch (error) {
                console.error("Offboarding check error:", error);
                setOffboardingStatus('none');
            }
        };
        checkOffboarding();
    }, [firestore, initialEmployee?.id, open, toast]);

    // Reset on close
    React.useEffect(() => {
        if (!open) {
            setStep(WIZARD_STEPS.EMPLOYEE_SELECT);
            setSelectedEmployee(null);
            setSelectedActionId(null);
            setSelectedSalaryStepIndex(position?.salarySteps?.activeIndex || 0);
            setSelectedIncentives([]);
            setSelectedAllowances([]);
            setEnableOnboarding(null);
            setSearch('');
            setCustomInputValues({});
            setOffboardingStatus('none');
        }
    }, [open, position?.salarySteps?.activeIndex]);

    // Initialize default salary step from position
    React.useEffect(() => {
        if (positionData?.salarySteps?.activeIndex !== undefined && salarySteps.length > 0) {
            const activeIdx = Math.min(positionData.salarySteps.activeIndex, salarySteps.length - 1);
            setSelectedSalaryStepIndex(activeIdx);
        }
    }, [positionData?.salarySteps?.activeIndex, salarySteps.length]);

    const handleEmployeeSelect = async (employee: Employee) => {
        if (!firestore) return;
        
        try {
            const offboardingSnap = await getDoc(doc(firestore, 'offboarding_processes', employee.id));
            if (offboardingSnap.exists() && offboardingSnap.data()?.status === 'IN_PROGRESS') {
                toast({
                    title: 'Анхааруулга: Offboarding идэвхтэй',
                    description: `${employee.firstName} ${employee.lastName} ажилтанд ажилаас чөлөөлөх хөтөлбөр явагдаж байна.`,
                    variant: 'destructive',
                });
                setOffboardingStatus('active');
                return;
            }
            setOffboardingStatus('none');
        } catch (error) {
            console.error("Offboarding check error:", error);
            setOffboardingStatus('none');
        }
        
        setSelectedEmployee(employee);
        setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
    };

    // Navigate to next step based on available data
    const goToNextStep = (currentStep: number) => {
        console.log('goToNextStep called:', {
            currentStep,
            salaryStepsLength: salarySteps.length,
            incentivesLength: incentives.length,
            allowancesLength: allowances.length,
            salarySteps,
            incentives,
            allowances
        });
        
        if (currentStep === WIZARD_STEPS.APPOINTMENT_TYPE) {
            if (salarySteps.length > 0) {
                console.log('Going to SALARY_STEP');
                setStep(WIZARD_STEPS.SALARY_STEP);
            } else if (incentives.length > 0) {
                console.log('Going to INCENTIVES');
                setStep(WIZARD_STEPS.INCENTIVES);
            } else if (allowances.length > 0) {
                console.log('Going to ALLOWANCES');
                setStep(WIZARD_STEPS.ALLOWANCES);
            } else {
                console.log('Going to ONBOARDING');
                setStep(WIZARD_STEPS.ONBOARDING);
            }
        } else if (currentStep === WIZARD_STEPS.SALARY_STEP) {
            if (incentives.length > 0) {
                setStep(WIZARD_STEPS.INCENTIVES);
            } else if (allowances.length > 0) {
                setStep(WIZARD_STEPS.ALLOWANCES);
            } else {
                setStep(WIZARD_STEPS.ONBOARDING);
            }
        } else if (currentStep === WIZARD_STEPS.INCENTIVES) {
            if (allowances.length > 0) {
                setStep(WIZARD_STEPS.ALLOWANCES);
            } else {
                setStep(WIZARD_STEPS.ONBOARDING);
            }
        } else if (currentStep === WIZARD_STEPS.ALLOWANCES) {
            setStep(WIZARD_STEPS.ONBOARDING);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING) {
            if (templateData?.customInputs?.length) {
                setStep(WIZARD_STEPS.DOCUMENT_INPUTS);
            } else {
                // No document inputs, submit directly
                handleStartProcess();
            }
        }
    };

    // Navigate to previous step
    const goToPreviousStep = (currentStep: number) => {
        if (currentStep === WIZARD_STEPS.DOCUMENT_INPUTS) {
            setStep(WIZARD_STEPS.ONBOARDING);
        } else if (currentStep === WIZARD_STEPS.ONBOARDING) {
            if (allowances.length > 0) {
                setStep(WIZARD_STEPS.ALLOWANCES);
            } else if (incentives.length > 0) {
                setStep(WIZARD_STEPS.INCENTIVES);
            } else if (salarySteps.length > 0) {
                setStep(WIZARD_STEPS.SALARY_STEP);
            } else {
                setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
            }
        } else if (currentStep === WIZARD_STEPS.ALLOWANCES) {
            if (incentives.length > 0) {
                setStep(WIZARD_STEPS.INCENTIVES);
            } else if (salarySteps.length > 0) {
                setStep(WIZARD_STEPS.SALARY_STEP);
            } else {
                setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
            }
        } else if (currentStep === WIZARD_STEPS.INCENTIVES) {
            if (salarySteps.length > 0) {
                setStep(WIZARD_STEPS.SALARY_STEP);
            } else {
                setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
            }
        } else if (currentStep === WIZARD_STEPS.SALARY_STEP) {
            setStep(WIZARD_STEPS.APPOINTMENT_TYPE);
        } else if (currentStep === WIZARD_STEPS.APPOINTMENT_TYPE) {
            setStep(WIZARD_STEPS.EMPLOYEE_SELECT);
        }
    };

    const handleStartProcess = async () => {
        if (!firestore || !position || !selectedEmployee || !firebaseUser) {
            console.warn("Missing required data");
            return;
        }

        if (!selectedEmployee?.id || !position?.id) {
            toast({
                title: 'Алдаа',
                description: 'Ажилтан эсвэл ажлын байрны мэдээлэл дутуу байна.',
                variant: 'destructive'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Double-check offboarding status
            try {
                const offboardingSnap = await getDoc(doc(firestore, 'offboarding_processes', selectedEmployee.id));
                if (offboardingSnap.exists() && offboardingSnap.data()?.status === 'IN_PROGRESS') {
                    toast({
                        title: 'Томилох боломжгүй',
                        description: 'Тухайн ажилтанд offboarding хөтөлбөр идэвхтэй байгаа тул томилох боломжгүй.',
                        variant: 'destructive'
                    });
                    setIsSubmitting(false);
                    return;
                }
            } catch (e) {
                console.warn("Offboarding check failed:", e);
            }

            const batch = writeBatch(firestore);

            // Fetch company profile
            let companyProfile = null;
            try {
                const companySnap = await getDocs(collection(firestore, 'company_profile'));
                companyProfile = !companySnap.empty ? companySnap.docs[0].data() : null;
            } catch (e) {
                console.warn("Failed to fetch company profile:", e);
            }

            // Fetch department
            let deptData = null;
            if (position.departmentId) {
                try {
                    const deptSnap = await getDoc(doc(firestore, 'departments', position.departmentId));
                    deptData = deptSnap.exists() ? { id: deptSnap.id, ...deptSnap.data() } : null;
                } catch (e) {
                    console.warn("Failed to fetch department:", e);
                }
            }

            // Prepare selected compensation data
            const selectedSalary = salarySteps[selectedSalaryStepIndex];
            const selectedIncentivesList = selectedIncentives.map(i => incentives[i]);
            const selectedAllowancesList = selectedAllowances.map(i => allowances[i]);

            // Generate document content if template exists
            let content = '';
            if (templateData) {
                try {
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
                            user: firebaseUser?.displayName || 'Системийн хэрэглэгч'
                        },
                        customInputs: customInputValues || {},
                        // Add selected compensation data to template
                        appointment: {
                            salaryStep: selectedSalary,
                            incentives: selectedIncentivesList,
                            allowances: selectedAllowancesList,
                        }
                    });
                } catch (e) {
                    console.error("Document content generation failed:", e);
                    content = '';
                }

                // Create er_document
                try {
                    const docRef = doc(collection(firestore, 'er_documents'));
                    batch.set(docRef, {
                        documentTypeId: templateData?.documentTypeId || null,
                        templateId: templateData?.id || null,
                        employeeId: selectedEmployee.id,
                        departmentId: position?.departmentId || null,
                        positionId: position.id,
                        creatorId: firebaseUser?.uid || null,
                        status: 'DRAFT',
                        content: content,
                        version: 1,
                        printSettings: templateData?.printSettings || null,
                        customInputs: customInputValues || {},
                        // Store appointment selections
                        appointmentData: {
                            actionId: selectedActionId,
                            salaryStepIndex: selectedSalaryStepIndex,
                            salaryStep: selectedSalary,
                            incentiveIndices: selectedIncentives,
                            incentives: selectedIncentivesList,
                            allowanceIndices: selectedAllowances,
                            allowances: selectedAllowancesList,
                            enableOnboarding: enableOnboarding,
                        },
                        metadata: {
                            employeeName: `${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''}`,
                            templateName: templateData?.name || '',
                            departmentName: (deptData as any)?.name || '',
                            positionName: position?.title || '',
                            actionId: selectedActionId || ''
                        },
                        history: [{
                            stepId: 'CREATE',
                            action: 'CREATE',
                            actorId: firebaseUser?.uid || null,
                            timestamp: Timestamp.now(),
                            comment: 'Томилгооны процесс эхлүүлэв (Бүтэц зураглалаас)'
                        }],
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    });
                } catch (e) {
                    console.error("ER document creation failed:", e);
                }
            }

            // Conditional Onboarding Initialization
            if (enableOnboarding) {
                try {
                    const configSnap = await getDoc(doc(firestore, 'settings', 'onboarding'));
                    const config = configSnap.exists() ? configSnap.data() : { stages: [] };

                    let allowedTaskIds: string[] | null = null;
                    if (position.onboardingProgramIds && position.onboardingProgramIds.length > 0) {
                        allowedTaskIds = position.onboardingProgramIds;
                    }

                    const newStages: any[] = (config.stages || []).map((s: any) => {
                        const stageTasks = (s.tasks || []).filter((t: any) =>
                            allowedTaskIds ? allowedTaskIds.includes(t.id) : true
                        );

                        return {
                            id: s.id,
                            title: s.title,
                            completed: false,
                            progress: 0,
                            tasks: stageTasks.map((t: any) => ({
                                id: t.id,
                                title: t.title,
                                description: t.description,
                                completed: false
                            }))
                        };
                    }).filter((s: any) => s.tasks.length > 0);

                    if (newStages.length > 0) {
                        const processRef = doc(firestore, 'onboarding_processes', selectedEmployee.id);
                        batch.set(processRef, {
                            id: selectedEmployee.id,
                            employeeId: selectedEmployee.id,
                            stages: newStages,
                            progress: 0,
                            status: 'IN_PROGRESS',
                            closedAt: null,
                            closedReason: null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.error("Onboarding initialization failed:", e);
                }
            }

            // Update Employee with selected compensation
            try {
                const empRef = doc(firestore, 'employees', selectedEmployee.id);
                batch.update(empRef, {
                    positionId: position?.id || null,
                    jobTitle: position?.title || null,
                    departmentId: position?.departmentId || null,
                    status: 'Томилогдож буй',
                    lifecycleStage: 'onboarding',
                    // Store appointment compensation
                    appointedCompensation: {
                        salaryStepIndex: selectedSalaryStepIndex,
                        salary: selectedSalary?.value || 0,
                        salaryStepName: selectedSalary?.name || '',
                        incentiveIndices: selectedIncentives,
                        allowanceIndices: selectedAllowances,
                    },
                    updatedAt: Timestamp.now()
                });
            } catch (e) {
                console.error("Employee update failed:", e);
                throw new Error('Ажилтны мэдээллийг шинэчлэхэд алдаа гарлаа.');
            }

            // Update Position filled count
            try {
                const posRef = doc(firestore, 'positions', position.id);
                batch.update(posRef, {
                    filled: increment(1),
                    updatedAt: Timestamp.now()
                });
            } catch (e) {
                console.error("Position update failed:", e);
                throw new Error('Ажлын байрны мэдээллийг шинэчлэхэд алдаа гарлаа.');
            }

            // Commit Batch
            try {
                await batch.commit();
            } catch (e) {
                console.error("Batch commit failed:", e);
                throw new Error('Мэдээллийг хадгалахад алдаа гарлаа.');
            }

            toast({
                title: 'Томилгоо эхэллээ',
                description: `${selectedEmployee?.firstName || ''} ${selectedEmployee?.lastName || ''} ажилтныг "${position?.title || ''}" албан тушаалд томилох процесс эхэллээ.`,
            });

            if (onSuccess && selectedEmployee?.id) {
                onSuccess(selectedEmployee.id);
            }

            onOpenChange(false);
        } catch (error: any) {
            console.error("Appointment error:", error);
            toast({
                title: 'Алдаа гарлаа',
                description: error?.message || 'Томилгооны процесс хийхэд алдаа гарлаа.',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate current step progress
    const getStepProgress = () => {
        const steps = [];
        steps.push({ id: 1, name: 'Ажилтан' });
        steps.push({ id: 2, name: 'Төрөл' });
        if (salarySteps.length > 0) steps.push({ id: 3, name: 'Цалин' });
        if (incentives.length > 0) steps.push({ id: 4, name: 'Урамшуулал' });
        if (allowances.length > 0) steps.push({ id: 5, name: 'Хангамж' });
        steps.push({ id: 6, name: 'Onboarding' });
        if (templateData?.customInputs?.length) steps.push({ id: 7, name: 'Баримт' });
        return steps;
    };

    const stepProgress = getStepProgress();
    const currentStepIndex = stepProgress.findIndex(s => s.id === step);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] h-[700px] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border-none shadow-premium">
                <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/5 to-background border-b shrink-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">
                                Ажилтан томилох
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                <span className="font-semibold text-foreground">"{position?.title}"</span> ажлын байр
                            </DialogDescription>
                        </div>
                    </div>
                    
                    {/* Step Progress Indicator */}
                    {step > WIZARD_STEPS.EMPLOYEE_SELECT && (
                        <div className="flex items-center gap-1 mt-3">
                            {stepProgress.map((s, i) => (
                                <React.Fragment key={s.id}>
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all",
                                        s.id === step 
                                            ? "bg-primary text-primary-foreground" 
                                            : s.id < step 
                                                ? "bg-primary/20 text-primary"
                                                : "bg-muted text-muted-foreground"
                                    )}>
                                        {s.id < step ? (
                                            <Check className="h-3 w-3" />
                                        ) : (
                                            <span>{i + 1}</span>
                                        )}
                                        <span className="hidden sm:inline">{s.name}</span>
                                    </div>
                                    {i < stepProgress.length - 1 && (
                                        <div className={cn(
                                            "h-0.5 w-3 rounded-full transition-all",
                                            s.id < step ? "bg-primary" : "bg-muted"
                                        )} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                    
                    {/* Debug: Show available data */}
                    {step === WIZARD_STEPS.APPOINTMENT_TYPE && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {isPositionLoading ? (
                                <Badge variant="outline" className="text-[9px]">
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                    Ачаалж байна...
                                </Badge>
                            ) : (
                                <>
                                    <Badge variant={salarySteps.length > 0 ? "default" : "outline"} className="text-[9px]">
                                        Цалин: {salarySteps.length}
                                    </Badge>
                                    <Badge variant={incentives.length > 0 ? "default" : "outline"} className="text-[9px]">
                                        Урамшуулал: {incentives.length}
                                    </Badge>
                                    <Badge variant={allowances.length > 0 ? "default" : "outline"} className="text-[9px]">
                                        Хангамж: {allowances.length}
                                    </Badge>
                                </>
                            )}
                        </div>
                    )}
                </DialogHeader>

                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Step 1: Employee Selection */}
                    {step === WIZARD_STEPS.EMPLOYEE_SELECT && (
                        <>
                            <div className="px-6 py-3 border-b bg-muted/20 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Ажилтны нэр, кодоор хайх..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10 h-10 bg-background rounded-xl"
                                    />
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-2">
                                    {employeesLoading ? (
                                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                                            <p className="text-xs text-muted-foreground">Ажилтны жагсаалт уншиж байна...</p>
                                        </div>
                                    ) : filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((emp) => (
                                            <div
                                                key={emp.id}
                                                className="flex items-center justify-between p-3 rounded-xl bg-background border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
                                                onClick={() => handleEmployeeSelect(emp)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                        <AvatarImage src={emp.photoURL} />
                                                        <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                                            {emp.firstName?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-semibold text-sm">{emp.firstName} {emp.lastName}</div>
                                                        <div className="text-[10px] text-muted-foreground">#{emp.employeeCode}</div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-16 text-center">
                                            <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                                            <p className="text-sm font-medium">Илэрц олдсонгүй</p>
                                            <p className="text-xs text-muted-foreground">Томилогдоогүй ажилтан олдсонгүй</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </>
                    )}

                    {/* Step 2: Appointment Type */}
                    {step === WIZARD_STEPS.APPOINTMENT_TYPE && (
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-4">
                                {/* Offboarding warnings */}
                                {offboardingStatus === 'checking' && (
                                    <div className="p-3 rounded-xl bg-slate-50 border flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Төлөв шалгаж байна...</span>
                                    </div>
                                )}
                                {offboardingStatus === 'active' && (
                                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                                        <X className="h-4 w-4 text-red-600 mt-0.5" />
                                        <div>
                                            <div className="font-semibold text-red-800 text-sm">Offboarding идэвхтэй</div>
                                            <p className="text-xs text-red-600">Томилох боломжгүй</p>
                                        </div>
                                    </div>
                                )}

                                <div className="text-center mb-4">
                                    <h3 className="font-bold">Томилгооны төрөл сонгох</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Сонголт дарахад автоматаар үргэлжилнэ</p>
                                </div>

                                {[
                                    { id: 'appointment_permanent', name: 'Үндсэн ажилтнаар томилох', desc: 'Байнгын гэрээтэй', icon: UserPlus, color: 'bg-indigo-50 text-indigo-600' },
                                    { id: 'appointment_probation', name: 'Туршилтын хугацаатай томилох', desc: 'Туршилтын гэрээтэй', icon: Clock, color: 'bg-amber-50 text-amber-600' },
                                    { id: 'appointment_reappoint', name: 'Эргүүлэн томилох', desc: 'Дахин томилолт', icon: GitBranch, color: 'bg-emerald-50 text-emerald-600' },
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => {
                                            setSelectedActionId(type.id);
                                            goToNextStep(WIZARD_STEPS.APPOINTMENT_TYPE);
                                        }}
                                        disabled={offboardingStatus === 'active' || offboardingStatus === 'checking'}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-4 rounded-xl border-2 bg-white transition-all text-left group",
                                            offboardingStatus !== 'none'
                                                ? "opacity-50 cursor-not-allowed"
                                                : "hover:border-primary hover:shadow-md"
                                        )}
                                    >
                                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", type.color)}>
                                            <type.icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold">{type.name}</div>
                                            <div className="text-xs text-muted-foreground">{type.desc}</div>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    )}

                    {/* Step 3: Salary Step Selection */}
                    {step === WIZARD_STEPS.SALARY_STEP && (
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-4">
                                <div className="text-center mb-4">
                                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 mb-2">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-bold">Цалингийн шатлал сонгох</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Сонголт дарахад автоматаар үргэлжилнэ</p>
                                </div>

                                <div className="space-y-2">
                                    {salarySteps.map((salaryStep, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSelectedSalaryStepIndex(index);
                                                goToNextStep(WIZARD_STEPS.SALARY_STEP);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left group",
                                                positionData?.salarySteps?.activeIndex === index
                                                    ? "border-emerald-300 bg-emerald-50"
                                                    : "border-slate-200 bg-white hover:border-primary hover:shadow-md"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                                                    positionData?.salarySteps?.activeIndex === index
                                                        ? "bg-emerald-500 text-white"
                                                        : "bg-slate-100 text-slate-600"
                                                )}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{salaryStep.name}</div>
                                                    {positionData?.salarySteps?.activeIndex === index && (
                                                        <Badge variant="outline" className="text-[9px] h-4 border-emerald-300 text-emerald-600">
                                                            Анхдагч
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">{salaryStep.value.toLocaleString()}₮</span>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </ScrollArea>
                    )}

                    {/* Step 4: Incentives Selection */}
                    {step === WIZARD_STEPS.INCENTIVES && (
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-4">
                                <div className="text-center mb-4">
                                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-amber-100 text-amber-600 mb-2">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-bold">Урамшуулал & Нэмэгдэл сонгох</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Олгохыг хүссэн урамшууллуудаа сонгоно уу</p>
                                </div>

                                <div className="space-y-2">
                                    {incentives.map((inc, index) => (
                                        <label
                                            key={index}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                selectedIncentives.includes(index)
                                                    ? "border-amber-300 bg-amber-50"
                                                    : "border-slate-200 bg-white hover:border-amber-200"
                                            )}
                                        >
                                            <Checkbox
                                                checked={selectedIncentives.includes(index)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedIncentives(prev => [...prev, index]);
                                                    } else {
                                                        setSelectedIncentives(prev => prev.filter(i => i !== index));
                                                    }
                                                }}
                                                className="h-5 w-5"
                                            />
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm">{inc.type}</div>
                                                {inc.description && (
                                                    <p className="text-xs text-muted-foreground">{inc.description}</p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="secondary" className="font-bold">
                                                    {inc.unit === '₮' ? inc.amount.toLocaleString() : inc.amount}{inc.unit}
                                                </Badge>
                                                {inc.frequency && (
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{inc.frequency}</p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {incentives.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Урамшуулал тохируулаагүй</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}

                    {/* Step 5: Allowances Selection */}
                    {step === WIZARD_STEPS.ALLOWANCES && (
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-4">
                                <div className="text-center mb-4">
                                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-violet-100 text-violet-600 mb-2">
                                        <Gift className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-bold">Хангамж сонгох</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Олгохыг хүссэн хангамжуудаа сонгоно уу</p>
                                </div>

                                <div className="space-y-2">
                                    {allowances.map((all, index) => (
                                        <label
                                            key={index}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                selectedAllowances.includes(index)
                                                    ? "border-violet-300 bg-violet-50"
                                                    : "border-slate-200 bg-white hover:border-violet-200"
                                            )}
                                        >
                                            <Checkbox
                                                checked={selectedAllowances.includes(index)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedAllowances(prev => [...prev, index]);
                                                    } else {
                                                        setSelectedAllowances(prev => prev.filter(i => i !== index));
                                                    }
                                                }}
                                                className="h-5 w-5"
                                            />
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm">{all.type}</div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant="secondary" className="font-bold">
                                                    {all.amount.toLocaleString()}₮
                                                </Badge>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {all.period === 'monthly' ? 'Сар бүр' : 
                                                     all.period === 'yearly' ? 'Жил бүр' : 
                                                     all.period === 'once' ? 'Нэг удаа' : all.period}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {allowances.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Gift className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Хангамж тохируулаагүй</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}

                    {/* Step 6: Onboarding Selection */}
                    {step === WIZARD_STEPS.ONBOARDING && (
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-4">
                                <div className="text-center mb-4">
                                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-blue-100 text-blue-600 mb-2">
                                        <GraduationCap className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-bold">Чиглүүлэх хөтөлбөр (Onboarding)</h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {hasOnboardingProgram 
                                            ? 'Энэ ажлын байранд onboarding хөтөлбөр тохируулагдсан' 
                                            : 'Onboarding хөтөлбөр тохируулаагүй'
                                        }
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            setEnableOnboarding(true);
                                            goToNextStep(WIZARD_STEPS.ONBOARDING);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left group",
                                            "border-slate-200 bg-white hover:border-blue-400 hover:shadow-md"
                                        )}
                                    >
                                        <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Check className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold">Тийм, эхлүүлэх</div>
                                            <div className="text-xs text-muted-foreground">Onboarding хөтөлбөр автоматаар эхэлнэ</div>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                    </button>

                                    <button
                                        onClick={() => {
                                            setEnableOnboarding(false);
                                            goToNextStep(WIZARD_STEPS.ONBOARDING);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left group",
                                            "border-slate-200 bg-white hover:border-slate-400 hover:shadow-md"
                                        )}
                                    >
                                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                                            <X className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold">Үгүй, алгасах</div>
                                            <div className="text-xs text-muted-foreground">Onboarding хөтөлбөргүйгээр томилно</div>
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
                                    </button>
                                </div>
                            </div>
                        </ScrollArea>
                    )}

                    {/* Step 7: Document Custom Inputs */}
                    {step === WIZARD_STEPS.DOCUMENT_INPUTS && (
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-4">
                                <div className="text-center mb-4">
                                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-100 text-indigo-600 mb-2">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-bold">Баримтын мэдээлэл бөглөх</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Томилгооны баримтад шаардлагатай мэдээллүүд</p>
                                </div>

                                {templateLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : templateData?.customInputs?.length ? (
                                    <div className="space-y-4">
                                        {templateData.customInputs.map(input => (
                                            <div key={input.key} className="space-y-1.5">
                                                <Label className="text-xs font-semibold">
                                                    {input.label} {input.required && <span className="text-rose-500">*</span>}
                                                </Label>
                                                {input.type === 'date' ? (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "h-10 w-full justify-start text-left font-medium rounded-xl",
                                                                    !customInputValues[input.key] && "text-muted-foreground"
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {customInputValues[input.key] 
                                                                    ? format(new Date(customInputValues[input.key]), "PPP", { locale: mn }) 
                                                                    : "Огноо сонгох"
                                                                }
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={customInputValues[input.key] ? new Date(customInputValues[input.key]) : undefined}
                                                                onSelect={(date) => setCustomInputValues(prev => ({ 
                                                                    ...prev, 
                                                                    [input.key]: date ? format(date, 'yyyy-MM-dd') : '' 
                                                                }))}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                ) : input.type === 'number' ? (
                                                    <Input
                                                        type="number"
                                                        value={customInputValues[input.key] || ''}
                                                        onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.key]: e.target.value }))}
                                                        placeholder={input.description || `${input.label} оруулна уу`}
                                                        className="h-10 rounded-xl"
                                                    />
                                                ) : input.type === 'boolean' ? (
                                                    <div className="flex items-center space-x-2 h-10 px-4 bg-slate-50 rounded-xl border">
                                                        <Switch
                                                            checked={!!customInputValues[input.key]}
                                                            onCheckedChange={(checked) => setCustomInputValues(prev => ({ ...prev, [input.key]: checked }))}
                                                        />
                                                        <span className="text-sm">{customInputValues[input.key] ? 'Тийм' : 'Үгүй'}</span>
                                                    </div>
                                                ) : (
                                                    <Input
                                                        value={customInputValues[input.key] || ''}
                                                        onChange={(e) => setCustomInputValues(prev => ({ ...prev, [input.key]: e.target.value }))}
                                                        placeholder={input.description || `${input.label} оруулна уу`}
                                                        className="h-10 rounded-xl"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Нэмэлт мэдээлэл шаардлагагүй</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}

                    {/* Loading Overlay */}
                    {isSubmitting && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
                            <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                            <div className="text-center">
                                <p className="font-bold">Томилгоо хийж байна</p>
                                <p className="text-xs text-muted-foreground">Түр хүлээнэ үү...</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-slate-50/50 shrink-0">
                    {step === WIZARD_STEPS.EMPLOYEE_SELECT ? (
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
                            Болих
                        </Button>
                    ) : step === WIZARD_STEPS.APPOINTMENT_TYPE || step === WIZARD_STEPS.SALARY_STEP || step === WIZARD_STEPS.ONBOARDING ? (
                        // Single-choice steps - only back button
                        <Button 
                            variant="outline" 
                            onClick={() => goToPreviousStep(step)} 
                            className="rounded-xl"
                            disabled={isSubmitting}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Буцах
                        </Button>
                    ) : (
                        // Multi-choice steps - back and continue buttons
                        <div className="flex w-full gap-3">
                            <Button
                                variant="outline"
                                onClick={() => goToPreviousStep(step)}
                                className="flex-1 rounded-xl"
                                disabled={isSubmitting}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Буцах
                            </Button>
                            {step === WIZARD_STEPS.DOCUMENT_INPUTS ? (
                                <Button
                                    onClick={handleStartProcess}
                                    disabled={isSubmitting || (templateData?.customInputs || []).some(i => i.required && !customInputValues[i.key])}
                                    className="flex-[2] bg-primary hover:bg-primary/90 rounded-xl"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                                    Томилгоо эхлүүлэх
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => goToNextStep(step)}
                                    className="flex-[2] rounded-xl"
                                    disabled={isSubmitting}
                                >
                                    Үргэлжлүүлэх
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            )}
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
