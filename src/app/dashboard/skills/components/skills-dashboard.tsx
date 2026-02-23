// src/app/dashboard/skills/components/skills-dashboard.tsx
'use client';

import React, { useMemo } from 'react';
import { StatCard, StatGrid } from '@/components/patterns/stat-card';
import { Award, Users, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    SkillInventoryItem,
    SkillTypeItem,
    SKILL_LEVEL_LABELS,
    SKILL_LEVEL_VALUE,
    buildTypeMap,
} from '../types';
import type { SkillAssessment } from '../types';

interface SkillsDashboardProps {
    skills: SkillInventoryItem[];
    assessments: SkillAssessment[];
    skillTypes: SkillTypeItem[];
    isLoading: boolean;
}

export function SkillsDashboard({ skills, assessments, skillTypes, isLoading }: SkillsDashboardProps) {
    const typeMap = useMemo(() => buildTypeMap(skillTypes), [skillTypes]);
    const totalSkills = skills.length;

    const assessedEmployees = useMemo(() => {
        const unique = new Set(assessments.map(a => a.employeeId));
        return unique.size;
    }, [assessments]);

    const gapCount = useMemo(() => {
        return assessments.filter(a => {
            if (!a.requiredLevel) return false;
            return SKILL_LEVEL_VALUE[a.requiredLevel] > SKILL_LEVEL_VALUE[a.currentLevel];
        }).length;
    }, [assessments]);

    const avgGapRate = useMemo(() => {
        if (assessments.length === 0) return 0;
        const withRequired = assessments.filter(a => a.requiredLevel);
        if (withRequired.length === 0) return 0;
        const gaps = withRequired.filter(a =>
            SKILL_LEVEL_VALUE[a.requiredLevel!] > SKILL_LEVEL_VALUE[a.currentLevel]
        );
        return Math.round((gaps.length / withRequired.length) * 100);
    }, [assessments]);

    // Skills by type breakdown
    const typeBreakdown = useMemo(() => {
        const map = new Map<string, number>();
        skills.forEach(s => {
            const t = s.type || '';
            if (t) map.set(t, (map.get(t) || 0) + 1);
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1]);
    }, [skills]);

    // Recent assessments
    const recentAssessments = useMemo(() => {
        return [...assessments]
            .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))
            .slice(0, 5);
    }, [assessments]);

    const levelColor: Record<string, string> = {
        beginner: 'bg-slate-100 text-slate-600',
        intermediate: 'bg-blue-100 text-blue-700',
        advanced: 'bg-emerald-100 text-emerald-700',
        expert: 'bg-purple-100 text-purple-700',
    };

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <StatGrid columns={4}>
                <StatCard
                    title="Нийт ур чадвар"
                    value={isLoading ? '...' : totalSkills}
                    icon={Award}
                    description="Бүртгэлтэй ур чадварын тоо"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Үнэлэгдсэн ажилтан"
                    value={isLoading ? '...' : assessedEmployees}
                    icon={Users}
                    description="Ур чадвар үнэлэгдсэн"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Ур чадварын зөрүү"
                    value={isLoading ? '...' : gapCount}
                    icon={AlertTriangle}
                    description="Илэрсэн skill gap тоо"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Зөрүүтэй хувь"
                    value={isLoading ? '...' : `${avgGapRate}%`}
                    icon={TrendingUp}
                    description="Нийт үнэлгээний зөрүүтэй хувь"
                    isLoading={isLoading}
                />
            </StatGrid>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Skills by Type */}
                <Card>
                    <CardContent className="p-5">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Төрлөөр
                        </h3>
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} className="h-8 w-full" />
                                ))}
                            </div>
                        ) : typeBreakdown.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                Ур чадвар бүртгэгдээгүй байна
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {typeBreakdown.map(([typeId, count]) => {
                                    const maxCount = typeBreakdown[0]?.[1] || 1;
                                    const pct = Math.round((count / maxCount) * 100);
                                    const typeItem = typeMap.get(typeId);
                                    return (
                                        <div key={typeId} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium truncate max-w-[200px]">{typeItem?.name || typeId}</span>
                                                <span className="text-muted-foreground">{count}</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-indigo-500 transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Assessments */}
                <Card>
                    <CardContent className="p-5">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Сүүлийн үнэлгээнүүд
                        </h3>
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : recentAssessments.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                Үнэлгээ хийгдээгүй байна
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {recentAssessments.map(assessment => (
                                    <div
                                        key={assessment.id}
                                        className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-medium">{assessment.employeeName}</p>
                                            <p className="text-xs text-muted-foreground">{assessment.skillName}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(assessment.assessedAt).toLocaleDateString('mn-MN')}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className={levelColor[assessment.currentLevel] || ''}
                                            >
                                                {SKILL_LEVEL_LABELS[assessment.currentLevel]}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
