'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  LayoutDashboard,
  Users,
  Building2,
  Network,
  Settings,
  Clock,
  Award,
  Sparkles,
  ClipboardList,
  Code,
  CalendarClock,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

const mainLinks = [
  {
    href: '/dashboard',
    label: 'Хяналтын самбар',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/company',
    label: 'Компанийн мэдээлэл',
    icon: Building2,
  },
  {
    href: '/dashboard/organization',
    label: 'Бүтэц, орон тоо',
    icon: Network,
  },
  {
    href: '/dashboard/employees',
    label: 'Ажилтан',
    icon: Users,
  },
  {
    href: '/dashboard/attendance',
    label: 'Цагийн бүртгэл',
    icon: Clock,
  },
  {
    href: '/dashboard/documents',
    label: 'Баримт бичиг',
    icon: FileText,
  },
   {
    href: '/dashboard/compliance',
    label: 'Хуулийн зөвлөгөө',
    icon: Sparkles,
  },
  {
    href: '/dashboard/scoring',
    label: 'Онооны систем',
    icon: Award,
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {mainLinks.map((link) => {
        const Icon = link.icon;
        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard')}
              tooltip={link.label}
            >
              <Link href={link.href}>
                <Icon />
                <span>{link.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
        <SidebarMenuItem>
            <SidebarMenuButton
            isActive={pathname.startsWith('/dashboard/settings')}
            tooltip="Тохиргоо"
            >
            <Settings />
            <span>Тохиргоо</span>
            </SidebarMenuButton>
            <SidebarMenuSub>
            <SidebarMenuSubItem>
                <SidebarMenuSubButton
                asChild
                isActive={pathname === '/dashboard/settings/general'}
                >
                <Link href="/dashboard/settings/general">Ерөнхий</Link>
                </SidebarMenuSubButton>
            </SidebarMenuSubItem>
             <SidebarMenuSubItem>
                <SidebarMenuSubButton
                asChild
                isActive={pathname.startsWith('/dashboard/settings/structure')}
                >
                <Link href="/dashboard/settings/structure">Бүтэц</Link>
                </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem>
                <SidebarMenuSubButton
                asChild
                isActive={pathname.startsWith('/dashboard/settings/employee-code')}
                >
                <Link href="/dashboard/settings/employee-code">Кодчлол</Link>
                </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem>
                <SidebarMenuSubButton
                asChild
                isActive={pathname.startsWith('/dashboard/settings/documents')}
                >
                <Link href="/dashboard/settings/documents">Бичиг баримт</Link>
                </SidebarMenuSubButton>
            </SidebarMenuSubItem>
             <SidebarMenuSubItem>
                <SidebarMenuSubButton
                asChild
                isActive={pathname.startsWith('/dashboard/settings/time-off')}
                >
                <Link href="/dashboard/settings/time-off">Чөлөөний хүсэлт</Link>
                </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            <SidebarMenuSubItem>
                <SidebarMenuSubButton
                asChild
                isActive={pathname.startsWith('/dashboard/settings/questionnaire')}
                >
                <Link href="/dashboard/settings/questionnaire">Анкет</Link>
                </SidebarMenuSubButton>
            </SidebarMenuSubItem>
             <SidebarMenuSubItem>
                <SidebarMenuSubButton
                asChild
                isActive={pathname.startsWith('/dashboard/settings/onboarding')}
                >
                <Link href="/dashboard/settings/onboarding">Дасан зохицох</Link>
                </SidebarMenuSubButton>
            </SidebarMenuSubItem>
            </SidebarMenuSub>
        </SidebarMenuItem>
    </SidebarMenu>
  );
}
