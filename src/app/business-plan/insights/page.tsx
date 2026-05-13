'use client';

/**
 * /dashboard/business-plan/insights
 * ────────────────────────────────────
 * Proactive AI Insights-ийн түүхийн log харуулна.
 */

import React from 'react';
import { useMemoFirebase, useFetchCollection, tenantCollection } from '@/firebase';
import { query, orderBy, limit } from 'firebase/firestore';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Bell, TrendingDown, Clock, CheckCircle2, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightLog {
  id: string;
  insights: { type: string; severity: string; title: string }[];
  insightCount: number;
  notified: number;
  pushed: number;
  generatedAt: string;
}

const SEVERITY_STYLES = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning:  'bg-amber-100 text-amber-700 border-amber-200',
  info:     'bg-blue-100 text-blue-700 border-blue-200',
};

const SEVERITY_ICONS = {
  critical: AlertTriangle,
  warning:  TrendingDown,
  info:     Info,
};

export default function BpInsightsPage() {
  const logsRef = useMemoFirebase(({ firestore, companyPath }) =>
    firestore
      ? query(
          tenantCollection(firestore, companyPath, 'bp_insight_logs'),
          orderBy('generatedAt', 'desc'),
          limit(30)
        )
      : null, []);

  const { data: logs, isLoading } = useFetchCollection<InsightLog>(logsRef);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Insights түүх"
        description="AI Proactive Insights-ийн бүртгэл — сүүлийн 30 удаа"
        showBackButton
        backBehavior="history"
        fallbackBackHref="/dashboard/business-plan"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">Insights түүх байхгүй байна</p>
          <p className="text-xs text-muted-foreground mt-1">
            Тохиргоо → AI Proactive Insights → "Одоо ажиллуулах"
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="rounded-xl border bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50/50">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {log.generatedAt
                      ? format(new Date(log.generatedAt), 'yyyy-MM-dd HH:mm')
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="text-xs bg-slate-100 text-slate-600">
                    {log.insightCount} дохиолол
                  </Badge>
                  {log.notified > 0 && (
                    <Badge className="text-xs bg-violet-100 text-violet-700">
                      {log.notified} мэдэгдсэн
                    </Badge>
                  )}
                </div>
              </div>

              {/* Insights */}
              {log.insightCount === 0 ? (
                <div className="px-5 py-4 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Анхааруулах зүйл байгаагүй
                </div>
              ) : (
                <div className="divide-y">
                  {(log.insights || []).map((ins, i) => {
                    const sev = ins.severity as keyof typeof SEVERITY_STYLES || 'info';
                    const Icon = SEVERITY_ICONS[sev] || Info;
                    return (
                      <div key={i} className="flex items-start gap-3 px-5 py-3">
                        <div className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full mt-0.5 border',
                          SEVERITY_STYLES[sev] || SEVERITY_STYLES.info
                        )}>
                          <Icon className="h-3 w-3" />
                        </div>
                        <p className="text-sm text-gray-800">{ins.title}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
