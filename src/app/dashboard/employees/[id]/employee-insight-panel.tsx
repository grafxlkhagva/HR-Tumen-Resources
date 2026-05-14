'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { initializeFirebase } from '@/firebase';
import { getAuth } from 'firebase/auth';
import {
    Brain, Sparkles, RefreshCw, ChevronDown, ChevronUp,
    Zap, Target, TrendingUp, Heart,
} from 'lucide-react';

const FOCUS_AREAS = [
    { value: 'Бүрэн дүгнэлт',         icon: Brain,       color: '#6366F1' },
    { value: 'Хөгжлийн зөвлөмж',       icon: TrendingUp,  color: '#10B981' },
    { value: 'Гүйцэтгэлийн дүгнэлт',  icon: Target,      color: '#F59E0B' },
    { value: 'Хувь хүний шинж чанар',  icon: Heart,       color: '#F43F5E' },
    { value: 'Яаралтай анхаарах зүйл', icon: Zap,         color: '#EF4444' },
];

async function getAuthToken(): Promise<string | null> {
    try {
        const { firebaseApp } = initializeFirebase();
        const auth = getAuth(firebaseApp);
        const user = auth.currentUser;
        if (!user) return null;
        return await user.getIdToken();
    } catch { return null; }
}

interface Props {
    employeeId: string;
    employeeName?: string;
}

export function EmployeeInsightPanel({ employeeId, employeeName }: Props) {
    const [insight, setInsight] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [focusArea, setFocusArea] = React.useState(FOCUS_AREAS[0].value);
    const [generatedAt, setGeneratedAt] = React.useState<string | null>(null);
    const [isExpanded, setIsExpanded] = React.useState(true);
    const [hasGenerated, setHasGenerated] = React.useState(false);

    const generate = React.useCallback(async (area: string) => {
        setIsLoading(true);
        setError(null);
        setInsight(null);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Нэвтрэх эрх байхгүй байна');

            const res = await fetch('/api/employee-insight', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ employeeId, focusArea: area }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            setInsight(data.insight);
            setGeneratedAt(data.generatedAt);
            setHasGenerated(true);
            setIsExpanded(true);
        } catch (e: any) {
            setError(e?.message || 'Алдаа гарлаа');
        } finally {
            setIsLoading(false);
        }
    }, [employeeId]);

    const handleFocusChange = (area: string) => {
        setFocusArea(area);
        if (hasGenerated) generate(area);
    };

    const activeFocus = FOCUS_AREAS.find(f => f.value === focusArea) || FOCUS_AREAS[0];

    return (
        <div className="bg-white rounded-2xl border overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                style={{ background: `linear-gradient(135deg, ${activeFocus.color}12 0%, white 60%)` }}
                onClick={() => hasGenerated && setIsExpanded(v => !v)}
            >
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${activeFocus.color}20` }}>
                        <Brain className="h-4.5 w-4.5" style={{ color: activeFocus.color }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800">AI Дүгнэлт</h3>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-200 text-violet-600 bg-violet-50">
                                <Sparkles className="h-2.5 w-2.5 mr-1" />
                                Gemini
                            </Badge>
                        </div>
                        {employeeName && <p className="text-xs text-slate-500">{employeeName}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {generatedAt && (
                        <span className="text-[10px] text-slate-400 hidden sm:block">
                            {new Date(generatedAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    {isLoading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
                    {hasGenerated && !isLoading && (
                        isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                </div>
            </div>

            {/* Focus area chips */}
            <div className="px-5 py-3 border-b flex flex-wrap gap-2">
                {FOCUS_AREAS.map(f => {
                    const Icon = f.icon;
                    const isActive = focusArea === f.value;
                    return (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => handleFocusChange(f.value)}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                                isActive
                                    ? 'text-white border-transparent shadow-sm'
                                    : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50'
                            )}
                            style={isActive ? { backgroundColor: f.color, borderColor: f.color } : {}}
                        >
                            <Icon className="h-3 w-3" />
                            {f.value}
                        </button>
                    );
                })}
            </div>

            {/* Content area */}
            {(isExpanded || !hasGenerated) && (
                <div className="px-5 py-4">
                    {!hasGenerated && !isLoading && !error && (
                        /* Initial state */
                        <div className="py-8 flex flex-col items-center text-center gap-4">
                            <div className="relative">
                                <div className="h-16 w-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${activeFocus.color}15` }}>
                                    <Brain className="h-8 w-8" style={{ color: activeFocus.color }} />
                                </div>
                                <div className="absolute -top-1 -right-1 h-5 w-5 bg-violet-500 rounded-full flex items-center justify-center">
                                    <Sparkles className="h-3 w-3 text-white" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700 mb-1">Ажилтны хувийн AI дүгнэлт</p>
                                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                                    Анкет, ажлын гүйцэтгэл, ур чадвар, ирц болон бусад мэдээлэлд тулгуурлан иж бүрэн дүгнэлт гаргана.
                                </p>
                            </div>
                            <Button
                                onClick={() => generate(focusArea)}
                                className="gap-2 shadow-sm"
                                style={{ backgroundColor: activeFocus.color, borderColor: activeFocus.color }}
                            >
                                <Sparkles className="h-4 w-4" />
                                Дүгнэлт гаргах
                            </Button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="space-y-3 py-2">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: activeFocus.color }} />
                                <span>Мэдээлэл цуглуулж, дүгнэлт гаргаж байна...</span>
                            </div>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-4 w-full rounded" style={{ opacity: 1 - i * 0.15 }} />
                            ))}
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="py-6 text-center">
                            <div className="text-sm text-rose-600 mb-3">{error}</div>
                            <Button variant="outline" size="sm" onClick={() => generate(focusArea)}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                Дахин оролдох
                            </Button>
                        </div>
                    )}

                    {insight && !isLoading && (
                        <div className="space-y-4">
                            {/* Markdown дүгнэлт */}
                            <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed
                                prose-headings:font-bold prose-headings:text-slate-800 prose-headings:text-sm
                                prose-h3:flex prose-h3:items-center prose-h3:gap-1.5
                                prose-strong:text-slate-900
                                prose-ul:space-y-1 prose-li:text-slate-700
                                prose-p:text-slate-600 prose-p:leading-relaxed">
                                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{insight}</ReactMarkdown>
                            </div>

                            {/* Refresh */}
                            <div className="flex items-center justify-between pt-3 border-t">
                                <span className="text-[10px] text-slate-400">
                                    Мэдээлэлд тулгуурлан автоматаар үүссэн
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-slate-500 hover:text-slate-700"
                                    onClick={() => generate(focusArea)}
                                >
                                    <RefreshCw className="h-3 w-3 mr-1.5" />
                                    Шинэчлэх
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
