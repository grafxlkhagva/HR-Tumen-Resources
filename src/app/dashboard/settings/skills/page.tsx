'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SkillsSettingsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/skills');
    }, [router]);

    return (
        <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Ур чадварын модуль руу шилжүүлж байна...</p>
            </div>
        </div>
    );
}
