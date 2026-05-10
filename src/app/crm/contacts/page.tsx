'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Users, Mail, Phone } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { LifecycleBadge } from '../_components/lifecycle-badge';
import type { Contact, Company } from '../_types';
import type { Employee } from '@/types';
import { NewContactDialog } from './new-contact-dialog';

function fullName(c: Contact) {
    const parts = [c.lastName, c.firstName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : c.email || '—';
}

function initials(c: Contact) {
    const f = (c.firstName || '').charAt(0);
    const l = (c.lastName || '').charAt(0);
    if (f || l) return `${l}${f}`.toUpperCase();
    return (c.email || '?').charAt(0).toUpperCase();
}

export default function CrmContactsPage() {
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    const contactsQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_contacts'), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: contacts, isLoading } = useCollection<Contact>(contactsQuery);

    const companiesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_companies') : null),
        [firestore],
    );
    const { data: companies } = useCollection<Company>(companiesRef);

    const employeesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'employees') : null),
        [firestore],
    );
    const { data: employees } = useCollection<Employee>(employeesRef);

    const companyMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (companies || []).forEach((c) => map.set(c.id, c.name));
        return map;
    }, [companies]);

    const employeeMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (employees || []).forEach((e) => {
            const name = [e.lastName, e.firstName].filter(Boolean).join(' ').trim();
            map.set(e.id, name || e.email || e.id);
        });
        return map;
    }, [employees]);

    const filtered = React.useMemo(() => {
        const list = contacts || [];
        const t = searchTerm.trim().toLowerCase();
        if (!t) return list;
        return list.filter((c) => {
            const haystack = [c.firstName, c.lastName, c.email, c.phone, c.jobTitle]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(t);
        });
    }, [contacts, searchTerm]);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Харилцагчид</h1>
                    <p className="text-xs text-muted-foreground">
                        {contacts ? `${contacts.length} бичлэг` : 'Ачаалж байна...'}
                    </p>
                </div>
                <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ харилцагч
                </Button>
            </header>

            <div className="flex items-center gap-3 border-b px-6 py-3 bg-muted/20">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Нэр, имэйл, утсаар хайх..."
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        hasSearch={searchTerm.trim().length > 0}
                        onAdd={() => setIsAddOpen(true)}
                    />
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="w-[260px]">Нэр</TableHead>
                                <TableHead>Имэйл</TableHead>
                                <TableHead>Утас</TableHead>
                                <TableHead>Байгууллага</TableHead>
                                <TableHead>Lifecycle</TableHead>
                                <TableHead>Эзэмшигч</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((c) => (
                                <TableRow key={c.id} className="hover:bg-muted/30 cursor-pointer">
                                    <TableCell>
                                        <Link
                                            href={`/crm/contacts/${c.id}`}
                                            className="flex items-center gap-3 group"
                                        >
                                            <Avatar className="h-8 w-8 rounded-full">
                                                <AvatarFallback className="text-[11px] bg-cyan-100 text-cyan-700">
                                                    {initials(c)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium group-hover:text-cyan-700">
                                                    {fullName(c)}
                                                </div>
                                                {c.jobTitle && (
                                                    <div className="text-[11px] text-muted-foreground truncate">
                                                        {c.jobTitle}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {c.email ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Mail className="h-3.5 w-3.5" />
                                                {c.email}
                                            </span>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {c.phone ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Phone className="h-3.5 w-3.5" />
                                                {c.phone}
                                            </span>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {c.companyId
                                            ? companyMap.get(c.companyId) || '—'
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <LifecycleBadge stage={c.lifecycleStage} />
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {c.ownerId ? employeeMap.get(c.ownerId) || '—' : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <NewContactDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>
    );
}

function EmptyState({
    hasSearch,
    onAdd,
}: {
    hasSearch: boolean;
    onAdd: () => void;
}) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <Users className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">
                    {hasSearch ? 'Хайлтад тохирох харилцагч олдсонгүй' : 'Харилцагч байхгүй байна'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {hasSearch
                        ? 'Өөр түлхүүр үг туршиж үзнэ үү.'
                        : 'Эхний харилцагчаа нэмж эхлээрэй.'}
                </p>
                {!hasSearch && (
                    <Button
                        size="sm"
                        className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={onAdd}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Шинэ харилцагч
                    </Button>
                )}
            </div>
        </div>
    );
}
