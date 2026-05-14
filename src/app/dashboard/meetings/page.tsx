import { redirect } from 'next/navigation';

export default function LegacyMeetingsRedirect() {
    redirect('/meetings');
}
