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
}

export function AssignProgramDialog({
  open,
  onOpenChange,
  employee,
}: AssignProgramDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedProgramId, setSelectedProgramId] = React.useState('');
  const [isAssigning, setIsAssigning] = React.useState(false);

  const programTemplatesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'onboardingPrograms') : null),
    [firestore]
  );
  const { data: programTemplates, isLoading: isLoadingTemplates } = useCollection<OnboardingProgram>(programTemplatesQuery);


  const assignedProgramsCollectionRef = useMemoFirebase(
    () => firestore ? collection(firestore, `employees/${employee.id}/assignedPrograms`) : null,
    [firestore, employee.id]
  );

  const handleAssign = async () => {
    if (!selectedProgramId || !firestore || !assignedProgramsCollectionRef) {
      toast({
        variant: 'destructive',
        title: 'Хөтөлбөр сонгоогүй байна',
        description: 'Жагсаалтаас оноох хөтөлбөрөө сонгоно уу.',
      });
      return;
    }
    setIsAssigning(true);

    try {
      const programTemplate = programTemplates?.find(p => p.id === selectedProgramId);
      if (!programTemplate) throw new Error('Хөтөлбөрийн загвар олдсонгүй.');

      const stagesCollectionRef = collection(firestore, `onboardingPrograms/${selectedProgramId}/stages`);
      const stagesSnapshot = await getDocs(stagesCollectionRef);

      const allTasks: any[] = [];
      const hireDate = new Date(employee.hireDate);
      
      for (const stageDoc of stagesSnapshot.docs) {
          const tasksCollectionRef = collection(firestore, stageDoc.ref.path, 'tasks');
          const tasksSnapshot = await getDocs(tasksCollectionRef);
          
          tasksSnapshot.forEach(taskDoc => {
              const taskTemplate = taskDoc.data() as OnboardingTaskTemplate;
              const dueDate = add(hireDate, { days: taskTemplate.dueDays });

              let assigneeId = employee.id;
              let assigneeName = `${employee.firstName} ${employee.lastName}`;
              
              switch(taskTemplate.assigneeType) {
                case 'NEW_HIRE':
                  assigneeId = employee.id;
                  assigneeName = `${employee.firstName} ${employee.lastName}`;
                  break;
                case 'MANAGER':
                    // TODO: Replace with actual manager lookup logic
                    assigneeId = employee.id; 
                    assigneeName = "Шууд удирдлага";
                    break;
                case 'HR':
                    // TODO: Replace with actual HR lookup logic
                    assigneeId = employee.id;
                    assigneeName = "Хүний нөөц";
                    break;
                case 'BUDDY':
                     // TODO: Replace with actual buddy lookup logic
                    assigneeId = employee.id;
                    assigneeName = "Дэмжигч ажилтан";
                    break;
              }

              allTasks.push({
                  templateTaskId: taskDoc.id,
                  title: taskTemplate.title,
                  status: 'TODO',
                  dueDate: dueDate.toISOString(),
                  assigneeId: assigneeId, 
                  assigneeName: assigneeName
              });
          });
      }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Дасан зохицох хөтөлбөр оноох</DialogTitle>
          <DialogDescription>
            {employee.firstName} {employee.lastName} ажилтанд хөтөлбөр оноох.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            {isLoadingTemplates ? (
                <Skeleton className="h-10 w-full" />
            ) : !programTemplates || programTemplates.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    Тохиргоо хэсэгт хөтөлбөрийн загвар үүсгэнэ үү.
                </div>
            ) : (
                <Select
                    value={selectedProgramId}
                    onValueChange={setSelectedProgramId}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Хөтөлбөрийн загвараас сонгоно уу..." />
                    </SelectTrigger>
                    <SelectContent>
                        {programTemplates?.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                            {program.title}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            Цуцлах
          </Button>
          <Button onClick={handleAssign} disabled={isAssigning || !selectedProgramId}>
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Оноох
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
