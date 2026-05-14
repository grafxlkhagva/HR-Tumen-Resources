'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    query,
    orderBy,
    where,
    limit,
    startAfter,
    getDocs,
    getCountFromServer,
    updateDoc,
    Timestamp,
    type QueryDocumentSnapshot,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import { useTenantWrite } from '@/firebase/tenant-compat';
import { OfficialLetter, OfficialLetterStatus, STATUS_LABELS, STATUS_COLORS } from './types';
import { PageHeader } from '@/components/page-header';
import { AddActionButton } from '@/components/ui/add-action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, Archive, Eye, Copy, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';

const PAGE_SIZE = 50;

type LetterDoc = OfficialLetter & { id: string };

export default function OfficialLettersPage() {
    const { firestore } = useFirebase();
    const { tCollection, tDoc, companyPath } = useTenantWrite();
    const { user } = useUser();
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<OfficialLetterStatus | 'ALL'>('ALL');

    const [letters, setLetters] = useState<LetterDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [reachedEnd, setReachedEnd] = useState(false);
    const [counts, setCounts] = useState({ total: 0, draft: 0, sent: 0, archived: 0 });

    const buildQuery = useCallback(
        (cursorDoc: QueryDocumentSnapshot<DocumentData> | null) => {
            if (!firestore) return null;
            const base = tCollection('official_letters');
            const constraints: QueryConstraint[] = [];
            if (statusFilter !== 'ALL') constraints.push(where('status', '==', statusFilter));
            constraints.push(orderBy('createdAt', 'desc'));
            if (cursorDoc) constraints.push(startAfter(cursorDoc));
            constraints.push(limit(PAGE_SIZE));
            return query(base, ...constraints);
        },
        [firestore, statusFilter, tCollection]
    );

    // Load first page whenever filter changes
    useEffect(() => {
        if (!firestore) return;
        let cancelled = false;
        setIsLoading(true);
        setReachedEnd(false);
        const q = buildQuery(null);
        if (!q) return;
        getDocs(q)
            .then((snap) => {
                if (cancelled) return;
                const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as LetterDoc[];
                setLetters(docs);
                setCursor(snap.docs[snap.docs.length - 1] ?? null);
                if (snap.docs.length < PAGE_SIZE) setReachedEnd(true);
            })
            .catch(err => {
                console.error('[official-letters/list]', err);
                toast({ title: 'Бичгүүдийг татахад алдаа гарлаа', variant: 'destructive' });
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [buildQuery, firestore, toast]);

    // Load counts (independent — uses aggregate queries, cheap)
    useEffect(() => {
        if (!firestore) return;
        let cancelled = false;
        const base = tCollection('official_letters');
        const byStatus = (s: OfficialLetterStatus) => getCountFromServer(query(base, where('status', '==', s)));
        Promise.all([
            getCountFromServer(base),
            byStatus('DRAFT'),
            byStatus('SENT'),
            byStatus('ARCHIVED'),
        ])
            .then(([total, draft, sent, archived]) => {
                if (cancelled) return;
                setCounts({
                    total: total.data().count,
                    draft: draft.data().count,
                    sent: sent.data().count,
                    archived: archived.data().count,
                });
            })
            .catch(err => console.warn('[official-letters/count]', err));
        return () => { cancelled = true; };
    }, [firestore, tCollection, letters.length]);

    const handleLoadMore = async () => {
        if (!cursor || isLoadingMore || reachedEnd) return;
        setIsLoadingMore(true);
        try {
            const q = buildQuery(cursor);
            if (!q) return;
            const snap = await getDocs(q);
            const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as LetterDoc[];
            setLetters(prev => [...prev, ...docs]);
            setCursor(snap.docs[snap.docs.length - 1] ?? cursor);
            if (snap.docs.length < PAGE_SIZE) setReachedEnd(true);
        } catch (err) {
            console.error('[official-letters/load-more]', err);
            toast({ title: 'Алдаа', variant: 'destructive' });
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Search filter (applied on loaded page only)
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return letters;
        return letters.filter(l =>
            l.letterNumber?.toLowerCase().includes(q) ||
            l.config?.subject?.toLowerCase().includes(q) ||
            l.config?.addresseeOrg?.toLowerCase().includes(q)
        );
    }, [letters, search]);

    const handleDuplicate = async (letter: LetterDoc) => {
        if (!firestore || !user) return;
        try {
            const { createOfficialLetter } = await import('./services/numbering');
            const newLetter = await createOfficialLetter(firestore, companyPath, {
                config: { ...letter.config },
                templateId: letter.templateId,
                createdBy: user.uid,
            });
            // Optimistic: refresh from start
            setLetters(prev => [newLetter as LetterDoc, ...prev]);
            toast({ title: 'Хувилагдлаа', description: `Шинэ дугаар: ${newLetter.letterNumber}` });
        } catch (err) {
            console.error('[official-letters/duplicate]', err);
            toast({ title: 'Хувилахад алдаа гарлаа', variant: 'destructive' });
        }
    };

    const handleArchive = async (id: string) => {
        try {
            await updateDoc(tDoc('official_letters', id), { status: 'ARCHIVED', updatedAt: Timestamp.now() });
            setLetters(prev => prev.map(l => l.id === id ? { ...l, status: 'ARCHIVED' } : l));
            toast({ title: 'Архивлагдлаа' });
        } catch (err) {
            console.error('[official-letters/archive]', err);
            toast({ title: 'Алдаа', variant: 'destructive' });
        }
    };

    const stats = useMemo(() => [
        { label: 'Нийт', value: counts.total, color: 'text-slate-700', filter: 'ALL' as const },
        { label: 'Ноорог', value: counts.draft, color: 'text-amber-600', filter: 'DRAFT' as const },
        { label: 'Илгээсэн', value: counts.sent, color: 'text-emerald-600', filter: 'SENT' as const },
        { label: 'Архив', value: counts.archived, color: 'text-gray-500', filter: 'ARCHIVED' as const },
    ], [counts]);

    return (
        <div className="flex flex-col h-full bg-slate-50/50 p-6 md:p-8 space-y-6 overflow-y-auto pb-20">
            <PageHeader
                title="Албан бичиг"
                description="Стандартын дагуу мэргэжлийн албан бланк удирдах систем"
                showBackButton hideBreadcrumbs backButtonPlacement="inline" backBehavior="history"
                fallbackBackHref="/dashboard"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/official-letters/templates">
                                <FileText className="h-4 w-4 mr-2" /> Загварууд
                            </Link>
                        </Button>
                        <AddActionButton label="Шинэ бичиг" href="/official-letters/create" />
                    </div>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {stats.map(s => (
                    <Card
                        key={s.label}
                        className={`cursor-pointer transition-all ${statusFilter === s.filter ? 'ring-2 ring-primary' : 'hover:shadow-sm'}`}
                        onClick={() => setStatusFilter(s.filter)}
                    >
                        <CardContent className="pt-4 pb-3 px-4">
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Дугаар, гарчиг, байгууллагаар хайх..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                {search && (
                    <p className="text-[11px] text-muted-foreground mt-1 ml-1">
                        Хайлт нь зөвхөн одоо ачаалагдсан {letters.length} бичгээр хийгдэнэ — үр дүн олдохгүй бол "Дараагийн" товчоор илүү олон бичиг ачаалаарай.
                    </p>
                )}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-10" />
                    <p className="text-muted-foreground">{search ? 'Хайлтын үр дүн олдсонгүй' : 'Одоогоор бичиг байхгүй байна'}</p>
                    {!search && <Button variant="outline" className="mt-4" asChild><Link href="/official-letters/create">Шинэ бичиг үүсгэх</Link></Button>}
                </div>
            ) : (
                <>
                    <div className="space-y-2">
                        {filtered.map(letter => (
                            <Card key={letter.id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-sm font-semibold">{letter.letterNumber || '—'}</span>
                                            <Badge className={STATUS_COLORS[letter.status]} variant="secondary">
                                                {STATUS_LABELS[letter.status]}
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-medium truncate mt-0.5">{letter.config?.subject || 'Гарчиггүй'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {letter.config?.addresseeOrg} · {letter.createdAt?.toDate ? format(letter.createdAt.toDate(), 'yyyy.MM.dd', { locale: mn }) : '—'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                            <Link href={`/official-letters/${letter.id}`}><Eye className="h-4 w-4" /></Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                            onClick={() => handleDuplicate(letter)} title="Хувилах">
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        {letter.status !== 'ARCHIVED' && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                                onClick={() => handleArchive(letter.id)} title="Архивлах">
                                                <Archive className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {!reachedEnd && (
                        <div className="flex justify-center pt-2">
                            <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isLoadingMore}>
                                {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Дараагийн {PAGE_SIZE}
                            </Button>
                        </div>
                    )}
                    {reachedEnd && letters.length >= PAGE_SIZE && (
                        <p className="text-center text-xs text-muted-foreground pt-2">Бүх бичиг ачаалагдсан</p>
                    )}
                </>
            )}
        </div>
    );
}
