import { redirect } from 'next/navigation';

export default async function LegacyPostEditRedirect({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    redirect(`/news/edit/${id}`);
}
