'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  updateDocumentNonBlocking,
  useFirebase,
} from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Employee } from '../employees/data';

const assignEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Ажилтан сонгоно уу.'),
});

type AssignEmployeeFormValues = z.infer<typeof assignEmployeeSchema>;

interface Position {
  id: string;
  title: string;
  headcount: number;
  filled: number;
}

interface AssignEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position | null;
  employees: Employee[];
}

export function AssignEmployeeDialog({
  open,
  onOpenChange,
  position,
  employees,
}: AssignEmployeeDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<AssignEmployeeFormValues>({
    resolver: zodResolver(assignEmployeeSchema),
  });
  
  React.useEffect(() => {
    if(!open) {
        form.reset();
    }
  }, [open, form]);

  const { isSubmitting } = form.formState;

  const assignableEmployees = React.useMemo(() => {
    return employees.filter(emp => emp.status === 'Идэвхтэй' && !emp.positionId);
  }, [employees]);


  const onSubmit = (data: AssignEmployeeFormValues) => {
    if (!firestore || !position) return;

    const employeeDocRef = doc(firestore, 'employees', data.employeeId);
    updateDocumentNonBlocking(employeeDocRef, {
        positionId: position.id,
        jobTitle: position.title,
    });
    
    const positionDocRef = doc(firestore, 'positions', position.id);
    updateDocumentNonBlocking(positionDocRef, {
        filled: increment(1)
    });

    toast({
      title: 'Амжилттай томилогдлоо',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Ажилтан томилох</DialogTitle>
              <DialogDescription>
                "{position?.title}" ажлын байранд ажилтан томилох.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Боломжит ажилчид</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Албан тушаалгүй, идэвхтэй ажилтан сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableEmployees.length === 0 && <p className="p-2 text-sm text-muted-foreground">Томилох боломжтой ажилтан байхгүй.</p>}
                        {assignableEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({emp.employeeCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Цуцлах
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Томилох
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
