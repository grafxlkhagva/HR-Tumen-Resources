'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

/**
 * TMS нүүр — одоогоор Харилцагчид хуудас руу шилжүүлнэ.
 */
export default function TmsPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    router.replace('/tms/customers');
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
