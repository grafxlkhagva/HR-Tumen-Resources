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
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const positionSchema = z.object({
  title: z.string().min(2, 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.'),
  departmentId: z.string().min(1, 'Хэлтэс сонгоно уу.'),
  reportsTo: z.string().optional(),
  levelId: z.string().min(1, 'Зэрэглэл сонгоно уу.'),
  employmentTypeId: z.string().min(1, 'Ажил эрхлэлтийн төрөл сонгоно уу.'),
  isActive: z.boolean().default(true),
  jobCategoryId: z.string().optional(),
  headcount: z.coerce.number().min(1, 'Орон тоо 1-ээс бага байж болохгүй.'),
  createdAt: z.date({
    required_error: 'Батлагдсан огноог сонгоно уу.',
  }),
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
  reportsTo?: string;
  levelId?: string;
  employmentTypeId?: string;
  jobCategoryId?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface AddPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Reference[];
  allPositions: Position[];
  positionLevels: Reference[];
  employmentTypes: Reference[];
  jobCategories: JobCategoryReference[];
  editingPosition?: Position | null;
}

export function AddPositionDialog({
  open,
  onOpenChange,
  departments,
  allPositions,
  positionLevels,
  employmentTypes,
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
      reportsTo: '',
      levelId: '',
      employmentTypeId: '',
      isActive: true,
      headcount: 1,
      jobCategoryId: '',
      createdAt: new Date(),
    },
  });

  React.useEffect(() => {
    if (editingPosition) {
      form.reset({
        ...editingPosition,
        headcount: editingPosition.headcount || 1,
        levelId: editingPosition.levelId || '',
        employmentTypeId: editingPosition.employmentTypeId || '',
        reportsTo: editingPosition.reportsTo || '(none)',
        isActive: editingPosition.isActive === undefined ? true : editingPosition.isActive,
        jobCategoryId: editingPosition.jobCategoryId || '',
        createdAt: editingPosition.createdAt ? new Date(editingPosition.createdAt) : new Date(),
      });
    } else {
      form.reset({
        title: '',
        departmentId: '',
        reportsTo: '(none)',
        levelId: '',
        employmentTypeId: '',
        jobCategoryId: '',
        isActive: true,
        headcount: 1,
        createdAt: new Date(),
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
    
    const dataWithISOStringDate = {
        ...data,
        createdAt: data.createdAt.toISOString(),
        reportsTo: data.reportsTo === '(none)' ? undefined : data.reportsTo,
    };

    const finalData = isEditMode && editingPosition ? {
      ...dataWithISOStringDate,
    } : {
      ...dataWithISOStringDate,
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
                name="reportsTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Шууд харьяалагдах албан тушаал</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Удирдах албан тушаал сонгох" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="(none)">(Шууд удирдлагагүй)</SelectItem>
                        {(allPositions || []).filter(p => p.id !== editingPosition?.id).map((pos) => (
                          <SelectItem key={pos.id} value={pos.id}>
                            {pos.title}
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
               <FormField
                control={form.control}
                name="createdAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Батлагдсан огноо</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "yyyy-MM-dd")
                            ) : (
                              <span>Огноо сонгох</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 sm:col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Идэвхтэй эсэх</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
