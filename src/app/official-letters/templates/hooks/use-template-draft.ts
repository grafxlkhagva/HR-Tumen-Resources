'use client';

import { useEffect, useRef, useState } from 'react';
import { OfficialLetterConfig } from '../../types';

export interface TemplateDraft {
    name: string;
    config: Partial<OfficialLetterConfig>;
    savedAt: number;
}

const DRAFT_PREFIX = 'official-letter-template-draft';

function key(userId: string | null | undefined, scope: string): string {
    return `${DRAFT_PREFIX}-${userId || 'anon'}-${scope}`;
}

export function loadDraft(userId: string | null | undefined, scope: string): TemplateDraft | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key(userId, scope));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as TemplateDraft;
        if (!parsed || typeof parsed !== 'object' || !parsed.config) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearDraft(userId: string | null | undefined, scope: string) {
    if (typeof window === 'undefined') return;
    try { window.localStorage.removeItem(key(userId, scope)); } catch {}
}

interface UseTemplateDraftAutoSaveArgs {
    userId: string | null | undefined;
    scope: string;
    name: string;
    config: Partial<OfficialLetterConfig>;
    enabled: boolean;
    debounceMs?: number;
}

export function useTemplateDraftAutoSave({
    userId,
    scope,
    name,
    config,
    enabled,
    debounceMs = 1500,
}: UseTemplateDraftAutoSaveArgs): { savedAt: number | null } {
    const [savedAt, setSavedAt] = useState<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            try {
                const draft: TemplateDraft = { name, config, savedAt: Date.now() };
                window.localStorage.setItem(key(userId, scope), JSON.stringify(draft));
                setSavedAt(draft.savedAt);
            } catch {}
        }, debounceMs);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [userId, scope, name, config, enabled, debounceMs]);

    return { savedAt };
}
