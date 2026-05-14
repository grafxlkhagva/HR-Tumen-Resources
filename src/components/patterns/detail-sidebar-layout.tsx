'use client';

import * as React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface DetailTab {
  value: string;
  Icon: LucideIcon;
  label: string;
  /** Tab icon-ий өнгө (hex). Хэрэв өгөөгүй бол foreground ашиглана */
  hex?: string;
}

export interface DetailSidebarLayoutProps {
  tabs: DetailTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  /** Sidebar-ийн дээд хэсэгт харуулах header (avatar, back btn г.м.) */
  sidebarHeader?: React.ReactNode;
  /** Идэвхтэй tab-ийн баруун талд харуулах actions */
  tabActions?: React.ReactNode;
  /** Tab header-ийн зүүн талд нэмэлт content (completion badge г.м.) */
  tabBadge?: React.ReactNode;
  children: React.ReactNode;
}

// ─── Desktop Sidebar ────────────────────────────────────────────────────────────

function SidebarNav({
  tabs,
  activeTab,
  onTabChange,
  sidebarHeader,
}: {
  tabs: DetailTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  sidebarHeader?: React.ReactNode;
}) {
  const activeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  return (
    <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-border bg-muted/50">
      {sidebarHeader && (
        <div className="flex-none border-b border-border/60 px-3 py-3">
          {sidebarHeader}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 scrollbar-hide">
        <nav className="flex flex-col gap-0.5" aria-label="Хэсгүүд">
          {tabs.map((tab) => {
            const isOn = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                ref={isOn ? activeRef : undefined}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  'group flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-micro leading-snug transition-all',
                  isOn
                    ? 'bg-card font-medium text-foreground shadow-sm ring-1 ring-border/60'
                    : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                )}
              >
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

// ─── Mobile Tab Bar ─────────────────────────────────────────────────────────────

function MobileTabBar({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: DetailTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
}) {
  const activeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  return (
    <div className="flex md:hidden flex-none border-b border-border bg-card/95 backdrop-blur-md">
      <div className="flex gap-0.5 overflow-x-auto px-2 py-1.5 scrollbar-hide">
        {tabs.map((tab) => {
          const isOn = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              ref={isOn ? activeRef : undefined}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption leading-tight transition-all whitespace-nowrap',
                isOn
                  ? 'bg-foreground text-background font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <tab.Icon className="h-3.5 w-3.5" strokeWidth={isOn ? 2 : 1.5} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab Header ─────────────────────────────────────────────────────────────────

function TabHeader({
  tab,
  actions,
  badge,
}: {
  tab: DetailTab;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex-none border-b border-border/40 bg-card/80 backdrop-blur-sm px-4 md:px-6 py-2.5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-body-medium font-semibold text-foreground">{tab.label}</h2>
          {badge}
        </div>
        {actions}
      </div>
    </div>
  );
}

// ─── Main Layout ────────────────────────────────────────────────────────────────

export function DetailSidebarLayout({
  tabs,
  activeTab,
  onTabChange,
  sidebarHeader,
  tabActions,
  tabBadge,
  children,
}: DetailSidebarLayoutProps) {
  const activeTabDef = tabs.find(t => t.value === activeTab) || tabs[0];

  return (
    <div className="flex flex-col h-full">
      {/* Mobile: horizontal tab bar */}
      <MobileTabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main area: Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop: sidebar nav */}
        <SidebarNav
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          sidebarHeader={sidebarHeader}
        />

        {/* Content panel */}
        <div className="flex flex-1 min-w-0 flex-col">
          <TabHeader tab={activeTabDef} actions={tabActions} badge={tabBadge} />

          {/* Scrollable Content */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-white">
            <div className="p-4 md:p-6 max-w-5xl mx-auto w-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
