'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Loader2, ArrowLeft, Pencil, Save, X } from 'lucide-react';
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
  const [onlyMatchingVehicleType, setOnlyMatchingVehicleType] = React.useState(false);
  const [vehiclePickerKey, setVehiclePickerKey] = React.useState(0);
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
      toast({ title: 'Боломжтой машины жагсаалт хадгалагдлаа.' });
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

  const vehicleAddOptions = React.useMemo(() => {
    let pool = vehiclesRaw;
    if (onlyMatchingVehicleType && service?.vehicleTypeId) {
      pool = pool.filter((v) => v.vehicleTypeId === service.vehicleTypeId);
    }
    const already = new Set(selectedVehicleIds);
    return pool
      .filter((v) => !already.has(v.id))
      .map((v) => ({
        value: v.id,
        label: [v.licensePlate, v.makeName, v.modelName].filter(Boolean).join(' · ') || v.id,
      }));
  }, [vehiclesRaw, onlyMatchingVehicleType, service?.vehicleTypeId, selectedVehicleIds]);

  const handleAddVehicleFromSearch = (id: string) => {
    if (!id || selectedVehicleIds.includes(id)) return;
    setSelectedVehicleIds((prev) => [...prev, id]);
    setVehiclePickerKey((k) => k + 1);
  };

  const removeVehicleFromSelection = (id: string) => {
    setSelectedVehicleIds((prev) => prev.filter((x) => x !== id));
  };

  const clearAllVehicles = () => setSelectedVehicleIds([]);

  const selectedVehicleLabels = React.useMemo(() => {
    return selectedVehicleIds.map((id) => {
      const v = vehiclesRaw.find((x) => x.id === id);
      const label = v
        ? [v.licensePlate, v.makeName, v.modelName].filter(Boolean).join(' · ') || v.id
        : id;
      return { id, label };
    });
  }, [selectedVehicleIds, vehiclesRaw]);

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
            <CardTitle className="text-base">Үйлчилгээнд явах боломжтой тээврийн хэрэгсэлүүд</CardTitle>
            <CardDescription>
              Доорх талбараас хайж сонгоход жагсаалтад нэмэгдэнэ. Жагсаалт хоосон бол тээвэр үүсгэхэд бүх машин
              сонгогдох боломжтой.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {service.vehicleTypeId ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="match-vt"
                  checked={onlyMatchingVehicleType}
                  onCheckedChange={(c) => setOnlyMatchingVehicleType(c === true)}
                />
                <label htmlFor="match-vt" className="text-sm cursor-pointer leading-none">
                  Хайлтанд зөвхөн «{service.vehicleTypeName || 'ТХ төрөл'}» төрөлтэй машинууд харуулах
                </label>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Машин хайж нэмэх</Label>
              <SearchableSelect
                key={vehiclePickerKey}
                options={vehicleAddOptions}
                onValueChange={handleAddVehicleFromSearch}
                placeholder="Дугаар, загварын нэрээр хайж сонгоно..."
                searchPlaceholder="Хайх..."
                emptyText={(() => {
                  let pool = vehiclesRaw;
                  if (onlyMatchingVehicleType && service?.vehicleTypeId) {
                    pool = pool.filter((v) => v.vehicleTypeId === service.vehicleTypeId);
                  }
                  if (pool.length === 0 && vehiclesRaw.length > 0) {
                    return 'Энэ шүүлтээр машин олдсонгүй. Шүүлтыг унтраана уу.';
                  }
                  if (pool.length > 0 && vehicleAddOptions.length === 0) {
                    return 'Нэмэх машин үлдсэнгүй — тохирох бүх машин жагсаалтад байна.';
                  }
                  return 'Тохирох машин олдсонгүй.';
                })()}
                disabled={!vehiclesRaw.length}
              />
              {!vehiclesRaw.length ? (
                <p className="text-xs text-muted-foreground">Тээврийн хэрэгслийн бүртгэл хоосон байна.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-muted-foreground">Одоогийн жагсаалт ({selectedVehicleIds.length})</Label>
                {selectedVehicleIds.length > 0 ? (
                  <Button type="button" variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={clearAllVehicles}>
                    Бүгдийг хасах
                  </Button>
                ) : null}
              </div>
              {selectedVehicleLabels.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-dashed rounded-md p-4 bg-muted/20">
                  Одоогоор машин нэмэгдээгүй. Дээрх хайлтаар нэг нэгээр нэмнэ үү.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {selectedVehicleLabels.map(({ id, label }) => (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
                    >
                      <span className="font-medium truncate">{label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeVehicleFromSelection(id)}
                        aria-label="Жагсаалтаас хасах"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {vehiclesDirty ? (
              <p className="text-xs text-amber-600 dark:text-amber-500">Өөрчлөлтийг хадгалахаа дарна уу.</p>
            ) : null}
            <Button onClick={handleSaveVehicles} disabled={!vehiclesDirty || savingVehicles} className="gap-2">
              {savingVehicles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Хадгалах
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
