'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';

type State =
    | { kind: 'loading' }
    | { kind: 'ready'; companyName: string }
    | { kind: 'used' }
    | { kind: 'notfound' }
    | { kind: 'done'; score: number };

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function scoreColor(n: number, selected: boolean): string {
    if (selected) {
        if (n >= 9) return 'bg-emerald-600 text-white border-emerald-600';
        if (n >= 7) return 'bg-amber-500 text-white border-amber-500';
        return 'bg-rose-600 text-white border-rose-600';
    }
    const hover = n >= 9 ? 'hover:border-emerald-400' : n >= 7 ? 'hover:border-amber-400' : 'hover:border-rose-400';
    return `bg-white text-slate-700 border-slate-200 ${hover}`;
}

export default function SurveyPage() {
    const params = useParams<{ token: string }>();
    const token = params?.token;
    const [state, setState] = React.useState<State>({ kind: 'loading' });
    const [score, setScore] = React.useState<number | null>(null);
    const [note, setNote] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (!token) return;
        fetch(`/api/crm/survey?token=${encodeURIComponent(token)}`)
            .then(async (r) => {
                if (r.status === 404) return setState({ kind: 'notfound' });
                const d = await r.json();
                if (!d.ok) return setState({ kind: 'notfound' });
                if (d.used) return setState({ kind: 'used' });
                setState({ kind: 'ready', companyName: d.companyName || '' });
            })
            .catch(() => setState({ kind: 'notfound' }));
    }, [token]);

    const submit = async () => {
        if (score === null || !token) return;
        setSubmitting(true);
        setError('');
        try {
            const r = await fetch('/api/crm/survey/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, score, note }),
            });
            const d = await r.json();
            if (!r.ok) {
                if (d.error === 'already_used') return setState({ kind: 'used' });
                throw new Error(d.error || 'Илгээхэд алдаа гарлаа');
            }
            setState({ kind: 'done', score });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Алдаа гарлаа');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-2xl">
                        💚
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-cyan-700">Түмэн Тээх</div>
                        <div className="text-xs text-slate-500">Үйлчилгээний үнэлгээ</div>
                    </div>
                </div>

                {state.kind === 'loading' && (
                    <p className="py-10 text-center text-sm text-slate-400">Ачаалж байна...</p>
                )}

                {state.kind === 'notfound' && (
                    <div className="py-10 text-center">
                        <p className="text-2xl">🔗</p>
                        <p className="mt-2 text-sm text-slate-600">
                            Судалгааны холбоос хүчингүй байна.
                        </p>
                    </div>
                )}

                {state.kind === 'used' && (
                    <div className="py-10 text-center">
                        <p className="text-3xl">✅</p>
                        <p className="mt-2 text-sm text-slate-600">
                            Энэ судалгаа аль хэдийн бөглөгдсөн байна. Баярлалаа!
                        </p>
                    </div>
                )}

                {state.kind === 'done' && (
                    <div className="py-10 text-center">
                        <p className="text-4xl">🙏</p>
                        <p className="mt-3 text-base font-semibold text-slate-800">
                            Үнэлгээ өгсөнд баярлалаа!
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Таны {state.score} оноо бүртгэгдлээ. Санал бодлыг тань үйл ажиллагаандаа
                            тусгах болно.
                        </p>
                    </div>
                )}

                {state.kind === 'ready' && (
                    <>
                        <h1 className="text-lg font-semibold text-slate-800">
                            Та манай үйлчилгээг найз, хамтрагчдаа санал болгох магадлал хэд вэ?
                        </h1>
                        {state.companyName && (
                            <p className="mt-1 text-sm text-slate-500">
                                {state.companyName}-ийн нэрийн өмнөөс
                            </p>
                        )}

                        <div className="mt-6 grid grid-cols-6 gap-2 sm:grid-cols-11">
                            {SCORES.map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setScore(n)}
                                    className={`flex h-11 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${scoreColor(
                                        n,
                                        score === n,
                                    )}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                            <span>0 · Огт санал болгохгүй</span>
                            <span>10 · Заавал санал болгоно</span>
                        </div>

                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Санал хүсэлт (заавал биш)..."
                            rows={3}
                            className="mt-5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                        />

                        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

                        <button
                            type="button"
                            onClick={submit}
                            disabled={score === null || submitting}
                            className="mt-4 w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
                        >
                            {submitting ? 'Илгээж байна...' : 'Үнэлгээ илгээх'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
