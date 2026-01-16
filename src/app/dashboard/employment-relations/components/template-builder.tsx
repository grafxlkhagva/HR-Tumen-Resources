'use client';

import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { DynamicFieldSelector } from './dynamic-field-selector';
import { Label } from '@/components/ui/label';
import { QrCode, Building2 } from 'lucide-react';

import { PrintSettings } from '../types';

interface TemplateBuilderProps {
    content: string;
    onChange: (content: string) => void;
    resolvers?: Record<string, string>; // Map of {{field}} -> "Real Value"
    printSettings?: PrintSettings;
    companyProfile?: any;
}

export function TemplateBuilder({ content, onChange, resolvers, printSettings, companyProfile }: TemplateBuilderProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInsertField = (field: string) => {
        // If resolvers exist and contain the field, insert the real value. Otherwise insert the placeholder.
        const textToInsert = (resolvers && resolvers[field]) ? resolvers[field] : field;

        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        const newContent = before + textToInsert + after;
        onChange(newContent);

        // Restore cursor position after update
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
        }, 0);
    };

    return (
        <div className="space-y-6">
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
                    {/* Watermark Overlay */}
                    {printSettings?.watermark && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] select-none overflow-hidden">
                            <span className="text-[120px] font-black tracking-tighter -rotate-45 whitespace-nowrap uppercase">
                                {printSettings.watermark}
                            </span>
                        </div>
                    )}

                    <CardContent className="p-0 h-full flex flex-col relative z-10 bg-transparent">
                        {/* Professional Structured Header */}
                        {(printSettings?.showLogo || printSettings?.companyName || printSettings?.documentTitle) && (
                            <div className="mb-8 flex flex-col items-center text-center space-y-4">
                                {printSettings?.showLogo && (
                                    <div className="h-20 w-20 bg-slate-50 border rounded-2xl p-2 flex items-center justify-center overflow-hidden">
                                        {companyProfile?.logoUrl ? (
                                            <img src={companyProfile.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <Building2 className="h-10 w-10 text-slate-200" />
                                        )}
                                    </div>
                                )}

                                {printSettings?.companyName !== undefined && (
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black tracking-[0.2em] uppercase text-slate-800">
                                            {printSettings.companyName || companyProfile?.legalName || companyProfile?.name || 'БАЙГУУЛЛАГЫН НЭР'}
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
                            <Textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => onChange(e.target.value)}
                                className="w-full h-full font-mono text-sm leading-relaxed resize-none border-none focus-visible:ring-0 bg-transparent p-0"
                                placeholder="Загварын агуулгыг энд бичнэ үү..."
                            />
                        </div>

                        {/* Footer & QR Code Rendering */}
                        {(printSettings?.footer || printSettings?.showQRCode) && (
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-end justify-between gap-4">
                                <div className="text-[10px] text-muted-foreground italic whitespace-pre-wrap flex-1">
                                    {printSettings?.footer}
                                </div>
                                {printSettings?.showQRCode && (
                                    <div className="shrink-0 p-1 border border-slate-200 rounded-sm bg-slate-50">
                                        <QrCode className="h-10 w-10 text-slate-400" />
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t">
                <div className="lg:col-span-1 space-y-2">
                    <Label className="text-base font-bold text-slate-900">Динамик талбарууд</Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Та хүссэн талбараа дээрх текст рүү чирч оруулж эсвэл жагсаалтаас сонгож нэмэх боломжтой. Сонгосон талбар нь тухайн ажилтны бодит мэдээллээр автоматаар солигдоно.
                    </p>
                    <div className="pt-2">
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-[10px] italic">
                            Жишээ: <code>{`{{employee.firstName}}`}</code> гэж бичвэл ажилтны нэрээр солигдоно.
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <DynamicFieldSelector onSelect={handleInsertField} />
                </div>
            </div>
        </div>
    );
}
