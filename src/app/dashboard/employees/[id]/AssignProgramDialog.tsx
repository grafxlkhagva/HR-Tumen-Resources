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
} from '@/firebase';
import { collection, doc, getDocs } from 'firebase/firestore';
import type { Employee } from '../data';
import type { OnboardingProgram, OnboardingTaskTemplate } from '../../settings/onboarding/page';
import { add } from 'date-fns';

interface AssignProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  programTemplates: OnboardingProgram[];
}

export function AssignProgramDialog({
  open,
  onOpenChange,
  employee,
  programTemplates,
}: AssignProgramDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedProgramId, setSelectedProgramId] = React.useState('');
  const [isAssigning, setIsAssigning] = React.useState(false);

  const assignedProgramsCollectionRef = useMemoFirebase(
    () => collection(firestore, `employees/${employee.id}/assignedPrograms`),
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
      const programTemplate = programTemplates.find(p => p.id === selectedProgramId);
      if (!programTemplate) throw new Error('Хөтөлбөрийн загвар олдсонгүй.');

      const stagesCollectionRef = collection(firestore, `onboardingPrograms/${selectedProgramId}/stages`);
      const stagesSnapshot = await getDocs(stagesCollectionRef);

      const allTasks: any[] = [];
      for (const stageDoc of stagesSnapshot.docs) {
          const tasksCollectionRef = collection(firestore, stageDoc.ref.path, 'tasks');
          const tasksSnapshot = await getDocs(tasksCollectionRef);
          tasksSnapshot.forEach(taskDoc => {
              const taskTemplate = taskDoc.data() as OnboardingTaskTemplate;
              const hireDate = new Date(employee.hireDate);
              const dueDate = add(hireDate, { days: taskTemplate.dueDays });

              allTasks.push({
                  templateTaskId: taskDoc.id,
                  title: taskTemplate.title,
                  status: 'TODO',
                  dueDate: dueDate.toISOString(),
                  assigneeId: employee.id, // Placeholder, needs logic for manager, etc.
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
          <Select
            value={selectedProgramId}
            onValueChange={setSelectedProgramId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Хөтөлбөрийн загвараас сонгоно уу..." />
            </SelectTrigger>
            <SelectContent>
              {programTemplates.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
