'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Truck, UserCircle, Container } from 'lucide-react';
import Link from 'next/link';
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody } from '@/components/patterns';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { TmsTransportManagement, TmsTransportSubUnit, TmsContractService } from '@/app/tms/types';
import type { RefItem, VehicleListItem, DriverListItem } from './use-transport-detail';

interface VehicleFormData {
  vehicleId: string | null;
  driverId: string | null;
  vehicleTypeId: string;
  trailerTypeId: string;
}

interface TransportVehicleCardProps {
  transport: TmsTransportManagement;
  item: (TmsTransportManagement & { id: string }) | null;
  normalizedSubTransports: TmsTransportSubUnit[];
  activeSubTransport: TmsTransportSubUnit | null;
  activeSubTransportId: string;
  setActiveSubTransportId: (id: string) => void;
  vehicleTypes: RefItem[];
  trailerTypes: RefItem[];
  vehiclesList: VehicleListItem[];
  driversList: DriverListItem[];
  vehicleSearchOptions: { value: string; label: string }[];
  driverSearchOptions: { value: string; label: string }[];
  linkedContractService: TmsContractService | null;
  onSubTransportChange: (field: 'vehicleId' | 'driverId', value: string | null) => void;
  onTransportChange: (field: keyof TmsTransportManagement, value: unknown) => void;
  getVehicleTypeName: (vid?: string) => string;
  getTrailerTypeName: (trid?: string) => string;
}

export function TransportVehicleCard({
  transport,
  item,
  normalizedSubTransports,
  activeSubTransport,
  activeSubTransportId,
  setActiveSubTransportId,
  vehicleTypes,
  trailerTypes,
  vehiclesList,
  driversList,
  vehicleSearchOptions,
  driverSearchOptions,
  linkedContractService,
  onSubTransportChange,
  onTransportChange,
  getVehicleTypeName,
  getTrailerTypeName,
}: TransportVehicleCardProps) {
  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState<VehicleFormData | null>(null);

  React.useEffect(() => {
    if (open) {
      setLocal({
        vehicleId: activeSubTransport?.vehicleId ?? null,
        driverId: activeSubTransport?.driverId ?? null,
        vehicleTypeId: transport.vehicleTypeId || '',
        trailerTypeId: transport.trailerTypeId || '',
      });
    }
  }, [open, activeSubTransport, transport.vehicleTypeId, transport.trailerTypeId]);

  const handleSave = () => {
    if (!local) return;
    onSubTransportChange('vehicleId', local.vehicleId);
    onSubTransportChange('driverId', local.driverId);
    onTransportChange('vehicleTypeId', local.vehicleTypeId);
    onTransportChange('trailerTypeId', local.trailerTypeId);
    setOpen(false);
  };

  const activeDriverDisplay = React.useMemo(() => {
    if (!activeSubTransport?.driverId) return 'Сонгоогүй';
    const d = driversList.find((dr) => dr.id === activeSubTransport.driverId);
    if (!d) return 'Сонгоогүй';
    return `${d.lastName || ''} ${d.firstName || ''} ${d.phone ? `(${d.phone})` : ''}`.trim();
  }, [activeSubTransport?.driverId, driversList]);

  return (
    <>
      <Card className="flex flex-col h-full border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Тээврийн хэрэгсэл</CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} className="text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 flex-1">
          {normalizedSubTransports.length > 1 && (
            <Tabs value={activeSubTransport?.id || ''} onValueChange={setActiveSubTransportId}>
              <TabsList className="h-auto w-full justify-start flex-wrap">
                {normalizedSubTransports.map((s) => (
                  <TabsTrigger key={s.id} value={s.id} className="text-xs">
                    {`${transport.code || 'TR'}-${s.subCode}`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">Машин</div>
                <div className="font-medium text-sm truncate">
                  {activeSubTransport?.vehicleId
                    ? vehiclesList.find((v) => v.id === activeSubTransport.vehicleId)?.licensePlate || '—'
                    : getVehicleTypeName(transport.vehicleTypeId)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">Жолооч</div>
                <div className="font-medium text-sm truncate">{activeDriverDisplay}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Container className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">Тэвш</div>
                <div className="font-medium text-sm truncate">{getTrailerTypeName(transport.trailerTypeId)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AppDialog open={open} onOpenChange={setOpen}>
        <AppDialogContent>
          <AppDialogHeader><AppDialogTitle>Тээврийн хэрэгсэл засах</AppDialogTitle></AppDialogHeader>
          {local && (
            <AppDialogBody className="space-y-4 pt-4">
              {activeSubTransport && (
                <div className="text-xs text-muted-foreground">
                  Засварлаж буй таб: <span className="font-medium text-foreground">{`${transport.code || 'TR'}-${activeSubTransport.subCode}`}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>Тодорхой машин оноох</Label>
                <SearchableSelect
                  options={vehicleSearchOptions}
                  value={local.vehicleId || 'none'}
                  onValueChange={(val) => setLocal((p) => p && { ...p, vehicleId: val === 'none' ? null : val })}
                  placeholder="Сонгох..."
                  searchPlaceholder="Улсын дугаар, үйлдвэрлэгч, загвар хайх..."
                  emptyText="Тээврийн хэрэгсэл олдсонгүй."
                />
                {linkedContractService?.allowedVehicleIds && linkedContractService.allowedVehicleIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Энэ үйлчилгээнд явах боломжтой гэж бүртгэсэн {linkedContractService.allowedVehicleIds.length} машин л сонгогдоно.
                    Жагсаалтыг{' '}
                    {item?.contractId && item?.contractServiceId ? (
                      <Link className="text-primary underline underline-offset-2" href={`/tms/contracts/${item.contractId}/services/${item.contractServiceId}`}>
                        гэрээний үйлчилгээний дэлгэц
                      </Link>
                    ) : (
                      'гэрээний үйлчилгээний дэлгэц'
                    )}
                    -ээс өөрчилнө үү.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Жолооч оноох</Label>
                <SearchableSelect
                  options={driverSearchOptions}
                  value={local.driverId || 'none'}
                  onValueChange={(val) => setLocal((p) => p && { ...p, driverId: val === 'none' ? null : val })}
                  placeholder="Сонгох..."
                  searchPlaceholder="Нэр, утасны дугаар хайх..."
                  emptyText="Жолооч олдсонгүй."
                />
              </div>
              <div className="space-y-2">
                <Label>Машины төрөл</Label>
                <Select value={local.vehicleTypeId} onValueChange={(val) => setLocal((p) => p && { ...p, vehicleTypeId: val })}>
                  <SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тэвш</Label>
                <Select value={local.trailerTypeId} onValueChange={(val) => setLocal((p) => p && { ...p, trailerTypeId: val })}>
                  <SelectTrigger><SelectValue placeholder="Төрөл..." /></SelectTrigger>
                  <SelectContent>
                    {trailerTypes.map((tr) => <SelectItem key={tr.id} value={tr.id}>{tr.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
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
