'use client';

/**
 * /dashboard/business-plan/history
 * ─────────────────────────────────
 * AI Chat-ийн шийдвэрийн түүх болон Session memory харуулна.
 */

import React from 'react';
import { useMemoFirebase, useFetchCollection, tenantCollection } from '@/firebase';
import { query, orderBy, limit } from 'firebase/firestore';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useTenant } from '@/contexts/tenant-context';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Brain, Clock, CheckCircle2, ListTodo, MessageSquare } from 'lucide-react';
import { BP_SESSIONS_COLLECTION, type BpSessionData } from '@/lib/bp-session/bp-session-types';

export default function BpHistoryPage() {
  const { companyId } = useTenant();
  const { employeeProfile } = useEmployeeProfile();

  // Өөрийн session
  const sessionRef = useMemoFirebase(({ firestore, companyPath }) => {
    if (!firestore || !companyPath || !employeeProfile?.id) return null;
    return tenantCollection(firestore, companyPath, BP_SESSIONS_COLLECTION);
  }, [employeeProfile?.id]);

  const { data: sessions, isLoading } = useFetchCollection<BpSessionData & { id: string }>(sessionRef);

  // Зөвхөн өөрийн session
  const mySession = sessions.find(s =>
    s.userId === employeeProfile?.id || s.id?.includes(employeeProfile?.id || '')
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="AI Зөвлөхийн түүх"
        description="Хийгдсэн шийдвэрүүд болон дараагийн алхмууд"
        showBackButton
        backBehavior="history"
        fallbackBackHref="/dashboard/business-plan"
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !mySession ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">AI зөвлөхтэй яриагүй байна</p>
          <p className="text-xs text-muted-foreground mt-1">Chat нээж эхлүүлнэ үү</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Session overview */}
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-violet-600" />
              <h2 className="font-semibold">Session мэдээлэл</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Нийт мессеж</p>
                <p className="text-xl font-bold">{mySession.messageCount || 0}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Шийдвэрүүд</p>
                <p className="text-xl font-bold">{mySession.keyDecisions?.length || 0}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Сүүлийн идэвх</p>
                <p className="text-sm font-medium">
                  {mySession.lastActiveAt
                    ? format(new Date(mySession.lastActiveAt), 'MM-dd HH:mm')
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {mySession.summary && (
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-violet-600" />
                <h2 className="font-semibold text-sm">Сүүлийн яриа</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{mySession.summary}</p>
            </div>
          )}

          {/* Key Decisions */}
          {(mySession.keyDecisions?.length || 0) > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h2 className="font-semibold text-sm">Хийгдсэн шийдвэрүүд</h2>
                <Badge className="ml-auto text-xs bg-emerald-100 text-emerald-700">
                  {mySession.keyDecisions.length}
                </Badge>
              </div>
              <div className="divide-y">
                {[...mySession.keyDecisions].reverse().map((d, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{d.action}</p>
                      {d.date && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {d.date.slice(0, 10)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Actions */}
          {(mySession.pendingActions?.length || 0) > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b">
                <ListTodo className="h-4 w-4 text-amber-600" />
                <h2 className="font-semibold text-sm">Дараагийн алхмууд</h2>
              </div>
              <div className="divide-y">
                {mySession.pendingActions.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50 mt-0.5">
                      <ListTodo className="h-3 w-3 text-amber-600" />
                    </div>
                    <p className="text-sm text-gray-900">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
