import { differenceInMinutes } from 'date-fns';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in meters
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in metres
}

/**
 * Calculate duration between two times
 * @returns formatted string like "8ц 30м" or "-" if no end time
 */
export function calculateDuration(checkInTime: string, checkOutTime?: string): string {
    if (!checkOutTime) return '-';
    const durationMinutes = differenceInMinutes(new Date(checkOutTime), new Date(checkInTime));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return `${hours}ц ${minutes}м`;
}

/**
 * Format work time in hours and minutes
 * @param minutes - total minutes
 * @returns formatted string like "8ц 30м"
 */
export function formatWorkTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}м`;
    if (mins === 0) return `${hours}ц`;
    return `${hours}ц ${mins}м`;
}

/**
 * Get or create device ID for attendance verification
 * @returns device ID string
 */
export function getDeviceId(): string {
    if (typeof window === 'undefined') return '';
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

/**
 * Check if current position is within any of the attendance locations
 * @returns { isWithin, matchedLocation, closestDistance }
 */
export function checkLocationWithinRange(
    latitude: number,
    longitude: number,
    locations: { latitude: number; longitude: number; radius: number; name: string }[]
): { isWithin: boolean; matchedLocationName: string; closestDistance: number } {
    let isWithin = false;
    let closestDistance = Infinity;
    let matchedLocationName = '';

    locations.forEach(loc => {
        const dist = getDistance(latitude, longitude, loc.latitude, loc.longitude);
        if (dist <= loc.radius) {
            isWithin = true;
            matchedLocationName = loc.name;
        }
        if (dist < closestDistance) {
            closestDistance = dist;
        }
    });

    return { isWithin, matchedLocationName, closestDistance };
}

/**
 * Get current geolocation position
 * @returns Promise with GeolocationPosition
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

/**
 * Trigger haptic feedback if available
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
        navigator.vibrate(duration);
    }
}

/**
 * Calculate monthly attendance statistics
 */
export function calculateMonthlyStats(
    records: { checkInTime: string; checkOutTime?: string; status: string }[]
): { 
    presentDays: number; 
    totalHours: number; 
    lateDays: number; 
    earlyDepartures: number;
    totalBreakMinutes: number;
} {
    let presentDays = 0;
    let totalMinutes = 0;
    let lateDays = 0;
    let earlyDepartures = 0;
    const totalBreakMinutes = 0;

    records.forEach(rec => {
        presentDays++;
        if (rec.checkInTime && rec.checkOutTime) {
            totalMinutes += differenceInMinutes(new Date(rec.checkOutTime), new Date(rec.checkInTime));
        }
        if (rec.status === 'LATE') lateDays++;
        if (rec.status === 'EARLY_DEPARTURE') earlyDepartures++;
    });

    return {
        presentDays,
        totalHours: Math.floor(totalMinutes / 60),
        lateDays,
        earlyDepartures,
        totalBreakMinutes
    };
}
