import { redirect } from 'next/navigation';

export default async function LegacyOfficialLetterIdRedirect({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/official-letters/${id}`);
}
