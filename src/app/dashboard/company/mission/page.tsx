'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Save, X, PlusCircle, Trash2, ArrowLeft, Upload, Image as ImageIcon, Smile, Palette, CheckCircle2, Rocket, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PointsService } from '@/lib/points/points-service';
import { CoreValue } from '@/types/points';
import Link from 'next/link';
import Image from 'next/image';

const valueSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
  description: z.string().min(1, 'Тайлбар хоосон байж болохгүй.'),
  emoji: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
});

const missionVisionSchema = z.object({
  mission: z.string().optional(),
  vision: z.string().optional(),
  values: z.array(valueSchema).optional(),
});

type MissionVisionFormValues = z.infer<typeof missionVisionSchema>;

function FormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function EditMissionVisionForm({
  initialData,
  coreValues
}: {
  initialData: MissionVisionFormValues,
  coreValues: CoreValue[]
}) {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const mergedInitialData = React.useMemo(() => ({
    ...initialData,
    values: coreValues.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      emoji: v.emoji || '⭐',
      color: v.color || '#3b82f6',
      isActive: v.isActive ?? true
    }))
  }), [initialData, coreValues]);

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );

  const form = useForm<MissionVisionFormValues>({
    resolver: zodResolver(missionVisionSchema),
    defaultValues: mergedInitialData,
  });

  React.useEffect(() => {
    form.reset(mergedInitialData);
  }, [mergedInitialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "values",
  });

  const { isSubmitting } = form.formState;

  const handleSave = async (values: MissionVisionFormValues) => {
    if (!companyProfileRef || !firestore) return;

    try {
      // 1. Update Mission/Vision in Profile
      const profileUpdate = {
        mission: values.mission || '',
        vision: values.vision || ''
      };
      await setDoc(companyProfileRef, profileUpdate, { merge: true });

      // 2. Manage Core Values Collection
      const formValues = values.values || [];
      const existingIds = coreValues.map(v => v.id);
      const formIds = formValues.map(v => v.id).filter(Boolean) as string[];

      // Deletions
      const toDelete = existingIds.filter(id => !formIds.includes(id));
      for (const id of toDelete) {
        await deleteDoc(doc(firestore, 'company', 'branding', 'values', id));
      }

      // Updates and Adds
      for (const val of formValues) {
        const valueData = {
          title: val.title,
          description: val.description,
          emoji: val.emoji || '⭐',
          color: val.color || '#3b82f6',
          isActive: val.isActive ?? true,
          updatedAt: serverTimestamp()
        };

        if (val.id) {
          // Update
          await setDoc(doc(firestore, 'company', 'branding', 'values', val.id), valueData, { merge: true });
        } else {
          // Add
          await addDoc(collection(firestore, 'company', 'branding', 'values'), {
            ...valueData,
            createdAt: serverTimestamp()
          });
        }
      }

      toast({
        title: 'Амжилттай хадгаллаа',
        description: 'Компанийн соёлын мэдээлэл шинэчлэгдлээ.',
      });
      router.push('/dashboard/company');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Алдаа гарлаа',
        description: error.message
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-12 pb-32">
        <PageHeader
          title="Байгууллагын Соёл"
          description="Эрхэм зорилго, алсын хараа болон үнэт зүйлсийг удирдах."
          showBackButton
          backHref="/dashboard/company"
          hideBreadcrumbs
          actions={
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isSubmitting} size="sm">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Түр хүлээнэ үү...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Хадгалах
                  </>
                )}
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                disabled={isSubmitting}
              >
                <Link href="/dashboard/company">
                  <X className="mr-2 h-4 w-4" />
                  Цуцлах
                </Link>
              </Button>
            </div>
          }
        />
        {/* Mission & Vision Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-xl bg-gradient-to-br from-white to-slate-50 overflow-hidden group">
            <div className="h-2 w-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Rocket className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Эрхэм зорилго</CardTitle>
              </div>
              <CardDescription>Байгууллагын оршин тогтнох утга учир</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="mission"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="min-h-[160px] resize-none border-none bg-white/50 focus-visible:ring-1 focus-visible:ring-primary/30 text-lg leading-relaxed shadow-inner p-4"
                        placeholder="Бидний эрхэм зорилго бол..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-white to-slate-50 overflow-hidden group">
            <div className="h-2 w-full bg-indigo-500/20 group-hover:bg-indigo-500/40 transition-colors" />
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600">
                  <Eye className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Алсын хараа</CardTitle>
              </div>
              <CardDescription>Бидний хүрэх ирээдүйн дүр зураг</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="vision"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="min-h-[160px] resize-none border-none bg-white/50 focus-visible:ring-1 focus-visible:ring-indigo-500/30 text-lg leading-relaxed shadow-inner p-4"
                        placeholder="Бид ирээдүйд..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Core Values Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-1 bg-primary rounded-full"></div>
                <h2 className="text-2xl font-black tracking-tight">Үнэт зүйлс</h2>
              </div>
              <p className="text-muted-foreground text-sm">Байгууллагын соёл, пойнт системд ашиглагдах үнэт зүйлс</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-6 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all shadow-sm group"
              onClick={() => append({ title: '', description: '', emoji: '⭐', color: '#3b82f6', isActive: true })}
            >
              <PlusCircle className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              Үнэт зүйл нэмэх
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {fields.map((field, index) => (
              <Card key={field.id} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 group/item overflow-hidden">
                <div className="flex flex-col md:flex-row items-stretch">
                  {/* Color Sidebar */}
                  <div
                    className="w-2 hidden md:block"
                    style={{ backgroundColor: form.watch(`values.${index}.color`) || '#3b82f6' }}
                  />

                  <div className="flex-1 p-6 flex flex-col md:flex-row gap-6">
                    {/* Visual Selector */}
                    <div className="flex flex-row md:flex-col items-center justify-center gap-4 bg-slate-50 rounded-2xl p-4 min-w-[120px]">
                      <FormField
                        control={form.control}
                        name={`values.${index}.emoji`}
                        render={({ field: emojiField }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-white text-4xl shadow-md border group-hover/item:scale-110 transition-transform cursor-pointer">
                                  {emojiField.value || '⭐'}
                                  <Input
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    {...emojiField}
                                    placeholder="⭐"
                                  />
                                </div>
                                <div className="absolute -bottom-1 -right-1 p-1 bg-primary rounded-full text-white shadow-lg pointer-events-none">
                                  <Smile className="h-3 w-3" />
                                </div>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`values.${index}.color`}
                        render={({ field: colorField }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative flex items-center gap-2">
                                <div
                                  className="w-8 h-8 rounded-full border-2 border-white shadow-md cursor-pointer relative overflow-hidden ring-2 ring-transparent group-hover/item:ring-primary/20"
                                  style={{ backgroundColor: colorField.value }}
                                >
                                  <Input
                                    type="color"
                                    className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                                    {...colorField}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  {colorField.value}
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Content Inputs */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <FormField
                          control={form.control}
                          name={`values.${index}.title`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  className="text-xl font-black border-none bg-transparent focus-visible:ring-0 p-0 h-auto placeholder:opacity-30"
                                  placeholder="Үнэт зүйлийн нэр..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`values.${index}.isActive`}
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Button
                                  type="button"
                                  variant={field.value ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "h-8 px-3 text-[11px] font-bold rounded-full transition-all",
                                    field.value ? "bg-primary shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"
                                  )}
                                  onClick={() => field.onChange(!field.value)}
                                >
                                  {field.value && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                                  {field.value ? "Идэвхтэй" : "Идэвхгүй"}
                                </Button>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name={`values.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                className="resize-none min-h-[80px] bg-slate-50/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 text-sm leading-relaxed p-4 rounded-xl"
                                placeholder="Энэ үнэт зүйл нь байгууллагын соёлд ямар үүрэгтэй вэ?"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex md:flex-col justify-end items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-xl"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {fields.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                <div className="p-4 bg-white rounded-full shadow-md mb-4">
                  <PlusCircle className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Үнэт зүйлс хоосон байна</h3>
                <p className="text-slate-500 text-sm mb-6 text-center max-w-xs">Байгууллагын соёлыг тодорхойлох анхны үнэт зүйлийг нэмнэ үү</p>
                <Button
                  type="button"
                  onClick={() => append({ title: '', description: '', emoji: '⭐', color: '#3b82f6', isActive: true })}
                >
                  Утга нэмэх
                </Button>
              </div>
            )}
          </div>
        </div>

      </form>
    </Form>
  );
}

const defaultFormValues: MissionVisionFormValues = {
  mission: '',
  vision: '',
  values: [],
};

export default function EditMissionPage() {
  const { firestore } = useFirebase();

  const companyProfileRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'company', 'profile') : null),
    [firestore]
  );

  const valuesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'company', 'branding', 'values'), orderBy('createdAt', 'asc')) : null),
    [firestore]
  );

  const { data: companyProfile, isLoading: isLoadingProfile } = useDoc<any>(companyProfileRef);
  const { data: coreValues, isLoading: isLoadingValues } = useCollection<CoreValue>(valuesQuery);

  if (isLoadingProfile || isLoadingValues) {
    return (
      <div className="py-8">
        <FormSkeleton />
      </div>
    )
  }

  const initialData = companyProfile || defaultFormValues;
  const values = coreValues || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 md:pt-0 scroll-smooth">
        <EditMissionVisionForm initialData={initialData} coreValues={values} />
      </div>
    </div>
  );
}
