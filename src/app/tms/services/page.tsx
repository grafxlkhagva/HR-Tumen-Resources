'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AppDialog,
  AppDialogContent,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogBody,
} from '@/components/patterns';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { TMS_SERVICE_TYPES_COLLECTION, type TmsServiceType } from '@/app/tms/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const serviceTypeSchema = z.object({ name: z.string().min(1, 'Нэр оруулна уу.') });
type ServiceTypeFormValues = z.infer<typeof serviceTypeSchema>;

export default function TmsServicesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<TmsServiceType | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const q = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, TMS_SERVICE_TYPES_COLLECTION), orderBy('name', 'asc'))
        : null,
    [firestore]
  );
  const { data: items = [], isLoading } = useCollection<TmsServiceType>(q);

  const form = useForm<ServiceTypeFormValues>({
    resolver: zodResolver(serviceTypeSchema),
    defaultValues: { name: '' },
  });

  React.useEffect(() => {
    if (!dialogOpen) {
      setEditingItem(null);
      form.reset({ name: '' });
    } else if (editingItem) {
      form.reset({ name: editingItem.name });
    }
  }, [dialogOpen, editingItem, form]);

  const onSubmit = async (values: ServiceTypeFormValues) => {
    if (!firestore) return;
    try {
      if (editingItem) {
        await updateDoc(doc(firestore, TMS_SERVICE_TYPES_COLLECTION, editingItem.id), {
          name: values.name.trim(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Үйлчилгээ шинэчлэгдлээ.' });
      } else {
        await addDoc(collection(firestore, TMS_SERVICE_TYPES_COLLECTION), {
          name: values.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Үйлчилгээ нэмэгдлээ.' });
      }
      setDialogOpen(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  const handleDelete = async () => {
    if (!firestore || !deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_SERVICE_TYPES_COLLECTION, deleteId));
      toast({ title: 'Үйлчилгээ устгагдлаа.' });
      setDeleteId(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Тээврийн үйлчилгээ"
          description="Тээврийн үйлчилгээний төрлүүд"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Үйлчилгээ' },
          ]}
          actions={
            <Button
              className="gap-2"
              onClick={() => {
                setEditingItem(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Шинэ үйлчилгээ нэмэх
            </Button>
          }
        />
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableColumn>Үйлчилгээний нэр</DataTableColumn>
              <DataTableColumn align="right">Үйлдэл</DataTableColumn>
            </DataTableRow>
          </DataTableHeader>
          {isLoading && <DataTableLoading columns={2} rows={5} />}
          {!isLoading && items.length === 0 && (
            <DataTableEmpty
              columns={2}
              message="Үйлчилгээ бүртгэгдээгүй байна. Нэмэх товч дарна уу."
            />
          )}
          {!isLoading && items.length > 0 && (
            <DataTableBody>
              {items.map((item) => (
                <DataTableRow key={item.id} className="cursor-pointer hover:bg-muted/50 transition-colors group" onClick={() => window.location.href = `/tms/services/${item.id}`}>
                  <DataTableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.name || '—'}
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </DataTableCell>
                  <DataTableCell align="right" className="gap-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                        setDialogOpen(true);
                      }}
                      aria-label="Засах"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(item.id);
                      }}
                      aria-label="Устгах"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          )}
        </DataTable>
      </div>

      <AppDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AppDialogContent size="md" showClose>
          <AppDialogHeader>
            <AppDialogTitle>
              {editingItem ? 'Үйлчилгээ засах' : 'Шинэ үйлчилгээ нэмэх'}
            </AppDialogTitle>
            <AppDialogDescription>
              Үйлчилгээний нэрийг оруулна уу (жишээ: Орон нутаг, Хот доторх).
            </AppDialogDescription>
          </AppDialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <AppDialogBody className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр *</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: Орон нутгийн тээвэр" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AppDialogBody>
              <AppDialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingItem ? 'Хадгалах' : 'Нэмэх'}
                </Button>
              </AppDialogFooter>
            </form>
          </Form>
        </AppDialogContent>
      </AppDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Үйлчилгээг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлчилгээний бүртгэл устгагдана. Итгэлтэй байна уу?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
