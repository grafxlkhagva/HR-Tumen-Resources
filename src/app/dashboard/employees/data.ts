export type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  avatarId?: string;
  photoURL?: string;
  jobTitle: string;
  departmentId: string;
  positionId?: string;
  email: string;
  phoneNumber?: string;
  status: 'Идэвхтэй' | 'Жирэмсний амралттай' | 'Хүүхэд асрах чөлөөтэй' | 'Урт хугацааны чөлөөтэй' | 'Ажлаас гарсан' | 'Түр түдгэлзүүлсэн';
  hireDate: string;
  terminationDate?: string;
  skills?: string[];
  jobHistory?: { title: string; company: string; duration: string }[];
  deviceId?: string;
  questionnaireCompletion?: number;
  // Vacation Module
  vacationConfig?: {
    baseDays: number;
  };
  /** Нэвтрэх эрх идэвхгүй бол энэ талбар true. */
  loginDisabled?: boolean;
  role?: 'admin' | 'employee';
};

export const employees: Employee[] = [];
