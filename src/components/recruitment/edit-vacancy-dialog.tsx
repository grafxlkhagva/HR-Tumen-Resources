'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import type { FirebaseStorage } from 'firebase/storage';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

import type { Vacancy, VacancyStatus } from '@/types/recruitment';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';

type EditVacancyDraft = {
  title: string;
  status: VacancyStatus;
  deadline: Date | undefined;
  description: string;
};

export function EditVacancyDialog({
  open,
  onOpenChange,
  vacancy,
  vacancyId,
  storage,
  onSave,
  saving,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancy: Vacancy;
  vacancyId: string;
  storage?: FirebaseStorage | null;
  onSave: (draft: EditVacancyDraft) => Promise<void>;
  saving?: boolean;
  onDelete?: () => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = React.useState<EditVacancyDraft>({
    title: vacancy.title,
    status: vacancy.status,
    deadline: vacancy.deadline ? new Date(vacancy.deadline) : undefined,
    description: vacancy.description || '',
  });

  // Reset draft when dialog opens or vacancy changes
  React.useEffect(() => {
    if (!open) return;
    setDraft({
      title: vacancy.title,
      status: vacancy.status,
      deadline: vacancy.deadline ? new Date(vacancy.deadline) : undefined,
      description: vacancy.description || '',
    });
  }, [open, vacancy.title, vacancy.status, vacancy.deadline, vacancy.description]);

  const fileInputId = React.useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Нээлтэй ажлын байр засах</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vacancy-title">Албан тушаал</Label>
              <Input
                id="vacancy-title"
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ж: Борлуулалтын менежер"
              />
            </div>

            <div className="space-y-2">
              <Label>Төлөв</Label>
              <Select value={draft.status} onValueChange={(val) => setDraft((p) => ({ ...p, status: val as VacancyStatus }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Төлөв сонгох" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Нээлттэй</SelectItem>
                  <SelectItem value="DRAFT">Ноорог</SelectItem>
                  <SelectItem value="PAUSED">Түр зогссон</SelectItem>
                  <SelectItem value="CLOSED">Хаагдсан</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Хаагдах хугацаа</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !draft.deadline && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {draft.deadline ? format(draft.deadline, 'yyyy-MM-dd') : <span>Хугацаа сонгох</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={draft.deadline} onSelect={(d) => setDraft((p) => ({ ...p, deadline: d }))} initialFocus />
                </PopoverContent>
              </Popover>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setDraft((p) => ({ ...p, deadline: undefined }))}>
                Хугацаа арилгах
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Зарын зураг (Markdown)</Label>
              <input
                id={fileInputId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!storage) {
                    toast({ title: 'Storage тохируулаагүй байна', variant: 'destructive' });
                    return;
                  }

                  toast({ title: 'Зураг хуулж байна...' });
                  try {
                    const storageRef = ref(storage, `vacancies/${vacancyId}/${Date.now()}_${file.name}`);
                    const uploadTask = uploadBytesResumable(storageRef, file);
                    uploadTask.on(
                      'state_changed',
                      undefined,
                      (error) => {
                        console.error(error);
                        toast({ title: 'Алдаа', variant: 'destructive' });
                      },
                      async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        setDraft((p) => ({ ...p, description: (p.description || '') + `\n\n![${file.name}](${downloadURL})` }));
                        toast({ title: 'Зураг амжилттай орлоо' });
                      }
                    );
                  } catch (error) {
                    console.error(error);
                    toast({ title: 'Алдаа', variant: 'destructive' });
                  } finally {
                    // allow re-upload same file
                    e.currentTarget.value = '';
                  }
                }}
              />
              <Button type="button" variant="outline" className="w-full justify-start gap-2" onClick={() => document.getElementById(fileInputId)?.click()}>
                <ImageIcon className="h-4 w-4" />
                Зураг нэмэх
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vacancy-description">Тайлбар (Markdown)</Label>
            </div>
            <Textarea
              id="vacancy-description"
              className="min-h-[280px] font-mono text-xs resize-none"
              value={draft.description}
              onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              placeholder="# Ажлын байрны танилцуулга..."
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="gap-2" disabled={!!saving}>
                    <Trash2 className="h-4 w-4" />
                    Устгах
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ажлын байрны зар болон түүнтэй холбоотой мэдээллүүд устах болно.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={!!saving}>Цуцлах</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={!!saving}
                      className="bg-red-600 hover:bg-red-700"
                      onClick={async () => {
                        await onDelete();
                        onOpenChange(false);
                      }}
                    >
                      Тийм, устгах
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div />
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={!!saving}>
                Цуцлах
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (!draft.title.trim()) {
                    toast({ title: 'Албан тушаал хоосон байна', variant: 'destructive' });
                    return;
                  }
                  await onSave(draft);
                }}
                disabled={!!saving}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Хадгалах
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

