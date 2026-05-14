import {
  UserCircle2,
  ClipboardCheck,
  Rocket,
  FileText,
  FolderOpen,
  TreePalm,
  Clock,
  GraduationCap,
  TrendingUp,
  LogOut,
  Activity,
  Sparkles,
  Settings,
  Zap,
} from 'lucide-react';
import { type DetailTab } from '@/components/patterns/detail-sidebar-layout';
import {
  getEmployeeStatusDisplay,
  type EmployeeStatusDisplay,
} from '@/lib/employee-status-display';

// ─── Local types ────────────────────────────────────────────────────────────────

export type Department = {
  id: string;
  name: string;
};

export type Position = {
  id: string;
  workScheduleId?: string;
};

export type WorkSchedule = {
  id: string;
  name: string;
};

export type EmploymentHistoryEvent = {
  id: string;
  eventType: string;
  eventDate: string;
  notes?: string;
  documentUrl?: string;
  documentName?: string;
  documentId?: string;
};

export type CompanyPolicy = {
  id: string;
  title: string;
  documentUrl: string;
  uploadDate: string;
  appliesToAll: boolean;
  applicablePositionIds: string[];
};

// ─── Status config ──────────────────────────────────────────────────────────────
//
// NOTE: Энэхүү statusConfig нь зөвхөн backward-compat shim. Шинэ кодод
// `getEmployeeStatusDisplay()` функцыг шууд ашиглана уу
// (src/lib/employee-status-display.ts).

type LegacyStatusEntry = Pick<EmployeeStatusDisplay, 'className' | 'label'> & {
  variant: EmployeeStatusDisplay['badgeVariant'];
};

export const statusConfig: { [key: string]: LegacyStatusEntry } = new Proxy(
  {},
  {
    get(_target, key: string) {
      const display = getEmployeeStatusDisplay(key);
      return {
        variant: display.badgeVariant,
        className: display.className,
        label: display.label,
      } satisfies LegacyStatusEntry;
    },
  },
) as { [key: string]: LegacyStatusEntry };

// ─── Radial action ──────────────────────────────────────────────────────────────

export interface RadialAction {
  key: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string;
}

// ─── Tabs ───────────────────────────────────────────────────────────────────────

export const BASE_TABS: DetailTab[] = [
  { value: 'profile', Icon: UserCircle2, label: 'Профайл', hex: '#6366F1' },
  { value: 'questionnaire', Icon: ClipboardCheck, label: 'Анкет', hex: '#F97316' },
  { value: 'onboarding', Icon: Rocket, label: 'Onboarding', hex: '#F59E0B' },
  { value: 'documents', Icon: FolderOpen, label: 'Бичиг баримт', hex: '#3B82F6' },
  { value: 'history', Icon: FileText, label: 'Хөдөлмөрийн харилцаа', hex: '#6366F1' },
  { value: 'vacation', Icon: TreePalm, label: 'Амралт', hex: '#F43F5E' },
  { value: 'skills', Icon: Zap, label: 'Ур чадвар', hex: '#EAB308' },
  { value: 'time-off', Icon: Clock, label: 'Цаг бүртгэл', hex: '#8B5CF6' },
  { value: 'training', Icon: GraduationCap, label: 'Сургалт хөгжил', hex: '#6366F1' },
  { value: 'performance', Icon: TrendingUp, label: 'Гүйцэтгэл', hex: '#F59E0B' },
  { value: 'offboarding', Icon: LogOut, label: 'Offboarding', hex: '#F97316' },
  { value: 'lifecycle', Icon: Activity, label: 'Life Cycle', hex: '#14B8A6' },
  { value: 'ai-insight', Icon: Sparkles, label: 'AI дүгнэлт', hex: '#EC4899' },
  { value: 'system-settings', Icon: Settings, label: 'Тохиргоо', hex: '#0EA5E9' },
];
