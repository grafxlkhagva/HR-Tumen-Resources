'use client';

import * as React from 'react';
import { Input } from './input';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Shared save / cancel bar ─────────────────────────────────────────────────

function SaveBar({
    onSave,
    onCancel,
    isSaving,
}: {
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    return (
        <div className="flex items-center gap-2 mt-2">
            <Button size="sm" className="h-7 text-caption px-3 text-primary-foreground" onClick={onSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                Хадгалах
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-caption px-3" onClick={onCancel} disabled={isSaving}>
                Цуцлах
            </Button>
        </div>
    );
}

// ─── SettingRow — uncontrolled text input ─────────────────────────────────────

interface SettingRowProps {
    label: string;
    hint?: string;
    className?: string;
    value: string;
    placeholder?: string;
    inputClassName?: string;
    onSave: (value: string) => Promise<void>;
    onCancel?: () => void;
    disabled?: boolean;
}

export function SettingRow({
    label,
    hint,
    className,
    value,
    placeholder,
    inputClassName,
    onSave,
    onCancel,
    disabled,
}: SettingRowProps) {
    const [draft, setDraft] = React.useState(value);
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setDraft(value);
        setError(null);
    }, [value]);

    const isDirty = draft.trim() !== value.trim();

    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        setError(null);
        setIsSaving(true);
        try {
            await onSave(draft.trim());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа');
            setDraft(value);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setDraft(value);
        setError(null);
        onCancel?.();
    };

    return (
        <div className={cn('flex items-start gap-4 py-3', className)}>
            <div className="w-28 shrink-0 pt-2">
                <span className="text-menu text-muted-foreground">{label}</span>
                {hint && <p className="text-micro text-muted-foreground/70 mt-0.5 leading-snug">{hint}</p>}
            </div>
            <div className="flex-1 min-w-0">
                <Input
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); setError(null); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
                        if (e.key === 'Escape') handleCancel();
                    }}
                    placeholder={placeholder}
                    disabled={disabled || isSaving}
                    className={cn(
                        'border-0 bg-transparent shadow-none px-0 h-8 text-menu',
                        'focus-visible:ring-0 focus-visible:outline-none',
                        'rounded-none border-b border-transparent focus-visible:border-input transition-colors',
                        inputClassName,
                    )}
                />
                {error && <p className="text-caption text-error mt-1">{error}</p>}
                {isDirty && <SaveBar onSave={handleSave} onCancel={handleCancel} isSaving={isSaving} />}
            </div>
        </div>
    );
}

// ─── SettingRowField — controlled generic field ───────────────────────────────
// Manages its own draft state; caller provides renderInput + onSave.

interface SettingRowFieldProps<T> {
    label: string;
    hint?: string;
    className?: string;
    value: T;
    onSave: (draft: T) => Promise<void>;
    renderInput: (draft: T, setDraft: (v: T) => void) => React.ReactNode;
    equal?: (a: T, b: T) => boolean;
}

export function SettingRowField<T>({
    label,
    hint,
    className,
    value,
    onSave,
    renderInput,
    equal,
}: SettingRowFieldProps<T>) {
    const [draft, setDraft] = React.useState<T>(value);
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(value)]);

    const isDirty = equal ? !equal(draft, value) : draft !== value;

    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        setIsSaving(true);
        try { await onSave(draft); } finally { setIsSaving(false); }
    };

    const handleCancel = () => setDraft(value);

    return (
        <div className={cn('flex items-start gap-4 py-3', className)}>
            <div className="w-28 shrink-0 pt-2">
                <span className="text-menu text-muted-foreground">{label}</span>
                {hint && <p className="text-micro text-muted-foreground/70 mt-0.5 leading-snug">{hint}</p>}
            </div>
            <div className="flex-1 min-w-0">
                {renderInput(draft, setDraft)}
                {isDirty && <SaveBar onSave={handleSave} onCancel={handleCancel} isSaving={isSaving} />}
            </div>
        </div>
    );
}

// ─── SettingRowToggle — instant-save checkbox ─────────────────────────────────

interface SettingRowToggleProps {
    label: string;
    hint?: string;
    className?: string;
    checked: boolean;
    onToggle: (checked: boolean) => Promise<void>;
    description?: string;
}

export function SettingRowToggle({
    label,
    hint,
    className,
    checked,
    onToggle,
    description,
}: SettingRowToggleProps) {
    const [isSaving, setIsSaving] = React.useState(false);

    const handleChange = async (v: boolean | 'indeterminate') => {
        if (v === 'indeterminate') return;
        setIsSaving(true);
        try { await onToggle(v); } finally { setIsSaving(false); }
    };

    return (
        <div className={cn('flex items-center gap-4 py-3 border-b last:border-0', className)}>
            <div className="w-40 shrink-0">
                <span className="text-menu text-muted-foreground">{label}</span>
                {hint && <p className="text-micro text-muted-foreground/70 mt-0.5 leading-snug">{hint}</p>}
            </div>
            <div className="flex items-center gap-2.5">
                <Checkbox
                    checked={checked}
                    onCheckedChange={handleChange}
                    disabled={isSaving}
                />
                {description && <span className="text-menu text-foreground">{description}</span>}
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
        </div>
    );
}

// ─── SettingGroup — grouped fields with a single save bar ─────────────────────
//
// Use when multiple fields belong to one logical record (e.g. one education entry).
// All edits accumulate in a shared draft; a single Хадгалах / Цуцлах bar appears
// when any field differs from the saved value.
//
// Usage:
//   <SettingGroup value={record} onSave={async (draft) => save(draft)}>
//     {(draft, setField) => (
//       <>
//         <GroupRow label="Улс"><Select value={draft.country} onValueChange={v => setField('country', v)} /></GroupRow>
//         <GroupRow label="Нэр"><Input value={draft.name} onChange={e => setField('name', e.target.value)} /></GroupRow>
//       </>
//     )}
//   </SettingGroup>

interface SettingGroupProps<T> {
    value: T;
    onSave: (draft: T) => Promise<void>;
    /** Render prop — receives current draft and a setField helper */
    children: (
        draft: T,
        setField: <K extends keyof T>(key: K, val: T[K]) => void,
    ) => React.ReactNode;
    className?: string;
    /** Gray out + block interaction (e.g. notApplicable) */
    disabled?: boolean;
}

export function SettingGroup<T>({
    value,
    onSave,
    children,
    className,
    disabled,
}: SettingGroupProps<T>) {
    const [draft, setDraftState] = React.useState<T>(value);
    const [isSaving, setIsSaving] = React.useState(false);

    // Sync draft when external value changes (data load / save confirmation)
    React.useEffect(() => {
        setDraftState(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(value)]);

    const isDirty = JSON.stringify(draft) !== JSON.stringify(value);

    const setField = React.useCallback(<K extends keyof T>(key: K, val: T[K]) => {
        setDraftState(prev => ({ ...prev, [key]: val }));
    }, []);

    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        setIsSaving(true);
        try { await onSave(draft); } finally { setIsSaving(false); }
    };

    const handleCancel = () => setDraftState(value);

    return (
        <div className={cn(className, disabled && 'pointer-events-none opacity-40')}>
            {children(draft, setField)}
            {isDirty && !disabled && (
                <div className="flex items-center gap-2 pt-3 border-t mt-1">
                    <Button size="sm" className="h-7 text-caption px-3 text-primary-foreground" onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                        Хадгалах
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-caption px-3" onClick={handleCancel} disabled={isSaving}>
                        Цуцлах
                    </Button>
                </div>
            )}
        </div>
    );
}

// ─── GroupRow — label + content row for use inside SettingGroup ───────────────
// Same visual layout as SettingRow but without any save logic.

interface GroupRowProps {
    label: string;
    hint?: string;
    className?: string;
    children: React.ReactNode;
}

export function GroupRow({ label, hint, className, children }: GroupRowProps) {
    return (
        <div className={cn('flex items-start gap-4 py-3', className)}>
            <div className="w-28 shrink-0 pt-2">
                <span className="text-menu text-muted-foreground">{label}</span>
                {hint && <p className="text-micro text-muted-foreground/70 mt-0.5 leading-snug">{hint}</p>}
            </div>
            <div className="flex-1 min-w-0">
                {children}
            </div>
        </div>
    );
}
