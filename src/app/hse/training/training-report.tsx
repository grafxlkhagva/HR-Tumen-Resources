'use client';

import * as React from 'react';
import { collection, collectionGroup, doc, query, orderBy } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useCollection, useDoc, useMemoFirebase, useFirebase } from '@/firebase';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { HSE_COLLECTIONS, type Training } from '../types';
import type { Employee } from '@/types';

function fmtDateTime(ms?: number): string {
    if (!ms) return '';
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function dateOnly(ms?: number): string {
    if (!ms) return '';
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface ReportRow {
    trainingId: string;
    uid: string;
    acked: boolean;
    signedAt?: number;
    ovog: string;
    ner: string;
    utas: string;
    albanTushaal: string;
}

export function TrainingReport() {
    const { firestore } = useFirebase();

    const trainingsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, HSE_COLLECTIONS.training), orderBy('createdAt', 'desc')) : null),
        [firestore],
    );
    const { data: trainings, isLoading } = useCollection<Training>(trainingsQuery);

    const employeesQuery = useMemoFirebase(
        () => (firestore ? collection(firestore, 'employees') : null),
        [firestore],
    );
    const { data: employees } = useCollection<Employee>(employeesQuery);

    const auditQuery = useMemoFirebase(
        () => (firestore ? collectionGroup(firestore, 'hseSignatures') : null),
        [firestore],
    );
    const { data: audits } = useCollection(auditQuery);

    const empById = React.useMemo(() => new Map((employees || []).map((e) => [e.id, e])), [employees]);

    const signedAtByKey = React.useMemo(() => {
        const m = new Map<string, number>();
        (audits || []).forEach((a: unknown) => {
            const rec = a as { id: string; kind?: string; signedAt?: number; ref?: { parent?: { parent?: { id?: string } } } };
            const uid = rec.ref?.parent?.parent?.id;
            if (uid && rec.kind === 'training' && rec.signedAt) m.set(`${uid}_${rec.id}`, rec.signedAt);
        });
        return m;
    }, [audits]);

    const allRows = React.useMemo<ReportRow[]>(() => {
        const rows: ReportRow[] = [];
        (trainings || []).forEach((t) => {
            const signed = new Set(t.hamragdsanIds || []);
            (t.hamragdahIds || []).forEach((uid) => {
                const emp = empById.get(uid);
                const acked = signed.has(uid);
                rows.push({
                    trainingId: t.id,
                    uid,
                    acked,
                    signedAt: acked ? signedAtByKey.get(`${uid}_${t.id}`) : undefined,
                    ovog: emp?.lastName || '',
                    ner: emp?.firstName || '',
                    utas: emp?.phoneNumber || '',
                    albanTushaal: emp?.jobTitle || '',
                });
            });
        });
        return rows.sort((x, y) => (y.signedAt ?? 0) - (x.signedAt ?? 0));
    }, [trainings, empById, signedAtByKey]);

    const ackCount = allRows.filter((r) => r.acked).length;
    const notAckCount = allRows.length - ackCount;
    const ackPct = allRows.length ? Math.round((ackCount / allRows.length) * 1000) / 10 : 0;

    const [periodType, setPeriodType] = React.useState('all');
    const [periodDate, setPeriodDate] = React.useState('');
    const [fStatus, setFStatus] = React.useState('all');
    const [fOvog, setFOvog] = React.useState('');
    const [fNer, setFNer] = React.useState('');
    const [fUtas, setFUtas] = React.useState('');
    const [fPos, setFPos] = React.useState('');

    const inPeriod = React.useCallback(
        (ms?: number) => {
            if (periodType === 'all') return true;
            if (!ms) return false;
            const d = new Date(ms);
            const ref = periodDate ? new Date(periodDate) : new Date();
            if (periodType === 'day') return dateOnly(ms) === (periodDate || dateOnly(Date.now()));
            if (periodType === 'month') return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
            if (periodType === 'quarter')
                return d.getFullYear() === ref.getFullYear() && Math.floor(d.getMonth() / 3) === Math.floor(ref.getMonth() / 3);
            if (periodType === 'year') return d.getFullYear() === ref.getFullYear();
            return true;
        },
        [periodType, periodDate],
    );

    const filtered = React.useMemo(() => {
        return allRows.filter((r) => {
            if (fStatus === 'ack' && !r.acked) return false;
            if (fStatus === 'notack' && r.acked) return false;
            if (fOvog && !r.ovog.toLowerCase().includes(fOvog.toLowerCase())) return false;
            if (fNer && !r.ner.toLowerCase().includes(fNer.toLowerCase())) return false;
            if (fUtas && !r.utas.toLowerCase().includes(fUtas.toLowerCase())) return false;
            if (fPos && !r.albanTushaal.toLowerCase().includes(fPos.toLowerCase())) return false;
            if (periodType !== 'all' && !inPeriod(r.signedAt)) return false;
            return true;
        });
    }, [allRows, fStatus, fOvog, fNer, fUtas, fPos, periodType, inPeriod]);

    const exportExcel = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Хамрагдсан байдал');
        ws.columns = [
            { header: '№', key: 'no', width: 6 },
            { header: 'Төлөв', key: 'status', width: 14 },
            { header: 'Огноо', key: 'date', width: 22 },
            { header: 'Овог', key: 'ovog', width: 16 },
            { header: 'Нэр', key: 'ner', width: 16 },
            { header: 'Утасны дугаар', key: 'utas', width: 16 },
            { header: 'Албан тушаал', key: 'pos', width: 22 },
        ];
        ws.getRow(1).font = { bold: true };
        filtered.forEach((r, i) => {
            ws.addRow({
                no: i + 1,
                status: r.acked ? 'Хамрагдсан' : 'Хамрагдаагүй',
                date: r.signedAt ? fmtDateTime(r.signedAt) : '',
                ovog: r.ovog,
                ner: r.ner,
                utas: r.utas,
                pos: r.albanTushaal,
            });
        });
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `surgalt-hamragdsan-${dateOnly(Date.now())}.xlsx`);
    };

    const donutData = [
        { name: 'Хамрагдсан', value: ackCount, color: '#3b82f6' },
        { name: 'Хамрагдаагүй', value: notAckCount, color: '#f97316' },
    ];

    return (
        <section className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-subtitle">Хамрагдсан байдал</CardTitle>
                </CardHeader>
                <CardContent>
                    {allRows.length === 0 ? (
                        <div className="flex h-[240px] items-center justify-center text-caption text-muted-foreground">
                            Тайлагнах мэдээ алга
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={2}>
                                    {donutData.map((d, i) => (
                                        <Cell key={i} fill={d.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                    <p className="text-center text-caption text-muted-foreground">
                        Хамрагдсан {ackCount} / Нийт {allRows.length} ({ackPct}%)
                    </p>
                </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Select value={periodType} onValueChange={setPeriodType}>
                        <SelectTrigger className="h-9 w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Бүх хугацаа</SelectItem>
                            <SelectItem value="day">Өдрөөр</SelectItem>
                            <SelectItem value="month">Сараар</SelectItem>
                            <SelectItem value="quarter">Улирлаар</SelectItem>
                            <SelectItem value="year">Жилээр</SelectItem>
                        </SelectContent>
                    </Select>
                    {periodType !== 'all' && (
                        <Input type="date" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} className="h-9 w-40" />
                    )}
                </div>
                <Button onClick={exportExcel} className="gap-1.5 bg-warning text-warning-foreground hover:bg-warning/90">
                    <Download className="h-4 w-4" />
                    Excel татах
                </Button>
            </div>

            <DataTable>
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableColumn className="w-10">№</DataTableColumn>
                        <DataTableColumn>Төлөв</DataTableColumn>
                        <DataTableColumn>Гарын үсэг</DataTableColumn>
                        <DataTableColumn>Огноо</DataTableColumn>
                        <DataTableColumn>Овог</DataTableColumn>
                        <DataTableColumn>Нэр</DataTableColumn>
                        <DataTableColumn>Утасны дугаар</DataTableColumn>
                        <DataTableColumn>Албан тушаал</DataTableColumn>
                    </DataTableRow>
                    <DataTableRow className="hover:bg-transparent">
                        <DataTableColumn />
                        <DataTableColumn>
                            <Select value={fStatus} onValueChange={setFStatus}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Бүгд" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Бүгд</SelectItem>
                                    <SelectItem value="ack">Хамрагдсан</SelectItem>
                                    <SelectItem value="notack">Хамрагдаагүй</SelectItem>
                                </SelectContent>
                            </Select>
                        </DataTableColumn>
                        <DataTableColumn />
                        <DataTableColumn />
                        <DataTableColumn>
                            <Input value={fOvog} onChange={(e) => setFOvog(e.target.value)} placeholder="Хайх..." className="h-8" />
                        </DataTableColumn>
                        <DataTableColumn>
                            <Input value={fNer} onChange={(e) => setFNer(e.target.value)} placeholder="Хайх..." className="h-8" />
                        </DataTableColumn>
                        <DataTableColumn>
                            <Input value={fUtas} onChange={(e) => setFUtas(e.target.value)} placeholder="Хайх..." className="h-8" />
                        </DataTableColumn>
                        <DataTableColumn>
                            <Input value={fPos} onChange={(e) => setFPos(e.target.value)} placeholder="Хайх..." className="h-8" />
                        </DataTableColumn>
                    </DataTableRow>
                </DataTableHeader>
                {isLoading ? (
                    <DataTableLoading columns={8} />
                ) : filtered.length === 0 ? (
                    <DataTableEmpty columns={8} message="Тайлагнах мэдээ алга" />
                ) : (
                    <DataTableBody>
                        {filtered.map((r, i) => (
                            <DataTableRow key={`${r.trainingId}_${r.uid}`}>
                                <DataTableCell className="text-muted-foreground">{i + 1}</DataTableCell>
                                <DataTableCell className={r.acked ? 'text-info' : 'text-warning'}>
                                    {r.acked ? 'Хамрагдсан' : 'Хамрагдаагүй'}
                                </DataTableCell>
                                <DataTableCell>{r.acked ? <SigCell uid={r.uid} /> : <span className="text-muted-foreground">—</span>}</DataTableCell>
                                <DataTableCell className="whitespace-nowrap">{fmtDateTime(r.signedAt) || '—'}</DataTableCell>
                                <DataTableCell>{r.ovog || '—'}</DataTableCell>
                                <DataTableCell className="font-medium">{r.ner || '—'}</DataTableCell>
                                <DataTableCell>{r.utas || '—'}</DataTableCell>
                                <DataTableCell>{r.albanTushaal || '—'}</DataTableCell>
                            </DataTableRow>
                        ))}
                    </DataTableBody>
                )}
            </DataTable>
        </section>
    );
}

function SigCell({ uid }: { uid: string }) {
    const { firestore } = useFirebase();
    const sigRef = useMemoFirebase(
        () => (firestore && uid ? doc(firestore, `employees/${uid}/meta/signature`) : null),
        [firestore, uid],
    );
    const { data } = useDoc<{ dataUrl?: string }>(sigRef);
    return data?.dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.dataUrl} alt="Гарын үсэг" className="h-9 max-w-[110px] rounded border bg-white object-contain px-1" />
    ) : (
        <span className="text-muted-foreground">—</span>
    );
}
