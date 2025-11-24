export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  avatarId?: string;
  jobTitle: string;
  department: 'Engineering' | 'Marketing' | 'Sales' | 'Design' | 'HR' | 'Тодорхойгүй';
  email: string;
  phone?: string;
  hireDate: string;
  skills?: string[];
  jobHistory?: { title: string; company: string; duration: string }[];
};

export const employees: Employee[] = [];
