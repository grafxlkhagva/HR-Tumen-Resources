export type TimeOffRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatarId: string;
  type: 'Vacation' | 'Sick Leave' | 'Personal Day' | 'Parental Leave';
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedDate: string;
};

export const timeOffRequests: TimeOffRequest[] = [
  {
    id: 'to-001',
    employeeId: 'emp-001',
    employeeName: 'Alice Johnson',
    employeeAvatarId: 'avatar-1',
    type: 'Vacation',
    startDate: '2024-08-01',
    endDate: '2024-08-07',
    status: 'Approved',
    requestedDate: '2024-06-15',
  },
  {
    id: 'to-002',
    employeeId: 'emp-002',
    employeeName: 'Bob Williams',
    employeeAvatarId: 'avatar-2',
    type: 'Sick Leave',
    startDate: '2024-07-22',
    endDate: '2024-07-22',
    status: 'Approved',
    requestedDate: '2024-07-22',
  },
  {
    id: 'to-003',
    employeeId: 'emp-003',
    employeeName: 'Charlie Brown',
    employeeAvatarId: 'avatar-4',
    type: 'Personal Day',
    startDate: '2024-07-29',
    endDate: '2024-07-29',
    status: 'Pending',
    requestedDate: '2024-07-10',
  },
  {
    id: 'to-004',
    employeeId: 'emp-004',
    employeeName: 'Diana Prince',
    employeeAvatarId: 'avatar-3',
    type: 'Vacation',
    startDate: '2024-09-02',
    endDate: '2024-09-09',
    status: 'Pending',
    requestedDate: '2024-07-01',
  },
  {
    id: 'to-005',
    employeeId: 'emp-005',
    employeeName: 'Ethan Hunt',
    employeeAvatarId: 'avatar-6',
    type: 'Vacation',
    startDate: '2024-06-20',
    endDate: '2024-06-25',
    status: 'Rejected',
    requestedDate: '2024-06-10',
  },
];
