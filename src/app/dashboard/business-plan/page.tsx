import { redirect } from 'next/navigation';

/**
 * Хуучин URL шилжсэн: /dashboard/business-plan → /business-plan
 * Bookmark, имэйл линк, бичиг баримтын линкийг хадгалах зорилгоор redirect.
 */
export default function LegacyBusinessPlanRedirect() {
    redirect('/business-plan');
}
