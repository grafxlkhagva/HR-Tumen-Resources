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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  addDocumentNonBlocking,
  useFirebase,
  useMemoFirebase,
} from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const typeSchema = z.object({
  name: z.string().min(2, {
    message: 'Төрлийн нэр дор хаяж 2 тэмдэгттэй байх ёстой.',
  }),
});

type TypeFormValues = z.infer<typeof typeSchema>;

interface AddTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTypeDialog({ open, onOpenChange }: AddTypeDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const form = useForm<TypeFormValues>({
    resolver: zodResolver(typeSchema),
    defaultValues: {
      name: '',
    },
  });

  const { isSubmitting } = form.formState;

  const departmentTypesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'departmentTypes') : null),
    [firestore]
  );

  const onSubmit = (data: TypeFormValues) => {
    if (!departmentTypesCollection) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: 'Firestore-той холбогдож чадсангүй.',
      });
      return;
    }

    addDocumentNonBlocking(departmentTypesCollection, data);

    toast({
      title: 'Амжилттай',
      description: `"${data.name}" төрөл амжилттай нэмэгдлээ.`,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Бүтцийн төрөл нэмэх</DialogTitle>
              <DialogDescription>
                Байгууллагын бүтцийн шинэ төрлийг нэмнэ үү. Жишээ нь: 'Алба',
                'Тасаг', 'Хэлтэс'.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Төрлийн нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Жишээ нь: Алба" {...field} />
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

    