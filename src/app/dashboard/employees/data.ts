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

export const employees: Employee[] = [
  {
    id: 'emp-001',
    name: 'Alice Johnson',
    avatarId: 'avatar-1',
    title: 'Senior Software Engineer',
    department: 'Engineering',
    email: 'alice.j@example.com',
    phone: '123-456-7890',
    hireDate: '2021-08-15',
    skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    jobHistory: [
      { title: 'Software Engineer', company: 'TechCorp', duration: '2019-2021' },
      { title: 'Junior Developer', company: 'DevStart', duration: '2018-2019' },
    ],
  },
  {
    id: 'emp-002',
    name: 'Bob Williams',
    avatarId: 'avatar-2',
    title: 'Marketing Manager',
    department: 'Marketing',
    email: 'bob.w@example.com',
    phone: '234-567-8901',
    hireDate: '2022-01-20',
    skills: ['SEO', 'Content Marketing', 'Google Analytics'],
    jobHistory: [
      { title: 'Marketing Specialist', company: 'AdVenture', duration: '2020-2022' },
    ],
  },
  {
    id: 'emp-003',
    name: 'Charlie Brown',
    avatarId: 'avatar-4',
    title: 'Sales Executive',
    department: 'Sales',
    email: 'charlie.b@example.com',
    phone: '345-678-9012',
    hireDate: '2022-09-01',
    skills: ['Salesforce', 'Negotiation', 'Lead Generation'],
    jobHistory: [
        { title: 'Sales Development Rep', company: 'SellWell', duration: '2020-2022' },
    ],
  },
  {
    id: 'emp-004',
    name: 'Diana Prince',
    avatarId: 'avatar-3',
    title: 'UX/UI Designer',
    department: 'Design',
    email: 'diana.p@example.com',
    phone: '456-789-0123',
    hireDate: '2023-03-10',
    skills: ['Figma', 'Sketch', 'User Research'],
    jobHistory: [
        { title: 'Graphic Designer', company: 'Creative Inc.', duration: '2021-2023' },
    ],
  },
  {
    id: 'emp-005',
    name: 'Ethan Hunt',
    avatarId: 'avatar-6',
    title: 'HR Generalist',
    department: 'HR',
    email: 'ethan.h@example.com',
    phone: '567-890-1234',
    hireDate: '2020-11-05',
    skills: ['Recruiting', 'Employee Relations', 'HRIS'],
    jobHistory: [
        { title: 'HR Coordinator', company: 'PeopleFirst', duration: '2018-2020' },
    ],
  },
];
