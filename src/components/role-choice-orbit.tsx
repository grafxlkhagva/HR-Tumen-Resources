'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
    Shield,
    User,
    Building,
    Loader2,
    LayoutGrid,
    Newspaper,
    HeartHandshake,
    Target,
    FolderKanban,
    DoorOpen,
    Building2,
    Stamp,
    HardHat,
    Lock,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

interface PortalModule {
    id: 'admin' | 'employee' | 'tms' | 'news' | 'crm' | 'business_plan' | 'projects' | 'meetings' | 'company' | 'official_letters' | 'hse';
    icon: React.ReactElement;
    label: string;
    description: string;
    color: string;
    enabled: boolean;
    onChoose: () => void;
}

interface RoleChoiceOrbitProps {
    onChooseAdmin?: () => void;
    onChooseEmployee: () => void;
    onChooseTms?: () => void;
    onChooseNews?: () => void;
    onChooseCrm?: () => void;
    onChooseBusinessPlan?: () => void;
    onChooseProjects?: () => void;
    onChooseMeetings?: () => void;
    onChooseCompany?: () => void;
    onChooseOfficialLetters?: () => void;
    onChooseHse?: () => void;
    companyName?: string;
    companyLogoUrl?: string;
}

function distFromTop(angleDeg: number): number {
    const n = ((angleDeg % 360) + 360) % 360;
    return n > 180 ? n - 360 : n;
}

export function RoleChoiceOrbit({
    onChooseAdmin,
    onChooseEmployee,
    onChooseTms,
    onChooseNews,
    onChooseCrm,
    onChooseBusinessPlan,
    onChooseProjects,
    onChooseMeetings,
    onChooseCompany,
    onChooseOfficialLetters,
    onChooseHse,
    companyName = 'Систем',
    companyLogoUrl,
}: RoleChoiceOrbitProps) {
    const [isNavigating, setIsNavigating] = React.useState<PortalModule['id'] | null>(null);

    const modules = React.useMemo<PortalModule[]>(() => {
        const list: PortalModule[] = [];
        if (onChooseAdmin) {
            list.push({
                id: 'admin',
                icon: <Shield />,
                label: 'Хүний нөөц',
                description: 'Ажилтнууд, бүтэц, хөдөлмөрийн харилцаа',
                color: '#3b82f6',
                enabled: true,
                onChoose: onChooseAdmin,
            });
        }
        list.push({
            id: 'employee',
            icon: <User />,
            label: 'Ажилтан',
            description: 'Өөрийн мэдээлэл, ирц, амралт, чөлөө',
            color: '#10b981',
            enabled: true,
            onChoose: onChooseEmployee,
        });
        if (onChooseTms) {
            list.push({
                id: 'tms',
                icon: <LayoutGrid />,
                label: 'TMS',
                description: 'Тээврийн удирдлагын систем',
                color: '#8b5cf6',
                enabled: true,
                onChoose: onChooseTms,
            });
        }
        if (onChooseNews) {
            list.push({
                id: 'news',
                icon: <Newspaper />,
                label: 'Мэдээлэл',
                description: 'Байгууллагын мэдээ, мэдээлэл удирдах',
                color: '#f97316',
                enabled: true,
                onChoose: onChooseNews,
            });
        }
        if (onChooseCrm) {
            list.push({
                id: 'crm',
                icon: <HeartHandshake />,
                label: 'CRM',
                description: 'Харилцагчийн удирдлага',
                color: '#06b6d4',
                enabled: true,
                onChoose: onChooseCrm,
            });
        }
        if (onChooseBusinessPlan) {
            list.push({
                id: 'business_plan',
                icon: <Target />,
                label: 'Бизнес төлөвлөгөө',
                description: 'Стратеги, OKR, KPI, гүйцэтгэл',
                color: '#6366f1',
                enabled: true,
                onChoose: onChooseBusinessPlan,
            });
        }
        if (onChooseProjects) {
            list.push({
                id: 'projects',
                icon: <FolderKanban />,
                label: 'Төслүүд',
                description: 'Төсөл, даалгавар, Gantt',
                color: '#e11d48',
                enabled: true,
                onChoose: onChooseProjects,
            });
        }
        if (onChooseMeetings) {
            list.push({
                id: 'meetings',
                icon: <DoorOpen />,
                label: 'Хурлын өрөө',
                description: 'Хурлын өрөөний захиалга',
                color: '#f97316',
                enabled: true,
                onChoose: onChooseMeetings,
            });
        }
        if (onChooseCompany) {
            list.push({
                id: 'company',
                icon: <Building2 />,
                label: 'Компани',
                description: 'Компанийн бүртгэл, бодлого, түүх',
                color: '#64748b',
                enabled: true,
                onChoose: onChooseCompany,
            });
        }
        if (onChooseOfficialLetters) {
            list.push({
                id: 'official_letters',
                icon: <Stamp />,
                label: 'Албан бичиг',
                description: 'Албан бланк, загвар, нэгдсэн архив',
                color: '#b45309',
                enabled: true,
                onChoose: onChooseOfficialLetters,
            });
        }
        if (onChooseHse) {
            list.push({
                id: 'hse',
                icon: <HardHat />,
                label: 'ХАБЭА',
                description: 'Хөдөлмөрийн аюулгүй байдал, эрүүл ахуй',
                color: '#16a34a',
                enabled: true,
                onChoose: onChooseHse,
            });
        }
        return list;
    }, [onChooseAdmin, onChooseEmployee, onChooseTms, onChooseNews, onChooseCrm, onChooseBusinessPlan, onChooseProjects, onChooseMeetings, onChooseCompany, onChooseOfficialLetters, onChooseHse]);

    const N = modules.length;
    const STEP = N > 0 ? 360 / N : 360;

    const [orbitR, setOrbitR] = React.useState(160);
    const [nodeSize, setNodeSize] = React.useState(88);

    React.useEffect(() => {
        const upd = () => {
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const controlsH = 200;
            const topPad = 24;
            const headerH = 0;
            const availH = vh - headerH - topPad - controlsH;
            const availW = vw * 0.9;
            const avail = Math.min(availW, availH);
            const ns = Math.round(Math.min(avail * 0.24, 110));
            const r = Math.round(Math.min(avail * 0.5 - ns, 280));
            setNodeSize(Math.max(64, ns));
            setOrbitR(Math.max(120, r));
        };
        upd();
        window.addEventListener('resize', upd);
        return () => window.removeEventListener('resize', upd);
    }, []);

    const CENTER_SIZE = Math.round(nodeSize * 1.4);
    const CANVAS_W = (orbitR + nodeSize + 10) * 2;
    const centerY = orbitR + Math.ceil(nodeSize / 2) + 4;
    const CANVAS_H = centerY + CENTER_SIZE / 2 + 8;
    const center = CANVAS_W / 2;
    const centerYPos = centerY;

    const [orbitAngle, setOrbitAngle] = React.useState(0);
    const lastShift = React.useRef(0);

    const shift = React.useCallback(
        (dir: 'left' | 'right') => {
            const now = Date.now();
            if (now - lastShift.current < 180) return;
            lastShift.current = now;
            setOrbitAngle((prev) => prev + (dir === 'left' ? STEP : -STEP));
        },
        [STEP]
    );

    const shiftTo = React.useCallback(
        (targetIdx: number) => {
            setOrbitAngle((prev) => {
                const targetRaw = -targetIdx * STEP;
                const diff = targetRaw - prev;
                const short = (((diff + 180) % 360) + 360) % 360 - 180;
                return prev + short;
            });
        },
        [STEP]
    );

    const activeIndex = React.useMemo(() => {
        if (N === 0) return 0;
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < N; i++) {
            const d = Math.abs(distFromTop(STEP * i + orbitAngle));
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    }, [orbitAngle, N, STEP]);

    const dragStart = React.useRef<{ x: number; y: number } | null>(null);
    const didDrag = React.useRef(false);
    const canvasRef = React.useRef<HTMLDivElement>(null);

    const onPointerDown = (e: React.PointerEvent) => {
        dragStart.current = { x: e.clientX, y: e.clientY };
        didDrag.current = false;
    };
    const onPointerUp = (e: React.PointerEvent) => {
        if (!dragStart.current) return;
        const dx = e.clientX - dragStart.current.x;
        if (Math.abs(dx) > 28) {
            didDrag.current = true;
            shift(dx < 0 ? 'right' : 'left');
        }
        dragStart.current = null;
        setTimeout(() => {
            didDrag.current = false;
        }, 80);
    };

    React.useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;
        const wh = (e: WheelEvent) => {
            e.preventDefault();
            shift(e.deltaY > 0 ? 'right' : 'left');
        };
        el.addEventListener('wheel', wh, { passive: false });
        return () => el.removeEventListener('wheel', wh);
    }, [shift]);

    const handleEnter = React.useCallback(
        (mod: PortalModule) => {
            if (isNavigating || !mod.enabled) return;
            setIsNavigating(mod.id);
            setTimeout(() => mod.onChoose(), 100);
        },
        [isNavigating]
    );

    React.useEffect(() => {
        const kd = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                shift('right');
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                shift('left');
            }
            if (e.key === 'Enter' && modules[activeIndex]) {
                handleEnter(modules[activeIndex]);
            }
        };
        window.addEventListener('keydown', kd);
        return () => window.removeEventListener('keydown', kd);
    }, [activeIndex, shift, modules, handleEnter]);

    const handleNodeClick = (i: number) => {
        if (didDrag.current) return;
        const dist = distFromTop(STEP * i + orbitAngle);
        if (Math.abs(dist) < STEP / 2) {
            handleEnter(modules[i]);
        } else {
            shiftTo(i);
        }
    };

    if (N === 0) return null;

    const activeMod = modules[activeIndex];

    return (
        <div className="relative flex h-screen w-screen flex-col items-center justify-start overflow-hidden bg-background select-none pt-6">
            {/* Header text */}
            <div className="flex flex-col items-center pb-4">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-1">
                    {companyName}
                </p>
                <h2 className="text-base font-semibold text-foreground">
                    Аль хэлбэрээр нэвтрэхээ сонгоно уу
                </h2>
            </div>

            {/* Orbit canvas */}
            <div
                ref={canvasRef}
                className="relative touch-none cursor-grab active:cursor-grabbing flex-shrink-0 overflow-hidden"
                style={{ width: CANVAS_W, height: CANVAS_H }}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
            >
                {/* Dashed ring */}
                <svg
                    className="absolute pointer-events-none"
                    style={{ left: 0, top: 0, width: CANVAS_W, height: CANVAS_H }}
                    viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                >
                    <circle
                        cx={center}
                        cy={centerYPos}
                        r={orbitR}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeDasharray="4 11"
                        className="text-border/35"
                    />
                </svg>

                {/* Rotating ring */}
                <div
                    style={{
                        position: 'absolute',
                        left: center,
                        top: centerYPos,
                        width: 0,
                        height: 0,
                        transform: `rotate(${orbitAngle}deg)`,
                        transition: 'transform 0.52s cubic-bezier(0.34, 1.3, 0.64, 1)',
                    }}
                >
                    {modules.map((m, i) => {
                        const staticRad = (STEP * i - 90) * (Math.PI / 180);
                        const nx = Math.cos(staticRad) * orbitR;
                        const ny = Math.sin(staticRad) * orbitR;

                        const dist = distFromTop(STEP * i + orbitAngle);
                        const absDist = Math.abs(dist);
                        const isVisible = absDist <= STEP * 2 + 1;
                        const isTop = absDist < STEP / 2;

                        const scale = isTop
                            ? 1.1
                            : isVisible
                                ? Math.max(0.86, 1 - (absDist / (STEP * 2.5)) * 0.24)
                                : 0.6;
                        const opacity = isTop
                            ? 1
                            : isVisible
                                ? Math.max(0.5, 1 - (absDist / (STEP * 2.5)) * 0.5)
                                : 0;

                        return (
                            <button
                                key={m.id}
                                onClick={() => handleNodeClick(i)}
                                disabled={isNavigating !== null}
                                className="absolute focus:outline-none disabled:cursor-not-allowed"
                                style={{
                                    left: nx,
                                    top: ny,
                                    width: nodeSize,
                                    pointerEvents: isVisible ? 'auto' : 'none',
                                    transform: `translate(-50%, -50%) rotate(${-orbitAngle}deg) scale(${scale})`,
                                    transition:
                                        'transform 0.52s cubic-bezier(0.34, 1.3, 0.64, 1), opacity 0.35s ease',
                                    opacity,
                                    zIndex: isTop ? 20 : 10,
                                }}
                            >
                                <div
                                    className={cn(
                                        'flex flex-col items-center justify-center rounded-full border-2 gap-1',
                                        isTop && m.enabled
                                            ? 'border-primary bg-background'
                                            : m.enabled
                                                ? 'border-border bg-card'
                                                : 'border-border/30 bg-muted/30'
                                    )}
                                    style={{
                                        width: nodeSize,
                                        height: nodeSize,
                                        padding: '7px',
                                        transition:
                                            'box-shadow 0.3s ease, border-color 0.3s ease',
                                        boxShadow:
                                            isTop && m.enabled
                                                ? `0 0 0 3px ${m.color}22, 0 6px 24px ${m.color}28`
                                                : undefined,
                                    }}
                                >
                                    {isNavigating === m.id ? (
                                        <Loader2
                                            className="h-5 w-5 flex-shrink-0 animate-spin"
                                            style={{ color: m.color }}
                                        />
                                    ) : m.enabled ? (
                                        React.cloneElement(m.icon, {
                                            className: 'h-5 w-5 flex-shrink-0',
                                            style: {
                                                color: isTop ? m.color : undefined,
                                                transition: 'color 0.3s ease',
                                            },
                                        })
                                    ) : (
                                        <Lock className="h-4 w-4 text-muted-foreground/35 flex-shrink-0" />
                                    )}
                                    <span
                                        className="font-medium text-center leading-tight w-full"
                                        style={{
                                            fontSize: Math.max(9, Math.round(nodeSize * 0.13)),
                                            color: isTop
                                                ? 'var(--foreground)'
                                                : 'var(--muted-foreground)',
                                            transition: 'color 0.3s ease',
                                            lineHeight: 1.15,
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {m.label}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Center hub — logo */}
                <div
                    className="absolute rounded-full bg-background flex items-center justify-center"
                    style={{
                        left: center,
                        top: centerYPos,
                        width: CENTER_SIZE,
                        height: CENTER_SIZE,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 30,
                        padding: '10px',
                    }}
                >
                    {companyLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={companyLogoUrl}
                            alt={companyName}
                            className="object-contain"
                            style={{
                                width: Math.round(CENTER_SIZE * 0.7),
                                height: Math.round(CENTER_SIZE * 0.6),
                            }}
                        />
                    ) : (
                        <Building className="h-7 w-7 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Bottom controls */}
            <div className="flex flex-col items-center gap-3 w-full max-w-sm px-6 pb-6 pt-2">
                {/* Active module card */}
                <div
                    className="w-full rounded-2xl border p-4 flex items-center gap-3 transition-all duration-300"
                    style={{
                        borderColor: `${activeMod.color}35`,
                        background: `${activeMod.color}08`,
                    }}
                >
                    <div
                        className="flex items-center justify-center rounded-xl flex-shrink-0"
                        style={{ width: 44, height: 44, background: `${activeMod.color}18` }}
                    >
                        {isNavigating === activeMod.id ? (
                            <Loader2
                                className="h-5 w-5 animate-spin"
                                style={{ color: activeMod.color }}
                            />
                        ) : (
                            React.cloneElement(activeMod.icon, {
                                className: 'h-5 w-5',
                                style: { color: activeMod.color },
                            })
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight truncate">
                            {activeMod.label}-аар нэвтрэх
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 leading-snug truncate">
                            {activeMod.description}
                        </p>
                    </div>

                    <button
                        onClick={() => handleEnter(activeMod)}
                        disabled={isNavigating !== null}
                        className="flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ backgroundColor: activeMod.color }}
                    >
                        Нэвтрэх →
                    </button>
                </div>

                {/* Dots + arrows */}
                {N > 1 && (
                    <div className="w-full flex items-center gap-3">
                        <button
                            onClick={() => shift('left')}
                            disabled={isNavigating !== null}
                            className="flex items-center justify-center h-9 w-9 rounded-xl border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 disabled:opacity-50"
                            aria-label="Өмнөх"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
                            {modules.map((m, i) => (
                                <button
                                    key={m.id}
                                    onClick={() => shiftTo(i)}
                                    disabled={isNavigating !== null}
                                    aria-label={m.label}
                                    className="rounded-full transition-all duration-300 disabled:cursor-not-allowed"
                                    style={{
                                        width: i === activeIndex ? 16 : 6,
                                        height: 6,
                                        backgroundColor:
                                            i === activeIndex
                                                ? m.color
                                                : 'rgb(148 163 184 / 0.30)',
                                    }}
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => shift('right')}
                            disabled={isNavigating !== null}
                            className="flex items-center justify-center h-9 w-9 rounded-xl border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 disabled:opacity-50"
                            aria-label="Дараах"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
