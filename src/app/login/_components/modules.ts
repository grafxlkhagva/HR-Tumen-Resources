import type * as React from 'react';
import {
    Shield,
    User as UserIcon,
    LayoutGrid,
    Newspaper,
    HeartHandshake,
    Target,
    FolderKanban,
    DoorOpen,
    Building2,
    Stamp,
    HardHat,
} from 'lucide-react';

/**
 * Системд БАЙГАА модулиуд.
 * Эх сурвалж: src/components/portal-switcher.tsx → PORTALS (label, description, icon).
 * `tint` нь зөвхөн чимэглэлийн өнгө — гүн navy гадаргуу дээр уншигдахуйц байхаар
 * PORTALS-ийн өнгөнөөс хэт бараануудыг нь (slate-500, amber-700) арай цайруулсан.
 */
export interface SystemModule {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    tint: string;
}

export const SYSTEM_MODULES: SystemModule[] = [
    {
        id: 'admin',
        label: 'Хүний нөөц',
        description: 'Ажилтнууд, бүтэц, хөдөлмөрийн харилцаа',
        icon: Shield,
        tint: '#60a5fa',
    },
    {
        id: 'employee',
        label: 'Ажилтан',
        description: 'Өөрийн мэдээлэл',
        icon: UserIcon,
        tint: '#34d399',
    },
    {
        id: 'tms',
        label: 'TMS',
        description: 'Тээврийн удирдлагын систем',
        icon: LayoutGrid,
        tint: '#a78bfa',
    },
    {
        id: 'news',
        label: 'Мэдээлэл',
        description: 'Байгууллагын мэдээ',
        icon: Newspaper,
        tint: '#fb923c',
    },
    {
        id: 'crm',
        label: 'CRM',
        description: 'Харилцагчийн удирдлага',
        icon: HeartHandshake,
        tint: '#22d3ee',
    },
    {
        id: 'business_plan',
        label: 'Бизнес төлөвлөгөө',
        description: 'Стратеги, OKR, KPI, гүйцэтгэл',
        icon: Target,
        tint: '#818cf8',
    },
    {
        id: 'projects',
        label: 'Төслүүд',
        description: 'Төсөл, даалгавар, Gantt',
        icon: FolderKanban,
        tint: '#fb7185',
    },
    {
        id: 'meetings',
        label: 'Хурлын өрөө',
        description: 'Хурлын өрөөний захиалга',
        icon: DoorOpen,
        tint: '#fbbf24',
    },
    {
        id: 'company',
        label: 'Компани',
        description: 'Компанийн бүртгэл, бодлого, түүх',
        icon: Building2,
        tint: '#94a3b8',
    },
    {
        id: 'official_letters',
        label: 'Албан бичиг',
        description: 'Албан бланк, загвар',
        icon: Stamp,
        tint: '#d6a15c',
    },
    {
        id: 'hse',
        label: 'ХАБЭА',
        description: 'Хөдөлмөрийн аюулгүй байдал, эрүүл ахуй',
        icon: HardHat,
        tint: '#4ade80',
    },
];
