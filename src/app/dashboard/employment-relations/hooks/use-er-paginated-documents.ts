'use client';

/**
 * use-er-paginated-documents.ts
 *
 * Cursor-based pagination hook for ER document жагсаалт. Энэ нь өмнөх useFetchCollection
 * (бүх docs нэг дор татна) нөхцлийг сольж, эхлээд `pageSize` хэмжээгээр ачаалаад,
 * "Цааш ачаалах" товчоор `startAfter(cursor)`-аар дараагийн pageийг нэмж татна.
 *
 * Зорилго:
 *  - 10K+ баримттай компани дээр client OOM-ээс сэргийлэх
 *  - Initial load-ийн хурдыг сайжруулах
 *  - Memory footprint бууруулах
 *
 * Limitations:
 *  - Search/filter нь client-side хийгдэх тул хайлт зөвхөн ачаалагдсан data дотор
 *    ажиллана. Илүү гүн хайхын тулд "Бүгдийг ачаалах" товчийг ашиглана.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Firestore,
    Query,
    QueryDocumentSnapshot,
    DocumentData,
    getDocs,
    query,
    orderBy,
    limit,
    startAfter,
    CollectionReference,
} from 'firebase/firestore';
import type { ERDocument } from '../types';

export interface UsePaginatedERDocumentsParams {
    /** ER documents collection reference (tenant-scoped) */
    collectionRef: CollectionReference<DocumentData> | null;
    /** Хуудас бүрийн хэмжээ. Default: 50 */
    pageSize?: number;
    /** firestore instance — ачаалах нөхцөлийг гаргах гард */
    firestore: Firestore | null;
}

export interface UsePaginatedERDocumentsResult {
    documents: (ERDocument & { id: string })[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: Error | null;
    /** Дараагийн pageийг ачаалах */
    loadMore: () => Promise<void>;
    /** Жагсаалтыг бүхэлд нь сэргээх (visibility change, эсвэл шинээр create хийсний дараа) */
    refresh: () => Promise<void>;
}

export function useERPaginatedDocuments({
    collectionRef,
    pageSize = 50,
    firestore,
}: UsePaginatedERDocumentsParams): UsePaginatedERDocumentsResult {
    const [documents, setDocuments] = useState<(ERDocument & { id: string })[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const refreshTokenRef = useRef(0);

    // Initial load + refresh
    const loadFirstPage = useCallback(async () => {
        if (!firestore || !collectionRef) {
            setDocuments([]);
            setIsLoading(false);
            setHasMore(false);
            return;
        }

        const myToken = ++refreshTokenRef.current;
        setIsLoading(true);
        setError(null);

        try {
            const q = query(
                collectionRef as Query<DocumentData>,
                orderBy('createdAt', 'desc'),
                limit(pageSize),
            );
            const snap = await getDocs(q);

            // Stale check — refresh дундуур шинэ refresh болсон бол хуучин үр дүнг хаяна
            if (myToken !== refreshTokenRef.current) return;

            const docs = snap.docs.map((d) => ({
                ...(d.data() as ERDocument),
                id: d.id,
            }));
            cursorRef.current = snap.docs[snap.docs.length - 1] || null;
            setDocuments(docs);
            setHasMore(snap.docs.length === pageSize);
        } catch (e) {
            if (myToken !== refreshTokenRef.current) return;
            setError(e instanceof Error ? e : new Error('Жагсаалт ачаалахад алдаа гарлаа'));
        } finally {
            if (myToken === refreshTokenRef.current) {
                setIsLoading(false);
            }
        }
    }, [firestore, collectionRef, pageSize]);

    // Load more — cursor-based
    const loadMore = useCallback(async () => {
        if (!firestore || !collectionRef || !cursorRef.current || !hasMore || isLoadingMore) return;

        setIsLoadingMore(true);
        try {
            const q = query(
                collectionRef as Query<DocumentData>,
                orderBy('createdAt', 'desc'),
                startAfter(cursorRef.current),
                limit(pageSize),
            );
            const snap = await getDocs(q);
            const newDocs = snap.docs.map((d) => ({
                ...(d.data() as ERDocument),
                id: d.id,
            }));
            cursorRef.current = snap.docs[snap.docs.length - 1] || cursorRef.current;
            setDocuments((prev) => [...prev, ...newDocs]);
            setHasMore(snap.docs.length === pageSize);
        } catch (e) {
            setError(e instanceof Error ? e : new Error('Дараагийн хуудас ачаалахад алдаа гарлаа'));
        } finally {
            setIsLoadingMore(false);
        }
    }, [firestore, collectionRef, pageSize, hasMore, isLoadingMore]);

    const refresh = useCallback(async () => {
        cursorRef.current = null;
        setHasMore(true);
        await loadFirstPage();
    }, [loadFirstPage]);

    useEffect(() => {
        loadFirstPage();
        // collectionRef нь parent-аас memo хийгдсэн бөгөөд reference change л load
        // дахин ажиллуулна. pageSize-ийг өөрчлөвөл бас reload хийнэ.
    }, [loadFirstPage]);

    return {
        documents,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        loadMore,
        refresh,
    };
}
