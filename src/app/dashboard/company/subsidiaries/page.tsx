import { redirect } from 'next/navigation';

export default function LegacyCompanySubRedirect() {
    redirect('/company/subsidiaries');
}
