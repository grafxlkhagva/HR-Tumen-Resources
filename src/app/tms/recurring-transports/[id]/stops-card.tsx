'use client';

import * as React from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { TMS_RECURRING_TRANSPORTS_COLLECTION } from '@/app/tms/types';
import type { TmsRecurringStop, TmsRecurringTransport } from '@/app/tms/types';
import { formatMoney } from '../lib';

/**
 * 🚚 Түгээлтийн зогсоолын карт — хүргэлт тэмдэглэх (✓/⤺), зогсоол нэмэх/устгах.
 * Зөвхөн tugeelt төрлийн тээвэрт харагдана.
 */
export function StopsCard({ transport }: { transport: TmsRecurringTransport }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const stops = React.useMemo(
    () => [...(transport.stops ?? [])].sort((a, b) => a.sequence - b.sequence),
    [transport.stops]
  );
  const editable = transport.status !== 'cancelled';

  const [busy, setBusy] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [newAddress, setNewAddress] = React.useState('');
  const [newRecipientName, setNewRecipientName] = React.useState('');
  const [newRecipientPhone, setNewRecipientPhone] = React.useState('');
  const [addError, setAddError] = React.useState<string | null>(null);
  const [removeStop, setRemoveStop] = React.useState<TmsRecurringStop | null>(null);

  const writeStops = React.useCallback(
    async (nextStops: TmsRecurringStop[], successTitle: string) => {
      if (!firestore) return false;
      setBusy(true);
      try {
        await updateDoc(doc(firestore, TMS_RECURRING_TRANSPORTS_COLLECTION, transport.id), {
          stops: nextStops,
          updatedAt: serverTimestamp(),
        });
        toast({ title: successTitle });
        return true;
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: 'Алдаа',
          description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [firestore, transport.id, toast]
  );

  // ✓ Хүргэсэн / ⤺ буцаах — статусыг эргэлттэй солино
  const toggleDelivered = React.useCallback(
    (stop: TmsRecurringStop) => {
      const delivered = stop.status === 'delivered';
      const next = stops.map((s) =>
        s.id === stop.id
          ? {
              ...s,
              status: delivered ? ('pending' as const) : ('delivered' as const),
              deliveredAt: delivered ? null : new Date().toISOString(),
            }
          : s
      );
      void writeStops(next, delivered ? '⤺ Хүргэлт буцаагдлаа.' : '✓ Хүргэсэн гэж тэмдэглэлээ.');
    },
    [stops, writeStops]
  );

  const handleAdd = React.useCallback(async () => {
    if (!newAddress.trim()) {
      setAddError('⚠ Хаяг заавал бөглөнө.');
      return;
    }
    setAddError(null);
    const maxSeq = stops.reduce((max, s) => Math.max(max, s.sequence), 0);
    const stop: TmsRecurringStop = {
      id: crypto.randomUUID(),
      sequence: maxSeq + 1,
      address: newAddress.trim(),
      recipientName: newRecipientName.trim() || null,
      recipientPhone: newRecipientPhone.trim() || null,
      status: 'pending',
      deliveredAt: null,
      notes: null,
    };
    const ok = await writeStops([...stops, stop], '➕ Зогсоол нэмэгдлээ.');
    if (ok) {
      setNewAddress('');
      setNewRecipientName('');
      setNewRecipientPhone('');
      setAdding(false);
    }
  }, [newAddress, newRecipientName, newRecipientPhone, stops, writeStops]);

  const handleRemove = React.useCallback(() => {
    if (!removeStop) return;
    const next = stops.filter((s) => s.id !== removeStop.id);
    void writeStops(next, '× Зогсоол устгагдлаа.');
    setRemoveStop(null);
  }, [removeStop, stops, writeStops]);

  if (transport.type !== 'tugeelt') return null;

  return (
    <Card className="p-4 sm:p-5">
      {/* Толгой */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          🚚 ТҮГЭЭЛТ · {stops.length} зогсоол
          {transport.distributionZone ? ` · ${transport.distributionZone}` : ''}
        </h3>
        {transport.perStopRate ? (
          <span className="text-xs text-muted-foreground">
            Зогсоол тутамд: {formatMoney(transport.perStopRate)}
          </span>
        ) : null}
      </div>

      {stops.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">№</TableHead>
                <TableHead>Хаяг</TableHead>
                <TableHead>Хүлээн авагч</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {stops.map((stop, idx) => {
                const delivered = stop.status === 'delivered';
                return (
                  <TableRow key={stop.id}>
                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>{stop.address || '—'}</TableCell>
                    <TableCell>{stop.recipientName || ''}</TableCell>
                    <TableCell className="text-xs">{stop.recipientPhone || ''}</TableCell>
                    <TableCell>
                      {delivered ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Badge variant="success">Хүргэсэн</Badge>
                          {stop.deliveredAt ? (
                            <span className="text-[10px] text-muted-foreground">
                              {stop.deliveredAt.slice(0, 10)}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <Badge variant="secondary">Хүлээгдэж буй</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editable ? (
                        <div className="flex items-center justify-end gap-1">
                          {delivered ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              title="Хүргэлтийг буцаах"
                              disabled={busy}
                              onClick={() => toggleDelivered(stop)}
                            >
                              ⤺
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              title="Хүргэсэн гэж тэмдэглэх"
                              disabled={busy}
                              onClick={() => toggleDelivered(stop)}
                            >
                              ✓ Хүргэсэн
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            title="Зогсоол устгах"
                            disabled={busy}
                            onClick={() => setRemoveStop(stop)}
                          >
                            ×
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Зогсоол бүртгээгүй.</p>
      )}

      {/* + Зогсоол нэмэх */}
      {editable && (
        <div className="mt-3">
          {adding ? (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Хаяг *"
                  autoFocus
                />
                <Input
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  placeholder="Хүлээн авагч"
                />
                <Input
                  value={newRecipientPhone}
                  onChange={(e) => setNewRecipientPhone(e.target.value)}
                  placeholder="Утас"
                />
              </div>
              {addError && <p className="text-xs font-medium text-destructive">{addError}</p>}
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setAdding(false);
                    setAddError(null);
                  }}
                >
                  Болих
                </Button>
                <Button type="button" size="sm" disabled={busy} onClick={() => void handleAdd()}>
                  {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  ✓ Нэмэх
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
              + Зогсоол нэмэх
            </Button>
          )}
        </div>
      )}

      {/* × Устгах баталгаажуулалт */}
      <AlertDialog open={!!removeStop} onOpenChange={(o) => !o && setRemoveStop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Зогсоол устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeStop ? `"${removeStop.address}" зогсоол бүрмөсөн устгагдана.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
