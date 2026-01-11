import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
            <h2 className="text-2xl font-bold">Хуудас олдсонгүй (404)</h2>
            <p className="text-muted-foreground">Таны хайсан хуудас байхгүй байна.</p>
            <Link href="/dashboard" className="px-4 py-2 bg-primary text-white rounded-md">
                Нүүр хуудас руу буцах
            </Link>
        </div>
    );
}
