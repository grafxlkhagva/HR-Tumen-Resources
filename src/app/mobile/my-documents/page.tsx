'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, Loader2, File as FileIcon, X, Trash2, ExternalLink, Plus, FolderOpen, AlertCircle } from 'lucide-react';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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

class MyDocumentsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6">
          <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Алдаа гарлаа</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Хуудсыг дахин ачаалж үзнэ үү</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Дахин ачаалах
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MyDocumentsPage() {
  return (
    <MyDocumentsErrorBoundary>
      <MyDocumentsContent />
    </MyDocumentsErrorBoundary>
  );
}

function MyDocumentsContent() {
  const router = useRouter();
  const { employeeProfile, isProfileLoading, user, isUserLoading } = useEmployeeProfile();
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();

  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [documentType, setDocumentType] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = React.useState<any>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const employeeId = user?.uid;

  const documentsQuery = useMemoFirebase(
    () =>
      firestore && employeeId
        ? query(
            collection(firestore, 'documents'),
            where('metadata.employeeId', '==', employeeId),
            orderBy('uploadDate', 'desc')
          )
        : null,
    [firestore, employeeId]
  );

  const { data: documents, isLoading: isLoadingDocs, error: docsError } = useCollection<any>(documentsQuery as any);

  const docTypesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'er_document_types') : null),
    [firestore]
  );
  const { data: documentTypes } = useCollection<any>(docTypesQuery);

  const legacyDocTypesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'documentTypes') : null),
    [firestore]
  );
  const { data: legacyDocumentTypes } = useCollection<any>(legacyDocTypesQuery);

  const mergedDocumentTypes = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const t of documentTypes || []) {
      const name = String(t?.name || '').trim();
      if (!name) continue;
      map.set(name, { ...t, name });
    }
    for (const t of legacyDocumentTypes || []) {
      const name = String(t?.name || '').trim();
      if (!name) continue;
      if (!map.has(name)) map.set(name, { ...t, name });
    }
    return Array.from(map.values());
  }, [documentTypes, legacyDocumentTypes]);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        const fileName = file.name.split('.').slice(0, -1).join('.');
        setTitle(documentType ? `${documentType} - ${fileName}` : fileName);
      }
    }
  };

  const handleTypeChange = (val: string) => {
    setDocumentType(val);
    if (selectedFile && !title) {
      const fileName = selectedFile.name.split('.').slice(0, -1).join('.');
      setTitle(`${val} - ${fileName}`);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setDocumentType('');
    setTitle('');
    setIsUploadOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile || !storage || !firestore || !employeeId) return;

    if (!documentType) {
      toast({ variant: 'destructive', title: 'Баримтын төрөл сонгоно уу' });
      return;
    }
    if (!title.trim()) {
      toast({ variant: 'destructive', title: 'Баримтын нэр оруулна уу' });
      return;
    }

    setIsUploading(true);
    try {
      const uniqueFileName = `${Date.now()}-${selectedFile.name}`;
      const storageRef = ref(storage, `documents/${employeeId}/${uniqueFileName}`);
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      await addDocumentNonBlocking(collection(firestore, 'documents'), {
        title: title.trim(),
        description: 'Ажилтан өөрөө байршуулсан',
        url: downloadURL,
        uploadDate: new Date().toISOString(),
        documentType,
        metadata: {
          employeeId,
          uploadedBy: 'employee',
          storagePath: `documents/${employeeId}/${uniqueFileName}`,
        },
      });

      toast({ title: 'Амжилттай байршуулагдлаа' });
      resetUploadForm();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Байршуулахад алдаа гарлаа',
        description: (error as Error).message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !firestore) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.metadata?.storagePath && storage) {
        try {
          await deleteObject(ref(storage, deleteTarget.metadata.storagePath));
        } catch (_) { /* storage file may already be gone */ }
      }
      await deleteDoc(doc(firestore, 'documents', deleteTarget.id));
      toast({ title: 'Баримт бичиг устгагдлаа' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Устгахад алдаа гарлаа',
        description: (error as Error).message,
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="p-6 space-y-4 bg-slate-50 min-h-screen">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col pb-24">
      {/* Header */}
      <div className="bg-white pt-12 pb-4 shadow-sm border-b border-slate-100 px-6 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900">Миний бичиг баримт</h1>
            <p className="text-xs text-slate-400">
              {documents ? `${documents.length} баримт` : 'Ачаалж байна...'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-1.5 h-9 px-3"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs font-semibold">Нэмэх</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 px-6 pt-4 space-y-3">
        {/* Upload section (expandable) */}
        {isUploadOpen && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Шинэ баримт байршуулах</h3>
              <button onClick={resetUploadForm} className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
            />

            {!selectedFile ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-28 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all active:scale-[0.98]"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-indigo-500" />
                </div>
                <span className="text-xs font-semibold text-slate-400">Файл сонгох</span>
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shrink-0">
                    <FileIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{selectedFile.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <Select value={documentType} onValueChange={handleTypeChange}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Баримтын төрөл сонгох..." />
              </SelectTrigger>
              <SelectContent>
                {mergedDocumentTypes?.some((t: any) => t.isMandatory) && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 px-2 py-1">
                      Заавал бүрдүүлэх
                    </SelectLabel>
                    {mergedDocumentTypes.filter((t: any) => t.isMandatory).map((type: any, idx: number) => (
                      <SelectItem key={`mandatory-${type.id}-${idx}`} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                <SelectGroup>
                  <SelectLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1">
                    Бусад
                  </SelectLabel>
                  {mergedDocumentTypes?.filter((t: any) => !t.isMandatory).map((type: any, idx: number) => (
                    <SelectItem key={`other-${type.id}-${idx}`} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Баримтын нэр"
              className="rounded-xl"
            />

            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile || !documentType || !title.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-11 font-semibold"
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Байршуулах
            </Button>
          </div>
        )}

        {/* Documents list */}
        {isLoadingDocs ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : docsError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-300" />
            </div>
            <p className="text-sm font-semibold text-red-500">Мэдээлэл ачаалахад алдаа гарлаа</p>
            <p className="text-xs text-slate-400 mt-1">Дахин оролдож үзнэ үү</p>
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((docItem: any) => {
              let dateStr = '';
              try {
                if (docItem.uploadDate) {
                  dateStr = new Date(docItem.uploadDate).toLocaleDateString();
                }
              } catch (_) { /* ignore date parse errors */ }

              return (
                <div
                  key={docItem.id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{docItem.title || 'Баримт бичиг'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {docItem.documentType && (
                          <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5">
                            {docItem.documentType}
                          </Badge>
                        )}
                        {dateStr && (
                          <span className="text-[10px] text-slate-400">{dateStr}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {docItem.url && (
                        <a
                          href={docItem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {docItem.metadata?.uploadedBy === 'employee' && (
                        <button
                          onClick={() => setDeleteTarget(docItem)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Бичиг баримт байхгүй</p>
            <p className="text-xs text-slate-400 mt-1">
              Шинэ баримт байршуулахын тулд дээрх &quot;Нэмэх&quot; товчлуурыг дарна уу
            </p>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Баримт бичиг устгах</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> баримтыг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
