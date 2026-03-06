'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/patterns/page-layout';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ChevronLeft, Building2, Plus, Loader2, Pencil, Trash2, X, Check, Hash, Upload, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
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

const ACCEPTED_LOGO_TYPES = 'image/jpeg,image/png,image/webp,image/svg+xml';

interface Subsidiary {
    name: string;
    registrationNumber?: string;
    logoUrl?: string;
}

interface CompanyProfile {
    subsidiaries?: Subsidiary[];
}

function slug(s: string) {
    return s.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '-').replace(/-+/g, '-').slice(0, 30) || 'logo';
}

/** Firestore does not accept undefined; remove undefined fields. */
function subsidiaryToFirestore(item: Subsidiary): Record<string, unknown> {
    const out: Record<string, unknown> = { name: item.name };
    if (item.registrationNumber != null && item.registrationNumber !== '') out.registrationNumber = item.registrationNumber;
    if (item.logoUrl != null && item.logoUrl !== '') out.logoUrl = item.logoUrl;
    return out;
}

function SubsidiaryLogoOrIcon({ logoUrl, name }: { logoUrl?: string; name: string }) {
    const [showIcon, setShowIcon] = React.useState(false);
    const effectiveShowLogo = logoUrl && !showIcon;
    return (
        <div className="h-10 w-10 rounded-lg bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
            {effectiveShowLogo ? (
                <img
                    src={logoUrl}
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={() => setShowIcon(true)}
                />
            ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
            )}
        </div>
    );
}

export default function SubsidiariesPage() {
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();
    
    const companyProfileRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'company', 'profile') : null),
        [firestore]
    );
    
    const { data: companyProfile, isLoading } = useDoc<CompanyProfile>(companyProfileRef as any);
    
    const [newName, setNewName] = React.useState('');
    const [newRegNumber, setNewRegNumber] = React.useState('');
    const [newLogoUrl, setNewLogoUrl] = React.useState<string | null>(null);
    const [isAdding, setIsAdding] = React.useState(false);
    const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
    const [editingName, setEditingName] = React.useState('');
    const [editingRegNumber, setEditingRegNumber] = React.useState('');
    const [editingLogoUrl, setEditingLogoUrl] = React.useState<string | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<Subsidiary | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
    const addLogoInputRef = React.useRef<HTMLInputElement>(null);
    const editLogoInputRef = React.useRef<HTMLInputElement>(null);

    const subsidiaries: Subsidiary[] = React.useMemo(() => {
        if (!companyProfile?.subsidiaries) return [];
        return companyProfile.subsidiaries.map(item => {
            if (typeof item === 'string') {
                return { name: item, registrationNumber: '', logoUrl: undefined };
            }
            return { ...item, logoUrl: (item as Subsidiary).logoUrl } as Subsidiary;
        });
    }, [companyProfile?.subsidiaries]);

    const uploadLogo = React.useCallback(
        async (file: File): Promise<string> => {
            if (!storage) throw new Error('Storage not available');
            const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
            const path = `company-assets/subsidiaries/${Date.now()}-${slug(file.name)}.${ext}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
        },
        [storage]
    );

    const handleAddLogoSelect = React.useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !file.type.startsWith('image/')) return;
            e.target.value = '';
            setIsUploadingLogo(true);
            try {
                const url = await uploadLogo(file);
                setNewLogoUrl(url);
                toast({ title: 'Лого орууллаа' });
            } catch {
                toast({ variant: 'destructive', title: 'Лого оруулахад алдаа гарлаа' });
            } finally {
                setIsUploadingLogo(false);
            }
        },
        [uploadLogo, toast]
    );

    const handleEditLogoSelect = React.useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file || !file.type.startsWith('image/')) return;
            e.target.value = '';
            setIsUploadingLogo(true);
            try {
                const url = await uploadLogo(file);
                setEditingLogoUrl(url);
                toast({ title: 'Лого солигдлоо' });
            } catch {
                toast({ variant: 'destructive', title: 'Лого оруулахад алдаа гарлаа' });
            } finally {
                setIsUploadingLogo(false);
            }
        },
        [uploadLogo, toast]
    );

    const handleAdd = async () => {
        if (!companyProfileRef || !newName.trim()) return;
        
        if (subsidiaries.some(s => s.name === newName.trim())) {
            toast({ variant: 'destructive', title: 'Аль хэдийн бүртгэгдсэн байна' });
            return;
        }
        
        setIsAdding(true);
        try {
            const newSubsidiary: Subsidiary = {
                name: newName.trim(),
                registrationNumber: newRegNumber.trim() || undefined,
                logoUrl: newLogoUrl ?? undefined
            };
            
            await updateDoc(companyProfileRef, {
                subsidiaries: [...subsidiaries.map(subsidiaryToFirestore), subsidiaryToFirestore(newSubsidiary)]
            });
            setNewName('');
            setNewRegNumber('');
            setNewLogoUrl(null);
            toast({ title: 'Охин компани нэмэгдлээ' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
            toast({ variant: 'destructive', title: 'Алдаа', description: message });
        } finally {
            setIsAdding(false);
        }
    };

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditingName(subsidiaries[index].name);
        setEditingRegNumber(subsidiaries[index].registrationNumber || '');
        setEditingLogoUrl(subsidiaries[index].logoUrl ?? null);
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        setEditingName('');
        setEditingRegNumber('');
        setEditingLogoUrl(null);
    };

    const handleSaveEdit = async () => {
        if (!companyProfileRef || editingIndex === null || !editingName.trim()) return;
        
        const oldItem = subsidiaries[editingIndex];
        const newItem: Subsidiary = {
            name: editingName.trim(),
            registrationNumber: editingRegNumber.trim() || undefined,
            logoUrl: editingLogoUrl ?? oldItem.logoUrl ?? undefined
        };
        
        const logoUnchanged = (oldItem.logoUrl ?? '') === (newItem.logoUrl ?? '');
        if (oldItem.name === newItem.name && oldItem.registrationNumber === newItem.registrationNumber && logoUnchanged) {
            handleCancelEdit();
            return;
        }
        
        // Check for duplicate name (excluding current item)
        if (subsidiaries.some((s, i) => i !== editingIndex && s.name === newItem.name)) {
            toast({ variant: 'destructive', title: 'Аль хэдийн бүртгэгдсэн байна' });
            return;
        }
        
        setIsSaving(true);
        try {
            const newSubsidiaries = [...subsidiaries];
            newSubsidiaries[editingIndex] = newItem;
            
            await updateDoc(companyProfileRef, {
                subsidiaries: newSubsidiaries.map(subsidiaryToFirestore)
            });
            toast({ title: 'Засвар хадгалагдлаа' });
            handleCancelEdit();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
            toast({ variant: 'destructive', title: 'Алдаа', description: message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!companyProfileRef || !deleteTarget) return;
        
        setIsDeleting(true);
        try {
            const newSubsidiaries = subsidiaries.filter(s => s.name !== deleteTarget.name);
            
            await updateDoc(companyProfileRef, {
                subsidiaries: newSubsidiaries.map(subsidiaryToFirestore)
            });
            toast({ title: 'Охин компани устгагдлаа' });
            setDeleteTarget(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Алдаа гарлаа';
            toast({ variant: 'destructive', title: 'Алдаа', description: message });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20">
                <div className="px-6 md:px-8 py-4">
                    <PageHeader
                        title="Охин компаниуд"
                        description={`${subsidiaries.length} бүртгэлтэй`}
                        showBackButton
                        hideBreadcrumbs
                        backButtonPlacement="inline"
                        backBehavior="history"
                        fallbackBackHref="/dashboard/company"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-8 pb-32 max-w-2xl">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Add new */}
                            <div className="bg-white rounded-xl border p-4">
                                <h3 className="text-sm font-medium mb-4">Шинэ охин компани нэмэх</h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Компанийн нэр *</Label>
                                            <Input
                                                placeholder="Компанийн нэр"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Регистрийн дугаар</Label>
                                            <Input
                                                placeholder="1234567"
                                                value={newRegNumber}
                                                onChange={(e) => setNewRegNumber(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Лого</Label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                ref={addLogoInputRef}
                                                type="file"
                                                accept={ACCEPTED_LOGO_TYPES}
                                                className="hidden"
                                                onChange={handleAddLogoSelect}
                                                            />
                                            {newLogoUrl ? (
                                                <div className="relative h-14 w-14 rounded-lg border bg-muted overflow-hidden shrink-0">
                                                    <img src={newLogoUrl} alt="" className="h-full w-full object-contain" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewLogoUrl(null)}
                                                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="h-14 w-14 rounded-lg border border-dashed bg-muted flex items-center justify-center shrink-0">
                                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                            )}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!storage || isUploadingLogo}
                                                onClick={() => addLogoInputRef.current?.click()}
                                            >
                                                {isUploadingLogo ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <Upload className="h-4 w-4 mr-2" />
                                                )}
                                                {newLogoUrl ? 'Солих' : 'Лого оруулах'}
                                            </Button>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleAdd}
                                        disabled={isAdding || !newName.trim()}
                                        className="w-full sm:w-auto"
                                    >
                                        {isAdding ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Plus className="h-4 w-4 mr-2" />
                                        )}
                                        Нэмэх
                                    </Button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="bg-white rounded-xl border">
                                <div className="p-4 border-b">
                                    <h3 className="font-medium">Бүртгэлтэй охин компаниуд</h3>
                                </div>
                                
                                {subsidiaries.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                            <Building2 className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Охин компани бүртгэгдээгүй байна
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {subsidiaries.map((item, index) => (
                                            <div key={index} className="p-4">
                                                {editingIndex === index ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">Компанийн нэр</Label>
                                                                <Input
                                                                    value={editingName}
                                                                    onChange={(e) => setEditingName(e.target.value)}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs text-muted-foreground">Регистрийн дугаар</Label>
                                                                <Input
                                                                    value={editingRegNumber}
                                                                    onChange={(e) => setEditingRegNumber(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') handleSaveEdit();
                                                                        if (e.key === 'Escape') handleCancelEdit();
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">Лого</Label>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    ref={editLogoInputRef}
                                                                    type="file"
                                                                    accept={ACCEPTED_LOGO_TYPES}
                                                                    className="hidden"
                                                                    onChange={handleEditLogoSelect}
                                                                />
                                                                {(editingLogoUrl ?? item.logoUrl) ? (
                                                                    <div className="relative h-14 w-14 rounded-lg border bg-muted overflow-hidden shrink-0">
                                                                        <img src={editingLogoUrl ?? item.logoUrl ?? ''} alt="" className="h-full w-full object-contain" />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingLogoUrl(null)}
                                                                            className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-14 w-14 rounded-lg border border-dashed bg-muted flex items-center justify-center shrink-0">
                                                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={!storage || isUploadingLogo}
                                                                    onClick={() => editLogoInputRef.current?.click()}
                                                                >
                                                                    {isUploadingLogo ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                    ) : (
                                                                        <Upload className="h-4 w-4 mr-2" />
                                                                    )}
                                                                    {(editingLogoUrl ?? item.logoUrl) ? 'Лого солих' : 'Лого оруулах'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                onClick={handleSaveEdit}
                                                                disabled={isSaving || !editingName.trim()}
                                                            >
                                                                {isSaving ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                ) : (
                                                                    <Check className="h-4 w-4 mr-2" />
                                                                )}
                                                                Хадгалах
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={handleCancelEdit}
                                                            >
                                                                Болих
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-3">
                                                            <SubsidiaryLogoOrIcon logoUrl={item.logoUrl} name={item.name} />
                                                            <div>
                                                                <p className="font-medium">{item.name}</p>
                                                                {item.registrationNumber && (
                                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                        <Hash className="h-3 w-3" />
                                                                        {item.registrationNumber}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8"
                                                                onClick={() => handleEdit(index)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                                onClick={() => setDeleteTarget(item)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Охин компани устгах</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{deleteTarget?.name}" охин компанийг устгахдаа итгэлтэй байна уу?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Устгах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
