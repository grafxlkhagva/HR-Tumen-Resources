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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

const programSchema = z.object({
  title: z.string().min(1, 'Хөтөлбөрийн нэр хоосон байж болохгүй.'),
  description: z.string().optional(),
  type: z.enum(['ONBOARDING', 'OFFBOARDING'], {
    required_error: 'Хөтөлбөрийн төрлийг сонгоно уу.',
  }),
  appliesToType: z.enum(['ALL', 'DEPARTMENT', 'POSITION']).default('ALL'),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
});

type ProgramFormValues = z.infer<typeof programSchema>;

type Reference = {
    id: string;
    name: string;
    title?: string;
}

interface AddProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProgram?: { id: string } & Partial<ProgramFormValues> & { appliesTo?: { departmentId?: string, positionId?: string } } | null;
  departments: Reference[];
  positions: Reference[];
}

export function AddProgramDialog({
  open,
  onOpenChange,
  editingProgram,
  departments,
  positions,
}: AddProgramDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isEditMode = !!editingProgram;

  const programsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'onboardingPrograms') : null),
    [firestore]
  );
  
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    defaultValues: {
        title: '',
        description: '',
        type: 'ONBOARDING',
        appliesToType: 'ALL',
        departmentId: '',
        positionId: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      if (isEditMode && editingProgram) {
        let appliesToType: 'ALL' | 'DEPARTMENT' | 'POSITION' = 'ALL';
        if (editingProgram.appliesTo?.departmentId) appliesToType = 'DEPARTMENT';
        if (editingProgram.appliesTo?.positionId) appliesToType = 'POSITION';
        
        form.reset({
          title: editingProgram.title || '',
          description: editingProgram.description || '',
          type: editingProgram.type || 'ONBOARDING',
          appliesToType: appliesToType,
          departmentId: editingProgram.appliesTo?.departmentId || '',
          positionId: editingProgram.appliesTo?.positionId || '',
        });
      } else {
        form.reset({
            title: '',
            description: '',
            type: 'ONBOARDING',
            appliesToType: 'ALL',
            departmentId: '',
            positionId: '',
        });
      }
    }
  }, [open, editingProgram, isEditMode, form]);

  const { isSubmitting } = form.formState;

  const onSubmit = (data: ProgramFormValues) => {
    if (!programsCollectionRef || !firestore) return;

    let appliesTo = {};
    if (data.appliesToType === 'DEPARTMENT' && data.departmentId) {
        appliesTo = { departmentId: data.departmentId };
    } else if (data.appliesToType === 'POSITION' && data.positionId) {
        appliesTo = { positionId: data.positionId };
    }

    const finalData = {
        title: data.title,
        description: data.description,
        type: data.type,
        appliesTo: appliesTo,
    };

    if (isEditMode && editingProgram) {
      const docRef = doc(firestore, 'onboardingPrograms', editingProgram.id);
      updateDocumentNonBlocking(docRef, finalData);
      toast({ title: 'Амжилттай шинэчлэгдлээ' });
    } else {
      addDocumentNonBlocking(programsCollectionRef, { ...finalData, stageCount: 0, taskCount: 0 });
      toast({ title: 'Хөтөлбөр амжилттай нэмэгдлээ' });
    }

    onOpenChange(false);
  };
  
  const appliesToType = form.watch('appliesToType');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Хөтөлбөр засах' : 'Шинэ хөтөлбөр нэмэх'}</DialogTitle>
              <DialogDescription>
                Дасан зохицох эсвэл ажлаас чөлөөлөх хөтөлбөрийн загварыг үүсгэнэ үү.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh] p-1">
              <div className="space-y-4 py-4 pr-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Хөтөлбөрийн нэр</FormLabel>
                      <FormControl><Input placeholder="Жишээ нь: Программистын дасан зохицох хөтөлбөр" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Тайлбар</FormLabel>
                      <FormControl><Textarea placeholder="Хөтөлбөрийн зорилгын талаар товч бичнэ үү..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Төрөл</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="ONBOARDING">Дасан зохицох</SelectItem>
                          <SelectItem value="OFFBOARDING">Ажлаас чөлөөлөх</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appliesToType"
                  render={({ field }) => (
                      <FormItem className="space-y-3">
                          <FormLabel>Хэрэглэгдэх хүрээ</FormLabel>
                          <FormControl>
                              <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="flex flex-col space-y-1"
                              >
                                  <Card className='p-4'>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl><RadioGroupItem value="ALL" /></FormControl>
                                        <FormLabel className="font-normal w-full cursor-pointer">Бүх ажилтан</FormLabel>
                                    </FormItem>
                                  </Card>
                                  <Card className='p-4 space-y-2'>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl><RadioGroupItem value="DEPARTMENT" /></FormControl>
                                        <FormLabel className="font-normal w-full cursor-pointer">Тодорхой хэлтэс</FormLabel>
                                    </FormItem>
                                    {appliesToType === 'DEPARTMENT' && (
                                        <FormField
                                            control={form.control}
                                            name="departmentId"
                                            render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Хэлтэс сонгоно уу..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {departments.map(dept => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                                                </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    )}
                                  </Card>
                                  <Card className='p-4 space-y-2'>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl><RadioGroupItem value="POSITION" /></FormControl>
                                        <FormLabel className="font-normal w-full cursor-pointer">Тодорхой албан тушаал</FormLabel>
                                    </FormItem>
                                    {appliesToType === 'POSITION' && (
                                        <FormField
                                            control={form.control}
                                            name="positionId"
                                            render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Албан тушаал сонгоно уу..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {positions.map(pos => <SelectItem key={pos.id} value={pos.id}>{pos.title || pos.name}</SelectItem>)}
                                                </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    )}
                                  </Card>
                              </RadioGroup>
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
                />
              </div>
            </ScrollArea>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
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
