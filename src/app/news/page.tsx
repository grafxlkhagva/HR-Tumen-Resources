'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewsIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/news/posts');
  }, [router]);
  return null;
}
