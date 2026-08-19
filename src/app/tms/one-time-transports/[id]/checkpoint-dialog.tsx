'use client';

import * as React from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Loader2 } from 'lucide-react';
import {
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase, useUser } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useToast } from '@/hooks/use-toast';
import { TMS_ONE_TIME_TRANSPORTS_COLLECTION } from '@/app/tms/types';
import type { TmsOneTimeTransport, TmsTransportCheckpoint } from '@/app/tms/types';
import type { OtCheckpointStageDef } from '../constants';
import { CheckpointPhotoGrid } from './checkpoint-photo-grid';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB — dispatch upload-тай ижил хязгаар

interface CheckpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport: TmsOneTimeTransport;
  stage: OtCheckpointStageDef | null;
}

/**
 * Нэг checkpoint шатыг баталгаажуулах/засах цонх — checklist + зураг (Storage)
 * + transit шатанд км/шатахуун + тэмдэглэл.
 */
export function CheckpointDialog({ open, onOpenChange, transport, stage }: CheckpointDialogProps) {
  const { firestore, storage } = useFirebase();
  const { user } = useUser();
  const { employeeProfile } = useEmployeeProfile();
  const { toast } = useToast();

  const existing = stage ? transport.checkpoints?.[stage.key] : undefined;

  const [checklist, setChecklist] = React.useState<Record<string, boolean>>({});
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [km, setKm] = React.useState('');
  const [fuelAmount, setFuelAmount] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Нээгдэх бүрд одоогийн утгуудаар шинэчилнэ
  React.useEffect(() => {
    if (!open || !stage) return;
    setChecklist(existing?.checklist ?? {});
    setPhotos(existing?.photoUrls ?? []);
    setKm(existing?.km != null ? String(existing.km) : '');
    setFuelAmount(existing?.fuelAmount != null ? String(existing.fuelAmount) : '');
    setNotes(existing?.notes ?? '');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage?.key]);

  const handleUpload = React.useCallback(
    async (files: File[]) => {
      if (!storage || !stage) return;
      setUploading(true);
      try {
        const urls: string[] = [];
        for (const file of files) {
          if (!file.type.startsWith('image/')) {
            toast({
              variant: 'destructive',
              title: 'Буруу файл төрөл',
              description: 'Зөвхөн зураг (image/*) файл оруулна уу.',
            });
            continue;
          }
          if (file.size > MAX_UPLOAD_SIZE) {
            toast({
              variant: 'destructive',
              title: 'Файлын хэмжээ хэтэрсэн',
              description: 'Зураг 5MB-аас бага байх ёстой.',
            });
            continue;
          }
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `tms/one-time-transports/${transport.id}/checkpoints/${stage.key}/${Date.now()}-${safeName}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, file, { contentType: file.type });
          urls.push(await getDownloadURL(storageRef));
        }
        if (urls.length) {
          setPhotos((prev) => [...prev, ...urls]);
          setError(null);
        }
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: e instanceof Error ? e.message : 'Зураг оруулахад алдаа гарлаа.',
        });
      } finally {
        setUploading(false);
      }
    },
    [storage, stage, transport.id, toast]
  );

  const handleSave = React.useCallback(async () => {
    if (!firestore || !stage) return;
    // Заавал шатанд дор хаяж 1 зураг шаардана (prototype-ийн дүрэм)
    if (!stage.optional && photos.length === 0) {
      setError('⚠ Дор хаяж 1 зураг оруулна уу.');
      return;
    }
    setSaving(true);
    try {
      const byName = employeeProfile
        ? `${employeeProfile.firstName ?? ''} ${employeeProfile.lastName ?? ''}`.trim() || null
        : null;
      const checkpoint: TmsTransportCheckpoint = {
        completedAt: existing?.completedAt ?? new Date().toISOString(),
        byEmployeeId: existing?.byEmployeeId ?? user?.uid ?? null,
        byEmployeeName: existing?.byEmployeeName ?? byName,
        photoUrls: photos,
        checklist,
        notes: notes.trim() || null,
        km: stage.key === 'transit' && km !== '' ? Number(km) : null,
        fuelAmount: stage.key === 'transit' && fuelAmount !== '' ? Number(fuelAmount) : null,
      };
      const updates: Record<string, unknown> = {
        [`checkpoints.${stage.key}`]: checkpoint,
        updatedAt: serverTimestamp(),
      };
      // Transit-ийн км-ийг нийт зайд хуулна (prototype-ийн ижил зан төлөв)
      if (stage.key === 'transit' && km !== '' && Number(km) > 0) {
        updates.totalDistanceKm = Number(km);
      }
      await updateDoc(doc(firestore, TMS_ONE_TIME_TRANSPORTS_COLLECTION, transport.id), updates);
      toast({ title: `${stage.label} — баталгаажлаа.` });
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    } finally {
      setSaving(false);
    }
  }, [
    firestore,
    stage,
    photos,
    checklist,
    notes,
    km,
    fuelAmount,
    existing,
    user,
    employeeProfile,
    transport.id,
    toast,
    onOpenChange,
  ]);

  if (!stage) return null;

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="lg" showClose>
        <AppDialogHeader>
          <AppDialogTitle>
            {stage.icon} {stage.label}
          </AppDialogTitle>
          <AppDialogDescription>{stage.desc}</AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-5">
          {/* Checklist */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Шалгах зүйлс</p>
            {stage.checklist.map((item, idx) => {
              const key = String(idx);
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={!!checklist[key]}
                    onCheckedChange={(v) =>
                      setChecklist((prev) => ({ ...prev, [key]: v === true }))
                    }
                    className="mt-0.5"
                  />
                  <span>{item}</span>
                </label>
              );
            })}
          </div>

          {/* Зураг */}
          <CheckpointPhotoGrid
            photos={photos}
            onUpload={handleUpload}
            onRemove={(idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
            uploading={uploading}
            label={stage.photoLabel}
          />

          {/* Transit — км + шатахуун */}
          {stage.key === 'transit' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cp-km">🛣 Зарцуулсан км</Label>
                <Input
                  id="cp-km"
                  type="number"
                  min={0}
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                  placeholder="жишээ: 230"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cp-fuel">⛽ Шатахууны зардал (₮)</Label>
                <Input
                  id="cp-fuel"
                  type="number"
                  min={0}
                  value={fuelAmount}
                  onChange={(e) => setFuelAmount(e.target.value)}
                  placeholder="жишээ: 250000"
                />
              </div>
            </div>
          )}

          {/* Тэмдэглэл */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-notes">Тэмдэглэл</Label>
            <Textarea
              id="cp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Нэмэлт тайлбар..."
              rows={2}
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </AppDialogBody>
        <AppDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || uploading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ✓ Баталгаажуулах
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
