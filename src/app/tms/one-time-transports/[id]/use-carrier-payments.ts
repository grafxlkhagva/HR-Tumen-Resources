'use client';

import * as React from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { TMS_ONE_TIME_TRANSPORTS_COLLECTION } from '@/app/tms/types';
import type {
  TmsCarrierPayment,
  TmsCarrierPaymentStatus,
  TmsExtraInvoiceLine,
  TmsOneTimeTransport,
} from '@/app/tms/types';
import { buildCarrierPaymentSchedule, calcTotal, calcVat } from '../lib';

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Тээвэрчний төлбөрийн мөрүүдийн бүх мутаци — runTransaction дотор баримтыг
 * шинээр уншиж массивыг өөрчилнө (зэрэг засварын мөргөлдөөнөөс сэргийлнэ).
 */
export function useCarrierPayments(transport: TmsOneTimeTransport) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const id = transport.id;

  /** Transaction дотор carrierPayments массивыг өөрчлөх ерөнхий хэлбэр */
  const mutate = React.useCallback(
    async (
      fn: (current: TmsOneTimeTransport) => Partial<Record<string, unknown>> | null,
      successMsg?: string
    ): Promise<boolean> => {
      if (!firestore || !id) return false;
      try {
        await runTransaction(firestore, async (transaction) => {
          const ref = doc(firestore, TMS_ONE_TIME_TRANSPORTS_COLLECTION, id);
          const snap = await transaction.get(ref);
          if (!snap.exists()) throw new Error('Тээвэр олдсонгүй.');
          const current = { id, ...snap.data() } as TmsOneTimeTransport;
          const updates = fn(current);
          if (!updates) return;
          transaction.update(ref, { ...updates, updatedAt: serverTimestamp() });
        });
        if (successMsg) toast({ title: successMsg });
        return true;
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: e instanceof Error ? e.message : 'Төлбөрийн мэдээлэл хадгалахад алдаа гарлаа.',
        });
        return false;
      }
    },
    [firestore, id, toast]
  );

  const patchRow = React.useCallback(
    (rows: TmsCarrierPayment[], rowId: string, patch: Partial<TmsCarrierPayment>) =>
      rows.map((r) =>
        r.id === rowId ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
      ),
    []
  );

  /** Эгнээ хооронд шилжүүлэх: scheduled ⇄ approved (⤺ буцаалт мөн үүгээр) */
  const setStatus = React.useCallback(
    (rowId: string, status: TmsCarrierPaymentStatus, successMsg?: string) =>
      mutate((cur) => {
        const rows = cur.carrierPayments ?? [];
        if (!rows.some((r) => r.id === rowId)) throw new Error('Төлбөрийн мөр олдсонгүй.');
        return { carrierPayments: patchRow(rows, rowId, { status }) };
      }, successMsg ?? 'Төлөв шинэчлэгдлээ.'),
    [mutate, patchRow]
  );

  /** ✓ Төлсөн болгох — огноо/арга/гүйлгээний утгатай */
  const markPaid = React.useCallback(
    (
      rowId: string,
      info: { paymentDate: string; method: string; reference: string }
    ) =>
      mutate((cur) => {
        const rows = cur.carrierPayments ?? [];
        if (!rows.some((r) => r.id === rowId)) throw new Error('Төлбөрийн мөр олдсонгүй.');
        return {
          carrierPayments: patchRow(rows, rowId, {
            status: 'paid',
            paymentDate: info.paymentDate,
            method: info.method,
            reference: info.reference || null,
          }),
        };
      }, 'Төлбөр төлсөн гэж бүртгэгдлээ.'),
    [mutate, patchRow]
  );

  /** ⤺ Төлснийг буцаах — Санхүү эгнээ рүү, огноог арилгана */
  const unmarkPaid = React.useCallback(
    (rowId: string) =>
      mutate((cur) => {
        const rows = cur.carrierPayments ?? [];
        if (!rows.some((r) => r.id === rowId)) throw new Error('Төлбөрийн мөр олдсонгүй.');
        return {
          carrierPayments: patchRow(rows, rowId, { status: 'approved', paymentDate: null }),
        };
      }, 'Төлбөр буцаагдлаа.'),
    [mutate, patchRow]
  );

  /** ✏ Хуваарьт мөр засах — шалтгаан ЗААВАЛ, notes-д хавсаргана */
  const editScheduled = React.useCallback(
    (rowId: string, info: { amount: number; dueDate: string | null; reason: string }) =>
      mutate((cur) => {
        const rows = cur.carrierPayments ?? [];
        const row = rows.find((r) => r.id === rowId);
        if (!row) throw new Error('Төлбөрийн мөр олдсонгүй.');
        const baseNote = (row.notes ?? '').split(' · ✏')[0];
        return {
          carrierPayments: patchRow(rows, rowId, {
            amount: Math.round(info.amount),
            dueDate: info.dueDate,
            notes: `${baseNote} · ✏ ${info.reason}`,
          }),
        };
      }, 'Төлбөрийн мөр засагдлаа.'),
    [mutate, patchRow]
  );

  /** × Мөр устгах */
  const removeRow = React.useCallback(
    (rowId: string) =>
      mutate((cur) => {
        const rows = cur.carrierPayments ?? [];
        if (!rows.some((r) => r.id === rowId)) throw new Error('Төлбөрийн мөр олдсонгүй.');
        return { carrierPayments: rows.filter((r) => r.id !== rowId) };
      }, 'Төлбөрийн мөр устгагдлаа.'),
    [mutate]
  );

  /** 🔄 Хоосон үед урьдчилгаа/үлдэгдлийн хуваарийг дахин үүсгэх */
  const regenerateSchedule = React.useCallback(
    () =>
      mutate((cur) => {
        if ((cur.carrierPayments ?? []).length > 0) {
          throw new Error('Хуваарь аль хэдийн үүссэн байна.');
        }
        const rows = buildCarrierPaymentSchedule({
          type: cur.type,
          costPrice: cur.costPrice,
          scheduledDate: cur.scheduledDate,
          carrierAdvanceAmount: cur.carrierAdvanceAmount,
          carrierAdvancePct: cur.carrierAdvancePct,
        });
        if (!rows.length) throw new Error('Тээвэрчинд төлөх дүн (өртөг) бүртгэгдээгүй байна.');
        return { carrierPayments: rows };
      }, 'Өглөгийн төлөвлөгөө үүслээ.'),
    [mutate]
  );

  /** 📤 Тээвэрчинд нэмж өгөх — seq-3 мөр нэмж, costPrice-г өсгөнө */
  const addExtraCarrierPayment = React.useCallback(
    (info: { amount: number; notes: string; method: string | null }) =>
      mutate((cur) => {
        const amount = Math.round(info.amount);
        if (amount <= 0) throw new Error('Дүн 0-ээс их байх ёстой.');
        const rows = cur.carrierPayments ?? [];
        const nextSeq = Math.max(2, ...rows.map((r) => r.sequence)) + 1;
        const newRow: TmsCarrierPayment = {
          id: genId(),
          sequence: nextSeq,
          category: 'extra',
          status: 'scheduled',
          amount,
          dueDate: null,
          method: info.method,
          notes: info.notes,
          createdAt: new Date().toISOString(),
        };
        return {
          carrierPayments: [...rows, newRow],
          costPrice: Math.round(cur.costPrice || 0) + amount,
        };
      }, 'Тээвэрчинд өгөх нэмэлт төлбөр бүртгэгдлээ.'),
    [mutate]
  );

  /** 📥 Харилцагчаас нэмж авах — extraInvoiceLines + base/vat/total өснө */
  const addExtraInvoiceLine = React.useCallback(
    (info: { amount: number; notes: string; date: string | null }) =>
      mutate((cur) => {
        const amount = Math.round(info.amount);
        if (amount <= 0) throw new Error('Дүн 0-ээс их байх ёстой.');
        const line: TmsExtraInvoiceLine = {
          id: genId(),
          date: info.date,
          amount,
          notes: info.notes,
          createdAt: new Date().toISOString(),
        };
        const newBase = Math.round(cur.basePrice || 0) + amount;
        return {
          extraInvoiceLines: [...(cur.extraInvoiceLines ?? []), line],
          basePrice: newBase,
          vatAmount: calcVat(newBase),
          totalPrice: calcTotal(newBase),
        };
      }, 'Харилцагчаас авах нэмэлт төлбөр бүртгэгдлээ.'),
    [mutate]
  );

  return {
    setStatus,
    markPaid,
    unmarkPaid,
    editScheduled,
    removeRow,
    regenerateSchedule,
    addExtraCarrierPayment,
    addExtraInvoiceLine,
  };
}
