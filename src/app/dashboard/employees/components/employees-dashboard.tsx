'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AddActionButton } from '@/components/ui/add-action-button';
import { cn } from '@/lib/utils';
import {
  Users,
  UserCheck,
  UserMinus,
  FileText,
  FileBarChart2,
  ClipboardCheck,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Employee, Department } from '@/types';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

// ─── Status colours (semantic, matching the page's statusConfig) ─────────────
const STATUS_COLORS: Record<string, string> = {
  'Идэвхтэй': '#10b981',
  'Жирэмсний амралттай': '#3b82f6',
  'Хүүхэд асрах чөлөөтэй': '#6366f1',
  'Урт хугацааны чөлөөтэй': '#f59e0b',
  'Ажлаас гарсан': '#f43f5e',
  'Түр түдгэлзүүлсэн': '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  'Идэвхтэй': 'Идэвхтэй',
  'Жирэмсний амралттай': 'Жирэмсний амралт',
  'Хүүхэд асрах чөлөөтэй': 'Хүүхэд асаргаа',
  'Урт хугацааны чөлөөтэй': 'Чөлөөтэй',
  'Ажлаас гарсан': 'Гарсан',
  'Түр түдгэлзүүлсэн': 'Түдгэлзсэн',
};

const LIFECYCLE_COLORS: Record<string, { color: string; label: string }> = {
  attraction: { color: '#a78bfa', label: 'Татах' },
  recruitment: { color: '#818cf8', label: 'Сонгон шалгаруулалт' },
  onboarding: { color: '#34d399', label: 'Чиглүүлэлт' },
  development: { color: '#60a5fa', label: 'Хөгжүүлэлт' },
  retention: { color: '#fbbf24', label: 'Тогтвортой байдал' },
  offboarding: { color: '#fb923c', label: 'Чөлөөлөлт' },
  alumni: { color: '#94a3b8', label: 'Алумни' },
};

// ─── Age group definitions ───────────────────────────────────────────────────
const AGE_GROUPS = [
  { label: '18-25', min: 18, max: 25, color: '#34d399' },
  { label: '26-35', min: 26, max: 35, color: '#60a5fa' },
  { label: '36-45', min: 36, max: 45, color: '#a78bfa' },
  { label: '46-55', min: 46, max: 55, color: '#fbbf24' },
  { label: '56+', min: 56, max: 999, color: '#fb923c' },
];

// ─── Props ───────────────────────────────────────────────────────────────────
interface EmployeesDashboardProps {
  employees: Employee[] | null;
  departments: Department[] | null;
  documents: any[] | null;
  onboardingProcesses: any[] | null;
  offboardingProjects: any[] | null;
  isLoading: boolean;
}

// ─── Helper: calculate age from birth date ───────────────────────────────────
function calcAge(birthDate: any): number | null {
  if (!birthDate) return null;
  let d: Date;
  if (typeof birthDate === 'string') {
    d = new Date(birthDate);
  } else if (birthDate instanceof Date) {
    d = birthDate;
  } else if (typeof birthDate === 'object' && 'seconds' in birthDate) {
    // Firestore Timestamp
    d = new Date(birthDate.seconds * 1000);
  } else {
    return null;
  }
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function EmployeesDashboard({
  employees,
  departments,
  documents,
  isLoading,
}: EmployeesDashboardProps) {
  // ── Fetch questionnaire data (gender + birthDate) per employee ──────────
  const { firestore } = useFirebase();
  const [questionnaireMap, setQuestionnaireMap] = React.useState<
    Map<string, { gender?: string; birthDate?: any }>
  >(new Map());

  React.useEffect(() => {
    if (!firestore || !employees || employees.length === 0) {
      setQuestionnaireMap(new Map());
      return;
    }

    let cancelled = false;

    const fetchAll = async () => {
      const map = new Map<string, { gender?: string; birthDate?: any }>();
      const promises = employees.map(async (emp) => {
        try {
          const docRef = doc(firestore, 'employees', emp.id, 'questionnaire', 'data');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const d = snap.data();
            map.set(emp.id, { gender: d?.gender, birthDate: d?.birthDate });
          }
        } catch {
          // Skip if doc doesn't exist or permission denied
        }
      });
      await Promise.all(promises);
      if (!cancelled) setQuestionnaireMap(map);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [firestore, employees]);

  // ── Derived metrics ──────────────────────────────────────────────────────
  const metrics = React.useMemo(() => {
    if (!employees) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        documentsCount: 0,
        avgQuestionnaire: 0,
        statusData: [] as { name: string; value: number; color: string }[],
        genderData: [] as { name: string; value: number; color: string }[],
        maleCount: 0,
        femaleCount: 0,
        unknownGenderCount: 0,
        ageData: [] as { name: string; value: number; color: string }[],
        agePictogram: [] as { color: string }[],
        lifecycleData: [] as { stage: string; count: number; color: string; label: string }[],
      };
    }

    const total = employees.length;
    const active = employees.filter(e => e.status === 'Идэвхтэй').length;
    const inactive = total - active;
    const documentsCount = documents?.length || 0;

    // Average questionnaire completion
    const withQuestionnaire = employees.filter(e => typeof e.questionnaireCompletion === 'number');
    const avgQuestionnaire = withQuestionnaire.length > 0
      ? Math.round(withQuestionnaire.reduce((sum, e) => sum + (e.questionnaireCompletion || 0), 0) / withQuestionnaire.length)
      : 0;

    // Status distribution
    const statusCounts: Record<string, number> = {};
    employees.forEach(e => {
      const s = e.status || 'Тодорхойгүй';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts)
      .map(([name, value]) => ({
        name: STATUS_LABELS[name] || name,
        value,
        color: STATUS_COLORS[name] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);

    // Gender distribution
    let maleCount = 0;
    let femaleCount = 0;
    let unknownGenderCount = 0;
    // Age distribution
    const ageCounts: Record<string, number> = {};
    AGE_GROUPS.forEach(g => { ageCounts[g.label] = 0; });

    employees.forEach(e => {
      const q = questionnaireMap.get(e.id);
      // Gender
      if (q?.gender === 'male') maleCount++;
      else if (q?.gender === 'female') femaleCount++;
      else unknownGenderCount++;
      // Age
      const age = calcAge(q?.birthDate);
      if (age !== null) {
        const group = AGE_GROUPS.find(g => age >= g.min && age <= g.max);
        if (group) ageCounts[group.label]++;
      }
    });

    const genderData: { name: string; value: number; color: string }[] = [];
    if (maleCount > 0) genderData.push({ name: 'Эрэгтэй', value: maleCount, color: '#3b82f6' });
    if (femaleCount > 0) genderData.push({ name: 'Эмэгтэй', value: femaleCount, color: '#ec4899' });
    if (unknownGenderCount > 0) genderData.push({ name: 'Тодорхойгүй', value: unknownGenderCount, color: '#94a3b8' });

    const ageData = AGE_GROUPS
      .map(g => ({ name: g.label, value: ageCounts[g.label], color: g.color }))
      .filter(d => d.value > 0);

    // Build pictogram data: one entry per employee with age-group color
    const agePictogram: { color: string }[] = [];
    employees.forEach(e => {
      const q = questionnaireMap.get(e.id);
      const age = calcAge(q?.birthDate);
      if (age !== null) {
        const group = AGE_GROUPS.find(g => age >= g.min && age <= g.max);
        agePictogram.push({ color: group?.color || '#94a3b8' });
      } else {
        agePictogram.push({ color: '#d1d5db' });
      }
    });

    // Lifecycle distribution
    const lifecycleCounts: Record<string, number> = {};
    employees.forEach(e => {
      if (e.lifecycleStage) {
        lifecycleCounts[e.lifecycleStage] = (lifecycleCounts[e.lifecycleStage] || 0) + 1;
      }
    });
    const lifecycleData = Object.entries(lifecycleCounts)
      .map(([stage, count]) => ({
        stage,
        count,
        color: LIFECYCLE_COLORS[stage]?.color || '#94a3b8',
        label: LIFECYCLE_COLORS[stage]?.label || stage,
      }));

    return {
      total,
      active,
      inactive,
      documentsCount,
      avgQuestionnaire,
      statusData,
      genderData,
      maleCount,
      femaleCount,
      unknownGenderCount,
      ageData,
      agePictogram,
      lifecycleData,
    };
  }, [employees, documents, questionnaireMap]);

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const lifecycleTotal = metrics.lifecycleData.reduce((s, d) => s + d.count, 0);
  const genderTotal = metrics.genderData.reduce((s, d) => s + d.value, 0);
  const ageTotal = metrics.ageData.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Ажилтнуудын ерөнхий мэдээлэл
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Бүртгэлийн нэгдсэн харагдац
            </p>
          </div>
          <AddActionButton
            label="Дэлгэрэнгүй тайлан"
            description="Ажилтнуудын тайлан харах"
            href="/dashboard/employees/reports"
            icon={<FileBarChart2 className="h-4 w-4" />}
          />
        </div>

        {/* ── Main grid: Key numbers | Status donut | Gender & Age ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── Left: Key metric tiles ─────────────────────────── */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-2.5">
            <MetricTile
              icon={Users}
              label="Нийт ажилтан"
              value={metrics.total}
              iconBg="bg-slate-100 dark:bg-slate-800"
              iconColor="text-slate-600 dark:text-slate-400"
            />
            <MetricTile
              icon={UserCheck}
              label="Идэвхтэй"
              value={metrics.active}
              iconBg="bg-emerald-100 dark:bg-emerald-900/30"
              iconColor="text-emerald-600 dark:text-emerald-400"
              valueColor="text-emerald-600 dark:text-emerald-400"
            />
            <MetricTile
              icon={UserMinus}
              label="Чөлөө / Гарсан"
              value={metrics.inactive}
              iconBg="bg-amber-100 dark:bg-amber-900/30"
              iconColor="text-amber-600 dark:text-amber-400"
              valueColor="text-amber-600 dark:text-amber-400"
            />
            <MetricTile
              icon={FileText}
              label="Баримт бичиг"
              value={metrics.documentsCount}
              iconBg="bg-blue-100 dark:bg-blue-900/30"
              iconColor="text-blue-600 dark:text-blue-400"
              valueColor="text-blue-600 dark:text-blue-400"
            />
          </div>

          {/* ── Center: Status donut ───────────────────────────── */}
          <div className="lg:col-span-4">
            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4 h-full flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Төлөв
              </p>
              {metrics.statusData.length > 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full h-[160px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {metrics.statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            fontSize: '12px',
                          }}
                          formatter={(value: number, name: string) => [`${value} ажилтан`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground leading-none">{metrics.total}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">нийт</div>
                      </div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-3">
                    {metrics.statusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {item.name} ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                  Мэдээлэл байхгүй
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Gender & Age infographic ────────────────── */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Gender distribution - creative layout */}
            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4 flex-1 flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Хүйсийн харьцаа
              </p>
              {genderTotal > 0 ? (
                <div className="flex-1">
                  {/* Two-panel gender cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Male */}
                    <div className="relative rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/40 dark:to-sky-950/30 border border-blue-100/60 dark:border-blue-800/30 p-3 flex flex-col items-center overflow-hidden">
                      <div className="absolute top-1 right-1.5 text-[10px] font-bold text-blue-400/60 dark:text-blue-500/40">
                        {genderTotal > 0 ? Math.round((metrics.maleCount / genderTotal) * 100) : 0}%
                      </div>
                      <MaleFigure className="h-10 w-10 text-blue-500 dark:text-blue-400 mb-1.5" />
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400 leading-none tabular-nums">
                        {metrics.maleCount}
                      </div>
                      <div className="text-[10px] text-blue-500/70 dark:text-blue-400/60 font-medium mt-0.5">
                        Эрэгтэй
                      </div>
                    </div>
                    {/* Female */}
                    <div className="relative rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/30 border border-pink-100/60 dark:border-pink-800/30 p-3 flex flex-col items-center overflow-hidden">
                      <div className="absolute top-1 right-1.5 text-[10px] font-bold text-pink-400/60 dark:text-pink-500/40">
                        {genderTotal > 0 ? Math.round((metrics.femaleCount / genderTotal) * 100) : 0}%
                      </div>
                      <FemaleFigure className="h-10 w-10 text-pink-500 dark:text-pink-400 mb-1.5" />
                      <div className="text-xl font-bold text-pink-600 dark:text-pink-400 leading-none tabular-nums">
                        {metrics.femaleCount}
                      </div>
                      <div className="text-[10px] text-pink-500/70 dark:text-pink-400/60 font-medium mt-0.5">
                        Эмэгтэй
                      </div>
                    </div>
                  </div>
                  {/* Ratio bar */}
                  <div className="flex h-1.5 rounded-full overflow-hidden mt-3 bg-slate-200 dark:bg-slate-700">
                    {metrics.maleCount > 0 && (
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${(metrics.maleCount / genderTotal) * 100}%` }}
                      />
                    )}
                    {metrics.femaleCount > 0 && (
                      <div
                        className="h-full bg-pink-500 transition-all duration-500"
                        style={{ width: `${(metrics.femaleCount / genderTotal) * 100}%` }}
                      />
                    )}
                    {metrics.unknownGenderCount > 0 && (
                      <div
                        className="h-full bg-slate-400 transition-all duration-500"
                        style={{ width: `${(metrics.unknownGenderCount / genderTotal) * 100}%` }}
                      />
                    )}
                  </div>
                  {metrics.unknownGenderCount > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1.5 text-center">
                      Тодорхойгүй: {metrics.unknownGenderCount}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                  Анкет мэдээлэл байхгүй
                </div>
              )}
            </div>

            {/* Age distribution - pictogram style */}
            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4 flex-1 flex flex-col">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Насны бүлэг
              </p>
              {ageTotal > 0 ? (
                <div className="flex-1">
                  {/* People pictogram grid */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {metrics.agePictogram.map((person, i) => (
                      <PersonFigure
                        key={i}
                        className="h-5 w-3.5 transition-all duration-300"
                        style={{ color: person.color }}
                      />
                    ))}
                  </div>
                  {/* Age legend with counts */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    {metrics.ageData.map((group) => (
                      <div key={group.name} className="flex items-center gap-1.5">
                        <PersonFigure
                          className="h-3.5 w-2.5 shrink-0"
                          style={{ color: group.color }}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {group.name}
                        </span>
                        <span className="text-[11px] font-semibold text-foreground tabular-nums">
                          {group.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                  Анкет мэдээлэл байхгүй
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom row: Questionnaire + Lifecycle ────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* Questionnaire average */}
          <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Анкет бөглөлт (дундаж)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${metrics.avgQuestionnaire}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-foreground tabular-nums w-10 text-right">
                {metrics.avgQuestionnaire}%
              </span>
            </div>
          </div>

          {/* Lifecycle stage bar */}
          <div className="rounded-xl bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Амьдралын мөчлөг
            </p>
            {lifecycleTotal > 0 ? (
              <>
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                  {metrics.lifecycleData.map((item) => (
                    <div
                      key={item.stage}
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(item.count / lifecycleTotal) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {metrics.lifecycleData.map((item) => (
                    <div key={item.stage} className="flex items-center gap-1">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {item.label} ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Мэдээлэл байхгүй</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── SVG Figure components ───────────────────────────────────────────────────

/** Male standing figure silhouette */
function MaleFigure({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className={className} {...props}>
      {/* Head */}
      <circle cx="32" cy="12" r="8" />
      {/* Body - broader shoulders */}
      <path d="M20 24h24l2 20H18l2-20z" />
      {/* Arms */}
      <rect x="10" y="24" width="6" height="18" rx="3" />
      <rect x="48" y="24" width="6" height="18" rx="3" />
      {/* Legs */}
      <rect x="22" y="46" width="7" height="18" rx="3" />
      <rect x="35" y="46" width="7" height="18" rx="3" />
    </svg>
  );
}

/** Female standing figure silhouette */
function FemaleFigure({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className={className} {...props}>
      {/* Head */}
      <circle cx="32" cy="12" r="8" />
      {/* Body - A-line / dress shape */}
      <path d="M24 24h16l6 24H18l6-24z" />
      {/* Arms */}
      <rect x="12" y="24" width="5.5" height="16" rx="2.75" />
      <rect x="46.5" y="24" width="5.5" height="16" rx="2.75" />
      {/* Legs */}
      <rect x="24" y="49" width="6" height="15" rx="3" />
      <rect x="34" y="49" width="6" height="15" rx="3" />
    </svg>
  );
}

/** Generic person figure (for pictogram) */
function PersonFigure({ className, style, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 64" fill="currentColor" className={className} style={style} {...props}>
      <circle cx="20" cy="10" r="7" />
      <path d="M10 22h20l3 22H7l3-22z" />
      <rect x="12" y="46" width="6" height="16" rx="3" />
      <rect x="22" y="46" width="6" height="16" rx="3" />
    </svg>
  );
}

// ─── Metric tile helper ──────────────────────────────────────────────────────
function MetricTile({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
  valueColor,
  suffix,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2.5">
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground truncate leading-tight">{label}</p>
        <div className="flex items-baseline gap-1">
          <p className={cn('text-base font-bold leading-tight', valueColor || 'text-foreground')}>{value}</p>
          {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}
