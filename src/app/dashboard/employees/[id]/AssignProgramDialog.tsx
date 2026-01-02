'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFirebase,
  useMemoFirebase,
  addDocumentNonBlocking,
  useCollection,
} from '@/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { Employee } from '../data';
import { add } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { OnboardingProgram, OnboardingTaskTemplate, OnboardingStage } from '../../settings/onboarding/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export type AssignedTask = {
  templateTaskId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';
  requiresVerification?: boolean;
  verificationRole?: 'MANAGER' | 'HR' | 'BUDDY' | 'DIRECT_MANAGER' | null;
  verifiedBy?: string;
  verifiedAt?: string;
  assigneeType?: string;
  dueDate: string;
  completedAt?: string;
  assigneeId: string;
  assigneeName?: string;
  // Resources
  attachments?: { name: string; url: string; type: string }[];
  comment?: string;
};

export type AssignedStage = {
  stageId: string;
  title: string;
  order: number;
  tasks: AssignedTask[];
}

export type AssignedProgram = {
  id: string;
  programId: string;
  employeeId: string;
  programName: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startDate: string;
  progress: number; // 0-100
  tasks: AssignedTask[]; // LEGACY: kept for type safety if needed, but stages should be used
  stages: AssignedStage[]; // NEW: Hierarchical structure
}


interface AssignProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  assignedProgramIds: string[];
}

// Extend interface locally to ensure safety and fix missing properties
interface TaskWithTemplate extends Omit<OnboardingTaskTemplate, 'assigneeType' | 'dueDays'> {
  id: string;
  assigneeType?: string;
  requiresVerification?: boolean;
  verificationRole?: 'MANAGER' | 'HR' | 'BUDDY' | 'DIRECT_MANAGER';
  guideEmployeeIds?: string[];
  dueDays?: number;
}

interface StageWithTasks extends OnboardingStage {
  tasks: TaskWithTemplate[];
}

export function AssignProgramDialog({
  open,
  onOpenChange,
  employee,
  assignedProgramIds,
}: AssignProgramDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedProgramId, setSelectedProgramId] = React.useState('');
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [step, setStep] = React.useState(1);
  const [programStages, setProgramStages] = React.useState<StageWithTasks[]>([]);

  const form = useForm();

  const programTemplatesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'onboardingPrograms') : null),
    [firestore]
  );
  const allEmployeesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'employees') : null),
    [firestore]
  );

  const { data: programTemplates, isLoading: isLoadingTemplates } = useCollection<OnboardingProgram>(programTemplatesQuery);
  const { data: allEmployees, isLoading: isLoadingEmployees } = useCollection<Employee>(allEmployeesQuery);


  const assignedProgramsCollectionRef = useMemoFirebase(
    () => firestore ? collection(firestore, `employees/${employee.id}/assignedPrograms`) : null,
    [firestore, employee.id]
  );

  const availablePrograms = React.useMemo(() => {
    if (!programTemplates) return [];
    return programTemplates.filter(p => !assignedProgramIds.includes(p.id));
  }, [programTemplates, assignedProgramIds]);


  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setSelectedProgramId('');
        setProgramStages([]);
        form.reset();
      }, 200)
    }
  }, [open, form]);

  const handleNextStep = async () => {
    if (!selectedProgramId || !firestore) return;

    try {
      setIsAssigning(true);
      const stagesCollectionRef = collection(firestore, `onboardingPrograms/${selectedProgramId}/stages`);
      // Order by 'order' field
      const q = query(stagesCollectionRef, orderBy('order', 'asc'));
      const stagesSnapshot = await getDocs(q);

      const stages: StageWithTasks[] = [];
      const defaultValues: Record<string, string> = {};

      for (const stageDoc of stagesSnapshot.docs) {
        const stageData = stageDoc.data() as OnboardingStage;
        const tasksCollectionRef = collection(firestore, stageDoc.ref.path, 'tasks');
        const tasksSnapshot = await getDocs(tasksCollectionRef);

        const tasks: TaskWithTemplate[] = [];
        tasksSnapshot.forEach(taskDoc => {
          const taskData = taskDoc.data() as TaskWithTemplate;
          const task = { id: taskDoc.id, ...taskData };
          tasks.push(task);

          // Default values logic
          let defaultAssigneeId = '';
          const assigneeType = task.assigneeType || 'NEW_HIRE';

          if (assigneeType === 'NEW_HIRE') {
            // Default to new hire
            defaultAssigneeId = employee.id;
          } else if (assigneeType === 'SPECIFIC_PERSON' || assigneeType === 'BUDDY') {
            if (taskData.guideEmployeeIds && taskData.guideEmployeeIds.length === 1) {
              defaultAssigneeId = taskData.guideEmployeeIds[0];
            }
          }
          defaultValues[task.id] = defaultAssigneeId;
        });

        stages.push({
          id: stageDoc.id,
          title: stageData.title,
          order: stageData.order,
          tasks: tasks
        });
      }

      setProgramStages(stages);
      form.reset(defaultValues);
      setStep(2);
    } catch (error) {
      console.error("Error fetching stages:", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: 'Хөтөлбөрийн мэдээллийг татахад алдаа гарлаа'
      });
    } finally {
      setIsAssigning(false);
    }
  }

  const handleAssign = async (mainData: any) => {
    // Note: mainData comes from React Hook Form (FieldValues)
    if (!selectedProgramId || !firestore || !assignedProgramsCollectionRef || !allEmployees) {
      return;
    }

    setIsAssigning(true);

    try {
      const programTemplate = programTemplates?.find(p => p.id === selectedProgramId);
      if (!programTemplate) throw new Error('Хөтөлбөрийн загвар олдсонгүй.');

      // Check if all tasks have an assignee
      const missingAssignee = programStages.some(stage =>
        stage.tasks.some(task => !mainData[task.id])
      );

      if (missingAssignee) {
        toast({
          variant: 'destructive',
          title: 'Мэдээлэл дутуу байна',
          description: 'Бүх даалгаварт гүйцэтгэгч оноох шаардлагатай.'
        });
        return;
      }

      // Safely handle date parsing
      const hireDate = employee.hireDate ? new Date(employee.hireDate) : new Date();
      if (isNaN(hireDate.getTime())) {
        hireDate.setTime(Date.now());
      }

      // Transform gathered data into hierarchical structure
      const allStages: AssignedStage[] = programStages.map(stage => {
        const assignedTasks: AssignedTask[] = stage.tasks.map(task => {
          // Robustly handle optional/missing fields
          const assigneeId = (mainData[task.id] as string) || '';
          const assignee = allEmployees.find(emp => emp.id === assigneeId);

          // Ensure dueDays is a valid number, default to 1 day if missing
          const dueDays = Math.max(0, Number(task.dueDays || 1));
          const dueDate = add(hireDate, { days: dueDays });

          return {
            templateTaskId: task.id,
            title: task.title || 'Untitled Task',
            description: task.description || '',
            status: 'TODO',
            dueDate: dueDate.toISOString(),
            requiresVerification: !!task.requiresVerification,
            verificationRole: (task.verificationRole as any) || null,
            assigneeType: task.assigneeType || 'NEW_HIRE',
            assigneeId: assigneeId, // Guaranteed string
            assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Тодорхойгүй',
            attachments: task.attachmentUrl ? [{ name: task.attachmentName || 'Хавсралт', url: task.attachmentUrl, type: 'file' }] : []
          }
        });

        return {
          stageId: stage.id,
          title: stage.title,
          order: stage.order,
          tasks: assignedTasks
        }
      });

      await addDocumentNonBlocking(assignedProgramsCollectionRef, {
        programId: programTemplate.id,
        programName: programTemplate.title || 'Untitled Program',
        employeeId: employee.id,
        status: 'IN_PROGRESS',
        startDate: new Date().toISOString(),
        progress: 0,
        stages: allStages,
        tasks: [], // LEGACY: Explicitly empty to prevent migration confusion
      });

      toast({
        title: 'Амжилттай оноолоо',
        description: `${employee.firstName}-д "${programTemplate.title}" хөтөлбөрийг оноолоо.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error assigning program:", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: 'Хөтөлбөр онооход алдаа гарлаа. Системийн админд хандана уу.',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const employeeMap = React.useMemo(() => {
    if (!allEmployees) return new Map();
    return new Map(allEmployees.map(emp => [emp.id, emp]));
  }, [allEmployees]);


  const renderStepOne = () => (
    <>
      <div className="py-4">
        {isLoadingTemplates ? (
          <Skeleton className="h-10 w-full" />
        ) : !availablePrograms || availablePrograms.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Оноох боломжтой шинэ хөтөлбөрийн загвар байхгүй байна.
          </div>
        ) : (
          <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
            <SelectTrigger>
              <SelectValue placeholder="Хөтөлбөрийн загвараас сонгоно уу..." />
            </SelectTrigger>
            <SelectContent>
              {availablePrograms?.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAssigning}>
          Цуцлах
        </Button>
        <Button onClick={handleNextStep} disabled={isAssigning || !selectedProgramId}>
          {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Үргэлжлүүлэх
        </Button>
      </DialogFooter>
    </>
  );

  const renderStepTwo = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleAssign)}>
        <ScrollArea className="h-[500px] -mx-6 px-6">
          <div className="py-4 space-y-2">
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 mb-4 border border-blue-100">
              Даалгаврын гүйцэтгэгчдийг шалгаж, шаардлагатай бол өөрчилнө үү.
            </div>
            <Accordion type="multiple" defaultValue={programStages.map(s => s.id)} className="space-y-4">
              {programStages.map(stage => (
                <AccordionItem value={stage.id} key={stage.id} className="border rounded-lg px-2 bg-card">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <span className="font-semibold text-sm">{stage.title} <span className="text-muted-foreground font-normal ml-2">({stage.tasks.length} даалгавар)</span></span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 space-y-4">
                    {stage.tasks.map(task => {
                      // Legacy compatibility and type safety
                      const guideEmployees = (task.guideEmployeeIds || []).map(id => employeeMap.get(id)).filter(Boolean) as Employee[];

                      // Determine if user can select assignee
                      const assigneeType = task.assigneeType || 'NEW_HIRE';
                      const isNewHire = assigneeType === 'NEW_HIRE';
                      const isSpecific = assigneeType === 'SPECIFIC_PERSON' || assigneeType === 'BUDDY';

                      // Auto-select logic for dropdown
                      // If it's NEW_HIRE, we disable and show "Employee Name"
                      // If it's SPECIFIC with 1 guide, disable
                      const isLocked = isNewHire || (isSpecific && guideEmployees.length <= 1);

                      let defaultAssignee: Employee | undefined = undefined;
                      if (isNewHire) defaultAssignee = employee;
                      else if (guideEmployees.length === 1) defaultAssignee = guideEmployees[0];

                      return (
                        <Card key={task.id} className="p-3 bg-muted/30 border-dashed">
                          <FormField
                            control={form.control}
                            name={task.id}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="font-medium text-sm flex items-center justify-between">
                                  <span>{task.title}</span>
                                  <div className="flex gap-2">
                                    {task.requiresVerification && (
                                      <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        Шалгана
                                      </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground font-normal bg-background px-2 py-0.5 rounded border uppercase">
                                      {assigneeType === 'NEW_HIRE' ? 'Ажилтан' :
                                        assigneeType === 'MANAGER' ? 'Менежер' :
                                          assigneeType === 'HR' ? 'HR' :
                                            assigneeType === 'BUDDY' ? 'Ментор' :
                                              assigneeType}
                                    </span>
                                  </div>
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  disabled={isLocked || isAssigning}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder={
                                        defaultAssignee ? `${defaultAssignee.firstName} ${defaultAssignee.lastName}` :
                                          "Гүйцэтгэгч сонгоно уу..."} />
                                    </SelectTrigger>
                                  </FormControl>
                                  {!isLocked && (
                                    <SelectContent>
                                      {guideEmployees.length > 0 ? (
                                        guideEmployees.map(emp => (
                                          <SelectItem key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName}
                                          </SelectItem>
                                        ))
                                      ) : (
                                        allEmployees && allEmployees.map(emp => (
                                          <SelectItem key={emp.id} value={emp.id}>
                                            {emp.firstName} {emp.lastName}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  )}
                                </Select>
                              </FormItem>
                            )}
                          />
                        </Card>
                      )
                    })}
                    {stage.tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Энэ үе шатанд даалгавар байхгүй.</p>}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isAssigning}>Буцах</Button>
          <Button type="submit" disabled={isAssigning}>
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Оноох
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Дасан зохицох хөтөлбөр оноох</DialogTitle>
          <DialogDescription>
            {step === 1 && `${employee.firstName}-д хөтөлбөр сонгож онооно уу.`}
            {step === 2 && 'Үе шат бүрийн даалгаврын гүйцэтгэгчдийг хянаж баталгаажуулна уу.'}
          </DialogDescription>
        </DialogHeader>
        {step === 1 && renderStepOne()}
        {step === 2 && renderStepTwo()}
      </DialogContent>
    </Dialog>
  );
}
