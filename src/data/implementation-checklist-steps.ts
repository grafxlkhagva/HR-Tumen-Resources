/**
 * Системийн нэвтрүүлэлтийн дараалал — implementation_sequence.md-ийн "Хаана оруулах"-тай нийцүүлсэн.
 * Чеклист UI болон AI зөвлөгөөний контекстэд ашиглана.
 */
export interface ImplementationStep {
  id: string;
  order: number;
  label: string;
  href: string;
  phase?: string;
}

export const IMPLEMENTATION_CHECKLIST_STEPS: ImplementationStep[] = [
  { id: 'company-info', order: 1, label: 'Байгууллагын мэдээлэл', href: '/dashboard/company', phase: 'Суурь тохиргоо' },
  { id: 'company-values', order: 2, label: 'Үнэт зүйлс', href: '/dashboard/company/branding', phase: 'Суурь тохиргоо' },
  { id: 'work-schedules', order: 3, label: 'Ажлын цагийн хуваарь', href: '/dashboard/settings/time-off', phase: 'Суурь тохиргоо' },
  { id: 'holidays', order: 4, label: 'Амралтын өдрүүд', href: '/dashboard/settings/time-off', phase: 'Суурь тохиргоо' },
  { id: 'departments', order: 5, label: 'Хэлтэс/Нэгжүүд', href: '/dashboard/organization', phase: 'Байгууллагын бүтэц' },
  { id: 'position-levels', order: 6, label: 'Ажлын байрны зэрэглэл', href: '/dashboard/organization/settings', phase: 'Байгууллагын бүтэц' },
  { id: 'employment-types', order: 7, label: 'Ажил эрхлэлтийн төрөл', href: '/dashboard/organization/settings', phase: 'Байгууллагын бүтэц' },
  { id: 'job-categories', order: 8, label: 'Ажлын ангилал', href: '/dashboard/organization/settings', phase: 'Байгууллагын бүтэц' },
  { id: 'positions', order: 9, label: 'Ажлын байр', href: '/dashboard/organization', phase: 'Байгууллагын бүтэц' },
  { id: 'employees', order: 10, label: 'Ажилтнуудын мэдээлэл', href: '/dashboard/employees', phase: 'Ажилтнууд' },
  { id: 'employees-link-positions', order: 11, label: 'Ажилтнуудыг ажлын байртай холбох', href: '/dashboard/organization', phase: 'Ажилтнууд' },
  { id: 'employee-code', order: 12, label: 'Ажилтны кодны тохиргоо', href: '/dashboard/settings/employee-code', phase: 'Тохиргоо ба бодлого' },
  { id: 'company-policies', order: 13, label: 'Байгууллагын бодлого', href: '/dashboard/company/policies', phase: 'Тохиргоо ба бодлого' },
  { id: 'vacation-settings', order: 14, label: 'Амралтын тохиргоо', href: '/dashboard/settings/time-off', phase: 'Тохиргоо ба бодлого' },
  { id: 'attendance-settings', order: 15, label: 'Ирц хянах тохиргоо', href: '/dashboard/settings/attendance', phase: 'Нэмэлт модулууд' },
  { id: 'points-settings', order: 16, label: 'Онооны системийн тохиргоо', href: '/dashboard/points', phase: 'Нэмэлт модулууд' },
  { id: 'recruitment-settings', order: 17, label: 'Ажилд авах тохиргоо', href: '/dashboard/recruitment', phase: 'Нэмэлт модулууд' },
  { id: 'onboarding-offboarding', order: 18, label: 'Нэвтрүүлэх/Гарах программууд', href: '/dashboard/onboarding/settings', phase: 'Нэмэлт модулууд' },
  { id: 'employee-documents', order: 19, label: 'Ажилтны баримт бичиг', href: '/dashboard/employee-documents/settings', phase: 'Нэмэлт модулууд' },
  { id: 'employment-relations', order: 20, label: 'Ажил харилцааны модуль', href: '/dashboard/employment-relations/settings', phase: 'Нэмэлт модулууд' },
];

export const IMPLEMENTATION_STEPS_CONTEXT = IMPLEMENTATION_CHECKLIST_STEPS.map(
  (s) => `• ${s.order}. ${s.label} → ${s.href}`
).join('\n');
