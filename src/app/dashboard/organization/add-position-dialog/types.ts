import { z } from 'zod';
import { Position as JobPosition } from '../types';
import { ReferenceItem as Reference } from '@/types';

export const positionSchema = z.object({
  title: z.string().min(2, 'Нэр дор хаяж 2 тэмдэгттэй байх ёстой.'),
  code: z.string().optional(),
  departmentId: z.string().optional(),
  reportsTo: z.string().optional(),
  levelId: z.string().optional(),
  employmentTypeId: z.string().optional(),
  workScheduleId: z.string().optional(),
  jobCategoryId: z.string().optional(),
  canApproveAttendance: z.boolean().default(false),
  canApproveVacation: z.boolean().default(false),
  hasPointBudget: z.boolean().default(false),
  yearlyPointBudget: z.number().min(0).default(0),
  purpose: z.string().optional(),
  responsibilities: z.string().optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMid: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  salaryCurrency: z.string().default('MNT'),
  salaryPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
  bonusDescription: z.string().optional(),
  commissionDescription: z.string().optional(),
  equityDescription: z.string().optional(),
  isRemoteAllowed: z.boolean().default(false),
  flexibleHours: z.boolean().default(false),
  vacationDays: z.number().min(0).default(0),
  otherBenefits: z.string().optional(),
});

export type PositionFormValues = z.infer<typeof positionSchema>;

export interface AddPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Reference[];
  allPositions: JobPosition[] | null;
  positionLevels: Reference[];
  employmentTypes: Reference[];
  jobCategories: any[];
  workSchedules: Reference[];
  editingPosition?: JobPosition | null;
  preselectedDepartmentId?: string;
  parentPositionId?: string;
  initialMode?: 'quick' | 'full';
  /** Дуусахад жагсаалт шинэчлэх зэрэгт дуудагдана */
  onSuccess?: () => void;
}
