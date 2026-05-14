'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/patterns/page-layout';
import { AddActionButton } from '@/components/ui/add-action-button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirebase, useFetchDoc, useMemoFirebase, useCollection, tenantDoc, useTenantWrite } from '@/firebase';
import { useTenant } from '@/contexts/tenant-context';
import { collection, addDoc, deleteDoc, serverTimestamp, query, orderBy, setDoc } from 'firebase/firestore';
import { Loader2, Save, Trash2, Rocket, Eye, ChevronLeft, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { CoreValue } from '@/types/points';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import dynamic from 'next/dynamic';
import { MissionAiBanner } from '@/components/mission-assistant/mission-ai-banner';
import { RefineButton } from '@/components/mission-assistant/refine-button';
import { CritiqueButton } from '@/components/mission-assistant/critique-button';
import { VersionPickerButton } from '@/components/mission-assistant/version-picker-button';
import { DiscoveryWizardDialog } from '@/components/mission-assistant/discovery-wizard-dialog';
import { ValuesCardSortDialog } from '@/components/mission-assistant/values-card-sort-dialog';
import { FreeTalkDialog } from '@/components/mission-assistant/free-talk-dialog';
import { CultureDocDialog } from '@/components/mission-assistant/culture-doc-dialog';
import { Sparkles } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
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
  const { tDoc, tCollection } = useTenantWrite();
  const { company } = useTenant();
  const companyName = company?.name;
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [valuesSortOpen, setValuesSortOpen] = React.useState(false);
  const [freeTalkOpen, setFreeTalkOpen] = React.useState(false);
  const [cultureDocOpen, setCultureDocOpen] = React.useState(false);

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
    ({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null),
    []
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
        await deleteDoc(tDoc('company', 'branding', 'values', id));
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
          await setDoc(tDoc('company', 'branding', 'values', val.id), valueData, { merge: true });
        } else {
          // Add
          await addDoc(tCollection('company', 'branding', 'values'), {
            ...valueData,
            createdAt: serverTimestamp()
          });
        }
      }

      toast({
        title: 'Амжилттай хадгаллаа',
        description: 'Компанийн соёлын мэдээлэл шинэчлэгдлээ.',
      });
      router.push('/company');
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
      <form onSubmit={form.handleSubmit(handleSave)}>
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-20 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6">
          <div className="px-6 md:px-8 py-4">
            <PageHeader
              title="Байгууллагын соёл"
              description="Эрхэм зорилго, алсын хараа, үнэт зүйлс"
              showBackButton
              hideBreadcrumbs
              backButtonPlacement="inline"
              backBehavior="history"
              fallbackBackHref="/company"
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" type="button" asChild>
                    <Link href="/company">Цуцлах</Link>
                  </Button>
                  <Button size="sm" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Хадгалах
                  </Button>
                </div>
              }
            />
          </div>
        </div>

        <div className="space-y-4">
        {/* Mission AI Banner */}
        <MissionAiBanner
          hasContent={Boolean(form.watch('mission') || form.watch('vision'))}
          onOpenWizard={() => setWizardOpen(true)}
          onOpenFreeTalk={() => setFreeTalkOpen(true)}
        />

        {/* Mission & Vision Section */}
        <div className="bg-card rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h3 className="text-caption-medium text-foreground">Эрхэм зорилго & Алсын хараа</h3>
          </div>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-caption-medium text-foreground">Эрхэм зорилго</span>
                  <p className="text-micro text-muted-foreground">Байгууллагын оршин тогтнох утга учир</p>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <RefineButton field="mission" text={form.watch('mission') || ''} companyName={companyName} onApply={(v) => form.setValue('mission', v, { shouldDirty: true })} />
                  <CritiqueButton field="mission" text={form.watch('mission') || ''} />
                  <VersionPickerButton field="mission" text={form.watch('mission') || ''} companyName={companyName} onApply={(v) => form.setValue('mission', v, { shouldDirty: true })} />
                </div>
              </div>
              <FormField
                control={form.control}
                name="mission"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="min-h-[110px] resize-none text-caption"
                        placeholder="Бидний эрхэм зорилго бол..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-caption-medium text-foreground">Алсын хараа</span>
                  <p className="text-micro text-muted-foreground">Бидний хүрэх ирээдүйн дүр зураг</p>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <RefineButton field="vision" text={form.watch('vision') || ''} companyName={companyName} onApply={(v) => form.setValue('vision', v, { shouldDirty: true })} />
                  <CritiqueButton field="vision" text={form.watch('vision') || ''} />
                  <VersionPickerButton field="vision" text={form.watch('vision') || ''} companyName={companyName} onApply={(v) => form.setValue('vision', v, { shouldDirty: true })} />
                </div>
              </div>
              <FormField
                control={form.control}
                name="vision"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        className="min-h-[110px] resize-none text-caption"
                        placeholder="Бид ирээдүйд..."
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="bg-card rounded-lg border">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h3 className="text-caption-medium text-foreground">Үнэт зүйлс</h3>
              <p className="text-micro text-muted-foreground">Пойнт системтэй холбоотой</p>
            </div>
            <div className="flex items-center gap-2">
              {(() => {
                const m = (form.watch('mission') || '').trim();
                const v = (form.watch('vision') || '').trim();
                const vals = form.watch('values') || [];
                const validValues = vals.filter(x => (x.title || '').trim().length > 0);
                const sortReady = m.length >= 20 && v.length >= 15;
                const docReady = sortReady && validValues.length >= 3;
                return (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => sortReady && setValuesSortOpen(true)}
                      disabled={!sortReady}
                      title={sortReady
                        ? 'AI Mission/Vision дээр тулгуурлан 24 үнэт зүйлийн карт санал болгоно'
                        : 'Эхлээд Эрхэм зорилго (≥20 үсэг) ба Алсын хараа (≥15 үсэг) талбарыг бөглөнө үү'}
                      className="h-7 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="h-3 w-3" />
                      AI карт сонголт
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => docReady && setCultureDocOpen(true)}
                      disabled={!docReady}
                      title={docReady
                        ? 'AI 8 хэсэгтэй соёлын баримт бичиг үүсгэнэ (Netflix/GitLab загвар)'
                        : 'Mission, Vision + хамгийн багадаа 3 үнэт зүйл шаардана'}
                      className="h-7 text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📜 Соёлын баримт
                    </Button>
                  </>
                );
              })()}
              <AddActionButton
                label="Үнэт зүйл нэмэх"
                description="Шинэ үнэт зүйл нэмэх"
                onClick={() => append({ title: '', description: '', emoji: '⭐', color: '#3b82f6', isActive: true })}
              />
            </div>
          </div>

          <div className="p-4">
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <p className="text-caption-medium text-foreground">Үнэт зүйлс хоосон байна</p>
                <p className="text-micro text-muted-foreground max-w-sm">Байгууллагын соёлыг тодорхойлох үнэт зүйлийг нэмнэ үү</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-caption mt-1"
                  onClick={() => append({ title: '', description: '', emoji: '⭐', color: '#3b82f6', isActive: true })}
                >
                  Үнэт зүйл нэмэх
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => {
                  return (
                    <div
                      key={field.id}
                      className="group relative border rounded-md p-3 bg-card"
                    >
                      <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-end">
                        {/* Тэмдэг (icon + color) */}
                        <div className="space-y-1">
                          <label className="text-micro text-muted-foreground">Тэмдэг</label>
                          <div className="flex items-center gap-2">
                            <FormField
                              control={form.control}
                              name={`values.${index}.emoji`}
                              render={({ field: emojiField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className="h-9 w-9 flex items-center justify-center rounded-md border bg-card hover:bg-muted/40 text-lg transition-colors"
                                          title="Тэмдэг солих"
                                        >
                                          {emojiField.value || '⭐'}
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-full p-0 border shadow-md" align="start">
                                        <EmojiPicker
                                          onEmojiClick={(emojiData) => emojiField.onChange(emojiData.emoji)}
                                          autoFocusSearch={false}
                                          theme={"light" as any}
                                          width={320}
                                          height={350}
                                        />
                                      </PopoverContent>
                                    </Popover>
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
                                    <label className="relative h-9 w-6 rounded-md overflow-hidden cursor-pointer border" title="Өнгө солих">
                                      <span className="absolute inset-0" style={{ backgroundColor: colorField.value }} />
                                      <Input
                                        type="color"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        {...colorField}
                                      />
                                    </label>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Нэр */}
                        <div className="space-y-1 min-w-0">
                          <label className="text-micro text-muted-foreground">Нэр</label>
                          <FormField
                            control={form.control}
                            name={`values.${index}.title`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    className="h-9 text-caption"
                                    placeholder="Жишээ нь: Шударга байдал"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Switch + Delete */}
                        <div className="flex items-center gap-1 pb-1">
                          <FormField
                            control={form.control}
                            name={`values.${index}.isActive`}
                            render={({ field }) => (
                              <FormItem className="flex items-center">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="data-[state=checked]:bg-success"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1 mt-3">
                        <label className="text-micro text-muted-foreground">Тайлбар</label>
                        <FormField
                          control={form.control}
                          name={`values.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  className="resize-none min-h-[60px] text-caption"
                                  placeholder="Энэ үнэт зүйл компанид яагаад чухал болохыг 1-2 өгүүлбэрээр тайлбарлана уу"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      </form>

      {/* AI Discovery Wizard */}
      <DiscoveryWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        companyName={companyName}
        onApply={(mission, vision) => {
          form.setValue('mission', mission, { shouldDirty: true });
          form.setValue('vision', vision, { shouldDirty: true });
        }}
      />

      {/* AI Free-Talk Capture */}
      <FreeTalkDialog
        open={freeTalkOpen}
        onOpenChange={setFreeTalkOpen}
        companyName={companyName}
        onApply={(mission, vision) => {
          if (mission) form.setValue('mission', mission, { shouldDirty: true });
          if (vision) form.setValue('vision', vision, { shouldDirty: true });
        }}
      />

      {/* AI Culture Document */}
      <CultureDocDialog
        open={cultureDocOpen}
        onOpenChange={setCultureDocOpen}
        mission={form.watch('mission') || ''}
        vision={form.watch('vision') || ''}
        values={(form.watch('values') || [])
          .filter(v => (v.title || '').trim().length > 0)
          .map(v => ({
            name: v.title,
            emoji: v.emoji,
            color: v.color,
            description: v.description,
          }))}
        companyName={companyName}
        existingDoc={(initialData as any)?.cultureDoc || null}
        onSave={async (doc) => {
          if (!companyProfileRef) throw new Error('Профайл олдсонгүй');
          await setDoc(companyProfileRef, { cultureDoc: doc }, { merge: true });
        }}
      />

      {/* AI Values Card Sort */}
      <ValuesCardSortDialog
        open={valuesSortOpen}
        onOpenChange={setValuesSortOpen}
        mission={form.watch('mission')}
        vision={form.watch('vision')}
        companyName={companyName}
        onApply={(newValues) => {
          newValues.forEach(v => {
            append({
              title: v.name,
              description: [v.description, v.doExample, v.dontExample].filter(Boolean).join('\n\n'),
              emoji: v.emoji,
              color: v.color,
              isActive: true,
            });
          });
        }}
      />
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
    ({ firestore, companyPath }) => (firestore ? tenantDoc(firestore, companyPath, 'company', 'profile') : null),
    []
  );

  const valuesQuery = useMemoFirebase(
    ({ firestore, companyPath }) => {
      if (!firestore || !companyPath) return null;
      return query(collection(firestore, `${companyPath}/company/branding/values`), orderBy('createdAt', 'asc'));
    },
    []
  );

  const { data: companyProfile, isLoading: isLoadingProfile } = useFetchDoc<any>(companyProfileRef);
  const { data: coreValues, isLoading: isLoadingValues } = useCollection<CoreValue>(valuesQuery);

  const isLoading = isLoadingProfile || isLoadingValues;
  const initialData = companyProfile || defaultFormValues;
  const values = coreValues || [];

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 pb-32">
          {isLoading ? (
            <FormSkeleton />
          ) : (
            <EditMissionVisionForm initialData={initialData} coreValues={values} />
          )}
        </div>
      </div>
    </div>
  );
}
