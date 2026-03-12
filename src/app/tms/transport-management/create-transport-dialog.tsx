'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, runTransaction, where } from 'firebase/firestore';
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
import { Loader2, ArrowRight, ArrowLeft, FileText, Plus, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  TMS_SERVICE_TYPES_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_TRANSPORT_MANAGEMENT_COLLECTION,
  TMS_QUOTATIONS_COLLECTION,
  TMS_CONTRACTS_COLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
  type TmsServiceType,
  type TmsCustomer,
  type TmsQuotation,
  type TmsContract,
  type TmsContractService,
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
  const [selectedContractServiceId, setSelectedContractServiceId] = React.useState<string>('');

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

  // Selected contract's services
  const selectedContract = React.useMemo(
    () => contracts.find((c) => c.id === selectedContractId),
    [contracts, selectedContractId]
  );

  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setMethod('');
      setSelectedQuotationId('');
      setServiceTypeId('');
      setCustomerId('');
      setSelectedContractId('');
      setSelectedContractServiceId('');
    }
  }, [open]);

  // Reset service selection when contract changes
  React.useEffect(() => {
    setSelectedContractServiceId('');
  }, [selectedContractId]);

  const totalSteps = method === 'quotation' ? 2 : method === 'contract' ? 2 : 3; // new: step1 -> step2 (service) -> step3 (customer)

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
      if (method === 'contract') return !!selectedContractId && !!selectedContractServiceId;
      if (method === 'new') return !!serviceTypeId;
    }
    if (step === 3 && method === 'new') return !!customerId;
    return false;
  };

  const handleSubmit = async () => {
    if (!firestore) return;

    setIsSubmitting(true);
    try {
      const newDocRef = await runTransaction(firestore, async (transaction) => {
        // 1. Get settings for code generation
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

        const nextNum = currentNum + 1;
        const newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;

        const docRef = doc(collection(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION));

        if (method === 'quotation') {
          // From Quotation
          const quotation = quotations.find((q) => q.id === selectedQuotationId);
          if (!quotation) throw new Error('Үнийн санал олдсонгүй');

          const firstTrans = quotation.transportations?.[0] || {};

          const serviceDoc = services.find(s => s.id === firstTrans.serviceTypeId);
          let dispatchSteps: any[] = [];
          if (serviceDoc?.dispatchSteps) {
            dispatchSteps = serviceDoc.dispatchSteps.map(step => ({
              id: step.id,
              name: step.name,
              order: step.order,
              isRequired: step.isRequired,
              status: 'pending',
              controlTasks: step.controlTasks || []
            }));
          }

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
            profitMarginPercent: firstTrans.profitMarginPercent || null,
            hasVat: firstTrans.hasVat || false,
            cargos: firstTrans.cargos || [],
            dispatchSteps,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (method === 'contract') {
          // From Contract
          const contract = contracts.find((c) => c.id === selectedContractId);
          if (!contract) throw new Error('Гэрээ олдсонгүй');

          const contractService = contract.services?.find(
            (s: TmsContractService) => s.id === selectedContractServiceId
          );
          if (!contractService) throw new Error('Гэрээний үйлчилгээ олдсонгүй');

          const serviceDoc = services.find(s => s.id === contractService.serviceTypeId);
          let dispatchSteps: any[] = [];
          if (serviceDoc?.dispatchSteps) {
            dispatchSteps = serviceDoc.dispatchSteps.map(step => ({
              id: step.id,
              name: step.name,
              order: step.order,
              isRequired: step.isRequired,
              status: 'pending',
              controlTasks: step.controlTasks || []
            }));
          }

          transaction.set(docRef, {
            code: newCode,
            serviceTypeId: contractService.serviceTypeId || '',
            isContracted: true,
            contractId: contract.id,
            contractCode: contract.code || null,
            contractServiceId: contractService.id,
            contractServiceName: contractService.name || null,
            customerId: contract.customerId,
            customerRef: doc(firestore, TMS_CUSTOMERS_COLLECTION, contract.customerId),
            status: 'planning',
            loadingRegionId: contractService.loadingRegionId || null,
            unloadingRegionId: contractService.unloadingRegionId || null,
            vehicleTypeId: contractService.vehicleTypeId || null,
            trailerTypeId: contractService.trailerTypeId || null,
            dispatchSteps,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          // New (manual)
          const customerRef = doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId);
          const serviceDoc = services.find(s => s.id === serviceTypeId);

          let dispatchSteps: any[] = [];
          if (serviceDoc?.dispatchSteps) {
            dispatchSteps = serviceDoc.dispatchSteps.map(step => ({
              id: step.id,
              name: step.name,
              order: step.order,
              isRequired: step.isRequired,
              status: 'pending',
              controlTasks: step.controlTasks || []
            }));
          }

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
        }

        // Update settings
        transaction.set(settingsRef, {
          transportCodeCurrentNumber: nextNum,
          transportCodePrefix: prefix,
          transportCodePadding: padding,
          updatedAt: serverTimestamp()
        }, { merge: true });

        return docRef;
      });

      toast({ title: 'Тээврийн удирдлага амжилттай үүсгэгдлээ.' });
      onOpenChange(false);
      router.push(`/tms/transport-management/${newDocRef.id}`);
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
                  <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Гэрээ сонгох..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts.filter(c => c.status === 'active' || c.status === 'draft').map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="font-medium">{c.code || c.id.slice(0, 8)}</span>
                          <span className="text-muted-foreground ml-2">— {c.customerName || 'Нэргүй'}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            ({c.startDate} ~ {c.endDate})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedContract && selectedContract.services?.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Үйлчилгээ сонгох</Label>
                  <p className="text-sm text-muted-foreground">
                    Энэ гэрээнд бүртгэлтэй {selectedContract.services.length} үйлчилгээнээс сонгоно уу.
                  </p>
                  <Select value={selectedContractServiceId} onValueChange={setSelectedContractServiceId}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Үйлчилгээ сонгох..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedContract.services.map((svc) => (
                        <SelectItem key={svc.id} value={svc.id}>
                          <span className="font-medium">{svc.name || 'Нэргүй'}</span>
                          {svc.price ? (
                            <span className="text-muted-foreground ml-2">— {svc.price.toLocaleString()}₮</span>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedContract && (!selectedContract.services || selectedContract.services.length === 0) && (
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
