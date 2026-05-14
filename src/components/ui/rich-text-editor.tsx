'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
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
    List,
    ListOrdered,
    Quote,
    Undo,
    Redo,
    Highlighter,
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        fontSize: {
            setFontSize: (size: string) => ReturnType;
            unsetFontSize: () => ReturnType;
        };
    }
}

// TextStyle mark-д `fontSize` атрибутыг нэмэх инлайн extension —
// тусад нь package суулгах шаардлагагүй.
const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return { types: ['textStyle'] };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: (element: HTMLElement) =>
                            element.style.fontSize?.replace(/['"]/g, '') || null,
                        renderHTML: (attrs: { fontSize?: string | null }) => {
                            if (!attrs.fontSize) return {};
                            return { style: `font-size: ${attrs.fontSize}` };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize:
                (size: string) =>
                ({ chain }) =>
                    chain().setMark('textStyle', { fontSize: size }).run(),
            unsetFontSize:
                () =>
                ({ chain }) =>
                    chain()
                        .setMark('textStyle', { fontSize: null })
                        .removeEmptyTextStyle()
                        .run(),
        };
    },
});

const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32'];
const DEFAULT_FONT_SIZE = '11';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    insertContent?: string | null;
    onInsertComplete?: () => void;
    placeholder?: string;
    className?: string;
    minHeight?: number;
    /** Toolbar-ийн төгсгөлд нэмэлт товч/dropdown render хийх slot. */
    extraToolbar?: (editor: Editor) => React.ReactNode;
    /** Editor content-ийн дээр (scroll-ын адил container-д) render хийх HTML — тогтмол толгой preview. */
    beforeContent?: React.ReactNode;
    /** Editor content-ийн доор (scroll-ын адил container-д) render хийх HTML — тогтмол хөл preview. */
    afterContent?: React.ReactNode;
    /**
     * "Цаас" төрх — MS Word шиг A4 цаасан дээр бичиж байгаа мэт UI:
     * 21×29.7cm A4, тогтмол margin: top 2cm, бусад 3 талаас 1.5cm.
     * Эдгээр margin-уудыг өөрчлөх боломжгүй (стандарт).
     */
    paperMode?: boolean;
}

const HIGHLIGHT_COLORS = [
    '#FEF3C7', '#FEE2E2', '#DBEAFE', '#D1FAE5',
    '#F3E8FF', '#FCE7F3', '#E0E7FF', '#ECFDF5',
];

export function RichTextEditor({
    content,
    onChange,
    insertContent,
    onInsertComplete,
    placeholder = 'Энд бичнэ үү...',
    className,
    minHeight = 400,
    extraToolbar,
    beforeContent,
    afterContent,
    paperMode = false,
}: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            // StarterKit v3 нь underline-ыг багтаасан тул дотроос нь disable
            // хийж тусдаа Underline extension-ийг ашиглана (давхардлыг арилгана)
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                // StarterKit v3-д underline аль хэдийн багтсан — давхардал болохгүй
                // (тусдаа `Underline` extension хасав)
            }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Highlight.configure({ multicolor: true }),
            Placeholder.configure({ placeholder }),
            TextStyle,
            FontFamily.configure({ types: ['textStyle'] }),
            FontSize,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none p-4',
                style: `min-height: ${minHeight}px`,
            },
            // Tab/Shift+Tab → текстийн эхэнд entry-р зай нэмэх / хасах.
            // Office word processor-ын стандарт зан төлөвтэй ижил —
            // фокус солилгүй, мөрийн эхэнд 4 non-breaking space (NBSP)
            // оруулна. List дотор Tab нь list-ийн өөрийн nesting-ийг
            // ашигладаг тул бид default-д нь буцаана (false).
            handleKeyDown: (view, event) => {
                if (event.key !== 'Tab') return false;

                // List context-д Tiptap өөрөө sinkListItem/liftListItem
                // дуудна — interfere хийхгүй.
                const $from = view.state.selection.$from;
                for (let d = $from.depth; d > 0; d--) {
                    const nodeName = $from.node(d).type.name;
                    if (nodeName === 'listItem' || nodeName === 'taskItem') {
                        return false;
                    }
                }

                event.preventDefault();
                const INDENT = '    ';
                if (event.shiftKey) {
                    // Shift+Tab — мөрийн эхэнд indent байвал хасна
                    const { from } = view.state.selection;
                    const para = $from.parent;
                    const paraStart = from - $from.parentOffset;
                    const lineText = para.textBetween(0, $from.parentOffset, undefined, '\n');
                    if (lineText.startsWith(INDENT)) {
                        view.dispatch(
                            view.state.tr.delete(paraStart, paraStart + INDENT.length),
                        );
                    }
                    return true;
                }

                // Tab — курсорын байрлалд indent оруулна
                view.dispatch(view.state.tr.insertText(INDENT));
                return true;
            },
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, { emitUpdate: false });
        }
    }, [content, editor]);

    useEffect(() => {
        if (editor && insertContent) {
            editor.chain().focus().insertContent(insertContent).run();
            onInsertComplete?.();
        }
    }, [editor, insertContent, onInsertComplete]);

    // ─── paperMode: visual page-break indicator-ууд ────────────────────
    // Бодит pagination биш — content-ийг salaadhgüй, гэхдээ зорилт болгон
    // хэвлэхэд хуудас хаагуур таслагдахыг харуулна.
    const PAGE_HEIGHT_PX = 29.7 * 37.795;
    const PADDING_TOP_PX = 2 * 37.795;
    const PADDING_BOTTOM_PX = 1.5 * 37.795;
    const PAGE_INNER_HEIGHT = PAGE_HEIGHT_PX - PADDING_TOP_PX - PADDING_BOTTOM_PX;
    const paperRef = useRef<HTMLDivElement>(null);
    const [pageCount, setPageCount] = useState(1);

    useEffect(() => {
        if (!paperMode) return;
        const node = paperRef.current;
        if (!node) return;
        const measure = () => {
            const inner = node.scrollHeight - PADDING_TOP_PX - PADDING_BOTTOM_PX;
            const pages = Math.max(1, Math.ceil(inner / PAGE_INNER_HEIGHT));
            setPageCount(prev => (prev !== pages ? pages : prev));
        };
        measure();
        const obs = new ResizeObserver(measure);
        obs.observe(node);
        return () => obs.disconnect();
    }, [paperMode, editor, PAGE_INNER_HEIGHT, PADDING_TOP_PX, PADDING_BOTTOM_PX]);

    if (!editor) {
        return (
            <div className="h-[500px] flex items-center justify-center bg-slate-50 rounded-lg border">
                <div className="animate-pulse text-muted-foreground">Ачаалж байна...</div>
            </div>
        );
    }

    return (
        <div className={cn('border rounded-lg overflow-hidden bg-white flex flex-col min-h-0', className)}>
            <div className="border-b bg-slate-50/80 p-2 flex flex-wrap items-center gap-1 shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="h-8 w-8 p-0" title="Буцаах">
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="h-8 w-8 p-0" title="Дахин хийх">
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="mx-1 h-6" />

                <Select
                    value={
                        (editor.getAttributes('textStyle').fontFamily as string)?.includes('Times')
                            ? 'times'
                            : 'arial'
                    }
                    onValueChange={(value) => {
                        const family =
                            value === 'times'
                                ? 'Times New Roman, Times, serif'
                                : 'Arial, sans-serif';
                        editor.chain().focus().setFontFamily(family).run();
                    }}
                >
                    <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="arial">Arial</SelectItem>
                        <SelectItem value="times">Times New Roman</SelectItem>
                    </SelectContent>
                </Select>

                <Separator orientation="vertical" className="mx-1 h-6" />

                <Select
                    value={
                        (editor.getAttributes('textStyle').fontSize as string)?.replace(/px$/, '') ||
                        DEFAULT_FONT_SIZE
                    }
                    onValueChange={(value) => {
                        editor.chain().focus().setFontSize(`${value}px`).run();
                    }}
                >
                    <SelectTrigger className="w-20 h-8 text-xs" title="Фонтны хэмжээ">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[80px]">
                        {FONT_SIZES.map(size => (
                            <SelectItem key={size} value={size}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Separator orientation="vertical" className="mx-1 h-6" />

                <div className="flex items-center gap-0.5">
                    <Button variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className="h-8 w-8 p-0" title="Тод (Ctrl+B)">
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className="h-8 w-8 p-0" title="Налуу (Ctrl+I)">
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button variant={editor.isActive('underline') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className="h-8 w-8 p-0" title="Доогуур зураас (Ctrl+U)">
                        <UnderlineIcon className="h-4 w-4" />
                    </Button>
                    <Button variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleStrike().run()} className="h-8 w-8 p-0" title="Зураас татсан">
                        <Strikethrough className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="mx-1 h-6" />

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
                                    type="button"
                                    className="w-6 h-6 rounded border hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                    onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                                />
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                <Separator orientation="vertical" className="mx-1 h-6" />

                <div className="flex items-center gap-0.5">
                    <Button variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setTextAlign('left').run()} className="h-8 w-8 p-0" title="Зүүн">
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setTextAlign('center').run()} className="h-8 w-8 p-0" title="Төв">
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().setTextAlign('right').run()} className="h-8 w-8 p-0" title="Баруун">
                        <AlignRight className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="mx-1 h-6" />

                <div className="flex items-center gap-0.5">
                    <Button variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className="h-8 w-8 p-0" title="Жагсаалт">
                        <List className="h-4 w-4" />
                    </Button>
                    <Button variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="h-8 w-8 p-0" title="Дугаарласан жагсаалт">
                        <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'} size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className="h-8 w-8 p-0" title="Ишлэл">
                        <Quote className="h-4 w-4" />
                    </Button>
                </div>

                {extraToolbar && (
                    <>
                        <Separator orientation="vertical" className="mx-1 h-6" />
                        <div className="flex items-center gap-1 ml-auto">
                            {extraToolbar(editor)}
                        </div>
                    </>
                )}
            </div>

            {paperMode ? (
                <div
                    className="flex-1 min-h-0 overflow-auto bg-slate-100 dark:bg-slate-900 py-6"
                    style={{ fontFamily: 'Arial, sans-serif' }}
                >
                    <div className="mx-auto relative" style={{ width: '21cm' }}>
                        <div
                            ref={paperRef}
                            className={cn(
                                'bg-white shadow-md ring-1 ring-slate-200 relative',
                                '[&_.ProseMirror]:!p-0 [&_.ProseMirror]:!min-h-0',
                                '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
                                '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
                                '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
                                '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
                            )}
                            style={{
                                width: '21cm',
                                minHeight: '29.7cm',
                                paddingLeft: '1.5cm',
                                paddingRight: '1.5cm',
                                paddingTop: '2cm',
                                paddingBottom: '1.5cm',
                            }}
                        >
                            {/* Хуудас хоорондын visual indicator — content-н доор үргэлжлэн */}
                            {pageCount > 1 &&
                                Array.from({ length: pageCount - 1 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute left-0 right-0 pointer-events-none border-t border-dashed border-slate-300 z-0"
                                        style={{
                                            top: `${PADDING_TOP_PX + (i + 1) * PAGE_INNER_HEIGHT}px`,
                                        }}
                                        aria-hidden="true"
                                    >
                                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-100 dark:bg-slate-900 px-2 text-[10px] text-muted-foreground tabular-nums select-none">
                                            ── Хуудас {i + 2} ──
                                        </span>
                                    </div>
                                ))}

                            {beforeContent}
                            <EditorContent editor={editor} />
                            {afterContent}
                        </div>

                        {/* Хуудасны үзүүлэлт — paper-ын баруун margin-аас гадна floating */}
                        {pageCount > 1 &&
                            Array.from({ length: pageCount }).map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute pointer-events-none select-none text-[10px] font-medium text-muted-foreground tabular-nums bg-white border border-slate-200 rounded shadow-sm px-1.5 py-0.5"
                                    style={{
                                        top: `${PADDING_TOP_PX + i * PAGE_INNER_HEIGHT + 8}px`,
                                        right: '-3.75rem',
                                    }}
                                    aria-hidden="true"
                                >
                                    {i + 1} / {pageCount}
                                </div>
                            ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 overflow-auto">
                    {beforeContent}
                    <EditorContent
                        editor={editor}
                        className="[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
                    />
                    {afterContent}
                </div>
            )}
        </div>
    );
}
