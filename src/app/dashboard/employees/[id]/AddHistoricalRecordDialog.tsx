'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantWrite, addDocumentNonBlocking, useFirebase } from '@/firebase';
import { useTenant } from '@/contexts/tenant-context';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Loader2, Archive, AlertCircle, Paperclip, X, FileText, Sparkles, PenLine, Upload, CheckCircle2 } from 'lucide-react';

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

interface HistoricalRow {
    id: string;
    type: string;
    date: string;
    documentNumber: string;
    description: string;
    files: File[];
    // AI mode
    sourceFile?: File;
    aiParsed?: boolean;
    aiLoading?: boolean;
    aiError?: string;
}

function emptyRow(): HistoricalRow {
    return {
        id: Math.random().toString(36).slice(2),
        type: '',
        date: '',
        documentNumber: '',
        description: '',
        files: [],
    };
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    employeeId: string;
    employeeName?: string;
}

// ─── AI mode: one card per uploaded document ─────────────────────────────────
interface AiCard {
    id: string;
    file: File;
    status: 'pending' | 'loading' | 'done' | 'error';
    error?: string;
    type: string;
    date: string;
    documentNumber: string;
    description: string;
}

function emptyAiCard(file: File): AiCard {
    return {
        id: Math.random().toString(36).slice(2),
        file,
        status: 'pending',
        type: '',
        date: '',
        documentNumber: '',
        description: '',
    };
}

async function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export function AddHistoricalRecordDialog({ open, onOpenChange, employeeId, employeeName }: Props) {
    const { tCollection } = useTenantWrite();
    const { storage } = useFirebase();
    const { companyId } = useTenant();
    const { toast } = useToast();

    // Mode
    const [mode, setMode] = React.useState<'manual' | 'ai'>('manual');

    // Manual mode state
    const [rows, setRows] = React.useState<HistoricalRow[]>([emptyRow()]);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    // AI mode state
    const [aiCards, setAiCards] = React.useState<AiCard[]>([]);
    const aiFileInputRef = React.useRef<HTMLInputElement>(null);

    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setMode('manual');
            setRows([emptyRow()]);
            setErrors({});
            setAiCards([]);
        }
    }, [open]);

    // ── Manual helpers ────────────────────────────────────────────────────────

    const updateRow = (id: string, field: keyof Omit<HistoricalRow, 'files' | 'id' | 'sourceFile' | 'aiParsed' | 'aiLoading' | 'aiError'>, value: string) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
        setErrors(prev => { const next = { ...prev }; delete next[`${id}-${field}`]; return next; });
    };

    const addFiles = (id: string, newFiles: File[]) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, files: [...r.files, ...newFiles] } : r));
    };

    const removeFile = (rowId: string, fileIdx: number) => {
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, files: r.files.filter((_, i) => i !== fileIdx) } : r));
    };

    const addRow = () => setRows(prev => [...prev, emptyRow()]);

    const removeRow = (id: string) => {
        if (rows.length === 1) return;
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const validateManual = (): boolean => {
        const newErrors: Record<string, string> = {};
        rows.forEach(row => {
            if (!row.type) newErrors[`${row.id}-type`] = 'Төрөл сонгоно уу';
            if (!row.date) newErrors[`${row.id}-date`] = 'Огноо оруулна уу';
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ── AI helpers ────────────────────────────────────────────────────────────

    const parseOneCard = React.useCallback(async (cardId: string, file: File) => {
        setAiCards(prev => prev.map(c => c.id === cardId ? { ...c, status: 'loading' } : c));
        try {
            const dataUrl = await readFileAsDataUrl(file);
            const res = await fetch('/api/parse-historical-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageDataUrl: dataUrl, mimeType: file.type }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'Алдаа гарлаа');
            const d = json.data;
            setAiCards(prev => prev.map(c => c.id === cardId ? {
                ...c,
                status: 'done',
                type: d.type || '',
                date: d.date || '',
                documentNumber: d.documentNumber || '',
                description: d.description || '',
            } : c));
        } catch (e: any) {
            setAiCards(prev => prev.map(c => c.id === cardId ? { ...c, status: 'error', error: e?.message || 'Алдаа гарлаа' } : c));
        }
    }, []);

    const addAiFiles = async (files: File[]) => {
        const newCards = files.map(f => emptyAiCard(f));
        setAiCards(prev => [...prev, ...newCards]);
        // Parse each immediately
        for (const card of newCards) {
            parseOneCard(card.id, card.file);
        }
    };

    const removeAiCard = (id: string) => setAiCards(prev => prev.filter(c => c.id !== id));

    const updateAiCard = (id: string, field: keyof Pick<AiCard, 'type' | 'date' | 'documentNumber' | 'description'>, value: string) => {
        setAiCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    // ── Upload helper ─────────────────────────────────────────────────────────

    const uploadFiles = async (rowId: string, files: File[]): Promise<{ url: string; name: string; size: number }[]> => {
        if (!storage || !files.length) return [];
        const basePath = companyId
            ? `companies/${companyId}/er_historical/${employeeId}/${rowId}`
            : `er_historical/${employeeId}/${rowId}`;
        return Promise.all(files.map(async (file) => {
            const uniqueName = `${Date.now()}-${file.name}`;
            const storageRef = ref(storage, `${basePath}/${uniqueName}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            return { url, name: file.name, size: file.size };
        }));
    };

    // ── Save ──────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (mode === 'manual') {
            if (!validateManual()) return;
            setIsSaving(true);
            try {
                await Promise.all(rows.map(async (row) => {
                    const typeLabel = HISTORICAL_TYPES.find(t => t.value === row.type)?.label || row.type;
                    const attachments = await uploadFiles(row.id, row.files);
                    return addDocumentNonBlocking(tCollection('er_documents'), {
                        employeeId,
                        status: 'HISTORICAL',
                        isHistorical: true,
                        documentNumber: row.documentNumber || null,
                        historicalNote: row.description || null,
                        metadata: { actionId: row.type, templateName: typeLabel },
                        customInputs: {
                            'Огноо': row.date,
                            ...(row.description ? { 'Тайлбар': row.description } : {}),
                        },
                        attachments,
                        content: '',
                        version: 1,
                        history: [],
                        documentTypeId: 'historical',
                        templateId: 'historical',
                        creatorId: 'system',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }));
                toast({ title: 'Амжилттай', description: `${rows.length} бичлэг нэмэгдлээ.` });
                onOpenChange(false);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Алдаа', description: e?.message || 'Хадгалахад алдаа гарлаа.' });
            } finally {
                setIsSaving(false);
            }
        } else {
            // AI mode — save all done cards
            const doneCards = aiCards.filter(c => c.status === 'done' && c.type && c.date);
            if (!doneCards.length) {
                toast({ variant: 'destructive', title: 'Хадгалах зүйл байхгүй', description: 'AI задласан, төрөл болон огноотой бичлэг байхгүй байна.' });
                return;
            }
            setIsSaving(true);
            try {
                await Promise.all(doneCards.map(async (card) => {
                    const typeLabel = HISTORICAL_TYPES.find(t => t.value === card.type)?.label || card.type;
                    const attachments = await uploadFiles(card.id, [card.file]);
                    return addDocumentNonBlocking(tCollection('er_documents'), {
                        employeeId,
                        status: 'HISTORICAL',
                        isHistorical: true,
                        documentNumber: card.documentNumber || null,
                        historicalNote: card.description || null,
                        metadata: { actionId: card.type, templateName: typeLabel },
                        customInputs: {
                            'Огноо': card.date,
                            ...(card.description ? { 'Тайлбар': card.description } : {}),
                        },
                        attachments,
                        content: '',
                        version: 1,
                        history: [],
                        documentTypeId: 'historical',
                        templateId: 'historical',
                        creatorId: 'system',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }));
                toast({ title: 'Амжилттай', description: `${doneCards.length} бичлэг нэмэгдлээ.` });
                onOpenChange(false);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Алдаа', description: e?.message || 'Хадгалахад алдаа гарлаа.' });
            } finally {
                setIsSaving(false);
            }
        }
    };

    const saveCount = mode === 'manual' ? rows.length : aiCards.filter(c => c.status === 'done' && c.type && c.date).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Archive className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                            <DialogTitle>Түүхэн бичлэг нэмэх</DialogTitle>
                            <DialogDescription>
                                {employeeName && <span className="font-medium text-slate-700">{employeeName} · </span>}
                                Өмнөх үеийн хөдөлмөрийн харилцааны түүхийг нөхөж оруулах
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Mode switcher */}
                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                    <button
                        type="button"
                        onClick={() => setMode('manual')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-all',
                            mode === 'manual'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <PenLine className="h-3.5 w-3.5" />
                        Гараар оруулах
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('ai')}
                        className={cn(
                            'flex-1 flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-all',
                            mode === 'ai'
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        AI-аар бөглөх
                    </button>
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <span>Эдгээр бичлэгүүд <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-500 border-slate-200 mx-1">Архив</Badge> статустайгаар хадгалагдах бөгөөд баталгаажуулах workflow дайрахгүй.</span>
                </div>

                {/* ── MANUAL MODE ─────────────────────────────────────────── */}
                {mode === 'manual' && (
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
                        {rows.map((row, idx) => (
                            <div key={row.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Бичлэг #{idx + 1}</span>
                                    {rows.length > 1 && (
                                        <button type="button" onClick={() => removeRow(row.id)} className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1 sm:col-span-2">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Баримтын төрөл *</label>
                                        <Select value={row.type} onValueChange={v => updateRow(row.id, 'type', v)}>
                                            <SelectTrigger className={cn('h-9', errors[`${row.id}-type`] && 'border-rose-400')}>
                                                <SelectValue placeholder="Төрөл сонгох..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {HISTORICAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {errors[`${row.id}-type`] && <p className="text-[10px] text-rose-500">{errors[`${row.id}-type`]}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Огноо *</label>
                                        <Input type="date" value={row.date} onChange={e => updateRow(row.id, 'date', e.target.value)} className={cn('h-9', errors[`${row.id}-date`] && 'border-rose-400')} />
                                        {errors[`${row.id}-date`] && <p className="text-[10px] text-rose-500">{errors[`${row.id}-date`]}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Дугаар <span className="normal-case text-slate-400 font-normal">(заавал биш)</span></label>
                                        <Input value={row.documentNumber} onChange={e => updateRow(row.id, 'documentNumber', e.target.value)} className="h-9" placeholder="А-001/2019" />
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Тайлбар <span className="normal-case text-slate-400 font-normal">(заавал биш)</span></label>
                                        <Textarea value={row.description} onChange={e => updateRow(row.id, 'description', e.target.value)} className="h-16 resize-none text-sm" placeholder="Туршилтын хугацаанд томилсон..." />
                                    </div>
                                    {/* File attachments */}
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Файл хавсаргах <span className="normal-case text-slate-400 font-normal">(заавал биш)</span></label>
                                        {row.files.length > 0 && (
                                            <div className="space-y-1.5">
                                                {row.files.map((file, fileIdx) => (
                                                    <div key={fileIdx} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                                                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                        <span className="text-xs text-slate-700 flex-1 truncate">{file.name}</span>
                                                        <span className="text-[10px] text-slate-400 shrink-0">{formatFileSize(file.size)}</span>
                                                        <button type="button" onClick={() => removeFile(row.id, fileIdx)} className="h-4 w-4 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div
                                            className="border-2 border-dashed border-slate-200 rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-slate-300 hover:bg-white transition-colors"
                                            onClick={() => fileInputRefs.current[row.id]?.click()}
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={e => { e.preventDefault(); const dropped = Array.from(e.dataTransfer.files); if (dropped.length) addFiles(row.id, dropped); }}
                                        >
                                            <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                                            <span className="text-xs text-slate-500">Файл сонгох эсвэл энд чирэх</span>
                                            <input ref={el => { fileInputRefs.current[row.id] = el; }} type="file" multiple className="hidden" onChange={e => { const sel = Array.from(e.target.files || []); if (sel.length) addFiles(row.id, sel); e.target.value = ''; }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addRow} className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                            <Plus className="h-4 w-4" />
                            Дараагийн бичлэг нэмэх
                        </button>
                    </div>
                )}

                {/* ── AI MODE ──────────────────────────────────────────────── */}
                {mode === 'ai' && (
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
                        {/* Upload zone */}
                        <div
                            className="border-2 border-dashed border-primary/30 rounded-xl px-6 py-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                            onClick={() => aiFileInputRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length) addAiFiles(files); }}
                        >
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">Баримт бичиг оруулах</p>
                                <p className="text-xs text-muted-foreground mt-0.5">PDF, JPG, PNG — AI автоматаар уншиж мэдээлэл бөглөнө</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Upload className="h-3.5 w-3.5" />
                                <span>Файл сонгох эсвэл энд чирэх</span>
                            </div>
                            <input ref={aiFileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                                onChange={e => { const files = Array.from(e.target.files || []); if (files.length) addAiFiles(files); e.target.value = ''; }} />
                        </div>

                        {/* AI cards */}
                        {aiCards.map(card => (
                            <div key={card.id} className={cn('border rounded-xl p-4 space-y-3 transition-colors', card.status === 'done' ? 'border-green-200 bg-green-50/40' : card.status === 'error' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50')}>
                                {/* Card header */}
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 flex-1 truncate">{card.file.name}</span>
                                    <span className="text-[10px] text-slate-400">{formatFileSize(card.file.size)}</span>
                                    {card.status === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />}
                                    {card.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                                    {card.status === 'error' && (
                                        <button type="button" onClick={() => parseOneCard(card.id, card.file)} className="text-[10px] text-rose-600 hover:underline shrink-0">Дахин</button>
                                    )}
                                    <button type="button" onClick={() => removeAiCard(card.id)} className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>

                                {card.status === 'loading' && (
                                    <div className="flex items-center gap-2 py-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        <span className="text-xs text-muted-foreground">AI баримтыг уншиж байна...</span>
                                    </div>
                                )}

                                {card.status === 'error' && (
                                    <p className="text-xs text-rose-600">{card.error}</p>
                                )}

                                {(card.status === 'done' || card.status === 'pending') && card.type !== undefined && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Баримтын төрөл *</label>
                                            <Select value={card.type} onValueChange={v => updateAiCard(card.id, 'type', v)}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Төрөл сонгох..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {HISTORICAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Огноо *</label>
                                            <Input type="date" value={card.date} onChange={e => updateAiCard(card.id, 'date', e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Дугаар</label>
                                            <Input value={card.documentNumber} onChange={e => updateAiCard(card.id, 'documentNumber', e.target.value)} className="h-9" placeholder="А-001/2019" />
                                        </div>
                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Тайлбар</label>
                                            <Textarea value={card.description} onChange={e => updateAiCard(card.id, 'description', e.target.value)} className="h-16 resize-none text-sm" placeholder="..." />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter className="pt-2 border-t">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-slate-400">
                            {saveCount > 0 ? `${saveCount} бичлэг нэмэгдэх болно` : 'Нэмэгдэх бичлэг байхгүй'}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Болих</Button>
                            <Button onClick={handleSave} disabled={isSaving || saveCount === 0}>
                                {isSaving
                                    ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Хадгалж байна...</>
                                    : `${saveCount} бичлэг хадгалах`}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
