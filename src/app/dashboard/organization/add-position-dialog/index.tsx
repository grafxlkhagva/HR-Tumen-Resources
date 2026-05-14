'use client';

import * as React from 'react';
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
} from "@/components/ui/alert-dialog";
import { Form } from '@/components/ui/form';
import { Loader2, Trash2, Sparkles } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { AddPositionDialogProps } from './types';
import { usePositionForm } from './use-position-form';
import { AddModeBasicFields, EditModeBasicCard } from './position-basic-fields';
import {
  ClassificationCard,
  AdditionalSettingsCard,
  PurposeCard,
  CompensationCard,
  BenefitsCard,
} from './position-detail-fields';

export { type AddPositionDialogProps } from './types';

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
  onSuccess,
}: AddPositionDialogProps) {
  const [mode, setMode] = React.useState<'quick' | 'full'>(initialMode);

  // Reset mode when dialog opens/closes or initialMode changes
  React.useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  const {
    form,
    isEditMode,
    isSubmitting,
    onSubmit,
    handleDelete,
    generateCode,
    firestore,
    posCodeConfigRef,
  } = usePositionForm({
    editingPosition,
    preselectedDepartmentId,
    parentPositionId,
    allPositions,
    open,
    onOpenChange,
    onSuccess,
  });

  const sharedBasicProps = {
    form,
    departments,
    allPositions,
    positionLevels,
    employmentTypes,
    jobCategories,
    workSchedules,
    editingPosition,
    preselectedDepartmentId,
    isEditMode,
    onGenerateCode: generateCode,
    firestore,
    posCodeConfigRef,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{isEditMode ? 'Ажлын байр засах' : 'Ажлын байр нэмэх'}</DialogTitle>
            <DialogDescription>
              Ажлын байрны ерөнхий мэдээллийг энд бүртгэж, дэлгэрэнгүй мэдээллийг дараагийн алхамд оруулна.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
              <div className="flex-1 overflow-hidden">
                {!isEditMode ? (
                  <AddModeBasicFields {...sharedBasicProps} />
                ) : (
                  <Tabs defaultValue="basic" className="flex flex-col h-full">
                    <div className="border-b px-6 flex justify-between items-center">
                      {mode === 'full' && (
                        <VerticalTabMenu
                          orientation="horizontal"
                          items={[
                            { value: 'basic', label: 'Үндсэн' },
                            { value: 'purpose', label: 'Зорилго' },
                            { value: 'compensation', label: 'Цалин' },
                            { value: 'benefits', label: 'Хангамж' },
                          ]}
                        />
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
                        <EditModeBasicCard {...sharedBasicProps} />
                        <ClassificationCard
                          form={form}
                          positionLevels={positionLevels}
                          employmentTypes={employmentTypes}
                          jobCategories={jobCategories}
                          workSchedules={workSchedules}
                        />
                        <AdditionalSettingsCard form={form} workSchedules={workSchedules} />
                      </TabsContent>

                      {mode === 'full' && (
                        <>
                          <TabsContent value="purpose" className="mt-0 space-y-6">
                            <PurposeCard form={form} />
                          </TabsContent>

                          <TabsContent value="compensation" className="mt-0 space-y-6">
                            <CompensationCard form={form} />
                          </TabsContent>

                          <TabsContent value="benefits" className="mt-0 space-y-6">
                            <BenefitsCard form={form} />
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
                            Энэ үйлдлийг буцаах боломжгүй. Энэ нь &quot;{editingPosition?.title}&quot; ажлын байрыг бүрмөсөн устгах болно.
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
      </Dialog>
    </>
  );
}
