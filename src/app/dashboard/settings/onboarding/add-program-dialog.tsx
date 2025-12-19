
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
import { Loader2, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';


const programSchema = z.object({
  title: z.string().min(1, 'Хөтөлбөрийн нэр хоосон байж болохгүй.'),
  description: z.string().optional(),
  appliesToType: z.enum(['ALL', 'DEPARTMENT', 'POSITION']).default('ALL'),
  departmentIds: z.array(z.string()).optional(),
  positionIds: z.array(z.string()).optional(),
});

type ProgramFormValues = z.infer<typeof programSchema>;

type Reference = {
    id: string;
    name: string;
    title?: string;
    isActive?: boolean;
}

interface AddProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProgram?: { id: string } & Partial<ProgramFormValues> & { appliesTo?: { departmentIds?: string[], positionIds?: string[] } } | null;
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
        appliesToType: 'ALL',
        departmentIds: [],
        positionIds: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      if (isEditMode && editingProgram) {
        let appliesToType: 'ALL' | 'DEPARTMENT' | 'POSITION' = 'ALL';
        if (editingProgram.appliesTo?.departmentIds && editingProgram.appliesTo.departmentIds.length > 0) appliesToType = 'DEPARTMENT';
        if (editingProgram.appliesTo?.positionIds && editingProgram.appliesTo.positionIds.length > 0) appliesToType = 'POSITION';
        
        form.reset({
          title: editingProgram.title || '',
          description: editingProgram.description || '',
          appliesToType: appliesToType,
          departmentIds: editingProgram.appliesTo?.departmentIds || [],
          positionIds: editingProgram.appliesTo?.positionIds || [],
        });
      } else {
        form.reset({
            title: '',
            description: '',
            appliesToType: 'ALL',
            departmentIds: [],
            positionIds: [],
        });
      }
    }
  }, [open, editingProgram, isEditMode, form]);

  const { isSubmitting } = form.formState;

  const onSubmit = (data: ProgramFormValues) => {
    if (!programsCollectionRef || !firestore) return;

    let appliesTo = {};
    if (data.appliesToType === 'DEPARTMENT' && data.departmentIds && data.departmentIds.length > 0) {
        appliesTo = { departmentIds: data.departmentIds };
    } else if (data.appliesToType === 'POSITION' && data.positionIds && data.positionIds.length > 0) {
        appliesTo = { positionIds: data.positionIds };
    }

    const finalData = {
        title: data.title,
        description: data.description,
        appliesTo: appliesTo,
        type: 'ONBOARDING',
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

  const activePositions = React.useMemo(() => {
    if (!positions) return [];
    return positions.filter(pos => pos.isActive !== false);
  }, [positions]);
  
  const [deptSearch, setDeptSearch] = React.useState('');
  const [posSearch, setPosSearch] = React.useState('');

  const filteredDepartments = React.useMemo(() => departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase())), [departments, deptSearch]);
  const filteredPositions = React.useMemo(() => activePositions.filter(p => (p.title || p.name).toLowerCase().includes(posSearch.toLowerCase())), [activePositions, posSearch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Хөтөлбөр засах' : 'Шинэ хөтөлбөр нэмэх'}</DialogTitle>
          <DialogDescription>
            Дасан зохицох хөтөлбөрийн загварыг үүсгэнэ үү.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col gap-4">
            <div className="flex-1 overflow-y-auto pr-6 -mr-6 space-y-4 py-1">
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
                                        <FormLabel className="font-normal w-full cursor-pointer">Хэлтэс, Алба</FormLabel>
                                    </FormItem>
                                    {appliesToType === 'DEPARTMENT' && (
                                        <FormField
                                            control={form.control}
                                            name="departmentIds"
                                            render={({ field }) => (
                                            <FormItem>
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start font-normal">
                                                            {field.value && field.value.length > 0 ? `${field.value.length} хэлтэс сонгосон` : "Хэлтэс сонгох..."}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                                                         <div className="p-2 relative">
                                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input placeholder="Хайх..." className="pl-8" value={deptSearch} onChange={(e) => setDeptSearch(e.target.value)} />
                                                         </div>
                                                         <DropdownMenuSeparator />
                                                         {filteredDepartments.map(dept => (
                                                            <DropdownMenuCheckboxItem
                                                                key={dept.id}
                                                                checked={field.value?.includes(dept.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                    ? field.onChange([...(field.value || []), dept.id])
                                                                    : field.onChange(field.value?.filter((id) => id !== dept.id))
                                                                }}
                                                            >
                                                                {dept.name}
                                                            </DropdownMenuCheckboxItem>
                                                         ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    )}
                                  </Card>
                                  <Card className='p-4 space-y-2'>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl><RadioGroupItem value="POSITION" /></FormControl>
                                        <FormLabel className="font-normal w-full cursor-pointer">Ажлын байр</FormLabel>
                                    </FormItem>
                                    {appliesToType === 'POSITION' && (
                                        <FormField
                                            control={form.control}
                                            name="positionIds"
                                            render={({ field }) => (
                                            <FormItem>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start font-normal">
                                                            {field.value && field.value.length > 0 ? `${field.value.length} ажлын байр сонгосон` : "Ажлын байр сонгох..."}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                                                         <div className="p-2 relative">
                                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input placeholder="Хайх..." className="pl-8" value={posSearch} onChange={(e) => setPosSearch(e.target.value)} />
                                                         </div>
                                                         <DropdownMenuSeparator />
                                                         {filteredPositions.map(pos => (
                                                             <DropdownMenuCheckboxItem
                                                                key={pos.id}
                                                                checked={field.value?.includes(pos.id)}
                                                                onCheckedChange={(checked) => {
                                                                    return checked
                                                                    ? field.onChange([...(field.value || []), pos.id])
                                                                    : field.onChange(field.value?.filter((id) => id !== pos.id))
                                                                }}
                                                            >
                                                                {pos.title || pos.name}
                                                            </DropdownMenuCheckboxItem>
                                                         ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
            <DialogFooter className="pt-4 border-t -mx-6 px-6">
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
