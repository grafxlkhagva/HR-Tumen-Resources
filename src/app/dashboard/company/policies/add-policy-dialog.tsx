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
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Upload, File as FileIcon, Search, Calendar as CalendarIcon } from 'lucide-react';
import { CompanyPolicy, Position } from './types';

const policySchema = z.object({
    title: z.string().min(1, 'Гарчиг хоосон байж болохгүй.'),
    type: z.string().min(1, 'Төрөл сонгоно уу.'),
    effectiveDate: z.string().min(1, 'Батлагдсан огноо сонгоно уу.'),
    description: z.string().optional(),
    documentUrl: z.string().optional(),
    appliesToAll: z.boolean().default(true),
    applicablePositionIds: z.array(z.string()).optional(),
});

export const POLICY_TYPES = [
    "Бодлогын баримт бичиг",
    "Журам",
    "Дүрэм",
    "Аргачлал",
    "Заавар",
    "Бусад"
];

type PolicyFormValues = z.infer<typeof policySchema>;

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
    const [fileName, setFileName] = React.useState<string | null>(null);
    const [posSearch, setPosSearch] = React.useState('');

    const policiesCollectionRef = React.useMemo(
        () => (firestore ? collection(firestore, 'companyPolicies') : null),
        [firestore]
    );

    const form = useForm<PolicyFormValues>({
        resolver: zodResolver(policySchema),
    });

    React.useEffect(() => {
        if (open) {
            if (isEditMode && editingPolicy) {
                form.reset({
                    title: editingPolicy.title,
                    type: editingPolicy.type || '',
                    effectiveDate: editingPolicy.effectiveDate || '',
                    description: editingPolicy.description || '',
                    documentUrl: editingPolicy.documentUrl,
                    appliesToAll: editingPolicy.appliesToAll || false,
                    applicablePositionIds: editingPolicy.applicablePositionIds || [],
                });
                if (editingPolicy.documentUrl) {
                    const urlParts = editingPolicy.documentUrl.split('?')[0].split('%2F');
                    setFileName(decodeURIComponent(urlParts[urlParts.length - 1]));
                }
            } else {
                form.reset({
                    title: '',
                    type: '',
                    effectiveDate: '',
                    description: '',
                    documentUrl: '',
                    appliesToAll: true,
                    applicablePositionIds: [],
                });
                setFileName(null);
            }
        }
    }, [open, editingPolicy, isEditMode, form]);

    const { isSubmitting } = form.formState;

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setFileName(file.name);
        const storage = getStorage();
        const storageRef = ref(storage, `company-policies/${Date.now()}-${file.name}`);

        try {
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            form.setValue('documentUrl', downloadURL, { shouldValidate: true });
            toast({ title: 'Файл амжилттай байршлаа.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Файл байршуулахад алдаа гарлаа.' });
        } finally {
            setIsUploading(false);
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
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Төрөл</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Төрөл сонгох" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {POLICY_TYPES.map(type => (
                                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="effectiveDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Батлагдсан огноо</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                    <Input type="date" className="pl-9" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Тайлбар</FormLabel><FormControl><Textarea placeholder="Энэ журам юуны тухай болох талаар товч тайлбар..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormItem>
                                <FormLabel>Баримт бичиг</FormLabel>
                                <Button type="button" variant="outline" className="w-full" onClick={() => (document.getElementById('policy-file-upload') as HTMLInputElement)?.click()} disabled={isUploading}>
                                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    Файл сонгох
                                </Button>
                                <Input id="policy-file-upload" type="file" className="hidden" onChange={handleFileUpload} />
                                {fileName && (
                                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                                        <FileIcon className="h-4 w-4" /> {fileName}
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
                                                    <div className="p-2 sticky top-0 bg-popover z-10">
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                placeholder="Хайх..."
                                                                className="pl-9 h-9"
                                                                value={posSearch}
                                                                onChange={(e) => setPosSearch(e.target.value)}
                                                                onKeyDown={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                    <DropdownMenuSeparator />
                                                    <div className="max-h-[250px] overflow-y-auto pointer-events-auto">
                                                        {filteredPositions.length === 0 ? (
                                                            <div className="py-4 px-2 text-center text-sm text-muted-foreground">
                                                                Ажлын байр олдсонгүй
                                                            </div>
                                                        ) : (
                                                            filteredPositions.map(pos => (
                                                                <DropdownMenuCheckboxItem
                                                                    key={pos.id}
                                                                    checked={field.value?.includes(pos.id)}
                                                                    onSelect={(e) => e.preventDefault()}
                                                                    onCheckedChange={(checked) => {
                                                                        const currentValues = field.value || [];
                                                                        const newValues = checked
                                                                            ? [...currentValues, pos.id]
                                                                            : currentValues.filter((id) => id !== pos.id);
                                                                        field.onChange(newValues);
                                                                    }}
                                                                >
                                                                    {pos.title}
                                                                </DropdownMenuCheckboxItem>
                                                            ))
                                                        )}
                                                    </div>
                                                    <DropdownMenuSeparator />
                                                    <div className="p-1">
                                                        <DropdownMenuItem
                                                            className="w-full justify-center text-xs h-8 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer focus:bg-primary/10 focus:text-primary"
                                                        >
                                                            Сонгож дууссан
                                                        </DropdownMenuItem>
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
                            <Button type="submit" disabled={isSubmitting || isUploading}>
                                {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Хадгалах
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
