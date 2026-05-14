import type { Position } from '@/app/dashboard/organization/types';

/**
 * Ажлын байрны "Бүрэн гүйцэтгэл" оноо (0-100).
 * Single approve товч ба bulk approval validator хоёр энэ helper-ыг хуваалцан ашиглана.
 *
 * Score-ын задаргаа:
 *   - Title + Department: 20 (хоёулаа), эсвэл 10 (зөвхөн нэг)
 *   - Level / Category / EmploymentType: тус бүр 10
 *   - Purpose / Responsibilities>0: тус бүр 15
 *   - Compensation salary mid > 0: 10
 *   - Хамгийн их = 90 → 100 руу re-scale
 */
export function calculatePositionCompletion(position: Pick<Position,
    | 'title'
    | 'departmentId'
    | 'levelId'
    | 'jobCategoryId'
    | 'employmentTypeId'
    | 'purpose'
    | 'responsibilities'
    | 'compensation'
>): number {
    let score = 0;

    if (position.title && position.departmentId) score += 20;
    else if (position.title || position.departmentId) score += 10;

    if (position.levelId) score += 10;
    if (position.jobCategoryId) score += 10;
    if (position.employmentTypeId) score += 10;

    if (position.purpose) score += 15;
    if (position.responsibilities && position.responsibilities.length > 0) score += 15;

    if (position.compensation?.salaryRange?.mid && position.compensation.salaryRange.mid > 0) score += 10;

    return Math.min(100, Math.round((score / 90) * 100));
}
