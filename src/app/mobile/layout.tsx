'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, User, MessageSquare } from 'lucide-react';

const navItems = [
  { href: '/mobile/home', label: 'Нүүр', icon: Home },
  { href: '/mobile/attendance', label: 'Цагийн бүртгэл', icon: Clock },
  { href: '/mobile/user', label: 'Хэрэглэгч', icon: User },
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh flex-col bg-muted/20">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background shadow-t-lg">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <item.icon
                  className="h-6 w-6"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
