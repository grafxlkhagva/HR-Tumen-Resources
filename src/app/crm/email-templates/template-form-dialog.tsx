'use client';

import * as React from 'react';
import {
    addDoc,
    collection,
    doc,
    serverTimestamp,
} from 'firebase/firestore';
import {
    updateDocumentNonBlocking,
    useFirebase,
    useUser,
} from '@/firebase';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
    EMAIL_TEMPLATE_CATEGORIES,
    EMAIL_TEMPLATE_CATEGORY_LABELS,
    EMAIL_VARIABLES,
    type EmailTemplate,
    type EmailTemplateCategory,
} from '../_types';

interface TemplateFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** undefined = шинэ. */
    template?: EmailTemplate;
}

export function TemplateFormDialog({
    open,
    onOpenChange,
    template,
}: TemplateFormDialogProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    const [form, setForm] = React.useState({
        name: '',
        category: 'general' as EmailTemplateCategory,
        subject: '',
        body: '',
        description: '',
    });

    const subjectRef = React.useRef<HTMLInputElement>(null);
    const bodyRef = React.useRef<HTMLTextAreaElement>(null);
    const lastFocused = React.useRef<'subject' | 'body'>('body');

    React.useEffect(() => {
        if (open) {
            setForm({
                name: template?.name || '',
                category: template?.category || 'general',
                subject: template?.subject || '',
                body: template?.body || '',
                description: template?.description || '',
            });
        }
    }, [open, template]);

    const insertVariable = (path: string) => {
        const token = `{{${path}}}`;
        const target = lastFocused.current;
        if (target === 'subject') {
            const el = subjectRef.current;
            if (!el) return;
            const start = el.selectionStart ?? form.subject.length;
            const end = el.selectionEnd ?? form.subject.length;
            const next = form.subject.slice(0, start) + token + form.subject.slice(end);
            setForm((p) => ({ ...p, subject: next }));
            queueMicrotask(() => {
                el.focus();
                const pos = start + token.length;
                el.setSelectionRange(pos, pos);
            });
        } else {
            const el = bodyRef.current;
            if (!el) return;
            const start = el.selectionStart ?? form.body.length;
            const end = el.selectionEnd ?? form.body.length;
            const next = form.body.slice(0, start) + token + form.body.slice(end);
            setForm((p) => ({ ...p, body: next }));
            queueMicrotask(() => {
                el.focus();
                const pos = start + token.length;
                el.setSelectionRange(pos, pos);
            });
        }
    };

    const handleSubmit = React.useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!firestore) return;

            const name = form.name.trim();
            const subject = form.subject.trim();
            const body = form.body.trim();

            if (!name || !subject || !body) {
                toast({
                    variant: 'destructive',
                    title: 'Дутуу мэдээлэл',
                    description: 'Нэр, гарчиг, агуулга гурвыг бүгдийг бөглөнө үү.',
                });
                return;
            }

            setIsSaving(true);
            try {
                const payload = {
                    name,
                    category: form.category,
                    subject,
                    body,
                    description: form.description.trim() || null,
                    ownerId: user?.uid || null,
                    updatedAt: serverTimestamp(),
                };
                if (template) {
                    const ref = doc(firestore, 'crm_email_templates', template.id);
                    updateDocumentNonBlocking(ref, payload);
                    toast({ title: 'Хадгалагдлаа' });
                } else {
                    const ref = collection(firestore, 'crm_email_templates');
                    await addDoc(ref, {
                        ...payload,
                        createdAt: serverTimestamp(),
                    });
                    toast({ title: 'Шинэ загвар нэмэгдлээ' });
                }
                onOpenChange(false);
            } finally {
                setIsSaving(false);
            }
        },
        [firestore, form, template, user, toast, onOpenChange],
    );

    const groupedVars = React.useMemo(() => {
        const groups: Record<string, typeof EMAIL_VARIABLES> = {};
        EMAIL_VARIABLES.forEach((v) => {
            (groups[v.group] ||= []).push(v);
        });
        return groups;
    }, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {template ? 'Загвар засах' : 'Шинэ имэйл загвар'}
                    </DialogTitle>
                    <DialogDescription>
                        {`Хувьсагч ашиглах: `}
                        <code className="text-[11px] bg-muted px-1 rounded">{`{{contact.firstName}}`}</code>
                        {' '}гэх мэт.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs">
                                Нэр <span className="text-rose-600">*</span>
                            </Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                disabled={isSaving}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Ангилал</Label>
                            <Select
                                value={form.category}
                                onValueChange={(v) =>
                                    setForm((p) => ({
                                        ...p,
                                        category: v as EmailTemplateCategory,
                                    }))
                                }
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {EMAIL_TEMPLATE_CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {EMAIL_TEMPLATE_CATEGORY_LABELS[c]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">
                            Гарчиг <span className="text-rose-600">*</span>
                        </Label>
                        <Input
                            ref={subjectRef}
                            value={form.subject}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, subject: e.target.value }))
                            }
                            onFocus={() => (lastFocused.current = 'subject')}
                            disabled={isSaving}
                            placeholder="Жишээ: {{quote.title}} - Үнийн санал"
                        />
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-8 space-y-1.5">
                            <Label className="text-xs">
                                Агуулга <span className="text-rose-600">*</span>
                            </Label>
                            <Textarea
                                ref={bodyRef}
                                value={form.body}
                                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                                onFocus={() => (lastFocused.current = 'body')}
                                disabled={isSaving}
                                placeholder={`Сайн байна уу, {{contact.firstName}} аа,\n\n{{quote.title}}-ийн үнийн саналыг хүргүүлж байна...\n\nХүндэтгэсэн,\n{{owner.fullName}}\n{{org.name}}`}
                                className="min-h-[260px] resize-none font-mono text-xs"
                            />
                        </div>
                        <div className="col-span-4 space-y-2 max-h-[280px] overflow-y-auto rounded-md border bg-muted/20 p-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                                Хувьсагч оруулах
                            </div>
                            {Object.entries(groupedVars).map(([group, vars]) => (
                                <div key={group} className="space-y-0.5">
                                    <div className="text-[10px] font-medium text-muted-foreground px-1">
                                        {group}
                                    </div>
                                    {vars.map((v) => (
                                        <button
                                            key={v.path}
                                            type="button"
                                            onClick={() => insertVariable(v.path)}
                                            className="block w-full text-left text-[11px] rounded px-1.5 py-1 hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
                                        >
                                            <span className="font-medium">{v.label}</span>
                                            <span className="ml-1 text-[10px] text-muted-foreground/70 font-mono">
                                                {`{{${v.path}}}`}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Тайлбар</Label>
                        <Input
                            value={form.description}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, description: e.target.value }))
                            }
                            placeholder="Загварыг яаж ашиглах талаар тайлбар"
                            disabled={isSaving}
                        />
                    </div>
                </form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Болих
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        className="bg-cyan-600 hover:bg-cyan-600/90"
                        disabled={isSaving}
                    >
                        {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                        Хадгалах
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
