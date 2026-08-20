'use client';

import * as React from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { QT_REJECT_QUICK_REASONS } from '../constants';

/** Татгалзсан болгох dialog — шалтгаан заавал, түргэн сонголтын chips-тэй */
export function RejectQuoteDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  // Нээгдэх бүрт цэвэрлэнэ
  React.useEffect(() => {
    if (open) {
      setReason('');
      setSubmitting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Татгалзсан шалтгаанаа бичнэ үү.',
      });
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      onOpenChange(false);
    } catch {
      // Алдааны toast-ыг эцэг тал (hook) харуулсан — dialog нээлттэй үлдэнэ
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="sm">
        <AppDialogHeader>
          <AppDialogTitle>✗ Татгалзсан болгох</AppDialogTitle>
          <AppDialogDescription>
            Татгалзсан шалтгаанаа заавал бичнэ — жагсаалт, тайланд харагдана.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {QT_REJECT_QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-accent hover:text-accent-foreground"
              >
                {r}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label htmlFor="qt-reject-reason" className="text-sm font-medium">
              Татгалзсан шалтгаан *
            </label>
            <Textarea
              id="qt-reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="жишээ: Үнэ өндөр"
              rows={3}
            />
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={submitting}>
            Татгалзсан болгох
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
