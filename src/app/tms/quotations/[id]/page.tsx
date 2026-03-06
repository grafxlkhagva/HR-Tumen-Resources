'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/patterns/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TMS_QUOTATIONS_COLLECTION } from '@/app/tms/types';
import type { TmsQuotation } from '@/app/tms/types';
import { ArrowLeft, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Ноорог',
  sent: 'Илгээсэн',
  accepted: 'Зөвшөөрсөн',
  rejected: 'Татгалзсан',
  expired: 'Хүчингүй',
};

const LOADING_RESPONSIBILITY_OPTIONS = [
  { value: 'customer', label: 'Захиалагч хариуцах' },
  { value: 'carrier', label: 'Тээвэрлэгч хариуцах' },
] as const;

const VEHICLE_AVAILABILITY_OPTIONS = [
  { value: '8h', label: '8 цаг' },
  { value: '12h', label: '12 цаг' },
  { value: '24h', label: '24 цаг' },
  { value: '48h', label: '48 цаг' },
  { value: '7d', label: '7 хоног' },
  { value: '14d', label: '14 хоног' },
] as const;

const PAYMENT_TERMS_OPTIONS = [
  { value: 'advance_30', label: 'Урьдчилгаа 30%' },
  { value: 'advance_40', label: 'Урьдчилгаа 40%' },
  { value: 'advance_50', label: 'Урьдчилгаа 50%' },
  { value: 'upon_completion', label: 'Тээвэрлэлт дуусаад' },
  { value: 'by_contract', label: 'Гэрээгээр тохиролцоно' },
] as const;

const transportConditionsSchema = z.object({
  loadingResponsibility: z.enum(['customer', 'carrier']).optional(),
  unloadingResponsibility: z.enum(['customer', 'carrier']).optional(),
  roadPermitObtain: z.boolean().optional(),
  roadFeePay: z.boolean().optional(),
  vehicleAvailability: z.string().optional(),
  paymentTerms: z.string().optional(),
  insurance: z.string().optional(),
  additionalConditions: z.string().optional(),
});

type TransportConditionsFormValues = z.infer<typeof transportConditionsSchema>;

export default function TmsQuotationDetailPage() {
  const params = useParams();
  const { firestore } = useFirebase();
  const quotationId = params?.id as string;

  const ref = useMemoFirebase(
    () =>
      firestore && quotationId
        ? doc(firestore, TMS_QUOTATIONS_COLLECTION, quotationId)
        : null,
    [firestore, quotationId]
  );
  const { data: quotation, isLoading } = useDoc<TmsQuotation>(ref);
  const { toast } = useToast();

  const transportForm = useForm<TransportConditionsFormValues>({
    resolver: zodResolver(transportConditionsSchema),
    defaultValues: {
      loadingResponsibility: undefined,
      unloadingResponsibility: undefined,
      roadPermitObtain: false,
      roadFeePay: false,
      vehicleAvailability: '',
      paymentTerms: '',
      insurance: '',
      additionalConditions: '',
    },
  });

  React.useEffect(() => {
    if (!quotation) return;
    transportForm.reset({
      loadingResponsibility: (quotation.loadingResponsibility as 'customer' | 'carrier') ?? undefined,
      unloadingResponsibility: (quotation.unloadingResponsibility as 'customer' | 'carrier') ?? undefined,
      roadPermitObtain: quotation.roadPermitObtain ?? false,
      roadFeePay: quotation.roadFeePay ?? false,
      vehicleAvailability: quotation.vehicleAvailability ?? '',
      paymentTerms: quotation.paymentTerms ?? '',
      insurance: quotation.insurance ?? '',
      additionalConditions: quotation.additionalConditions ?? '',
    });
  }, [quotation, transportForm]);

  const onTransportConditionsSubmit = async (values: TransportConditionsFormValues) => {
    if (!firestore || !quotationId) return;
    try {
      await updateDoc(doc(firestore, TMS_QUOTATIONS_COLLECTION, quotationId), {
        loadingResponsibility: values.loadingResponsibility ?? null,
        unloadingResponsibility: values.unloadingResponsibility ?? null,
        roadPermitObtain: values.roadPermitObtain ?? false,
        roadFeePay: values.roadFeePay ?? false,
        vehicleAvailability: values.vehicleAvailability || null,
        paymentTerms: values.paymentTerms || null,
        insurance: values.insurance?.trim() || null,
        additionalConditions: values.additionalConditions?.trim() || null,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Тээврийн нөхцөл хадгалагдлаа.' });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  if (isLoading || !quotation) {
    return (
      <div className="flex flex-col h-full w-full overflow-auto">
        <div className="border-b bg-background px-4 py-4 sm:px-6">
          <PageHeader
            title="Үнийн санал"
            description="Дэлгэрэнгүй"
            breadcrumbs={[
              { label: 'Dashboard', href: '/tms' },
              { label: 'Үнийн санал', href: '/tms/quotations' },
              { label: '…' },
            ]}
          />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-muted-foreground">Үнийн санал олдсонгүй.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Үнийн санал"
          description={`${quotation.customerName ?? 'Нэргүй'} — ${STATUS_LABELS[quotation.status ?? 'draft'] ?? quotation.status}`}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Үнийн санал', href: '/tms/quotations' },
            { label: quotation.customerName ?? quotationId },
          ]}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/tms/quotations" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Буцах
              </Link>
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Үндсэн мэдээлэл</CardTitle>
            <CardDescription>Харилцагч болон хариуцсан хүмүүс</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Харилцагч байгууллага</p>
                <p className="font-medium">{quotation.customerName || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Тухайн байгууллагын хариуцсан ажилтан</p>
                <p className="font-medium">{quotation.customerResponsibleEmployeeName || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Манай хариуцсан / Тээврийн менежер</p>
                <p className="font-medium">{quotation.ourResponsibleEmployeeName || '—'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Төлөв</p>
                <p className="font-medium">
                  {quotation.status ? STATUS_LABELS[quotation.status] ?? quotation.status : 'Ноорог'}
                </p>
              </div>
            </div>
            {quotation.note && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Тэмдэглэл</p>
                <p className="text-sm">{quotation.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Тээврийн нөхцөл</CardTitle>
            <CardDescription>Ачилт, буулгалт, зөвшөөрөл, төлбөрийн нөхцөл</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...transportForm}>
              <form
                onSubmit={transportForm.handleSubmit(onTransportConditionsSubmit)}
                className="space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={transportForm.control}
                    name="loadingResponsibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ачилт</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOADING_RESPONSIBILITY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transportForm.control}
                    name="unloadingResponsibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Буулгалт</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOADING_RESPONSIBILITY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Зөвшөөрөл</Label>
                  <div className="flex flex-wrap gap-6">
                    <FormField
                      control={transportForm.control}
                      name="roadPermitObtain"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Замын зөвшөөрөл авна
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={transportForm.control}
                      name="roadFeePay"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Замын хураамж тушаана
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={transportForm.control}
                    name="vehicleAvailability"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ТХ-н бэлэн байдал</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VEHICLE_AVAILABILITY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={transportForm.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Төлбөрийн нөхцөл</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_TERMS_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={transportForm.control}
                  name="insurance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Даатгал</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Оруулаагүй"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={transportForm.control}
                  name="additionalConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэмэлт нөхцөл</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Нэмэлт нөхцөлийн мэдээлэл..."
                          className="min-h-[80px] resize-y"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={transportForm.formState.isSubmitting}>
                  {transportForm.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Хадгалах
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Тун удахгүй</p>
            <p className="text-xs text-muted-foreground mt-1">
              Энэ хуудсан дээр нэмэлт хөгжүүлэлт хийгдэнэ (мөр, үнэ, нийт гэх мэт).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
