'use client';
/**
 * EditableField — uncontrolled contentEditable wrapper.
 *
 * Committing happens on blur (or Enter in single-line mode) to avoid cursor jumps
 * that would occur if the parent re-rendered the DOM on every keystroke.
 */
import React, { useEffect, useRef } from 'react';

export interface EditableFieldProps {
    value: string;
    onCommit: (next: string) => void;
    multiline?: boolean;
    placeholder?: string;
    className?: string;
    as?: 'span' | 'div' | 'p';
    /** Optional extra style applied only while editable (e.g. min-width). */
    editableStyle?: React.CSSProperties;
}

export function EditableField({
    value,
    onCommit,
    multiline = false,
    placeholder,
    className,
    as = 'span',
    editableStyle,
}: EditableFieldProps) {
    const ref = useRef<HTMLElement | null>(null);
    const valueRef = useRef(value);

    // Keep latest value in ref for blur-time diff
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    // Only sync DOM text from prop when NOT focused (so typing isn't clobbered)
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (document.activeElement === el) return;
        const current = multiline ? el.innerText : (el.textContent ?? '');
        if (current !== value) {
            if (multiline) el.innerText = value || '';
            else el.textContent = value || '';
        }
    }, [value, multiline]);

    const handleBlur = () => {
        const el = ref.current;
        if (!el) return;
        const next = multiline ? el.innerText.replace(/\u00A0/g, ' ') : (el.textContent ?? '').trim();
        if (next !== valueRef.current) onCommit(next);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Single-line: Enter commits + blurs
        if (!multiline && e.key === 'Enter') {
            e.preventDefault();
            (e.currentTarget as HTMLElement).blur();
        }
        // Escape cancels (reset DOM to value) and blurs
        if (e.key === 'Escape') {
            e.preventDefault();
            const el = ref.current;
            if (el) {
                if (multiline) el.innerText = valueRef.current || '';
                else el.textContent = valueRef.current || '';
            }
            (e.currentTarget as HTMLElement).blur();
        }
    };

    const setRef = (node: HTMLElement | null) => {
        ref.current = node;
    };

    const commonProps = {
        ref: setRef as React.Ref<HTMLElement>,
        contentEditable: true,
        suppressContentEditableWarning: true,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
        className: ['ob-editable', value ? '' : 'ob-editable--empty', className].filter(Boolean).join(' '),
        'data-placeholder': placeholder,
        style: {
            whiteSpace: multiline ? ('pre-wrap' as const) : undefined,
            outline: 'none',
            ...editableStyle,
        },
        spellCheck: false,
    };

    if (as === 'div') return <div {...(commonProps as any)} />;
    if (as === 'p') return <p {...(commonProps as any)} />;
    return <span {...(commonProps as any)} />;
}
