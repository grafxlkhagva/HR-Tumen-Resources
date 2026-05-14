'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useFetchCollection, useMemoFirebase, updateDocumentNonBlocking, tenantCollection, useTenantWrite } from '@/firebase';
import { StartOffboardingWizardDialog } from '@/app/dashboard/offboarding/components/start-offboarding-wizard-dialog';
import { getDocs, query, Timestamp, where } from 'firebase/firestore';
import { Project, Task } from '@/types/project';
import { Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Employee } from '../data';
import type { ERDocument, DocumentStatus } from '../../employment-relations/types';
import { DOCUMENT_STATUSES } from '../../employment-relations/types';
import {
    checkReleaseEligibility,
    getReleaseDocumentUrl,
} from '@/lib/services/employee-release-service';
import { getAppointmentDocumentUrl } from '@/lib/services/employee-appointment-service';
import type { EmployeeStatus } from '@/types';

function formatActionLabel(actionId?: string) {
  if (!actionId) return 'Чөлөөлөх';
  if (actionId === 'release_company') return 'Компанийн санаачилгаар';
  if (actionId === 'release_employee') return 'Ажилтны санаачилгаар';
  if (actionId === 'release_temporary') return 'Түр чөлөөлөлт';
  if (actionId === 'release_temporary_longterm') return 'Урт хугацааны чөлөө';
  if (actionId === 'release_temporary_maternity') return 'Жирэмсэн амаржсаны чөлөө';
  if (actionId === 'release_temporary_childcare') return 'Хүүхэд асрах чөлөө';
  return actionId;
}

function extractReleaseDate(docData?: ERDocument | null): string | null {
  const ci: any = docData?.customInputs || {};
  const raw = ci.releaseDate || ci['Ажлаас чөлөөлөх огноо'] || null;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

const PROTECTED_ROLES = new Set(['super_admin', 'company_super_admin']);

export function OffboardingTabContent({ employeeId, employee, currentUserId }: { employeeId: string; employee: Employee; currentUserId?: string }) {
  const { firestore, tDoc, tCollection, companyPath } = useTenantWrite();
  const [showWizard, setShowWizard] = useState(false);

  // Cross-workflow eligibility guard — Layer C4. Дуусаагүй томилгооны
  // баримт байгаа үед offboarding эхлүүлэх товчийг disable хийнэ.
  const [eligibility, setEligibility] = React.useState<
    | null
    | { allowed: true }
    | {
        allowed: false;
        reason: string;
        activeAppointmentDocId?: string;
        activeReleaseDocId?: string;
      }
  >(null);

  React.useEffect(() => {
    if (!firestore || !companyPath || !employeeId) {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await checkReleaseEligibility({
          firestore,
          companyPath,
          employeeId,
          employeeStatus: employee?.status as EmployeeStatus | undefined,
        });
        if (cancelled) return;
        if (result.allowed) {
          setEligibility({ allowed: true });
        } else {
          setEligibility({
            allowed: false,
            reason: result.reason,
            activeAppointmentDocId: result.activeAppointmentDoc?.id,
            activeReleaseDocId: result.activeReleaseDoc?.id,
          });
        }
      } catch (e) {
        console.error('[OffboardingTab] Eligibility check failed:', e);
        if (!cancelled) setEligibility({ allowed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firestore, companyPath, employeeId, employee?.status]);

  // --- 1) ER documents (release/offboarding paperwork progress) ---
  const erDocsQuery = useMemoFirebase(({ firestore, companyPath }) => {
    if (!firestore || !employeeId) return null;
    return query(tenantCollection(firestore, companyPath, 'er_documents'), where('employeeId', '==', employeeId));
  }, [employeeId]);
  const { data: erDocs, isLoading: erDocsLoading } = useFetchCollection<ERDocument>(erDocsQuery as any);

  const releaseDocs = React.useMemo(() => {
    const list = erDocs || [];
    const filtered = list.filter((d) => String((d as any)?.metadata?.actionId || '').startsWith('release_'));
    // Sort client-side to avoid composite index requirements
    return filtered.sort((a: any, b: any) => {
      const ad = a?.createdAt?.toDate?.()?.getTime?.() || 0;
      const bd = b?.createdAt?.toDate?.()?.getTime?.() || 0;
      return bd - ad;
    });
  }, [erDocs]);

  // Finalize employee when release doc is approved/signed
  const finalizedRef = React.useRef(false);
  React.useEffect(() => {
    if (!firestore || !employeeId || !employee) return;
    if (finalizedRef.current) return;
    if (!releaseDocs || releaseDocs.length === 0) return;

    const finalDoc = releaseDocs.find((d) => d.status === 'APPROVED' || d.status === 'SIGNED');
    if (!finalDoc) return;

    // If already finalized, do nothing
    if (employee.status === 'terminated' || employee.status === 'on_leave') {
      finalizedRef.current = true;
      return;
    }

    // Never auto-disable protected roles (super_admin, company_super_admin) or the
    // currently logged-in user — prevents accidental self-lockout.
    if (PROTECTED_ROLES.has((employee as any).role) || employeeId === currentUserId) {
      finalizedRef.current = true;
      return;
    }

    const terminationDate = extractReleaseDate(finalDoc);
    finalizedRef.current = true;

    const actionId = String((finalDoc as any)?.metadata?.actionId || '');
    if (actionId === 'release_temporary' || actionId.startsWith('release_temporary_')) {
      updateDocumentNonBlocking(tDoc('employees', employeeId), {
        status: 'on_leave',
        updatedAt: Timestamp.now(),
      });
    } else {
      // Safety-net: applyEmployeeLifecycle энэ шилжилтийг аль хэдийн хийсэн байж
      // магадгүй ч идемпотент — lifecycleStage-ийг 'alumni' руу, previousLifecycleStage-ийг
      // хуучин үе шатанд снапшотлон бичнэ.
      updateDocumentNonBlocking(tDoc('employees', employeeId), {
        status: 'terminated',
        loginDisabled: true,
        lifecycleStage: 'alumni',
        previousLifecycleStage: employee.lifecycleStage ?? null,
        ...(terminationDate ? { terminationDate } : {}),
        updatedAt: Timestamp.now(),
      });
    }
  }, [firestore, employeeId, employee, releaseDocs]);

  // --- 2) Offboarding projects progress ---
  const projectsQuery = useMemoFirebase(({ firestore, companyPath }) => {
    if (!firestore || !employeeId) return null;
    return query(
      tenantCollection(firestore, companyPath, 'projects'),
      where('type', '==', 'offboarding'),
      where('offboardingEmployeeId', '==', employeeId)
    );
  }, [employeeId]);

  const { data: projects, isLoading } = useFetchCollection<Project>(projectsQuery as any);
  const [taskCounts, setTaskCounts] = React.useState<Record<string, { total: number; completed: number }>>({});

  React.useEffect(() => {
    let cancelled = false;

    async function fetchCounts() {
      if (!firestore || !projects || projects.length === 0) return;
      const counts: Record<string, { total: number; completed: number }> = {};
      for (const p of projects) {
        if (cancelled) return;
        const snap = await getDocs(tCollection('projects', p.id, 'tasks'));
        const tasks = snap.docs.map(d => d.data() as Task);
        counts[p.id] = { total: tasks.length, completed: tasks.filter(t => t.status === 'DONE').length };
      }
      if (!cancelled) setTaskCounts(counts);
    }
    fetchCounts();
    return () => { cancelled = true; };
  }, [firestore, projects]);

  const sortedProjects = React.useMemo(() => {
    return [...(projects || [])].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
  }, [projects]);

  const overall = React.useMemo(() => {
    let total = 0;
    let done = 0;
    sortedProjects.forEach(p => {
      const c = taskCounts[p.id];
      if (!c) return;
      total += c.total;
      done += c.completed;
    });
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, percent };
  }, [sortedProjects, taskCounts]);

  if (isLoading || erDocsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  if (!sortedProjects.length && releaseDocs.length === 0) {
    const employeeAsType = { ...employee, id: employeeId } as any;
    const blocked = eligibility !== null && eligibility.allowed === false;
    return (
      <>
        <Card className="rounded-lg border bg-card">
          <CardContent className="py-8 px-6 text-center space-y-3">
            <div>
              <h3 className="text-caption-medium text-foreground">Offboarding эхлээгүй байна</h3>
              <p className="text-micro text-muted-foreground max-w-sm mx-auto mt-0.5">
                {employee.firstName} {employee.lastName} ажилтны offboarding хөтөлбөр эхлээгүй байна.
              </p>
            </div>

            {blocked && eligibility?.allowed === false && (
              <div className="p-3 rounded-md border border-amber-200 bg-amber-50 max-w-md mx-auto text-left space-y-2">
                <div>
                  <div className="text-caption-medium text-amber-900">Чөлөөлөх эхлүүлэх боломжгүй</div>
                  <div className="text-micro text-amber-800 mt-0.5">{eligibility.reason}</div>
                </div>
                {(eligibility.activeAppointmentDocId || eligibility.activeReleaseDocId) && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="bg-card border-amber-300 text-amber-800 hover:bg-amber-100 h-7 text-caption w-full"
                  >
                    <Link
                      href={
                        eligibility.activeAppointmentDocId
                          ? getAppointmentDocumentUrl(eligibility.activeAppointmentDocId)
                          : getReleaseDocumentUrl(eligibility.activeReleaseDocId!)
                      }
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Одоо явагдаж буй баримт руу очих
                    </Link>
                  </Button>
                )}
              </div>
            )}

            <Button
              onClick={() => setShowWizard(true)}
              disabled={blocked}
              size="sm"
              className="h-8 text-caption bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
              title={blocked && eligibility?.allowed === false ? eligibility.reason : undefined}
            >
              Offboarding эхлүүлэх
            </Button>
          </CardContent>
        </Card>
        <StartOffboardingWizardDialog
          open={showWizard}
          onOpenChange={setShowWizard}
          preselectedEmployee={employeeAsType}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Release paperwork */}
      <Card className="rounded-lg border bg-card">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="text-caption-medium text-foreground">Чөлөөлөх баримт бичиг</h3>
            <p className="text-micro text-muted-foreground">Чөлөөлөх үйл явцын баталгаажуулалт</p>
          </div>
          {releaseDocs.length === 0 ? (
            <p className="text-caption text-muted-foreground">Чөлөөлөх ER баримт үүсээгүй байна.</p>
          ) : (
            <div className="space-y-1">
              {releaseDocs.slice(0, 5).map((d: any) => {
                const statusKey = ((d?.status as DocumentStatus) || 'DRAFT') as DocumentStatus;
                const statusCfg = DOCUMENT_STATUSES[statusKey] || { label: String(d.status), color: 'bg-muted text-foreground' };
                const actionId = d?.metadata?.actionId as string | undefined;
                const createdAt = d?.createdAt?.toDate?.()?.toLocaleDateString?.() || '—';
                return (
                  <div key={d.id} className="flex items-center justify-between gap-3 px-2 py-2 -mx-2 rounded-md hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-caption-medium text-foreground truncate">
                          {d?.metadata?.templateName || 'Чөлөөлөх баримт'}
                        </span>
                        <Badge variant="outline" className={cn('text-micro h-5', statusCfg.color)}>{statusCfg.label}</Badge>
                      </div>
                      <p className="text-micro text-muted-foreground">{formatActionLabel(actionId)} · {createdAt}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="h-7 text-caption">
                      <Link href={`/dashboard/employment-relations/${d.id}`}>Нээх</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offboarding projects progress */}
      <Card className="rounded-lg border bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-caption-medium text-foreground">Offboarding явц</h3>
                <span className="text-micro text-muted-foreground">{overall.done}/{overall.total} таск</span>
              </div>
              <p className="text-micro text-muted-foreground">{sortedProjects.length} төсөл</p>
            </div>
            <p className="text-xl font-semibold text-primary leading-none">{overall.percent}%</p>
          </div>
          <Progress value={overall.percent} className="h-1.5 bg-muted [&>div]:bg-primary" />

          <div className="mt-3 flex items-center justify-end">
            <Button asChild variant="outline" size="sm" className="h-7 text-caption">
              <Link href={`/dashboard/offboarding/${employeeId}`}>Төслүүд рүү очих</Link>
            </Button>
          </div>

          <div className="space-y-1 mt-2">
            {sortedProjects.map(p => {
              const c = taskCounts[p.id] || { total: 0, completed: 0 };
              const pct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-3 px-2 py-2 -mx-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-caption-medium text-foreground truncate">{p.name}</p>
                    <p className="text-micro text-muted-foreground">{c.completed}/{c.total} таск · {pct}%</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

