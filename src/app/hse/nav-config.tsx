import {
    LayoutDashboard,
    TriangleAlert,
    ListChecks,
    Siren,
    ShieldAlert,
    Bell,
    GraduationCap,
    ClipboardList,
    SearchCheck,
    FileBadge,
    HardHat,
    FileText,
    Building2,
    MessageSquareText,
    Video,
    type LucideIcon,
} from 'lucide-react';

export interface HseNavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    /** Хараахан хийгдээгүй (coming soon) бол true */
    soon?: boolean;
}

export interface HseNavGroup {
    title: string;
    items: HseNavItem[];
}

export const HSE_NAV: HseNavGroup[] = [
    {
        title: 'Хяналт',
        items: [{ href: '/hse', label: 'Хянах самбар', icon: LayoutDashboard }],
    },
    {
        title: 'Эрсдэл',
        items: [
            { href: '/hse/hazards', label: 'Аюул, эрсдэл', icon: TriangleAlert },
            { href: '/hse/tasks', label: 'Арга хэмжээ', icon: ListChecks },
        ],
    },
    {
        title: 'Осол, зөрчил',
        items: [
            { href: '/hse/incidents', label: 'Осол, тохиолдол', icon: Siren },
            { href: '/hse/violations', label: 'Зөрчил', icon: ShieldAlert },
            { href: '/hse/alerts', label: 'Сэрэмжлүүлэг', icon: Bell },
        ],
    },
    {
        title: 'Сургалт',
        items: [
            { href: '/hse/training', label: 'Сургалт', icon: GraduationCap },
            { href: '/hse/briefings', label: 'Зааварчилгаа', icon: ClipboardList },
        ],
    },
    {
        title: 'Хяналт шалгалт',
        items: [
            { href: '/hse/inspections', label: 'Үзлэг шалгалт', icon: SearchCheck },
            { href: '/hse/permits', label: 'Ажлын зөвшөөрөл', icon: FileBadge },
            { href: '/hse/ppe', label: 'Хамгаалах хэрэгсэл', icon: HardHat },
        ],
    },
    {
        title: 'Бичиг баримт',
        items: [
            { href: '/hse/documents', label: 'Баримт бичиг', icon: FileText },
            { href: '/hse/org', label: 'Байгууллага', icon: Building2 },
            { href: '/hse/surveys', label: 'Санал асуулга', icon: MessageSquareText },
            { href: '/hse/videos', label: 'Видео сан', icon: Video },
        ],
    },
];
