'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Building2, Globe, Phone } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Company, Contact } from '../_types';
import type { Employee } from '@/types';
import { NewCompanyDialog } from './new-company-dialog';

export default function CrmCompaniesPage() {
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    const companiesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_companies'), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: companies, isLoading } = useCollection<Company>(companiesQuery);

    const contactsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_contacts') : null),
        [firestore],
    );
    const { data: contacts } = useCollection<Contact>(contactsRef);

    const employeesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'employees') : null),
        [firestore],
    );
    const { data: employees } = useCollection<Employee>(employeesRef);

    const employeeMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (employees || []).forEach((e) => {
            const name = [e.lastName, e.firstName].filter(Boolean).join(' ').trim();
            map.set(e.id, name || e.email || e.id);
        });
        return map;
    }, [employees]);

    const contactCountByCompany = React.useMemo(() => {
        const counts = new Map<string, number>();
        (contacts || []).forEach((c) => {
            if (!c.companyId) return;
            counts.set(c.companyId, (counts.get(c.companyId) || 0) + 1);
        });
        return counts;
    }, [contacts]);

    const filtered = React.useMemo(() => {
        const list = companies || [];
        const t = searchTerm.trim().toLowerCase();
        if (!t) return list;
        return list.filter((c) => {
            const haystack = [c.name, c.domain, c.industry, c.phone, c.website]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return haystack.includes(t);
        });
    }, [companies, searchTerm]);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Байгууллагууд</h1>
                    <p className="text-xs text-muted-foreground">
                        {companies ? `${companies.length} бичлэг` : 'Ачаалж байна...'}
                    </p>
                </div>
                <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Шинэ байгууллага
                </Button>
            </header>

            <div className="flex items-center gap-3 border-b px-6 py-3 bg-muted/20">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Нэр, domain, салбараар хайх..."
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
                                <TableHead className="w-[280px]">Нэр</TableHead>
                                <TableHead>Domain</TableHead>
                                <TableHead>Салбар</TableHead>
                                <TableHead>Утас</TableHead>
                                <TableHead className="text-right">Харилцагч</TableHead>
                                <TableHead>Эзэмшигч</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((c) => (
                                <TableRow key={c.id} className="hover:bg-muted/30 cursor-pointer">
                                    <TableCell>
                                        <Link
                                            href={`/crm/companies/${c.id}`}
                                            className="flex items-center gap-3 group"
                                        >
                                            <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                                                <Building2 className="h-4 w-4 text-cyan-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium group-hover:text-cyan-700 truncate">
                                                    {c.name}
                                                </div>
                                                {c.website && (
                                                    <div className="text-[11px] text-muted-foreground truncate">
                                                        {c.website}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {c.domain ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Globe className="h-3.5 w-3.5" />
                                                {c.domain}
                                            </span>
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {c.industry || '—'}
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
                                    <TableCell className="text-right text-sm font-medium">
                                        {contactCountByCompany.get(c.id) || 0}
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

            <NewCompanyDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
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
                    <Building2 className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">
                    {hasSearch
                        ? 'Хайлтад тохирох байгууллага олдсонгүй'
                        : 'Байгууллага байхгүй байна'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {hasSearch
                        ? 'Өөр түлхүүр үг туршиж үзнэ үү.'
                        : 'Эхний байгууллагаа нэмж эхлээрэй.'}
                </p>
                {!hasSearch && (
                    <Button
                        size="sm"
                        className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={onAdd}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Шинэ байгууллага
                    </Button>
                )}
            </div>
        </div>
    );
}
