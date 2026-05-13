// src/app/dashboard/hr/business-plan/components/performance-tab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useUser, addDocumentNonBlocking, updateDocumentNonBlocking, useTenantWrite } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, Pencil, Award, Users, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Employee } from '@/types';
import {
    BusinessPlan,
    PerformanceReview,
    PerformanceReviewFormValues,
    PerformanceScore,
    ScoreEmployeeFormValues,
    Objective,
    Kpi,
    StrategyFramework,
    REVIEW_STATUS_LABELS,
    REVIEW_PERIOD_LABELS,
    RATING_COLORS,
    RATING_LABELS,
    Rating,
    getRatingFromScore,
    getFrameworkScoreLabel,
    REVIEW_TYPE_LABELS,
    REVIEW_TYPE_COLORS,
    ReviewType,
} from '../types';
import { CreateReviewDialog } from './create-review-dialog';
import { ScoreEmployeeDialog } from './score-employee-dialog';

interface PerformanceTabProps {
    activePlan?: BusinessPlan;
    reviews: PerformanceReview[];
    scores: PerformanceScore[];
    objectives: Objective[];
    kpis: Kpi[];
    employees: Employee[];
    isLoading: boolean;
    framework?: StrategyFramework;
}

export function PerformanceTab({
    activePlan, reviews, scores, objectives, kpis, employees, isLoading, framework = 'okr',
}: PerformanceTabProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { tDoc, tCollection } = useTenantWrite();
    const { toast } = useToast();
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
    const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
    const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);
    const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
    const [editingScore, setEditingScore] = useState<PerformanceScore | null>(null);
    const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

    const handleCreateReview = (values: PerformanceReviewFormValues) => {
        if (!firestore || !user || !activePlan) return;
        const data = {
            ...values,
            planId: activePlan.id,
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
        };
        addDocumentNonBlocking(tCollection('bp_reviews'), data);
        toast({ title: 'Гүйцэтгэлийн үнэлгээ үүсгэлээ', description: values.title });
    };

    const handleUpdateReview = (values: PerformanceReviewFormValues) => {
        if (!firestore || !editingReview) return;
        updateDocumentNonBlocking(tDoc('bp_reviews', editingReview.id), values);
        toast({ title: 'Үнэлгээ шинэчлэгдлээ' });
        setEditingReview(null);
    };

    const handleScoreEmployee = (
        values: ScoreEmployeeFormValues,
        computed: { overallScore: number; rating: string }
    ) => {
        if (!firestore || !user || !selectedReview || !activePlan) return;
        const emp = employees.find(e => e.id === values.employeeId);
        const empName = emp ? `${emp.lastName?.charAt(0) || ''}. ${emp.firstName}` : '';

        if (editingScore) {
            // Update existing score
            updateDocumentNonBlocking(tDoc('bp_scores', editingScore.id), {
                okrScore: values.okrScore,
                kpiScore: values.kpiScore,
                overallScore: computed.overallScore,
                rating: computed.rating as Rating,
                reviewedBy: user.uid,
                reviewedByName: user.displayName || user.email || 'Админ',
                notes: values.notes || '',
            });
            toast({ title: 'Үнэлгээ шинэчлэгдлээ', description: `${empName} — ${computed.rating}` });
            setEditingScore(null);
        } else {
            // Create new score
            const data: Omit<PerformanceScore, 'id'> = {
                reviewId: selectedReview.id,
                planId: activePlan.id,
                employeeId: values.employeeId,
                employeeName: empName,
                okrScore: values.okrScore,
                kpiScore: values.kpiScore,
                overallScore: computed.overallScore,
                rating: computed.rating as Rating,
                reviewedBy: user.uid,
                reviewedByName: user.displayName || user.email || 'Админ',
                status: 'submitted',
                notes: values.notes || '',
                reviewType: (values as any).reviewType ?? 'manager',
                createdAt: new Date().toISOString(),
            };
            addDocumentNonBlocking(tCollection('bp_scores'), data);
            toast({ title: 'Ажилтан үнэлэгдлээ', description: `${empName} — ${computed.rating}` });
        }
    };

    // Review тус бүрийн rating distribution болон avg score-г урьдчилан тооцоолно
    const reviewStats = useMemo(() => {
        const map = new Map<string, { ratingDist: Record<string, number>; avgScore: number }>();
        reviews.forEach(review => {
            const rs = scores.filter(s => s.reviewId === review.id);
            const dist: Record<string, number> = {};
            rs.forEach(s => { dist[s.rating] = (dist[s.rating] || 0) + 1; });
            const avg = rs.length > 0
                ? Math.round(rs.reduce((sum, s) => sum + s.overallScore, 0) / rs.length)
                : 0;
            map.set(review.id, { ratingDist: dist, avgScore: avg });
        });
        return map;
    }, [reviews, scores]);

    if (!activePlan) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Award className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Идэвхтэй төлөвлөгөө байхгүй</h3>
                    <p className="text-sm text-muted-foreground">Эхлээд бизнес төлөвлөгөө үүсгэнэ үү.</p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Гүйцэтгэлийн үнэлгээ</h3>
                    <p className="text-sm text-muted-foreground">{getFrameworkScoreLabel(framework)} + KPI суурилсан гүйцэтгэлийн хяналт</p>
                </div>
                <Button onClick={() => { setEditingReview(null); setIsReviewDialogOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />Шинэ үнэлгээ
                </Button>
            </div>

            {/* Reviews */}
            {reviews.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="text-center py-12">
                        <p className="text-muted-foreground text-sm">Гүйцэтгэлийн үнэлгээ байхгүй</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reviews.map(review => {
                        const isExpanded = expandedReviewId === review.id;
                        const reviewScores = scores.filter(s => s.reviewId === review.id);
                        const { ratingDist, avgScore } = reviewStats.get(review.id) ?? { ratingDist: {}, avgScore: 0 };

                        return (
                            <Card key={review.id}>
                                <CardHeader
                                    className="cursor-pointer"
                                    onClick={() => setExpandedReviewId(isExpanded ? null : review.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            <div>
                                                <CardTitle className="text-base">{review.title}</CardTitle>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {REVIEW_PERIOD_LABELS[review.period]} {review.year} •
                                                    OKR: {review.okrWeight}% / KPI: {review.kpiWeight}% •
                                                    {reviewScores.length} ажилтан үнэлэгдсэн
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{REVIEW_STATUS_LABELS[review.status]}</Badge>
                                            {avgScore > 0 && (
                                                <Badge className={cn(RATING_COLORS[getRatingFromScore(avgScore)])}>
                                                    Дундаж: {avgScore}
                                                </Badge>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingReview(review);
                                                    setIsReviewDialogOpen(true);
                                                }}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                {isExpanded && (
                                    <CardContent className="pt-0 space-y-4">
                                        {/* Score button */}
                                        <div className="flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5"
                                                onClick={() => {
                                                    setSelectedReview(review);
                                                    setIsScoreDialogOpen(true);
                                                }}
                                            >
                                                <Plus className="h-3.5 w-3.5" />Ажилтан үнэлэх
                                            </Button>
                                        </div>

                                        {/* Rating distribution */}
                                        {reviewScores.length > 0 && (
                                            <div className="flex gap-2 flex-wrap">
                                                {Object.entries(ratingDist).map(([r, count]) => (
                                                    <Badge key={r} className={cn(RATING_COLORS[r as Rating])}>
                                                        {r}: {count}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Scores table */}
                                        {reviewScores.length > 0 ? (
                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50">
                                                        <tr>
                                                            <th className="text-left p-3 font-medium">Ажилтан</th>
                                                            <th className="text-center p-3 font-medium">{getFrameworkScoreLabel(framework)}</th>
                                                            <th className="text-center p-3 font-medium">KPI</th>
                                                            <th className="text-center p-3 font-medium">Нийт</th>
                                                            <th className="text-center p-3 font-medium">Үнэлгээ</th>
                                                            <th className="p-3 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {reviewScores.map(score => (
                                                            <tr key={score.id} className="border-t group/row">
                                                                <td className="p-3">{score.employeeName}</td>
                                                                <td className="p-3 text-center">{score.okrScore}</td>
                                                                <td className="p-3 text-center">{score.kpiScore}</td>
                                                                <td className="p-3 text-center font-semibold">{score.overallScore}</td>
                                                                <td className="p-3 text-center">
                                                                    <Badge className={cn('text-xs', RATING_COLORS[score.rating])}>
                                                                        {score.rating}
                                                                    </Badge>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 opacity-0 group-hover/row:opacity-100 transition-opacity"
                                                                        onClick={() => {
                                                                            setEditingScore(score);
                                                                            setSelectedReview(review);
                                                                            setIsScoreDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <Pencil className="h-3 w-3" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-6">
                                                Ажилтан үнэлэгдээгүй байна
                                            </p>
                                        )}
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Dialogs */}
            <CreateReviewDialog
                open={isReviewDialogOpen}
                onOpenChange={setIsReviewDialogOpen}
                onSubmit={editingReview ? handleUpdateReview : handleCreateReview}
                editingReview={editingReview}
            />
            {selectedReview && (
                <ScoreEmployeeDialog
                    open={isScoreDialogOpen}
                    onOpenChange={(v) => { setIsScoreDialogOpen(v); if (!v) setEditingScore(null); }}
                    onSubmit={handleScoreEmployee}
                    review={selectedReview}
                    employees={employees}
                    existingScores={scores.filter(s => s.reviewId === selectedReview.id)}
                    editingScore={editingScore}
                    objectives={objectives}
                    keyResults={kpis as any}
                />
            )}
        </div>
    );
}
