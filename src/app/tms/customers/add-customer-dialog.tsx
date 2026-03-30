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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { TMS_CUSTOMERS_COLLECTION, TMS_INDUSTRIES_COLLECTION } from '@/app/tms/types';
import type { Employee } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Нэр оруулна уу.'),
  registerNumber: z.string().optional(),
  industryId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  responsibleEmployeeId: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddCustomerDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddCustomerDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
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
    if (!open) form.reset({
      name: '',
      registerNumber: '',
      industryId: '',
      address: '',
      phone: '',
      email: '',
      responsibleEmployeeId: '',
      note: '',
    });
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, TMS_CUSTOMERS_COLLECTION), {
        name: values.name.trim(),
        registerNumber: values.registerNumber?.trim() || null,
        industryId: values.industryId || null,
        address: values.address?.trim() || null,
        phone: values.phone?.trim() || null,
        email: values.email?.trim() || null,
        responsibleEmployeeId: values.responsibleEmployeeId || null,
        note: values.note?.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'Харилцагч амжилттай нэмэгдлээ.' });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e?.message ?? 'Харилцагч нэмэхэд алдаа гарлаа.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
        <AppDialogContent size="lg" showClose={true}>
        <AppDialogHeader>
          <AppDialogTitle>Шинэ харилцагч нэмэх</AppDialogTitle>
          <AppDialogDescription>
            Харилцагчийн үндсэн мэдээлэл оруулна уу.
          </AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AppDialogBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Харилцагчийн нэр *</FormLabel>
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
                <FormItem className="flex flex-col">
                  <FormLabel>Үйл ажиллагааны чиглэл</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? industries.find((ind) => ind.id === field.value)?.name
                            : "Чиглэл сонгоно уу..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Чиглэл хайх..." />
                        <CommandList>
                          <CommandEmpty>Чиглэл олдсонгүй.</CommandEmpty>
                          <CommandGroup>
                            {industries.map((ind) => (
                              <CommandItem
                                value={ind.name}
                                key={ind.id}
                                onSelect={() => {
                                  form.setValue("industryId", ind.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    ind.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {ind.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                    <Textarea placeholder="Нэмэлт тэмдэглэл..." rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </AppDialogBody>
          <AppDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Цуцлах
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Нэмэх
            </Button>
          </AppDialogFooter>
          </form>
        </Form>
      </AppDialogContent>
    </AppDialog>
  );
}
