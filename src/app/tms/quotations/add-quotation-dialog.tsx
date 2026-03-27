'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  TMS_QUOTATIONS_COLLECTION,
  TMS_CUSTOMERS_COLLECTION,
  TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
} from '@/app/tms/types';
import type { TmsCustomer, TmsCustomerEmployee } from '@/app/tms/types';
import type { Employee } from '@/types';

const NO_CUSTOMER_EMPLOYEE_VALUE = '__none__';

const schema = z.object({
  customerId: z.string().min(1, 'Харилцагч байгууллага сонгоно уу.'),
  customerResponsibleEmployeeId: z.string().optional(),
  ourResponsibleEmployeeId: z.string().min(1, 'Тээврийн менежер сонгоно уу.'),
});

type FormValues = z.infer<typeof schema>;

interface AddQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddQuotationDialog({ open, onOpenChange }: AddQuotationDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: '',
      customerResponsibleEmployeeId: NO_CUSTOMER_EMPLOYEE_VALUE,
      ourResponsibleEmployeeId: '',
    },
  });

  const selectedCustomerId = form.watch('customerId');

  const customersQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_CUSTOMERS_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: customers = [] } = useCollection<TmsCustomer>(customersQuery);

  const customerEmployeesQuery = useMemoFirebase(
    () =>
      firestore && selectedCustomerId
        ? query(
            collection(
              firestore,
              TMS_CUSTOMERS_COLLECTION,
              selectedCustomerId,
              TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION
            ),
            orderBy('lastName', 'asc')
          )
        : null,
    [firestore, selectedCustomerId]
  );
  const { data: customerEmployees = [] } = useCollection<TmsCustomerEmployee>(customerEmployeesQuery);

  const companyEmployeesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'employees'), orderBy('firstName', 'asc'))
        : null,
    [firestore]
  );
  const { data: companyEmployees = [] } = useCollection<Employee>(companyEmployeesQuery);

  React.useEffect(() => {
    if (!selectedCustomerId) form.setValue('customerResponsibleEmployeeId', NO_CUSTOMER_EMPLOYEE_VALUE);
  }, [selectedCustomerId, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    const customer = customers.find((c) => c.id === values.customerId);
    const customerEmp =
      values.customerResponsibleEmployeeId &&
      values.customerResponsibleEmployeeId !== NO_CUSTOMER_EMPLOYEE_VALUE
        ? customerEmployees.find((e) => e.id === values.customerResponsibleEmployeeId)
        : undefined;
    const ourEmp = companyEmployees.find((e) => e.id === values.ourResponsibleEmployeeId);
    if (!customer) {
      toast({ variant: 'destructive', title: 'Харилцагч олдсонгүй.' });
      return;
    }
    if (!ourEmp) {
      toast({ variant: 'destructive', title: 'Тээврийн менежер олдсонгүй.' });
      return;
    }
    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. Get settings for code generation
        const settingsRef = doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID);
        const settingsDoc = await transaction.get(settingsRef);
        
        let currentNum = 0;
        let prefix = 'QU';
        let padding = 5;

        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          currentNum = data.quotationCodeCurrentNumber || 0;
          prefix = data.quotationCodePrefix || 'QU';
          padding = data.quotationCodePadding || 5;
        }

        const nextNum = currentNum + 1;
        const newCode = `${prefix}${String(nextNum).padStart(padding, '0')}`;

        // 2. Create new quotation
        const customerRef = doc(firestore, TMS_CUSTOMERS_COLLECTION, customer.id);
        const docRef = doc(collection(firestore, TMS_QUOTATIONS_COLLECTION));
        
        transaction.set(docRef, {
          code: newCode,
          customerId: customer.id,
          customerRef,
          customerName: customer.name ?? null,
          customerResponsibleEmployeeId: customerEmp?.id ?? null,
          customerResponsibleEmployeeName:
            customerEmp ? `${customerEmp.lastName} ${customerEmp.firstName}`.trim() : null,
          ourResponsibleEmployeeId: ourEmp.id,
          ourResponsibleEmployeeName: `${ourEmp.firstName} ${ourEmp.lastName}`.trim(),
          status: 'draft',
          note: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 3. Update settings
        transaction.set(settingsRef, {
          quotationCodeCurrentNumber: nextNum,
          quotationCodePrefix: prefix,
          quotationCodePadding: padding,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      toast({ title: 'Үнийн санал үүсгэгдлээ.' });
      form.reset({
        customerId: '',
        customerResponsibleEmployeeId: NO_CUSTOMER_EMPLOYEE_VALUE,
        ourResponsibleEmployeeId: '',
      });
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Үнийн санал нэмэхэд алдаа гарлаа.',
      });
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="md" showClose>
        <AppDialogHeader>
          <AppDialogTitle>Шинэ үнийн санал нэмэх</AppDialogTitle>
          <AppDialogDescription>
            Харилцагч байгууллага, хариуцсан ажилтан, тээврийн менежерийг сонгоно уу.
          </AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Харилцагч байгууллага *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={customers.map((c) => ({ value: c.id, label: c.name || c.id }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Сонгох"
                        searchPlaceholder="Харилцагч хайх..."
                        emptyText="Харилцагч олдсонгүй."
                        disabled={!customers.length}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerResponsibleEmployeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тухайн байгуулагын хариуцсан ажилтан</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={[
                          { value: NO_CUSTOMER_EMPLOYEE_VALUE, label: '— Сонгохгүй —' },
                          ...customerEmployees.map((e) => ({
                            value: e.id,
                            label: `${e.lastName} ${e.firstName}${e.position ? ` (${e.position})` : ''}`,
                          })),
                        ]}
                        value={field.value || NO_CUSTOMER_EMPLOYEE_VALUE}
                        onValueChange={field.onChange}
                        placeholder={selectedCustomerId ? 'Сонгох (заавал биш)' : 'Эхлээд харилцагч сонгоно уу'}
                        searchPlaceholder="Ажилтан хайх..."
                        emptyText="Ажилтан олдсонгүй."
                        disabled={!selectedCustomerId}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ourResponsibleEmployeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Манай хариуцсан ажилтан / Тээврийн менежер *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={companyEmployees.map((e) => ({
                          value: e.id,
                          label: `${e.firstName} ${e.lastName}`,
                          description: e.jobTitle || undefined,
                        }))}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Сонгох"
                        searchPlaceholder="Ажилтан хайх..."
                        emptyText="Ажилтан олдсонгүй."
                        disabled={!companyEmployees.length}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AppDialogBody>
            <AppDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Цуцлах
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Үүсгэх
              </Button>
            </AppDialogFooter>
          </form>
        </Form>
      </AppDialogContent>
    </AppDialog>
  );
}
