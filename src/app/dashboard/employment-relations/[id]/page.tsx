import { DocumentDetailClient } from './document-detail-client';

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    if (!id) {
        return (
            <div className="p-10 text-center text-muted-foreground">
                Баримт олдсонгүй
            </div>
        );
    }
    return <DocumentDetailClient documentId={id} />;
}
