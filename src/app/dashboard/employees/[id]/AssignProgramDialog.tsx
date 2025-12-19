

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
import { collection, getDocs } from 'firebase/firestore';
import type { Employee } from '../data';
import { add } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { OnboardingProgram, OnboardingTaskTemplate } from '../../settings/onboarding/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Card } from '@/components/ui/card';

export type AssignedTask = {
    templateTaskId: string;
    title: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';
    dueDate: string;
    completedAt?: string;
    assigneeId: string;
    assigneeName?: string;
};

export type AssignedProgram = {
    id: string;
    programId: string;
    programName: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    startDate: string;
    progress: number;
    tasks: AssignedTask[];
}


interface AssignProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  assignedProgramIds: string[];
}

interface TaskWithTemplate extends OnboardingTaskTemplate {
    id: string;
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
  const [programTasks, setProgramTasks] = React.useState<TaskWithTemplate[]>([]);

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
            setProgramTasks([]);
            form.reset();
        }, 200)
    }
  }, [open, form]);

  const handleNextStep = async () => {
    if (!selectedProgramId || !firestore) return;
    
    setIsAssigning(true);
    const stagesCollectionRef = collection(firestore, `onboardingPrograms/${selectedProgramId}/stages`);
    const stagesSnapshot = await getDocs(stagesCollectionRef);

    const tasks: TaskWithTemplate[] = [];
    for (const stageDoc of stagesSnapshot.docs) {
        const tasksCollectionRef = collection(firestore, stageDoc.ref.path, 'tasks');
        const tasksSnapshot = await getDocs(tasksCollectionRef);
        tasksSnapshot.forEach(taskDoc => {
            tasks.push({ id: taskDoc.id, ...taskDoc.data() as OnboardingTaskTemplate });
        });
    }
    setProgramTasks(tasks);
    
    // Set default values for the form
    const defaultValues: Record<string, string> = {};
    tasks.forEach(task => {
        let defaultAssigneeId = '';
         if (task.assigneeType === 'NEW_HIRE') {
            defaultAssigneeId = employee.id;
        } else if (task.guideEmployeeIds && task.guideEmployeeIds.length === 1) {
            defaultAssigneeId = task.guideEmployeeIds[0];
        }
        defaultValues[task.id] = defaultAssigneeId;
    });
    form.reset(defaultValues);

    setIsAssigning(false);
    setStep(2);
  }

  const handleAssign = async (data: Record<string, string>) => {
    if (!selectedProgramId || !firestore || !assignedProgramsCollectionRef || !allEmployees) {
      return;
    }
    setIsAssigning(true);

    try {
      const programTemplate = programTemplates?.find(p => p.id === selectedProgramId);
      if (!programTemplate) throw new Error('Хөтөлбөрийн загвар олдсонгүй.');

      const hireDate = new Date(employee.hireDate);
      const allTasks: AssignedTask[] = programTasks.map(task => {
          const assigneeId = data[task.id];
          const assignee = allEmployees.find(emp => emp.id === assigneeId);
          const dueDate = add(hireDate, { days: task.dueDays });

          return {
              templateTaskId: task.id,
              title: task.title,
              status: 'TODO',
              dueDate: dueDate.toISOString(),
              assigneeId: assigneeId, 
              assigneeName: assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Тодорхойгүй'
          }
      });
      
      await addDocumentNonBlocking(assignedProgramsCollectionRef, {
        programId: programTemplate.id,
        programName: programTemplate.title,
        status: 'IN_PROGRESS',
        startDate: new Date().toISOString(),
        progress: 0,
        tasks: allTasks,
      });

      toast({
        title: 'Амжилттай оноолоо',
        description: `${employee.firstName}-д "${programTemplate.title}" хөтөлбөрийг оноолоо.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Хөтөлбөр онооход алдаа гарлаа: ", error);
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: (error as Error).message,
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
            <ScrollArea className="h-96 -mx-6 px-6">
                <div className="py-4 space-y-4">
                    {programTasks.map(task => {
                        const guideEmployees = task.guideEmployeeIds?.map(id => employeeMap.get(id)).filter(Boolean) as Employee[] || [];
                        const isSingleOption = task.assigneeType === 'NEW_HIRE' || guideEmployees.length <= 1;
                        let defaultAssignee: Employee | undefined = undefined;
                        if(task.assigneeType === 'NEW_HIRE') defaultAssignee = employee;
                        else if (guideEmployees.length === 1) defaultAssignee = guideEmployees[0];

                        return (
                        <Card key={task.id} className="p-4">
                            <FormField
                                control={form.control}
                                name={task.id}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold">{task.title}</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value} 
                                        disabled={isSingleOption}
                                    >
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                defaultAssignee ? `${defaultAssignee.firstName} ${defaultAssignee.lastName}` :
                                                "Гүйцэтгэгч сонгоно уу..."} />
                                        </SelectTrigger>
                                        </FormControl>
                                        {!isSingleOption && (
                                            <SelectContent>
                                                {guideEmployees.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.firstName} {emp.lastName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        )}
                                    </Select>
                                </FormItem>
                                )}
                            />
                        </Card>
                    )})}
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Дасан зохицох хөтөлбөр оноох</DialogTitle>
          <DialogDescription>
            {step === 1 && `${employee.firstName}-д хөтөлбөр сонгож онооно уу.`}
            {step === 2 && 'Даалгавар гүйцэтгэгчдийг тохируулна уу.'}
          </DialogDescription>
        </DialogHeader>
        {step === 1 && renderStepOne()}
        {step === 2 && renderStepTwo()}
      </DialogContent>
    </Dialog>
  );
}
