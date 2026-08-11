'use client';

import * as React from 'react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useKamScope } from '../_lib/use-kam-scope';
import { logAudit } from '../_lib/crm-actions';
import { importPrototype, type ImportCounts, type ProtoData } from './_lib/import-prototype';
import { runClientSync, type ClientSyncResult } from '../_lib/client-sync';

/**
 * Прототипийн бодит дата импорт + Sheets синк (client-side, зөвхөн админ).
 * 1) public/prototype-crm.json → компани/харилцагч/deal/NPS upsert
 * 2) Google Sheets → захиалга + агрегатууд
 */
export default function ImportPrototypePage() {
    const firestore = useFirestore();
    const { isDirector, actor, isLoading } = useKamScope();
    const { toast } = useToast();

    const [proto, setProto] = React.useState<ProtoData | null>(null);
    const [importing, setImporting] = React.useState(false);
    const [importMsg, setImportMsg] = React.useState('');
    const [importResult, setImportResult] = React.useState<ImportCounts | null>(null);

    const [syncing, setSyncing] = React.useState(false);
    const [syncMsg, setSyncMsg] = React.useState('');
    const [syncResult, setSyncResult] = React.useState<ClientSyncResult | null>(null);

    React.useEffect(() => {
        fetch('/prototype-crm.json')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setProto(d))
            .catch(() => setProto(null));
    }, []);

    const handleImport = async () => {
        if (!firestore || !proto || importing) return;
        setImporting(true);
        setImportResult(null);
        try {
            const res = await importPrototype(firestore, proto, setImportMsg);
            setImportResult(res);
            logAudit(
                firestore,
                actor,
                'sync',
                'crm_companies',
                undefined,
                `Прототип импорт: компани +${res.companiesCreated}/~${res.companiesUpdated}, харилцагч ${res.contacts}, deal ${res.deals}, NPS ${res.surveys}`,
            );
            toast({ title: 'Амжилттай', description: 'Прототипийн дата бүрэн импортлогдлоо.' });
        } catch (e) {
            toast({
                title: 'Алдаа',
                description: e instanceof Error ? e.message : 'Импорт амжилтгүй.',
                variant: 'destructive',
            });
        } finally {
            setImporting(false);
            setImportMsg('');
        }
    };

    const handleSync = async () => {
        if (!firestore || syncing) return;
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await runClientSync(firestore, setSyncMsg);
            setSyncResult(res);
            logAudit(
                firestore,
                actor,
                'sync',
                'crm_orders',
                undefined,
                `Client синк: ${res.orders} захиалга, ${res.newCompanies} шинэ компани, ${res.leads} лийд deal, ₮${res.profitM}M ашиг`,
            );
            toast({ title: 'Амжилттай', description: `${res.orders} захиалга синклэгдлээ.` });
        } catch (e) {
            toast({
                title: 'Алдаа',
                description: e instanceof Error ? e.message : 'Синк амжилтгүй.',
                variant: 'destructive',
            });
        } finally {
            setSyncing(false);
            setSyncMsg('');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isDirector) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-2">
                    <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
                    <p className="text-sm text-muted-foreground">Зөвхөн админ хандана.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <header className="border-b px-6 py-4">
                <h1 className="text-lg font-semibold tracking-tight">Прототип дата импорт</h1>
                <p className="text-xs text-muted-foreground">
                    Logistic Dashboards/crm-ийн бодит дата → Firestore (идемпотент, дахин ажиллуулж болно)
                </p>
            </header>

            <div className="flex-1 overflow-auto p-6 space-y-6 max-w-3xl">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Database className="h-4 w-4 text-cyan-600" />
                            1. Прототипийн CRM дата
                        </CardTitle>
                        <CardDescription>
                            {proto
                                ? `Бэлэн: ${proto.companies.length} компани · ${proto.contacts.length} харилцагч · ${proto.deals.length} deal · ${proto.cx_surveys.length} NPS`
                                : 'prototype-crm.json олдсонгүй (public хавтаст байх ёстой).'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            onClick={handleImport}
                            disabled={!proto || importing}
                            className="bg-cyan-600 hover:bg-cyan-600/90"
                        >
                            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Импорт эхлүүлэх
                        </Button>
                        {importing && <p className="text-sm text-muted-foreground">{importMsg}</p>}
                        {importResult && (
                            <div className="flex items-start gap-2 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                                <div>
                                    Компани: {importResult.companiesCreated} шинэ,{' '}
                                    {importResult.companiesUpdated} шинэчилсэн · Харилцагч:{' '}
                                    {importResult.contacts} · Deal: {importResult.deals} · NPS:{' '}
                                    {importResult.surveys}
                                    {importResult.skipped > 0 && ` · Алгассан: ${importResult.skipped}`}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <RefreshCw className="h-4 w-4 text-cyan-600" />
                            2. Google Sheets синк (захиалга + агрегат)
                        </CardTitle>
                        <CardDescription>
                            Master data-гийн 9 шийтийн бүх захиалгыг (2022–2026) татаж, аналитикийн
                            агрегатуудыг тооцно. 2-5 минут үргэлжилнэ.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button onClick={handleSync} disabled={syncing} className="bg-cyan-600 hover:bg-cyan-600/90">
                            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Синк эхлүүлэх
                        </Button>
                        {syncing && <p className="text-sm text-muted-foreground">{syncMsg}</p>}
                        {syncResult && (
                            <div className="flex items-start gap-2 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600" />
                                <div>
                                    Захиалга: {syncResult.orders.toLocaleString()} · Шинэ компани:{' '}
                                    {syncResult.newCompanies} · Компанийн агрегат: {syncResult.companies} ·
                                    Тээвэрчин: {syncResult.carriers} · Лийд deal: {syncResult.leads} · Нийт
                                    ашиг: ₮{syncResult.profitM.toLocaleString()}M
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
