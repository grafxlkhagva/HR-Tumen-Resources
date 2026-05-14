import { redirect } from 'next/navigation';

export default async function LegacyTemplateEditRedirect({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/official-letters/templates/${id}/edit`);
}
