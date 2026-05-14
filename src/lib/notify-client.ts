/**
 * Client-side notification helper — STUB.
 *
 * Production-д /api/notify endpoint (FCM + email) бэлдээгүй учир одоогоор
 * console-руу log хийгээд дуусна. Notification pipeline бэлдсэний дараа
 * туршилгын төслийн жинхэнэ хувилбараар солино.
 *
 * Хэрэглэгч fire-and-forget гэж дуудах ёстой — алдаа гарвал ажиллагааг
 * зогсоохгүй.
 */

import type { NotificationType } from '@/types/notification';

export interface NotifyOptions {
    targetUid?: string;
    targetRole?: string | string[];
    title: string;
    body: string;
    type: NotificationType;
    link?: string;
    actorName?: string;
    event?: string;
    meta?: Record<string, unknown>;
}

export async function notifyClient(_options: NotifyOptions): Promise<void> {
    // No-op stub.
    return;
}

export function notifyTaskAssigned(_opts: {
    targetUid: string;
    employeeName: string;
    taskTitle: string;
    projectName: string;
    projectId: string;
    dueDate: string;
    priority: string;
    actorName?: string;
}): Promise<void> {
    return Promise.resolve();
}

export function notifyEmployeeAdded(_opts: {
    employeeId: string;
    employeeName: string;
    actorName?: string;
}): Promise<void> {
    return Promise.resolve();
}
