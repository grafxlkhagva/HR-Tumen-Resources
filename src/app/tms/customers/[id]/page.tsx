'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { EditCustomerDialog, type CustomerFormValues } from './edit-customer-dialog';
import { TMS_CUSTOMERS_COLLECTION, TMS_CUSTOMER_EMPLOYEES_SUBCOLLECTION, TMS_INDUSTRIES_COLLECTION } from '@/app/tms/types';
import type { TmsCustomer, TmsCustomerEmployee } from '@/app/tms/types';
import type { Employee } from '@/types';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
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

export default function TmsCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const customerId = params?.id as string;

  const [addEmployeeOpen, setAddEmployeeOpen] = React.useState(false);
  const [deleteEmpId, setDeleteEmpId] = React.useState<string | null>(null);
  const [deleteCustomerOpen, setDeleteCustomerOpen] = React.useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = React.useState(false);
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
        logoUrl: values.logoUrl?.trim() || null,
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
      setEditCustomerOpen(false);
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

  const selectedIndustry = industries.find((item) => item.id === customer.industryId);
  const responsibleEmployee = companyEmployees.find((item) => item.id === customer.responsibleEmployeeId);
  const responsibleEmployeeName = responsibleEmployee
    ? `${responsibleEmployee.lastName ?? ''} ${responsibleEmployee.firstName ?? ''}`.trim()
    : null;

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

      <div className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="h-fit">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Үндсэн мэдээлэл</CardTitle>
                <CardDescription>Харилцагчийн бүртгэлийн мэдээлэл.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setEditCustomerOpen(true)}
                aria-label="Харилцагчийн мэдээлэл засах"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm text-muted-foreground">Байгууллагын лого</p>
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {customer.logoUrl ? (
                    <img src={customer.logoUrl} alt={customer.name || 'Customer logo'} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-sm text-muted-foreground">Лого байхгүй</span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Харилцагчийн нэр</p>
                <p className="font-medium">{customer.name || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Регистрийн дугаар</p>
                <p className="font-medium">{customer.registerNumber || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Үйл ажиллагааны чиглэл</p>
                <p className="font-medium">{selectedIndustry?.name || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Хариуцсан ажилтан</p>
                <p className="font-medium">{responsibleEmployeeName || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Оффисын утас</p>
                <p className="font-medium">{customer.phone || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Албан ёсны и-мэйл</p>
                <p className="font-medium break-all">{customer.email || '—'}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-sm text-muted-foreground">Албан ёсны хаяг</p>
                <p className="font-medium">{customer.address || '—'}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-sm text-muted-foreground">Тэмдэглэл</p>
                <p className="whitespace-pre-wrap font-medium">{customer.note || '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="h-fit">
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
      </div>

      <AddCustomerEmployeeDialog
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        customerId={customerId}
        customerRef={customerRef ?? undefined}
        onSuccess={() => setAddEmployeeOpen(false)}
      />

      <EditCustomerDialog
        open={editCustomerOpen}
        onOpenChange={setEditCustomerOpen}
        customer={customer}
        industries={industries}
        companyEmployees={companyEmployees}
        isSaving={isSaving}
        onSubmit={handleSaveCustomer}
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
