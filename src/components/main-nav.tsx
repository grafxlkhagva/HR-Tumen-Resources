'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Users,
  CalendarClock,
  Building2,
  Sitemap,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const links = [
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
    icon: Sitemap,
  },
  {
    href: '/dashboard/employees',
    label: 'Ажилчид',
    icon: Users,
  },
  {
    href: '/dashboard/time-off',
    label: 'Чөлөө',
    icon: CalendarClock,
  },
  {
    href: '/dashboard/documents',
    label: 'Баримт бичиг',
    icon: FileText,
  },
  {
    href: '/dashboard/compliance',
    label: 'Хууль тогтоомж',
    icon: ShieldCheck,
  },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === link.href}
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
    </SidebarMenu>
  );
}
