// src/app/dashboard/employment-relations/components/document-qr.tsx
//
// Бодит QR код компонент. `qrcode` library-р dataURL үүсгэж <img>-р үзүүлнэ.
// `companyId` болон `docId` бүхий public verify URL руу заана —
// `/verify/er/{companyId}/{docId}`.

'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { QrCode as QrCodeIcon } from 'lucide-react';

interface DocumentQRProps {
    companyId?: string | null;
    docId?: string | null;
    size?: number;
    className?: string;
    /** True үед URL-ыг QR-ийн доор бичиж харуулна. */
    showUrl?: boolean;
}

const buildVerifyUrl = (companyId: string, docId: string): string => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/verify/er/${companyId}/${docId}`;
    }
    // SSR fallback — encoded URL зөвхөн client-д үүсгэдэг тул энэ нь зөвхөн
    // түр fallback (компонент `useEffect`-д dataURL үүсгэхэд бодит origin-ыг авна).
    return `/verify/er/${companyId}/${docId}`;
};

export function DocumentQR({ companyId, docId, size = 64, className, showUrl = false }: DocumentQRProps) {
    const [dataUrl, setDataUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState<boolean>(false);

    const verifyUrl = React.useMemo(() => {
        if (!companyId || !docId) return null;
        return buildVerifyUrl(companyId, docId);
    }, [companyId, docId]);

    React.useEffect(() => {
        let cancelled = false;
        if (!verifyUrl) {
            setDataUrl(null);
            return;
        }
        QRCode.toDataURL(verifyUrl, {
            margin: 1,
            width: Math.max(size * 2, 128),
            errorCorrectionLevel: 'M',
            color: { dark: '#0f172a', light: '#ffffff' },
        })
            .then((url) => {
                if (!cancelled) {
                    setDataUrl(url);
                    setError(false);
                }
            })
            .catch((e) => {
                console.warn('[DocumentQR] generation failed:', e);
                if (!cancelled) setError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [verifyUrl, size]);

    // Загвар editor дээр docId байхгүй — placeholder icon үзүүлнэ.
    if (!verifyUrl || error) {
        return (
            <div
                className={className ?? 'p-1 border border-slate-200 rounded-sm bg-slate-50 flex items-center justify-center'}
                style={{ width: size, height: size }}
                title="QR код (баримт хадгалсны дараа үүснэ)"
            >
                <QrCodeIcon className="h-8 w-8 text-slate-400" />
            </div>
        );
    }

    return (
        <div className={className ?? 'flex flex-col items-center gap-1'}>
            {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={dataUrl}
                    alt="Document verification QR"
                    width={size}
                    height={size}
                    className="border border-slate-200 rounded-sm bg-white"
                />
            ) : (
                <div
                    className="border border-slate-200 rounded-sm bg-slate-50 animate-pulse"
                    style={{ width: size, height: size }}
                />
            )}
            {showUrl && (
                <span className="text-[8px] text-muted-foreground font-mono break-all">{verifyUrl}</span>
            )}
        </div>
    );
}
