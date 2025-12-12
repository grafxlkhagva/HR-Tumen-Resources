export type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  avatarId?: string;
  photoURL?: string;
  jobTitle: string;
  departmentId: string;
  workScheduleId?: string;
  email: string;
  phoneNumber?: string;
  status: 'Идэвхтэй' | 'Жирэмсний амралттай' | 'Хүүхэд асрах чөлөөтэй' | 'Урт хугацааны чөлөөтэй' | 'Ажлаас гарсан';
  hireDate: string;
  terminationDate?: string;
  skills?: string[];
  jobHistory?: { title: string; company: string; duration: string }[];
  deviceId?: string;
};

export const employees: Employee[] = [];
