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
  useFirebase,
  useMemoFirebase,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const departmentSchema = z.object({
  name: z.string().min(2, {
    message: 'Нэгжийн нэр дор хаяж 2 тэмдэгттэй байх ёстой.',
  }),
  description: z.string().optional(),
  typeId: z.string().min(1, 'Төрөл сонгоно уу.'),
  parentId: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface AddDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string }[];
  departmentTypes: { id: string; name: string }[];
}

export function AddDepartmentDialog({
  open,
  onOpenChange,
  departments,
  departmentTypes,
}: AddDepartmentDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
      typeId: '',
      parentId: '',
    },
  });

  const { isSubmitting } = form.formState;

  const departmentsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'departments') : null),
    [firestore]
  );

  const onSubmit = (data: DepartmentFormValues) => {
    if (!departmentsCollection) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Firestore-той холбогдож чадсангүй.',
      });
      return;
    }

    addDocumentNonBlocking(departmentsCollection, data);

    toast({
      title: 'Амжилттай',
      description: `"${data.name}" нэгж амжилттай нэмэгдлээ.`,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Бүтцийн нэгж нэмэх</DialogTitle>
              <DialogDescription>
                Шинэ хэлтэс, алба, баг зэрэг бүтцийн нэгжийг нэмнэ үү.
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тайлбар</FormLabel>
                    <FormControl>
                      <Input placeholder="Нэмэлт тайлбар (заавал биш)" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Дээд нэгжийг сонгох (заавал биш)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">(Дээд нэгж байхгүй)</SelectItem>
                        {departments.map((dept) => (
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
                Хадгалах
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
