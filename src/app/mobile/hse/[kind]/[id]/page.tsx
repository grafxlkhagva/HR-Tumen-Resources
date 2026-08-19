'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, arrayUnion } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useEmployeeSignature } from '@/hooks/use-employee-signature';
import { updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/app/hse/components/status-badge';
import { SignDialog } from '../../_components/sign-dialog';
import { HSE_COLLECTIONS, scheduleStatusTone, type Training, type Briefing } from '@/app/hse/types';
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, GraduationCap, ClipboardCheck, ExternalLink, Eye, PenLine } from 'lucide-react';

type Kind = 'training' | 'briefing';

const KIND_CONFIG: Record<Kind, {
    collection: string;
    signField: 'hamragdsanIds' | 'tanilcsanIds';
    actionLabel: string;
    sectionTitle: string;
    icon: typeof GraduationCap;
}> = {
    training: {
        collection: HSE_COLLECTIONS.training,
        signField: 'hamragdsanIds',
        actionLabel: 'Хамрагдсан',
        sectionTitle: 'Сургалт',
        icon: GraduationCap,
    },
    briefing: {
        collection: HSE_COLLECTIONS.briefings,
        signField: 'tanilcsanIds',
        actionLabel: 'Танилцсан',
        sectionTitle: 'Зааварчилгаа',
        icon: ClipboardCheck,
    },
};

// Training ба Briefing-ийн нийтлэг талбарууд (дэлгэрэнгүй дээр хэрэглэх).
type HseSchedItem = (Training | Briefing) & {
    id: string;
    imgUrl?: string;
    pdfUrl?: string;
    tailbar?: string;
    torol?: string;
    hamragdsanIds?: string[];
    tanilcsanIds?: string[];
};

/**
 * Материалыг апп дотор шууд харуулна (татахгүй).
 * PDF → iframe, зураг → img, Office файл → Google gview. (mobile/company/policies-тэй ижил загвар.)
 */
function MaterialViewer({ url, title }: { url: string; title: string }) {
    const ext = url.split('.').pop()?.split('?')[0].toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (ext === 'pdf') {
        return <iframe src={url} className="h-[70vh] w-full rounded-lg border bg-white" title={title} />;
    }
    if (imageExts.includes(ext || '')) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={url} alt={title} className="w-full rounded-lg border object-contain max-h-[70vh]" />;
    }
    if (officeExts.includes(ext || '')) {
        const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
        return <iframe src={viewerUrl} className="h-[70vh] w-full rounded-lg border bg-white" title={title} />;
    }
    // Танигдахгүй төрөл → холбоос
    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
        >
            <FileText className="h-4 w-4" />
            Материал нээх
        </a>
    );
}

export default function MobileHseItemDetailPage() {
    const router = useRouter();
    const params = useParams<{ kind: string; id: string }>();
    const kind = params.kind as Kind;
    const id = params.id;
    const cfg = KIND_CONFIG[kind];

    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const uid = employeeProfile?.id;

    const itemRef = useMemoFirebase(
        () => (firestore && cfg && id ? doc(firestore, cfg.collection, id) : null),
        [firestore, cfg, id],
    );
    const { data: item, isLoading } = useDoc<HseSchedItem>(itemRef);

    // Буруу kind (training/briefing биш) бол жагсаалт руу буцаана.
    React.useEffect(() => {
        if (!cfg) router.replace('/mobile/hse');
    }, [cfg, router]);
    if (!cfg) return null;

    const { signature } = useEmployeeSignature();

    const [materialOpened, setMaterialOpened] = React.useState(false);
    const [signOpen, setSignOpen] = React.useState(false);

    const signedIds = (item?.[cfg.signField] as string[] | undefined) ?? [];
    const signed = !!uid && signedIds.includes(uid);

    const hasMaterial = !!item?.pdfUrl;
    const canSign = !hasMaterial || materialOpened; // материал байвал нээсний дараа л зурна

    const employeeName = employeeProfile
        ? `${employeeProfile.lastName ?? ''} ${employeeProfile.firstName ?? ''}`.trim()
        : undefined;

    // Гарын үсэг баталгаажуулсан: signField-д нэмээд, өөрийн профайлд аудит бичлэг үлдээнэ.
    const recordSignature = () => {
        if (!firestore || !uid || !item) return;
        updateDocumentNonBlocking(doc(firestore, cfg.collection, item.id), { [cfg.signField]: arrayUnion(uid) });
        setDocumentNonBlocking(
            doc(firestore, `employees/${uid}/hseSignatures/${item.id}`),
            { kind, itemId: item.id, garchig: item.garchig ?? '', signedAt: Date.now() },
            { merge: true },
        );
    };

    const loading = isLoading || !employeeProfile;

    return (
        <div className="flex flex-col min-h-full">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link href="/mobile/hse">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-base font-semibold">{cfg.sectionTitle}</h1>
                        <p className="text-xs text-muted-foreground">Дэлгэрэнгүй мэдээлэл</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4">
                {loading ? (
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-40 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-9 w-32" />
                        </CardContent>
                    </Card>
                ) : !item ? (
                    <div className="flex flex-col items-center text-center py-16">
                        <cfg.icon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Мэдээлэл олдсонгүй</p>
                    </div>
                ) : (
                    <>
                        {/* Гарчиг + төлөв */}
                        <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <h2 className="text-lg font-semibold leading-snug">{item.garchig}</h2>
                                {item.tuluw && (
                                    <div className="flex-shrink-0 pt-1">
                                        <StatusBadge tone={scheduleStatusTone(item.tuluw)}>{item.tuluw}</StatusBadge>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {item.torol && (
                                    <span className="inline-flex items-center gap-1">
                                        <cfg.icon className="h-3.5 w-3.5" />
                                        {item.torol}
                                    </span>
                                )}
                                {item.huvaar && (
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {item.huvaar}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Зураг */}
                        {item.imgUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.imgUrl}
                                alt={item.garchig}
                                className="w-full rounded-xl border object-cover max-h-72"
                            />
                        )}

                        {/* Тайлбар / агуулга */}
                        {item.tailbar && (
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-semibold mb-1">Агуулга</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.tailbar}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Сургалтын материал — апп дотор шууд нээж уншина */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold">Сургалтын материал</h3>
                            {item.pdfUrl ? (
                                materialOpened ? (
                                    <>
                                        <MaterialViewer url={item.pdfUrl} title={item.garchig} />
                                        <a
                                            href={item.pdfUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Бүтэн дэлгэцээр нээх
                                        </a>
                                    </>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2"
                                        onClick={() => setMaterialOpened(true)}
                                    >
                                        <Eye className="h-4 w-4" />
                                        Сургалтын материал нээж унших
                                    </Button>
                                )
                            ) : (
                                <Card>
                                    <CardContent className="p-4">
                                        <p className="text-sm text-muted-foreground">Хавсаргасан материал алга</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Гарын үсгээр баталгаажуулах */}
                        <div className="pt-1">
                            {signed ? (
                                <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-success">
                                        <CheckCircle2 className="h-5 w-5" />
                                        {cfg.actionLabel} — гарын үсэг зурсан
                                    </div>
                                    {signature?.dataUrl && (
                                        <div className="mt-3 flex items-center justify-between gap-3">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={signature.dataUrl}
                                                alt="Гарын үсэг"
                                                className="max-h-16 rounded border bg-white object-contain px-2"
                                            />
                                            {employeeName && (
                                                <span className="text-xs text-muted-foreground">{employeeName}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Button
                                        className="w-full gap-2"
                                        size="lg"
                                        disabled={!canSign}
                                        onClick={() => setSignOpen(true)}
                                    >
                                        <PenLine className="h-5 w-5" />
                                        Гарын үсэг зурах
                                    </Button>
                                    {!canSign && (
                                        <p className="mt-2 text-center text-xs text-muted-foreground">
                                            Эхлээд сургалтын материалтай танилцана уу.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        <SignDialog
                            open={signOpen}
                            onOpenChange={setSignOpen}
                            itemTitle={item.garchig ?? ''}
                            actionLabel={cfg.actionLabel}
                            employeeName={employeeName}
                            onConfirm={recordSignature}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
