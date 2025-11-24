'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Users,
  CalendarClock,
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const links = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/employees',
    label: 'Employees',
    icon: Users,
  },
  {
    href: '/dashboard/time-off',
    label: 'Time Off',
    icon: CalendarClock,
  },
  {
    href: '/dashboard/documents',
    label: 'Documents',
    icon: FileText,
  },
  {
    href: '/dashboard/onboarding',
    label: 'Onboarding',
    icon: ClipboardCheck,
  },
  {
    href: '/dashboard/compliance',
    label: 'Compliance AI',
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
