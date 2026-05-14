'use client';

import React from 'react';
import type { Editor } from '@tiptap/react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';
import { FieldChipEditor } from './field-chip-editor';
import { DocumentQR } from './document-qr';

import { PrintSettings } from '../types';

interface TemplateBuilderProps {
    content: string;
    onChange: (content: string) => void;
    resolvers?: Record<string, string>; // Map of {{field}} -> "Real Value"
    overrides?: Record<string, string>;
    onOverridesChange?: (next: Record<string, string>) => void;
    disabled?: boolean;
    printSettings?: PrintSettings;
    companyProfile?: Record<string, unknown> | null;
}

export function TemplateBuilder({
    content,
    onChange,
    resolvers,
    overrides,
    onOverridesChange,
    disabled,
    printSettings,
    companyProfile,
}: TemplateBuilderProps) {
    const editorRef = React.useRef<Editor | null>(null);

    // Free-form Firestore profile object — narrow common fields locally
    const companyLogoUrl = typeof companyProfile?.logoUrl === 'string' ? companyProfile.logoUrl : '';
    const companyLegalName = typeof companyProfile?.legalName === 'string' ? companyProfile.legalName : '';
    const companyName = typeof companyProfile?.name === 'string' ? companyProfile.name : '';

    return (
        <div className="space-y-6">
            {/* ... Content Editor ... */}
            <div className="flex items-center justify-between">
                <Label className="text-lg font-bold">Баримтын агуулга</Label>
                <div className="text-xs text-muted-foreground bg-slate-100 px-3 py-1 rounded-full">
                    Загварчлах горим
                </div>
            </div>

            <div className="flex justify-center bg-slate-200/50 p-4 md:p-8 rounded-xl overflow-auto border-inner shadow-inner min-h-[600px]">
                <Card
                    className={`
                        border-none shadow-2xl bg-white transition-all duration-300 relative overflow-hidden
                        ${printSettings?.pageSize === 'A5' ? (printSettings?.orientation === 'landscape' ? 'w-[210mm] h-[148.5mm]' : 'w-[148.5mm] h-[210mm]') : (printSettings?.orientation === 'landscape' ? 'w-[297mm] h-[210mm]' : 'w-[210mm] h-[297mm]')}
                    `}
                    style={{
                        padding: printSettings ? `${printSettings.margins.top}mm ${printSettings.margins.right}mm ${printSettings.margins.bottom}mm ${printSettings.margins.left}mm` : '20mm'
                    }}
                >
                    {/* ... Watermark ... */}
                    {printSettings?.watermark && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] select-none overflow-hidden">
                            <span className="text-[120px] font-black tracking-tighter -rotate-45 whitespace-nowrap uppercase">
                                {printSettings.watermark}
                            </span>
                        </div>
                    )}

                    <CardContent className="p-0 h-full flex flex-col relative z-10 bg-transparent">
                        {/* ... Header ... */}
                        {(printSettings?.showLogo || printSettings?.companyName || printSettings?.documentTitle) && (
                            <div className="mb-8 flex flex-col items-center text-center space-y-4">
                                {printSettings?.showLogo && (
                                    <div className="h-20 w-20 bg-slate-50 border rounded-2xl p-2 flex items-center justify-center overflow-hidden">
                                        {companyLogoUrl ? (
                                            <img src={companyLogoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <Building2 className="h-10 w-10 text-slate-200" />
                                        )}
                                    </div>
                                )}

                                {printSettings?.companyName !== undefined && (
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black tracking-[0.2em] uppercase text-slate-800">
                                            {printSettings.companyName || companyLegalName || companyName || 'БАЙГУУЛЛАГЫН НЭР'}
                                        </h3>
                                        <div className="h-0.5 w-16 bg-primary/20 mx-auto rounded-full" />
                                    </div>
                                )}

                                {printSettings?.documentTitle && (
                                    <div className="pt-4">
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                                            {printSettings.documentTitle}
                                        </h2>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Custom Header Text */}
                        {printSettings?.header && (
                            <div className="mb-6 pb-4 border-b border-slate-100 text-[10px] text-muted-foreground italic whitespace-pre-wrap text-center">
                                {printSettings.header}
                            </div>
                        )}

                        <div className="flex-1 min-h-0">
                            <FieldChipEditor
                                content={content}
                                onChange={onChange}
                                resolvers={resolvers || {}}
                                overrides={overrides || {}}
                                onOverridesChange={onOverridesChange || (() => {})}
                                disabled={disabled}
                                onReady={(editor) => { editorRef.current = editor; }}
                            />
                        </div>

                        {/* Footer & QR Code Rendering */}
                        {(printSettings?.footer || printSettings?.showQRCode) && (
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-end justify-between gap-4">
                                <div className="text-[10px] text-muted-foreground italic whitespace-pre-wrap flex-1">
                                    {printSettings?.footer}
                                </div>
                                {printSettings?.showQRCode && (
                                    <DocumentQR size={56} />
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
