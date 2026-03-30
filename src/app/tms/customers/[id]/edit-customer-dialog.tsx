'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFirebase } from '@/firebase';
import { Building2, Loader2, Upload, X, Check, ChevronsUpDown } from 'lucide-react';
import type { TmsCustomer } from '@/app/tms/types';
import type { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const customerSchema = z.object({
  name: z.string().min(1, 'Харилцагчийн нэр оруулна уу.'),
  logoUrl: z.string().optional(),
  registerNumber: z.string().optional(),
  industryId: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  responsibleEmployeeId: z.string().optional(),
  note: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: TmsCustomer;
  industries: Array<{ id: string; name: string }>;
  companyEmployees: Employee[];
  isSaving: boolean;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
}

export function EditCustomerDialog({
  open,
  onOpenChange,
  customer,
  industries,
  companyEmployees,
  isSaving,
  onSubmit,
}: EditCustomerDialogProps) {
  const { storage } = useFirebase();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      logoUrl: '',
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
    if (!open) return;
    form.reset({
      name: customer.name ?? '',
      logoUrl: customer.logoUrl ?? '',
      registerNumber: customer.registerNumber ?? '',
      industryId: customer.industryId ?? '',
      address: customer.address ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      responsibleEmployeeId: customer.responsibleEmployeeId ?? '',
      note: customer.note ?? '',
    });
  }, [customer, form, open]);

  const handleSubmit = async (values: CustomerFormValues) => {
    await onSubmit(values);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !storage || !customer.id) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Зөвхөн зураг файл оруулна уу.' });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const storageRef = ref(storage, `company-assets/customer-logo-${customer.id}-${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      form.setValue('logoUrl', url, { shouldDirty: true });
      toast({ title: 'Лого амжилттай байршууллаа.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Лого байршуулахад алдаа гарлаа.' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const logoUrl = form.watch('logoUrl');

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="lg" showClose={true} className="flex max-h-[90vh] flex-col overflow-hidden">
        <AppDialogHeader>
          <AppDialogTitle>Харилцагчийн мэдээлэл засах</AppDialogTitle>
          <AppDialogDescription>
            Үндсэн мэдээллийг шинэчлээд хадгална уу.
          </AppDialogDescription>
        </AppDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <AppDialogBody className="min-h-0 flex-1 space-y-4 overflow-y-auto">
              <div className="flex flex-col gap-3">
                <FormLabel>Байгууллагын лого</FormLabel>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                    {logoUrl ? (
                      <img src={logoUrl} alt={customer.name || 'Customer logo'} className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploadingLogo}>
                      {isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {logoUrl ? 'Лого солих' : 'Лого оруулах'}
                    </Button>
                    {logoUrl ? (
                      <Button type="button" variant="ghost" onClick={() => form.setValue('logoUrl', '', { shouldDirty: true })}>
                        <X className="mr-2 h-4 w-4" />
                        Лого устгах
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                    form.setValue("industryId", ind.id, { shouldDirty: true });
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      <Textarea placeholder="Нэмэлт тэмдэглэл..." rows={4} className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </AppDialogBody>

            <AppDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Цуцлах
              </Button>
              <Button type="submit" disabled={isSaving || isUploadingLogo}>
                {isSaving || isUploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Хадгалах
              </Button>
            </AppDialogFooter>
          </form>
        </Form>
      </AppDialogContent>
    </AppDialog>
  );
}
