'use client';

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { StatusBadge } from './status-badge';
import { useHseEmployees } from './use-hse-employees';
import { Check, FileText, Video } from 'lucide-react';

/** Гарын үсэг зурсан огноог YYYY-MM-DD HH:mm болгож форматлана. */
function formatTs(ms?: number): string {
    if (!ms) return '';
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Сургалт/зааварчилгаа/сэрэмжлүүлгийн дэлгэрэнгүй — танилцсан материал болон
 * ажилтан тус бүрийн зурсан гарын үсэг, огноог харуулна.
 */
export function SignersDetailDialog({
    open,
    onOpenChange,
    title,
    subtitle,
    itemId,
    assignedIds,
    signedIds,
    images = [],
    pdfUrl,
    videoUrl,
    extraContent,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    subtitle?: string;
    itemId: string;
    assignedIds: string[];
    signedIds: string[];
    images?: (string | undefined)[];
    pdfUrl?: string;
    videoUrl?: string;
    extraContent?: React.ReactNode;
}) {
    const { byId } = useHseEmployees();

    const signedSet = React.useMemo(() => new Set(signedIds ?? []), [signedIds]);
    const ids = React.useMemo(
        () => Array.from(new Set([...(assignedIds ?? []), ...(signedIds ?? [])])),
        [assignedIds, signedIds],
    );
    const validImages = images.filter(Boolean) as string[];
    const hasMaterial = validImages.length > 0 || !!pdfUrl || !!videoUrl;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="pr-6">{title}</DialogTitle>
                    {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
                </DialogHeader>

                {/* Танилцсан материал */}
                {hasMaterial && (
                    <div className="space-y-2">
                        <h3 className="text-caption font-semibold">Танилцсан материал</h3>
                        <div className="flex flex-wrap items-center gap-2">
                            {validImages.map((src, i) => (
                                <a key={i} href={src} target="_blank" rel="noreferrer" title="Зураг">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt="" className="h-24 rounded-lg border object-cover" />
                                </a>
                            ))}
                            {pdfUrl && (
                                <a
                                    href={pdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-caption font-medium text-error"
                                >
                                    <FileText className="h-4 w-4" />
                                    PDF материал
                                </a>
                            )}
                            {videoUrl && (
                                <a
                                    href={videoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-caption font-medium text-info"
                                >
                                    <Video className="h-4 w-4" />
                                    Видео
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Нэмэлт агуулга (жишээ: олгосон хэрэгслүүд) */}
                {extraContent}

                {/* Танилцсан ажилтнууд + гарын үсэг */}
                <div className="space-y-2">
                    <h3 className="text-caption font-semibold">
                        Танилцсан ажилтнууд ({signedSet.size}/{(assignedIds ?? []).length})
                    </h3>
                    {ids.length === 0 ? (
                        <p className="text-caption text-muted-foreground">Хуваарилагдсан ажилтан алга.</p>
                    ) : (
                        <div className="space-y-2">
                            {ids.map((uid) => (
                                <SignerRow
                                    key={uid}
                                    uid={uid}
                                    itemId={itemId}
                                    signed={signedSet.has(uid)}
                                    name={byId.get(uid)?.name ?? uid}
                                    jobTitle={byId.get(uid)?.jobTitle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SignerRow({
    uid,
    itemId,
    signed,
    name,
    jobTitle,
}: {
    uid: string;
    itemId: string;
    signed: boolean;
    name: string;
    jobTitle?: string;
}) {
    const { firestore } = useFirebase();

    const sigRef = useMemoFirebase(
        () => (firestore && signed ? doc(firestore, `employees/${uid}/meta/signature`) : null),
        [firestore, uid, signed],
    );
    const { data: sig } = useDoc<{ dataUrl?: string }>(sigRef);

    const auditRef = useMemoFirebase(
        () => (firestore && signed ? doc(firestore, `employees/${uid}/hseSignatures/${itemId}`) : null),
        [firestore, uid, itemId, signed],
    );
    const { data: audit } = useDoc<{ signedAt?: number }>(auditRef);

    return (
        <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{name}</p>
                {jobTitle && <p className="truncate text-micro text-muted-foreground">{jobTitle}</p>}
                {signed && audit?.signedAt && (
                    <p className="text-micro text-muted-foreground">{formatTs(audit.signedAt)}</p>
                )}
            </div>
            {signed ? (
                sig?.dataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={sig.dataUrl}
                        alt="Гарын үсэг"
                        className="h-12 max-w-[130px] rounded border bg-white object-contain px-1"
                    />
                ) : (
                    <StatusBadge tone="green">
                        <Check className="mr-1 h-3 w-3" />
                        Зурсан
                    </StatusBadge>
                )
            ) : (
                <StatusBadge tone="amber">Хүлээгдэж буй</StatusBadge>
            )}
        </div>
    );
}
