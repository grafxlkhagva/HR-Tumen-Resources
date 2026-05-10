'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CrmIndexPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/crm/contacts');
    }, [router]);
    return null;
}
