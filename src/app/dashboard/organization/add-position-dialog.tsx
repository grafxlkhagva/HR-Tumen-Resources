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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormDescription,
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
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AddDepartmentDialog } from './add-department-dialog';


const positionSchema = z.object({
  title: z.string().min(2, 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.'),
  departmentId: z.string().min(1, 'Хэлтэс сонгоно уу.'),
  reportsTo: z.string().optional(),
  levelId: z.string().min(1, 'Зэрэглэл сонгоно уу.'),
  employmentTypeId: z.string().min(1, 'Ажил эрхлэлтийн төрөл сонгоно уу.'),
  workScheduleId: z.string().optional(),
  isActive: z.boolean().default(true),
  jobCategoryId: z.string().optional(),
  createdAt: z.date({
    required_error: 'Батлагдсан огноог сонгоно уу.',
  }),
  canApproveAttendance: z.boolean().default(false),
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
  filled: number;
  reportsTo?: string;
  levelId?: string;
  employmentTypeId?: string;
  jobCategoryId?: string;
  workScheduleId?: string;
  isActive?: boolean;
  createdAt?: string;
  canApproveAttendance?: boolean;
}

interface AddPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Reference[];
  departmentTypes: Reference[];
  allPositions: Position[] | null;
  positionLevels: Reference[];
  employmentTypes: Reference[];
  jobCategories: JobCategoryReference[];
  workSchedules: Reference[];
  editingPosition?: Position | null;
}

export function AddPositionDialog({
  open,
  onOpenChange,
  departments,
  departmentTypes,
  allPositions,
  positionLevels,
  employmentTypes,
  jobCategories,
  workSchedules,
  editingPosition,
}: AddPositionDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isEditMode = !!editingPosition;
  const [isAddDeptOpen, setIsAddDeptOpen] = React.useState(false);


  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: '',
      departmentId: '',
      reportsTo: '(none)',
      levelId: '',
      employmentTypeId: '',
      workScheduleId: '',
      isActive: true,
      jobCategoryId: '',
      createdAt: new Date(),
      canApproveAttendance: false,
    },
  });

  React.useEffect(() => {
    if (editingPosition) {
      form.reset({
        ...editingPosition,
        levelId: editingPosition.levelId || '',
        employmentTypeId: editingPosition.employmentTypeId || '',
        workScheduleId: editingPosition.workScheduleId || '',
        reportsTo: editingPosition.reportsTo || '(none)',
        isActive: editingPosition.isActive === undefined ? true : editingPosition.isActive,
        jobCategoryId: editingPosition.jobCategoryId || '',
        createdAt: editingPosition.createdAt ? new Date(editingPosition.createdAt) : new Date(),
        canApproveAttendance: editingPosition.canApproveAttendance || false,
      });
    } else {
      form.reset({
        title: '',
        departmentId: '',
        reportsTo: '(none)',
        levelId: '',
        employmentTypeId: '',
        workScheduleId: '',
        jobCategoryId: '',
        isActive: true,
        createdAt: new Date(),
        canApproveAttendance: false,
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
    
    const baseData: any = {
      title: data.title,
      departmentId: data.departmentId,
      levelId: data.levelId,
      employmentTypeId: data.employmentTypeId,
      workScheduleId: data.workScheduleId,
      isActive: data.isActive,
      jobCategoryId: data.jobCategoryId,
      createdAt: data.createdAt.toISOString(),
      canApproveAttendance: data.canApproveAttendance,
    };

    if (data.reportsTo && data.reportsTo !== '(none)') {
      baseData.reportsTo = data.reportsTo;
    }
    
    if (isEditMode && editingPosition) {
        const docRef = doc(firestore, 'positions', editingPosition.id);
        updateDocumentNonBlocking(docRef, baseData);
        toast({ title: 'Амжилттай шинэчлэгдлээ' });
    } else {
        if (!positionsCollection) return;
        const finalData = { ...baseData, filled: 0 };
        addDocumentNonBlocking(positionsCollection, finalData);
        toast({ title: 'Амжилттай нэмэгдлээ' });
    }

    onOpenChange(false);
  };
  
  const handleDelete = () => {
    if (!firestore || !editingPosition || editingPosition.filled > 0) return;
    
    const docRef = doc(firestore, 'positions', editingPosition.id);
    deleteDocumentNonBlocking(docRef);
    
    toast({
      variant: 'destructive',
      title: 'Амжилттай устгагдлаа',
      description: `"${editingPosition.title}" ажлын байр устгагдлаа.`,
    });
    
    onOpenChange(false);
  }

  return (
    <>
    <AddDepartmentDialog 
        open={isAddDeptOpen}
        onOpenChange={setIsAddDeptOpen}
        departments={departments}
        departmentTypes={departmentTypes}
    />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{isEditMode ? 'Ажлын байр засах' : 'Ажлын байр нэмэх'}</DialogTitle>
          <DialogDescription>
            Байгууллагынхаа ажлын байрны мэдээллийг эндээс удирдна уу.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Үндсэн мэдээлэл</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Албан тушаалын нэр</FormLabel>
                                <FormControl>
                                    <Input placeholder="Жишээ нь: Програм хангамжийн ахлах инженер" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="departmentId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Харьяалагдах хэлтэс</FormLabel>
                                    <Select onValueChange={(value) => {
                                        if (value === '__add_new__') {
                                            setIsAddDeptOpen(true);
                                        } else {
                                            field.onChange(value);
                                        }
                                    }} value={field.value}>
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
                                         <SelectItem value="__add_new__" className="font-bold text-primary mt-2">
                                            + Шинэ нэгж нэмэх...
                                        </SelectItem>
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
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ангилал</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        </div>
                        <FormField
                            control={form.control}
                            name="jobCategoryId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Ажил мэргэжлийн ангилал (ҮАМАТ)</FormLabel>
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
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Нэмэлт тохиргоо</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="workScheduleId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ажлын цагийн хуваарь</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Цагийн хуваарь сонгох" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {workSchedules.map((schedule) => (
                                    <SelectItem key={schedule.id} value={schedule.id}>
                                      {schedule.name}
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
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
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
                        <FormField
                          control={form.control}
                          name="canApproveAttendance"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Ирцийн хүсэлт батлах эсэх</FormLabel>
                                <FormDescription>
                                  Энэ ажлын байр нь доод албан тушаалтнуудынхаа ирцийн хүсэлтийг батлах эрхтэй эсэхийг тодорхойлно.
                                </FormDescription>
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
                    </CardContent>
                </Card>
            </div>

            <DialogFooter className="p-6 pt-4 border-t sticky bottom-0 bg-background z-10 flex justify-between">
                <div>
                     {isEditMode && (
                        <AlertDialog>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {/* This div is necessary for the tooltip to work on a disabled button */}
                                        <div> 
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    disabled={(editingPosition?.filled || 0) > 0}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Устгах
                                                </Button>
                                            </AlertDialogTrigger>
                                        </div>
                                    </TooltipTrigger>
                                    {(editingPosition?.filled || 0) > 0 && (
                                        <TooltipContent>
                                            <p>Энэ ажлын байранд ажилтан томилогдсон тул устгах боломжгүй.</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{editingPosition?.title}" ажлын байрыг бүрмөсөн устгах болно.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Тийм, устгах</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Цуцлах
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Шинэчлэх' : 'Хадгалах'}
                    </Button>
                </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  );
}
