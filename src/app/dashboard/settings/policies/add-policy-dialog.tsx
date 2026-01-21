
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Upload, File as FileIcon, Search, Video } from 'lucide-react';
import type { CompanyPolicy } from './page';

const policySchema = z.object({
  title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
  description: z.string().optional(),
  documentUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  appliesToAll: z.boolean().default(true),
  applicablePositionIds: z.array(z.string()).optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface Position {
  id: string;
  title: string;
}

interface AddPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPolicy?: CompanyPolicy | null;
  positions: Position[];
}

export function AddPolicyDialog({
  open,
  onOpenChange,
  editingPolicy,
  positions,
}: AddPolicyDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isEditMode = !!editingPolicy;
  const [isUploading, setIsUploading] = React.useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [videoFileName, setVideoFileName] = React.useState<string | null>(null);
  const [posSearch, setPosSearch] = React.useState('');

  const policiesCollectionRef = React.useMemo(
    () => (firestore ? collection(firestore, 'companyPolicies') : null),
    [firestore]
  );

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      title: '',
      description: '',
      documentUrl: '',
      videoUrl: '',
      appliesToAll: true,
      applicablePositionIds: [],
    }
  });

  React.useEffect(() => {
    if (open) {
      if (isEditMode && editingPolicy) {
        form.reset({
          title: editingPolicy.title,
          description: editingPolicy.description || '',
          documentUrl: editingPolicy.documentUrl || '',
          videoUrl: editingPolicy.videoUrl || '',
          appliesToAll: editingPolicy.appliesToAll || false,
          applicablePositionIds: editingPolicy.applicablePositionIds || [],
        });
        if (editingPolicy.documentUrl) {
          try {
            const urlParts = editingPolicy.documentUrl.split('?')[0].split('%2F');
            setFileName(decodeURIComponent(urlParts[urlParts.length - 1]));
          } catch (e) {
            setFileName(editingPolicy.documentUrl.split('/').pop() || 'File');
          }
        } else {
          setFileName(null);
        }

        if (editingPolicy.videoUrl) {
          try {
            const videoUrlParts = editingPolicy.videoUrl.split('?')[0].split('%2F');
            setVideoFileName(decodeURIComponent(videoUrlParts[videoUrlParts.length - 1]));
          } catch (e) {
            setVideoFileName(editingPolicy.videoUrl.split('/').pop() || 'Video');
          }
        } else {
          setVideoFileName(null);
        }
      } else {
        form.reset({
          title: '',
          description: '',
          documentUrl: '',
          videoUrl: '',
          appliesToAll: true,
          applicablePositionIds: [],
        });
        setFileName(null);
        setVideoFileName(null);
      }
    }
  }, [open, editingPolicy, isEditMode, form]);

  const { isSubmitting } = form.formState;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const storage = getStorage();
    const storageRef = ref(storage, `company-policies/${Date.now()}-${file.name}`);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      form.setValue('documentUrl', downloadURL, { shouldValidate: true });
      setFileName(file.name);
      toast({ title: 'Баримт амжилттай байршлаа.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Баримт байршуулахад алдаа гарлаа.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    const storage = getStorage();
    const storageRef = ref(storage, `company-policies/videos/${Date.now()}-${file.name}`);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      form.setValue('videoUrl', downloadURL, { shouldValidate: true });
      setVideoFileName(file.name);
      toast({ title: 'Видео амжилттай байршлаа.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Алдаа', description: 'Видео байршуулахад алдаа гарлаа.' });
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const onSubmit = (data: PolicyFormValues) => {
    if (!policiesCollectionRef || !firestore) return;

    const finalData = {
      ...data,
      uploadDate: new Date().toISOString(),
    };

    if (isEditMode && editingPolicy) {
      const docRef = doc(firestore, 'companyPolicies', editingPolicy.id);
      updateDocumentNonBlocking(docRef, finalData);
      toast({ title: 'Амжилттай шинэчлэгдлээ' });
    } else {
      addDocumentNonBlocking(policiesCollectionRef, finalData);
      toast({ title: 'Шинэ журам амжилттай нэмэгдлээ' });
    }

    onOpenChange(false);
  };

  const appliesToAll = form.watch('appliesToAll');

  const filteredPositions = React.useMemo(() => {
    if (!positions) return [];
    return positions.filter(p => p.title.toLowerCase().includes(posSearch.toLowerCase()));
  }, [positions, posSearch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Журам засах' : 'Шинэ журам нэмэх'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Гарчиг</FormLabel><FormControl><Input placeholder="Жишээ нь: Дотоод журам" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Textarea placeholder="Энэ журам юуны тухай болох талаар товч тайлбар..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormItem>
                <FormLabel>Баримт бичиг</FormLabel>
                <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('policy-file-upload')?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Баримт сонгох
                </Button>
                <Input id="policy-file-upload" type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileUpload} />
                {fileName && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                    <FileIcon className="h-4 w-4" /> {fileName}
                  </div>
                )}
              </FormItem>
              <FormItem>
                <FormLabel>Видео танилцуулга (заавал биш)</FormLabel>
                <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('policy-video-upload')?.click()} disabled={isUploadingVideo}>
                  {isUploadingVideo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                  Видео сонгох
                </Button>
                <Input id="policy-video-upload" type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} />
                {videoFileName && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                    <Video className="h-4 w-4" /> {videoFileName}
                  </div>
                )}
              </FormItem>
              <FormField control={form.control} name="appliesToAll" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Бүх ажилтанд хамааралтай эсэх</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
              {!appliesToAll && (
                <FormField
                  control={form.control}
                  name="applicablePositionIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Хамааралтай ажлын байр</FormLabel>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-start font-normal">
                            {field.value && field.value.length > 0 ? `${field.value.length} ажлын байр сонгосон` : "Ажлын байр сонгох..."}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                          <div className="p-2 relative sticky top-0 bg-popover z-10">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Хайх..."
                              className="pl-8"
                              value={posSearch}
                              onChange={(e) => setPosSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          <DropdownMenuSeparator />
                          <div className="max-h-[250px] overflow-y-auto">
                            {filteredPositions.map(pos => (
                              <DropdownMenuCheckboxItem
                                key={pos.id}
                                checked={!!field.value?.includes(pos.id)}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={(checked) => {
                                  const currentValues = field.value || [];
                                  return checked
                                    ? field.onChange([...currentValues, pos.id])
                                    : field.onChange(currentValues.filter((id) => id !== pos.id))
                                }}
                              >
                                {pos.title}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Цуцлах</Button>
              <Button type="submit" disabled={isSubmitting || isUploading || isUploadingVideo}>
                {(isSubmitting || isUploading || isUploadingVideo) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Хадгалах
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

