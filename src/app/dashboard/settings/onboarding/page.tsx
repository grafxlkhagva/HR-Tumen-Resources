'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/onboarding/settings');
  }, [router]);

  return <div className="p-8 text-center text-muted-foreground">Шилжүүлж байна...</div>;
}

