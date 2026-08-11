'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface InlineEditProps {
    /** Одоогийн raw утга (инпутэд харагдана). */
    value: string;
    /** Харуулах хэлбэр (хоосон бол —). */
    display?: React.ReactNode;
    type?: 'text' | 'number';
    placeholder?: string;
    className?: string;
    onSave: (raw: string) => void;
}

/** Дарж засварлах нүд — blur/Enter дээр хадгална, Escape дээр буцаана. */
export function InlineEdit({
    value,
    display,
    type = 'text',
    placeholder,
    className,
    onSave,
}: InlineEditProps) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(value);

    const commit = React.useCallback(() => {
        setEditing(false);
        if (draft.trim() !== value.trim()) onSave(draft.trim());
    }, [draft, value, onSave]);

    if (editing) {
        return (
            <Input
                autoFocus
                type={type}
                value={draft}
                placeholder={placeholder}
                className="h-7 w-full min-w-[90px] px-2 text-xs"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        commit();
                    } else if (e.key === 'Escape') {
                        setDraft(value);
                        setEditing(false);
                    }
                }}
            />
        );
    }

    return (
        <button
            type="button"
            title="Дарж засах"
            className={cn(
                'w-full cursor-text rounded px-1 py-0.5 text-left text-sm hover:bg-muted/60',
                className,
            )}
            onClick={(e) => {
                e.stopPropagation();
                setDraft(value);
                setEditing(true);
            }}
        >
            {display ?? (value || <span className="text-muted-foreground">—</span>)}
        </button>
    );
}
