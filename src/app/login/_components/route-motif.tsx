/**
 * Чимээгүй логистикийн мотив — маршрутын шугам + сүлжээний зангилаа.
 * Зөвхөн чимэглэл (aria-hidden), тодролт маш бага (grid 5%, маршрут 9%).
 */
export function RouteMotif({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            className={className}
            viewBox="0 0 760 960"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern
                    id="tt-login-grid"
                    width="56"
                    height="56"
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d="M56 0H0v56"
                        stroke="#FFFFFF"
                        strokeWidth="1"
                        fill="none"
                    />
                </pattern>
                <linearGradient id="tt-login-fade" x1="0" y1="0" x2="0.35" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                    <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
                <mask id="tt-login-mask">
                    <rect width="760" height="960" fill="url(#tt-login-fade)" />
                </mask>
            </defs>

            <g mask="url(#tt-login-mask)">
                {/* нарийн grid */}
                <rect width="760" height="960" fill="url(#tt-login-grid)" opacity="0.05" />

                {/* маршрутын шугамууд */}
                <g
                    opacity="0.09"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                >
                    <path d="M-60 214C90 150 214 268 372 236 530 204 618 128 820 176" />
                    <path d="M-60 452C118 408 208 528 402 498 596 468 660 402 820 438" />
                    <path d="M-60 700C104 676 244 792 452 742 660 692 712 636 820 664" />
                    <path d="M-60 872C140 852 268 906 468 878" strokeDasharray="6 10" />
                    <path d="M120 -40v1040" strokeDasharray="4 14" opacity="0.7" />
                    <path d="M486 -40v1040" strokeDasharray="4 14" opacity="0.7" />
                </g>

                {/* холбоос — зангилаанаас доош */}
                <g opacity="0.07" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="3 7">
                    <path d="M372 236v262" />
                    <path d="M120 214v238" />
                    <path d="M452 742V498" />
                </g>

                {/* зангилаанууд */}
                <g fill="#FFFFFF" opacity="0.16">
                    <circle cx="372" cy="236" r="3.5" />
                    <circle cx="402" cy="498" r="3.5" />
                    <circle cx="452" cy="742" r="3.5" />
                    <circle cx="120" cy="214" r="2.5" />
                    <circle cx="120" cy="452" r="2.5" />
                    <circle cx="660" cy="402" r="2.5" />
                </g>
                <g fill="#D16439" opacity="0.5">
                    <circle cx="372" cy="236" r="1.5" />
                    <circle cx="402" cy="498" r="1.5" />
                    <circle cx="452" cy="742" r="1.5" />
                </g>
            </g>
        </svg>
    );
}
