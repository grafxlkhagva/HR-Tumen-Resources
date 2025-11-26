'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFirebase, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const historyEventSchema = z.object({
  eventType: z.string().min(1, 'Үйл явдлын төрлийг сонгоно уу.'),
  eventDate: z.date({
    required_error: 'Үйл явдлын огноог сонгоно уу.',
  }),
  notes: z.string().optional(),
  documentUrl: z.string().url().optional().or(z.literal('')),
});

type HistoryEventFormValues = z.infer<typeof historyEventSchema>;

const eventTypes = [
  'Ажилд авсан',
  'Туршилтын хугацаа эхэлсэн',
  'Үндсэн ажилтан болгосон',
  'Албан тушаал дэвшсэн',
  'Шилжүүлэн томилсон',
  'Урт хугацааны чөлөө',
  'Сахилгын шийтгэл',
  'Ажлаас чөлөөлсөн',
  'Эд хөрөнгө хариуцуулсан',
  'Бусад',
];

interface AddHistoryEventDialogProps {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddHistoryEventDialog({
  employeeId,
  open,
  onOpenChange,
}: AddHistoryEventDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const historyCollectionRef = useMemoFirebase(
    () =>
      firestore
        ? collection(firestore, `employees/${employeeId}/employmentHistory`)
        : null,
    [firestore, employeeId]
  );

  const form = useForm<HistoryEventFormValues>({
    resolver: zodResolver(historyEventSchema),
    defaultValues: {
      eventType: '',
      eventDate: new Date(),
      notes: '',
      documentUrl: '',
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: HistoryEventFormValues) => {
    if (!historyCollectionRef) return;

    await addDocumentNonBlocking(historyCollectionRef, {
      ...values,
      eventDate: values.eventDate.toISOString(),
      createdAt: new Date().toISOString(),
    });

    toast({
      title: 'Амжилттай хадгаллаа',
      description: 'Хөдөлмөрийн түүхэнд шинэ үйл явдал нэмэгдлээ.',
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Шинэ үйл явдал нэмэх</DialogTitle>
              <DialogDescription>
                Ажилтны хөдөлмөрийн харилцааны түүхэнд шинэ тэмдэглэл нэмэх.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Үйл явдлын төрөл</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Төрөл сонгоно уу..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Огноо</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'yyyy-MM-dd')
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
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тэмдэглэл</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Нэмэлт тайлбар, шийдвэрийн дугаар гэх мэт..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="documentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Холбогдох баримт (URL)</FormLabel>
                    <FormControl>
                      <Input placeholder="Тушаал, шийдвэрийн холбоос..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Цуцлах
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Хадгалах
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
