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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useFirebase,
  useMemoFirebase,
  useCollection,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

const typeSchema = z.object({
  name: z.string().min(2, {
    message: 'Төрлийн нэр дор хаяж 2 тэмдэгттэй байх ёстой.',
  }),
});

type TypeFormValues = z.infer<typeof typeSchema>;

type DepartmentType = {
  id: string;
  name: string;
};

interface ManageTypesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTypeDialog({ open, onOpenChange }: ManageTypesDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = React.useState(false);

  const departmentTypesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'departmentTypes') : null),
    [firestore]
  );
  
  const { data: departmentTypes, isLoading } = useCollection<DepartmentType>(departmentTypesCollection);

  const form = useForm<TypeFormValues>({
    resolver: zodResolver(typeSchema),
    defaultValues: {
      name: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = (data: TypeFormValues) => {
    if (!departmentTypesCollection) return;

    addDocumentNonBlocking(departmentTypesCollection, data);

    toast({
      title: 'Амжилттай',
      description: `"${data.name}" төрөл амжилттай нэмэгдлээ.`,
    });

    form.reset();
    setShowAddForm(false);
  };
  
  const handleDelete = (typeId: string, typeName: string) => {
      if (!firestore) return;
      
      const docRef = doc(firestore, 'departmentTypes', typeId);
      deleteDocumentNonBlocking(docRef);

      toast({
          title: 'Амжилттай устгагдлаа',
          description: `"${typeName}" төрөл устгагдлаа.`,
          variant: 'destructive',
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Бүтцийн төрөл</DialogTitle>
          <DialogDescription>
            Бүтцийн төрлийг удирдах (жишээ нь: Газар, хэлтэс, алба).
          </DialogDescription>
        </DialogHeader>
        
        {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Шинээр нэмэх
            </Button>
        )}

        {showAddForm && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Шинэ төрлийн нэр..." {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Нэмэх'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)} disabled={isSubmitting}>
                  Цуцлах
                </Button>
              </div>
            </form>
          </Form>
        )}

        <ScrollArea className="h-72">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                    <TableHead>Нэр</TableHead>
                    <TableHead className="text-right">Үйлдэл</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && Array.from({length: 3}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                ))}
              {departmentTypes?.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(type.id, type.name)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Устгах</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (!departmentTypes || departmentTypes.length === 0) && (
                <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                        Бүртгэгдсэн төрөл байхгүй.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}