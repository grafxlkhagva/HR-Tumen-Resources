'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import {
  useFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';

export interface ReferenceItem {
  id: string;
  [key: string]: any;
}

interface ColumnDefinition {
  key: string;
  header: string;
}

interface ReferenceTableProps {
  collectionName: string;
  columns: ColumnDefinition[];
  itemData: ReferenceItem[] | null;
  isLoading: boolean;
  dialogTitle: string;
}

export function ReferenceTable({
  collectionName,
  columns,
  itemData,
  isLoading,
  dialogTitle,
}: ReferenceTableProps) {
  const [open, setOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ReferenceItem | null>(null);

  const { firestore } = useFirebase();
  const collectionRef = React.useMemo(
    () => (firestore ? collection(firestore, collectionName) : null),
    [firestore, collectionName]
  );

  const handleAddNew = () => {
    setEditingItem(null);
    setOpen(true);
  };

  const handleEdit = (item: ReferenceItem) => {
    setEditingItem(item);
    setOpen(true);
  };

  const handleDelete = (item: ReferenceItem) => {
    if (!firestore || !item.id) return;
    if (confirm(`Та "${item[columns[0].key]}"-г устгахдаа итгэлтэй байна уу?`)) {
      const docRef = doc(firestore, collectionName, item.id);
      deleteDocumentNonBlocking(docRef);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Шинээр нэмэх
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.header}</TableHead>
              ))}
              <TableHead className="w-[100px] text-right">Үйлдэл</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                     <TableCell key={col.key}><Skeleton className="h-5 w-24" /></TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-[68px] ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && itemData?.map((item) => (
              <TableRow key={item.id}>
                {columns.map((col) => (
                  <TableCell key={col.key}>{item[col.key]}</TableCell>
                ))}
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
             {!isLoading && (!itemData || itemData.length === 0) && (
                <TableRow>
                    <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                        Бүртгэл байхгүй.
                    </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </div>
      <ReferenceItemDialog
        open={open}
        onOpenChange={setOpen}
        item={editingItem}
        columns={columns}
        collectionRef={collectionRef}
        dialogTitle={dialogTitle}
      />
    </>
  );
}

// --- Dialog Component ---
interface ReferenceItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ReferenceItem | null;
  columns: ColumnDefinition[];
  collectionRef: any;
  dialogTitle: string;
}

function ReferenceItemDialog({
  open,
  onOpenChange,
  item,
  columns,
  collectionRef,
  dialogTitle,
}: ReferenceItemDialogProps) {
  const isEditMode = !!item;

  const formSchema = React.useMemo(() => {
    const shape: { [key: string]: z.ZodString } = {};
    columns.forEach(col => {
      shape[col.key] = z.string().min(1, `${col.header} хоосон байж болохгүй.`);
    });
    return z.object(shape);
  }, [columns]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    if (open) {
      if (isEditMode && item) {
        const defaultValues: { [key: string]: any } = {};
        columns.forEach(col => {
          defaultValues[col.key] = item[col.key] || '';
        });
        form.reset(defaultValues);
      } else {
        const defaultValues: { [key: string]: any } = {};
        columns.forEach(col => {
          defaultValues[col.key] = '';
        });
        form.reset(defaultValues);
      }
    }
  }, [open, item, isEditMode, columns, form]);

  const { isSubmitting } = form.formState;
  const { firestore } = useFirebase();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;

    if (isEditMode && item) {
      const docRef = doc(firestore, collectionRef.path, item.id);
      updateDocumentNonBlocking(docRef, values);
    } else {
      addDocumentNonBlocking(collectionRef, values);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditMode ? `Засах: ${dialogTitle}` : `Шинэ: ${dialogTitle}`}</DialogTitle>
              <DialogDescription>
                Мэдээллийг нэмэх эсвэл засах.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {columns.map(col => (
                <FormField
                  key={col.key}
                  control={form.control}
                  name={col.key}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{col.header}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Цуцлах
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Хадгалах
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
