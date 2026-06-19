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
import { StatusBadge } from '../components/status-badge';
import { useHseEmployees } from '../components/use-hse-employees';
import { HSE_COLLECTIONS, type Nonconformity } from '../types';

export function InspectionReport() {
    const { firestore } = useFirebase();
    const { nameOf } = useHseEmployees();

    const ncQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, HSE_COLLECTIONS.nonconformities),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: records, isLoading } = useCollection<Nonconformity>(ncQuery);

    const totals = React.useMemo(() => {
        let total = 0;
        let done = 0;
        (records || []).forEach((r) => {
            (r.items || []).forEach((it) => {
                total += 1;
                if (it.bielsen) done += 1;
            });
        });
        const percent = total ? Math.round((done / total) * 100) : 0;
        return { total, done, pending: total - done, percent };
    }, [records]);

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-subtitle font-semibold">Үзлэг шалгалтын тайлан</h2>
                <p className="text-caption text-muted-foreground">
                    Илэрсэн үл тохирлын дагуу авсан арга хэмжээний гүйцэтгэл
                </p>
            </div>

            <div className="grid gap-card grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-card">
                        <p className="text-caption text-muted-foreground">Нийт үл тохирол</p>
                        <p className="text-title font-semibold">{totals.total}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-card">
                        <p className="text-caption text-muted-foreground">Биелсэн</p>
                        <p className="text-title font-semibold text-success">{totals.done}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-card">
                        <p className="text-caption text-muted-foreground">Биелээгүй</p>
                        <p className="text-title font-semibold text-destructive">{totals.pending}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-card">
                        <p className="text-caption text-muted-foreground">Гүйцэтгэл</p>
                        <p className="text-title font-semibold">{totals.percent}%</p>
                    </CardContent>
                </Card>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Хариуцсан ажилтан</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn align="center">Үл тохирол</DataTableColumn>
                        <DataTableColumn align="center">Биелсэн</DataTableColumn>
                        <DataTableColumn align="center">Биелээгүй</DataTableColumn>
                        <DataTableColumn align="center">%</DataTableColumn>
                        <DataTableColumn>Биелээгүй тухай тайлбар</DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={8} />
                ) : (records || []).length === 0 ? (
                    <DataTableEmpty columns={8} message="Тайлагнах мэдээ алга" />
                ) : (
                    <DataTableBody>
                        {(records || []).map((r, i) => {
                            const total = r.items?.length || 0;
                            const done = (r.items || []).filter((it) => it.bielsen).length;
                            const pending = total - done;
                            const percent = total ? Math.round((done / total) * 100) : 0;
                            return (
                                <DataTableRow key={r.id}>
                                    <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                    <DataTableCell className="font-medium">
                                        {r.hariutsagchId ? nameOf(r.hariutsagchId) : '—'}
                                    </DataTableCell>
                                    <DataTableCell>{r.ognoo}</DataTableCell>
                                    <DataTableCell align="center">{total}</DataTableCell>
                                    <DataTableCell align="center" className="text-success">
                                        {done}
                                    </DataTableCell>
                                    <DataTableCell align="center" className="text-destructive">
                                        {pending}
                                    </DataTableCell>
                                    <DataTableCell align="center">
                                        <StatusBadge
                                            tone={percent >= 100 ? 'green' : percent > 0 ? 'amber' : 'red'}
                                        >
                                            {percent}%
                                        </StatusBadge>
                                    </DataTableCell>
                                    <DataTableCell className="max-w-xs text-caption text-muted-foreground">
                                        {pending > 0 ? r.bielegguiTailbar || '—' : '—'}
                                    </DataTableCell>
                                </DataTableRow>
                            );
                        })}
                    </DataTableBody>
                )}
            </DataTable>
        </section>
    );
}
