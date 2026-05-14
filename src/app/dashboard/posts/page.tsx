import { redirect } from 'next/navigation';

export default function LegacyPostsRedirect() {
    redirect('/news');
}
