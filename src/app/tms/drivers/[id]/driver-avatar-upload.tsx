'use client';

import * as React from 'react';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { TMS_DRIVERS_COLLECTION } from '@/app/tms/types';
import type { TmsDriver } from '@/app/tms/types';
import { Loader2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    driver: TmsDriver;
    displayName: string;
}

const STORAGE_PREFIX = 'tms_drivers';

export function DriverAvatarUpload({ driver, displayName }: Props) {
    const { firestore, storage } = useFirebase();
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);

    const handleImageUpload = async (file: File) => {
        if (!storage || !firestore || !driver.id) return;

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const storagePath = `${STORAGE_PREFIX}/${driver.id}/profile_${Date.now()}.${ext}`;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            await updateDoc(doc(firestore, TMS_DRIVERS_COLLECTION, driver.id), {
                photoURL: url,
                updatedAt: serverTimestamp(),
            });

            toast({ title: 'Профайл зураг шинэчлэгдлээ.' });
        } catch (e: unknown) {
            toast({
                variant: 'destructive',
                title: 'Зураг байршуулах алдаа',
                description: e instanceof Error ? e.message : 'Дахин оролдоно уу.'
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f);
                    e.target.value = '';
                }}
            />
            <div
                role="button"
                tabIndex={0}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && !isUploading && fileInputRef.current?.click()}
                className={cn(
                    "relative group cursor-pointer rounded-full",
                    isUploading && "opacity-70 pointer-events-none"
                )}
            >
                <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                    <AvatarImage src={driver.photoURL} alt={displayName} />
                    <AvatarFallback className="text-3xl bg-muted">{displayName.charAt(0)}</AvatarFallback>
                </Avatar>

                {/* Hover / Uploading Overlay */}
                <div className={cn(
                    "absolute inset-0 rounded-full flex items-center justify-center bg-black/50 text-white transition-opacity",
                    isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    {isUploading ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                        <Camera className="h-8 w-8" />
                    )}
                </div>
            </div>
            <span className="text-sm text-muted-foreground">Профайл зураг солих</span>
        </div>
    );
}
