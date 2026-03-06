import { useState, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface OrganizationFilters {
    search: string;
    departments: string[];
    levels: string[];
    employmentTypes: string[];
    statuses: ('active' | 'inactive')[];
}

const defaultFilters: OrganizationFilters = {
    search: '',
    departments: [],
    levels: [],
    employmentTypes: [],
    statuses: ['active'],
};

export function useOrganizationFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize filters from URL params
    const [filters, setFilters] = useState<OrganizationFilters>(() => {
        const search = searchParams.get('search') || '';
        const departments = searchParams.get('departments')?.split(',').filter(Boolean) || [];
        const levels = searchParams.get('levels')?.split(',').filter(Boolean) || [];
        const employmentTypes = searchParams.get('employmentTypes')?.split(',').filter(Boolean) || [];
        const statuses = (searchParams.get('statuses')?.split(',').filter(Boolean) as ('active' | 'inactive')[]) || ['active'];

        return { search, departments, levels, employmentTypes, statuses };
    });

    // Update URL params when filters change
    const updateFilters = (newFilters: Partial<OrganizationFilters>) => {
        const updated = { ...filters, ...newFilters };
        setFilters(updated);

        // Build URL params
        const params = new URLSearchParams();
        if (updated.search) params.set('search', updated.search);
        if (updated.departments.length) params.set('departments', updated.departments.join(','));
        if (updated.levels.length) params.set('levels', updated.levels.join(','));
        if (updated.employmentTypes.length) params.set('employmentTypes', updated.employmentTypes.join(','));
        if (updated.statuses.length && updated.statuses.join(',') !== 'active') {
            params.set('statuses', updated.statuses.join(','));
        }

        const queryString = params.toString();
        router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
    };

    const clearFilters = () => {
        setFilters(defaultFilters);
        router.replace(pathname, { scroll: false });
    };

    const hasActiveFilters = useMemo(() => {
        return (
            filters.search !== '' ||
            filters.departments.length > 0 ||
            filters.levels.length > 0 ||
            filters.employmentTypes.length > 0 ||
            (filters.statuses.length !== 1 || filters.statuses[0] !== 'active')
        );
    }, [filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.search) count++;
        if (filters.departments.length) count++;
        if (filters.levels.length) count++;
        if (filters.employmentTypes.length) count++;
        if (filters.statuses.length !== 1 || filters.statuses[0] !== 'active') count++;
        return count;
    }, [filters]);

    return {
        filters,
        updateFilters,
        clearFilters,
        hasActiveFilters,
        activeFilterCount,
    };
}
