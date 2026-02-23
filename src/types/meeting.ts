export interface MeetingRoom {
    id: string;
    name: string;
    capacity: number;
    floor?: string;
    amenities?: string[];
    color: string;
    isActive: boolean;
    createdAt: string;
}

export interface RoomBooking {
    id: string;
    roomId: string;
    roomName: string;
    title: string;
    description?: string;
    date: string;           // "2026-02-16"
    startTime: string;      // "09:00"
    endTime: string;        // "10:30"
    organizer: string;      // employeeId
    organizerName: string;
    attendees?: string[];
    status: 'active' | 'cancelled';
    createdAt: string;
}

export const ROOM_COLORS = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f43f5e', // rose
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
] as const;

export const DEFAULT_AMENITIES = [
    'Проектор',
    'Цагаан самбар',
    'Видео дуудлага',
    'ТВ дэлгэц',
    'Утасны шугам',
    'Wi-Fi',
] as const;

export const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
        if (h === 20 && m > 0) break;
        TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
}
