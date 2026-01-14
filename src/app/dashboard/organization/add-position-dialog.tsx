

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
import { Loader2, Trash2, PlusCircle, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';


const positionSchema = z.object({
  title: z.string().min(2, 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.'),
  code: z.string().optional(),
  departmentId: z.string().optional(),
  reportsTo: z.string().optional(),
  levelId: z.string().optional(),
  employmentTypeId: z.string().optional(),
  workScheduleId: z.string().optional(),
  jobCategoryId: z.string().optional(),
  canApproveAttendance: z.boolean().default(false),
  canApproveVacation: z.boolean().default(false),
  hasPointBudget: z.boolean().default(false),
  yearlyPointBudget: z.number().min(0).default(0),
  purpose: z.string().optional(),
  responsibilities: z.string().optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMid: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  salaryCurrency: z.string().default('MNT'),
  salaryPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
  bonusDescription: z.string().optional(),
  commissionDescription: z.string().optional(),
  equityDescription: z.string().optional(),
  isRemoteAllowed: z.boolean().default(false),
  flexibleHours: z.boolean().default(false),
  vacationDays: z.number().min(0).default(0),
  otherBenefits: z.string().optional(),
});

type PositionFormValues = z.infer<typeof positionSchema>;

import { Position as JobPosition, DepartmentType, PositionLevel, EmploymentType, JobCategory, WorkSchedule } from './types';
import { ReferenceItem as Reference } from '@/types';

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
  preselectedDepartmentId?: string;
  parentPositionId?: string;
  initialMode?: 'quick' | 'full';
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
  preselectedDepartmentId,
  parentPositionId,
  initialMode = 'full',
}: AddPositionDialogProps) {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const isEditMode = !!editingPosition;
  const [mode, setMode] = React.useState<'quick' | 'full'>(initialMode);

  // Reset mode when dialog opens/closes or initialMode changes
  React.useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      title: '',
      code: '',
      departmentId: preselectedDepartmentId || '',
      reportsTo: parentPositionId || '(none)',
      levelId: '',
      employmentTypeId: '',
      workScheduleId: '',
      jobCategoryId: '',
      canApproveAttendance: false,
      canApproveVacation: false,
      hasPointBudget: false,
      yearlyPointBudget: 0,
      purpose: '',
      responsibilities: '',
      salaryMin: 0,
      salaryMid: 0,
      salaryMax: 0,
      salaryCurrency: 'MNT',
      salaryPeriod: 'monthly',
      bonusDescription: '',
      commissionDescription: '',
      equityDescription: '',
      isRemoteAllowed: false,
      flexibleHours: false,
      vacationDays: 0,
      otherBenefits: '',
    },
  });

  const watchedDepartmentId = form.watch('departmentId');

  React.useEffect(() => {
    if (editingPosition) {
      form.reset({
        ...editingPosition,
        code: editingPosition.code || '',
        levelId: editingPosition.levelId || '',
        employmentTypeId: editingPosition.employmentTypeId || '',
        workScheduleId: editingPosition.workScheduleId || '',
        reportsTo: editingPosition.reportsTo || '(none)',
        jobCategoryId: editingPosition.jobCategoryId || '',
        canApproveAttendance: editingPosition.canApproveAttendance || false,
        canApproveVacation: editingPosition.canApproveVacation || false,
        hasPointBudget: editingPosition.hasPointBudget || false,
        yearlyPointBudget: editingPosition.yearlyPointBudget || 0,
        purpose: editingPosition.purpose || '',
        responsibilities: editingPosition.responsibilities?.join('\n') || '',
        salaryMin: editingPosition.compensation?.salaryRange?.min || 0,
        salaryMid: editingPosition.compensation?.salaryRange?.mid || 0,
        salaryMax: editingPosition.compensation?.salaryRange?.max || 0,
        salaryCurrency: editingPosition.compensation?.salaryRange?.currency || 'MNT',
        salaryPeriod: (editingPosition.compensation?.salaryRange?.period as any) || 'monthly',
        bonusDescription: editingPosition.compensation?.variablePay?.bonusDescription || '',
        commissionDescription: editingPosition.compensation?.variablePay?.commissionDescription || '',
        equityDescription: editingPosition.compensation?.variablePay?.equityDescription || '',
        isRemoteAllowed: editingPosition.benefits?.isRemoteAllowed || false,
        flexibleHours: editingPosition.benefits?.flexibleHours || false,
        vacationDays: editingPosition.benefits?.vacationDays || 0,
        otherBenefits: editingPosition.benefits?.otherBenefits?.join('\n') || '',
      });
    } else {
      form.reset({
        title: '',
        departmentId: preselectedDepartmentId || '',
        reportsTo: parentPositionId || '(none)',
        levelId: '',
        employmentTypeId: '',
        workScheduleId: '',
        jobCategoryId: '',
        canApproveAttendance: false,
        canApproveVacation: false,
        hasPointBudget: false,
        yearlyPointBudget: 0,
        purpose: '',
        responsibilities: '',
        salaryMin: 0,
        salaryMid: 0,
        salaryMax: 0,
        salaryCurrency: 'MNT',
        salaryPeriod: 'monthly',
        bonusDescription: '',
        commissionDescription: '',
        equityDescription: '',
        isRemoteAllowed: false,
        flexibleHours: false,
        vacationDays: 0,
        otherBenefits: '',
      });
    }
  }, [editingPosition, open, form, preselectedDepartmentId]);

  const { isSubmitting } = form.formState;

  const positionsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'positions') : null),
    [firestore]
  );


  const onSubmit = async (data: PositionFormValues) => {
    if (!firestore) return;

    // Determine Department ID
    let finalDepartmentId = data.departmentId || preselectedDepartmentId;

    // If no department selected, try to infer from parent position
    if (!finalDepartmentId && data.reportsTo && data.reportsTo !== '(none)') {
      const parentPos = allPositions?.find(p => p.id === data.reportsTo);
      if (parentPos?.departmentId) {
        finalDepartmentId = parentPos.departmentId;
      }
    }

    if (!isEditMode && !finalDepartmentId) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Хэлтэс тодорхойгүй байна. Шууд харьяалагдах албан тушаал сонгох эсвэл хэлтэс сонгоно уу.',
      });
      return;
    }

    const baseData: any = {
      title: data.title,
      code: data.code?.toUpperCase() || '',
      departmentId: finalDepartmentId,
      levelId: data.levelId || '',
      employmentTypeId: data.employmentTypeId || '',
      workScheduleId: data.workScheduleId || '',
      jobCategoryId: data.jobCategoryId || '',
      canApproveAttendance: data.canApproveAttendance,
      canApproveVacation: data.canApproveVacation,
      hasPointBudget: data.hasPointBudget,
      yearlyPointBudget: data.yearlyPointBudget,
      remainingPointBudget: isEditMode ? (editingPosition?.remainingPointBudget ?? data.yearlyPointBudget) : data.yearlyPointBudget,
      purpose: data.purpose || '',
      responsibilities: data.responsibilities ? data.responsibilities.split('\n').filter(r => r.trim() !== '') : [],
      compensation: {
        salaryRange: {
          min: data.salaryMin || 0,
          mid: data.salaryMid || 0,
          max: data.salaryMax || 0,
          currency: data.salaryCurrency,
          period: data.salaryPeriod as any,
        },
        variablePay: {
          bonusDescription: data.bonusDescription,
          commissionDescription: data.commissionDescription,
          equityDescription: data.equityDescription,
        }
      },
      benefits: {
        isRemoteAllowed: data.isRemoteAllowed,
        flexibleHours: data.flexibleHours,
        vacationDays: data.vacationDays,
        otherBenefits: data.otherBenefits ? data.otherBenefits.split('\n').filter(r => r.trim() !== '') : [],
      }
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
      const finalData = {
        ...baseData,
        filled: 0,
        isApproved: false // New positions are not approved by default
      };

      const newDocRef = await addDocumentNonBlocking(positionsCollection, finalData);

      if (newDocRef && newDocRef.id) {
        toast({ title: 'Амжилттай нэмэгдлээ.' });
        // Redirect to the new position details page
        onOpenChange(false);
        router.push(`/dashboard/organization/positions/${newDocRef.id}`);
      }
    }

    if (isEditMode) {
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (!firestore || !editingPosition) return;

    if (editingPosition.isApproved) {
      toast({
        variant: 'destructive',
        title: 'Устгах боломжгүй',
        description: 'Батлагдсан ажлын байрыг устгах боломжгүй. Эхлээд батламжийг цуцална уу.',
      });
      return;
    }


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
              <div className="flex-1 overflow-hidden">
                {!isEditMode ? (
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ажлын байрны нэр <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Жишээ нь: Ахлах нягтлан бодогч" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ажлын байрны код</FormLabel>
                          <FormControl>
                            <Input placeholder="Жишээ нь: ACC001" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                          </FormControl>
                          <FormDescription>Байгууллагын дотоод код</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!preselectedDepartmentId && (
                      <FormField
                        control={form.control}
                        name="departmentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Харьяалагдах хэлтэс <span className="text-red-500">*</span></FormLabel>
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
                    )}

                    <FormField
                      control={form.control}
                      name="reportsTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Шууд харьяалагдах албан тушаал</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Сонгох..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="(none)">(Шууд удирдлагагүй)</SelectItem>
                              {((allPositions as any[]) || []).filter((p: any) => !editingPosition || p?.id !== (editingPosition as any)?.id).map((pos: any) => (
                                <SelectItem key={pos.id} value={pos.id}>
                                  {pos.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Энэ ажлын байрны шууд удирдах албан тушаалыг сонгоно уу.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <Tabs defaultValue="basic" className="flex flex-col h-full">
                    <div className="border-b px-6 flex justify-between items-center">
                      {mode === 'full' && (
                        <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-6">
                          <TabsTrigger value="basic" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12">Үндсэн</TabsTrigger>
                          <TabsTrigger value="purpose" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12">Зорилго</TabsTrigger>
                          <TabsTrigger value="compensation" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12">Цалин</TabsTrigger>
                          <TabsTrigger value="benefits" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12">Хангамж</TabsTrigger>
                        </TabsList>
                      )}
                      {mode === 'quick' && (
                        <Button
                          type="button"
                          variant="soft"
                          size="sm"
                          onClick={() => setMode('full')}
                          className="ml-auto"
                        >
                          <Sparkles className="w-4 h-4" />
                          Дэлгэрэнгүй бөглөх
                        </Button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <TabsContent value="basic" className="mt-0 space-y-6">
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
                            <FormField
                              control={form.control}
                              name="code"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ажлын байрны код</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Жишээ нь: DEV001" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
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
                                            {pos.title} {pos.isApproved === false && '(Батлагдаагүй)'}
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
                      </TabsContent>


                      {mode === 'full' && (
                        <>
                          <TabsContent value="purpose" className="mt-0 space-y-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Ажлын байрны мэдээлэл</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="purpose"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Ажлын байрны зорилго</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Ажлын байрны зорилгыг энд бичнэ үү..."
                                          className="min-h-[120px]"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="responsibilities"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Ажлын байрны чиг үүрэг (Мөр бүрт нэг)</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Жишээ нь:&#10;Системийн хөгжүүлэлт хариуцах&#10;Код хянах&#10;Баг удирдах"
                                          className="min-h-[120px]"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>Чиг үүргүүдийг шинэ мөрөөр (Enter дарж) зааглан оруулна уу.</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="compensation" className="mt-0 space-y-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Цалингийн мэдээлэл</CardTitle>
                                <CardDescription>Албан тушаалын цалингийн хүрээ болон нэмэгдэл хөлс</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border p-4 rounded-lg bg-slate-50/50">
                                  <FormField
                                    control={form.control}
                                    name="salaryMin"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Доод (Min)</FormLabel>
                                        <FormControl>
                                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="salaryMid"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Дундаж (Mid)</FormLabel>
                                        <FormControl>
                                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="salaryMax"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Дээд (Max)</FormLabel>
                                        <FormControl>
                                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="salaryCurrency"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Валют</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Сонгох" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="MNT">MNT (₮)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="salaryPeriod"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Цалингийн мөчлөг</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Сонгох" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="monthly">Сараар</SelectItem>
                                            <SelectItem value="yearly">Жилээр</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="space-y-4 pt-4 border-t">
                                  <h4 className="text-sm font-semibold">Хувьсах цалин (Variable Pay)</h4>
                                  <FormField
                                    control={form.control}
                                    name="bonusDescription"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Бонус / Урамшуулал</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Жишээ: Жилийн бүтээмжийн бонус 10-20%" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="commissionDescription"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Комисс / Борлуулалтын шагнал</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Жишээ: Борлуулалтын орлогын 2%" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="equityDescription"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Хувьцаа / ESOP</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Жишээ: 1000 нэгж хувьцаа, 4 жилийн хугацаанд" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="benefits" className="mt-0 space-y-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Хангамж ба Хөнгөлөлт</CardTitle>
                                <CardDescription>Ажилтанд олгох нэмэлт хангамж, ажлын нөхцөл</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="isRemoteAllowed"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <FormLabel className="text-base">Гэрээс ажиллах</FormLabel>
                                        <FormControl>
                                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="flexibleHours"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <FormLabel className="text-base">Уян хатан цаг</FormLabel>
                                        <FormControl>
                                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <FormField
                                  control={form.control}
                                  name="vacationDays"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Нэмэлт амралтын хоног (Жилд)</FormLabel>
                                      <FormControl>
                                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                      </FormControl>
                                      <FormDescription>Хуулийн дагуух 15 хоногоос гадуурх нэмэлт хоног.</FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name="otherBenefits"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Бусад хөнгөлөлт, хангамж (Мөр бүрт нэг)</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Жишээ нь:&#10;Үнэгүй хоол&#10;Фитнес гишүүнчлэл&#10;Мэргэжлийн сургалтын төсөв"
                                          className="min-h-[120px]"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </CardContent>
                            </Card>
                          </TabsContent>
                        </>
                      )}
                    </div>
                  </Tabs>
                )}
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
                                  size="default"
                                  disabled={(editingPosition?.filled || 0) > 0 || editingPosition?.isApproved !== false}
                                >
                                  <Trash2 className="w-4 h-4" /> Устгах
                                </Button>
                              </AlertDialogTrigger>
                            </div>
                          </TooltipTrigger>
                          {((editingPosition?.filled || 0) > 0 || editingPosition?.isApproved !== false) && (
                            <TooltipContent>
                              <p>
                                {(editingPosition?.filled || 0) > 0
                                  ? "Энэ ажлын байранд ажилтан томилогдсон тул устгах боломжгүй."
                                  : "Батлагдсан ажлын байрыг устгах боломжгүй. Эхлээд батламжийг цуцална уу."}
                              </p>
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
                          <AlertDialogCancel>Болих</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={handleDelete}>Тийм, устгах</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="h-10" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                    Болих
                  </Button>
                  <Button type="submit" variant="success" className="h-10 px-8" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEditMode ? 'Шинэчлэх' : 'Хадгалах'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog >
    </>
  );
}

