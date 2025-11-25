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

const positionSchema = z.object({
  title: z.string().min(2, 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.'),
  departmentId: z.string().min(1, 'Хэлтэс сонгоно уу.'),
  levelId: z.string().min(1, 'Зэрэглэл сонгоно уу.'),
  employmentTypeId: z.string().min(1, 'Ажил эрхлэлтийн төрөл сонгоно уу.'),
  statusId: z.string().min(1, 'Төлөв сонгоно уу.'),
  jobCategoryId: z.string().optional(),
  headcount: z.coerce.number().min(1, 'Орон тоо 1-ээс бага байж болохгүй.'),
});

type PositionFormValues = z.infer<typeof positionSchema>;

interface Reference {
    id: string;
    name: string;
}

interface JobCategoryReference extends Reference {
    code: string;
}

interface Position {
  id: string;
  title: string;
  departmentId: string;
  headcount: number;
  filled: number;
  levelId?: string;
  employmentTypeId?: string;
  jobCategoryId?: string;
  statusId?: string;
}

interface AddPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Reference[];
  positionLevels: Reference[];
  employmentTypes: Reference[];
  positionStatuses: Reference[];
  jobCategories: JobCategoryReference[];
  editingPosition?: Position | null;
}

export function AddPositionDialog({
  open,
  onOpenChange,
  departments,
  positionLevels,
  employmentTypes,
  positionStatuses,
  jobCategories,
  editingPosition,
}: AddPositionDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isEditMode = !!editingPosition;

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: '',
      departmentId: '',
      levelId: '',
      employmentTypeId: '',
      statusId: '',
      headcount: 1,
      jobCategoryId: '',
    },
  });

  React.useEffect(() => {
    if (editingPosition) {
      form.reset({
        ...editingPosition,
        headcount: editingPosition.headcount || 1,
        levelId: editingPosition.levelId || '',
        employmentTypeId: editingPosition.employmentTypeId || '',
        statusId: editingPosition.statusId || '',
        jobCategoryId: editingPosition.jobCategoryId || '',
      });
    } else {
      form.reset({
        title: '',
        departmentId: '',
        levelId: '',
        employmentTypeId: '',
        statusId: '',
        jobCategoryId: '',
        headcount: 1,
      });
    }
  }, [editingPosition, open, form]);

  const { isSubmitting } = form.formState;

  const positionsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'positions') : null),
    [firestore]
  );

  const onSubmit = (data: PositionFormValues) => {
    if (!firestore) return;

    const finalData = isEditMode && editingPosition ? {
      ...data,
    } : {
      ...data,
      filled: 0, // Default to 0 for new positions
    };
    
    if (isEditMode && editingPosition) {
        const docRef = doc(firestore, 'positions', editingPosition.id);
        updateDocumentNonBlocking(docRef, finalData);
        toast({ title: 'Амжилттай шинэчлэгдлээ' });
    } else {
        if (!positionsCollection) return;
        addDocumentNonBlocking(positionsCollection, finalData);
        toast({ title: 'Амжилттай нэмэгдлээ' });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Ажлын байр засах' : 'Ажлын байр нэмэх'}</DialogTitle>
              <DialogDescription>
                Байгууллагынхаа ажлын байрны мэдээллийг эндээс удирдна уу.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Албан тушаалын нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Жишээ нь: Програм хангамжийн ахлах инженер" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Харьяалагдах хэлтэс</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Хэлтэс сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
              <FormField
                control={form.control}
                name="levelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Албан тушаалын зэрэглэл</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Зэрэглэл сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positionLevels.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                                {level.name}
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
                name="employmentTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ажил эрхлэлтийн төрөл</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Төрөл сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         {employmentTypes.map((type) => (
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
                name="jobCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ажил мэргэжлийн ангилал</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="ҮАМАТ сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         {jobCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.code} - {cat.name}
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
                name="statusId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Төлөв</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Төлөв сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positionStatuses.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                                {status.name}
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
                name="headcount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Батлагдсан орон тоо</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Цуцлах
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Шинэчлэх' : 'Хадгалах'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
