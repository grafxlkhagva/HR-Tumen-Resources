// src/app/dashboard/skills/components/skill-matrix.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { doc } from 'firebase/firestore';
import { useFirebase, useDoc } from '@/firebase';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/patterns/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { LayoutGrid, Search, Building2, Tags, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Department } from '@/types';
import { Employee } from '@/types';
import { Position } from '@/app/dashboard/organization/types';
import {
    SkillInventoryItem,
    SkillTypeItem,
    SKILL_LEVEL_LABELS,
    getTypeColorClasses,
    buildTypeMap,
} from '../types';
import type { SkillAssessment, SkillLevel } from '../types';

interface SkillMatrixProps {
    employees: Employee[];
    positions: Position[];
    departments: Department[];
    skills: SkillInventoryItem[];
    skillTypes: SkillTypeItem[];
    assessments: SkillAssessment[];
    isLoading: boolean;
}

const LEVEL_KEYS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;

const LEVEL_CELL_COLORS: Record<string, string> = {
    expert: 'bg-purple-500 text-white',
    advanced: 'bg-emerald-500 text-white',
    intermediate: 'bg-blue-500 text-white',
    beginner: 'bg-slate-300 text-slate-700',
};

const DEFAULT_SHORT: Record<string, string> = {
    expert: 'E',
    advanced: 'A',
    intermediate: 'I',
    beginner: 'B',
};

interface LevelDefinition {
    label: string;
    shortLabel: string;
    description: string;
}

type LevelDefinitions = Record<string, LevelDefinition>;

interface SkillGroup {
    typeId: string;
    typeName: string;
    typeColor: string;
    skills: SkillInventoryItem[];
}

export function SkillMatrix({
    employees,
    positions,
    departments,
    skills,
    skillTypes,
    assessments,
    isLoading,
}: SkillMatrixProps) {
    const { firestore } = useFirebase();
    const [filterDepartment, setFilterDepartment] = useState<string>('all');
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const toggleType = useCallback((typeId: string) => {
        setSelectedTypes(prev => {
            const next = new Set(prev);
            if (next.has(typeId)) {
                next.delete(typeId);
            } else {
                next.add(typeId);
            }
            return next;
        });
    }, []);

    const clearTypeFilter = useCallback(() => {
        setSelectedTypes(new Set());
    }, []);

    // Fetch custom level definitions from settings
    const configRef = useMemo(() =>
        firestore ? doc(firestore, 'skill_level_definitions', 'config') : null,
        [firestore]
    );
    const { data: levelConfig } = useDoc<{ levels: LevelDefinitions }>(configRef);

    const typeMap = useMemo(() => buildTypeMap(skillTypes), [skillTypes]);

    // Resolved labels and short labels (custom overrides hardcoded defaults)
    const levelLabels = useMemo(() => {
        const labels: Record<string, string> = { ...SKILL_LEVEL_LABELS };
        if (levelConfig?.levels) {
            for (const key of LEVEL_KEYS) {
                if (levelConfig.levels[key]?.label) {
                    labels[key] = levelConfig.levels[key].label;
                }
            }
        }
        return labels;
    }, [levelConfig]);

    const levelShort = useMemo(() => {
        const shorts: Record<string, string> = { ...DEFAULT_SHORT };
        if (levelConfig?.levels) {
            for (const key of LEVEL_KEYS) {
                if (levelConfig.levels[key]?.shortLabel) {
                    shorts[key] = levelConfig.levels[key].shortLabel;
                }
            }
        }
        return shorts;
    }, [levelConfig]);

    const departmentMap = useMemo(() =>
        new Map(departments.map(d => [d.id, d])),
        [departments]
    );

    // Only positions that have skills defined
    const positionsWithSkills = useMemo(() =>
        positions.filter(p => p.skills && p.skills.length > 0),
        [positions]
    );

    // Filtered positions by department
    const displayPositions = useMemo(() => {
        let result = positionsWithSkills;
        if (filterDepartment !== 'all') {
            result = result.filter(p => p.departmentId === filterDepartment);
        }
        return result;
    }, [positionsWithSkills, filterDepartment]);

    // Collect all unique skill names that appear across displayed positions
    const allPositionSkillNames = useMemo(() => {
        const nameSet = new Set<string>();
        for (const pos of displayPositions) {
            for (const s of pos.skills || []) {
                nameSet.add(s.name);
            }
        }
        return nameSet;
    }, [displayPositions]);

    // Filter skills and group by type
    const skillGroups = useMemo(() => {
        let filtered = skills.filter(s => allPositionSkillNames.has(s.name));
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
        }
        if (selectedTypes.size > 0) {
            filtered = filtered.filter(s => selectedTypes.has(s.type || '__none__'));
        }

        // Group by type
        const groupMap = new Map<string, SkillInventoryItem[]>();
        for (const skill of filtered) {
            const typeId = skill.type || '__none__';
            if (!groupMap.has(typeId)) {
                groupMap.set(typeId, []);
            }
            groupMap.get(typeId)!.push(skill);
        }

        // Build ordered groups: known types first (in skillTypes order), then untyped
        const groups: SkillGroup[] = [];
        for (const st of skillTypes) {
            const items = groupMap.get(st.id);
            if (items && items.length > 0) {
                groups.push({
                    typeId: st.id,
                    typeName: st.name,
                    typeColor: st.color,
                    skills: items,
                });
                groupMap.delete(st.id);
            }
        }
        // Untyped / unknown types
        const untyped = groupMap.get('__none__');
        if (untyped && untyped.length > 0) {
            groups.push({
                typeId: '__none__',
                typeName: 'Төрөлгүй',
                typeColor: 'slate',
                skills: untyped,
            });
        }
        // Any remaining unknown type IDs
        for (const [typeId, items] of groupMap) {
            if (typeId !== '__none__' && items.length > 0) {
                groups.push({
                    typeId,
                    typeName: typeId,
                    typeColor: 'slate',
                    skills: items,
                });
            }
        }

        return groups;
    }, [skills, allPositionSkillNames, searchQuery, selectedTypes, skillTypes]);

    // Flat list of all displayed skills (for table columns)
    const flatDisplaySkills = useMemo(() =>
        skillGroups.flatMap(g => g.skills),
        [skillGroups]
    );

    // Build a quick lookup: positionId -> skillName -> level
    const positionSkillMap = useMemo(() => {
        const map = new Map<string, Map<string, string>>();
        for (const pos of positions) {
            const skillMap = new Map<string, string>();
            for (const s of pos.skills || []) {
                skillMap.set(s.name, s.level);
            }
            map.set(pos.id, skillMap);
        }
        return map;
    }, [positions]);

    // Count filled employees per position
    const positionEmployeeCount = useMemo(() => {
        const countMap = new Map<string, number>();
        for (const emp of employees) {
            if (emp.positionId) {
                countMap.set(emp.positionId, (countMap.get(emp.positionId) || 0) + 1);
            }
        }
        return countMap;
    }, [employees]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-lg font-bold tracking-tight text-slate-800">Ур чадварын матриц</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    Ажлын байр бүрд шаардагдах ур чадварын түвшинг төрлөөр ялган харьцуулж, хөгжлийн хэрэгцээг тодорхойлох боломжтой.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-[220px] h-10 rounded-xl">
                        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Нэгж" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх нэгж</SelectItem>
                        {departments.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'w-[220px] h-10 rounded-xl justify-between font-normal',
                                selectedTypes.size > 0 && 'border-indigo-200 bg-indigo-50/50'
                            )}
                        >
                            <div className="flex items-center gap-2 truncate">
                                <Tags className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                {selectedTypes.size === 0 ? (
                                    <span className="text-muted-foreground">Бүх төрөл</span>
                                ) : (
                                    <span className="text-sm truncate">
                                        {selectedTypes.size} төрөл сонгосон
                                    </span>
                                )}
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[240px] p-2" align="start">
                        <div className="space-y-1 max-h-[260px] overflow-y-auto">
                            {skillTypes.map(t => (
                                <label
                                    key={t.id}
                                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <Checkbox
                                        checked={selectedTypes.has(t.id)}
                                        onCheckedChange={() => toggleType(t.id)}
                                    />
                                    <Badge
                                        variant="outline"
                                        className={cn('text-[10px] px-2 py-0.5 rounded-md font-bold', getTypeColorClasses(t.color))}
                                    >
                                        {t.name}
                                    </Badge>
                                </label>
                            ))}
                            <label
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                <Checkbox
                                    checked={selectedTypes.has('__none__')}
                                    onCheckedChange={() => toggleType('__none__')}
                                />
                                <span className="text-xs text-muted-foreground">Төрөлгүй</span>
                            </label>
                        </div>
                        {selectedTypes.size > 0 && (
                            <div className="border-t mt-2 pt-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-8 text-xs text-muted-foreground"
                                    onClick={clearTypeFilter}
                                >
                                    <X className="h-3 w-3 mr-1" />
                                    Бүгдийг цуцлах
                                </Button>
                            </div>
                        )}
                    </PopoverContent>
                </Popover>
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Ур чадвар хайх..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl"
                    />
                </div>
            </div>

            {/* Active type filter badges */}
            {selectedTypes.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Сонгосон төрөл:</span>
                    {Array.from(selectedTypes).map(typeId => {
                        const st = typeMap.get(typeId);
                        return (
                            <Badge
                                key={typeId}
                                variant="outline"
                                className={cn(
                                    'text-[10px] px-2 py-0.5 rounded-md font-bold cursor-pointer gap-1',
                                    st ? getTypeColorClasses(st.color) : 'bg-slate-100 text-slate-600'
                                )}
                                onClick={() => toggleType(typeId)}
                            >
                                {st?.name || 'Төрөлгүй'}
                                <X className="h-3 w-3" />
                            </Badge>
                        );
                    })}
                    <button
                        className="text-[10px] text-muted-foreground underline hover:text-slate-700 transition-colors"
                        onClick={clearTypeFilter}
                    >
                        Бүгдийг цуцлах
                    </button>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground font-medium">Түвшин:</span>
                {LEVEL_KEYS.map(level => (
                    <div key={level} className="flex items-center gap-1.5">
                        <div className={cn('w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold', LEVEL_CELL_COLORS[level])}>
                            {levelShort[level]}
                        </div>
                        <span className="text-muted-foreground">{levelLabels[level]}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-slate-100 border border-dashed border-slate-300 text-[10px] flex items-center justify-center text-slate-400">
                        -
                    </div>
                    <span className="text-muted-foreground">Шаардлагагүй</span>
                </div>
            </div>

            {displayPositions.length === 0 || flatDisplaySkills.length === 0 ? (
                <EmptyState
                    icon={LayoutGrid}
                    title="Мэдээлэл олдсонгүй"
                    description={positionsWithSkills.length === 0
                        ? "Ур чадварын шаардлага тодорхойлогдсон ажлын байр байхгүй байна."
                        : "Шүүлтүүрийн тохиргоог өөрчилж дахин оролдоно уу."
                    }
                />
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                {/* Type group header row */}
                                {skillGroups.length > 1 && (
                                    <tr className="border-b">
                                        <th className="sticky left-0 bg-white z-10 min-w-[240px]" />
                                        {skillGroups.map(group => (
                                            <th
                                                key={group.typeId}
                                                colSpan={group.skills.length}
                                                className="text-center px-2 py-2 border-l first:border-l-0"
                                            >
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-[10px] px-2.5 py-0.5 rounded-md font-bold',
                                                        getTypeColorClasses(group.typeColor)
                                                    )}
                                                >
                                                    {group.typeName}
                                                </Badge>
                                            </th>
                                        ))}
                                    </tr>
                                )}
                                {/* Skill name header row */}
                                <tr className="border-b bg-slate-50/80">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-700 sticky left-0 bg-slate-50/80 z-10 min-w-[240px]">
                                        Ажлын байр
                                    </th>
                                    {skillGroups.map((group, gi) =>
                                        group.skills.map((skill, si) => (
                                            <th
                                                key={skill.id}
                                                className={cn(
                                                    'text-center px-2 py-3 font-medium text-slate-600 min-w-[80px]',
                                                    si === 0 && gi > 0 && 'border-l'
                                                )}
                                            >
                                                <div className="text-[10px] leading-tight line-clamp-2">{skill.name}</div>
                                            </th>
                                        ))
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {displayPositions.map(pos => {
                                    const dept = departmentMap.get(pos.departmentId);
                                    const posSkills = positionSkillMap.get(pos.id);
                                    const empCount = positionEmployeeCount.get(pos.id) || 0;

                                    return (
                                        <tr key={pos.id} className="border-b hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-2.5 sticky left-0 bg-white z-10">
                                                <div className="space-y-0.5">
                                                    <div className="font-medium text-sm">
                                                        {pos.title}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                                        {dept ? dept.name : ''}
                                                        {empCount > 0 && (
                                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-md font-medium">
                                                                {empCount} ажилтан
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {skillGroups.map((group, gi) =>
                                                group.skills.map((skill, si) => {
                                                    const requiredLevel = posSkills?.get(skill.name);

                                                    return (
                                                        <td
                                                            key={skill.id}
                                                            className={cn(
                                                                'text-center px-2 py-2.5',
                                                                si === 0 && gi > 0 && 'border-l'
                                                            )}
                                                        >
                                                            {requiredLevel ? (
                                                                <div
                                                                    className={cn(
                                                                        'w-7 h-7 rounded mx-auto text-[10px] flex items-center justify-center font-bold transition-all',
                                                                        LEVEL_CELL_COLORS[requiredLevel],
                                                                    )}
                                                                    title={`${levelLabels[requiredLevel] || requiredLevel}`}
                                                                >
                                                                    {levelShort[requiredLevel] || '?'}
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className="w-7 h-7 rounded mx-auto bg-slate-100 border border-dashed border-slate-300 text-[10px] flex items-center justify-center text-slate-400"
                                                                    title="Шаардлагагүй"
                                                                >
                                                                    -
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {flatDisplaySkills.length >= 20 && (
                <p className="text-xs text-muted-foreground text-center">
                    Шүүлтүүр ашиглан нарийвчлаарай.
                </p>
            )}
        </div>
    );
}
