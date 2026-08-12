import Image from 'next/image';
import { Lock } from 'lucide-react';
import { RouteMotif } from './route-motif';
import { SYSTEM_MODULES } from './modules';

interface BrandPanelProps {
    /** Firestore company/profile → .name (fallback: "Түмэн Тээх") */
    companyName: string;
    isLoadingProfile: boolean;
}

/**
 * Зүүн талын брэндийн блок — гүн navy гадаргуу.
 * Энэ гадаргуу нь light/dark аль ч горимд ижил (брэндийн өнгө),
 * тиймээс дээрх бүх текст цайвар өнгөтэй тогтмол байна.
 */
export function BrandPanel({ companyName, isLoadingProfile }: BrandPanelProps) {
    return (
        <header className="relative isolate overflow-hidden bg-[#1E223E] text-white lg:max-h-screen lg:overflow-y-auto">
            {/* гүн градиент гадаргуу */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(152deg,#2b3159_0%,#1E223E_46%,#14172a_100%)]"
            />
            {/* брэндийн улбар шар туяа */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_15%_0%,rgba(209,100,57,0.28),transparent_60%)]"
            />
            {/* логистикийн мотив */}
            <RouteMotif className="pointer-events-none absolute inset-0 h-full w-full" />

            {/* ирмэгийн нарийн зураас — утсан дээр доор, дэлгэц дээр баруун талд */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D16439]/50 to-transparent lg:hidden"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-gradient-to-b from-transparent via-[#D16439]/40 to-transparent lg:block"
            />

            <div className="relative flex h-full flex-col gap-5 px-5 py-6 sm:gap-7 sm:px-8 sm:py-9 lg:justify-between lg:gap-10 lg:px-12 lg:py-12 xl:px-16 xl:py-14">
                {/* Лого + компанийн нэр */}
                <div
                    className="flex animate-fade-in-up items-center motion-reduce:animate-none gap-3.5 sm:gap-4"
                    style={{ animationFillMode: 'both' }}
                >
                    {/* PNG нь цагаан дэвсгэртэй тул цагаан "плита" дотор тавина */}
                    <div className="shrink-0 rounded-xl bg-white p-2 shadow-lg shadow-black/30 ring-1 ring-white/20 sm:p-2.5">
                        <Image
                            src="/tumen-logo.png"
                            alt=""
                            width={631}
                            height={179}
                            priority
                            className="h-5 w-auto sm:h-6 lg:h-7"
                        />
                    </div>
                    <div className="min-w-0">
                        {isLoadingProfile ? (
                            <span className="block h-4 w-36 animate-pulse rounded bg-white/20" />
                        ) : (
                            <p className="truncate text-sm font-semibold tracking-tight text-white sm:text-[15px]">
                                {companyName}
                            </p>
                        )}
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#EE9A72] sm:text-[11px]">
                            Ачаа тээвэр · Логистик
                        </p>
                    </div>
                </div>

                {/* Системийн нэр + тодорхойлолт */}
                <div
                    className="animate-fade-in-up motion-reduce:animate-none"
                    style={{ animationDelay: '90ms', animationFillMode: 'both' }}
                >
                    <h1 className="text-[22px] font-semibold leading-tight tracking-tight sm:text-3xl lg:max-w-[12ch] lg:text-[38px] lg:leading-[1.08] xl:text-[44px]">
                        Дотоод удирдлагын систем
                    </h1>
                    {/* Утсан дээр форм нугалын дээр гарахын тулд догол мөрийг зөвхөн sm+ дээр харуулна */}
                    <p className="mt-3 hidden max-w-md text-[13px] leading-relaxed text-white/60 sm:block sm:text-sm lg:mt-5 lg:text-[15px] lg:leading-7">
                        Байгууллагын өдөр тутмын үйл ажиллагааг нэг цонхноос удирдах
                        дотоод платформ. Хүний нөөц, тээврийн удирдлага, харилцагч,
                        төсөл, албан бичиг зэрэг модулиуд нэг системд нэгдсэн.
                    </p>
                </div>

                {/* Системд байгаа модулиуд — зөвхөн том дэлгэц дээр */}
                <div
                    className="hidden animate-fade-in-up motion-reduce:animate-none lg:block"
                    style={{ animationDelay: '180ms', animationFillMode: 'both' }}
                >
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                        Системийн модулиуд
                    </h2>
                    <ul className="mt-3.5 grid grid-cols-2 gap-2 xl:grid-cols-3">
                        {SYSTEM_MODULES.map((m) => {
                            const Icon = m.icon;
                            return (
                                <li key={m.id}>
                                    <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 transition-colors hover:border-white/25 hover:bg-white/[0.09]">
                                        <span
                                            aria-hidden="true"
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                                            style={{
                                                backgroundColor: `${m.tint}26`,
                                                color: m.tint,
                                            }}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="truncate text-[13px] font-medium text-white/85">
                                            {m.label}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <p className="mt-5 flex items-center gap-2 text-[12px] text-white/55">
                        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        Зөвхөн эрх бүхий ажилтнуудад нээлттэй хаалттай систем.
                    </p>
                </div>
            </div>
        </header>
    );
}
