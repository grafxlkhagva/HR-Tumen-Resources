'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { OrganizationFilters } from '@/hooks/use-organization-filters';
import { Department, PositionLevel, EmploymentType } from '@/app/dashboard/organization/types';

interface SearchFilterBarProps {
    filters: OrganizationFilters;
    onFiltersChange: (filters: Partial<OrganizationFilters>) => void;
    onClearFilters: () => void;
    hasActiveFilters: boolean;
    activeFilterCount: number;
    departments?: Department[];
    levels?: PositionLevel[];
    employmentTypes?: EmploymentType[];
}

export function SearchFilterBar({
    filters,
    onFiltersChange,
    onClearFilters,
    hasActiveFilters,
    activeFilterCount,
    departments = [],
    levels = [],
    employmentTypes = [],
}: SearchFilterBarProps) {
    const [searchValue, setSearchValue] = React.useState(filters.search);

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            onFiltersChange({ search: searchValue });
        }, 500);
        return () => clearTimeout(timer);
    }, [searchValue, onFiltersChange]);

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Хайх: нэгж, албан тушаал, ажилтан..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="pl-9 pr-9"
                    />
                    {searchValue && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setSearchValue('')}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {hasActiveFilters && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearFilters}
                        className="gap-2"
                    >
                        <X className="h-3.5 w-3.5" />
                        Цэвэрлэх ({activeFilterCount})
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">Шүүлт:</span>

                {/* Department Filter */}
                <Select
                    value={filters.departments[0] || 'all'}
                    onValueChange={(value) => {
                        onFiltersChange({
                            departments: value === 'all' ? [] : [value],
                        });
                    }}
                >
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Нэгж" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх нэгж</SelectItem>
                        {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Level Filter */}
                <Select
                    value={filters.levels[0] || 'all'}
                    onValueChange={(value) => {
                        onFiltersChange({
                            levels: value === 'all' ? [] : [value],
                        });
                    }}
                >
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Зэрэглэл" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх зэрэглэл</SelectItem>
                        {levels.map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                                {level.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Employment Type Filter */}
                <Select
                    value={filters.employmentTypes[0] || 'all'}
                    onValueChange={(value) => {
                        onFiltersChange({
                            employmentTypes: value === 'all' ? [] : [value],
                        });
                    }}
                >
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Ажил эрхлэлт" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх төрөл</SelectItem>
                        {employmentTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                                {type.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select
                    value={filters.statuses.join(',')}
                    onValueChange={(value) => {
                        const statuses = value === 'all'
                            ? ['active', 'inactive'] as ('active' | 'inactive')[]
                            : [value as 'active' | 'inactive'];
                        onFiltersChange({ statuses });
                    }}
                >
                    <SelectTrigger className="w-[150px] h-9">
                        <SelectValue placeholder="Төлөв" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Бүх төлөв</SelectItem>
                        <SelectItem value="active">Идэвхтэй</SelectItem>
                        <SelectItem value="inactive">Идэвхгүй</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Active Filter Badges */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Идэвхтэй шүүлт:</span>
                    {filters.search && (
                        <Badge variant="secondary" className="gap-1">
                            Хайлт: "{filters.search}"
                            <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => onFiltersChange({ search: '' })}
                            />
                        </Badge>
                    )}
                    {filters.departments.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                            Нэгж: {departments.find(d => d.id === filters.departments[0])?.name}
                            <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => onFiltersChange({ departments: [] })}
                            />
                        </Badge>
                    )}
                    {filters.levels.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                            Зэрэглэл: {levels.find(l => l.id === filters.levels[0])?.name}
                            <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => onFiltersChange({ levels: [] })}
                            />
                        </Badge>
                    )}
                    {filters.employmentTypes.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                            Төрөл: {employmentTypes.find(t => t.id === filters.employmentTypes[0])?.name}
                            <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => onFiltersChange({ employmentTypes: [] })}
                            />
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}
