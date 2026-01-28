'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Employee } from '@/types';
import {
  createPositionPreparationProjects,
  PositionPreparationStage,
  PositionPreparationStageTaskPlan,
} from '@/lib/position-preparation-project-creator';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useRouter } from 'next/navigation';
import { addDays, format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  Check,
  Loader2,
} from 'lucide-react';

type TaskPlanItem = {
  selected: boolean;
  dueDate?: string; // YYYY-MM-DD
  ownerId?: string;
};

type TaskPlanByStage = Record<string, Record<string, TaskPlanItem>>; // stageId -> templateTaskId -> plan

function isValidDateString(val?: string) {
  return !!val && /^\d{4}-\d{2}-\d{2}$/.test(val);
}

function getDefaultDueDateForIndex(idx: number) {
  const offsets = [7, 10, 14, 21];
  const start = new Date();
  const off = offsets[idx] ?? 21;
  return format(addDays(start, off), 'yyyy-MM-dd');
}

export interface StartPositionPreparationWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionId: string;
  positionTitle: string;
}

export function StartPositionPreparationWizardDialog({
  open,
  onOpenChange,
  positionId,
  positionTitle,
}: StartPositionPreparationWizardDialogProps) {
  const { firestore, user: firebaseUser } = useFirebase();
  const { employeeProfile: currentUserProfile } = useEmployeeProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [taskPlanByStage, setTaskPlanByStage] = React.useState<TaskPlanByStage>({});

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'employees'), where('status', '==', 'Идэвхтэй'));
  }, [firestore]);
  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery as any);

  const existingPrepProjectsQuery = useMemoFirebase(() => {
    if (!firestore || !positionId) return null;
    return query(
      collection(firestore, 'projects'),
      where('type', '==', 'position_preparation'),
      where('positionPreparationPositionId', '==', positionId),
    );
  }, [firestore, positionId]);
  const { data: existingPrepProjects, isLoading: projectsLoading } = useCollection<any>(existingPrepProjectsQuery as any);

  const prepConfigRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'settings', 'positionPreparation');
  }, [firestore]);
  const { data: prepConfig, isLoading: configLoading } = useDoc<any>(prepConfigRef as any);

  const prepStages = React.useMemo(() => {
    return (prepConfig?.stages || []) as PositionPreparationStage[];
  }, [prepConfig]);

  const canSubmit = React.useMemo(() => {
    for (const stage of prepStages) {
      const stagePlan = taskPlanByStage[stage.id] || {};
      const selected = Object.entries(stagePlan).filter(([, p]) => p.selected);
      const ok = selected.every(([, p]) => isValidDateString(p.dueDate) && !!p.ownerId);
      if (!ok) return false;
    }
    return true;
  }, [prepStages, taskPlanByStage]);

  const resetState = React.useCallback(() => {
    setIsSubmitting(false);
    setTaskPlanByStage({});
  }, []);

  React.useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  const buildOverrides = React.useCallback((): PositionPreparationStageTaskPlan[] => {
    return prepStages.map((stage) => {
      const stagePlan = taskPlanByStage[stage.id] || {};
      const tasks = Object.entries(stagePlan)
        .filter(([, p]) => p.selected)
        .map(([templateTaskId, p]) => ({
          templateTaskId,
          dueDate: p.dueDate!,
          ownerId: p.ownerId!,
        }));
      return { stageId: stage.id, tasks };
    });
  }, [prepStages, taskPlanByStage]);

  const handleCreate = React.useCallback(async () => {
    if (!firestore || !firebaseUser) return;
    if (!positionId) return;

    if ((existingPrepProjects || []).length > 0) {
      toast({
        title: 'Бэлтгэл төсөл аль хэдийн үүссэн байна',
        description: 'Энэ ажлын байранд бэлтгэл төслүүд өмнө нь үүссэн байна.',
        variant: 'destructive',
      });
      return;
    }

    if (!prepStages?.length) {
      toast({
        title: 'Бэлтгэл тохиргоо хоосон байна',
        description: 'Байгууллагын тохиргоо дээр “Ажлын байр бэлтгэх” tab дээр таскуудаа тохируулна уу.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const initiatorId = currentUserProfile?.id || firebaseUser?.uid || '';
      const startDateStr = format(new Date(), 'yyyy-MM-dd');

      const result = await createPositionPreparationProjects({
        firestore,
        positionId,
        positionTitle: positionTitle || 'Ажлын байр',
        initiatorId,
        prepConfig: prepStages,
        startDate: startDateStr,
        taskPlan: buildOverrides(),
      });

      toast({
        title: 'Бэлтгэл төсөл үүслээ',
        description: `${result.projectIds.length} төсөл, ${result.taskCount} таск үүслээ.`,
      });

      onOpenChange(false);
      if (result.projectIds?.[0]) router.push(`/dashboard/projects/${result.projectIds[0]}`);
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Алдаа гарлаа',
        description: e?.message || 'Бэлтгэл төсөл үүсгэхэд алдаа гарлаа.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    firestore,
    firebaseUser,
    positionId,
    positionTitle,
    currentUserProfile?.id,
    prepStages,
    buildOverrides,
    existingPrepProjects,
    toast,
    onOpenChange,
    router,
  ]);

  const setTaskSelected = React.useCallback((stageId: string, taskId: string, selected: boolean, stageIndex: number) => {
    setTaskPlanByStage((prev) => {
      const stagePlan = { ...(prev[stageId] || {}) };
      const cur = stagePlan[taskId] || { selected: false };
      const initiatorId = currentUserProfile?.id || firebaseUser?.uid || '';
      stagePlan[taskId] = {
        ...cur,
        selected,
        dueDate: selected ? (cur.dueDate || getDefaultDueDateForIndex(stageIndex)) : cur.dueDate,
        ownerId: selected ? (cur.ownerId || initiatorId) : cur.ownerId,
      };
      return { ...prev, [stageId]: stagePlan };
    });
  }, [currentUserProfile?.id, firebaseUser?.uid]);

  const setTaskDueDate = React.useCallback((stageId: string, taskId: string, dueDate: string) => {
    setTaskPlanByStage((prev) => {
      const stagePlan = { ...(prev[stageId] || {}) };
      const cur = stagePlan[taskId] || { selected: true };
      stagePlan[taskId] = { ...cur, dueDate };
      return { ...prev, [stageId]: stagePlan };
    });
  }, []);

  const setTaskOwner = React.useCallback((stageId: string, taskId: string, ownerId: string) => {
    setTaskPlanByStage((prev) => {
      const stagePlan = { ...(prev[stageId] || {}) };
      const cur = stagePlan[taskId] || { selected: true };
      stagePlan[taskId] = { ...cur, ownerId };
      return { ...prev, [stageId]: stagePlan };
    });
  }, []);

  const renderStageStep = (stage: PositionPreparationStage, stageIndex: number) => {
    const stagePlan = taskPlanByStage[stage.id] || {};
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="text-lg">{stage.title}</DialogTitle>
            <DialogDescription className="text-sm">{stage.description}</DialogDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {stageIndex + 1}/{prepStages.length || 4}
          </Badge>
        </div>

        <div className="space-y-3">
          {(stage.tasks || []).length === 0 ? (
            <div className="p-4 rounded-xl bg-muted/30 text-sm text-muted-foreground">
              Энэ үе шатанд таск тохируулаагүй байна.
            </div>
          ) : (
            (stage.tasks || []).map((t) => {
              const plan = stagePlan[t.id] || { selected: false };
              return (
                <div key={t.id} className={cn("p-4 rounded-2xl border-2 bg-white transition-all", plan.selected ? "border-indigo-200 shadow-sm" : "border-slate-100")}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={!!plan.selected}
                      onCheckedChange={(checked) => setTaskSelected(stage.id, t.id, !!checked, stageIndex)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900">{t.title}</div>
                      {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                    </div>
                  </div>

                  {plan.selected && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Дуусах огноо</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "h-10 w-full justify-start text-left font-medium rounded-xl border-slate-200",
                                !plan.dueDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {plan.dueDate ? format(new Date(plan.dueDate), 'PPP', { locale: mn }) : <span>Огноо сонгох</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={plan.dueDate ? new Date(plan.dueDate) : undefined}
                              onSelect={(date) => setTaskDueDate(stage.id, t.id, date ? format(date, 'yyyy-MM-dd') : '')}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Хариуцагч</Label>
                        <Select value={plan.ownerId || ''} onValueChange={(val) => setTaskOwner(stage.id, t.id, val)}>
                          <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                            <SelectValue placeholder="Хариуцагч сонгох" />
                          </SelectTrigger>
                          <SelectContent>
                            {(employees || []).map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.firstName} {e.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl bg-white rounded-3xl">
        <div className="flex flex-col h-[85vh] max-h-[760px]">
          <DialogHeader className="p-8 pb-4 bg-gradient-to-b from-slate-50/50 to-white shrink-0">
            <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">Ажлын байр бэлтгэх</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground mt-1">
              <span className="font-bold text-slate-700">{positionTitle}</span> ажлын байранд бэлтгэл хийх төслийг үүсгэнэ.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden relative border-t">
            <ScrollArea className="h-full">
              <div className="p-8">
                {employeesLoading || projectsLoading || configLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                ) : !prepStages?.length ? (
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-sm">
                    Бэлтгэл тохиргоо хоосон байна. Байгууллагын тохиргоо дээр “Ажлын байр бэлтгэх” tab-аа тохируулна уу.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {prepStages.map((s, idx) => (
                      <div key={s.id} className="pb-8 border-b last:border-b-0 last:pb-0">
                        {renderStageStep(s, idx)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {isSubmitting && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900">Боловсруулж байна</p>
                  <p className="text-xs text-muted-foreground">Түр хүлээнэ үү...</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 border-t bg-slate-50/50 shrink-0">
            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-xl h-11 font-bold uppercase tracking-wider text-[10px]"
                disabled={isSubmitting}
              >
                Болих
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSubmitting || !canSubmit || !prepStages?.length}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-indigo-200"
              >
                <Check className="h-4 w-4 mr-2" />
                Бэлтгэл төсөл үүсгэх
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

