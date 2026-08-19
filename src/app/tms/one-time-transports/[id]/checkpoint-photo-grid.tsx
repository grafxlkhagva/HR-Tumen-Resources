'use client';

import * as React from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckpointPhotoGridProps {
  photos: string[];
  onUpload: (files: File[]) => void;
  onRemove: (index: number) => void;
  uploading: boolean;
  label: string;
  disabled?: boolean;
}

/** Checkpoint-ийн зургийн grid — upload товч + thumbnail-ууд (hover ×) */
export function CheckpointPhotoGrid({
  photos,
  onUpload,
  onRemove,
  uploading,
  label,
  disabled,
}: CheckpointPhotoGridProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((url, idx) => (
          <div
            key={`${idx}-${url.slice(-24)}`}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Зураг ${idx + 1}`} className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                aria-label="Зураг устгах"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-muted-foreground transition-colors',
              uploading
                ? 'cursor-wait border-muted'
                : 'hover:border-primary hover:text-primary'
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <UploadCloud className="h-5 w-5" />
                <span className="text-[10px]">Зураг нэмэх</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onUpload(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
