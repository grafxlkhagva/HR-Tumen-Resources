'use client';

import * as React from 'react';
import { collection, doc, orderBy, query } from 'firebase/firestore';
import {
    deleteDocumentNonBlocking,
    useCollection,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Mail, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    EMAIL_TEMPLATE_CATEGORY_LABELS,
    type EmailTemplate,
} from '../_types';
import { TemplateFormDialog } from './template-form-dialog';

export default function EmailTemplatesPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<EmailTemplate | undefined>();

    const templatesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, 'crm_email_templates'),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: templates, isLoading } = useCollection<EmailTemplate>(templatesQuery);

    const handleDelete = (id: string) => {
        if (!firestore) return;
        const ref = doc(firestore, 'crm_email_templates', id);
        deleteDocumentNonBlocking(ref);
        toast({ title: 'Устгагдлаа' });
    };

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Имэйл загвар</h1>
                    <p className="text-xs text-muted-foreground">
                        {templates ? `${templates.length} загвар` : 'Ачаалж байна...'}
                    </p>
                </div>
                <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={() => {
                        setEditing(undefined);
                        setIsAddOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ загвар
                </Button>
            </header>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                ) : !templates || templates.length === 0 ? (
                    <EmptyState
                        onAdd={() => {
                            setEditing(undefined);
                            setIsAddOpen(true);
                        }}
                    />
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="w-[280px]">Нэр</TableHead>
                                <TableHead>Ангилал</TableHead>
                                <TableHead>Гарчиг</TableHead>
                                <TableHead className="w-[120px] text-right">Үйлдэл</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.map((t) => (
                                <TableRow key={t.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                                                <Mail className="h-4 w-4 text-cyan-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium truncate">
                                                    {t.name}
                                                </div>
                                                {t.description && (
                                                    <div className="text-[11px] text-muted-foreground truncate">
                                                        {t.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px]">
                                            {EMAIL_TEMPLATE_CATEGORY_LABELS[t.category]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground truncate max-w-[300px]">
                                        {t.subject}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => {
                                                    setEditing(t);
                                                    setIsAddOpen(true);
                                                }}
                                                aria-label="Засах"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="text-muted-foreground hover:text-rose-600"
                                                        aria-label="Устгах"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            Загвар устгах уу?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t.name}-ийг устгана. Энэ үйлдэл буцаагдахгүй.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Болих</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(t.id)}
                                                            className="bg-rose-600 hover:bg-rose-700"
                                                        >
                                                            Устгах
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <TemplateFormDialog
                open={isAddOpen}
                onOpenChange={(o) => {
                    setIsAddOpen(o);
                    if (!o) setEditing(undefined);
                }}
                template={editing}
            />
        </div>
    );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <Mail className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">Загвар байхгүй</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Үнийн санал, дараагийн холбоо, талархлын имэйлүүдийн загвар бэлдэх боломжтой.
                </p>
                <Button
                    size="sm"
                    className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={onAdd}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ загвар
                </Button>
            </div>
        </div>
    );
}
