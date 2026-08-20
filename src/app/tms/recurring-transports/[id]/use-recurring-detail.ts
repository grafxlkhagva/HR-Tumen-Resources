'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { TMS_RECURRING_TRANSPORTS_COLLECTION } from '@/app/tms/types';
import type { TmsRecurringTransport, TmsRecurringTransportStatus } from '@/app/tms/types';
import { validateRtBeforeStart, validateRtBeforeComplete, type RtValidationResult } from '../lib';

const EMPTY_VALIDATION: RtValidationResult = { isComplete: false, missing: [] };

/** Засах формд БАЙХГҮЙ талбарууд — гэрээ/checkpoint/жин талаас нөхөгддөг */
const NON_FORM_FIELDS = new Set(['contractDistanceKm', 'contractRate', 'weighing']);

/**
 * Давтамжит тээврийн дэлгэрэнгүй хуудасны нэгдсэн hook —
 * баримт унших, статус шилжүүлэх, цуцлах/устгах/засах dialog-уудын state.
 */
export function useRecurringDetail() {
  const params = useParams();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const id = params?.id as string;

  const transportRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, TMS_RECURRING_TRANSPORTS_COLLECTION, id) : null),
    [firestore, id]
  );
  const { data: transport, isLoading } = useDoc<TmsRecurringTransport>(transportRef);

  // Dialog state
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [editOpen, setEditOpen] = React.useState(false);
  const [editHighlight, setEditHighlight] = React.useState<string[]>([]);

  // 404 — баримт олдоогүй бол жагсаалт руу буцаана
  React.useEffect(() => {
    if (id && !isLoading && transport === null) {
      router.replace('/tms/recurring-transports');
    }
  }, [id, isLoading, transport, router]);

  const startValidation = React.useMemo<RtValidationResult>(
    () => (transport ? validateRtBeforeStart(transport) : EMPTY_VALIDATION),
    [transport]
  );
  const completeValidation = React.useMemo<RtValidationResult>(
    () => (transport ? validateRtBeforeComplete(transport) : EMPTY_VALIDATION),
    [transport]
  );

  /**
   * Статус шилжүүлэх — шилжилтээс хамаарч startedAt/completedAt/cancelReason
   * талбаруудыг зэрэг шинэчилнэ (одоогийн статусаар ялгана).
   */
  const updateStatus = React.useCallback(
    async (next: TmsRecurringTransportStatus) => {
      if (!firestore || !id || !transport) return;
      try {
        const updates: Record<string, unknown> = {
          status: next,
          updatedAt: serverTimestamp(),
        };
        if (next === 'in_progress') {
          if (transport.status === 'completed') {
            // Дуусгасныг буцаах — эхэлсэн хугацаа хэвээр, дууссан хугацааг арилгана
            updates.completedAt = null;
          } else {
            updates.startedAt = serverTimestamp();
          }
        }
        if (next === 'completed') {
          updates.completedAt = serverTimestamp();
        }
        if (next === 'planned') {
          if (transport.status === 'in_progress') updates.startedAt = null;
          if (transport.status === 'cancelled') updates.cancelReason = null;
        }
        // Төлөгдсөн болоход захиалагчийн төлбөрийн төлөв мөн шинэчлэгдэнэ (prototype cascade)
        if (next === 'paid') updates.paymentStatus = 'paid';
        if (transport.status === 'paid' && next === 'invoiced') updates.paymentStatus = 'unpaid';
        await updateDoc(doc(firestore, TMS_RECURRING_TRANSPORTS_COLLECTION, id), updates);
        toast({ title: 'Статус шинэчлэгдлээ.' });
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: e instanceof Error ? e.message : 'Статус шинэчлэхэд алдаа гарлаа.',
        });
      }
    },
    [firestore, id, transport, toast]
  );

  /** Цуцлах — шалтгаан заавал */
  const confirmCancel = React.useCallback(async () => {
    if (!firestore || !id) return;
    if (!cancelReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Цуцлах шалтгаанаа бичнэ үү.',
      });
      return;
    }
    try {
      await updateDoc(doc(firestore, TMS_RECURRING_TRANSPORTS_COLLECTION, id), {
        status: 'cancelled',
        cancelReason: cancelReason.trim(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Тээвэр цуцлагдлаа.' });
      setCancelOpen(false);
      setCancelReason('');
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Цуцлахад алдаа гарлаа.',
      });
    }
  }, [firestore, id, cancelReason, toast]);

  const requestDelete = React.useCallback(() => setDeleteOpen(true), []);

  const confirmDelete = React.useCallback(async () => {
    if (!firestore || !id) return;
    try {
      await deleteDoc(doc(firestore, TMS_RECURRING_TRANSPORTS_COLLECTION, id));
      toast({ title: 'Тээвэр устгагдлаа.' });
      router.push('/tms/recurring-transports');
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    }
  }, [firestore, id, router, toast]);

  /**
   * Дутуу талбаруудыг тодруулж засах dialog нээх —
   * checkpoint_*, гэрээний зай/үнэлгээ, жин формд байхгүй тул шүүнэ.
   */
  const openEditWithMissing = React.useCallback(() => {
    setEditHighlight(
      startValidation.missing
        .map((m) => m.field)
        .filter((f) => !f.startsWith('checkpoint') && !NON_FORM_FIELDS.has(f))
    );
    setEditOpen(true);
  }, [startValidation]);

  return {
    transport,
    isLoading,
    startValidation,
    completeValidation,
    updateStatus,
    requestDelete,
    confirmDelete,
    deleteOpen,
    setDeleteOpen,
    cancelOpen,
    setCancelOpen,
    cancelReason,
    setCancelReason,
    confirmCancel,
    editOpen,
    setEditOpen,
    editHighlight,
    openEditWithMissing,
  };
}
