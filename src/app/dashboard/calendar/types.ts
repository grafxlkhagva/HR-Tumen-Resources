/**
 * Календарын статус
 */
export type CalendarStatus = 'active' | 'inactive' | 'draft';

/**
 * Өдрийн төрлийн ангилал (Day Types)
 */
export type DayType = 
    | 'working'           // Ажлын өдөр
    | 'weekend'           // Амралтын өдөр (Sat/Sun эсвэл custom)
    | 'public_holiday'    // Улсын баяр, амралтын өдөр
    | 'company_holiday'   // Байгууллагын дотоод амралт
    | 'special_working'   // Шилжүүлсэн, нөхөж ажиллах өдөр
    | 'half_day';         // Хагас ажлын өдөр

/**
 * Баярын өдрийн төрөл
 */
export type HolidayType = 'public' | 'company';

/**
 * Үйл явдлын төрөл
 */
export type EventType = 'meeting' | 'deadline' | 'birthday' | 'anniversary' | 'training' | 'other';

/**
 * Өдрийн үйл явдал
 */
export type CalendarEvent = {
    id: string;
    title: string;
    type: EventType;
    description?: string;
    isRecurring?: boolean;           // Жил бүр давтагдах эсэх (төрсөн өдөр гэх мэт)
};

/**
 * Календарын өдрийн тохиргоо
 */
export type CalendarDay = {
    date: string;                    // ISO date string (YYYY-MM-DD)
    dayType: DayType;
    isHoliday?: boolean;
    holidayName?: string;
    holidayType?: HolidayType;
    workingHours?: number;           // Тухайн өдрийн ажлын цаг
    isPaid?: boolean;                // Цалинтай эсэх
    note?: string;                   // Нэмэлт тэмдэглэл
    isRecurring?: boolean;           // Жил бүр давтагдах эсэх
    legalReference?: string;         // Хууль, журамтай холболт
    events?: CalendarEvent[];        // Үйл явдлууд (ажлын өдөрт нөлөөлөхгүй)
};

/**
 * Ажлын цагийн дүрэм (Working Time Rules)
 */
export type WorkingTimeRules = {
    standardWorkingHoursPerDay: number;    // Өдөрт ажиллах цаг (ж. 8h)
    workingHoursPerWeek: number;           // 7 хоногийн норм (ж. 40h)
    breakTimeMinutes: number;              // Амралт, хоолны цаг (минутаар)
    isShiftBased?: boolean;                // Ээлжийн эсэх
    overtimeEligible?: boolean;            // Илүү цаг бодох эсэх
    halfDayHours?: number;                 // Хагас өдрийн цаг (ж. 4h)
};

/**
 * Хамрах хүрээ (Scope & Assignment)
 */
export type CalendarScope = {
    companyId?: string;                    // Байгууллагын ID
    departmentIds?: string[];              // Хэлтэс/нэгжүүд
    locationIds?: string[];                // Байршил
    employeeGroupIds?: string[];           // Ажилтны бүлэг
    contractTypes?: string[];              // Гэрээний төрөл
};

/**
 * Payroll & HR Integration Flags
 */
export type IntegrationFlags = {
    payrollApplicable?: boolean;           // Цалин бодолтод ашиглах эсэх
    leaveDeductionRule?: string;           // Чөлөө хасах логик
    overtimeCalculationRule?: string;      // Илүү цагийн тооцоо
    attendanceTrackingEnabled?: boolean;   // Ирцтэй холбогдох эсэх
};

/**
 * Ажлын календар (Work Calendar)
 * Календарын суурь мэдээлэл (Calendar Master Data)
 */
export type WorkCalendar = {
    id: string;
    name: string;                          // Календарын нэр (ж. Mongolia Work Calendar 2026)
    description?: string;
    year: number;                          // Он
    country?: string;                      // Улс (ж. Mongolia)
    region?: string;                       // Бүс нутаг
    timeZone?: string;                     // Цагийн бүс (ж. Asia/Ulaanbaatar)
    status: CalendarStatus;                // Active / Inactive / Draft
    effectiveDateStart?: string;           // Хүчинтэй эхлэх огноо
    effectiveDateEnd?: string;             // Хүчинтэй дуусах огноо
    isDefault?: boolean;                   // Үндсэн календар эсэх
    
    // Ажлын цагийн дүрэм
    workingTimeRules: WorkingTimeRules;
    
    // Амралтын өдрүүд (0=Ням, 6=Бямба)
    weekendDays: number[];
    
    // Өдрийн тохиргоонууд
    days: { [date: string]: CalendarDay };
    
    // Хамрах хүрээ
    scope?: CalendarScope;
    
    // Integration flags
    integration?: IntegrationFlags;
    
    // Аудит мэдээлэл
    createdAt?: string;
    createdBy?: string;
    createdByName?: string;
    updatedAt?: string;
    updatedBy?: string;
    updatedByName?: string;
    approvedAt?: string;
    approvedBy?: string;
    approvedByName?: string;
    version?: number;
};

/**
 * Сарын статистик
 */
export type MonthlyStats = {
    month: number;                         // 1-12
    monthName: string;
    totalDays: number;
    workingDays: number;
    weekendDays: number;
    publicHolidays: number;
    companyHolidays: number;
    specialWorkingDays: number;
    halfDays: number;
    totalWorkingHours: number;
};

/**
 * Улирлын статистик
 */
export type QuarterlyStats = {
    quarter: number;                       // 1-4
    quarterName: string;
    totalDays: number;
    workingDays: number;
    weekendDays: number;
    publicHolidays: number;
    companyHolidays: number;
    totalWorkingHours: number;
};

/**
 * Календарын нэгтгэл статистик
 */
export type CalendarStats = {
    // Жилийн нэгтгэл
    totalDays: number;
    workingDays: number;
    weekendDays: number;
    publicHolidays: number;
    companyHolidays: number;
    specialWorkingDays: number;
    halfDays: number;
    totalWorkingHours: number;
    
    // Сар тус бүрээр
    monthly: MonthlyStats[];
    
    // Улирал тус бүрээр
    quarterly: QuarterlyStats[];
    
    // Хагас жилээр
    firstHalf: {
        workingDays: number;
        totalWorkingHours: number;
    };
    secondHalf: {
        workingDays: number;
        totalWorkingHours: number;
    };
};

/**
 * Өдрийн төрлийн тохиргоо (харагдах байдал)
 */
export type DayTypeConfig = {
    type: DayType;
    label: string;
    labelEn: string;
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
};

/**
 * Өдрийн төрлийн тохиргоонууд
 */
export const DAY_TYPE_CONFIGS: DayTypeConfig[] = [
    {
        type: 'working',
        label: 'Ажлын өдөр',
        labelEn: 'Working Day',
        color: 'green',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-300',
        borderColor: 'border-green-300 dark:border-green-700',
    },
    {
        type: 'weekend',
        label: 'Амралтын өдөр',
        labelEn: 'Weekend',
        color: 'slate',
        bgColor: 'bg-slate-100 dark:bg-slate-800',
        textColor: 'text-slate-500 dark:text-slate-400',
        borderColor: 'border-slate-300 dark:border-slate-600',
    },
    {
        type: 'public_holiday',
        label: 'Улсын баяр',
        labelEn: 'Public Holiday',
        color: 'red',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        textColor: 'text-red-700 dark:text-red-300',
        borderColor: 'border-red-300 dark:border-red-700',
    },
    {
        type: 'company_holiday',
        label: 'Байгууллагын амралт',
        labelEn: 'Company Holiday',
        color: 'orange',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        textColor: 'text-orange-700 dark:text-orange-300',
        borderColor: 'border-orange-300 dark:border-orange-700',
    },
    {
        type: 'special_working',
        label: 'Нөхөж ажиллах өдөр',
        labelEn: 'Special Working Day',
        color: 'blue',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-700 dark:text-blue-300',
        borderColor: 'border-blue-300 dark:border-blue-700',
    },
    {
        type: 'half_day',
        label: 'Хагас өдөр',
        labelEn: 'Half Day',
        color: 'amber',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        textColor: 'text-amber-700 dark:text-amber-300',
        borderColor: 'border-amber-300 dark:border-amber-700',
    },
];

/**
 * Өдрийн төрлийн тохиргоо авах
 */
export function getDayTypeConfig(type: DayType): DayTypeConfig {
    return DAY_TYPE_CONFIGS.find(c => c.type === type) || DAY_TYPE_CONFIGS[0];
}

/**
 * Үйл явдлын төрлийн тохиргоо
 */
export type EventTypeConfig = {
    type: EventType;
    label: string;
    icon: string;
    color: string;
};

export const EVENT_TYPE_CONFIGS: EventTypeConfig[] = [
    { type: 'meeting', label: 'Уулзалт', icon: '📅', color: 'text-blue-600' },
    { type: 'deadline', label: 'Хугацаа', icon: '⏰', color: 'text-red-600' },
    { type: 'birthday', label: 'Төрсөн өдөр', icon: '🎂', color: 'text-pink-600' },
    { type: 'anniversary', label: 'Ой тэмдэглэл', icon: '🎉', color: 'text-purple-600' },
    { type: 'training', label: 'Сургалт', icon: '📚', color: 'text-green-600' },
    { type: 'other', label: 'Бусад', icon: '📌', color: 'text-gray-600' },
];

export function getEventTypeConfig(type: EventType): EventTypeConfig {
    return EVENT_TYPE_CONFIGS.find(c => c.type === type) || EVENT_TYPE_CONFIGS[EVENT_TYPE_CONFIGS.length - 1];
}

/**
 * Улсын баярын өдөр
 */
export type PublicHoliday = {
    id: string;
    name: string;
    date?: string;
    isRecurring?: boolean;
    month?: number;
    day?: number;
    isPaid?: boolean;
    legalReference?: string;
};

/**
 * Статистик харах хугацааны төрөл
 */
export type StatsPeriodType = 'yearly' | 'quarterly' | 'monthly' | 'half_yearly';

/**
 * Статистикийн харагдах байдлын тохиргоо
 */
export type StatsViewConfig = {
    period: StatsPeriodType;
    label: string;
};

export const STATS_VIEW_CONFIGS: StatsViewConfig[] = [
    { period: 'yearly', label: 'Жилээр' },
    { period: 'half_yearly', label: 'Хагас жилээр' },
    { period: 'quarterly', label: 'Улирлаар' },
    { period: 'monthly', label: 'Сараар' },
];
