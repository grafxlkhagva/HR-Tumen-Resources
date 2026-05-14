'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantWrite, useFirebase } from '@/firebase';
import { useTenant } from '@/contexts/tenant-context';
import { updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Archive, Paperclip, X, FileText, Download, Trash2 } from 'lucide-react';
import { ERDocument } from '../../employment-relations/types';

const HISTORICAL_TYPES = [
    { value: 'appointment_probation', label: 'Туршилтын хугацаагаар томилгоо' },
    { value: 'appointment_permanent', label: 'Үндсэн ажилтан болгосон' },
    { value: 'appointment_reappoint', label: 'Дахин томилгоо' },
    { value: 'salary_change', label: 'Цалин өөрчлөлт' },
    { value: 'position_change', label: 'Албан тушаал өөрчлөлт' },
    { value: 'department_transfer', label: 'Хэлтэс шилжүүлэлт' },
    { value: 'leave', label: 'Чөлөө / Амралт' },
    { value: 'release', label: 'Чөлөөлөлт' },
    { value: 'award', label: 'Шагнал / Урамшуулал' },
    { value: 'penalty', label: 'Сахилгын арга хэмжээ' },
    { value: 'other', label: 'Бусад' },
];

interface SavedAttachment {
    url: string;
    name: string;
    size?: number;
}

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    doc: ERDocument;
    employeeId: string;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EditHistoricalRecordDialog({ open, onOpenChange, doc: erDoc, employeeId }: Props) {
    const { tDoc } = useTenantWrite();
    const { storage } = useFirebase();
    const { companyId } = useTenant();
    const { toast } = useToast();

    const [type, setType] = React.useState('');
    const [date, setDate] = React.useState('');
    const [documentNumber, setDocumentNumber] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [savedAttachments, setSavedAttachments] = React.useState<SavedAttachment[]>([]);
    const [newFiles, setNewFiles] = React.useState<File[]>([]);
    const [isSaving, setIsSaving] = React.useState(false);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Populate form from erDoc on open
    React.useEffect(() => {
        if (!open) return;
        const actionId = typeof erDoc.metadata?.actionId === 'string' ? erDoc.metadata.actionId : '';
        const dateValue = typeof erDoc.customInputs?.['Огноо'] === 'string' ? erDoc.customInputs['Огноо'] : '';
        const noteValue = typeof erDoc.customInputs?.['Тайлбар'] === 'string' ? erDoc.customInputs['Тайлбар'] : '';
        setType(actionId);
        setDate(dateValue);
        setDocumentNumber(erDoc.documentNumber || '');
        setDescription(erDoc.historicalNote || noteValue || '');
        setSavedAttachments((erDoc.attachments as SavedAttachment[] | undefined) || []);
        setNewFiles([]);
        setErrors({});
    }, [open, erDoc]);

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!type) errs.type = 'Төрөл сонгоно уу';
        if (!date) errs.date = 'Огноо оруулна уу';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const uploadNewFiles = async (): Promise<SavedAttachment[]> => {
        if (!storage || !newFiles.length) return [];
        const basePath = companyId
            ? `companies/${companyId}/er_historical/${employeeId}/${erDoc.id}`
            : `er_historical/${employeeId}/${erDoc.id}`;
        return Promise.all(
            newFiles.map(async (file) => {
                const uniqueName = `${Date.now()}-${file.name}`;
                const storageRef = ref(storage, `${basePath}/${uniqueName}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                return { url, name: file.name, size: file.size };
            })
        );
    };

    const handleSave = async () => {
        if (!validate()) return;
        setIsSaving(true);
        try {
            const uploaded = await uploadNewFiles();
            const allAttachments = [...savedAttachments, ...uploaded];
            const typeLabel = HISTORICAL_TYPES.find(t => t.value === type)?.label || type;

            await updateDoc(tDoc('er_documents', erDoc.id), {
                documentNumber: documentNumber || null,
                historicalNote: description || null,
                metadata: {
                    ...erDoc.metadata,
                    actionId: type,
                    templateName: typeLabel,
                },
                customInputs: {
                    ...(erDoc.customInputs || {}),
                    'Огноо': date,
                    ...(description ? { 'Тайлбар': description } : {}),
                },
                attachments: allAttachments,
                updatedAt: new Date(),
            });

            toast({ title: 'Хадгалагдлаа', description: 'Түүхэн бичлэг шинэчлэгдлээ.' });
            onOpenChange(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Алдаа', description: e?.message || 'Хадгалахад алдаа гарлаа.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Archive className="h-4 w-4 text-slate-600" />
                        </div>
                        <DialogTitle>Архивын бичлэг засах</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
                    {/* Type */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Баримтын төрөл *</label>
                        <Select value={type} onValueChange={v => { setType(v); setErrors(p => { const n = { ...p }; delete n.type; return n; }); }}>
                            <SelectTrigger className={cn('h-9', errors.type && 'border-rose-400')}>
                                <SelectValue placeholder="Төрөл сонгох..." />
                            </SelectTrigger>
                            <SelectContent>
                                {HISTORICAL_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.type && <p className="text-[10px] text-rose-500">{errors.type}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Date */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Огноо *</label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => { setDate(e.target.value); setErrors(p => { const n = { ...p }; delete n.date; return n; }); }}
                                className={cn('h-9', errors.date && 'border-rose-400')}
                            />
                            {errors.date && <p className="text-[10px] text-rose-500">{errors.date}</p>}
                        </div>

                        {/* Document number */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Дугаар <span className="normal-case text-slate-400 font-normal">(заавал биш)</span></label>
                            <Input
                                value={documentNumber}
                                onChange={e => setDocumentNumber(e.target.value)}
                                className="h-9"
                                placeholder="А-001/2019"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Тайлбар <span className="normal-case text-slate-400 font-normal">(заавал биш)</span></label>
                        <Textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="h-20 resize-none text-sm"
                            placeholder="Тайлбар..."
                        />
                    </div>

                    {/* Attachments */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Хавсралт файлууд</label>

                        {/* Saved attachments */}
                        {savedAttachments.length > 0 && (
                            <div className="space-y-1.5">
                                {savedAttachments.map((att, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="text-xs text-slate-700 flex-1 truncate">{att.name}</span>
                                        {att.size && <span className="text-[10px] text-slate-400 shrink-0">{formatFileSize(att.size)}</span>}
                                        <a
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-primary transition-colors shrink-0"
                                            title="Татах"
                                        >
                                            <Download className="h-3 w-3" />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setSavedAttachments(prev => prev.filter((_, i) => i !== idx))}
                                            className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                                            title="Устгах"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* New files to upload */}
                        {newFiles.length > 0 && (
                            <div className="space-y-1.5">
                                {newFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                        <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                        <span className="text-xs text-blue-700 flex-1 truncate">{file.name}</span>
                                        <span className="text-[10px] text-blue-400 shrink-0">{formatFileSize(file.size)}</span>
                                        <button
                                            type="button"
                                            onClick={() => setNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                            className="h-5 w-5 flex items-center justify-center text-blue-400 hover:text-rose-500 transition-colors shrink-0"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Drop zone */}
                        <div
                            className="border-2 border-dashed border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                                e.preventDefault();
                                const dropped = Array.from(e.dataTransfer.files);
                                if (dropped.length) setNewFiles(prev => [...prev, ...dropped]);
                            }}
                        >
                            <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-500">Файл нэмэх эсвэл энд чирэх</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={e => {
                                    const selected = Array.from(e.target.files || []);
                                    if (selected.length) setNewFiles(prev => [...prev, ...selected]);
                                    e.target.value = '';
                                }}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Болих</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Хадгалж байна...</> : 'Хадгалах'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
