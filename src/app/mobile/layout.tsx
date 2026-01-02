'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, User, Building } from 'lucide-react';

const navItems = [
  { href: '/mobile/home', label: 'Нүүр', icon: Home },
  { href: '/mobile/attendance', label: 'Ирц', icon: Clock },
  { href: '/mobile/company', label: 'Компани', icon: Building },
  { href: '/mobile/user', label: 'Хэрэглэгч', icon: User },
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh w-full justify-center bg-muted/30">
      <div className="relative flex h-dvh w-full max-w-md flex-col border-x bg-background shadow-lg overflow-hidden">
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          {children}
          {/* Spacer for bottom nav */}
          <div className="h-24 w-full shrink-0" />
        </main>
        <nav className="absolute bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-md z-50">
          <div className="mx-auto flex h-16 max-w-md items-center justify-around">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 text-xs transition-colors active:scale-95 ${isActive
                      ? 'text-primary font-bold'
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
    </div>
  );
}
