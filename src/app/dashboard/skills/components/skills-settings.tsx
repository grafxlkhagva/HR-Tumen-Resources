// src/app/dashboard/skills/components/skills-settings.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReferenceTable } from '@/components/ui/reference-table';
import {
    SkillTypeItem,
    TYPE_COLOR_OPTIONS,
    getTypeColorClasses,
} from '../types';
import { SkillLevels } from './skill-levels';

interface SkillsSettingsProps {
    skillTypes: SkillTypeItem[];
    isLoading: boolean;
}

export function SkillsSettings({ skillTypes, isLoading }: SkillsSettingsProps) {
    return (
        <div className="space-y-8">
            {/* Skill Types */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Ур чадварын төрөл</CardTitle>
                    <CardDescription>
                        Ур чадваруудыг бүлэглэх төрлүүдийг удирдах. Шинэ төрөл нэмэх, засах, устгах боломжтой.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ReferenceTable
                        collectionName="skill_types"
                        columns={[
                            {
                                key: 'name',
                                header: 'Төрлийн нэр',
                                forceFormInput: true,
                            },
                            {
                                key: 'color',
                                header: 'Өнгө',
                                forceFormInput: true,
                                render: (val: string) => {
                                    if (!val) {
                                        return <span className="text-xs text-muted-foreground">-</span>;
                                    }
                                    const option = TYPE_COLOR_OPTIONS.find(c => c.key === val);
                                    return (
                                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${getTypeColorClasses(val)}`}>
                                            {option?.label || val}
                                        </Badge>
                                    );
                                },
                            },
                            {
                                key: 'description',
                                header: 'Тайлбар',
                                forceFormInput: true,
                            },
                        ]}
                        itemData={skillTypes}
                        isLoading={isLoading}
                        dialogTitle="Ур чадварын төрөл"
                    />
                </CardContent>
            </Card>

            {/* Skill Levels */}
            <SkillLevels />
        </div>
    );
}
