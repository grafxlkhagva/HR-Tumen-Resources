'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  useFirebase,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, getMonth, getDate, isValid } from 'date-fns';
import type { PublicHoliday } from './holidays/page';

const holidaySchema = z.object({
  name: z.string().min(1, 'Баярын нэр хоосон байж болохгүй.'),
  date: z.date().optional(),
  isRecurring: z.boolean().default(false),
}).superRefine((data, ctx) => {
    if (!data.date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Огноог заавал сонгоно уу.',
            path: ['date'],
        });
    }
});

type HolidayFormValues = z.infer<typeof holidaySchema>;

interface AddHolidayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: PublicHoliday | null;
}

export function AddHolidayDialog({ open, onOpenChange, editingItem }: AddHolidayDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isEditMode = !!editingItem;
  
  const collectionRef = React.useMemo(() => (firestore ? collection(firestore, 'publicHolidays') : null), [firestore]);

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: '',
      isRecurring: false,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (isEditMode && editingItem) {
        let formDate;
        if(editingItem.date) {
            const dateParts = editingItem.date.split('-').map(Number);
            if(dateParts.length === 3) {
              formDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            }
        } else if (editingItem.isRecurring && editingItem.month && editingItem.day) {
            formDate = new Date(new Date().getFullYear(), editingItem.month - 1, editingItem.day);
        }
        form.reset({
            name: editingItem.name,
            isRecurring: editingItem.isRecurring || false,
            date: formDate
        });
      } else {
        form.reset({
          name: '',
          date: undefined,
          isRecurring: false,
        });
      }
    }
  }, [open, editingItem, isEditMode, form]);

  const { isSubmitting } = form.formState;

  const onSubmit = (data: HolidayFormValues) => {
    if (!collectionRef || !firestore || !data.date) return;
    
    let finalData: Partial<PublicHoliday> = {
        name: data.name,
        isRecurring: data.isRecurring,
    };

    if (data.isRecurring) {
        finalData.month = getMonth(data.date) + 1;
        finalData.day = getDate(data.date);
        // Ensure date field is not set to undefined
        if ('date' in finalData) {
            delete finalData.date;
        }
    } else {
        finalData.date = format(data.date, 'yyyy-MM-dd');
        finalData.month = undefined;
        finalData.day = undefined;
    }

    if (isEditMode && editingItem) {
      const docRef = doc(firestore, 'publicHolidays', editingItem.id);
      updateDocumentNonBlocking(docRef, finalData);
      toast({ title: 'Амжилттай шинэчлэгдлээ' });
    } else {
      addDocumentNonBlocking(collectionRef, finalData);
      toast({ title: 'Амжилттай нэмэгдлээ' });
    }
    onOpenChange(false);
  };
  
  const isRecurring = form.watch('isRecurring');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Баярын өдөр засах' : 'Шинэ баярын өдөр'}</DialogTitle>
              <DialogDescription>
                Бүх нийтийн амралтын өдрийг бүртгэх.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Баярын нэр</FormLabel>
                        <FormControl><Input placeholder="Шинэ жил" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                        <FormLabel>Жил бүр давтагдах</FormLabel>
                        <FormDescription>
                            Хэрэв идэвхжүүлбэл энэ баяр жил бүр сонгосон сар, өдөр тохионо.
                        </FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Огноо</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value && isValid(new Date(field.value)) ? (
                                    format(new Date(field.value), isRecurring ? 'MM-dd' : 'yyyy-MM-dd')
                                ) : (
                                    <span>Огноо сонгох</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                captionLayout={isRecurring ? "dropdown-buttons" : "dropdown-nav"}
                                fromYear={isRecurring ? undefined : 1990}
                                toYear={isRecurring ? undefined : new Date().getFullYear() + 5}
                                initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
