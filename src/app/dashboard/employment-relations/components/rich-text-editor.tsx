'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
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

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    insertContent?: string | null; // When this changes, insert it into the editor
    onInsertComplete?: () => void; // Called after content is inserted
    placeholder?: string;
    className?: string;
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
    className
}: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight.configure({
                multicolor: true,
            }),
            Placeholder.configure({
                placeholder,
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] p-4',
            },
        },
    });

    // Sync content from outside
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content, false);
        }
    }, [content, editor]);

    // Handle insertContent prop - insert content at cursor position
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
        <div className={cn("border rounded-lg overflow-hidden bg-white", className)}>
            {/* Toolbar */}
            <div className="border-b bg-slate-50/80 p-2 flex flex-wrap items-center gap-1">
                {/* Undo/Redo */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        className="h-8 w-8 p-0"
                        title="Буцаах"
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className="h-8 w-8 p-0"
                        title="Дахин хийх"
                    >
                        <Redo className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="mx-1 h-6" />

                {/* Heading */}
                <Select
                    value={
                        editor.isActive('heading', { level: 1 }) ? 'h1' :
                        editor.isActive('heading', { level: 2 }) ? 'h2' :
                        editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
                    }
                    onValueChange={(value) => {
                        if (value === 'p') {
                            editor.chain().focus().setParagraph().run();
                        } else {
                            const level = parseInt(value.replace('h', '')) as 1 | 2 | 3;
                            editor.chain().focus().toggleHeading({ level }).run();
                        }
                    }}
                >
                    <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="p">Энгийн текст</SelectItem>
                        <SelectItem value="h1">Гарчиг 1</SelectItem>
                        <SelectItem value="h2">Гарчиг 2</SelectItem>
                        <SelectItem value="h3">Гарчиг 3</SelectItem>
                    </SelectContent>
                </Select>

                <Separator orientation="vertical" className="mx-1 h-6" />

                {/* Text formatting */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className="h-8 w-8 p-0"
                        title="Тод (Ctrl+B)"
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className="h-8 w-8 p-0"
                        title="Налуу (Ctrl+I)"
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className="h-8 w-8 p-0"
                        title="Доогуур зураас (Ctrl+U)"
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className="h-8 w-8 p-0"
                        title="Зураас татсан"
                    >
                        <Strikethrough className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="mx-1 h-6" />

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
                    </PopoverContent>
                </Popover>

                <Separator orientation="vertical" className="mx-1 h-6" />

                {/* Alignment */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className="h-8 w-8 p-0"
                        title="Зүүн"
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className="h-8 w-8 p-0"
                        title="Төв"
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className="h-8 w-8 p-0"
                        title="Баруун"
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="mx-1 h-6" />

                {/* Lists */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className="h-8 w-8 p-0"
                        title="Жагсаалт"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className="h-8 w-8 p-0"
                        title="Дугаарласан жагсаалт"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className="h-8 w-8 p-0"
                        title="Ишлэл"
                    >
                        <Quote className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Editor Content */}
            <EditorContent 
                editor={editor} 
                className="min-h-[400px] [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
            />
        </div>
    );
}
