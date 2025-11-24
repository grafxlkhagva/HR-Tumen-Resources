export type Employee = {
  id: string;
  name: string;
  avatarId: string;
  title: string;
  department: 'Engineering' | 'Marketing' | 'Sales' | 'Design' | 'HR';
  email: string;
  phone: string;
  hireDate: string;
  skills: string[];
  jobHistory: { title: string; company: string; duration: string }[];
};

export const employees: Employee[] = [];
