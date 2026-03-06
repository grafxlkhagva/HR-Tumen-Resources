'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OffboardingSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/offboarding/settings');
  }, [router]);

  return <div className="p-8 text-center text-muted-foreground">Шилжүүлж байна...</div>;
}

