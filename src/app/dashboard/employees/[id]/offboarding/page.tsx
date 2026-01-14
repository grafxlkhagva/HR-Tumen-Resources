'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, addDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, PlayCircle } from 'lucide-react';
import { type Employee } from '../../data';
import { Skeleton } from '@/components/ui/skeleton';
import { OffboardingStepper } from './components/OffboardingStepper';
import { StepNotice } from './components/StepNotice';
import { StepApproval } from './components/StepApproval';
import { StepHandover } from './components/StepHandover';
import { StepAssets } from './components/StepAssets';
import { StepExitInterview } from './components/StepExitInterview';
import { StepSettlement } from './components/StepSettlement';
import { StepDocuments } from './components/StepDocuments';
import { StepDeactivation } from './components/StepDeactivation';
import { StepFarewell } from './components/StepFarewell';
import { STEPS, type OffboardingProcess } from './types';
import { useToast } from '@/hooks/use-toast';

export default function OffboardingPage() {
    const { id } = useParams();
    const router = useRouter();
    const employeeId = Array.isArray(id) ? id[0] : id;
    const { firestore } = useFirebase();
    const { toast } = useToast();

    // 1. Fetch Employee
    const employeeDocRef = React.useMemo(
        () => (firestore && employeeId ? doc(firestore, 'employees', employeeId) : null),
        [firestore, employeeId]
    );
    const { data: employee, isLoading: isLoadingEmployee } = useDoc<Employee>(employeeDocRef as any);

    // 2. Fetch Active Offboarding Process
    const processesQuery = React.useMemo(
        () => firestore && employeeId
            ? query(
                collection(firestore, `employees/${employeeId}/offboarding_processes`),
                where('status', '==', 'IN_PROGRESS')
            )
            : null,
        [firestore, employeeId]
    );
    const { data: processes, isLoading: isLoadingProcess } = useCollection<OffboardingProcess>(processesQuery as any);

    const activeProcess = processes && processes.length > 0 ? processes[0] : null;

    // Handlers
    const handleStartProcess = async () => {
        if (!firestore || !employeeId) return;

        try {
            const newProcessData: Partial<OffboardingProcess> = {
                employeeId,
                status: 'IN_PROGRESS',
                currentStep: 1,
                startedAt: new Date().toISOString(),
                notice: { isCompleted: false, type: 'RESIGNATION', reason: '', submittedAt: '', lastWorkingDate: '' },
                approval: { isCompleted: false, status: 'PENDING' },
                handover: { isCompleted: false, tasks: [] },
                assets: { isCompleted: false, items: [] },
                exitInterview: { isCompleted: false, feedback: '', reasons: [] },
                settlement: { isCompleted: false, checklist: [], salaryCalculated: false, bonusCalculated: false, vacationCalculated: false },
                documents: { isCompleted: false, referenceLetterGenerated: false, socialInsuranceBookReturned: false, otherDocuments: [] },
                deactivation: { isCompleted: false, systems: [] },
                farewell: { isCompleted: false, messageSent: false, eventOrganized: false }
            };

            await addDoc(collection(firestore, `employees/${employeeId}/offboarding_processes`), newProcessData);
            toast({ title: "Процесс эхэллээ", description: "Ажил хүлээлцэх процесс амжилттай үүслээ." });
        } catch (error) {
            console.error("Failed to start process:", error);
            toast({ variant: "destructive", title: "Алдаа", description: "Процесс үүсгэхэд алдаа гарлаа." });
        }
    };

    const handleStepClick = async (stepId: number) => {
        if (!activeProcess || !firestore) return;
        // Allow navigation to any previous step or the current step + 1 (if current is completed, logic can vary)
        // For now, just update currentStep for navigation
        const docRef = doc(firestore, `employees/${employeeId}/offboarding_processes`, activeProcess.id);
        await updateDocumentNonBlocking(docRef, { currentStep: stepId });
    };

    // Calculate completed steps for stepper
    const completedSteps = React.useMemo(() => {
        if (!activeProcess) return [];
        // This logic depends on how we flag completion. 
        // For simplicity, let's assume all steps < currentStep are potentially complete, 
        // but we should check the `isCompleted` flag of each step block if we want accuracy.
        // Let's rely on the `currentStep` as the main indicator for now, or build an array.
        const completed = [];
        if (activeProcess.notice?.isCompleted) completed.push(1);
        if (activeProcess.approval?.isCompleted) completed.push(2);
        if (activeProcess.handover?.isCompleted) completed.push(3);
        if (activeProcess.assets?.isCompleted) completed.push(4);
        if (activeProcess.exitInterview?.isCompleted) completed.push(5);
        if (activeProcess.settlement?.isCompleted) completed.push(6);
        if (activeProcess.documents?.isCompleted) completed.push(7);
        if (activeProcess.deactivation?.isCompleted) completed.push(8);
        if (activeProcess.farewell?.isCompleted) completed.push(9);
        return completed;
    }, [activeProcess]);

    // Loading State
    if (isLoadingEmployee || isLoadingProcess) {
        return (
            <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-12 w-full" />
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12">
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!employee) return <div>Employee not found</div>;

    // Render Steps
    const renderStepContent = () => {
        if (!activeProcess) return null;
        switch (activeProcess.currentStep) {
            case 1: return <StepNotice process={activeProcess} />;
            case 2: return <StepApproval process={activeProcess} />;
            case 3: return <StepHandover process={activeProcess} />;
            case 4: return <StepAssets process={activeProcess} />;
            case 5: return <StepExitInterview process={activeProcess} />;
            case 6: return <StepSettlement process={activeProcess} />;
            case 7: return <StepDocuments process={activeProcess} />;
            case 8: return <StepDeactivation process={activeProcess} />;
            case 9: return <StepFarewell process={activeProcess} />;
            default: return <StepNotice process={activeProcess} />;
        }
    };

    return (
        <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6 pb-20">
            <PageHeader
                title="Ажил хүлээлцэх"
                description={`${employee.lastName} ${employee.firstName}`}
                breadcrumbs={[
                    { label: 'Ажилтан', href: '/dashboard/employees' },
                    { label: employee.firstName, href: `/dashboard/employees/${employeeId}` },
                    { label: 'Ажил хүлээлцэх' }
                ]}
                showBackButton
                backHref={`/dashboard/employees/${employeeId}`}
            />

            {!activeProcess ? (
                <Card className="border-dashed shadow-none bg-muted/20 min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                    <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <PlayCircle className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3">Процесс эхлүүлэх</h3>
                    <p className="text-muted-foreground max-w-sm mb-8 text-base">
                        Ажилтныг ажлаас гаргах, чөлөөлөх процессыг эхлүүлэхийн тулд доорх товчлуурыг дарна уу.
                        Энэ нь 9 алхам бүхий дэлгэрэнгүй хяналтын хуудсыг үүсгэх болно.
                    </p>
                    <Button onClick={handleStartProcess} size="lg" className="gap-2 px-8">
                        Эхлүүлэх
                    </Button>
                </Card>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <OffboardingStepper
                        currentStep={activeProcess.currentStep}
                        onStepClick={handleStepClick}
                        completedSteps={completedSteps}
                    />

                    <div className="min-h-[400px]">
                        {renderStepContent()}
                    </div>
                </div>
            )}
        </div>
    );
}
