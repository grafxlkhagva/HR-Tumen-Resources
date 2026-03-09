'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ArrowLeft, FileText, Plus, Briefcase, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  TMS_SERVICE_TYPES_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_TRANSPORT_MANAGEMENT_COLLECTION,
  TMS_QUOTATIONS_COLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
  type TmsServiceType,
  type TmsCustomer,
  type TmsQuotation,
} from '@/app/tms/types';

interface CreateTransportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTransportDialog({ open, onOpenChange }: CreateTransportDialogProps) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [fromQuotation, setFromQuotation] = React.useState<string>('');
  const [selectedQuotationId, setSelectedQuotationId] = React.useState<string>('');

  const [serviceTypeId, setServiceTypeId] = React.useState<string>('');
  const [isContracted, setIsContracted] = React.useState<string>('');
  const [customerId, setCustomerId] = React.useState<string>('');

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

  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setFromQuotation('');
      setSelectedQuotationId('');
      setServiceTypeId('');
      setIsContracted('');
      setCustomerId('');
    }
  }, [open]);

  const totalSteps = fromQuotation === 'yes' ? 2 : 4;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
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

        // 2. Prepare new transport doc data
        const docRef = doc(collection(firestore, TMS_TRANSPORT_MANAGEMENT_COLLECTION));
        
        if (fromQuotation === 'yes') {
          const quotation = quotations.find((q) => q.id === selectedQuotationId);
          if (!quotation) throw new Error('Үнийн санал олдсонгүй');

          const firstTrans = quotation.transportations?.[0] || {};
          
          const serviceDoc = services.find(s => s.id === firstTrans.serviceTypeId);
          let dispatchSteps = [];
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
        } else {
          const customerRef = doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId);
          const serviceDoc = services.find(s => s.id === serviceTypeId);
          
          let dispatchSteps = [];
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
            isContracted: isContracted === 'yes',
            customerId,
            customerRef,
            status: 'draft',
            dispatchSteps,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // 3. Update settings
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

          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Та тээврийн удирдлагыг хэрхэн үүсгэх вэ?</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => setFromQuotation('yes')}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:bg-muted/50",
                    fromQuotation === 'yes' ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn("rounded-full p-3 transition-colors", fromQuotation === 'yes' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium leading-none">Үнийн саналаас</p>
                    <p className="text-xs text-muted-foreground">Батлагдсан үнийн санал дээр үндэслэж үүсгэх</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFromQuotation('no')}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:bg-muted/50",
                    fromQuotation === 'no' ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn("rounded-full p-3 transition-colors", fromQuotation === 'no' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <Plus className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium leading-none">Шинээр үүсгэх</p>
                    <p className="text-xs text-muted-foreground">Хоосон тээврийн удирдлага шинээр үүсгэх</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && fromQuotation === 'yes' && (
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
                        <span className="font-medium">{q.customerName || 'Нэргүй'}</span>
                        <span className="text-muted-foreground ml-2">
                          — {q.createdAt?.toDate ? q.createdAt.toDate().toLocaleDateString() : ''}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {step === 2 && fromQuotation === 'no' && (
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

          {step === 3 && fromQuotation === 'no' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <Label className="text-base font-medium">Гэрээт тээвэр мөн эсэх?</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsContracted('yes')}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:bg-muted/50",
                    isContracted === 'yes' ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn("rounded-full p-3 transition-colors", isContracted === 'yes' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium leading-none">Гэрээт тээвэр</p>
                    <p className="text-xs text-muted-foreground">Байнгын гэрээтэй харилцагч</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsContracted('no')}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all hover:bg-muted/50",
                    isContracted === 'no' ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn("rounded-full p-3 transition-colors", isContracted === 'no' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    <RefreshCw className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium leading-none">Нэг удаагийн</p>
                    <p className="text-xs text-muted-foreground">Зөвхөн нэг удаагийн тээвэрлэлт</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 4 && fromQuotation === 'no' && (
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
              disabled={
                (step === 1 && !fromQuotation) ||
                (step === 2 && fromQuotation === 'no' && !serviceTypeId) ||
                (step === 3 && fromQuotation === 'no' && !isContracted)
              }
              className="gap-2"
            >
              Үргэлжлүүлэх <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                (fromQuotation === 'yes' && !selectedQuotationId) ||
                (fromQuotation === 'no' && !customerId) ||
                isSubmitting
              }
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
