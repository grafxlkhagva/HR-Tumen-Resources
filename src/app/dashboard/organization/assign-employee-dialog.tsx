

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
} from '@/firebase';
import { doc, increment, writeBatch, collection, getDocs, addDoc } from 'firebase/firestore';
import { Loader2, UserPlus, UserRoundCheck, Calendar as CalendarIcon, X, Save } from 'lucide-react';
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
import type { OnboardingProgram, OnboardingTaskTemplate } from '../settings/onboarding/page';
import { Checkbox } from '@/components/ui/checkbox';
import type { AssignedProgram } from '../employees/[id]/AssignProgramDialog';


interface Position {
  id: string;
  title: string;
  filled: number;
}

const assignmentSchema = z.object({
    assignmentDate: z.date({ required_error: 'Томилох огноог сонгоно уу.' }),
    assignmentType: z.enum(['direct', 'trial']),
    trialEndDate: z.date().optional(),
    onboardingProgramIds: z.array(z.string()).optional(),
}).refine(data => {
    if (data.assignmentType === 'trial') {
        return !!data.trialEndDate;
    }
    return true;
}, { message: "Туршилтын хугацаа дуусах огноог сонгоно уу.", path: ["trialEndDate"] });

type AssignmentFormValues = z.infer<typeof assignmentSchema>;


interface AssignEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position | null;
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
  const { toast } = useToast();
  const [step, setStep] = React.useState(2);
  const [localSelectedEmployee, setLocalSelectedEmployee] = React.useState<Employee | null>(null);

  const form = useForm<AssignmentFormValues>({
      resolver: zodResolver(assignmentSchema),
      defaultValues: {
          assignmentDate: new Date(),
          assignmentType: 'direct',
          onboardingProgramIds: [],
      }
  });
  
  const { isSubmitting } = form.formState;
  const assignmentType = form.watch('assignmentType');

  // Fetch Onboarding Programs
  const programsQuery = useMemoFirebase(({ firestore }) => firestore ? collection(firestore, 'onboardingPrograms') : null, [firestore]);
  const { data: programTemplates, isLoading: isLoadingTemplates } = useCollection<OnboardingProgram>(programsQuery);
  
  // Fetch already assigned programs for the selected employee
  const assignedProgramsQuery = useMemoFirebase(({ firestore }) => (firestore && localSelectedEmployee) ? collection(firestore, `employees/${localSelectedEmployee.id}/assignedPrograms`) : null, [firestore, localSelectedEmployee]);
  const { data: assignedPrograms, isLoading: isLoadingAssigned } = useCollection<AssignedProgram>(assignedProgramsQuery);

  const availablePrograms = React.useMemo(() => {
      if (!programTemplates) return [];
      const assignedIds = new Set(assignedPrograms?.map(p => p.programId));
      return programTemplates.filter(p => !assignedIds.has(p.id));
  }, [programTemplates, assignedPrograms]);


  React.useEffect(() => {
    if (open) {
        if (selectedEmployee) {
            setLocalSelectedEmployee(selectedEmployee);
            setStep(3); // Directly go to assignment details
        } else {
            setStep(2);
            setLocalSelectedEmployee(null);
        }
        form.reset({
            assignmentDate: new Date(),
            assignmentType: 'direct',
            trialEndDate: undefined,
            onboardingProgramIds: [],
        });
    }
  }, [open, selectedEmployee, form]);

  const assignableEmployees = React.useMemo(() => {
    return employees.filter(emp => emp.status === 'Идэвхтэй' && !emp.positionId);
  }, [employees]);


  const handleFinalAssignment = async (values: AssignmentFormValues) => {
    if (!firestore || !position || !localSelectedEmployee) return;

    try {
        const batch = writeBatch(firestore);

        // 1. Update employee's document
        const employeeDocRef = doc(firestore, 'employees', localSelectedEmployee.id);
        batch.update(employeeDocRef, {
            positionId: position.id,
            jobTitle: position.title,
        });

        // 2. Update position's filled count
        const positionDocRef = doc(firestore, 'positions', position.id);
        batch.update(positionDocRef, {
            filled: increment(1)
        });

        // 3. Add to employment history
        const historyCollectionRef = collection(firestore, `employees/${localSelectedEmployee.id}/employmentHistory`);
        const historyDocRef = doc(historyCollectionRef);
        let historyNotes = `${position.title} албан тушаалд ${format(values.assignmentDate, 'yyyy-MM-dd')}-нд томилов.`;
        if(values.assignmentType === 'trial' && values.trialEndDate) {
            historyNotes += ` Туршилтын хугацаа ${format(values.trialEndDate, 'yyyy-MM-dd')} хүртэл.`
        }

        batch.set(historyDocRef, {
            eventType: 'Албан тушаалд томилогдсон',
            eventDate: values.assignmentDate.toISOString(),
            notes: historyNotes,
            createdAt: new Date().toISOString(),
        });
        
        await batch.commit();

        // 4. Assign onboarding programs
        if (values.onboardingProgramIds && values.onboardingProgramIds.length > 0) {
            const assignedProgramsCollectionRef = collection(firestore, `employees/${localSelectedEmployee.id}/assignedPrograms`);

            for (const programId of values.onboardingProgramIds) {
                const programTemplate = programTemplates?.find(p => p.id === programId);
                if (!programTemplate) continue;

                const stagesSnapshot = await getDocs(collection(firestore, `onboardingPrograms/${programId}/stages`));
                const allTasks: any[] = [];
                const hireDate = new Date(localSelectedEmployee.hireDate);

                for (const stageDoc of stagesSnapshot.docs) {
                    const tasksSnapshot = await getDocs(collection(firestore, stageDoc.ref.path, 'tasks'));
                    tasksSnapshot.forEach(taskDoc => {
                         const taskTemplate = taskDoc.data() as OnboardingTaskTemplate;
                         const dueDate = add(hireDate, { days: taskTemplate.dueDays });

                          let assigneeId = localSelectedEmployee.id;
                          let assigneeName = `${localSelectedEmployee.firstName} ${localSelectedEmployee.lastName}`;

                         switch(taskTemplate.assigneeType) {
                            case 'NEW_HIRE': break;
                            // TODO: Add real logic for other assignee types
                            case 'MANAGER': assigneeName = "Шууд удирдлага"; break;
                            case 'HR': assigneeName = "Хүний нөөц"; break;
                            case 'BUDDY': assigneeName = "Дэмжигч ажилтан"; break;
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
                await addDoc(assignedProgramsCollectionRef, {
                    programId: programTemplate.id,
                    programName: programTemplate.title,
                    status: 'IN_PROGRESS',
                    startDate: new Date().toISOString(),
                    progress: 0,
                    tasks: allTasks,
                });
            }
        }

        toast({
            title: 'Амжилттай томилогдлоо',
        });
        
    } catch(error) {
        console.error("Error assigning employee: ", error);
        toast({
            variant: "destructive",
            title: "Алдаа",
            description: "Ажилтан томилоход алдаа гарлаа."
        });
    } finally {
        onOpenChange(false);
        onAssignmentComplete();
    }
  };
  
  const handleEmployeeSelect = (employee: Employee) => {
      setLocalSelectedEmployee(employee);
      setStep(3);
  }

  const renderStepTwo = () => (
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

  const renderStepThree = () => (
      <Form {...form}>
        <form onSubmit={(e) => { e.preventDefault(); setStep(4); }} className="space-y-4 pt-4">
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
             <FormField
                control={form.control}
                name="assignmentDate"
                render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Томилогдох огноо</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
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
            )}/>
            {assignmentType === 'trial' && (
                 <FormField
                    control={form.control}
                    name="trialEndDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Туршилт дуусах огноо</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "yyyy-MM-dd")) : (<span>Огноо сонгох</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
             <DialogFooter>
              <Button type="button" variant="outline" onClick={() => selectedEmployee ? onOpenChange(false) : setStep(2)} disabled={isSubmitting}>Буцах</Button>
              <Button type="submit">Үргэлжлүүлэх</Button>
            </DialogFooter>
        </form>
      </Form>
  )

  const renderStepFour = () => (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFinalAssignment)} className="space-y-4 pt-4">
            <FormItem>
                <FormLabel>Дасан зохицох хөтөлбөр сонгох</FormLabel>
                <FormDescription>Томилгоо хийгдсэний дараа эдгээр хөтөлбөрүүд ажилтанд автоматаар оноогдоно.</FormDescription>
                <ScrollArea className="h-60 rounded-md border p-2">
                    <div className="space-y-2 p-2">
                    {isLoadingTemplates || isLoadingAssigned ? <Skeleton className="h-10 w-full" /> : 
                        availablePrograms?.map((program) => (
                            <FormField
                                key={program.id}
                                control={form.control}
                                name="onboardingProgramIds"
                                render={({ field }) => (
                                    <FormItem
                                    key={program.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-3 hover:bg-muted/50"
                                    >
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(program.id)}
                                                onCheckedChange={(checked) => {
                                                    return checked
                                                    ? field.onChange([...(field.value || []), program.id])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                        (value) => value !== program.id
                                                        )
                                                    )
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal w-full cursor-pointer">{program.title}</FormLabel>
                                    </FormItem>
                                )}
                            />
                        ))}
                        {!isLoadingTemplates && !isLoadingAssigned && availablePrograms?.length === 0 && (
                             <p className="text-center text-sm text-muted-foreground p-4">Шинэ хөтөлбөр байхгүй байна.</p>
                        )}
                    </div>
                </ScrollArea>
            </FormItem>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStep(3)}>Буцах</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Баталгаажуулах</Button>
            </DialogFooter>
        </form>
      </Form>
  )


  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>"{position?.title}" ажлын байранд томилгоо хийх</DialogTitle>
            <DialogDescription>
              {step === 2 && 'Томилох ажилтнаа сонгоно уу.'}
              {step === 3 && 'Томилгооны мэдээллийг оруулна уу.'}
              {step === 4 && 'Хөтөлбөр оноох (заавал биш).'}
            </DialogDescription>
          </DialogHeader>
          
          {isSubmitting && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          
          {step === 2 && renderStepTwo()}
          {step === 3 && localSelectedEmployee && renderStepThree()}
          {step === 4 && localSelectedEmployee && renderStepFour()}

        </DialogContent>
      </Dialog>
  );
}
