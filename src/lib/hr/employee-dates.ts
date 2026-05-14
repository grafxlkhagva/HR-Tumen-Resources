/**
 * Extracts the effective termination date for an employee, preferring the
 * latest approved/signed `release` ER document's release date over the
 * employee profile's `terminationDate`.
 *
 * Keep in sync with the inline logic in
 * `src/app/dashboard/employees/[id]/page.tsx` (effectiveTerminationDate).
 */

type MaybeTimestamp = { seconds?: number } | string | number | null | undefined;

interface ERDocLike {
  status?: string;
  templateId?: string;
  createdAt?: MaybeTimestamp;
  customInputs?: Record<string, unknown>;
  metadata?: { actionId?: unknown } | null;
}

interface OrgActionLike {
  id?: string;
  dateMappings?: Record<string, string>;
}

function getTsSeconds(ts: MaybeTimestamp): number {
  if (ts && typeof ts === 'object' && 'seconds' in ts && typeof ts.seconds === 'number') {
    return ts.seconds;
  }
  if (typeof ts === 'string' || typeof ts === 'number') {
    const t = new Date(ts).getTime();
    return Number.isNaN(t) ? 0 : t / 1000;
  }
  return 0;
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

function getActionId(doc: ERDocLike): string {
  const aid = doc.metadata?.actionId;
  return typeof aid === 'string' ? aid : '';
}

export function resolveEffectiveTerminationDate(
  employeeTerminationDate: string | null | undefined,
  erDocuments: ERDocLike[] | null | undefined,
  orgActions: OrgActionLike[] | null | undefined,
): string | null {
  let terminationDate: string | null = employeeTerminationDate ?? null;

  if (!erDocuments || erDocuments.length === 0) return terminationDate;

  const releaseDocs = erDocuments
    .filter((doc) => {
      const actionId = getActionId(doc);
      const isRelease =
        actionId.startsWith('release') || (doc.templateId ?? '').includes('release');
      return isRelease && ['APPROVED', 'SIGNED', 'SENT_TO_EMPLOYEE', 'ACKNOWLEDGED'].includes(String(doc.status || ''));
    })
    .sort((a, b) => getTsSeconds(b.createdAt) - getTsSeconds(a.createdAt));

  if (releaseDocs.length === 0) return terminationDate;

  const latest = releaseDocs[0];
  const inputs = latest.customInputs || {};
  const actionId = getActionId(latest);
  const actionConfig = orgActions?.find((a) => a.id === actionId);
  const mappings = actionConfig?.dateMappings || {};

  const mappedKey = mappings['releaseDate'];
  let releaseDateVal = mappedKey ? asStringOrNull(inputs[mappedKey]) : null;

  if (!releaseDateVal) {
    releaseDateVal =
      asStringOrNull(inputs['Ажлаас чөлөөлөх огноо']) ||
      asStringOrNull(inputs['releaseDate']) ||
      asStringOrNull(inputs['terminationDate']);
  }

  if (releaseDateVal && /^\d{4}-\d{2}-\d{2}/.test(releaseDateVal)) {
    terminationDate = releaseDateVal.substring(0, 10);
  }

  return terminationDate;
}
