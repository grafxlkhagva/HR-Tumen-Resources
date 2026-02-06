// src/app/dashboard/widgets/catalog.ts
// Widget catalog for dashboard KPI cards

import { 
    Network, 
    Users,
    UserCheck, 
    Palmtree, 
    Newspaper, 
    Handshake, 
    Sparkles, 
    FolderKanban,
    LucideIcon
} from 'lucide-react';

export type WidgetId = 
    | 'projects'
    | 'employees'
    | 'structure' 
    | 'attendance' 
    | 'vacation' 
    | 'posts' 
    | 'recruitment' 
    | 'points' 
    | 'er';

export type WidgetSize = 'normal' | 'compact';

export interface WidgetConfig {
    id: WidgetId;
    label: string;
    description: string;
    href?: string;
    size: WidgetSize;
    icon: LucideIcon;
    requiredData: string[];
    category: 'core' | 'kpi';
}

// Default order for widgets (initial 9 cards)
export const DEFAULT_ORDER: WidgetId[] = [
    'projects',
    'employees',
    'structure',
    'attendance',
    'vacation',
    'posts',
    'recruitment',
    'points',
    'er'
];

// Widget catalog with all available widgets
export const WIDGET_CATALOG: Record<WidgetId, WidgetConfig> = {
    // Core widgets (default 9)
    projects: {
        id: 'projects',
        label: 'Төслүүд',
        description: 'Идэвхтэй төслүүд болон таскууд',
        href: '/dashboard/projects',
        size: 'normal',
        icon: FolderKanban,
        requiredData: ['projects'],
        category: 'core'
    },
    employees: {
        id: 'employees',
        label: 'Хамт олон',
        description: 'Нийт ажилтнууд',
        href: '/dashboard/employees',
        size: 'normal',
        icon: Users,
        requiredData: ['employees'],
        category: 'core'
    },
    structure: {
        id: 'structure',
        label: 'Бүтэц',
        description: 'Нэгж болон ажлын байрны тоо',
        href: '/dashboard/organization',
        size: 'normal',
        icon: Network,
        requiredData: ['departments', 'positions'],
        category: 'core'
    },
    attendance: {
        id: 'attendance',
        label: 'Өнөөдрийн ирц',
        description: 'Ажил дээрээ байгаа болон чөлөөтэй ажилтнууд',
        href: '/dashboard/attendance',
        size: 'normal',
        icon: UserCheck,
        requiredData: ['attendance', 'timeOff'],
        category: 'core'
    },
    vacation: {
        id: 'vacation',
        label: 'Ээлжийн амралт',
        description: 'Амарч байгаа ажилтнуудын тоо',
        href: '/dashboard/vacation',
        size: 'normal',
        icon: Palmtree,
        requiredData: ['vacationRequests'],
        category: 'core'
    },
    posts: {
        id: 'posts',
        label: 'Мэдээлэл',
        description: 'Нийтлэлийн тоо',
        href: '/dashboard/posts',
        size: 'normal',
        icon: Newspaper,
        requiredData: ['posts'],
        category: 'core'
    },
    recruitment: {
        id: 'recruitment',
        label: 'Бүрдүүлэлт',
        description: 'Сонгон шалгаруулалтын хэсэг',
        href: '/dashboard/recruitment',
        size: 'normal',
        icon: Handshake,
        requiredData: [],
        category: 'core'
    },
    points: {
        id: 'points',
        label: 'Пойнт Модул',
        description: 'Recognition System',
        href: '/dashboard/points',
        size: 'compact',
        icon: Sparkles,
        requiredData: [],
        category: 'core'
    },
    er: {
        id: 'er',
        label: 'Хөдөлмөрийн харилцаа',
        description: 'Гэрээ, протокол, баримт',
        href: '/dashboard/employment-relations',
        size: 'compact',
        icon: Handshake,
        requiredData: [],
        category: 'core'
    }
};

// Get widget config by ID
export function getWidgetConfig(id: WidgetId): WidgetConfig | undefined {
    return WIDGET_CATALOG[id];
}

// Get all widget IDs
export function getAllWidgetIds(): WidgetId[] {
    return Object.keys(WIDGET_CATALOG) as WidgetId[];
}

// Get widgets by category
export function getWidgetsByCategory(category: 'core' | 'kpi'): WidgetConfig[] {
    return Object.values(WIDGET_CATALOG).filter(w => w.category === category);
}
