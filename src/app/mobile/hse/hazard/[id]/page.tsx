'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc, arrayUnion } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/app/hse/components/status-badge';
import { ImageUpload } from '@/app/hse/components/image-upload';
import { uploadCorrectionFile } from '@/app/hse/services/hse-service';
import { HSE_COLLECTIONS, hazardStatusTone, riskTone, type Hazard } from '@/app/hse/types';
import { ArrowLeft, CalendarDays, MapPin, CheckCircle2, Wrench, ShieldCheck, AlertTriangle } from 'lucide-react';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function MobileHseHazardDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params.id;

    const { firestore, storage } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const uid = employeeProfile?.id;

    const hazardRef = useMemoFirebase(
        () => (firestore && id ? doc(firestore, HSE_COLLECTIONS.hazards, id) : null),
        [firestore, id],
    );
    const { data: item, isLoading } = useDoc<Hazard>(hazardRef);

    const [fixMode, setFixMode] = React.useState(false);
    const [corrDesc, setCorrDesc] = React.useState('');
    const [corrImg, setCorrImg] = React.useState<string | undefined>();
    const [error, setError] = React.useState('');

    const acknowledged = !!uid && (item?.tanilcsanIds ?? []).includes(uid);
    const fixed = !!item?.zalruulga;

    const acknowledge = () => {
        if (!firestore || !uid || !item) return;
        updateDocumentNonBlocking(doc(firestore, HSE_COLLECTIONS.hazards, item.id), {
            tanilcsanIds: arrayUnion(uid),
        });
    };

    const submitFix = () => {
        if (!firestore || !uid || !item) return;
        if (!corrDesc.trim()) {
            setError('Залруулгын тайлбар бичнэ үү.');
            return;
        }
        updateDocumentNonBlocking(doc(firestore, HSE_COLLECTIONS.hazards, item.id), {
            zalruulga: {
                desc: corrDesc.trim(),
                zasagchId: uid,
                ognoo: todayStr(),
                imgUrl: corrImg ?? null,
                videoUrl: null,
            },
            tuluw: 'Хэвийн',
            tanilcsanIds: arrayUnion(uid),
        });
        setFixMode(false);
    };

    const loading = isLoading || !employeeProfile;

    return (
        <div className="flex flex-col min-h-full">
            <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link href="/mobile/hse?folder=hazard">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-base font-semibold">Аюул</h1>
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
                            <Skeleton className="h-9 w-32" />
                        </CardContent>
                    </Card>
                ) : !item ? (
                    <div className="flex flex-col items-center text-center py-16">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Мэдээлэл олдсонгүй</p>
                    </div>
                ) : (
                    <>
                        {/* Гарчиг + төлөв */}
                        <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <h2 className="text-lg font-semibold leading-snug">{item.desc}</h2>
                                <div className="flex flex-shrink-0 flex-wrap justify-end gap-1 pt-1">
                                    <StatusBadge tone={hazardStatusTone(item.tuluw)}>{item.tuluw}</StatusBadge>
                                    {item.ersdel && <StatusBadge tone={riskTone(item.ersdel)}>{item.ersdel}</StatusBadge>}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {item.angilal && <span>{item.angilal}</span>}
                                {item.bairshil && (
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {item.bairshil}
                                    </span>
                                )}
                                {item.ognoo && (
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="h-3.5 w-3.5" />
                                        {item.ognoo}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Аюулын зураг */}
                        {item.imgUrl && (
                            <a href={item.imgUrl} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={item.imgUrl}
                                    alt={item.desc}
                                    className="w-full rounded-xl border object-cover max-h-72"
                                />
                            </a>
                        )}

                        {/* Залруулга (хийгдсэн бол) */}
                        {fixed && item.zalruulga && (
                            <Card className="border-success/30 bg-success/5">
                                <CardContent className="p-4 space-y-2">
                                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-success">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Залруулга хийгдсэн
                                    </h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {item.zalruulga.desc}
                                    </p>
                                    {item.zalruulga.ognoo && (
                                        <p className="text-xs text-muted-foreground">{item.zalruulga.ognoo}</p>
                                    )}
                                    {item.zalruulga.imgUrl && (
                                        <a href={item.zalruulga.imgUrl} target="_blank" rel="noreferrer">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={item.zalruulga.imgUrl}
                                                alt="Залруулга"
                                                className="mt-1 w-full rounded-lg border object-cover max-h-56"
                                            />
                                        </a>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Үйлдэл */}
                        {fixMode ? (
                            <Card>
                                <CardContent className="p-4 space-y-3">
                                    <h3 className="text-sm font-semibold">Аюулыг арилгах</h3>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground">Хийсэн арга хэмжээ</label>
                                        <Textarea
                                            value={corrDesc}
                                            onChange={(e) => {
                                                setCorrDesc(e.target.value);
                                                setError('');
                                            }}
                                            placeholder="Аюулыг хэрхэн арилгасан тухай..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground">Зураг</label>
                                        <ImageUpload
                                            value={corrImg}
                                            onChange={setCorrImg}
                                            uploader={(f) => uploadCorrectionFile(storage!, uid!, f)}
                                        />
                                    </div>
                                    {error && <p className="text-xs text-error">{error}</p>}
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="flex-1" onClick={() => setFixMode(false)}>
                                            Болих
                                        </Button>
                                        <Button className="flex-1 gap-1.5" onClick={submitFix}>
                                            <CheckCircle2 className="h-4 w-4" />
                                            Илгээх
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : acknowledged ? (
                            <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 py-3 text-sm font-medium text-success">
                                <CheckCircle2 className="h-5 w-5" />
                                {fixed ? 'Арилгаж, танилцсан' : 'Танилцсан'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="gap-1.5" size="lg" onClick={acknowledge}>
                                    <ShieldCheck className="h-4 w-4" />
                                    Танилцах
                                </Button>
                                <Button className="gap-1.5" size="lg" onClick={() => setFixMode(true)}>
                                    <Wrench className="h-4 w-4" />
                                    Арилгах
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
