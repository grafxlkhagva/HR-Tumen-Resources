'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { TMS_QUOTES_COLLECTION } from '@/app/tms/types';
import type { TmsQuote, TmsQuoteStatus } from '@/app/tms/types';
import { canTransition } from '../lib';

/** Өнөөдрийн огноо — 'YYYY-MM-DD' */
const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Үнийн саналын дэлгэрэнгүй хуудасны нэгдсэн hook —
 * баримт унших, статус шилжүүлэх, хөлдөөх, татгалзах/устгах/засах dialog-уудын state.
 */
export function useQuoteDetail() {
  const params = useParams();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const id = params?.id as string;

  const quoteRef = useMemoFirebase(
    () => (firestore && id ? doc(firestore, TMS_QUOTES_COLLECTION, id) : null),
    [firestore, id]
  );
  const { data: quote, isLoading } = useDoc<TmsQuote>(quoteRef);

  // Dialog state
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  /** P3 — тээвэр болгох хөрвүүлэлтийн dialog (одоогоор зөвхөн boolean) */
  const [convertOpen, setConvertOpen] = React.useState(false);

  // 404 — баримт олдоогүй бол жагсаалт руу буцаана
  React.useEffect(() => {
    if (id && !isLoading && quote === null) {
      router.replace('/tms/quotes');
    }
  }, [id, isLoading, quote, router]);

  /**
   * Статус шилжүүлэх — canTransition-оор хамгаалж, шилжилтээс хамаарч
   * sentDate/acceptedDate/rejectReason талбаруудыг зэрэг шинэчилнэ.
   * (rejected нь энэ функцээр БИШ — confirmReject-ээр шалтгаантай хийгдэнэ)
   */
  const updateStatus = React.useCallback(
    async (next: TmsQuoteStatus) => {
      if (!firestore || !id || !quote) return;
      if (!canTransition(quote.status, next)) {
        toast({ variant: 'destructive', title: 'Энэ шилжилт боломжгүй.' });
        return;
      }
      try {
        const updates: Record<string, unknown> = {
          status: next,
          updatedAt: serverTimestamp(),
        };
        if (next === 'sent') {
          updates.sentDate = todayISO();
          if (['accepted', 'rejected', 'expired'].includes(quote.status)) {
            // Дахин санал болгох — хүчинтэй хугацааны цонх шинээр эхэлнэ
            updates.acceptedDate = null;
            updates.rejectReason = null;
          }
        }
        if (next === 'draft') {
          updates.sentDate = null;
        }
        if (next === 'accepted') {
          updates.acceptedDate = todayISO();
        }
        // next === 'expired' — нэмэлт талбар байхгүй
        await updateDoc(doc(firestore, TMS_QUOTES_COLLECTION, id), updates);
        toast({ title: 'Статус шинэчлэгдлээ.' });
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: e instanceof Error ? e.message : 'Статус шинэчлэхэд алдаа гарлаа.',
        });
      }
    },
    [firestore, id, quote, toast]
  );

  /** Татгалзсан болгох — шалтгаан заавал (RejectQuoteDialog-оос дуудагдана) */
  const confirmReject = React.useCallback(
    async (reason: string) => {
      if (!firestore || !id) return;
      try {
        await updateDoc(doc(firestore, TMS_QUOTES_COLLECTION, id), {
          status: 'rejected',
          rejectReason: reason,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Татгалзсан болгож тэмдэглэлээ.' });
        setRejectOpen(false);
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: e instanceof Error ? e.message : 'Татгалзахад алдаа гарлаа.',
        });
        // Dialog хаагдалгүй үлдэхийн тулд алдааг цааш дамжуулна
        throw e;
      }
    },
    [firestore, id, toast]
  );

  /** Хөлдөөх / тайлах — статусаас хараат бус, засварыг хаана */
  const toggleLock = React.useCallback(async () => {
    if (!firestore || !id || !quote) return;
    const nextLocked = !quote.isLocked;
    try {
      await updateDoc(doc(firestore, TMS_QUOTES_COLLECTION, id), {
        isLocked: nextLocked,
        lockedAt: nextLocked ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
      toast({ title: nextLocked ? 'Санал хөлдөөгдлөө.' : 'Хөлдөөлт тайлагдлаа.' });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хөлдөөлт өөрчлөхөд алдаа гарлаа.',
      });
    }
  }, [firestore, id, quote, toast]);

  const requestDelete = React.useCallback(() => setDeleteOpen(true), []);

  const confirmDelete = React.useCallback(async () => {
    if (!firestore || !id) return;
    try {
      await deleteDoc(doc(firestore, TMS_QUOTES_COLLECTION, id));
      toast({ title: 'Үнийн санал устгагдлаа.' });
      router.push('/tms/quotes');
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    }
  }, [firestore, id, router, toast]);

  return {
    quote,
    isLoading,
    updateStatus,
    confirmReject,
    toggleLock,
    requestDelete,
    confirmDelete,
    deleteOpen,
    setDeleteOpen,
    rejectOpen,
    setRejectOpen,
    editOpen,
    setEditOpen,
    convertOpen,
    setConvertOpen,
  };
}
