'use client';

import * as React from 'react';
import { ImageUpload } from '../components/image-upload';

/**
 * Олон зураг хавсаргах сүлжээ — string[] (URL-ууд) хадгална.
 * ФОТО ЗУРАГ хэсэгт ашиглана: одоо байгаа зургууд + нэг хоосон нүх.
 */
export function PhotoGrid({
    value,
    onChange,
    folder,
}: {
    value: string[];
    onChange: (next: string[]) => void;
    folder: string;
}) {
    const setAt = (i: number, url: string | undefined) => {
        const next = [...value];
        if (url) next[i] = url;
        else next.splice(i, 1);
        onChange(next);
    };
    const add = (url: string | undefined) => {
        if (url) onChange([...value, url]);
    };

    return (
        <div className="flex flex-wrap gap-3">
            {value.map((url, i) => (
                <ImageUpload key={i} value={url} onChange={(u) => setAt(i, u)} folder={folder} />
            ))}
            <ImageUpload value={undefined} onChange={add} folder={folder} />
        </div>
    );
}
