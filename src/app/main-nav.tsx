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
  ClipboardList,
  Newspaper,
  Activity,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
    href: '/dashboard/posts',
    label: 'Нийтлэл',
    icon: Newspaper,
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
    label: 'Цаг ба Ирц',
    icon: Clock,
  },
  {
    href: '/dashboard/consolidated-action',
    label: 'Нэгдсэн үйлдэл',
    icon: Activity,
  },
  {
    href: '/dashboard/documents',
    label: 'Баримт бичиг',
    icon: FileText,
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
       <Collapsible asChild>
        <SidebarMenuItem>
            <CollapsibleTrigger asChild>
                <SidebarMenuButton
                isActive={pathname.startsWith('/dashboard/settings')}
                tooltip="Тохиргоо"
                >
                <Settings />
                <span>Тохиргоо</span>
                </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent asChild>
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
                    <Link href="/dashboard/settings/time-off">цаг бүртгэл</Link>
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
           </CollapsibleContent>
        </SidebarMenuItem>
       </Collapsible>
    </SidebarMenu>
  );
}
