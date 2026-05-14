'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { TemplateForm } from '../../components/template-form';

export default function EditTemplatePage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    if (!id) return null;
    return <TemplateForm mode="edit" templateId={id} />;
}
