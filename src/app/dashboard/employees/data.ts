export type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  avatarId?: string;
  jobTitle: string;
  departmentId: string;
  email: string;
  phone?: string;
  hireDate: string;
  skills?: string[];
  jobHistory?: { title: string; company: string; duration: string }[];
};

export const employees: Employee[] = [];
