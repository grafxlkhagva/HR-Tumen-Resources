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
  level: z.enum(['Executive', 'Manager', 'Senior', 'Mid-level', 'Junior', 'Intern']),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']),
  jobCategoryCode: z.string().optional(),
  headcount: z.coerce.number().min(1, 'Орон тоо 1-ээс бага байж болохгүй.'),
  filled: z.coerce.number().min(0).optional(),
  status: z.enum(['Нээлттэй', 'Хаалттай', 'Хүлээгдэж буй']).default('Нээлттэй'),
});

type PositionFormValues = z.infer<typeof positionSchema>;

interface Position {
  id: string;
  title: string;
  departmentId: string;
  headcount: number;
  filled: number;
  level?: 'Executive' | 'Manager' | 'Senior' | 'Mid-level' | 'Junior' | 'Intern';
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  jobCategoryCode?: string;
  status?: 'Нээлттэй' | 'Хаалттай' | 'Хүлээгдэж буй';
}

interface AddPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: { id: string; name: string }[];
  editingPosition?: Position | null;
}

export function AddPositionDialog({
  open,
  onOpenChange,
  departments,
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
      headcount: 1,
      filled: 0,
      jobCategoryCode: '',
      status: 'Нээлттэй',
    },
  });

  React.useEffect(() => {
    if (editingPosition) {
      form.reset({
        ...editingPosition,
        headcount: editingPosition.headcount || 1,
        filled: editingPosition.filled || 0,
        status: editingPosition.status || 'Нээлттэй',
      });
    } else {
      form.reset({
        title: '',
        departmentId: '',
        level: 'Junior',
        employmentType: 'Full-time',
        jobCategoryCode: '',
        headcount: 1,
        filled: 0,
        status: 'Нээлттэй',
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

    const finalData = {
        ...data,
        filled: data.filled || 0,
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
                name="level"
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
                        <SelectItem value="Executive">Удирдах</SelectItem>
                        <SelectItem value="Manager">Менежер</SelectItem>
                        <SelectItem value="Senior">Ахлах</SelectItem>
                        <SelectItem value="Mid-level">Дунд</SelectItem>
                        <SelectItem value="Junior">Дэвжих</SelectItem>
                        <SelectItem value="Intern">Дадлагажигч</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employmentType"
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
                        <SelectItem value="Full-time">Үндсэн</SelectItem>
                        <SelectItem value="Part-time">Цагийн</SelectItem>
                        <SelectItem value="Contract">Гэрээт</SelectItem>
                        <SelectItem value="Internship">Дадлага</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="jobCategoryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ажил мэргэжлийн ангилал</FormLabel>
                    <FormControl>
                      <Input placeholder="ҮАМАТ код (жишээ нь: 2512)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
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
                        <SelectItem value="Нээлттэй">Нээлттэй</SelectItem>
                        <SelectItem value="Хаалттай">Хаалттай</SelectItem>
                        <SelectItem value="Хүлээгдэж буй">Хүлээгдэж буй</SelectItem>
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
                    <FormLabel>Нийт орон тоо</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="filled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ажиллаж буй</FormLabel>
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

