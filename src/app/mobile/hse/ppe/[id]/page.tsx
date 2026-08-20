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
import { SignDialog } from '../../_components/sign-dialog';
import { HSE_COLLECTIONS, PPE_ISSUE_TERMS, type PpeIssue } from '@/app/hse/types';
import { ArrowLeft, CalendarDays, CheckCircle2, PenLine, HardHat } from 'lucide-react';

export default function MobileHsePpeDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;

    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const { signature } = useEmployeeSignature();
    const uid = employeeProfile?.id;

    const ppeRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, HSE_COLLECTIONS.ppeIssues, id) : null),
        [firestore, id],
    );
    const { data: item, isLoading } = useDoc<PpeIssue>(ppeRef);

    const [signOpen, setSignOpen] = React.useState(false);
    const signed = !!uid && (item?.tanilcsanIds ?? []).includes(uid);

    const employeeName = employeeProfile
        ? `${employeeProfile.lastName ?? ''} ${employeeProfile.firstName ?? ''}`.trim()
        : undefined;

    const recordSignature = () => {
        if (!firestore || !uid || !item) return;
        updateDocumentNonBlocking(doc(firestore, HSE_COLLECTIONS.ppeIssues, item.id), {
            tanilcsanIds: arrayUnion(uid),
        });
        setDocumentNonBlocking(
            doc(firestore, `employees/${uid}/hseSignatures/${item.id}`),
            { kind: 'ppe', itemId: item.id, garchig: 'Хамгаалах хэрэгслийн олголт', signedAt: Date.now() },
            { merge: true },
        );
    };

    const loading = isLoading || !employeeProfile;

    return (
        <div className="flex flex-col min-h-full">
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link href="/mobile/hse?folder=ppe">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-base font-semibold">Хамгаалах хэрэгсэл</h1>
                        <p className="text-xs text-muted-foreground">Олголтын дэлгэрэнгүй</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4">
                {loading ? (
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-9 w-32" />
                        </CardContent>
                    </Card>
                ) : !item ? (
                    <div className="flex flex-col items-center text-center py-16">
                        <HardHat className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Мэдээлэл олдсонгүй</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {item.albanTushaal && <span>{item.albanTushaal}</span>}
                            {item.ognoo && (
                                <span className="inline-flex items-center gap-1">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {item.ognoo}
                                </span>
                            )}
                        </div>

                        {/* Олгосон хэрэгслүүд */}
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold mb-2">Олгосон хэрэгсэл</h3>
                                {item.items && item.items.length > 0 ? (
                                    <div className="space-y-2">
                                        {item.items.map((it, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 border-b pb-2 text-sm last:border-b-0 last:pb-0"
                                            >
                                                {it.imgUrl && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <a href={it.imgUrl} target="_blank" rel="noreferrer">
                                                        <img
                                                            src={it.imgUrl}
                                                            alt={it.torol}
                                                            className="h-12 w-12 rounded-lg border object-cover"
                                                        />
                                                    </a>
                                                )}
                                                <span className="flex-1">{it.torol}</span>
                                                <span className="text-muted-foreground">{it.too ?? 1} ш</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Хэрэгсэл бүртгээгүй</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Хүлээн зөвшөөрөх нөхцөл */}
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="text-sm font-semibold mb-2">Хүлээн зөвшөөрөх нөхцөл</h3>
                                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                                    {PPE_ISSUE_TERMS.map((t, i) => (
                                        <li key={i}>{t}</li>
                                    ))}
                                </ol>
                            </CardContent>
                        </Card>

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
                            itemTitle="Хамгаалах хэрэгслийн олголт"
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
