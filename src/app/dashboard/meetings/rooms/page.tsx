import { redirect } from 'next/navigation';

export default function LegacyMeetingsRoomsRedirect() {
    redirect('/meetings/rooms');
}
