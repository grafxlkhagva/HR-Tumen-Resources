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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });


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
              <p className="text-amber-600 font-medium text-xs">Үнэт зүйлс нь байгууллагын соёлыг төлөвшүүлэх, пойнт системтэй шууд холбоотой тул заавал тодорхойлсон байх шаардлагатайг анхаарна уу.</p>
            </div>
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 rounded-xl shadow-lg shadow-primary/20 transition-all group"
              onClick={() => append({ title: '', description: '', emoji: '⭐', color: '#3b82f6', isActive: true })}
              title="Үнэт зүйл нэмэх"
            >
              <PlusCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
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

                  <div className="flex-1 p-5 flex flex-col md:flex-row gap-6">
                    {/* Visual Selector */}
                    <div className="flex md:flex-col items-center justify-start gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Дүрс</label>
                        <FormField
                          control={form.control}
                          name={`values.${index}.emoji`}
                          render={({ field: emojiField }) => (
                            <FormItem>
                              <FormControl>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <div className="h-14 w-14 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-3xl hover:border-primary hover:shadow-md transition-all relative cursor-pointer shadow-sm">
                                      {emojiField.value || '⭐'}
                                      <div className="absolute -bottom-1 -right-1 p-1 bg-primary rounded-full text-white shadow-lg pointer-events-none">
                                        <Smile className="h-3 w-3" />
                                      </div>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0 border-none shadow-2xl overflow-hidden" align="start">
                                    <EmojiPicker
                                      onEmojiClick={(emojiData) => {
                                        emojiField.onChange(emojiData.emoji);
                                      }}
                                      autoFocusSearch={false}
                                      theme={"light" as any}
                                      width={350}
                                      height={400}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Өнгө</label>
                        <FormField
                          control={form.control}
                          name={`values.${index}.color`}
                          render={({ field: colorField }) => (
                            <FormItem>
                              <FormControl>
                                <div
                                  className="w-14 h-10 rounded-xl border border-slate-200 p-1 bg-white cursor-pointer hover:border-primary/50 transition-all flex items-center justify-center"
                                >
                                  <div
                                    className="w-full h-full rounded-lg shadow-inner relative overflow-hidden"
                                    style={{ backgroundColor: colorField.value }}
                                  >
                                    <Input
                                      type="color"
                                      className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-[3] origin-center"
                                      {...colorField}
                                    />
                                  </div>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Content Inputs */}
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          <FormField
                            control={form.control}
                            name={`values.${index}.title`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Үнэт зүйлийн нэр</FormLabel>
                                <FormControl>
                                  <Input
                                    className="text-lg font-bold bg-white border-slate-200 focus-visible:ring-primary/20 h-11 px-4 rounded-xl"
                                    placeholder="Жишээ: Хариуцлага..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`values.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Тайлбар</FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="resize-none min-h-[100px] bg-white border-slate-200 focus-visible:ring-primary/20 text-sm leading-relaxed p-4 rounded-xl"
                                    placeholder="Энэ үнэт зүйлийн ач холбогдлыг тайлбарлана уу..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex flex-row md:flex-col items-center gap-3 md:pt-6">
                          <FormField
                            control={form.control}
                            name={`values.${index}.isActive`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Button
                                    type="button"
                                    variant={field.value ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                      "h-9 px-4 text-[11px] font-bold rounded-xl transition-all",
                                      field.value ? "bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 border-none" : "text-muted-foreground hover:bg-slate-100"
                                    )}
                                    onClick={() => field.onChange(!field.value)}
                                  >
                                    {field.value ? "Идэвхтэй" : "Идэвхгүй"}
                                  </Button>
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
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
