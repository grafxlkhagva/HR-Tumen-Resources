
import React, { forwardRef } from 'react';
import { PrintSettings } from '../types';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';
import { DocumentQR } from './document-qr';

interface PrintLayoutProps {
    content: string;
    settings?: PrintSettings;
    documentId?: string | null;
    companyId?: string | null;
}

export const PrintLayout = forwardRef<HTMLDivElement, PrintLayoutProps>(({ content, settings, documentId, companyId }, ref) => {
    // Default settings if not provided
    const {
        pageSize = 'A4',
        orientation = 'portrait',
        margins = { top: 20, right: 20, bottom: 20, left: 20 },
        header,
        footer,
        watermark,
        showQRCode,
    } = settings || {};

    const sanitizedContent = sanitizeHtml(content);

    return (
        <div className="hidden">
            <div ref={ref} className="print-container">
                <style type="text/css" media="print">
                    {`
                        @page {
                            size: ${pageSize} ${orientation};
                            margin: 0; 
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact; 
                        }
                        .print-page {
                            padding: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
                            position: relative;
                            min-height: 100vh;
                            box-sizing: border-box;
                            overflow: hidden;
                            background: white; 
                        }
                        .watermark {
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(-45deg);
                            font-size: 80px;
                            color: rgba(200, 200, 200, 0.2);
                            z-index: 0;
                            pointer-events: none;
                            white-space: nowrap;
                            font-weight: bold;
                            text-transform: uppercase;
                        }
                        .header-section {
                            margin-bottom: 20px;
                        }
                        .footer-section {
                            margin-top: auto; 
                            padding-top: 20px;
                        }
                        .content-section {
                            position: relative;
                            z-index: 1;
                        }
                        /* Ensure content doesn't break awkwardly */
                        p, h1, h2, h3, h4, h5, h6, li {
                            page-break-inside: avoid;
                        }
                    `}
                </style>

                <div className="print-page flex flex-col">
                    {/* Watermark Overlay */}
                    {watermark && (
                        <div className="watermark">
                            {watermark}
                        </div>
                    )}

                    {/* Тэмдэглэл: Логo / байгууллагын нэр / баримтын гарчиг нь
                        агуулгад `generateHeaderHtml`-р шингэсэн docType толгойгоор
                        харагддаг тул энд printSettings-ийн masthead-ийг үзүүлэхгүй
                        (давхардал болохгүйн тулд). Зөвхөн нэмэлт rich-text header
                        текст үлдээв. */}
                    {header && (
                        <div className="header-section text-center mb-8">
                            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(header) }} />
                        </div>
                    )}

                    {/* Main Content */}
                    <div
                        className="content-section prose prose-sm max-w-none flex-grow"
                        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                    />

                    {/* Footer */}
                    <div className="footer-section mt-8 pt-4 border-t border-slate-100 flex items-end justify-between">
                        <div className="flex-1 text-xs text-slate-500">
                            {footer && <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(footer) }} />}
                        </div>

                        {showQRCode && (
                            <div className="ml-4 shrink-0">
                                <DocumentQR companyId={companyId} docId={documentId} size={72} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

PrintLayout.displayName = 'PrintLayout';
