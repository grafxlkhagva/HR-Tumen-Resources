'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    Upload,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Users,
    Building2,
    Briefcase,
    FileUp,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types';
import { parseCsvWithHeaders, type CsvParsed } from './_lib/csv';
import {
    detectCsvKind,
    getKnownStageMap,
    matchOwner,
    type CsvKind,
} from './_lib/mappers';
import {
    importCompanies,
    importContacts,
    importDeals,
    buildCompanyDomainMap,
    buildCompanyNameMap,
    buildContactEmailMap,
    type ImportProgress,
} from './_lib/import-runner';

interface UploadedFile {
    name: string;
    kind: CsvKind;
    parsed: CsvParsed;
}

export default function CrmImportPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const employeesQ = useMemoFirebase(
        () => (firestore ? collection(firestore, 'employees') : null),
        [firestore],
    );
    const { data: employees } = useCollection<Employee>(employeesQ);

    const [files, setFiles] = React.useState<UploadedFile[]>([]);
    const [isImporting, setIsImporting] = React.useState(false);
    const [progress, setProgress] = React.useState<ImportProgress | null>(null);
    const [results, setResults] = React.useState<
        | {
              companies?: { inserted: number; updated: number; skipped: number };
              contacts?: { inserted: number; updated: number; skipped: number };
              deals?: { inserted: number; updated: number; skipped: number };
              issues: string[];
          }
        | null
    >(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected) return;

        const newFiles: UploadedFile[] = [];
        for (const f of Array.from(selected)) {
            try {
                const text = await f.text();
                const parsed = parseCsvWithHeaders(text);
                const kind = detectCsvKind(parsed.headers);
                if (kind === 'unknown') {
                    toast({
                        variant: 'destructive',
                        title: `${f.name}: танигдсангүй`,
                        description: 'Header-аас content type танигдсангүй.',
                    });
                    continue;
                }
                newFiles.push({ name: f.name, kind, parsed });
            } catch (err) {
                toast({
                    variant: 'destructive',
                    title: `${f.name} уншихад алдаа`,
                    description: err instanceof Error ? err.message : 'CSV алдаа',
                });
            }
        }

        // Same kind-аас зөвхөн нэг — хамгийн сүүлд upload хийсэн нь хүчинтэй
        setFiles((prev) => {
            const map = new Map<CsvKind, UploadedFile>();
            [...prev, ...newFiles].forEach((f) => map.set(f.kind, f));
            return Array.from(map.values());
        });

        // input clear
        e.target.value = '';
    };

    const removeFile = (kind: CsvKind) => {
        setFiles((prev) => prev.filter((f) => f.kind !== kind));
    };

    const handleImport = async () => {
        if (!firestore || files.length === 0) return;

        setIsImporting(true);
        setProgress({
            phase: 'Эхлэж байна...',
            processed: 0,
            total: 0,
            skipped: 0,
            issues: [],
        });
        setResults(null);

        const allIssues: string[] = [];
        const companiesFile = files.find((f) => f.kind === 'companies');
        const contactsFile = files.find((f) => f.kind === 'contacts');
        const dealsFile = files.find((f) => f.kind === 'deals');

        let companyIdMap = new Map<string, string>();
        let contactIdMap = new Map<string, string>();
        let companyDomainMap = new Map<string, string>();
        let companyNameMap = new Map<string, string>();
        let contactEmailMap = new Map<string, string>();
        // contactDocId → companyDocId (deal->contact->company chain-д)
        let contactCompanyMap = new Map<string, string>();
        const result: typeof results = { issues: [] };

        try {
            const emp = employees || [];

            if (companiesFile) {
                const r = await importCompanies(
                    firestore,
                    companiesFile.parsed.rows,
                    emp,
                    setProgress,
                );
                companyIdMap = r.idMap;
                companyDomainMap = buildCompanyDomainMap(
                    companiesFile.parsed.rows,
                    companyIdMap,
                );
                companyNameMap = buildCompanyNameMap(
                    companiesFile.parsed.rows,
                    companyIdMap,
                );
                allIssues.push(...r.issues);
                result.companies = {
                    inserted: r.inserted,
                    updated: r.updated,
                    skipped: r.skipped,
                };
            }

            if (contactsFile) {
                const r = await importContacts(
                    firestore,
                    contactsFile.parsed.rows,
                    emp,
                    companyIdMap,
                    companyDomainMap,
                    companyNameMap,
                    setProgress,
                );
                contactIdMap = r.idMap;
                contactEmailMap = buildContactEmailMap(
                    contactsFile.parsed.rows,
                    contactIdMap,
                );

                // contactDocId → companyDocId map үүсгэх (нэг талын pass)
                contactCompanyMap = new Map<string, string>();
                contactsFile.parsed.rows.forEach((row) => {
                    const hubspotId = row['Record ID']?.trim();
                    if (!hubspotId) return;
                    const ourContactId = contactIdMap.get(hubspotId);
                    if (!ourContactId) return;
                    // company resolve тэргүүний дарааллаар
                    const directCompanyHubId =
                        row['Primary Associated Company ID']?.trim();
                    let cId: string | undefined;
                    if (directCompanyHubId) {
                        cId = companyIdMap.get(directCompanyHubId);
                    }
                    if (!cId) {
                        const dom =
                            row['Email Domain']?.trim().toLowerCase() ||
                            (row['Email']?.toLowerCase().split('@')[1] || '').replace(/^www\./, '');
                        if (dom) cId = companyDomainMap.get(dom);
                    }
                    if (!cId) {
                        const nm = (row['Company Name'] || row['Associated Company'] || '')
                            .trim()
                            .toLowerCase();
                        if (nm) cId = companyNameMap.get(nm);
                    }
                    if (cId) contactCompanyMap.set(ourContactId, cId);
                });

                allIssues.push(...r.issues);
                result.contacts = {
                    inserted: r.inserted,
                    updated: r.updated,
                    skipped: r.skipped,
                };
            }

            if (dealsFile) {
                const r = await importDeals(
                    firestore,
                    dealsFile.parsed.rows,
                    emp,
                    companyIdMap,
                    contactIdMap,
                    contactEmailMap,
                    contactCompanyMap,
                    companyDomainMap,
                    setProgress,
                );
                allIssues.push(...r.issues);
                result.deals = {
                    inserted: r.inserted,
                    updated: r.updated,
                    skipped: r.skipped,
                };
            }

            result.issues = allIssues;
            setResults(result);
            toast({
                title: 'Импорт амжилттай',
                description:
                    'CRM дотор шинэ бичлэгүүд бэлэн боллоо. Үр дүнг доор харна уу.',
            });
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Импорт алдаа',
                description: err instanceof Error ? err.message : 'Тодорхойгүй алдаа',
            });
        } finally {
            setIsImporting(false);
            setProgress(null);
        }
    };

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">HubSpot импорт</h1>
                    <p className="text-xs text-muted-foreground">
                        Companies / Contacts / Deals CSV-ийг ачаалаад манай CRM руу шилжүүлнэ.
                    </p>
                </div>
            </header>

            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto p-6 space-y-6">
                    {/* Upload area */}
                    <div className="rounded-2xl border-2 border-dashed bg-cyan-50/30 p-8 text-center">
                        <input
                            id="csv-upload"
                            type="file"
                            accept=".csv,text/csv"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                            disabled={isImporting}
                        />
                        <FileUp className="h-10 w-10 text-cyan-600 mx-auto mb-3" />
                        <h2 className="text-base font-semibold">CSV файл сонгоорой</h2>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                            HubSpot-аас exportоор татсан Companies / Contacts / Deals файлуудыг зэрэг
                            эсвэл нэгээр сонгоно. Header-аас төрлийг автоматаар таана.
                        </p>
                        <Button
                            asChild
                            size="sm"
                            className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                            disabled={isImporting}
                        >
                            <label htmlFor="csv-upload" className="cursor-pointer">
                                <Upload className="h-4 w-4 mr-1.5" />
                                Файл нэмэх
                            </label>
                        </Button>
                    </div>

                    {/* File list */}
                    {files.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Сонгосон файлууд
                            </h3>
                            <div className="space-y-2">
                                {files
                                    .slice()
                                    .sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind))
                                    .map((f) => (
                                        <FileSummaryCard
                                            key={f.kind}
                                            file={f}
                                            employees={employees || []}
                                            onRemove={() => removeFile(f.kind)}
                                            disabled={isImporting}
                                        />
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Stage mapping reference */}
                    {files.some((f) => f.kind === 'deals') && (
                        <StageMappingCard />
                    )}

                    {/* Action */}
                    {files.length > 0 && !results && (
                        <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                            <div className="text-xs text-muted-foreground">
                                <Sparkles className="inline h-3.5 w-3.5 mr-1 text-cyan-600" />
                                Идемпотент импорт. Дахин ачаалбал HubSpot ID-аар upsert хийнэ — давхардал үүсэхгүй.
                            </div>
                            <Button
                                onClick={handleImport}
                                disabled={isImporting}
                                className="bg-cyan-600 hover:bg-cyan-600/90"
                            >
                                {isImporting ? (
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                    <Upload className="h-4 w-4 mr-1.5" />
                                )}
                                Импорт эхлүүлэх
                            </Button>
                        </div>
                    )}

                    {/* Progress */}
                    {progress && (
                        <ProgressPanel progress={progress} />
                    )}

                    {/* Results */}
                    {results && (
                        <ResultsPanel results={results} />
                    )}
                </div>
            </div>
        </div>
    );
}

function kindOrder(k: CsvKind): number {
    switch (k) {
        case 'companies':
            return 1;
        case 'contacts':
            return 2;
        case 'deals':
            return 3;
        default:
            return 9;
    }
}

const KIND_LABELS: Record<CsvKind, string> = {
    contacts: 'Харилцагчид',
    companies: 'Байгууллагууд',
    deals: 'Гэрээ',
    unknown: 'Танигдаагүй',
};

function FileSummaryCard({
    file,
    employees,
    onRemove,
    disabled,
}: {
    file: UploadedFile;
    employees: Employee[];
    onRemove: () => void;
    disabled?: boolean;
}) {
    const Icon =
        file.kind === 'companies'
            ? Building2
            : file.kind === 'contacts'
                ? Users
                : Briefcase;

    // Owner mapping preview
    const ownerColumn =
        file.kind === 'companies'
            ? 'Company owner'
            : file.kind === 'contacts'
                ? 'Contact owner'
                : 'Deal owner';
    const ownerStats = React.useMemo(() => {
        const counts = new Map<string, { count: number; matched: boolean }>();
        file.parsed.rows.forEach((r) => {
            const name = (r[ownerColumn] || '').trim();
            if (!name) return;
            const cur = counts.get(name);
            if (cur) {
                cur.count++;
            } else {
                const m = matchOwner(name, employees);
                counts.set(name, { count: 1, matched: !!m.ownerId });
            }
        });
        return Array.from(counts.entries())
            .map(([name, info]) => ({ name, ...info }))
            .sort((a, b) => b.count - a.count);
    }, [file, employees, ownerColumn]);

    const matchedCount = ownerStats.filter((o) => o.matched).length;

    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{file.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                            {KIND_LABELS[file.kind]} · {file.parsed.rows.length} мөр ·{' '}
                            {file.parsed.headers.length} багана
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onRemove}
                    disabled={disabled}
                    className="text-muted-foreground hover:text-rose-600"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {ownerStats.length > 0 && (
                <div className="text-[11px] space-y-1.5 pt-3 border-t">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-medium uppercase tracking-wider text-[10px]">
                            Owner mapping
                        </span>
                        <span>
                            {matchedCount}/{ownerStats.length} ажилтантай тохирсон
                        </span>
                    </div>
                    <div className="space-y-1">
                        {ownerStats.slice(0, 8).map((o) => (
                            <div
                                key={o.name}
                                className="flex items-center justify-between gap-2"
                            >
                                <span
                                    className={cn(
                                        'truncate',
                                        o.matched ? 'text-foreground' : 'text-muted-foreground',
                                    )}
                                >
                                    {o.matched ? (
                                        <CheckCircle2 className="inline h-3 w-3 text-emerald-600 mr-1" />
                                    ) : (
                                        <AlertTriangle className="inline h-3 w-3 text-amber-500 mr-1" />
                                    )}
                                    {o.name}
                                </span>
                                <span className="text-muted-foreground tabular-nums shrink-0">
                                    {o.count}
                                </span>
                            </div>
                        ))}
                        {ownerStats.length > 8 && (
                            <div className="text-muted-foreground/60 italic">
                                +{ownerStats.length - 8} бусад owner
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function StageMappingCard() {
    const map = getKnownStageMap();
    return (
        <div className="rounded-xl border bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Гэрээний үе шатны mapping
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {Object.entries(map).map(([hub, ours]) => (
                    <div key={hub} className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{hub}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-cyan-700 font-mono text-[11px]">{ours}</span>
                    </div>
                ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 italic">
                Тохирохгүй stage-ийг "Уулзалт төлөвлөсөн" руу үүсгэнэ. Анхны нэр нь `hubspotStageOriginal` талбарт хадгалагдана.
            </p>
        </div>
    );
}

function ProgressPanel({ progress }: { progress: ImportProgress }) {
    const pct =
        progress.total > 0
            ? Math.round((progress.processed / progress.total) * 100)
            : 0;
    return (
        <div className="rounded-xl border bg-cyan-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-cyan-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {progress.phase}
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                    {progress.processed} / {progress.total}
                </span>
            </div>
            <div className="h-2 bg-cyan-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-cyan-600 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function ResultsPanel({
    results,
}: {
    results: {
        companies?: { inserted: number; updated: number; skipped: number };
        contacts?: { inserted: number; updated: number; skipped: number };
        deals?: { inserted: number; updated: number; skipped: number };
        issues: string[];
    };
}) {
    const sections = [
        { key: 'companies', label: 'Байгууллага', icon: Building2 },
        { key: 'contacts', label: 'Харилцагч', icon: Users },
        { key: 'deals', label: 'Гэрээ', icon: Briefcase },
    ] as const;

    return (
        <div className="rounded-xl border bg-emerald-50/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Импорт амжилттай
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {sections.map(({ key, label, icon: Icon }) => {
                    const r = results[key];
                    if (!r) return null;
                    return (
                        <div key={key} className="rounded-lg border bg-card p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className="h-4 w-4 text-cyan-600" />
                                <span className="text-sm font-medium">{label}</span>
                            </div>
                            <div className="space-y-0.5 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Шинэ</span>
                                    <span className="tabular-nums font-medium text-emerald-700">
                                        +{r.inserted}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Шинэчилсэн</span>
                                    <span className="tabular-nums font-medium">{r.updated}</span>
                                </div>
                                {r.skipped > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Алгассан</span>
                                        <span className="tabular-nums text-amber-600">
                                            {r.skipped}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {results.issues.length > 0 && (
                <details className="rounded-lg border bg-card p-3 text-xs">
                    <summary className="cursor-pointer font-medium text-amber-700 inline-flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Анхааруулга ({results.issues.length})
                    </summary>
                    <ul className="mt-2 space-y-0.5 text-muted-foreground max-h-48 overflow-y-auto">
                        {results.issues.slice(0, 50).map((it, i) => (
                            <li key={i}>· {it}</li>
                        ))}
                        {results.issues.length > 50 && (
                            <li className="italic">+{results.issues.length - 50} бусад</li>
                        )}
                    </ul>
                </details>
            )}
        </div>
    );
}

// Loading state when employees are loading is silent; the import call itself awaits no extra prep
export function _SkeletonGuard() {
    return <Skeleton className="h-32 w-full" />;
}
