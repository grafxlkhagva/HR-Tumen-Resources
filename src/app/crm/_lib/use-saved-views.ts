'use client';

import * as React from 'react';

/**
 * Нэрлэсэн шүүлтүүр (view)-ийг localStorage-д хадгалах ерөнхий hook.
 * Жагсаалт бүр өөрийн key-тэй; state нь дурын serializable объект.
 */

export interface SavedView<T> {
    id: string;
    name: string;
    state: T;
}

function storageKey(key: string): string {
    return `crm-views:${key}`;
}

export function useSavedViews<T>(key: string) {
    const [views, setViews] = React.useState<SavedView<T>[]>([]);

    // Ачаалах
    React.useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey(key));
            if (raw) setViews(JSON.parse(raw));
        } catch {
            /* localStorage байхгүй/эвдэрсэн — тоохгүй */
        }
    }, [key]);

    const persist = React.useCallback(
        (next: SavedView<T>[]) => {
            setViews(next);
            try {
                localStorage.setItem(storageKey(key), JSON.stringify(next));
            } catch {
                /* тоохгүй */
            }
        },
        [key],
    );

    const saveView = React.useCallback(
        (name: string, state: T) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
            // Ижил нэртэй байвал шинэчилнэ
            const existing = views.find((v) => v.name === trimmed);
            if (existing) {
                persist(views.map((v) => (v.id === existing.id ? { ...v, state } : v)));
            } else {
                persist([...views, { id, name: trimmed, state }]);
            }
        },
        [views, persist],
    );

    const deleteView = React.useCallback(
        (id: string) => persist(views.filter((v) => v.id !== id)),
        [views, persist],
    );

    return { views, saveView, deleteView };
}
