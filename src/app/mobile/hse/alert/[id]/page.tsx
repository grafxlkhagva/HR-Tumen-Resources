'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { HSE_COLLECTIONS, type HseAlert } from '@/app/hse/types';
import { ArrowLeft, CalendarDays, CheckCircle2, PenLine, Eye, Megaphone, PlayCircle } from 'lucide-react';

export default function MobileHseAlertDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;

    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const { signature } = useEmployeeSignature();
    const uid = employeeProfile?.id;

    const alertRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, HSE_COLLECTIONS.alerts, id) : null),
        [firestore, id],
    );
    const { data: item, isLoading } = useDoc<HseAlert>(alertRef);

    const [opened, setOpened] = React.useState(false);
    const [signOpen, setSignOpen] = React.useState(false);

    const signed = !!uid && (item?.tanilcsanIds ?? []).includes(uid);
    const hasAttachment = !!(item?.imgUrl || item?.img2Url || item?.videoUrl);
    const canSign = !hasAttachment || opened;

    const employeeName = employeeProfile
        ? `${employeeProfile.lastName ?? ''} ${employeeProfile.firstName ?? ''}`.trim()
        : undefined;

    const recordSignature = () => {
        if (!firestore || !uid || !item) return;
        updateDocumentNonBlocking(doc(firestore, HSE_COLLECTIONS.alerts, item.id), {
            tanilcsanIds: arrayUnion(uid),
        });
        setDocumentNonBlocking(
            doc(firestore, `employees/${uid}/hseSignatures/${item.id}`),
            { kind: 'alert', itemId: item.id, garchig: (item.desc ?? '').slice(0, 80), signedAt: Date.now() },
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
                        <h1 className="text-base font-semibold">Сэрэмжлүүлэг</h1>
                        <p className="text-xs text-muted-foreground">Аюултай тохиолдлын мэдээлэл</p>
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
                        <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Мэдээлэл олдсонгүй</p>
                    </div>
                ) : (
                    <>
                        {/* Ангилал + төлөв */}
                        <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <h2 className="text-lg font-semibold leading-snug">
                                    {item.albaNer || item.angilal || 'Аюултай тохиолдол'}
                                </h2>
                                <div className="flex-shrink-0 pt-1">
                                    <StatusBadge tone={signed ? 'green' : 'red'}>
                                        {signed ? 'Танилцсан' : 'Танилцаагүй'}
                                    </StatusBadge>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {item.angilal && (
                                    <span className="inline-flex items-center gap-1">
                                        <Megaphone className="h-3.5 w-3.5" />
                                        {item.angilal}
                                    </span>
                                )}
                                {(item.tohioldoOgnoo || item.ognoo) && (
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {item.tohioldoOgnoo || item.ognoo}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Аюултай тохиолдлын мэдээлэл */}
                        {item.desc && (
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-semibold mb-1">Аюултай тохиолдол</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.desc}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Нөлөөлсөн хүчин зүйлс */}
                        {item.noloolsonHuchin && (
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-semibold mb-1">Нөлөөлсөн хүчин зүйлс</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {item.noloolsonHuchin}
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Сургамж */}
                        {item.surgamj && (
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-semibold mb-1">Сургамж</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.surgamj}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Хавсаргасан зураг/видео — нээж үзэх */}
                        {hasAttachment && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">Хавсаргасан файл</h3>
                                {opened ? (
                                    <div className="space-y-2">
                                        {[item.imgUrl, item.img2Url].filter(Boolean).map((src, i) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={i}
                                                src={src as string}
                                                alt="Сэрэмжлүүлэг"
                                                className="w-full rounded-xl border object-contain"
                                            />
                                        ))}
                                        {item.videoUrl && (
                                            <a
                                                href={item.videoUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
                                            >
                                                <PlayCircle className="h-4 w-4" />
                                                Видео үзэх
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <Button variant="outline" className="w-full gap-2" onClick={() => setOpened(true)}>
                                        <Eye className="h-4 w-4" />
                                        Хавсаргасан файл нээж үзэх
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Гарын үсгээр баталгаажуулах */}
                        <div className="pt-1">
                            {signed ? (
                                <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-success">
                                        <CheckCircle2 className="h-5 w-5" />
                                        Танилцсан — гарын үсэг зурсан
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
                                            Эхлээд хавсаргасан файлыг нээж үзнэ үү.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        <SignDialog
                            open={signOpen}
                            onOpenChange={setSignOpen}
                            itemTitle={item.albaNer || item.angilal || 'Аюултай тохиолдол'}
                            actionLabel="Танилцсан"
                            employeeName={employeeName}
                            onConfirm={recordSignature}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
