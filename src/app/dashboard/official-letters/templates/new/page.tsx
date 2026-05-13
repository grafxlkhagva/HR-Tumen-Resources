'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { TemplateForm } from '../components/template-form';

export default function NewTemplatePage() {
    const searchParams = useSearchParams();
    const cloneFromId = searchParams.get('cloneFrom') || undefined;
    return <TemplateForm mode="create" cloneFromId={cloneFromId} />;
}
