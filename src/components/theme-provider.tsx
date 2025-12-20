'use client';

import * as React from 'react';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { hexToHsl } from '@/lib/color-utils';

interface BrandColor {
    id: string;
    name: string;
    hex: string;
}

interface ThemeMapping {
    primary: string;
    secondary: string;
    accent: string;
    // We can add more slots here as needed by the Design Schema
}

interface CompanyBranding {
    brandColors: BrandColor[];
    themeMapping: ThemeMapping;
}

export function CompanyThemeProvider({ children }: { children: React.ReactNode }) {
    const { firestore } = useFirebase();

    const brandingRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'company', 'branding') : null),
        [firestore]
    );

    const { data: branding } = useDoc<CompanyBranding>(brandingRef as any);

    React.useEffect(() => {
        if (!branding || !branding.themeMapping || !branding.brandColors) return;

        const { themeMapping, brandColors } = branding;
        const root = document.documentElement;

        // Helper to find hex by ID
        const getColorHex = (id: string) => brandColors.find(c => c.id === id)?.hex;

        // Map and Apply
        const mappings: { slot: string; colorId: string }[] = [
            { slot: '--primary', colorId: themeMapping.primary },
            { slot: '--secondary', colorId: themeMapping.secondary },
            { slot: '--accent', colorId: themeMapping.accent },
        ];

        mappings.forEach(({ slot, colorId }) => {
            const hex = getColorHex(colorId);
            if (hex) {
                const hsl = hexToHsl(hex);
                if (hsl) {
                    root.style.setProperty(slot, hsl);
                }
            }
        });

    }, [branding]);

    return <>{children}</>;
}
