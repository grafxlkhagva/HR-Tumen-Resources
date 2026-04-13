'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, Loader2, Trash2, UploadCloud, ChevronDown, ChevronUp } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { TmsDispatchStep } from '@/app/tms/types';

interface DispatchStepsSectionProps {
  steps: TmsDispatchStep[];
  expandedSteps: Set<string>;
  toggleExpandedStep: (id: string) => void;
  confirmStepId: string | null;
  setConfirmStepId: (id: string | null) => void;
  uploadingTaskId: string | null;
  onTaskResultChange: (stepId: string, taskId: string, value: unknown) => void;
  onToggleStepClick: (stepId: string) => void;
  onExecuteStepToggle: () => Promise<void>;
  onImageUpload: (stepId: string, taskId: string, file: File) => Promise<void>;
}

export function DispatchStepsSection({
  steps,
  expandedSteps,
  toggleExpandedStep,
  confirmStepId,
  setConfirmStepId,
  uploadingTaskId,
  onTaskResultChange,
  onToggleStepClick,
  onExecuteStepToggle,
  onImageUpload,
}: DispatchStepsSectionProps) {
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const totalCount = steps.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (totalCount === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Диспач алхам тохируулагдаагүй байна.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-foreground">Гүйцэтгэл</h3>
          <div className="flex items-center gap-2.5">
            <span className="text-xs tabular-nums text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
            <Progress
              value={pct}
              className="w-20 h-1.5"
              indicatorClassName={pct === 100 ? 'bg-emerald-500' : undefined}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {[...steps].sort((a, b) => a.order - b.order).map((step, idx) => {
            const isCompleted = step.status === 'completed';
            const isExpanded = expandedSteps.has(step.id);
            const hasControlTasks = step.controlTasks && step.controlTasks.length > 0;

            return (
              <div
                key={step.id}
                className={cn(
                  'rounded-lg border bg-card transition-all',
                  isExpanded && 'ring-1 ring-primary/20 shadow-sm',
                )}
              >
                <div className="flex items-center gap-3 px-3.5 py-2.5">
                  {/* Step number / check */}
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all',
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-muted-foreground/25 text-muted-foreground',
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium truncate', isCompleted && 'text-muted-foreground line-through')}>
                      {step.name}
                      {step.isRequired && <span className="text-destructive ml-0.5">*</span>}
                    </div>
                    {isCompleted && step.completedAt && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {(() => {
                          const ts = step.completedAt;
                          const d = typeof ts === 'object' && ts !== null && 'toDate' in ts ? (ts as { toDate: () => Date }).toDate() : new Date(String(ts));
                          return d.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasControlTasks && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpandedStep(step.id)}
                        className={cn('h-7 px-2 text-xs gap-1', isExpanded && 'bg-muted')}
                      >
                        {step.controlTasks!.length}
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    )}
                    {!isCompleted ? (
                      <Button size="sm" onClick={() => onToggleStepClick(step.id)} className="h-7 text-xs px-3">
                        Батлах
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => onToggleStepClick(step.id)} className="h-7 text-xs px-2 text-muted-foreground">
                        Буцаах
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded control tasks */}
                {isExpanded && hasControlTasks && (
                  <div className="border-t bg-muted/30 p-4 pl-[3.25rem] space-y-4 animate-in slide-in-from-top-1 duration-150">
                    {step.controlTasks!.map((task) => {
                      const val = step.taskResults?.[task.id];
                      return (
                        <div key={task.id} className="space-y-1.5">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            {task.name} {task.isRequired && <span className="text-destructive">*</span>}
                          </Label>

                          {task.type === 'text' && (
                            <Input
                              placeholder="Текст..."
                              value={(val as string) || ''}
                              onChange={(e) => onTaskResultChange(step.id, task.id, e.target.value)}
                              className="bg-background max-w-sm h-8 text-sm"
                            />
                          )}
                          {task.type === 'number' && (
                            <Input
                              type="number"
                              placeholder="0"
                              value={(val as number) ?? ''}
                              onChange={(e) => onTaskResultChange(step.id, task.id, Number(e.target.value))}
                              className="bg-background max-w-[160px] h-8 text-sm"
                            />
                          )}
                          {task.type === 'date' && (
                            <Input
                              type="datetime-local"
                              value={(val as string) || ''}
                              onChange={(e) => onTaskResultChange(step.id, task.id, e.target.value)}
                              className="bg-background max-w-[220px] h-8 text-sm"
                            />
                          )}
                          {task.type === 'checklist' && (
                            <div className="flex items-center gap-2 py-1">
                              <Checkbox
                                id={`chk-${task.id}`}
                                checked={val === true}
                                onCheckedChange={(c) => onTaskResultChange(step.id, task.id, c === true)}
                              />
                              <Label htmlFor={`chk-${task.id}`} className="font-normal cursor-pointer text-xs">Тийм</Label>
                            </div>
                          )}
                          {task.type === 'image' && (
                            <div className="flex items-center gap-3">
                              {val ? (
                                <div className="relative group">
                                  <img src={val as string} alt="" className="h-16 w-16 object-cover rounded-md border" />
                                  <Button
                                    variant="destructive"
                                    size="icon-sm"
                                    className="absolute -top-1.5 -right-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => onTaskResultChange(step.id, task.id, null)}
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="relative h-16 w-24">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      const input = e.currentTarget;
                                      if (!file) return;
                                      try {
                                        await onImageUpload(step.id, task.id, file);
                                      } catch {
                                        // алдаа гарвал input-г цэвэрлэхгүй
                                        return;
                                      }
                                      if (input) input.value = '';
                                    }}
                                  />
                                  <Button variant="outline" className="h-full w-full border-dashed flex-col gap-0.5 text-[10px] text-muted-foreground hover:bg-muted/50 pointer-events-none">
                                    {uploadingTaskId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                    {uploadingTaskId === task.id ? 'Оруулж байна' : 'Зураг'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!confirmStepId} onOpenChange={(open) => !open && setConfirmStepId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Алхам баталгаажуулах</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ алхмын төлөвийг өөрчлөхдөө итгэлтэй байна уу?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={onExecuteStepToggle}>Тийм</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
