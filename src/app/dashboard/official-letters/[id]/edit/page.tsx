import { redirect } from 'next/navigation';

export default async function LegacyOfficialLetterEditRedirect({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/official-letters/${id}/edit`);
}
