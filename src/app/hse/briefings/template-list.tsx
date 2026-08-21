'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, FileText, ImageIcon } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
    DataTable,
    DataTableHeader,
    DataTableColumn,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableLoading,
    DataTableEmpty,
    AppConfirmDialog,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useHseEmployees } from '../components/use-hse-employees';
import { deleteHseDoc } from '../services/hse-service';
import { HSE_COLLECTIONS, type BriefingTemplate } from '../types';
import { useBriefingTemplates } from './use-briefing-templates';
import { TemplateForm } from './template-form';

/** ms → "YYYY-MM-DD HH:mm" */
function fmtDateTime(ms?: number): string {
    if (!ms) return '—';
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
/** ms → "YYYY-MM-DD" (шүүлтэд) */
function dateOnly(ms?: number): string {
    if (!ms) return '';
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function TemplateList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { templates, isLoading } = useBriefingTemplates();
    const { nameOf } = useHseEmployees();

    const [formOpen, setFormOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<BriefingTemplate | null>(null);

    // Баганын шүүлтүүд
    const [fName, setFName] = React.useState('');
    const [fUser, setFUser] = React.useState('all');
    const [fDate, setFDate] = React.useState('');

    const creators = React.useMemo(() => {
        const ids = new Set<string>();
        templates.forEach((t) => t.burtgesenId && ids.add(t.burtgesenId));
        return Array.from(ids);
    }, [templates]);

    const filtered = React.useMemo(() => {
        return templates.filter((t) => {
            if (fName && !t.ner?.toLowerCase().includes(fName.toLowerCase())) return false;
            if (fUser !== 'all' && t.burtgesenId !== fUser) return false;
            if (fDate && dateOnly(t.createdAt) !== fDate) return false;
            return true;
        });
    }, [templates, fName, fUser, fDate]);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (t: BriefingTemplate) => {
        setEditing(t);
        setFormOpen(true);
    };
    const handleDelete = async (t: BriefingTemplate) => {
        if (!firestore) return;
        try {
            await deleteHseDoc(firestore, HSE_COLLECTIONS.briefingTemplates, t.id);
            toast({ title: 'Загвар устгагдлаа.' });
        } catch {
            toast({ title: 'Устгахад алдаа гарлаа.', variant: 'destructive' });
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-subtitle font-semibold">Зааварчилгааны загвар</h2>
                    <p className="text-caption text-muted-foreground">
                        Зураг, PDF материал бүхий бэлэн загварууд
                    </p>
                </div>
                <Button onClick={openNew}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Шинэ загвар
                </Button>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Зааварчилгааны нэр</DataTableColumn>
                        <DataTableColumn align="center">Танилцахад олгох оноо</DataTableColumn>
                        <DataTableColumn align="center">Материал</DataTableColumn>
                        <DataTableColumn>Бүртгэсэн огноо</DataTableColumn>
                        <DataTableColumn>Бүртгэсэн хэрэглэгч</DataTableColumn>
                        <DataTableColumn align="right">Үйлдэл</DataTableColumn>
                    </DataTableRow>
                    {/* Шүүлтийн мөр */}
                    <DataTableRow className="hover:bg-transparent">
                        <DataTableColumn />
                        <DataTableColumn>
                            <Input
                                value={fName}
                                onChange={(e) => setFName(e.target.value)}
                                placeholder="Нэрээр хайх..."
                                className="h-8"
                            />
                        </DataTableColumn>
                        <DataTableColumn />
                        <DataTableColumn />
                        <DataTableColumn>
                            <Input
                                type="date"
                                value={fDate}
                                onChange={(e) => setFDate(e.target.value)}
                                className="h-8"
                            />
                        </DataTableColumn>
                        <DataTableColumn>
                            <Select value={fUser} onValueChange={setFUser}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Сонгоно уу" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Бүгд</SelectItem>
                                    {creators.map((id) => (
                                        <SelectItem key={id} value={id}>
                                            {nameOf(id)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </DataTableColumn>
                        <DataTableColumn />
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={7} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={7} message="Загвар бүртгэгдээгүй байна" />
                ) : (
                    <DataTableBody>
                        {filtered.map((t, i) => (
                            <DataTableRow key={t.id}>
                                <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                <DataTableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {t.imgUrl && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={t.imgUrl}
                                                alt=""
                                                className="h-8 w-8 rounded object-cover"
                                            />
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate">{t.ner}</p>
                                            {t.torol && (
                                                <p className="truncate text-micro text-muted-foreground">
                                                    {t.torol}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </DataTableCell>
                                <DataTableCell align="center">{t.onoo ?? '—'}</DataTableCell>
                                <DataTableCell align="center">
                                    <div className="flex items-center justify-center gap-2">
                                        {t.imgUrl && (
                                            <a href={t.imgUrl} target="_blank" rel="noreferrer" title="Зураг" className="text-muted-foreground hover:text-info">
                                                <ImageIcon className="h-4 w-4" />
                                            </a>
                                        )}
                                        {t.pdfUrl ? (
                                            <a href={t.pdfUrl} target="_blank" rel="noreferrer" title="PDF" className="text-muted-foreground hover:text-error">
                                                <FileText className="h-4 w-4" />
                                            </a>
                                        ) : (
                                            !t.imgUrl && <span className="text-micro text-muted-foreground">—</span>
                                        )}
                                    </div>
                                </DataTableCell>
                                <DataTableCell className="whitespace-nowrap text-muted-foreground">
                                    {fmtDateTime(t.createdAt)}
                                </DataTableCell>
                                <DataTableCell>{t.burtgesenId ? nameOf(t.burtgesenId) : '—'}</DataTableCell>
                                <DataTableCell align="right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AppConfirmDialog
                                            trigger={
                                                <Button variant="ghost" size="icon-sm">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            }
                                            title="Загвар устгах уу?"
                                            description="Энэ үйлдлийг буцаах боломжгүй."
                                            onConfirm={() => handleDelete(t)}
                                        />
                                    </div>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>

            <TemplateForm open={formOpen} onOpenChange={setFormOpen} template={editing} />
        </section>
    );
}
