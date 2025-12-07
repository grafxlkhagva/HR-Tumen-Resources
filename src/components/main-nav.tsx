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
  MessageSquare,
  Sparkles,
  Gift,
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
    icon: Network,
  },
  {
    href: '/dashboard/employees',
    label: 'Ажилтан',
    icon: Users,
  },
   {
    href: '/dashboard/points',
    label: 'Оноо шилжүүлэх',
    icon: Gift,
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
  {
    href: '/dashboard/feedback',
    label: 'Санал хүсэлт',
    icon: MessageSquare,
  },
  {
    href: '/dashboard/settings',
    label: 'Тохиргоо',
    icon: Settings,
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
    </SidebarMenu>
  );
}
