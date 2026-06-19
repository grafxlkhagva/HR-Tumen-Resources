'use client';

import * as React from 'react';
import { FileUp, FileText, Loader2, X, ExternalLink } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadHseFile } from '../services/hse-service';

/**
 * Ерөнхий файл байршуулагч (PDF гэх мэт).
 * Зурагнаас ялгаатай нь файлын нэр + үзэх холбоосыг харуулна.
 */
export function FileUpload({
    value,
    onChange,
    folder,
    accept = 'application/pdf',
    label = 'Файл нэмэх',
    disabled,
    className,
}: {
    value?: string;
    onChange: (url: string | undefined) => void;
    folder: string;
    accept?: string;
    label?: string;
    disabled?: boolean;
    className?: string;
}) {
    const { storage } = useFirebase();
    const [uploading, setUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [fileName, setFileName] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFile = async (file: File | undefined) => {
        if (!file || !storage) return;
        setError(null);
        setUploading(true);
        try {
            const url = await uploadHseFile(storage, folder, file);
            setFileName(file.name);
            onChange(url);
        } catch {
            setError('Файл байршуулахад алдаа гарлаа.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className={cn('space-y-2', className)}>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                disabled={disabled || uploading}
                onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {value ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                    <FileText className="h-4 w-4 shrink-0 text-error" />
                    <span className="min-w-0 flex-1 truncate text-caption">
                        {fileName || 'Хавсаргасан файл'}
                    </span>
                    <Button type="button" variant="ghost" size="icon-sm" asChild>
                        <a href={value} target="_blank" rel="noreferrer" title="Үзэх">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </Button>
                    {!disabled && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                                setFileName(null);
                                onChange(undefined);
                            }}
                        >
                            <X className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                    )}
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled || uploading}
                    onClick={() => inputRef.current?.click()}
                    className="w-full justify-start gap-2 border-dashed"
                >
                    {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <FileUp className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-caption text-muted-foreground">
                        {uploading ? 'Байршуулж байна...' : label}
                    </span>
                </Button>
            )}
            {error && <p className="text-micro text-destructive">{error}</p>}
        </div>
    );
}
