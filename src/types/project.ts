// src/types/project.ts
// Project-based Task Management Module Types

import { Timestamp } from 'firebase/firestore';

// Project Status
export type ProjectStatus =
  | 'DRAFT'       // Ноорог - төлөвлөгдөж байгаа
  | 'ACTIVE'      // Идэвхтэй - хэрэгжиж байгаа
  | 'ON_HOLD'     // Түр зогссон
  | 'COMPLETED'   // Дууссан
  | 'ARCHIVED';   // Архивласан - түүхэн зорилгоор хадгалсан

// Task Status
export type TaskStatus =
  | 'TODO'          // Хийх
  | 'IN_PROGRESS'   // Гүйцэтгэж байна
  | 'DONE';         // Дууссан

// Priority levels (shared between Project and Task)
export type Priority = 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH' 
  | 'URGENT';

// Project interface
export interface Project {
  id: string;
  name: string;
  goal: string;              // ЗОРИЛГО - Project goal/objective
  expectedOutcome: string;   // ХҮЛЭЭГДЭЖ БУЙ ҮР ДҮН - Expected outcome / success criteria
  startDate: string;         // ISO date string (YYYY-MM-DD)
  endDate: string;           // ISO date string (YYYY-MM-DD)
  ownerId: string;           // Employee ID who owns this project
  teamMemberIds: string[];   // Багийн гишүүд (Employee IDs)
  status: ProjectStatus;
  priority: Priority;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;         // Employee ID who created the project
}

// Task interface
export interface Task {
  id: string;
  projectId: string;        // Parent project ID
  title: string;
  dueDate: string;          // ISO date string (YYYY-MM-DD) - only end date
  ownerId?: string;         // Optional task owner (Employee ID)
  assigneeIds: string[];    // Multiple assignees (Employee IDs)
  status: TaskStatus;
  priority: Priority;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;  // When the task was marked as DONE
}

// Project Chat Message interface
export interface ProjectMessage {
  id: string;
  projectId: string;        // Parent project ID
  content: string;          // Message content
  senderId: string;         // Employee ID who sent the message
  mentions: string[];       // Mentioned employee IDs (@mention)
  createdAt: Timestamp;
}

// Helper type for creating a new project (without id and timestamps)
export type CreateProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

// Helper type for creating a new task (without id and timestamps)
export type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>;

// Status label mappings for UI
export const PROJECT_STATUS_LABELS: Record<string, string> = {
  // New statuses
  DRAFT: 'Ноорог',
  ACTIVE: 'Идэвхтэй',
  ON_HOLD: 'Түр зогссон',
  COMPLETED: 'Дууссан',
  ARCHIVED: 'Архивласан',
  // Legacy statuses (for backward compatibility)
  PLANNING: 'Ноорог',
  IN_PROGRESS: 'Идэвхтэй',
  CANCELLED: 'Архивласан',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Хийх',
  IN_PROGRESS: 'Гүйцэтгэж байна',
  DONE: 'Дууссан',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Бага',
  MEDIUM: 'Дунд',
  HIGH: 'Өндөр',
  URGENT: 'Яаралтай',
};

// Status colors for badges
export const PROJECT_STATUS_COLORS: Record<string, string> = {
  // New statuses
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ON_HOLD: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ARCHIVED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  // Legacy statuses (for backward compatibility)
  PLANNING: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DONE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  MEDIUM: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  URGENT: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};
