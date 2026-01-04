

'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
  useCollection,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2, Calendar as CalendarIcon, Trash2, PlusCircle, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { OnboardingProgram } from '../settings/onboarding/page';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';


const positionSchema = z.object({
  title: z.string().min(2, 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.'),
  departmentId: z.string().min(1, 'Хэлтэс сонгоно уу.'),
  reportsTo: z.string().optional(),
  levelId: z.string().min(1, 'Зэрэглэл сонгоно уу.'),
  employmentTypeId: z.string().min(1, 'Ажил эрхлэлтийн төрөл сонгоно уу.'),
  workScheduleId: z.string().optional(),
  onboardingProgramIds: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  jobCategoryId: z.string().optional(),
  createdAt: z.date({
    required_error: 'Батлагдсан огноог сонгоно уу.',
  }),
  canApproveAttendance: z.boolean().default(false),
  canApproveVacation: z.boolean().default(false),
  hasPointBudget: z.boolean().default(false),
  yearlyPointBudget: z.number().min(0).default(0),
});

type PositionFormValues = z.infer<typeof positionSchema>;

import { Position as JobPosition, ReferenceItem as Reference } from '@/types';

interface AddPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Reference[];
  allPositions: JobPosition[] | null;
  positionLevels: Reference[];
  employmentTypes: Reference[];
  jobCategories: any[];
  workSchedules: Reference[];
  editingPosition?: JobPosition | null;
}

export function AddPositionDialog({
  open,
  onOpenChange,
  departments,
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

  const programsQuery = useMemoFirebase(({ firestore }) => (firestore ? collection(firestore, 'onboardingPrograms') : null), [firestore]);
  const { data: onboardingPrograms } = useCollection<OnboardingProgram>(programsQuery);

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: '',
      departmentId: '',
      reportsTo: '(none)',
      levelId: '',
      employmentTypeId: '',
      workScheduleId: '',
      onboardingProgramIds: [],
      isActive: true,
      jobCategoryId: '',
      createdAt: new Date(),
      canApproveAttendance: false,
      canApproveVacation: false,
      hasPointBudget: false,
      yearlyPointBudget: 0,
    },
  });

  const watchedDepartmentId = form.watch('departmentId');

  const availablePrograms = React.useMemo(() => {
    if (!onboardingPrograms || !watchedDepartmentId) return [];

    return onboardingPrograms.filter(p => {
      const appliesTo = p.appliesTo;

      // 1. Program is global (applies to all)
      const isGlobal = !appliesTo || (!appliesTo.departmentIds?.length && !appliesTo.positionIds?.length);
      if (isGlobal) {
        return true;
      }

      // 2. Program applies to the selected department
      if (appliesTo.departmentIds?.includes(watchedDepartmentId)) {
        return true;
      }

      // 3. (Only in edit mode) Program applies specifically to this position being edited
      if (isEditMode && editingPosition && appliesTo.positionIds?.includes(editingPosition.id)) {
        return true;
      }

      return false;
    });
  }, [onboardingPrograms, watchedDepartmentId, isEditMode, editingPosition]);

  React.useEffect(() => {
    if (editingPosition) {
      form.reset({
        ...editingPosition,
        levelId: editingPosition.levelId || '',
        employmentTypeId: editingPosition.employmentTypeId || '',
        workScheduleId: editingPosition.workScheduleId || '',
        onboardingProgramIds: editingPosition.onboardingProgramIds || [],
        reportsTo: editingPosition.reportsTo || '(none)',
        isActive: editingPosition.isActive === undefined ? true : editingPosition.isActive,
        jobCategoryId: editingPosition.jobCategoryId || '',
        createdAt: editingPosition.createdAt ? new Date(editingPosition.createdAt) : new Date(),
        canApproveAttendance: editingPosition.canApproveAttendance || false,
        canApproveVacation: editingPosition.canApproveVacation || false,
        hasPointBudget: editingPosition.hasPointBudget || false,
        yearlyPointBudget: editingPosition.yearlyPointBudget || 0,
      });
    } else {
      form.reset({
        title: '',
        departmentId: '',
        reportsTo: '(none)',
        levelId: '',
        employmentTypeId: '',
        workScheduleId: '',
        onboardingProgramIds: [],
        jobCategoryId: '',
        isActive: true,
        createdAt: new Date(),
        canApproveAttendance: false,
        canApproveVacation: false,
        hasPointBudget: false,
        yearlyPointBudget: 0,
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
      onboardingProgramIds: data.onboardingProgramIds,
      isActive: data.isActive,
      jobCategoryId: data.jobCategoryId,
      createdAt: data.createdAt.toISOString(),
      canApproveAttendance: data.canApproveAttendance,
      canApproveVacation: data.canApproveVacation,
      hasPointBudget: data.hasPointBudget,
      yearlyPointBudget: data.yearlyPointBudget,
      remainingPointBudget: isEditMode ? (editingPosition?.remainingPointBudget ?? data.yearlyPointBudget) : data.yearlyPointBudget,
    };

    if (data.reportsTo && data.reportsTo !== '(none)') {
      baseData.reportsTo = data.reportsTo;
    } else {
      baseData.reportsTo = null;
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
                      name="onboardingProgramIds"
                      render={() => (
                        <FormItem>
                          <FormLabel>Дасан зохицох хөтөлбөр (Автомат)</FormLabel>
                          <ScrollArea className="h-40 rounded-md border">
                            <div className="p-4 space-y-2">
                              {availablePrograms.map((program) => (
                                <FormField
                                  key={program.id}
                                  control={form.control}
                                  name="onboardingProgramIds"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(program.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), program.id])
                                              : field.onChange(field.value?.filter((value) => value !== program.id))
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">{program.title}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                          </ScrollArea>
                          <FormDescription>Энэ албан тушаалд ажилтан томилогдоход автоматаар оноогдох хөтөлбөрүүд.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workScheduleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ажлын цагийн хуваарь</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "none" ? "" : value)} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Цагийн хуваарь сонгох" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">(Сонгоогүй)</SelectItem>
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
                    <FormField
                      control={form.control}
                      name="canApproveVacation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Амралтын хүсэлт батлах эсэх</FormLabel>
                            <FormDescription>
                              Энэ ажлын байр нь ажилчдын ээлжийн амралтын хүсэлтийг батлах эрхтэй эсэхийг тодорхойлно.
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

                    {/* Point Budget Section */}
                    <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
                      <FormField
                        control={form.control}
                        name="hasPointBudget"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                Онооны төсөвтэй эсэх
                              </FormLabel>
                              <FormDescription>
                                Энэ ажлын байр нь ажилчдад өгөх онооны төсөвтэй байх эсэх.
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

                      {form.watch('hasPointBudget') && (
                        <FormField
                          control={form.control}
                          name="yearlyPointBudget"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Жилийн онооны төсөв</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Жишээ нь: 50000"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>
                                Тухайн ажлын байрны ажилтан жилд бусад руу хуваарилах боломжтой нийт оноо.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
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

