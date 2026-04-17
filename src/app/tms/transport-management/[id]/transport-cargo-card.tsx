'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody } from '@/components/patterns';
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
import type { TmsQuotationCargo } from '@/app/tms/types';
import type { RefItem } from './use-transport-detail';

interface TransportCargoCardProps {
  cargos: TmsQuotationCargo[];
  packagingTypes: RefItem[];
  onAddCargo: (cargo: Partial<TmsQuotationCargo>) => boolean;
  /** Ачааны мэдээллийг шинэчлэх. Буруу оролт буцаах нөхцөлд `false`. */
  onEditCargo?: (cargoId: string, patch: Partial<TmsQuotationCargo>) => boolean;
  onRemoveCargo: (cargoId: string) => void;
  cargoToDelete: string | null;
  setCargoToDelete: (id: string | null) => void;
}

export function TransportCargoCard({
  cargos,
  packagingTypes,
  onAddCargo,
  onEditCargo,
  onRemoveCargo,
  cargoToDelete,
  setCargoToDelete,
}: TransportCargoCardProps) {
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingCargoId, setEditingCargoId] = React.useState<string | null>(null);
  const [newCargo, setNewCargo] = React.useState<Partial<TmsQuotationCargo>>({
    name: '',
    quantity: 1,
    unit: 'kg',
    packagingTypeId: '',
    note: '',
  });

  const dialogMode: 'add' | 'edit' = editingCargoId ? 'edit' : 'add';

  const openEdit = (cargo: TmsQuotationCargo) => {
    setEditingCargoId(cargo.id);
    setNewCargo({
      name: cargo.name,
      quantity: cargo.quantity,
      unit: cargo.unit,
      packagingTypeId: cargo.packagingTypeId ?? '',
      note: cargo.note ?? '',
    });
    setAddOpen(true);
  };

  const resetForm = () => {
    setNewCargo({ name: '', quantity: 1, unit: 'kg', packagingTypeId: '', note: '' });
    setEditingCargoId(null);
  };

  const handleSubmit = () => {
    if (dialogMode === 'edit' && editingCargoId) {
      if (!onEditCargo) {
        setAddOpen(false);
        resetForm();
        return;
      }
      const ok = onEditCargo(editingCargoId, newCargo);
      if (ok) {
        resetForm();
        setAddOpen(false);
      }
      return;
    }
    const ok = onAddCargo(newCargo);
    if (ok) {
      resetForm();
      setAddOpen(false);
    }
  };

  const cargoToDeleteName = cargoToDelete ? cargos.find((c) => c.id === cargoToDelete)?.name : null;

  const UNIT_LABELS: Record<string, string> = { kg: 'кг', tons: 'тн', pcs: 'ш', liters: 'л', m3: 'м³' };
  const cargoSummary = React.useMemo(() => {
    if (cargos.length === 0) return '';
    const map: Record<string, number> = {};
    cargos.forEach((c) => { map[c.unit] = (map[c.unit] || 0) + (c.quantity || 0); });
    return Object.entries(map).map(([unit, qty]) => `${qty} ${UNIT_LABELS[unit] || unit}`).join(', ');
  }, [cargos]);

  return (
    <>
      <Card className="flex flex-col h-full border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Ачаа</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => setAddOpen(true)}>
            <Plus className="h-3 w-3" />
            Нэмэх
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col">
          {cargos.length === 0 ? (
            <div className="text-xs text-muted-foreground flex items-center justify-center flex-1 px-4 py-6">
              Ачаа бүртгэгдээгүй
            </div>
          ) : (
            <div className="divide-y max-h-[180px] overflow-y-auto">
              {cargos.map((cargo) => (
                <div key={cargo.id} className="relative px-4 py-2.5 group hover:bg-muted/30 transition-colors">
                  <div className="absolute top-2 right-3 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEditCargo && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`"${cargo.name}" ачааг засах`}
                        className="text-muted-foreground hover:text-foreground h-5 w-5"
                        onClick={() => openEdit(cargo)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`"${cargo.name}" ачааг устгах`}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-5 w-5"
                      onClick={() => setCargoToDelete(cargo.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="pr-6 flex items-baseline gap-2">
                    <span className="font-medium text-sm truncate" title={cargo.name}>{cargo.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {cargo.quantity} {UNIT_LABELS[cargo.unit] || cargo.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {cargos.length > 0 && cargoSummary && (
            <div className="border-t mt-auto px-4 py-2 text-xs text-muted-foreground">
              Нийт: <span className="font-medium text-foreground">{cargoSummary}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cargo add/edit dialog (режим нь editingCargoId байгаа эсэхээс хамаарна) */}
      <AppDialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) resetForm();
        }}
      >
        <AppDialogContent size="md">
          <AppDialogHeader>
            <AppDialogTitle>
              {dialogMode === 'edit' ? 'Ачаа засах' : 'Ачаа нэмэх'}
            </AppDialogTitle>
          </AppDialogHeader>
          <AppDialogBody className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Ачааны нэр</Label>
              <Input placeholder="Жишээ нь: Цемент" value={newCargo.name || ''} onChange={(e) => setNewCargo((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Хэмжээ</Label>
                <Input type="number" min={0} step="any" value={newCargo.quantity || ''} onChange={(e) => setNewCargo((p) => ({ ...p, quantity: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Нэгж</Label>
                <Select value={newCargo.unit || 'kg'} onValueChange={(val) => setNewCargo((p) => ({ ...p, unit: val as TmsQuotationCargo['unit'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">кг</SelectItem>
                    <SelectItem value="tons">тн</SelectItem>
                    <SelectItem value="pcs">ш</SelectItem>
                    <SelectItem value="liters">л</SelectItem>
                    <SelectItem value="m3">м³</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Баглаа боодол</Label>
              <Select value={newCargo.packagingTypeId || ''} onValueChange={(val) => setNewCargo((p) => ({ ...p, packagingTypeId: val }))}>
                <SelectTrigger><SelectValue placeholder="Сонгох..." /></SelectTrigger>
                <SelectContent>
                  {packagingTypes.map((pt) => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тэмдэглэл</Label>
              <Input placeholder="..." value={newCargo.note || ''} onChange={(e) => setNewCargo((p) => ({ ...p, note: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  resetForm();
                }}
              >
                Цуцлах
              </Button>
              <Button onClick={handleSubmit}>
                {dialogMode === 'edit' ? 'Хадгалах' : 'Нэмэх'}
              </Button>
            </div>
          </AppDialogBody>
        </AppDialogContent>
      </AppDialog>

      {/* Phase 4.2: cargo delete confirmation */}
      <AlertDialog open={!!cargoToDelete} onOpenChange={(open) => !open && setCargoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ачаа устгах</AlertDialogTitle>
            <AlertDialogDescription>
              {cargoToDeleteName ? `"${cargoToDeleteName}" ачааг устгахдаа итгэлтэй байна уу?` : 'Энэ ачааг устгахдаа итгэлтэй байна уу?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => cargoToDelete && onRemoveCargo(cargoToDelete)}
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
