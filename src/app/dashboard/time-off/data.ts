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

export const timeOffRequests: TimeOffRequest[] = [];
