'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Pencil, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  TMS_CONTRACTS_COLLECTION,
  TMS_VEHICLES_COLLECTION,
  TMS_CONTRACT_LINE_TYPE_LABELS,
  TMS_CONTRACT_PRICE_TYPE_LABELS,
} from '@/app/tms/types';
import type {
  TmsContract,
  TmsContractService,
  TmsContractLineType,
  TmsContractPriceType,
} from '@/app/tms/types';
import { EditContractServiceDialog } from '../../edit-contract-service-dialog';
import { cn } from '@/lib/utils';

function patchService(
  services: TmsContractService[],
  serviceId: string,
  patch: Partial<TmsContractService>
): TmsContractService[] {
  return services.map((s) => (s.id === serviceId ? { ...s, ...patch } : s));
}

export default function ContractServiceDetailPage() {
  const params = useParams<{ id: string; serviceId: string }>();
  const contractId = params?.id as string;
  const serviceId = params?.serviceId as string;
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const contractRef = React.useMemo(
    () => (firestore && contractId ? doc(firestore, TMS_CONTRACTS_COLLECTION, contractId) : null),
    [firestore, contractId]
  );
  const { data: contract, isLoading: contractLoading } = useDoc<TmsContract>(contractRef);

  const vehiclesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, TMS_VEHICLES_COLLECTION) : null),
    [firestore]
  );
  const { data: vehiclesRaw = [] } = useCollection<{
    id: string;
    licensePlate?: string;
    makeName?: string;
    modelName?: string;
    vehicleTypeId?: string;
  }>(vehiclesQuery);

  const service = React.useMemo(
    () => contract?.services?.find((s) => s.id === serviceId) ?? null,
    [contract?.services, serviceId]
  );

  const [editLineOpen, setEditLineOpen] = React.useState(false);
  const [vehicleSearch, setVehicleSearch] = React.useState('');
  const [onlyMatchingVehicleType, setOnlyMatchingVehicleType] = React.useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = React.useState<string[]>([]);
  const [savingVehicles, setSavingVehicles] = React.useState(false);
  const [internalNote, setInternalNote] = React.useState('');
  const [savingNote, setSavingNote] = React.useState(false);

  React.useEffect(() => {
    if (service) {
      setSelectedVehicleIds(service.allowedVehicleIds?.length ? [...service.allowedVehicleIds] : []);
      setInternalNote(service.internalNote ?? '');
    }
  }, [service?.id, service?.allowedVehicleIds, service?.internalNote]);

  const persistServices = async (nextServices: TmsContractService[]) => {
    if (!firestore || !contractId) return;
    await updateDoc(doc(firestore, TMS_CONTRACTS_COLLECTION, contractId), {
      services: nextServices,
      updatedAt: serverTimestamp(),
    });
  };

  const handleSaveVehicles = async () => {
    if (!contract || !service) return;
    setSavingVehicles(true);
    try {
      const next = patchService(contract.services, serviceId, {
        allowedVehicleIds: selectedVehicleIds.length ? selectedVehicleIds : [],
      });
      await persistServices(next);
      toast({ title: 'Зөвшөөрөгдөх машинууд хадгалагдлаа.' });
    } catch {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалахад алдаа гарлаа.' });
    } finally {
      setSavingVehicles(false);
    }
  };

  const handleSaveInternalNote = async () => {
    if (!contract || !service) return;
    setSavingNote(true);
    try {
      const next = patchService(contract.services, serviceId, {
        internalNote: internalNote.trim() || null,
      });
      await persistServices(next);
      toast({ title: 'Тэмдэглэл хадгалагдлаа.' });
    } catch {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Хадгалахад алдаа гарлаа.' });
    } finally {
      setSavingNote(false);
    }
  };

  const filteredVehicles = React.useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    let list = vehiclesRaw;
    if (onlyMatchingVehicleType && service?.vehicleTypeId) {
      list = list.filter((v) => v.vehicleTypeId === service.vehicleTypeId);
    }
    if (!q) return list;
    return list.filter((v) => {
      const hay = [v.licensePlate, v.makeName, v.modelName].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q) || v.id.toLowerCase().includes(q);
    });
  }, [vehiclesRaw, vehicleSearch, onlyMatchingVehicleType, service?.vehicleTypeId]);

  const toggleVehicle = (id: string, checked: boolean) => {
    setSelectedVehicleIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const selectAllVisible = () => {
    const ids = filteredVehicles.map((v) => v.id);
    setSelectedVehicleIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const clearAllSelected = () => setSelectedVehicleIds([]);

  const vehiclesDirty =
    service &&
    JSON.stringify([...(service.allowedVehicleIds ?? [])].sort()) !==
      JSON.stringify([...selectedVehicleIds].sort());

  const noteDirty = service && (internalNote.trim() || '') !== (service.internalNote?.trim() ?? '');

  if (contractLoading) {
    return (
      <div className="flex flex-col h-full w-full overflow-auto p-6 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!contract || !service) {
    return (
      <div className="flex flex-col h-full w-full overflow-auto p-6">
        <p className="text-muted-foreground mb-4">Гэрээ эсвэл үйлчилгээ олдсонгүй.</p>
        <Button variant="outline" asChild>
          <Link href={contractId ? `/tms/contracts/${contractId}` : '/tms/contracts'}>Буцах</Link>
        </Button>
      </div>
    );
  }

  const contractLabel = contract.code || contractId.slice(0, 8);
  const title = service.name || 'Үйлчилгээ';

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title={title}
          description={`Гэрээ ${contractLabel} • ${contract.customerName || ''}`}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Гэрээ', href: '/tms/contracts' },
            { label: contractLabel, href: `/tms/contracts/${contractId}` },
            { label: title },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link href={`/tms/contracts/${contractId}`}>
                  <ArrowLeft className="h-4 w-4" />
                  Гэрээ рүү
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditLineOpen(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Мөрийг засах
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6 max-w-4xl w-full mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Үйлчилгээний тойм</CardTitle>
            <CardDescription>Гэрээний мөр — үндсэн тохиргоо (бүрэн засвар «Мөрийг засах»)</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Гэрээний төрөл</dt>
                <dd className="font-medium mt-1">
                  {service.contractLineType
                    ? TMS_CONTRACT_LINE_TYPE_LABELS[service.contractLineType as TmsContractLineType] ??
                      service.contractLineType
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Тээврийн үйлчилгээний төрөл</dt>
                <dd className="font-medium mt-1">{service.serviceTypeName || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Маршрут</dt>
                <dd className="font-medium mt-1">
                  {service.loadingRegionName && service.unloadingRegionName
                    ? `${service.loadingRegionName} → ${service.unloadingRegionName}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Агуулах</dt>
                <dd className="font-medium mt-1">
                  {[service.loadingWarehouseName, service.unloadingWarehouseName].filter(Boolean).join(' → ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ТХ / тэвш</dt>
                <dd className="font-medium mt-1">
                  {[service.vehicleTypeName, service.trailerTypeName].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Үнэ</dt>
                <dd className="font-medium mt-1">
                  {service.price != null ? `${Number(service.price).toLocaleString()}₮` : '—'}
                  {service.priceType ? (
                    <span className="text-muted-foreground font-normal ml-2">
                      (
                      {TMS_CONTRACT_PRICE_TYPE_LABELS[service.priceType as TmsContractPriceType] ??
                        service.priceType}
                      )
                    </span>
                  ) : null}
                  {service.profitMarginPercent != null ? (
                    <Badge variant="secondary" className="ml-2 font-normal">
                      {service.profitMarginPercent}% ашиг
                    </Badge>
                  ) : null}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Нөхцөл (гэрээнд)</dt>
                <dd className="font-medium mt-1 whitespace-pre-wrap">{service.conditions || '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Дотоод тэмдэглэл</CardTitle>
            <CardDescription>
              Зөвхөн дотоод ашиглалтад — харилцагчийн PDF/гэрээнд автоматаар орохгүй.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={4}
              placeholder="Жишээ: талбарт заавал орох цаг, онцгой анхаарах зүйл..."
              className="resize-y min-h-[100px]"
            />
            <Button onClick={handleSaveInternalNote} disabled={!noteDirty || savingNote} className="gap-2">
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Тэмдэглэл хадгалах
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Зөвшөөрөгдөх тээврийн хэрэгслүүд</CardTitle>
            <CardDescription>
              Энэ үйлчилгээг гүйцэтгэхэд ашиглаж болох машинууд. Жагсаалт хоосон бол тээвэр дээр бүх машин сонгогдох
              боломжтой.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="veh-search">Хайх</Label>
                <Input
                  id="veh-search"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Улсын дугаар, загвар..."
                />
              </div>
              {service.vehicleTypeId ? (
                <div className="flex items-center gap-2 pb-2">
                  <Checkbox
                    id="match-vt"
                    checked={onlyMatchingVehicleType}
                    onCheckedChange={(c) => setOnlyMatchingVehicleType(c === true)}
                  />
                  <label htmlFor="match-vt" className="text-sm cursor-pointer leading-none">
                    Зөвхөн «{service.vehicleTypeName || 'ТХ төрөл'}» төрөлтэй
                  </label>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={selectAllVisible}>
                Харагдаж буйг бүгдийг сонгох
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearAllSelected}>
                Сонголтыг цэвэрлэх
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                Сонгосон: {selectedVehicleIds.length}
              </span>
            </div>
            <div className="border rounded-md max-h-[320px] overflow-y-auto divide-y">
              {filteredVehicles.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Машин олдсонгүй.</p>
              ) : (
                filteredVehicles.map((v) => {
                  const label = [v.licensePlate, v.makeName, v.modelName].filter(Boolean).join(' · ') || v.id;
                  const checked = selectedVehicleIds.includes(v.id);
                  const cid = `veh-row-${v.id}`;
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        'flex items-center gap-3 p-3 hover:bg-muted/40',
                        checked && 'bg-primary/5'
                      )}
                    >
                      <Checkbox
                        id={cid}
                        checked={checked}
                        onCheckedChange={(c) => toggleVehicle(v.id, c === true)}
                      />
                      <label htmlFor={cid} className="text-sm font-medium flex-1 cursor-pointer">
                        {label}
                      </label>
                    </div>
                  );
                })
              )}
            </div>
            <Button onClick={handleSaveVehicles} disabled={!vehiclesDirty || savingVehicles} className="gap-2">
              {savingVehicles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Машины жагсаалт хадгалах
            </Button>
          </CardContent>
        </Card>
      </div>

      <EditContractServiceDialog
        open={editLineOpen}
        onOpenChange={setEditLineOpen}
        contractId={contractId}
        service={service}
        allServices={contract.services}
      />
    </div>
  );
}
