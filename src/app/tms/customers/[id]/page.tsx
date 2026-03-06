'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DataTable,
  DataTableHeader,
  DataTableColumn,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableLoading,
  DataTableEmpty,
} from '@/components/patterns/data-table';
import { AddCustomerEmployeeDialog } from './add-customer-employee-dialog';
import { TMS_CUSTOMERS_COLLECTION, TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION, TMS_INDUSTRIES_COLLECTION } from '@/app/tms/types';
import type { TmsCustomer, TmsCustomerEmployee } from '@/app/tms/types';
import type { Employee } from '@/types';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(1, 'Харилцагчийн нэр оруулна уу.'),
  registerNumber: z.string().optional(),
  industryId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  responsibleEmployeeId: z.string().optional(),
  note: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function TmsCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const customerId = params?.id as string;

  const [addEmployeeOpen, setAddEmployeeOpen] = React.useState(false);
  const [deleteEmpId, setDeleteEmpId] = React.useState<string | null>(null);
  const [deleteCustomerOpen, setDeleteCustomerOpen] = React.useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const customerRef = useMemoFirebase(
    () => (firestore && customerId ? doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId) : null),
    [firestore, customerId]
  );
  const { data: customer, isLoading: customerLoading } = useDoc<TmsCustomer>(customerRef);

  const employeesQuery = useMemoFirebase(
    () =>
      firestore && customerId
        ? query(
            collection(firestore, TMS_CUSTOMERS_COLLECTION, customerId, TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION),
            orderBy('createdAt', 'desc')
          )
        : null,
    [firestore, customerId]
  );
  const { data: customerEmployees, isLoading: employeesLoading } = useCollection<TmsCustomerEmployee>(employeesQuery);

  const industriesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, TMS_INDUSTRIES_COLLECTION), orderBy('name', 'asc')) : null),
    [firestore]
  );
  const { data: industries = [] } = useCollection<{ id: string; name: string }>(industriesQuery);

  const companyEmployeesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'employees'), orderBy('firstName', 'asc')) : null),
    [firestore]
  );
  const { data: companyEmployees = [] } = useCollection<Employee>(companyEmployeesQuery);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      registerNumber: '',
      industryId: '',
      address: '',
      phone: '',
      email: '',
      responsibleEmployeeId: '',
      note: '',
    },
  });

  React.useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name ?? '',
        registerNumber: customer.registerNumber ?? '',
        industryId: customer.industryId ?? '',
        address: customer.address ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        responsibleEmployeeId: customer.responsibleEmployeeId ?? '',
        note: customer.note ?? '',
      });
    }
  }, [customer, form]);

  const handleDeleteEmployee = React.useCallback(async () => {
    if (!firestore || !customerId || !deleteEmpId) return;
    try {
      await deleteDoc(
        doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId, TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION, deleteEmpId)
      );
      toast({ title: 'Ажилтан устгагдлаа.' });
      setDeleteEmpId(null);
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.' });
    }
  }, [firestore, customerId, deleteEmpId, toast]);

  const handleSaveCustomer = async (values: CustomerFormValues) => {
    if (!firestore || !customerId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId), {
        name: values.name.trim(),
        registerNumber: values.registerNumber?.trim() || null,
        industryId: values.industryId || null,
        address: values.address?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        responsibleEmployeeId: values.responsibleEmployeeId || null,
        note: values.note?.trim() || null,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Харилцагчийн мэдээлэл хадгалагдлаа.' });
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!firestore || !customerId) return;
    setIsDeletingCustomer(true);
    try {
      await deleteDoc(doc(firestore, TMS_CUSTOMERS_COLLECTION, customerId));
      toast({ title: 'Харилцагч устгагдлаа.' });
      setDeleteCustomerOpen(false);
      router.push('/tms/customers');
    } catch (e: unknown) {
      toast({ variant: 'destructive', title: 'Алдаа', description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.' });
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  React.useEffect(() => {
    if (customerId && !customerLoading && customer === null) {
      router.replace('/tms/customers');
    }
  }, [customerId, customer, customerLoading, router]);

  if (customerLoading || !customer) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title={customer.name || 'Харилцагч'}
          description={customer.phone || customer.email ? [customer.phone, customer.email].filter(Boolean).join(' · ') : undefined}
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Харилцагчид', href: '/tms/customers' },
            { label: customer.name || 'Дэлгэрэнгүй' },
          ]}
          showBackButton
          backButtonPlacement="inline"
          backHref="/tms/customers"
          actions={
            <Button variant="destructive" size="sm" onClick={() => setDeleteCustomerOpen(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Устгах
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Үндсэн мэдээлэл</CardTitle>
            <CardDescription>Харилцагчийн бүртгэлийн мэдээлэл. Засварлаад Хадгалах товч дарна уу.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveCustomer)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Харилцагчийн нэр</FormLabel>
                        <FormControl>
                          <Input placeholder="Харилцагчийн нэр" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registerNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Регистрийн дугаар</FormLabel>
                        <FormControl>
                          <Input placeholder="Регистрийн дугаар" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="industryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Үйл ажиллагааны чиглэл</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Чиглэл сонгоно уу..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries.map((ind) => (
                            <SelectItem key={ind.id} value={ind.id}>
                              {ind.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Албан ёсны хаяг</FormLabel>
                      <FormControl>
                        <Input placeholder="Улаанбаатар, дүүрэг, хороо..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Оффисын утас</FormLabel>
                        <FormControl>
                          <Input placeholder="Утасны дугаар" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Албан ёсны и-мэйл</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="responsibleEmployeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Хариуцсан ажилтан</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Хариуцсан ажилтан сонгоно уу..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companyEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.lastName} {emp.firstName}
                              {emp.jobTitle ? ` · ${emp.jobTitle}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тэмдэглэл</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Нэмэлт тэмдэглэл..." rows={3} className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Хадгалах
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ажилчид</CardTitle>
              <CardDescription>Харилцагчийн холбоо барих ажилтнууд</CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddEmployeeOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Ажилтан нэмэх
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn>Овог, Нэр</DataTableColumn>
                  <DataTableColumn>Албан тушаал</DataTableColumn>
                  <DataTableColumn>Утас</DataTableColumn>
                  <DataTableColumn>Имэйл</DataTableColumn>
                  <DataTableColumn align="right" />
                </DataTableRow>
              </DataTableHeader>
              {employeesLoading && <DataTableLoading columns={5} rows={3} />}
              {!employeesLoading && (!customerEmployees || customerEmployees.length === 0) && (
                <DataTableEmpty columns={5} message="Ажилтан бүртгэл байхгүй. Нэмэх товч дарж нэмнэ үү." />
              )}
              {!employeesLoading && customerEmployees && customerEmployees.length > 0 && (
                <DataTableBody>
                  {customerEmployees.map((emp) => (
                    <DataTableRow key={emp.id}>
                      <DataTableCell className="font-medium">
                        {emp.lastName} {emp.firstName}
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">{emp.position || '—'}</DataTableCell>
                      <DataTableCell className="text-muted-foreground">{emp.phone || '—'}</DataTableCell>
                      <DataTableCell className="text-muted-foreground">{emp.email || '—'}</DataTableCell>
                      <DataTableCell align="right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteEmpId(emp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              )}
            </DataTable>
          </CardContent>
        </Card>
      </div>

      <AddCustomerEmployeeDialog
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        customerId={customerId}
        customerRef={customerRef ?? undefined}
        onSuccess={() => setAddEmployeeOpen(false)}
      />

      <AlertDialog open={!!deleteEmpId} onOpenChange={(open) => !open && setDeleteEmpId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ажилтан устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ бүртгэлийг устгаснаар сэргээгдэхгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteCustomerOpen} onOpenChange={setDeleteCustomerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Харилцагчийг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ харилцагч болон түүний холбоо барих ажилтнуудын бүртгэл устгагдана. Үйлдлийг буцааж болохгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              disabled={isDeletingCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
