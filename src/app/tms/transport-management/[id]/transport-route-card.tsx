'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Pencil, AlertCircle, ArrowRight, Calendar } from 'lucide-react';
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody } from '@/components/patterns';
import dynamic from 'next/dynamic';
import type { TmsTransportManagement } from '@/app/tms/types';
import type { RefItem, WarehouseItem, VehicleListItem } from './use-transport-detail';

const RouteMap = dynamic(
  () => import('@/app/tms/quotations/[id]/transportations/[transportationId]/route-map').then((mod) => mod.RouteMap),
  { ssr: false },
);

interface RouteFormData {
  loadingRegionId: string;
  loadingWarehouseId: string;
  unloadingRegionId: string;
  unloadingWarehouseId: string;
  totalDistanceKm: number;
  loadingDate: string;
  unloadingDate: string;
}

interface TransportRouteCardProps {
  transport: TmsTransportManagement;
  regions: RefItem[];
  warehouses: WarehouseItem[];
  vehiclesList: VehicleListItem[];
  activeVehicleId?: string | null;
  getRegionName: (rid?: string) => string;
  getWarehouseName: (wid?: string) => string;
  onRouteChange: (changes: Partial<TmsTransportManagement>) => void;
}

export function TransportRouteCard({
  transport,
  regions,
  warehouses,
  vehiclesList,
  activeVehicleId,
  getRegionName,
  getWarehouseName,
  onRouteChange,
}: TransportRouteCardProps) {
  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState<RouteFormData | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setLocal({
        loadingRegionId: transport.loadingRegionId || '',
        loadingWarehouseId: transport.loadingWarehouseId || '',
        unloadingRegionId: transport.unloadingRegionId || '',
        unloadingWarehouseId: transport.unloadingWarehouseId || '',
        totalDistanceKm: transport.totalDistanceKm || 0,
        loadingDate: transport.loadingDate || '',
        unloadingDate: transport.unloadingDate || '',
      });
      setValidationError(null);
    }
  }, [open, transport]);

  const handleSave = () => {
    if (!local) return;
    if (local.totalDistanceKm < 0 || !isFinite(local.totalDistanceKm)) {
      setValidationError('Нийт зам зөв тоо байх ёстой.');
      return;
    }
    if (local.loadingDate && local.unloadingDate && local.unloadingDate < local.loadingDate) {
      setValidationError('Буулгах огноо нь ачих огнооноос өмнө байж болохгүй.');
      return;
    }
    setValidationError(null);
    onRouteChange(local);
    setOpen(false);
  };

  const loadingW = warehouses.find((w) => w.id === transport.loadingWarehouseId);
  const unloadingW = warehouses.find((w) => w.id === transport.unloadingWarehouseId);
  const selectedVehicle = activeVehicleId ? vehiclesList.find((v) => v.id === activeVehicleId) : null;
  const gpsDeviceId = selectedVehicle?.gpsDeviceId;

  const formatDate = (d?: string | null) => {
    if (!d) return null;
    try { return new Date(d).toLocaleDateString('mn-MN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-sm min-h-[380px] flex flex-col">
        <RouteMap loadingWarehouse={loadingW} unloadingWarehouse={unloadingW} gpsDeviceId={gpsDeviceId} />
        <CardContent className="p-0">
          <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
            {/* Loading point */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Ачих</span>
              </div>
              <div className="font-semibold text-sm truncate">{getRegionName(transport.loadingRegionId)}</div>
              <div className="text-xs text-muted-foreground truncate">{getWarehouseName(transport.loadingWarehouseId)}</div>
              {formatDate(transport.loadingDate) && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(transport.loadingDate)}
                </div>
              )}
            </div>

            {/* Distance pill */}
            <div className="flex flex-col items-center gap-1 shrink-0 px-2">
              <div className="flex items-center gap-1.5">
                <div className="h-px w-4 sm:w-8 bg-border" />
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="h-px w-4 sm:w-8 bg-border" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{transport.totalDistanceKm || 0} км</span>
            </div>

            {/* Unloading point */}
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center gap-1.5 mb-1 justify-end">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Буулгах</span>
                <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              </div>
              <div className="font-semibold text-sm truncate">{getRegionName(transport.unloadingRegionId)}</div>
              <div className="text-xs text-muted-foreground truncate">{getWarehouseName(transport.unloadingWarehouseId)}</div>
              {formatDate(transport.unloadingDate) && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground justify-end">
                  <Calendar className="h-3 w-3" />
                  {formatDate(transport.unloadingDate)}
                </div>
              )}
            </div>

            {/* Edit button */}
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} className="shrink-0 text-muted-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AppDialog open={open} onOpenChange={setOpen}>
        <AppDialogContent size="lg">
          <AppDialogHeader>
            <AppDialogTitle>Тээврийн чиглэл засах</AppDialogTitle>
          </AppDialogHeader>
          {local && (
            <AppDialogBody className="space-y-6 pt-4">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <h4 className="font-medium">Ачих</h4>
                  <div className="space-y-2">
                    <Label>Бүс</Label>
                    <Select
                      value={local.loadingRegionId}
                      onValueChange={(val) => {
                        setLocal((p) => p && { ...p, loadingRegionId: val, loadingWarehouseId: val !== p.loadingRegionId ? '' : p.loadingWarehouseId });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Бүс сонгох..." /></SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Агуулах</Label>
                    <Select value={local.loadingWarehouseId} onValueChange={(val) => setLocal((p) => p && { ...p, loadingWarehouseId: val })}>
                      <SelectTrigger><SelectValue placeholder={local.loadingRegionId ? 'Агуулах сонгох...' : 'Эхлээд бүс сонгоно уу'} /></SelectTrigger>
                      <SelectContent>
                        {(local.loadingRegionId ? warehouses.filter((w) => w.regionId === local.loadingRegionId) : warehouses).map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Огноо, цаг</Label>
                    <Input type="datetime-local" value={local.loadingDate} onChange={(e) => setLocal((p) => p && { ...p, loadingDate: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <h4 className="font-medium">Буулгах</h4>
                  <div className="space-y-2">
                    <Label>Бүс</Label>
                    <Select
                      value={local.unloadingRegionId}
                      onValueChange={(val) => {
                        setLocal((p) => p && { ...p, unloadingRegionId: val, unloadingWarehouseId: val !== p.unloadingRegionId ? '' : p.unloadingWarehouseId });
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Бүс сонгох..." /></SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Агуулах</Label>
                    <Select value={local.unloadingWarehouseId} onValueChange={(val) => setLocal((p) => p && { ...p, unloadingWarehouseId: val })}>
                      <SelectTrigger><SelectValue placeholder={local.unloadingRegionId ? 'Агуулах сонгох...' : 'Эхлээд бүс сонгоно уу'} /></SelectTrigger>
                      <SelectContent>
                        {(local.unloadingRegionId ? warehouses.filter((w) => w.regionId === local.unloadingRegionId) : warehouses).map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Огноо, цаг</Label>
                    <Input type="datetime-local" value={local.unloadingDate} onChange={(e) => setLocal((p) => p && { ...p, unloadingDate: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Нийт зам (км)</Label>
                  <Input type="number" min={0} value={local.totalDistanceKm} onChange={(e) => setLocal((p) => p && { ...p, totalDistanceKm: Number(e.target.value) })} />
                </div>
              </div>
              {validationError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {validationError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Цуцлах</Button>
                <Button onClick={handleSave}>Хадгалах</Button>
              </div>
            </AppDialogBody>
          )}
        </AppDialogContent>
      </AppDialog>
    </>
  );
}
