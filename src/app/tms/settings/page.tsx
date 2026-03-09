'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/patterns/page-layout';
import {
  DataTable,
  DataTableHeader,
  DataTableColumn,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableLoading,
  DataTableEmpty,
} from '@/components/patterns/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AppDialog,
  AppDialogContent,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogBody,
} from '@/components/patterns';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  TMS_VEHICLE_MAKES_COLLECTION,
  TMS_VEHICLE_MODELS_COLLECTION,
  TMS_VEHICLE_TYPES_COLLECTION,
  TMS_TRAILER_TYPES_COLLECTION,
  TMS_REGIONS_COLLECTION,
  TMS_INDUSTRIES_COLLECTION,
  TMS_PACKAGING_TYPES_COLLECTION,
  TMS_SETTINGS_COLLECTION,
  TMS_GLOBAL_SETTINGS_ID,
} from '@/app/tms/types';
import type { TmsVehicleMake, TmsVehicleModel, TmsVehicleType, TmsTrailerType, TmsRegion, TmsIndustry, TmsPackagingType, TmsSettings } from '@/app/tms/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const makeSchema = z.object({ name: z.string().min(1, 'Нэр оруулна уу.') });
const modelSchema = z.object({
  name: z.string().min(1, 'Загварын нэр оруулна уу.'),
  makeId: z.string().min(1, 'Үйлдвэрлэгч сонгоно уу.'),
});
const typeSchema = z.object({ name: z.string().min(1, 'Төрлийн нэр оруулна уу.') });
const trailerTypeSchema = z.object({ name: z.string().min(1, 'Тэвшний төрлийн нэр оруулна уу.') });
const regionSchema = z.object({ name: z.string().min(1, 'Бүс нутагын нэр оруулна уу.') });
const industrySchema = z.object({ name: z.string().min(1, 'Үйл ажиллагааны чиглэлийн нэр оруулна уу.') });
const packagingTypeSchema = z.object({ name: z.string().min(1, 'Багцлалтын төрлийн нэр оруулна уу.') });

const settingsSchema = z.object({
  transportCodePrefix: z.string().min(1, 'Угтвар оруулна уу.'),
  transportCodePadding: z.coerce.number().min(1, 'Хамгийн багадаа 1 оронтой байна.').max(10, 'Хамгийн ихдээ 10 оронтой байна.'),
  transportCodeCurrentNumber: z.coerce.number().min(0, '0 эсвэл түүнээс дээш байх ёстой.'),
  quotationCodePrefix: z.string().min(1, 'Угтвар оруулна уу.'),
  quotationCodePadding: z.coerce.number().min(1, 'Хамгийн багадаа 1 оронтой байна.').max(10, 'Хамгийн ихдээ 10 оронтой байна.'),
  quotationCodeCurrentNumber: z.coerce.number().min(0, '0 эсвэл түүнээс дээш байх ёстой.'),
});

type MakeFormValues = z.infer<typeof makeSchema>;
type ModelFormValues = z.infer<typeof modelSchema>;
type TypeFormValues = z.infer<typeof typeSchema>;
type TrailerTypeFormValues = z.infer<typeof trailerTypeSchema>;
type RegionFormValues = z.infer<typeof regionSchema>;
type IndustryFormValues = z.infer<typeof industrySchema>;
type PackagingTypeFormValues = z.infer<typeof packagingTypeSchema>;
type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function TmsSettingsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [makeDialogOpen, setMakeDialogOpen] = React.useState(false);
  const [editingMake, setEditingMake] = React.useState<TmsVehicleMake | null>(null);
  const [modelDialogOpen, setModelDialogOpen] = React.useState(false);
  const [editingModel, setEditingModel] = React.useState<TmsVehicleModel | null>(null);
  const [deleteMakeId, setDeleteMakeId] = React.useState<string | null>(null);
  const [deleteModelId, setDeleteModelId] = React.useState<string | null>(null);
  const [typeDialogOpen, setTypeDialogOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<TmsVehicleType | null>(null);
  const [deleteTypeId, setDeleteTypeId] = React.useState<string | null>(null);
  const [trailerTypeDialogOpen, setTrailerTypeDialogOpen] = React.useState(false);
  const [editingTrailerType, setEditingTrailerType] = React.useState<TmsTrailerType | null>(null);
  const [deleteTrailerTypeId, setDeleteTrailerTypeId] = React.useState<string | null>(null);
  const [regionDialogOpen, setRegionDialogOpen] = React.useState(false);
  const [editingRegion, setEditingRegion] = React.useState<TmsRegion | null>(null);
  const [deleteRegionId, setDeleteRegionId] = React.useState<string | null>(null);
  const [industryDialogOpen, setIndustryDialogOpen] = React.useState(false);
  const [editingIndustry, setEditingIndustry] = React.useState<TmsIndustry | null>(null);
  const [deleteIndustryId, setDeleteIndustryId] = React.useState<string | null>(null);
  const [packagingTypeDialogOpen, setPackagingTypeDialogOpen] = React.useState(false);
  const [editingPackagingType, setEditingPackagingType] = React.useState<TmsPackagingType | null>(null);
  const [deletePackagingTypeId, setDeletePackagingTypeId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const makesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_VEHICLE_MAKES_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: makes = [], isLoading: makesLoading } = useCollection<TmsVehicleMake>(makesQuery);

  const modelsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_VEHICLE_MODELS_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: models = [], isLoading: modelsLoading } = useCollection<TmsVehicleModel>(modelsQuery);

  const typesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_VEHICLE_TYPES_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: types = [], isLoading: typesLoading } = useCollection<TmsVehicleType>(typesQuery);

  const trailerTypesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_TRAILER_TYPES_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: trailerTypes = [], isLoading: trailerTypesLoading } = useCollection<TmsTrailerType>(trailerTypesQuery);

  const regionsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_REGIONS_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: regions = [], isLoading: regionsLoading } = useCollection<TmsRegion>(regionsQuery);

  const industriesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_INDUSTRIES_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: industries = [], isLoading: industriesLoading } = useCollection<TmsIndustry>(industriesQuery);

  const packagingTypesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, TMS_PACKAGING_TYPES_COLLECTION),
            orderBy('name', 'asc')
          )
        : null,
    [firestore]
  );
  const { data: packagingTypes = [], isLoading: packagingTypesLoading } = useCollection<TmsPackagingType>(packagingTypesQuery);

  const settingsDocRef = useMemoFirebase(
    () => firestore ? doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID) : null,
    [firestore]
  );
  const { data: settings, isLoading: settingsLoading } = useDoc<TmsSettings>(settingsDocRef);

  const makeNameById = React.useMemo(() => {
    const m: Record<string, string> = {};
    makes.forEach((make) => {
      m[make.id] = make.name ?? '';
    });
    return m;
  }, [makes]);

  const makeForm = useForm<MakeFormValues>({
    resolver: zodResolver(makeSchema),
    defaultValues: { name: '' },
  });
  const modelForm = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues: { name: '', makeId: '' },
  });
  const typeForm = useForm<TypeFormValues>({
    resolver: zodResolver(typeSchema),
    defaultValues: { name: '' },
  });
  const trailerTypeForm = useForm<TrailerTypeFormValues>({
    resolver: zodResolver(trailerTypeSchema),
    defaultValues: { name: '' },
  });
  const regionForm = useForm<RegionFormValues>({
    resolver: zodResolver(regionSchema),
    defaultValues: { name: '' },
  });
  const industryForm = useForm<IndustryFormValues>({
    resolver: zodResolver(industrySchema),
    defaultValues: { name: '' },
  });
  const packagingTypeForm = useForm<PackagingTypeFormValues>({
    resolver: zodResolver(packagingTypeSchema),
    defaultValues: { name: '' },
  });
  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { 
      transportCodePrefix: 'TR', transportCodePadding: 5, transportCodeCurrentNumber: 0,
      quotationCodePrefix: 'QU', quotationCodePadding: 5, quotationCodeCurrentNumber: 0
    },
  });

  React.useEffect(() => {
    if (settings) {
      settingsForm.reset({
        transportCodePrefix: settings.transportCodePrefix || 'TR',
        transportCodePadding: settings.transportCodePadding || 5,
        transportCodeCurrentNumber: settings.transportCodeCurrentNumber || 0,
        quotationCodePrefix: settings.quotationCodePrefix || 'QU',
        quotationCodePadding: settings.quotationCodePadding || 5,
        quotationCodeCurrentNumber: settings.quotationCodeCurrentNumber || 0,
      });
    }
  }, [settings, settingsForm]);

  React.useEffect(() => {
    if (!makeDialogOpen) {
      setEditingMake(null);
      makeForm.reset({ name: '' });
    } else if (editingMake) {
      makeForm.reset({ name: editingMake.name });
    }
  }, [makeDialogOpen, editingMake, makeForm]);

  React.useEffect(() => {
    if (!modelDialogOpen) {
      setEditingModel(null);
      modelForm.reset({ name: '', makeId: '' });
    } else if (editingModel) {
      modelForm.reset({ name: editingModel.name, makeId: editingModel.makeId });
    }
  }, [modelDialogOpen, editingModel, modelForm]);

  React.useEffect(() => {
    if (!typeDialogOpen) {
      setEditingType(null);
      typeForm.reset({ name: '' });
    } else if (editingType) {
      typeForm.reset({ name: editingType.name });
    }
  }, [typeDialogOpen, editingType, typeForm]);

  React.useEffect(() => {
    if (!trailerTypeDialogOpen) {
      setEditingTrailerType(null);
      trailerTypeForm.reset({ name: '' });
    } else if (editingTrailerType) {
      trailerTypeForm.reset({ name: editingTrailerType.name });
    }
  }, [trailerTypeDialogOpen, editingTrailerType, trailerTypeForm]);

  React.useEffect(() => {
    if (!regionDialogOpen) {
      setEditingRegion(null);
      regionForm.reset({ name: '' });
    } else if (editingRegion) {
      regionForm.reset({ name: editingRegion.name });
    }
  }, [regionDialogOpen, editingRegion, regionForm]);

  React.useEffect(() => {
    if (!industryDialogOpen) {
      setEditingIndustry(null);
      industryForm.reset({ name: '' });
    } else if (editingIndustry) {
      industryForm.reset({ name: editingIndustry.name });
    }
  }, [industryDialogOpen, editingIndustry, industryForm]);

  React.useEffect(() => {
    if (!packagingTypeDialogOpen) {
      setEditingPackagingType(null);
      packagingTypeForm.reset({ name: '' });
    } else if (editingPackagingType) {
      packagingTypeForm.reset({ name: editingPackagingType.name });
    }
  }, [packagingTypeDialogOpen, editingPackagingType, packagingTypeForm]);

  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const onSubmitSettings = async (values: SettingsFormValues) => {
    if (!firestore) return;
    setIsSavingSettings(true);
    try {
      const docRef = doc(firestore, TMS_SETTINGS_COLLECTION, TMS_GLOBAL_SETTINGS_ID);
      await setDoc(docRef, { ...values, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: 'Тохиргоо хадгалагдлаа.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Алдаа', description: error.message });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const onMakeSubmit = async (values: MakeFormValues) => {
    if (!firestore) return;
    try {
      if (editingMake) {
        await updateDoc(doc(firestore, TMS_VEHICLE_MAKES_COLLECTION, editingMake.id), {
          name: values.name.trim(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Үйлдвэрлэгч шинэчлэгдлээ.' });
      } else {
        await addDoc(collection(firestore, TMS_VEHICLE_MAKES_COLLECTION), {
          name: values.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Үйлдвэрлэгч нэмэгдлээ.' });
      }
      setMakeDialogOpen(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  const onModelSubmit = async (values: ModelFormValues) => {
    if (!firestore) return;
    try {
      const makeRef = doc(firestore, TMS_VEHICLE_MAKES_COLLECTION, values.makeId);
      if (editingModel) {
        await updateDoc(doc(firestore, TMS_VEHICLE_MODELS_COLLECTION, editingModel.id), {
          name: values.name.trim(),
          makeId: values.makeId,
          makeRef,
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Загвар шинэчлэгдлээ.' });
      } else {
        await addDoc(collection(firestore, TMS_VEHICLE_MODELS_COLLECTION), {
          name: values.name.trim(),
          makeId: values.makeId,
          makeRef,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Загвар нэмэгдлээ.' });
      }
      setModelDialogOpen(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  const handleDeleteMake = async () => {
    if (!firestore || !deleteMakeId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_VEHICLE_MAKES_COLLECTION, deleteMakeId));
      toast({ title: 'Үйлдвэрлэгч устгагдлаа.' });
      setDeleteMakeId(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!firestore || !deleteModelId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_VEHICLE_MODELS_COLLECTION, deleteModelId));
      toast({ title: 'Загвар устгагдлаа.' });
      setDeleteModelId(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const onTypeSubmit = async (values: TypeFormValues) => {
    if (!firestore) return;
    try {
      if (editingType) {
        await updateDoc(doc(firestore, TMS_VEHICLE_TYPES_COLLECTION, editingType.id), {
          name: values.name.trim(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Машины төрөл шинэчлэгдлээ.' });
      } else {
        await addDoc(collection(firestore, TMS_VEHICLE_TYPES_COLLECTION), {
          name: values.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Машины төрөл нэмэгдлээ.' });
      }
      setTypeDialogOpen(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  const handleDeleteType = async () => {
    if (!firestore || !deleteTypeId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_VEHICLE_TYPES_COLLECTION, deleteTypeId));
      toast({ title: 'Машины төрөл устгагдлаа.' });
      setDeleteTypeId(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const onTrailerTypeSubmit = async (values: TrailerTypeFormValues) => {
    if (!firestore) return;
    try {
      if (editingTrailerType) {
        await updateDoc(doc(firestore, TMS_TRAILER_TYPES_COLLECTION, editingTrailerType.id), {
          name: values.name.trim(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Тэвшний төрөл шинэчлэгдлээ.' });
      } else {
        await addDoc(collection(firestore, TMS_TRAILER_TYPES_COLLECTION), {
          name: values.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Тэвшний төрөл нэмэгдлээ.' });
      }
      setTrailerTypeDialogOpen(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  const handleDeleteTrailerType = async () => {
    if (!firestore || !deleteTrailerTypeId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_TRAILER_TYPES_COLLECTION, deleteTrailerTypeId));
      toast({ title: 'Тэвшний төрөл устгагдлаа.' });
      setDeleteTrailerTypeId(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const onRegionSubmit = async (values: RegionFormValues) => {
    if (!firestore) return;
    try {
      if (editingRegion) {
        await updateDoc(doc(firestore, TMS_REGIONS_COLLECTION, editingRegion.id), {
          name: values.name.trim(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Бүс нутаг шинэчлэгдлээ.' });
      } else {
        await addDoc(collection(firestore, TMS_REGIONS_COLLECTION), {
          name: values.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Бүс нутаг нэмэгдлээ.' });
      }
      setRegionDialogOpen(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  const handleDeleteRegion = async () => {
    if (!firestore || !deleteRegionId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_REGIONS_COLLECTION, deleteRegionId));
      toast({ title: 'Бүс нутаг устгагдлаа.' });
      setDeleteRegionId(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const onIndustrySubmit = async (values: IndustryFormValues) => {
    if (!firestore) return;
    try {
      if (editingIndustry) {
        await updateDoc(doc(firestore, TMS_INDUSTRIES_COLLECTION, editingIndustry.id), {
          name: values.name.trim(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Үйл ажиллагааны чиглэл шинэчлэгдлээ.' });
      } else {
        await addDoc(collection(firestore, TMS_INDUSTRIES_COLLECTION), {
          name: values.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Үйл ажиллагааны чиглэл нэмэгдлээ.' });
      }
      setIndustryDialogOpen(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  const handleDeleteIndustry = async () => {
    if (!firestore || !deleteIndustryId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_INDUSTRIES_COLLECTION, deleteIndustryId));
      toast({ title: 'Үйл ажиллагааны чиглэл устгагдлаа.' });
      setDeleteIndustryId(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const onPackagingTypeSubmit = async (values: PackagingTypeFormValues) => {
    if (!firestore) return;
    try {
      if (editingPackagingType) {
        await updateDoc(doc(firestore, TMS_PACKAGING_TYPES_COLLECTION, editingPackagingType.id), {
          name: values.name.trim(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Багцлалтын төрөл шинэчлэгдлээ.' });
      } else {
        await addDoc(collection(firestore, TMS_PACKAGING_TYPES_COLLECTION), {
          name: values.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Багцлалтын төрөл нэмэгдлээ.' });
      }
      setPackagingTypeDialogOpen(false);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    }
  };

  const handleDeletePackagingType = async () => {
    if (!firestore || !deletePackagingTypeId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, TMS_PACKAGING_TYPES_COLLECTION, deletePackagingTypeId));
      toast({ title: 'Багцлалтын төрөл устгагдлаа.' });
      setDeletePackagingTypeId(null);
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Устгахад алдаа гарлаа.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-auto">
      <div className="border-b bg-background px-4 py-4 sm:px-6">
        <PageHeader
          title="Тохиргоо"
          description="Тээврийн лавлах сангууд — машины үйлдвэрлэгч, загвар"
          breadcrumbs={[
            { label: 'Dashboard', href: '/tms' },
            { label: 'Тохиргоо' },
          ]}
        />
      </div>

      <div className="flex-1 p-4 sm:p-6">
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto w-full justify-start">
            <TabsTrigger value="settings">Ерөнхий тохиргоо</TabsTrigger>
            <TabsTrigger value="makes">Машины үйлдвэрлэгч</TabsTrigger>
            <TabsTrigger value="models">Машины загвар</TabsTrigger>
            <TabsTrigger value="types">Машины төрөл</TabsTrigger>
            <TabsTrigger value="trailerTypes">Тэвшний төрөл</TabsTrigger>
            <TabsTrigger value="regions">Бүс нутаг</TabsTrigger>
            <TabsTrigger value="industries">Үйл ажиллагааны чиглэл</TabsTrigger>
            <TabsTrigger value="packagingTypes">Багцлалтын төрөл</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Тээврийн удирдлагын кодчилол</h3>
                {settingsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Уншиж байна...
                  </div>
                ) : (
                  <Form {...settingsForm}>
                    <form id="settings-form" onSubmit={settingsForm.handleSubmit(onSubmitSettings)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={settingsForm.control}
                          name="transportCodePrefix"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Кодын угтвар</FormLabel>
                              <FormControl>
                                <Input placeholder="TR" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settingsForm.control}
                          name="transportCodePadding"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Кодын цифрийн урт</FormLabel>
                              <FormControl>
                                <Input type="number" min={1} max={10} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={settingsForm.control}
                          name="transportCodeCurrentNumber"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Одоогийн дугаар</FormLabel>
                              <FormControl>
                                <Input type="number" min={0} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </form>
                  </Form>
                )}
              </div>

              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Үнийн саналын кодчилол</h3>
                {settingsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Уншиж байна...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={settingsForm.control}
                        name="quotationCodePrefix"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Кодын угтвар</FormLabel>
                            <FormControl>
                              <Input placeholder="QU" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={settingsForm.control}
                        name="quotationCodePadding"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Кодын цифрийн урт</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} max={10} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={settingsForm.control}
                        name="quotationCodeCurrentNumber"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Одоогийн дугаар</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {!settingsLoading && (
              <Button type="submit" form="settings-form" disabled={isSavingSettings} className="gap-2 mt-4">
                {isSavingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                Хадгалах
              </Button>
            )}
          </TabsContent>

          <TabsContent value="makes" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingMake(null);
                  setMakeDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Шинэ үйлдвэрлэгч нэмэх
              </Button>
            </div>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn>Нэр</DataTableColumn>
                  <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                </DataTableRow>
              </DataTableHeader>
              {makesLoading && <DataTableLoading columns={2} rows={5} />}
              {!makesLoading && makes.length === 0 && (
                <DataTableEmpty
                  columns={2}
                  message="Үйлдвэрлэгч байхгүй. Нэмэх товч дарна уу."
                />
              )}
              {!makesLoading && makes.length > 0 && (
                <DataTableBody>
                  {makes.map((make) => (
                    <DataTableRow key={make.id}>
                      <DataTableCell className="font-medium">{make.name || '—'}</DataTableCell>
                      <DataTableCell align="right" className="gap-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingMake(make);
                            setMakeDialogOpen(true);
                          }}
                          aria-label="Засах"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteMakeId(make.id)}
                          aria-label="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              )}
            </DataTable>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingModel(null);
                  setModelDialogOpen(true);
                }}
                disabled={makes.length === 0}
              >
                <Plus className="h-4 w-4" />
                Шинэ загвар нэмэх
              </Button>
            </div>
            {makes.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Эхлээд үйлдвэрлэгч нэмнэ үү. Загвар нэмэхийн тулд үйлдвэрлэгч заавал байх ёстой.
              </p>
            )}
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn>Загварын нэр</DataTableColumn>
                  <DataTableColumn>Үйлдвэрлэгч</DataTableColumn>
                  <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                </DataTableRow>
              </DataTableHeader>
              {modelsLoading && <DataTableLoading columns={3} rows={5} />}
              {!modelsLoading && models.length === 0 && (
                <DataTableEmpty
                  columns={3}
                  message="Загвар байхгүй. Нэмэх товч дарна уу."
                />
              )}
              {!modelsLoading && models.length > 0 && (
                <DataTableBody>
                  {models.map((model) => (
                    <DataTableRow key={model.id}>
                      <DataTableCell className="font-medium">{model.name || '—'}</DataTableCell>
                      <DataTableCell className="text-muted-foreground">
                        {makeNameById[model.makeId] ?? model.makeId ?? '—'}
                      </DataTableCell>
                      <DataTableCell align="right" className="gap-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingModel(model);
                            setModelDialogOpen(true);
                          }}
                          aria-label="Засах"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteModelId(model.id)}
                          aria-label="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              )}
            </DataTable>
          </TabsContent>

          <TabsContent value="types" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingType(null);
                  setTypeDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Шинэ төрөл нэмэх
              </Button>
            </div>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn>Нэр</DataTableColumn>
                  <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                </DataTableRow>
              </DataTableHeader>
              {typesLoading && <DataTableLoading columns={2} rows={5} />}
              {!typesLoading && types.length === 0 && (
                <DataTableEmpty
                  columns={2}
                  message="Машины төрөл байхгүй. Нэмэх товч дарна уу."
                />
              )}
              {!typesLoading && types.length > 0 && (
                <DataTableBody>
                  {types.map((type) => (
                    <DataTableRow key={type.id}>
                      <DataTableCell className="font-medium">{type.name || '—'}</DataTableCell>
                      <DataTableCell align="right" className="gap-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingType(type);
                            setTypeDialogOpen(true);
                          }}
                          aria-label="Засах"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTypeId(type.id)}
                          aria-label="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              )}
            </DataTable>
          </TabsContent>

          <TabsContent value="trailerTypes" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingTrailerType(null);
                  setTrailerTypeDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Шинэ тэвшний төрөл нэмэх
              </Button>
            </div>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn>Нэр</DataTableColumn>
                  <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                </DataTableRow>
              </DataTableHeader>
              {trailerTypesLoading && <DataTableLoading columns={2} rows={5} />}
              {!trailerTypesLoading && trailerTypes.length === 0 && (
                <DataTableEmpty
                  columns={2}
                  message="Тэвшний төрөл байхгүй. Нэмэх товч дарна уу."
                />
              )}
              {!trailerTypesLoading && trailerTypes.length > 0 && (
                <DataTableBody>
                  {trailerTypes.map((trailerType) => (
                    <DataTableRow key={trailerType.id}>
                      <DataTableCell className="font-medium">{trailerType.name || '—'}</DataTableCell>
                      <DataTableCell align="right" className="gap-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingTrailerType(trailerType);
                            setTrailerTypeDialogOpen(true);
                          }}
                          aria-label="Засах"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTrailerTypeId(trailerType.id)}
                          aria-label="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              )}
            </DataTable>
          </TabsContent>

          <TabsContent value="regions" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingRegion(null);
                  setRegionDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Шинэ бүс нутаг нэмэх
              </Button>
            </div>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn>Нэр</DataTableColumn>
                  <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                </DataTableRow>
              </DataTableHeader>
              {regionsLoading && <DataTableLoading columns={2} rows={5} />}
              {!regionsLoading && regions.length === 0 && (
                <DataTableEmpty
                  columns={2}
                  message="Бүс нутаг байхгүй. Нэмэх товч дарна уу."
                />
              )}
              {!regionsLoading && regions.length > 0 && (
                <DataTableBody>
                  {regions.map((region) => (
                    <DataTableRow key={region.id}>
                      <DataTableCell className="font-medium">{region.name || '—'}</DataTableCell>
                      <DataTableCell align="right" className="gap-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingRegion(region);
                            setRegionDialogOpen(true);
                          }}
                          aria-label="Засах"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteRegionId(region.id)}
                          aria-label="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              )}
            </DataTable>
          </TabsContent>

          <TabsContent value="industries" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingIndustry(null);
                  setIndustryDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Шинэ үйл ажиллагааны чиглэл нэмэх
              </Button>
            </div>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn>Нэр</DataTableColumn>
                  <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                </DataTableRow>
              </DataTableHeader>
              {industriesLoading && <DataTableLoading columns={2} rows={5} />}
              {!industriesLoading && industries.length === 0 && (
                <DataTableEmpty
                  columns={2}
                  message="Үйл ажиллагааны чиглэл байхгүй. Нэмэх товч дарна уу."
                />
              )}
              {!industriesLoading && industries.length > 0 && (
                <DataTableBody>
                  {industries.map((industry) => (
                    <DataTableRow key={industry.id}>
                      <DataTableCell className="font-medium">{industry.name || '—'}</DataTableCell>
                      <DataTableCell align="right" className="gap-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingIndustry(industry);
                            setIndustryDialogOpen(true);
                          }}
                          aria-label="Засах"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteIndustryId(industry.id)}
                          aria-label="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              )}
            </DataTable>
          </TabsContent>

          <TabsContent value="packagingTypes" className="space-y-4">
            <div className="flex justify-end">
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditingPackagingType(null);
                  setPackagingTypeDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Шинэ багцлалтын төрөл нэмэх
              </Button>
            </div>
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableColumn>Нэр</DataTableColumn>
                  <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                </DataTableRow>
              </DataTableHeader>
              {packagingTypesLoading && <DataTableLoading columns={2} rows={5} />}
              {!packagingTypesLoading && packagingTypes.length === 0 && (
                <DataTableEmpty
                  columns={2}
                  message="Багцлалтын төрөл байхгүй. Нэмэх товч дарна уу."
                />
              )}
              {!packagingTypesLoading && packagingTypes.length > 0 && (
                <DataTableBody>
                  {packagingTypes.map((pt) => (
                    <DataTableRow key={pt.id}>
                      <DataTableCell className="font-medium">{pt.name || '—'}</DataTableCell>
                      <DataTableCell align="right" className="gap-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingPackagingType(pt);
                            setPackagingTypeDialogOpen(true);
                          }}
                          aria-label="Засах"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletePackagingTypeId(pt.id)}
                          aria-label="Устгах"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              )}
            </DataTable>
          </TabsContent>
        </Tabs>
      </div>

      {/* Make dialog */}
      <AppDialog open={makeDialogOpen} onOpenChange={setMakeDialogOpen}>
        <AppDialogContent size="md" showClose>
          <AppDialogHeader>
            <AppDialogTitle>
              {editingMake ? 'Үйлдвэрлэгч засах' : 'Шинэ үйлдвэрлэгч нэмэх'}
            </AppDialogTitle>
            <AppDialogDescription>
              Машины үйлдвэрлэгчийн нэрийг оруулна уу.
            </AppDialogDescription>
          </AppDialogHeader>
          <Form {...makeForm}>
            <form onSubmit={makeForm.handleSubmit(onMakeSubmit)}>
              <AppDialogBody className="space-y-4">
                <FormField
                  control={makeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр *</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: Toyota, Hyundai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AppDialogBody>
              <AppDialogFooter>
                <Button type="button" variant="outline" onClick={() => setMakeDialogOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={makeForm.formState.isSubmitting}>
                  {makeForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingMake ? 'Хадгалах' : 'Нэмэх'}
                </Button>
              </AppDialogFooter>
            </form>
          </Form>
        </AppDialogContent>
      </AppDialog>

      {/* Model dialog */}
      <AppDialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <AppDialogContent size="md" showClose>
          <AppDialogHeader>
            <AppDialogTitle>
              {editingModel ? 'Загвар засах' : 'Шинэ загвар нэмэх'}
            </AppDialogTitle>
            <AppDialogDescription>
              Машины загварын нэр болон үйлдвэрлэгчийг сонгоно уу.
            </AppDialogDescription>
          </AppDialogHeader>
          <Form {...modelForm}>
            <form onSubmit={modelForm.handleSubmit(onModelSubmit)}>
              <AppDialogBody className="space-y-4">
                <FormField
                  control={modelForm.control}
                  name="makeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Үйлдвэрлэгч *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Сонгох" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {makes.map((make) => (
                            <SelectItem key={make.id} value={make.id}>
                              {make.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={modelForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Загварын нэр *</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: Camry, Tucson" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AppDialogBody>
              <AppDialogFooter>
                <Button type="button" variant="outline" onClick={() => setModelDialogOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={modelForm.formState.isSubmitting}>
                  {modelForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingModel ? 'Хадгалах' : 'Нэмэх'}
                </Button>
              </AppDialogFooter>
            </form>
          </Form>
        </AppDialogContent>
      </AppDialog>

      {/* Type dialog */}
      <AppDialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <AppDialogContent size="md" showClose>
          <AppDialogHeader>
            <AppDialogTitle>
              {editingType ? 'Машины төрөл засах' : 'Шинэ машины төрөл нэмэх'}
            </AppDialogTitle>
            <AppDialogDescription>
              Машины төрлийн нэрийг оруулна уу (жишээ: Хүнд даацын, Цистерн).
            </AppDialogDescription>
          </AppDialogHeader>
          <Form {...typeForm}>
            <form onSubmit={typeForm.handleSubmit(onTypeSubmit)}>
              <AppDialogBody className="space-y-4">
                <FormField
                  control={typeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр *</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: Хүнд даацын" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AppDialogBody>
              <AppDialogFooter>
                <Button type="button" variant="outline" onClick={() => setTypeDialogOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={typeForm.formState.isSubmitting}>
                  {typeForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingType ? 'Хадгалах' : 'Нэмэх'}
                </Button>
              </AppDialogFooter>
            </form>
          </Form>
        </AppDialogContent>
      </AppDialog>

      {/* Trailer type dialog */}
      <AppDialog open={trailerTypeDialogOpen} onOpenChange={setTrailerTypeDialogOpen}>
        <AppDialogContent size="md" showClose>
          <AppDialogHeader>
            <AppDialogTitle>
              {editingTrailerType ? 'Тэвшний төрөл засах' : 'Шинэ тэвшний төрөл нэмэх'}
            </AppDialogTitle>
            <AppDialogDescription>
              Тэвшний төрлийн нэрийг оруулна уу (жишээ: Хагас чиргүүл, Бүтэн чиргүүл).
            </AppDialogDescription>
          </AppDialogHeader>
          <Form {...trailerTypeForm}>
            <form onSubmit={trailerTypeForm.handleSubmit(onTrailerTypeSubmit)}>
              <AppDialogBody className="space-y-4">
                <FormField
                  control={trailerTypeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр *</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: Хагас чиргүүл" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AppDialogBody>
              <AppDialogFooter>
                <Button type="button" variant="outline" onClick={() => setTrailerTypeDialogOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={trailerTypeForm.formState.isSubmitting}>
                  {trailerTypeForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingTrailerType ? 'Хадгалах' : 'Нэмэх'}
                </Button>
              </AppDialogFooter>
            </form>
          </Form>
        </AppDialogContent>
      </AppDialog>

      {/* Region dialog */}
      <AppDialog open={regionDialogOpen} onOpenChange={setRegionDialogOpen}>
        <AppDialogContent size="md" showClose>
          <AppDialogHeader>
            <AppDialogTitle>
              {editingRegion ? 'Бүс нутаг засах' : 'Шинэ бүс нутаг нэмэх'}
            </AppDialogTitle>
            <AppDialogDescription>
              Бүс нутагын нэрийг оруулна уу (жишээ: Улаанбаатар, Дорноговь).
            </AppDialogDescription>
          </AppDialogHeader>
          <Form {...regionForm}>
            <form onSubmit={regionForm.handleSubmit(onRegionSubmit)}>
              <AppDialogBody className="space-y-4">
                <FormField
                  control={regionForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр *</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: Улаанбаатар" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AppDialogBody>
              <AppDialogFooter>
                <Button type="button" variant="outline" onClick={() => setRegionDialogOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={regionForm.formState.isSubmitting}>
                  {regionForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRegion ? 'Хадгалах' : 'Нэмэх'}
                </Button>
              </AppDialogFooter>
            </form>
          </Form>
        </AppDialogContent>
      </AppDialog>

      {/* Industry dialog */}
      <AppDialog open={industryDialogOpen} onOpenChange={setIndustryDialogOpen}>
        <AppDialogContent size="md" showClose>
          <AppDialogHeader>
            <AppDialogTitle>
              {editingIndustry ? 'Үйл ажиллагааны чиглэл засах' : 'Шинэ үйл ажиллагааны чиглэл нэмэх'}
            </AppDialogTitle>
            <AppDialogDescription>
              Үйл ажиллагааны чиглэлийн нэрийг оруулна уу (жишээ: Худалдаа, Үйлдвэрлэл).
            </AppDialogDescription>
          </AppDialogHeader>
          <Form {...industryForm}>
            <form onSubmit={industryForm.handleSubmit(onIndustrySubmit)}>
              <AppDialogBody className="space-y-4">
                <FormField
                  control={industryForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр *</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: Худалдаа" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AppDialogBody>
              <AppDialogFooter>
                <Button type="button" variant="outline" onClick={() => setIndustryDialogOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={industryForm.formState.isSubmitting}>
                  {industryForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingIndustry ? 'Хадгалах' : 'Нэмэх'}
                </Button>
              </AppDialogFooter>
            </form>
          </Form>
        </AppDialogContent>
      </AppDialog>

      {/* Packaging type dialog */}
      <AppDialog open={packagingTypeDialogOpen} onOpenChange={setPackagingTypeDialogOpen}>
        <AppDialogContent size="md" showClose>
          <AppDialogHeader>
            <AppDialogTitle>
              {editingPackagingType ? 'Багцлалтын төрөл засах' : 'Шинэ багцлалтын төрөл нэмэх'}
            </AppDialogTitle>
            <AppDialogDescription>
              Багцлалтын төрлийн нэрийг оруулна уу (жишээ: Хайрцаг, Уут, Паллет).
            </AppDialogDescription>
          </AppDialogHeader>
          <Form {...packagingTypeForm}>
            <form onSubmit={packagingTypeForm.handleSubmit(onPackagingTypeSubmit)}>
              <AppDialogBody className="space-y-4">
                <FormField
                  control={packagingTypeForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр *</FormLabel>
                      <FormControl>
                        <Input placeholder="Жишээ: Хайрцаг" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AppDialogBody>
              <AppDialogFooter>
                <Button type="button" variant="outline" onClick={() => setPackagingTypeDialogOpen(false)}>
                  Цуцлах
                </Button>
                <Button type="submit" disabled={packagingTypeForm.formState.isSubmitting}>
                  {packagingTypeForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingPackagingType ? 'Хадгалах' : 'Нэмэх'}
                </Button>
              </AppDialogFooter>
            </form>
          </Form>
        </AppDialogContent>
      </AppDialog>

      {/* Delete make */}
      <AlertDialog open={!!deleteMakeId} onOpenChange={(open) => !open && setDeleteMakeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Үйлдвэрлэгчийг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдвэрлэгчтэй холбоотой загварууд үлдэнэ, гэхдээ үйлдвэрлэгч лавлахаас устгагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMake}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete model */}
      <AlertDialog open={!!deleteModelId} onOpenChange={(open) => !open && setDeleteModelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Загварыг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ загварын бүртгэл устгагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete type */}
      <AlertDialog open={!!deleteTypeId} onOpenChange={(open) => !open && setDeleteTypeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Машины төрлийг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ төрлийн бүртгэл устгагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteType}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete trailer type */}
      <AlertDialog open={!!deleteTrailerTypeId} onOpenChange={(open) => !open && setDeleteTrailerTypeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Тэвшний төрлийг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ төрлийн бүртгэл устгагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrailerType}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete region */}
      <AlertDialog open={!!deleteRegionId} onOpenChange={(open) => !open && setDeleteRegionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Бүс нутагыг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ бүс нутагийн бүртгэл устгагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRegion}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete industry */}
      <AlertDialog open={!!deleteIndustryId} onOpenChange={(open) => !open && setDeleteIndustryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Үйл ажиллагааны чиглэлийг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ чиглэлийн бүртгэл устгагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIndustry}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete packaging type */}
      <AlertDialog open={!!deletePackagingTypeId} onOpenChange={(open) => !open && setDeletePackagingTypeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Багцлалтын төрлийг устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ төрлийн бүртгэл устгагдана.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePackagingType}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Устгах'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
