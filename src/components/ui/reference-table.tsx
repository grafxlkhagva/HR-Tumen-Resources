'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  useFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';


export interface ReferenceItem {
  id: string;
  [key: string]: any;
}

interface ColumnDefinition {
  key: string;
  header: string;
  render?: (item: any) => React.ReactNode;
}

interface ReferenceTableProps {
  collectionName: string;
  columns: ColumnDefinition[];
  itemData: ReferenceItem[] | null;
  isLoading: boolean;
  dialogTitle: string;
  enableFieldDefs?: boolean;
  dialogComponent?: React.ComponentType<any>;
  hideAddButton?: boolean;
  onEdit?: (item: ReferenceItem) => void;
}

export function ReferenceTable({
  collectionName,
  columns,
  itemData,
  isLoading,
  dialogTitle,
  enableFieldDefs = false,
  dialogComponent: DialogComponent,
  hideAddButton = false,
  onEdit,
}: ReferenceTableProps) {
  const [open, setOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ReferenceItem | null>(null);

  const { firestore } = useFirebase();
  const collectionRef = useMemoFirebase(
    () => (firestore && collectionName ? collection(firestore, collectionName) : null),
    [firestore, collectionName]
  );

  const handleAddNew = () => {
    setEditingItem(null);
    setOpen(true);
  };

  const handleEdit = (item: ReferenceItem) => {
    if (onEdit) {
      onEdit(item);
    } else {
      setEditingItem(item);
      setOpen(true);
    }
  };

  const handleDelete = (item: ReferenceItem) => {
    if (!firestore || !item.id) return;
    const docRef = doc(firestore, collectionName, item.id);
    deleteDocumentNonBlocking(docRef);
  };

  return (
    <>
      {!hideAddButton && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Шинээр нэмэх
          </Button>
        </div>
      )}
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
                  <TableCell key={col.key}>
                    {col.render ? col.render(item[col.key]) : item[col.key]}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Энэ үйлдлийг буцаах боломжгүй. Энэ нь "{item[columns[0].key]}"-г лавлах сангаас бүрмөсөн устгах болно.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Цуцлах</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(item)}>Тийм</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
      {DialogComponent ? (
        <DialogComponent open={open} onOpenChange={setOpen} editingItem={editingItem} />
      ) : (
        <ReferenceItemDialog
          open={open}
          onOpenChange={setOpen}
          item={editingItem}
          columns={columns}
          collectionRef={collectionRef}
          dialogTitle={dialogTitle}
          enableFieldDefs={enableFieldDefs}
          collectionName={collectionName}
        />
      )}
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
  enableFieldDefs?: boolean;
  collectionName: string;
}

function ReferenceItemDialog({
  open,
  onOpenChange,
  item,
  columns,
  collectionRef,
  dialogTitle,
  enableFieldDefs,
  collectionName,
}: ReferenceItemDialogProps) {
  const isEditMode = !!item;

  const formSchema = React.useMemo(() => {
    const shape: { [key: string]: any } = {};
    columns.forEach(col => {
      // Skip fields column and other render-only columns, but not isMandatory
      if (col.key !== 'fields' && !col.render) {
        shape[col.key] = z.string().min(1, `${col.header} хоосон байж болохгүй.`);
      }
    });
    if (enableFieldDefs) {
      shape.fields = z.array(z.object({
        key: z.string().min(1, 'Түлхүүр үг хоосон байж болохгүй.'),
        label: z.string().min(1, 'Нэр хоосон байж болохгүй.'),
        type: z.enum(['text', 'number', 'date']),
      })).optional();
    }
    if (collectionName === 'timeOffRequestTypes') {
      shape.paid = z.boolean().default(false);
    }
    if (collectionName === 'er_document_types') {
      shape.isMandatory = z.boolean().default(false);
    }
    return z.object(shape);
  }, [columns, enableFieldDefs, collectionName]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  React.useEffect(() => {
    if (open) {
      const defaultValues: { [key: string]: any } = {};
      if (isEditMode && item) {
        columns.forEach(col => {
          if (!col.render) {
            defaultValues[col.key] = item[col.key] || (col.key === 'fields' ? [] : '');
          }
        });
        if (collectionName === 'timeOffRequestTypes') {
          defaultValues.paid = item.paid || false;
        }
        if (collectionName === 'er_document_types') {
          defaultValues.isMandatory = item.isMandatory || false;
        }
      } else {
        columns.forEach(col => {
          if (!col.render) {
            defaultValues[col.key] = col.key === 'fields' ? [] : '';
          }
        });
        if (collectionName === 'timeOffRequestTypes') {
          defaultValues.paid = false;
        }
        if (collectionName === 'er_document_types') {
          defaultValues.isMandatory = false;
        }
      }
      form.reset(defaultValues);
    }
  }, [open, item, isEditMode, columns, form, collectionName]);

  const { isSubmitting } = form.formState;
  const { firestore } = useFirebase();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore || !collectionRef) return;

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
      <DialogContent className="sm:max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditMode ? `Засах: ${dialogTitle}` : `Шинэ: ${dialogTitle}`}</DialogTitle>
              <DialogDescription>
                Мэдээллийг нэмэх эсвэл засах.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-auto max-h-[60vh] p-1">
              <div className="grid gap-4 py-4 pr-4">
                {columns.filter(c => !c.render).map(col => (
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

                {collectionName === 'timeOffRequestTypes' && (
                  <FormField
                    control={form.control}
                    name="paid"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 transition-colors hover:bg-slate-50">
                        <div className="space-y-0.5">
                          <FormLabel className="font-bold text-xs uppercase tracking-widest text-slate-500">Цалинтай эсэх</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {collectionName === 'er_document_types' && (
                  <FormField
                    control={form.control}
                    name="isMandatory"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-[1.25rem] border border-indigo-100 bg-indigo-50/30 p-4 transition-all hover:bg-indigo-50/50">
                        <div className="space-y-0.5">
                          <FormLabel className="font-bold text-[10px] uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            Заавал бүрдүүлэх шаардлага (Шаардлагатай)
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-indigo-600"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {enableFieldDefs && (
                  <div>
                    <FormLabel>Нэмэлт талбарууд</FormLabel>
                    <div className="space-y-4 mt-2">
                      {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 items-end gap-2 rounded-md border p-4">
                          <FormField
                            control={form.control}
                            name={`fields.${index}.key`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Түлхүүр үг (key)</FormLabel>
                                <FormControl><Input placeholder="salasy" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.label`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Нэр (label)</FormLabel>
                                <FormControl><Input placeholder="Цалингийн дүн" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Төрөл (type)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Төрөл" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="text">Текст</SelectItem>
                                    <SelectItem value="number">Тоо</SelectItem>
                                    <SelectItem value="date">Огноо</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => append({ key: '', label: '', type: 'text' })}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Талбар нэмэх
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
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
