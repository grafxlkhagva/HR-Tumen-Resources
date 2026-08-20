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
import { HSE_COLLECTIONS, permitStatusTone, type Permit } from '@/app/hse/types';
import { ArrowLeft, CalendarDays, CheckCircle2, PenLine, FileCheck } from 'lucide-react';

export default function MobileHsePermitDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;

    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const { signature } = useEmployeeSignature();
    const uid = employeeProfile?.id;

    const permitRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, HSE_COLLECTIONS.permits, id) : null),
        [firestore, id],
    );
    const { data: item, isLoading } = useDoc<Permit>(permitRef);

    const [signOpen, setSignOpen] = React.useState(false);
    const signed = !!uid && (item?.tanilcsanIds ?? []).includes(uid);

    const employeeName = employeeProfile
        ? `${employeeProfile.lastName ?? ''} ${employeeProfile.firstName ?? ''}`.trim()
        : undefined;

    const recordSignature = () => {
        if (!firestore || !uid || !item) return;
        updateDocumentNonBlocking(doc(firestore, HSE_COLLECTIONS.permits, item.id), {
            tanilcsanIds: arrayUnion(uid),
        });
        setDocumentNonBlocking(
            doc(firestore, `employees/${uid}/hseSignatures/${item.id}`),
            { kind: 'permit', itemId: item.id, garchig: item.torol ?? '', signedAt: Date.now() },
            { merge: true },
        );
    };

    const loading = isLoading || !employeeProfile;

    return (
        <div className="flex flex-col min-h-full">
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link href="/mobile/hse?folder=permit">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-base font-semibold">Ажлын зөвшөөрөл</h1>
                        <p className="text-xs text-muted-foreground">Дэлгэрэнгүй мэдээлэл</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4">
                {loading ? (
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-9 w-32" />
                        </CardContent>
                    </Card>
                ) : !item ? (
                    <div className="flex flex-col items-center text-center py-16">
                        <FileCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Мэдээлэл олдсонгүй</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <h2 className="text-lg font-semibold leading-snug">{item.torol}</h2>
                                <div className="flex-shrink-0 pt-1">
                                    <StatusBadge tone={permitStatusTone(item.tuluw)}>{item.tuluw}</StatusBadge>
                                </div>
                            </div>
                            {item.duusahOgnoo && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    Хүчинтэй хугацаа дуусах: {item.duusahOgnoo}
                                </span>
                            )}
                        </div>

                        {item.tailbar && (
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="text-sm font-semibold mb-1">Тайлбар</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.tailbar}</p>
                                </CardContent>
                            </Card>
                        )}

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
                                <Button className="w-full gap-2" size="lg" onClick={() => setSignOpen(true)}>
                                    <PenLine className="h-5 w-5" />
                                    Гарын үсэг зурах
                                </Button>
                            )}
                        </div>

                        <SignDialog
                            open={signOpen}
                            onOpenChange={setSignOpen}
                            itemTitle={item.torol ?? 'Ажлын зөвшөөрөл'}
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
