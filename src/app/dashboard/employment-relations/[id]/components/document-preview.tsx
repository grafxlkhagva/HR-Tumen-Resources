'use client';

/**
 * DocumentPreview
 * ─────────────────────────────────────────────────────────────────────
 * ER баримтын бодит харагдац — placeholder-уудыг resolved утгаар орлуулан
 * sanitize хийсэн HTML-ийг rendered харуулна.
 *
 * Хэрэв `printSettings` дамжуулагдсан бол толгой (logo / байгууллагын нэр /
 * баримтын гарчиг / нэмэлт header текст) болон хөл (footer / QR) хэсгийг
 * `template-builder.tsx`-той ижил байдлаар харуулна. Ингэснээр загвар
 * тохируулсан толгой нь танилцах/хянах preview дээр харагдахгүй байсан
 * алдаа арилна.
 */

import * as React from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { generateDocumentContent } from '../../utils';
import { cn } from '@/lib/utils';
import type { PrintSettings } from '../../types';
import { DocumentQR } from '../../components/document-qr';

type ResolverData = Parameters<typeof generateDocumentContent>[1];

export interface DocumentPreviewProps {
    content: string;
    resolvers: ResolverData;
    className?: string;
    variant?: 'full' | 'compact';
    printSettings?: PrintSettings;
    companyProfile?: Record<string, unknown> | null;
    /** QR кодыг verify URL-аар үүсгэхэд хэрэгтэй. */
    documentId?: string | null;
    companyId?: string | null;
}

export const DocumentPreview = React.memo(function DocumentPreview({
    content,
    resolvers,
    className,
    variant = 'full',
    printSettings,
    companyProfile,
    documentId,
    companyId,
}: DocumentPreviewProps) {
    const html = React.useMemo(() => {
        return sanitizeHtml(generateDocumentContent(content || '', resolvers));
    }, [content, resolvers]);

    // Тэмдэглэл: байгууллагын нэр / лого / баримтын гарчгийг
    // `generateHeaderHtml`-ээр агуулгад шингэсэн `documentType.header`
    // тулгуурласан толгой үзүүлдэг тул энд `printSettings`-ийн masthead-ийг
    // үзүүлэхгүй (давхардал болохгүйн тулд).
    const hasHeaderText = !!printSettings?.header;
    const hasFooter = !!(printSettings?.footer || printSettings?.showQRCode);
    const hasWatermark = !!printSettings?.watermark;

    const sheetClass =
        variant === 'full'
            ? 'bg-white shadow-lg p-8 md:p-12 prose prose-slate max-w-none min-h-[600px] ring-1 ring-slate-200 relative overflow-hidden'
            : 'bg-white shadow-lg p-8 md:p-10 prose prose-slate max-w-none min-h-[600px] ring-1 ring-slate-200 relative overflow-hidden';

    // Хэрэв printSettings өгөгдөөгүй бол хуучин зан төлөв (зөвхөн agууlga) хэвээр.
    if (!printSettings) {
        return <div className={cn(sheetClass, className)} dangerouslySetInnerHTML={{ __html: html }} />;
    }

    return (
        <div className={cn(sheetClass, className)}>
            {hasWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] select-none overflow-hidden">
                    <span className="text-[120px] font-black tracking-tighter -rotate-45 whitespace-nowrap uppercase">
                        {printSettings.watermark}
                    </span>
                </div>
            )}

            <div className="relative z-10">
                {hasHeaderText && (
                    <div className="mb-6 pb-4 border-b border-slate-100 text-[10px] text-muted-foreground italic whitespace-pre-wrap text-center not-prose">
                        {printSettings.header}
                    </div>
                )}

                <div dangerouslySetInnerHTML={{ __html: html }} />

                {hasFooter && (
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-end justify-between gap-4 not-prose">
                        <div className="text-[10px] text-muted-foreground italic whitespace-pre-wrap flex-1">
                            {printSettings.footer}
                        </div>
                        {printSettings.showQRCode && (
                            <DocumentQR companyId={companyId} docId={documentId} size={56} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
