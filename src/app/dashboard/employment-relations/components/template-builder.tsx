'use client';

import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { DynamicFieldSelector } from './dynamic-field-selector';
import { Label } from '@/components/ui/label';

interface TemplateBuilderProps {
    content: string;
    onChange: (content: string) => void;
    resolvers?: Record<string, string>; // Map of {{field}} -> "Real Value"
}

export function TemplateBuilder({ content, onChange, resolvers }: TemplateBuilderProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInsertField = (field: string) => {
        // If resolvers exist and contain the field, insert the real value. Otherwise insert the placeholder.
        const textToInsert = (resolvers && resolvers[field]) ? resolvers[field] : field;

        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        const newContent = before + textToInsert + after;
        onChange(newContent);

        // Restore cursor position after update
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
        }, 0);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>Загварын агуулга</Label>
                <DynamicFieldSelector onSelect={handleInsertField} />
            </div>

            <Card className="border-muted bg-slate-50/50">
                <CardContent className="p-0">
                    <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        className="min-h-[500px] font-mono text-sm leading-relaxed p-6 resize-y border-none focus-visible:ring-0 bg-transparent"
                        placeholder="Загварын агуулгыг энд бичнэ үү..."
                    />
                </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground">
                Тайлбар: Та <code>{'{{dynamic.field}}'}</code> хэлбэрээр динамик талбаруудыг ашиглах боломжтой.
            </div>
        </div>
    );
}
