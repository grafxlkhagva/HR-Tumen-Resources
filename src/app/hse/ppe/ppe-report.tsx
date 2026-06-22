'use client';

import * as React from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import {
    DataTable,
    DataTableHeader,
    DataTableColumn,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableLoading,
    DataTableEmpty,
} from '@/components/patterns';
import { Card, CardContent } from '@/components/ui/card';
import { HSE_COLLECTIONS, type PpeIssue } from '../types';

type Agg = { torol: string; olgoson: number; huleenAvsan: number; huleelgenOgson: number };

export function PpeReport() {
    const { firestore } = useFirebase();

    const ppeQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, HSE_COLLECTIONS.ppeIssues), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: issues, isLoading } = useCollection<PpeIssue>(ppeQuery);

    const { totals, byType } = React.useMemo(() => {
        const employees = new Set<string>();
        let totalIssued = 0;
        let totalReceived = 0;
        const map = new Map<string, Agg>();
        (issues || []).forEach((iss) => {
            if (iss.ajiltanId) employees.add(iss.ajiltanId);
            (iss.items || []).forEach((it) => {
                const qty = Number(it.too) || 0;
                totalIssued += qty;
                if (it.huleenAvsan) totalReceived += qty;
                const key = it.torol || 'Бусад';
                const agg = map.get(key) || {
                    torol: key,
                    olgoson: 0,
                    huleenAvsan: 0,
                    huleelgenOgson: 0,
                };
                agg.olgoson += qty;
                if (it.huleenAvsan) agg.huleenAvsan += qty;
                if (it.huleelgenOgson) agg.huleelgenOgson += qty;
                map.set(key, agg);
            });
        });
        const percent = totalIssued ? Math.round((totalReceived / totalIssued) * 100) : 0;
        const byType = Array.from(map.values()).sort((a, b) => b.olgoson - a.olgoson);
        return {
            totals: {
                records: (issues || []).length,
                employees: employees.size,
                issued: totalIssued,
                receivedPercent: percent,
            },
            byType,
        };
    }, [issues]);

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-subtitle font-semibold">Хамгаалах хэрэгслийн тайлан</h2>
                <p className="text-caption text-muted-foreground">
                    Олгосон хувийн хамгаалах хэрэгслийн нэгдсэн дүн
                </p>
            </div>

            <div className="grid gap-card grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-card">
                        <p className="text-caption text-muted-foreground">Нийт бүртгэл</p>
                        <p className="text-title font-semibold">{totals.records}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-card">
                        <p className="text-caption text-muted-foreground">Хамрагдсан ажилтан</p>
                        <p className="text-title font-semibold">{totals.employees}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-card">
                        <p className="text-caption text-muted-foreground">Нийт олгосон ширхэг</p>
                        <p className="text-title font-semibold">{totals.issued}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-card">
                        <p className="text-caption text-muted-foreground">Хүлээн авсан</p>
                        <p className="text-title font-semibold text-success">{totals.receivedPercent}%</p>
                    </CardContent>
                </Card>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Хэрэгслийн төрөл</DataTableColumn>
                        <DataTableColumn align="center">Олгосон</DataTableColumn>
                        <DataTableColumn align="center">Хүлээн авсан</DataTableColumn>
                        <DataTableColumn align="center">Хүлээлгэн өгсөн</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={5} />
                ) : byType.length === 0 ? (
                    <DataTableEmpty columns={5} message="Тайлагнах мэдээ алга" />
                ) : (
                    <DataTableBody>
                        {byType.map((row, i) => (
                            <DataTableRow key={row.torol}>
                                <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                <DataTableCell className="font-medium">{row.torol}</DataTableCell>
                                <DataTableCell align="center">{row.olgoson}</DataTableCell>
                                <DataTableCell align="center" className="text-success">
                                    {row.huleenAvsan}
                                </DataTableCell>
                                <DataTableCell align="center">{row.huleelgenOgson}</DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>
        </section>
    );
}
