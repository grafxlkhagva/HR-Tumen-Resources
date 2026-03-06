'use client';

import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Heading } from '@tiptap/extension-heading';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Highlighter,
    IndentIncrease,
    IndentDecrease,
    Table as TableIcon,
    Minus,
    Type,
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const INDENT_STEP = 24;
const MAX_INDENT = 10;

const indentAttribute = {
    indent: {
        default: 0,
        parseHTML: (element: HTMLElement) => {
            const di = element.getAttribute('data-indent');
            if (di) return parseInt(di, 10) || 0;
            const ml = parseInt(element.style.marginLeft || element.style.paddingLeft || '0', 10);
            return isNaN(ml) ? 0 : Math.round(ml / INDENT_STEP);
        },
        renderHTML: (attributes: Record<string, any>) => {
            if (!attributes.indent || attributes.indent <= 0) return {};
            return {
                'data-indent': String(attributes.indent),
                style: `margin-left: ${attributes.indent * INDENT_STEP}px;`,
            };
        },
    },
};

const IndentedParagraph = Paragraph.extend({
    addAttributes() {
        return { ...this.parent?.(), ...indentAttribute };
    },
});

const IndentedHeading = Heading.extend({
    addAttributes() {
        return { ...this.parent?.(), ...indentAttribute };
    },
});

const IndentCommands = Extension.create({
    name: 'indentCommands',

    addCommands() {
        return {
            indent: () => ({ tr, state, dispatch }: any) => {
                const { from, to } = state.selection;
                let changed = false;
                state.doc.nodesBetween(from, to, (node: any, pos: any) => {
                    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
                        const current = node.attrs.indent || 0;
                        if (current < MAX_INDENT) {
                            if (dispatch) {
                                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current + 1 });
                            }
                            changed = true;
                        }
                    }
                });
                return changed;
            },
            outdent: () => ({ tr, state, dispatch }: any) => {
                const { from, to } = state.selection;
                let changed = false;
                state.doc.nodesBetween(from, to, (node: any, pos: any) => {
                    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
                        const current = node.attrs.indent || 0;
                        if (current > 0) {
                            if (dispatch) {
                                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: current - 1 });
                            }
                            changed = true;
                        }
                    }
                });
                return changed;
            },
        } as any;
    },

    addKeyboardShortcuts() {
        return {
            Tab: () => {
                if (this.editor.isActive('listItem')) {
                    return this.editor.commands.sinkListItem('listItem');
                }
                (this.editor as any).commands.indent();
                return true;
            },
            'Shift-Tab': () => {
                if (this.editor.isActive('listItem')) {
                    return this.editor.commands.liftListItem('listItem');
                }
                (this.editor as any).commands.outdent();
                return true;
            },
        };
    },
});

const HIGHLIGHT_COLORS = [
    '#FEF3C7', '#FEE2E2', '#DBEAFE', '#D1FAE5',
    '#F3E8FF', '#FCE7F3', '#E0E7FF', '#ECFDF5',
];

const TEXT_COLORS = [
    { label: 'Хар', value: '#000000' },
    { label: 'Саарал', value: '#6B7280' },
    { label: 'Улаан', value: '#DC2626' },
    { label: 'Улбар шар', value: '#EA580C' },
    { label: 'Шар', value: '#CA8A04' },
    { label: 'Ногоон', value: '#16A34A' },
    { label: 'Хөх', value: '#2563EB' },
    { label: 'Ягаан', value: '#9333EA' },
];

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    insertContent?: string | null;
    onInsertComplete?: () => void;
    placeholder?: string;
    className?: string;
    editable?: boolean;
}

export interface RichTextEditorRef {
    setContent: (html: string) => void;
    getContent: () => string;
    focus: () => void;
}

/**
 * WYSIWYG rich-text editor based on TipTap.
 *
 * `content` is used ONLY for initial value (on mount).
 * To force new content, remount the component with a new `key` prop,
 * or call ref.setContent().
 */
export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
    function RichTextEditorInner(
        {
            content,
            onChange,
            insertContent,
            onInsertComplete,
            placeholder = 'Энд бичнэ үү...',
            className,
            editable = true,
        },
        ref
    ) {
        const editor = useEditor({
            immediatelyRender: false,
            extensions: [
                StarterKit.configure({
                    heading: false,
                    paragraph: false,
                }),
                IndentedParagraph,
                IndentedHeading.configure({ levels: [1, 2, 3] }),
                Underline,
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                }),
                TextStyle,
                Color,
                Highlight.configure({ multicolor: true }),
                Table.configure({ resizable: true }),
                TableRow,
                TableCell,
                TableHeader,
                Placeholder.configure({ placeholder }),
                IndentCommands,
            ],
            content,
            onUpdate: ({ editor: e }) => {
                onChange(e.getHTML());
            },
            editable,
            editorProps: {
                attributes: {
                    class: cn(
                        'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
                        '[&_p]:my-1 [&_h1]:my-2 [&_h2]:my-2 [&_h3]:my-1',
                        '[&_table]:border-collapse [&_table]:w-full',
                        '[&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_td]:min-w-[80px]',
                        '[&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-50 [&_th]:font-semibold',
                    ),
                },
                handleTextInput: (view, from, _to, text) => {
                    if (text !== ' ') return false;
                    const { state } = view;
                    const $from = state.doc.resolve(from);
                    const offsetInParent = $from.parentOffset;
                    const parentText = $from.parent.textContent;
                    const charBefore = offsetInParent > 0 ? parentText[offsetInParent - 1] : '';
                    if (charBefore === ' ' || charBefore === '\u00A0' || offsetInParent === 0) {
                        view.dispatch(state.tr.insertText('\u00A0', from, _to));
                        return true;
                    }
                    return false;
                },
                transformPastedHTML: (html) => {
                    return html.replace(/ {2,}/g, (match) => {
                        return match.split('').map((_, i) => i % 2 === 0 ? ' ' : '\u00A0').join('');
                    });
                },
            },
        });

        useImperativeHandle(ref, () => ({
            setContent: (html: string) => {
                editor?.commands.setContent(html, { emitUpdate: false });
            },
            getContent: () => editor?.getHTML() || '',
            focus: () => { editor?.commands.focus(); },
        }), [editor]);

        useEffect(() => {
            if (editor && insertContent) {
                editor.chain().focus().insertContent(insertContent).run();
                onInsertComplete?.();
            }
        }, [editor, insertContent, onInsertComplete]);

        if (!editor) {
            return (
                <div className="h-[500px] flex items-center justify-center bg-slate-50 rounded-lg border">
                    <div className="animate-pulse text-muted-foreground">Ачаалж байна...</div>
                </div>
            );
        }

        return (
            <div className={cn('border rounded-lg overflow-hidden bg-white', className)}>
                {editable && (
                    <div className="border-b bg-slate-50/80 p-1.5 flex flex-wrap items-center gap-0.5">
                        {/* History */}
                        <ToolbarBtn icon={<Undo className="h-4 w-4" />} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Буцаах (Ctrl+Z)" />
                        <ToolbarBtn icon={<Redo className="h-4 w-4" />} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Дахин хийх (Ctrl+Y)" />

                        <Sep />

                        {/* Block format */}
                        <Select
                            value={
                                editor.isActive('heading', { level: 1 }) ? 'h1' :
                                editor.isActive('heading', { level: 2 }) ? 'h2' :
                                editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
                            }
                            onValueChange={(v) => {
                                if (v === 'p') editor.chain().focus().setParagraph().run();
                                else {
                                    const level = parseInt(v.replace('h', '')) as 1 | 2 | 3;
                                    editor.chain().focus().toggleHeading({ level }).run();
                                }
                            }}
                        >
                            <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="p">Энгийн текст</SelectItem>
                                <SelectItem value="h1">Гарчиг 1</SelectItem>
                                <SelectItem value="h2">Гарчиг 2</SelectItem>
                                <SelectItem value="h3">Гарчиг 3</SelectItem>
                            </SelectContent>
                        </Select>

                        <Sep />

                        {/* Inline formatting */}
                        <ToolbarBtn icon={<Bold className="h-4 w-4" />} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Тод (Ctrl+B)" />
                        <ToolbarBtn icon={<Italic className="h-4 w-4" />} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Налуу (Ctrl+I)" />
                        <ToolbarBtn icon={<UnderlineIcon className="h-4 w-4" />} onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Доогуур зураас (Ctrl+U)" />
                        <ToolbarBtn icon={<Strikethrough className="h-4 w-4" />} onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Зураас" />

                        <Sep />

                        {/* Text color */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" title="Текст өнгө">
                                    <Type className="h-4 w-4" />
                                    <div
                                        className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-3.5 rounded-full"
                                        style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }}
                                    />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                                <div className="grid grid-cols-4 gap-1">
                                    {TEXT_COLORS.map((c) => (
                                        <button
                                            key={c.value}
                                            className="w-7 h-7 rounded border hover:scale-110 transition-transform flex items-center justify-center"
                                            style={{ color: c.value }}
                                            onClick={() => editor.chain().focus().setColor(c.value).run()}
                                            title={c.label}
                                        >
                                            <span className="text-sm font-bold">A</span>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    className="mt-1 text-xs text-slate-500 hover:text-slate-700 w-full text-center py-1"
                                    onClick={() => editor.chain().focus().unsetColor().run()}
                                >
                                    Өнгө арилгах
                                </button>
                            </PopoverContent>
                        </Popover>

                        {/* Highlight */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Тодруулах">
                                    <Highlighter className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2">
                                <div className="grid grid-cols-4 gap-1">
                                    {HIGHLIGHT_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                                            style={{ backgroundColor: color }}
                                            onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                                        />
                                    ))}
                                </div>
                                <button
                                    className="mt-1 text-xs text-slate-500 hover:text-slate-700 w-full text-center py-1"
                                    onClick={() => editor.chain().focus().unsetHighlight().run()}
                                >
                                    Арилгах
                                </button>
                            </PopoverContent>
                        </Popover>

                        <Sep />

                        {/* Alignment */}
                        <ToolbarBtn icon={<AlignLeft className="h-4 w-4" />} onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Зүүн" />
                        <ToolbarBtn icon={<AlignCenter className="h-4 w-4" />} onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Төв" />
                        <ToolbarBtn icon={<AlignRight className="h-4 w-4" />} onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Баруун" />
                        <ToolbarBtn icon={<AlignJustify className="h-4 w-4" />} onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Тэгшлэх" />

                        <Sep />

                        {/* Lists */}
                        <ToolbarBtn icon={<List className="h-4 w-4" />} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Жагсаалт" />
                        <ToolbarBtn icon={<ListOrdered className="h-4 w-4" />} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Дугаарласан" />
                        <ToolbarBtn icon={<Quote className="h-4 w-4" />} onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Ишлэл" />

                        <Sep />

                        {/* Indent */}
                        <ToolbarBtn icon={<IndentDecrease className="h-4 w-4" />} onClick={() => (editor.commands as any).outdent()} title="Догол багасгах (Shift+Tab)" />
                        <ToolbarBtn icon={<IndentIncrease className="h-4 w-4" />} onClick={() => (editor.commands as any).indent()} title="Догол нэмэх (Tab)" />

                        <Sep />

                        {/* Table */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant={editor.isActive('table') ? 'secondary' : 'ghost'} size="sm" className="h-8 w-8 p-0" title="Хүснэгт">
                                    <TableIcon className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                                    Хүснэгт нэмэх (3×3)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run()}>
                                    Хүснэгт нэмэх (2×2)
                                </DropdownMenuItem>
                                {editor.isActive('table') && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>Мөр нэмэх (дээш)</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>Мөр нэмэх (доош)</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>Багана нэмэх (зүүн)</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>Багана нэмэх (баруун)</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} className="text-rose-600">Мөр устгах</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} className="text-rose-600">Багана устгах</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-rose-600">Хүснэгт устгах</DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Horizontal rule */}
                        <ToolbarBtn icon={<Minus className="h-4 w-4" />} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Хэвтээ зураас" />
                    </div>
                )}

                <EditorContent
                    editor={editor}
                    className={cn(
                        'min-h-[400px]',
                        '[&_.ProseMirror]:min-h-[400px]',
                        '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
                        '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
                        '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
                        '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
                    )}
                />
            </div>
        );
    }
);

function ToolbarBtn({ icon, onClick, active, disabled, title }: {
    icon: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title?: string;
}) {
    return (
        <Button
            variant={active ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title={title}
        >
            {icon}
        </Button>
    );
}

function Sep() {
    return <Separator orientation="vertical" className="mx-1 h-6" />;
}
