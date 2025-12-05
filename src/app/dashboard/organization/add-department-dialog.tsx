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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  useFirebase,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const departmentSchema = z.object({
  name: z.string().min(2, {
    message: 'Нэгжийн нэр дор хаяж 2 тэмдэгттэй байх ёстой.',
  }),
  typeId: z.string().min(1, 'Төрөл сонгоно уу.'),
  parentId: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface Department {
  id: string;
  name: string;
  typeId?: string;
  parentId?: string;
}

interface AddDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string }[];
  departmentTypes: { id: string; name: string }[];
  editingDepartment?: Department | null;
}

export function AddDepartmentDialog({
  open,
  onOpenChange,
  departments,
  departmentTypes,
  editingDepartment,
}: AddDepartmentDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isEditMode = !!editingDepartment;

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      typeId: '',
      parentId: '',
    },
  });

  React.useEffect(() => {
    if (isEditMode && editingDepartment) {
      form.reset({
        name: editingDepartment.name,
        typeId: editingDepartment.typeId || '',
        parentId: editingDepartment.parentId || '(none)',
      });
    } else {
      form.reset({
        name: '',
        typeId: '',
        parentId: '(none)',
      });
    }
  }, [editingDepartment, isEditMode, form, open]);


  const { isSubmitting } = form.formState;

  const departmentsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'departments') : null),
    [firestore]
  );

  const onSubmit = (data: DepartmentFormValues) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Firestore-той холбогдож чадсангүй.',
      });
      return;
    }
    
    const finalData = {
        ...data,
        parentId: data.parentId === '(none)' ? undefined : data.parentId,
    };

    if (isEditMode && editingDepartment) {
      const docRef = doc(firestore, 'departments', editingDepartment.id);
      updateDocumentNonBlocking(docRef, finalData);
      toast({
        title: 'Амжилттай шинэчлэгдлээ',
        description: `"${data.name}" нэгжийн мэдээлэл шинэчлэгдлээ.`,
      });
    } else {
       if (!departmentsCollection) return;
       addDocumentNonBlocking(departmentsCollection, finalData);
       toast({
         title: 'Амжилттай',
         description: `"${data.name}" нэгж амжилттай нэмэгдлээ.`,
       });
    }


    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Бүтцийн нэгж засах' : 'Нэгж нэмэх'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Нэгжийн мэдээллийг шинэчилнэ үү.' : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Нэгжийн нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Жишээ нь: Маркетингийн хэлтэс" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="typeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Төрөл</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Бүтцийн төрөл сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departmentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Харьяалагдах нэгж</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Дээд нэгжийг сонгох (заавал биш)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="(none)">(Дээд нэгж байхгүй)</SelectItem>
                        {departments
                         .filter(d => !editingDepartment || d.id !== editingDepartment.id)
                         .map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
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
                {isEditMode ? 'Шинэчлэх' : 'Хадгалах'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
