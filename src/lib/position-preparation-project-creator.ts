'use client';

import { Firestore, collection, doc, Timestamp, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { addDays, format } from 'date-fns';
import { tenantCollection } from '@/firebase/tenant-helpers';

export interface PositionPreparationTask {
  id: string;
  title: string;
  description?: string;
  policyId?: string;
}

export interface PositionPreparationStage {
  id: string;
  title: string;
  description: string;
  icon?: string;
  tasks: PositionPreparationTask[];
}

export interface PositionPreparationTaskPlanEntry {
  templateTaskId: string;
  dueDate: string; // YYYY-MM-DD
  ownerId: string; // responsible employee id
}

export interface PositionPreparationStageTaskPlan {
  stageId: string;
  tasks: PositionPreparationTaskPlanEntry[];
}

const DEFAULT_STAGE_DUE_DATE_OFFSETS: Record<string, number> = {
  workspace: 7,
  access: 10,
  materials: 14,
  ready: 21,
};

export interface CreatePositionPreparationProjectsParams {
  firestore: Firestore;
  /** Tenant root path — `companies/{companyId}` (SaaS олон tenant санд заавал). */
  companyPath: string | null;
  positionId: string;
  positionTitle: string;
  initiatorId: string;
  prepConfig: PositionPreparationStage[];
  startDate: string; // YYYY-MM-DD
  taskPlan?: PositionPreparationStageTaskPlan[];
}

export interface PositionPreparationProjectResult {
  positionPreparationGroupId: string;
  projectIds: string[];
  taskCount: number;
}

export async function createPositionPreparationProjects(
  params: CreatePositionPreparationProjectsParams
): Promise<PositionPreparationProjectResult> {
  const {
    firestore,
    companyPath,
    positionId,
    positionTitle,
    initiatorId,
    prepConfig,
    startDate,
    taskPlan,
  } = params;

  const taskPlanByStageId: Record<string, Record<string, PositionPreparationTaskPlanEntry>> = {};
  if (taskPlan && taskPlan.length > 0) {
    for (const stagePlan of taskPlan) {
      const map: Record<string, PositionPreparationTaskPlanEntry> = {};
      for (const t of stagePlan.tasks || []) {
        if (!t?.templateTaskId) continue;
        map[t.templateTaskId] = t;
      }
      taskPlanByStageId[stagePlan.stageId] = map;
    }
  }

  const positionPreparationGroupId = `prep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Timestamp.now();
  const hasExplicitTaskPlan = !!(taskPlan && taskPlan.length > 0);

  const stageCandidates = prepConfig.map((stage) => {
    let filteredTasks = stage.tasks || [];

    const planMap = taskPlanByStageId[stage.id];
    if (planMap && Object.keys(planMap).length > 0) {
      filteredTasks = filteredTasks.filter((task) => !!planMap[task.id]);
    } else if (hasExplicitTaskPlan) {
      filteredTasks = [];
    }

    return { ...stage, tasks: filteredTasks };
  });

  const stagesToCreate = hasExplicitTaskPlan
    ? stageCandidates
    : stageCandidates.filter((s) => (s.tasks || []).length > 0);

  const batch = writeBatch(firestore);
  let writeCount = 0;
  const projectIds: string[] = [];
  let totalTaskCount = 0;

  // Single project (no stage split) – tasks from all stages go under one project
  // Project end date = max dueDate among selected tasks; fallback to max offset.
  const allPlannedDueDates: string[] = [];
  const teamMemberSet = new Set<string>([initiatorId].filter(Boolean));

  for (const stage of stagesToCreate) {
    const stagePlanMap = taskPlanByStageId[stage.id];
    if (stagePlanMap) {
      Object.values(stagePlanMap).forEach((p) => {
        if (p?.dueDate) allPlannedDueDates.push(p.dueDate);
        if (p?.ownerId) teamMemberSet.add(p.ownerId);
      });
    }
  }

  let projectEndDate: string | null = null;
  if (allPlannedDueDates.length > 0) {
    projectEndDate = allPlannedDueDates.reduce((max, cur) => {
      const maxD = new Date(max);
      const curD = new Date(cur);
      return curD > maxD ? cur : max;
    }, allPlannedDueDates[0]);
  }
  if (!projectEndDate) {
    const maxOffset = Math.max(...Object.values(DEFAULT_STAGE_DUE_DATE_OFFSETS));
    projectEndDate = format(addDays(new Date(startDate), maxOffset || 21), 'yyyy-MM-dd');
  }

  const teamMemberIds = Array.from(teamMemberSet);

  // Tenant-scoped path: companies/{id}/projects. Top-level `projects` collection
  // нь security rules-д хаалттай учир энд tenantCollection-оор дамжуулна.
  const projectRef = doc(tenantCollection(firestore, companyPath, 'projects'));
  const projectId = projectRef.id;
  projectIds.push(projectId);

  const projectData = {
    id: projectId,
    name: `${positionTitle} - Ажлын байр бэлтгэх`,
    goal: 'Ажилтныг томилохоос өмнө ажлын байрны бэлтгэлийг хангах',
    expectedOutcome: 'Бэлтгэл ажлууд бүрэн хийгдсэн байх',
    startDate,
    endDate: projectEndDate,
    ownerId: initiatorId,
    teamMemberIds,
    status: 'ACTIVE',
    priority: 'MEDIUM',
    createdAt: now,
    updatedAt: now,
    createdBy: initiatorId,
    type: 'position_preparation' as const,
    positionPreparationGroupId,
    positionPreparationPositionId: positionId,
    stageOrder: 1,
  };

  batch.set(projectRef, projectData);
  writeCount++;

  for (const stage of stagesToCreate) {
    const stagePlanMap = taskPlanByStageId[stage.id];
    for (const task of stage.tasks || []) {
      // tasks subcollection нь projectRef-ээс шууд үүсгэнэ — tenant-scoped замтай.
      const taskRef = doc(collection(projectRef, 'tasks'));
      const taskId = taskRef.id;
      const plan = stagePlanMap?.[task.id];

      const taskDueDate = plan?.dueDate || projectEndDate;
      const ownerId = plan?.ownerId || undefined;
      const assignees = new Set<string>();
      if (ownerId) assignees.add(ownerId);

      const taskData = {
        id: taskId,
        projectId,
        title: `${stage.title}: ${task.title}`,
        dueDate: taskDueDate,
        assigneeIds: Array.from(assignees),
        status: 'TODO' as const,
        priority: 'MEDIUM' as const,
        createdAt: now,
        updatedAt: now,
        ...(ownerId ? { ownerId } : {}),
        ...(task.policyId ? { policyId: task.policyId } : {}),
      };

      batch.set(taskRef, taskData);
      writeCount++;
      totalTaskCount++;
    }
  }

  if (writeCount > 450) {
    throw new Error(`Бэлтгэл төсөл үүсгэх write тоо хэт их байна: ${writeCount}. (Firestore batch лимит 500)`);
  }

  await batch.commit();

  return {
    positionPreparationGroupId,
    projectIds,
    taskCount: totalTaskCount,
  };
}

/**
 * Release flow-д дуудагдана — ажилтан чөлөөлөгдөж ажлын байр сул болоход
 * өмнөх бэлтгэл төслүүд + таск subcollection-ийг устгана. Ингэснээр шинэ
 * ажилтан томилохоос өмнө бэлтгэлийг ДАХИН хийж буюу UI дээр "Ажлын байр
 * бэлтгэх" товч автоматаар буцаж гарна (prepProjects.length === 0).
 */
export async function deletePositionPreparationProjects(params: {
  firestore: Firestore;
  companyPath: string | null;
  positionId: string;
}): Promise<{ deletedProjects: number; deletedTasks: number }> {
  const { firestore, companyPath, positionId } = params;

  const projectsQuery = query(
    tenantCollection(firestore, companyPath, 'projects'),
    where('type', '==', 'position_preparation'),
    where('positionPreparationPositionId', '==', positionId),
  );
  const projectsSnap = await getDocs(projectsQuery);
  if (projectsSnap.empty) return { deletedProjects: 0, deletedTasks: 0 };

  let deletedProjects = 0;
  let deletedTasks = 0;

  // Per-project batch → Firestore 500-write batch лимитээс хамгаална.
  for (const projectDoc of projectsSnap.docs) {
    const tasksSnap = await getDocs(collection(projectDoc.ref, 'tasks'));
    const batch = writeBatch(firestore);
    tasksSnap.forEach((t) => {
      batch.delete(t.ref);
      deletedTasks++;
    });
    batch.delete(projectDoc.ref);
    await batch.commit();
    deletedProjects++;
  }

  return { deletedProjects, deletedTasks };
}

