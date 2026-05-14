import { redirect } from 'next/navigation';

export default function LegacyPostAddRedirect() {
    redirect('/news/add');
}
