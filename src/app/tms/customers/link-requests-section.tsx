'use client';

/**
 * Захиалагчийн апп-ын хэрэглэгчдийн байгууллага-холболтын хүсэлтүүд.
 * customer_users (linkStatus='pending') жагсаалт + tms_customers-той холбох.
 * Холболтыг /api/mobile/v1/staff/customer-users/{uid}/link (Admin SDK) хийдэг —
 * учир нь custom claims дахин оноох шаардлагатай.
 */

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { getJsonAuthHeaders } from '@/lib/api/client-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link2, X, UserRound } from 'lucide-react';
import { TMS_CUSTOMERS_COLLECTION } from '@/app/tms/types';
import type { TmsCustomer } from '@/app/tms/types';

interface PendingLinkUser {
    id: string;
    phone?: string;
    displayName?: string | null;
    registerNumber?: string | null;
    linkRequest?: { registerNumber?: string } | null;
}

export function LinkRequestsSection() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [busyUid, setBusyUid] = React.useState<string | null>(null);
    const [selections, setSelections] = React.useState<Record<string, string>>({});

    const pendingQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'customer_users'), where('linkStatus', '==', 'pending'))
                : null,
        [firestore],
    );
    const { data: pending, isLoading } = useCollection<PendingLinkUser>(pendingQuery);

    const customersQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, TMS_CUSTOMERS_COLLECTION) : null),
        [firestore],
    );
    const { data: customers } = useCollection<TmsCustomer>(customersQuery);

    if (isLoading || !pending || pending.length === 0) return null;

    const act = async (uid: string, body: Record<string, unknown>, okMsg: string) => {
        setBusyUid(uid);
        try {
            const res = await fetch(`/api/mobile/v1/staff/customer-users/${uid}/link`, {
                method: 'POST',
                headers: await getJsonAuthHeaders(),
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа');
            toast({ title: okMsg });
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: e instanceof Error ? e.message : 'Холболт амжилтгүй',
            });
        } finally {
            setBusyUid(null);
        }
    };

    return (
        <Card className="border-amber-300/60 dark:border-amber-700/50">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4" />
                    Апп-ын холболтын хүсэлт
                    <Badge variant="secondary">{pending.length}</Badge>
                </CardTitle>
                <CardDescription>
                    Захиалагчийн апп-ын хэрэглэгчид байгууллагатайгаа холбогдох хүсэлт илгээсэн.
                    Регистрийн дугаарыг шалгаад зөв байгууллагыг сонгож холбоно уу.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {pending.map((u) => {
                    const reqRegNo = u.linkRequest?.registerNumber || u.registerNumber || '';
                    // Регистрээр таарч буй байгууллагуудыг санал болгоно (автомат холбохгүй)
                    const suggested = (customers ?? []).filter(
                        (c) => reqRegNo && c.registerNumber && c.registerNumber === reqRegNo,
                    );
                    const options = suggested.length > 0 ? suggested : (customers ?? []);
                    const selected = selections[u.id] ?? suggested[0]?.id ?? '';
                    const busy = busyUid === u.id;

                    return (
                        <div
                            key={u.id}
                            className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <UserRound className="h-8 w-8 shrink-0 rounded-full bg-muted p-1.5 text-muted-foreground" />
                                <div className="min-w-0">
                                    <p className="truncate font-medium">
                                        {u.displayName || 'Нэргүй хэрэглэгч'}
                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                            {u.phone}
                                        </span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Регистр: <span className="font-mono">{reqRegNo || '—'}</span>
                                        {suggested.length > 0 && (
                                            <Badge variant="outline" className="ml-2 text-xs">
                                                Регистр таарсан
                                            </Badge>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={selected}
                                    onValueChange={(v) => setSelections((s) => ({ ...s, [u.id]: v }))}
                                >
                                    <SelectTrigger className="h-9 w-56">
                                        <SelectValue placeholder="Байгууллага сонгох" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                                {c.registerNumber ? ` (${c.registerNumber})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    disabled={busy || !selected}
                                    onClick={() =>
                                        act(u.id, { customer_id: selected }, 'Хэрэглэгч холбогдлоо')
                                    }
                                >
                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Холбох'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => act(u.id, { reject: true }, 'Хүсэлт татгалзлаа')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
