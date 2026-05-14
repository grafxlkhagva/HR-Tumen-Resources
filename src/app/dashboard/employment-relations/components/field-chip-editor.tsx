'use client';

/**
 * FieldChipEditor
 * ─────────────────────────────────────────────────────────────────────────
 * Tiptap-based editor that renders `{{field.path}}` placeholders as clickable
 * chips. The chip shows the field's human-readable label + its current
 * resolved (or overridden) value. Clicking a chip opens a popover where the
 * user can override the value for THIS document only, or reset to source.
 *
 * Plain text between chips is freely editable (paragraphs supported).
 *
 * String <-> Tiptap document conversion is simple: content is split on the
 * `{{...}}` regex into alternating text and placeholder segments. Serialization
 * walks the doc back to the same string shape so the on-disk content format is
 * unchanged.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, Node, NodeViewWrapper, ReactNodeViewRenderer, Editor } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import type { RawCommands } from '@tiptap/core';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RotateCcw, Check, Sparkles } from 'lucide-react';
import { ALL_DYNAMIC_FIELDS } from '../data/field-dictionary';

export interface FieldChipEditorProps {
    content: string;
    onChange: (content: string) => void;
    resolvers: Record<string, string>;
    overrides: Record<string, string>;
    onOverridesChange: (next: Record<string, string>) => void;
    disabled?: boolean;
    className?: string;
    onReady?: (editor: Editor) => void;
}

/**
 * Chip context is stored per-editor in `editor.storage.fieldPlaceholder` as a
 * tiny pub/sub store. Chips (rendered in separate React roots via
 * ReactNodeViewRenderer) subscribe in a useEffect so they re-render when the
 * parent swaps in fresh resolvers/overrides.
 */
interface ChipContextSnapshot {
    resolvers: Record<string, string>;
    overrides: Record<string, string>;
    onOverridesChange: (next: Record<string, string>) => void;
    disabled: boolean;
}

type ChipListener = () => void;

interface ChipStore {
    getSnapshot: () => ChipContextSnapshot;
    setSnapshot: (next: ChipContextSnapshot) => void;
    subscribe: (fn: ChipListener) => () => void;
}

function createChipStore(initial: ChipContextSnapshot): ChipStore {
    let snap = initial;
    const listeners = new Set<ChipListener>();
    return {
        getSnapshot: () => snap,
        setSnapshot: (next) => {
            snap = next;
            listeners.forEach((fn) => fn());
        },
        subscribe: (fn) => {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
    };
}

/** Tiptap inline atom node that represents a `{{field}}` placeholder. */
const FieldPlaceholder = Node.create({
    name: 'fieldPlaceholder',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() {
        return {
            fieldKey: {
                default: '',
                parseHTML: (el) => el.getAttribute('data-field') || '',
                renderHTML: (attrs) => ({ 'data-field': attrs.fieldKey }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-field-placeholder]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', { 'data-field-placeholder': 'true', ...HTMLAttributes }];
    },

    addNodeView() {
        return ReactNodeViewRenderer(FieldChipView);
    },

    addStorage() {
        return {
            store: createChipStore({
                resolvers: {},
                overrides: {},
                onOverridesChange: () => {},
                disabled: false,
            }),
        };
    },

    addCommands() {
        return {
            insertFieldPlaceholder:
                (fieldKey: string) =>
                ({ commands }: { commands: { insertContent: (c: unknown) => boolean } }) => {
                    return commands.insertContent({
                        type: 'fieldPlaceholder',
                        attrs: { fieldKey },
                    });
                },
        } as unknown as Partial<RawCommands>;
    },
});

/** Chip renderer — subscribes to the editor's chip store so parent prop changes propagate. */
function FieldChipView({ node, editor }: NodeViewProps) {
    const fieldKey: string = node.attrs.fieldKey || '';
    const [open, setOpen] = useState(false);

    const store = (editor.storage as unknown as { fieldPlaceholder?: { store?: ChipStore } }).fieldPlaceholder?.store;
    const [ctx, setCtx] = useState<ChipContextSnapshot>(() =>
        store?.getSnapshot() ?? {
            resolvers: {},
            overrides: {},
            onOverridesChange: () => {},
            disabled: false,
        }
    );
    useEffect(() => {
        if (!store) return;
        setCtx(store.getSnapshot());
        return store.subscribe(() => setCtx(store.getSnapshot()));
    }, [store]);
    const { resolvers, overrides, onOverridesChange, disabled } = ctx;

    const definition = useMemo(
        () => ALL_DYNAMIC_FIELDS.find((f) => f.key === fieldKey),
        [fieldKey]
    );
    const label = definition?.label || fieldKey;
    const sourceValue = resolvers[fieldKey] ?? '';
    const overrideValue = overrides[fieldKey];
    const isOverridden = overrideValue !== undefined;
    const displayValue = isOverridden ? overrideValue : sourceValue || fieldKey;

    const [draft, setDraft] = useState<string>(overrideValue ?? sourceValue ?? '');
    useEffect(() => {
        if (open) setDraft(overrideValue ?? sourceValue ?? '');
    }, [open, overrideValue, sourceValue]);

    const commitOverride = () => {
        const next = { ...overrides };
        const trimmed = draft.trim();
        if (trimmed === '' || trimmed === (sourceValue ?? '')) {
            delete next[fieldKey];
        } else {
            next[fieldKey] = trimmed;
        }
        onOverridesChange(next);
        setOpen(false);
    };

    const resetOverride = () => {
        if (!isOverridden) {
            setOpen(false);
            return;
        }
        const next = { ...overrides };
        delete next[fieldKey];
        onOverridesChange(next);
        setOpen(false);
    };

    return (
        <NodeViewWrapper as="span" className="inline-block align-baseline">
            <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        contentEditable={false}
                        disabled={disabled}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium mx-0.5 align-baseline transition-colors select-none',
                            disabled && 'cursor-default opacity-70',
                            !disabled && 'hover:ring-2 hover:ring-offset-1',
                            isOverridden
                                ? 'bg-amber-50 border-amber-200 text-amber-900 hover:ring-amber-300'
                                : 'bg-sky-50 border-sky-200 text-sky-900 hover:ring-sky-300'
                        )}
                        title={`${label} (${fieldKey})`}
                    >
                        <Sparkles className={cn('h-3 w-3', isOverridden ? 'text-amber-500' : 'text-sky-500')} />
                        <span className="truncate max-w-[220px]">{displayValue || '________________'}</span>
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-3" align="start" side="bottom">
                    <div className="space-y-3">
                        <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                                {definition?.group || 'Талбар'}
                            </p>
                            <p className="text-sm font-semibold leading-tight mt-0.5">{label}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 font-mono">{fieldKey}</p>
                        </div>

                        <div className="rounded-md bg-slate-50 border px-2.5 py-1.5">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Эх утга</p>
                            <p className="text-sm text-slate-700 break-words">
                                {sourceValue || <span className="italic text-slate-400">Хоосон</span>}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">Зөвхөн энэ баримтад</Label>
                            <Input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                placeholder={sourceValue || 'Шинэ утга...'}
                                className="h-8 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        commitOverride();
                                    } else if (e.key === 'Escape') {
                                        setOpen(false);
                                    }
                                }}
                            />
                            {isOverridden && (
                                <p className="text-[10px] text-amber-700 flex items-center gap-1">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    Одоогоор энэ баримтад өөрчлөгдсөн
                                </p>
                            )}
                        </div>

                        <div className="flex gap-1.5 pt-1">
                            <Button size="sm" className="h-7 text-xs flex-1" onClick={commitOverride}>
                                <Check className="h-3 w-3 mr-1" />
                                Хадгалах
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={resetOverride}
                                disabled={!isOverridden}
                                title="Эх утга руу буцаах"
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </NodeViewWrapper>
    );
}

// ── Content <-> Tiptap HTML conversion ───────────────────────────────────

const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/**
 * Storage-format-ын content (HTML + `{{field}}` marker-ууд)-г Tiptap-ийн
 * `setContent` дуудлагад өгөх HTML string рүү хөрвүүлнэ.
 *
 * Стратеги:
 *  - `{{field}}` marker-уудыг `<span data-field-placeholder ...>` болгоно
 *    — FieldPlaceholder Node-ын `parseHTML` таних болно
 *  - Бусад HTML (style="text-align:..", <strong>, <br> г.м)-ыг Tiptap StarterKit +
 *    TextAlign + Underline extension-ууд parse хийж рендерлэнэ
 */
export function preprocessContentToHtml(content: string): string {
    let html = String(content || '');
    // Хэрэв plain text бол энгийн `<p>` wrap нэмнэ (Tiptap-ыг эвдэхгүйн тулд)
    const looksHtml = /<[a-z][\s\S]*?>/i.test(html);
    if (!looksHtml && html) {
        html = html
            .split(/\n{2,}/)
            .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }
    // Placeholder-уудыг chip-span болгоно. Аттрибутыг HTML escape хийнэ.
    return html.replace(PLACEHOLDER_RE, (_, key) => {
        const k = `{{${String(key).trim()}}}`;
        const escaped = k.replace(/"/g, '&quot;');
        return `<span data-field-placeholder="true" data-field="${escaped}"></span>`;
    });
}

/**
 * Tiptap-ийн `getHTML()`-ийн үр дүнг storage format руу буцаана. Chip-span-
 * ууд дотор байгаа `data-field="{{field}}"` attribute-г `{{field}}` marker
 * болгон буцаана.
 */
export function postprocessHtmlToContent(html: string): string {
    if (!html) return '';
    // `<span data-field-placeholder="true" data-field="{{field}}"></span>` → `{{field}}`
    return html.replace(
        /<span\b[^>]*data-field-placeholder[^>]*>\s*<\/span>/gi,
        (match) => {
            const attrMatch = match.match(/data-field\s*=\s*"([^"]*)"/i);
            if (!attrMatch) return '';
            const value = attrMatch[1]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
            return value; // аль хэдийн `{{field}}` хэлбэртэй
        }
    );
}

// ── Editor component ─────────────────────────────────────────────────────

export function FieldChipEditor({
    content,
    onChange,
    resolvers,
    overrides,
    onOverridesChange,
    disabled = false,
    className,
    onReady,
}: FieldChipEditorProps) {
    const lastEmittedRef = useRef<string>('');

    const editor = useEditor({
        immediatelyRender: false,
        editable: !disabled,
        extensions: [
            StarterKit.configure({
                codeBlock: false,
                horizontalRule: false,
            }),
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            FieldPlaceholder,
        ],
        content: preprocessContentToHtml(content),
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-0 py-2',
                    'prose-p:my-2 leading-relaxed text-[13px]'
                ),
            },
        },
        onUpdate({ editor }) {
            const html = editor.getHTML();
            const serialized = postprocessHtmlToContent(html);
            lastEmittedRef.current = serialized;
            onChange(serialized);
        },
    });

    // Keep the shared ChipContext in editor storage up-to-date so NodeViews see
    // the latest resolvers/overrides/handlers without editor re-creation.
    useEffect(() => {
        if (!editor) return;
        const storage = editor.storage as unknown as { fieldPlaceholder?: { store?: ChipStore } };
        storage.fieldPlaceholder?.store?.setSnapshot({
            resolvers,
            overrides,
            onOverridesChange,
            disabled,
        });
    }, [editor, resolvers, overrides, onOverridesChange, disabled]);

    // External content prop changed (e.g., template restore) — reconcile.
    // Tiptap-ын ReactNodeViewRenderer `flushSync` ашигладаг тул setContent-ийг
    // useEffect commit phase-д шууд дуудвал "flushSync from lifecycle" алдаа гарна.
    // Microtask-д хойшлуулж React render-ийн гадна ажиллуулна.
    useEffect(() => {
        if (!editor) return;
        if (content === lastEmittedRef.current) return;
        const current = postprocessHtmlToContent(editor.getHTML());
        if (current === content) return;
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled || editor.isDestroyed) return;
            // Race хамгаалалт — микро-таск хүрэх үед content prop дахин солигдсон эсэхийг шалгана
            const latestCurrent = postprocessHtmlToContent(editor.getHTML());
            if (latestCurrent === content) return;
            editor.commands.setContent(preprocessContentToHtml(content), { emitUpdate: false });
        });
        return () => { cancelled = true; };
    }, [editor, content]);

    useEffect(() => {
        if (editor && onReady) onReady(editor);
    }, [editor, onReady]);

    useEffect(() => {
        if (!editor) return;
        if (editor.isEditable !== !disabled) editor.setEditable(!disabled);
    }, [editor, disabled]);

    return (
        <div className={cn('w-full', className)}>
            <EditorContent editor={editor} />
        </div>
    );
}
