'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import {
  AppDialog,
  AppDialogContent,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogBody,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowRight, ArrowLeft, FileText, Plus, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { formatVehicleLabel } from './utils';
import {
  TMS_SERVICE_TYPES_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_TRANSPORT_MANAGEMENT_COLLECTION,
  TMS_QUOTATIONS_COLLECTION,
  TMS_CONTRACTS_COLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
  TMS_VEHICLES_COLLECTION,
  type TmsServiceType,
  type TmsCustomer,
  type TmsQuotation,
  type TmsContract,
  type TmsContractService,
  type TmsTransportSubUnit,
} from '@/app/tms/types';

interface CreateTransportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreationMethod = 'quotation' | 'new' | 'contract' | '';

export function CreateTransportDialog({ open, onOpenChange }: CreateTransportDialogProps) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Creation method: quotation | new | contract
  const [method, setMethod] = React.useState<CreationMethod>('');

  // Quotation flow
  const [selectedQuotationId, setSelectedQuotationId] = React.useState<string>('');

  // New flow
  const [serviceTypeId, setServiceTypeId] = React.useState<string>('');
  const [customerId, setCustomerId] = React.useState<string>('');

  // Contract flow
  const [selectedContractId, setSelectedContractId] = React.useState<string>('');
  /** Олон гэрээний үйлчилгээ (тээвэр) нэг TM дор сонгоно. */
  const [selectedContractServiceIds, setSelectedContractServiceIds] = React.useState<string[]>([]);
  /**
   * Үйлчилгээ тус бүрийн сонгосон машинууд.
   * Key = contractServiceId, value = тухайн үйлчилгээнд сонгогдсон vehicleId[].
   * Хоосон массив бол 1 "машингүй" дэд таб үүсч машиныг хожим оноох боломжтой.
   */
  const [pickedByService, setPickedByService] = React.useState<Record<string, string[]>>({});

  // Fetch Quotations
  const quotationsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, TMS_QUOTATIONS_COLLECTION), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: quotations = [], isLoading: isLoadingQuotations } = useCollection<TmsQuotation>(quotationsQuery);

  // Fetch Service Types
  const servicesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, TMS_SERVICE_TYPES_COLLECTION), orderBy('name', 'asc')) : null),
    [firestore]
  );
  const { data: services = [], isLoading: isLoadingServices } = useCollection<TmsServiceType>(servicesQuery);

  // Fetch Customers
  const customersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, TMS_CUSTOMERS_COLLECTION), orderBy('name', 'asc')) : null),
    [firestore]
  );
  const { data: customers = [], isLoading: isLoadingCustomers } = useCollection<TmsCustomer>(customersQuery);

  // Fetch Contracts (active ones)
  const contractsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, TMS_CONTRACTS_COLLECTION), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: contracts = [], isLoading: isLoadingContracts } = useCollection<TmsContract>(contractsQuery);

  const vehiclesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, TMS_VEHICLES_COLLECTION) : null),
    [firestore]
  );
  const { data: vehiclesList = [], isLoading: isLoadingVehicles } = useCollection<{
    id: string;
    licensePlate?: string;
    makeName?: string;
    modelName?: string;
  }>(vehiclesQuery);

  // Selected contract's services
  const selectedContract = React.useMemo(
    () => contracts.find((c) => c.id === selectedContractId),
    [contracts, selectedContractId]
  );

  /** Сонгосон гэрээний бүх үйлчилгээнүүд, Step 2-ын checkbox list-ийн эх үүсвэр. */
  const contractServiceOptions = React.useMemo(() => {
    return (selectedContract?.services ?? []).map((svc) => ({
      id: svc.id,
      label: svc.name || 'Нэргүй үйлчилгээ',
      price: svc.customerPrice ?? svc.price ?? null,
      vehicleCount: svc.allowedVehicleIds?.length ?? 0,
    }));
  }, [selectedContract]);

  /** Сонгогдсон үйлчилгээнүүдийн массив (дарааллыг хадгалж). */
  const selectedContractServices = React.useMemo(() => {
    if (!selectedContract) return [] as TmsContractService[];
    return selectedContractServiceIds
      .map((sid) => selectedContract.services?.find((s) => s.id === sid))
      .filter((s): s is TmsContractService => Boolean(s));
  }, [selectedContract, selectedContractServiceIds]);

  const vehiclesById = React.useMemo(
    () => new Map(vehiclesList.map((v) => [v.id, v])),
    [vehiclesList]
  );

  const buildVehicleRows = React.useCallback(
    (ids: string[] = []) => {
      const rows = ids.map((id) => {
        const v = vehiclesById.get(id);
        return v
          ? { id: v.id, label: formatVehicleLabel(v) }
          : { id, label: `${id.slice(0, 8)}… (бүртгэлд олдсонгүй)` };
      });
      return rows.sort((a, b) => a.label.localeCompare(b.label, 'mn'));
    },
    [vehiclesById]
  );

  /** Ядаж 1 үйлчилгээнд зөвшөөрөгдсөн машин байгаа эсэх → Step 3 харагдах уу. */
  const contractHasVehiclePickStep = React.useMemo(() => {
    if (method !== 'contract') return false;
    return selectedContractServices.some((s) => (s.allowedVehicleIds?.length ?? 0) > 0);
  }, [method, selectedContractServices]);

  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setMethod('');
      setSelectedQuotationId('');
      setServiceTypeId('');
      setCustomerId('');
      setSelectedContractId('');
      setSelectedContractServiceIds([]);
      setPickedByService({});
    }
  }, [open]);

  // Reset service selection when contract changes
  React.useEffect(() => {
    setSelectedContractServiceIds([]);
    setPickedByService({});
  }, [selectedContractId]);

  // Үйлчилгээ сонгохоо больсон бол түүний машинуудыг pickedByService-оос хасах
  React.useEffect(() => {
    setPickedByService((prev) => {
      const allowed = new Set(selectedContractServiceIds);
      let changed = false;
      const next: Record<string, string[]> = {};
      for (const [svcId, ids] of Object.entries(prev)) {
        if (allowed.has(svcId)) next[svcId] = ids;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectedContractServiceIds]);

  React.useEffect(() => {
    if (method === 'contract' && step === 3 && !contractHasVehiclePickStep) {
      setStep(2);
    }
  }, [method, step, contractHasVehiclePickStep]);

  const totalSteps =
    method === 'quotation' ? 2 : method === 'contract' ? (contractHasVehiclePickStep ? 3 : 2) : 3;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    if (step === 1) return !!method;
    if (step === 2) {
      if (method === 'quotation') return !!selectedQuotationId;
      if (method === 'contract') return !!selectedContractId && selectedContractServiceIds.length > 0;
      if (method === 'new') return !!serviceTypeId;
    }
    if (step === 3 && method === 'new') return !!customerId;
    if (step === 3 && method === 'contract' && contractHasVehiclePickStep) return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!firestore) return;

    setIsSubmitting(true);
    try {
      const navigateAfter = await runTransaction(firestore, async (transaction) => {
        const settingsRef = doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID);
        const settingsDoc = await transaction.get(settingsRef);

        let currentNum = 0;
        let prefix = 'TR';
        let padding = 5;

        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          currentNum = data.transportCodeCurrentNumber || 0;
          prefix = data.transportCodePrefix || 'TR';
          padding = data.transportCodePadding || 5;
        }

        const colRef = collection(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION);

        const bumpSettings = (newCurrent: number) => {
          transaction.set(
            settingsRef,
            {
              transportCodeCurrentNumber: newCurrent,
              transportCodePrefix: prefix,
              transportCodePadding: padding,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        };

        if (method === 'quotation') {
          const quotation = quotations.find((q) => q.id === selectedQuotationId);
          if (!quotation) throw new Error('Үнийн санал олдсонгүй');

          const firstTrans = quotation.transportations?.[0] || {};

          const serviceDoc = services.find((s) => s.id === firstTrans.serviceTypeId);
          let dispatchSteps: any[] = [];
          if (serviceDoc?.dispatchSteps) {
            dispatchSteps = serviceDoc.dispatchSteps.map((step) => ({
              id: step.id,
              name: step.name,
              order: step.order,
              isRequired: step.isRequired,
              status: 'pending',
              controlTasks: step.controlTasks || [],
            }));
          }

          const acceptedOffer = firstTrans.driverOffers?.find((o: any) => o.isAccepted);
          const nextNum = currentNum + 1;
          const newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;
          const docRef = doc(colRef);

          transaction.set(docRef, {
            code: newCode,
            serviceTypeId: firstTrans.serviceTypeId || '',
            isContracted: false,
            customerId: quotation.customerId,
            customerRef: quotation.customerRef || doc(firestore, TMS_CUSTOMERS_COLLECTION, quotation.customerId),
            status: 'planning',
            loadingRegionId: firstTrans.loadingRegionId || null,
            loadingWarehouseId: firstTrans.loadingWarehouseId || null,
            unloadingRegionId: firstTrans.unloadingRegionId || null,
            unloadingWarehouseId: firstTrans.unloadingWarehouseId || null,
            totalDistanceKm: firstTrans.totalDistanceKm || null,
            loadingDate: firstTrans.loadingDate || null,
            unloadingDate: firstTrans.unloadingDate || null,
            frequency: firstTrans.frequency || null,
            vehicleTypeId: firstTrans.vehicleTypeId || null,
            trailerTypeId: firstTrans.trailerTypeId || null,
            driverPrice: acceptedOffer?.offerAmount || null,
            profitMarginPercent: firstTrans.profitMarginPercent || null,
            hasVat: firstTrans.hasVat || false,
            cargos: firstTrans.cargos || [],
            dispatchSteps,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          bumpSettings(nextNum);
          return { kind: 'single' as const, docId: docRef.id };
        }

        if (method === 'contract') {
          const contract = contracts.find((c) => c.id === selectedContractId);
          if (!contract) throw new Error('Гэрээ олдсонгүй');

          const chosenServices: TmsContractService[] = selectedContractServiceIds
            .map((sid) => contract.services?.find((s: TmsContractService) => s.id === sid))
            .filter((s): s is TmsContractService => Boolean(s));

          if (chosenServices.length === 0) throw new Error('Гэрээний үйлчилгээ сонгогдоогүй байна.');

          // Үйлчилгээ бүрээр subTransport-уудыг хавтгайлж үүсгэнэ.
          const subTransports: TmsTransportSubUnit[] = [];
          let subCounter = 1;

          for (const svc of chosenServices) {
            const serviceDoc = services.find((s) => s.id === svc.serviceTypeId);
            const clonedSteps = (serviceDoc?.dispatchSteps ?? []).map((step) => ({
              id: step.id,
              name: step.name,
              order: step.order,
              isRequired: step.isRequired,
              status: 'pending' as const,
              controlTasks: step.controlTasks || [],
              taskResults: {},
              completedAt: null,
              completedBy: null,
            }));

            const picks = pickedByService[svc.id] ?? [];
            const slots: (string | null)[] = picks.length > 0 ? picks : [null];

            for (const vehicleId of slots) {
              subTransports.push({
                id: crypto.randomUUID(),
                subCode: String(subCounter++),
                vehicleId,
                driverId: null,
                contractServiceId: svc.id,
                contractServiceName: svc.name ?? null,
                serviceTypeId: svc.serviceTypeId ?? null,
                loadingRegionId: svc.loadingRegionId ?? null,
                loadingWarehouseId: svc.loadingWarehouseId ?? null,
                unloadingRegionId: svc.unloadingRegionId ?? null,
                unloadingWarehouseId: svc.unloadingWarehouseId ?? null,
                vehicleTypeId: svc.vehicleTypeId ?? null,
                trailerTypeId: svc.trailerTypeId ?? null,
                customerPrice: svc.customerPrice ?? null,
                driverPrice: svc.driverPrice ?? svc.price ?? null,
                contractPriceType: svc.priceType ?? null,
                dispatchSteps: clonedSteps,
              });
            }
          }

          const primary = chosenServices[0];
          const primaryDispatchSteps = subTransports[0]?.dispatchSteps ?? [];

          const nextNum = currentNum + 1;
          const newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;
          const docRef = doc(colRef);

          transaction.set(docRef, {
            code: newCode,
            // Эцэг түвшин — эхний үйлчилгээний метадата (хуучин single-service нийцтэй)
            serviceTypeId: primary.serviceTypeId || '',
            isContracted: true,
            contractId: contract.id,
            contractCode: contract.code || null,
            contractServiceId: primary.id,
            contractServiceName: primary.name || null,
            contractServiceIds: chosenServices.map((s) => s.id),
            customerId: contract.customerId,
            customerRef: doc(firestore, TMS_CUSTOMERS_COLLECTION, contract.customerId),
            status: 'planning',
            loadingRegionId: primary.loadingRegionId || null,
            loadingWarehouseId: primary.loadingWarehouseId || null,
            unloadingRegionId: primary.unloadingRegionId || null,
            unloadingWarehouseId: primary.unloadingWarehouseId || null,
            vehicleTypeId: primary.vehicleTypeId || null,
            trailerTypeId: primary.trailerTypeId || null,
            vehicleId: subTransports[0]?.vehicleId || null,
            driverId: subTransports[0]?.driverId || null,
            subTransports,
            driverPrice: primary.driverPrice ?? primary.price ?? null,
            customerPrice: primary.customerPrice ?? null,
            contractPriceType: primary.priceType ?? null,
            profitMarginPercent: primary.profitMarginPercent ?? null,
            dispatchSteps: primaryDispatchSteps,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          bumpSettings(nextNum);
          return { kind: 'single' as const, docId: docRef.id };
        }

        // New (manual)
        const customerRef = doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId);
        const serviceDoc = services.find((s) => s.id === serviceTypeId);

        let dispatchSteps: any[] = [];
        if (serviceDoc?.dispatchSteps) {
          dispatchSteps = serviceDoc.dispatchSteps.map((step) => ({
            id: step.id,
            name: step.name,
            order: step.order,
            isRequired: step.isRequired,
            status: 'pending',
            controlTasks: step.controlTasks || [],
          }));
        }

        const nextNum = currentNum + 1;
        const newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;
        const docRef = doc(colRef);

        transaction.set(docRef, {
          code: newCode,
          serviceTypeId,
          isContracted: false,
          customerId,
          customerRef,
          status: 'draft',
          dispatchSteps,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        bumpSettings(nextNum);
        return { kind: 'single' as const, docId: docRef.id };
      });

      toast({
        title: 'Тээврийн удирдлага амжилттай үүсгэгдлээ.',
      });
      onOpenChange(false);
      router.push(`/tms/transport-management/${navigateAfter.docId}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: error?.message ?? 'Үүсгэхэд алдаа гарлаа.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="md" showClose={true}>
        <AppDialogHeader>
          <AppDialogTitle>Шинэ тээврийн удирдлага үүсгэх</AppDialogTitle>
          <AppDialogDescription>
            Тээврийн удирдлагын мэдээллийг үе шаттайгаар оруулна уу.
          </AppDialogDescription>
        </AppDialogHeader>
        <div className="px-6 py-2">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", step > i ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        </div>
        <AppDialogBody className="space-y-6 pt-2 pb-6">

          {/* Step 1: Choose creation method */}
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Та тээврийн удирдлагыг хэрхэн үүсгэх вэ?</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setMethod('quotation')}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all hover:bg-muted/50",
                    method === 'quotation' ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn("rounded-full p-3 transition-colors", method === 'quotation' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium leading-none text-sm">Үнийн саналаас</p>
                    <p className="text-xs text-muted-foreground">Үнийн санал дээр үндэслэх</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('contract')}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all hover:bg-muted/50",
                    method === 'contract' ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn("rounded-full p-3 transition-colors", method === 'contract' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <ScrollText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium leading-none text-sm">Гэрээт тээвэр</p>
                    <p className="text-xs text-muted-foreground">Бүртгэсэн гэрээнээс сонгох</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('new')}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all hover:bg-muted/50",
                    method === 'new' ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn("rounded-full p-3 transition-colors", method === 'new' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium leading-none text-sm">Шинээр үүсгэх</p>
                    <p className="text-xs text-muted-foreground">Хоосноор шинээр үүсгэх</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Quotation - select quotation */}
          {step === 2 && method === 'quotation' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <Label className="text-base font-medium">Үнийн санал сонгох</Label>
              {isLoadingQuotations ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" /> Уншиж байна...
                </div>
              ) : (
                <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Үнийн санал сонгох..." />
                  </SelectTrigger>
                  <SelectContent>
                    {quotations.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        <span className="font-medium">{q.code || q.id.slice(0, 8)}</span>
                        <span className="text-muted-foreground ml-2">
                          — {q.customerName || 'Нэргүй'}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Step 2: Contract - select contract + service */}
          {step === 2 && method === 'contract' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-3">
                <Label className="text-base font-medium">Гэрээ сонгох</Label>
                {isLoadingContracts ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" /> Уншиж байна...
                  </div>
                ) : (
                  <SearchableSelect
                    options={contracts.map((c) => ({
                      value: c.id,
                      label: `${c.code || c.id.slice(0, 8)} — ${c.customerName || 'Нэргүй'}`,
                      description: `${c.startDate || ''} ~ ${c.endDate || ''}`,
                    }))}
                    value={selectedContractId}
                    onValueChange={setSelectedContractId}
                    placeholder="Гэрээ сонгох..."
                    searchPlaceholder="Гэрээ хайх..."
                  />
                )}
              </div>

              {selectedContract && contractServiceOptions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label className="text-base font-medium">Үйлчилгээ сонгох</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Энэ гэрээнд бүртгэлтэй {contractServiceOptions.length} үйлчилгээнээс нэг буюу
                        хэд хэдийг сонгоно уу. Сонгосон бүх үйлчилгээ нэг тээврийн удирдлагад
                        хамаарна.
                      </p>
                    </div>
                    {selectedContractServiceIds.length > 0 ? (
                      <div className="text-xs font-medium text-primary whitespace-nowrap pt-1">
                        {selectedContractServiceIds.length} сонгогдсон
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedContractServiceIds(contractServiceOptions.map((o) => o.id))
                      }
                    >
                      Бүгдийг сонгох
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedContractServiceIds([])}
                    >
                      Цэвэрлэх
                    </Button>
                  </div>
                  <div className="rounded-lg border max-h-[min(320px,50vh)] overflow-y-auto divide-y">
                    {contractServiceOptions.map((opt) => {
                      const cid = `contract-svc-${opt.id}`;
                      const checked = selectedContractServiceIds.includes(opt.id);
                      return (
                        <div key={opt.id} className="flex items-start gap-3 p-3 hover:bg-muted/30">
                          <Checkbox
                            id={cid}
                            checked={checked}
                            onCheckedChange={(c) => {
                              if (c === true) {
                                setSelectedContractServiceIds((prev) =>
                                  prev.includes(opt.id) ? prev : [...prev, opt.id]
                                );
                              } else {
                                setSelectedContractServiceIds((prev) =>
                                  prev.filter((id) => id !== opt.id)
                                );
                              }
                            }}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={cid}
                            className="flex-1 cursor-pointer leading-snug text-sm"
                          >
                            <div className="font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {opt.price
                                ? `${Number(opt.price).toLocaleString()}₮`
                                : 'Үнэ заагаагүй'}
                              {opt.vehicleCount > 0
                                ? ` · ${opt.vehicleCount} машин зөвшөөрсөн`
                                : ' · машин бүртгэгдээгүй'}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {selectedContractServiceIds.length > 0 && contractHasVehiclePickStep ? (
                    <p className="text-xs text-muted-foreground">
                      Дараагийн алхамд үйлчилгээ тус бүрийн зөвшөөрөгдсөн машинуудаас сонгоно.
                    </p>
                  ) : null}
                </div>
              )}

              {selectedContract && contractServiceOptions.length === 0 && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                  Энэ гэрээнд үйлчилгээ бүртгэгдээгүй байна. Эхлээд гэрээнд үйлчилгээ нэмнэ үү.
                </div>
              )}
            </div>
          )}

          {/* Step 2: New - select service type */}
          {step === 2 && method === 'new' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <Label className="text-base font-medium">Тээврийн үйлчилгээний төрөл сонгох</Label>
              {isLoadingServices ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" /> Уншиж байна...
                </div>
              ) : (
                <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Үйлчилгээ сонгох..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Step 3: Contract — per-service allowed vehicles (multi-service, multi-vehicle) */}
          {step === 3 && method === 'contract' && contractHasVehiclePickStep && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <Label className="text-base font-medium">Үйлчилгээ тус бүрт машин сонгох</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Сонгосон {selectedContractServices.length} үйлчилгээ бүрт нэгээс олон машин сонгож
                  болно — машин бүр нэг тээврийн удирдлага дотор дэд табаар үүснэ. Хоосон
                  үйлчилгээнд 1 машингүй таб үүсэж, машиныг дараа нь онооно.
                </p>
              </div>
              {isLoadingVehicles ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" /> Машинууд уншиж байна...
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedContractServices.map((svc) => {
                    const rows = buildVehicleRows(svc.allowedVehicleIds ?? []);
                    const picked = pickedByService[svc.id] ?? [];
                    const allIds = rows.map((r) => r.id);
                    return (
                      <section
                        key={svc.id}
                        className="rounded-lg border p-3 space-y-3 bg-card"
                      >
                        <header className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-sm">
                              {svc.name || 'Нэргүй үйлчилгээ'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {rows.length} машин · {picked.length} сонгогдсон
                              {picked.length > 1
                                ? ` → ${picked.length} дэд таб`
                                : picked.length === 1
                                  ? ' → 1 дэд таб'
                                  : rows.length === 0
                                    ? ' → 1 хоосон дэд таб'
                                    : ' → 1 хоосон дэд таб (машин сонгоогүй)'}
                            </div>
                          </div>
                          {rows.length > 0 ? (
                            <div className="flex gap-2 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setPickedByService((prev) => ({ ...prev, [svc.id]: allIds }))
                                }
                              >
                                Бүгд
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setPickedByService((prev) => ({ ...prev, [svc.id]: [] }))
                                }
                              >
                                Цэвэрлэх
                              </Button>
                            </div>
                          ) : null}
                        </header>
                        {rows.length === 0 ? (
                          <p className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-2">
                            Энэ үйлчилгээнд зөвшөөрсөн машин байхгүй — 1 машингүй дэд таб үүсэж,
                            хожим онооно.
                          </p>
                        ) : (
                          <div className="rounded-md border max-h-52 overflow-y-auto divide-y">
                            {rows.map((v) => {
                              const cid = `svc-${svc.id}-veh-${v.id}`;
                              const checked = picked.includes(v.id);
                              return (
                                <div
                                  key={v.id}
                                  className="flex items-start gap-3 p-2.5 hover:bg-muted/30"
                                >
                                  <Checkbox
                                    id={cid}
                                    checked={checked}
                                    onCheckedChange={(c) => {
                                      setPickedByService((prev) => {
                                        const cur = prev[svc.id] ?? [];
                                        if (c === true) {
                                          if (cur.includes(v.id)) return prev;
                                          return { ...prev, [svc.id]: [...cur, v.id] };
                                        }
                                        return { ...prev, [svc.id]: cur.filter((id) => id !== v.id) };
                                      });
                                    }}
                                    className="mt-0.5"
                                  />
                                  <label
                                    htmlFor={cid}
                                    className="text-sm cursor-pointer flex-1 leading-snug"
                                  >
                                    {v.label}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: New - select customer */}
          {step === 3 && method === 'new' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <Label className="text-base font-medium">Харилцагч байгууллага сонгох</Label>
              {isLoadingCustomers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" /> Уншиж байна...
                </div>
              ) : (
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Харилцагч сонгох..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </AppDialogBody>
        <AppDialogFooter className="flex items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Буцах
          </Button>
          {step < totalSteps ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Үргэлжлүүлэх <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Үүсгэх
            </Button>
          )}
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
