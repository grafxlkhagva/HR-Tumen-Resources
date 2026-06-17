'use client';

import * as React from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadHseFile } from '../services/hse-service';

export function ImageUpload({
    value,
    onChange,
    folder,
    disabled,
    className,
}: {
    value?: string;
    onChange: (url: string | undefined) => void;
    folder: string;
    disabled?: boolean;
    className?: string;
}) {
    const { storage } = useFirebase();
    const [uploading, setUploading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFile = async (file: File | undefined) => {
        if (!file || !storage) return;
        setError(null);
        setUploading(true);
        try {
            const url = await uploadHseFile(storage, folder, file);
            onChange(url);
        } catch (e) {
            setError('Зураг байршуулахад алдаа гарлаа.');
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
                accept="image/*"
                className="hidden"
                disabled={disabled || uploading}
                onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {value ? (
                <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt="Хавсаргасан зураг"
                        className="h-32 w-32 rounded-md border object-cover"
                    />
                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => onChange(undefined)}
                            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled || uploading}
                    onClick={() => inputRef.current?.click()}
                    className="h-32 w-32 flex-col gap-2 border-dashed"
                >
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-micro text-muted-foreground">
                        {uploading ? 'Байршуулж байна...' : 'Зураг нэмэх'}
                    </span>
                </Button>
            )}
            {error && <p className="text-micro text-destructive">{error}</p>}
        </div>
    );
}
