// Pure list filters shared by all data sources. Filters only narrow a list;
// they never reorder it, so the newest-first order of the input is preserved.

import type { WorkOrderStatus, WorkType } from "./types";

/** Statuses that can be selected in the active fault-call list. */
export const ACTIVE_STATUSES = ["OPEN", "HOLD"] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

const WORK_TYPES: readonly WorkType[] = ["FAULT_CALL", "MAINTENANCE"];

type SearchParam = string | string[] | undefined;

function single(value: SearchParam): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim().toUpperCase();
  return trimmed ? trimmed : null;
}

/** Parses a status filter from a URL parameter. Unknown values mean "no filter". */
export function parseStatusFilter(value: SearchParam): ActiveStatus | null {
  const candidate = single(value);
  return (ACTIVE_STATUSES as readonly string[]).includes(candidate ?? "")
    ? (candidate as ActiveStatus)
    : null;
}

/** Parses a work-type filter from a URL parameter. Unknown values mean "no filter". */
export function parseWorkTypeFilter(value: SearchParam): WorkType | null {
  const candidate = single(value);
  return WORK_TYPES.includes(candidate as WorkType) ? (candidate as WorkType) : null;
}

export function filterByStatus<T extends { status: WorkOrderStatus }>(
  items: readonly T[],
  status: WorkOrderStatus | null,
): T[] {
  return status === null ? [...items] : items.filter((item) => item.status === status);
}

export function filterByWorkType<T extends { workType: WorkType }>(
  items: readonly T[],
  workType: WorkType | null,
): T[] {
  return workType === null ? [...items] : items.filter((item) => item.workType === workType);
}

export type StatusCounts = { total: number } & Record<WorkOrderStatus, number>;

/** Number of items per status, e.g. for filter labels ("Kõik 9 · Avatud 5 · Ootel 4"). */
export function countByStatus(items: readonly { status: WorkOrderStatus }[]): StatusCounts {
  const counts: StatusCounts = { total: items.length, OPEN: 0, HOLD: 0, CLOSED: 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

export type WorkTypeCounts = { total: number } & Record<WorkType, number>;

export function countByWorkType(items: readonly { workType: WorkType }[]): WorkTypeCounts {
  const counts: WorkTypeCounts = { total: items.length, FAULT_CALL: 0, MAINTENANCE: 0 };
  for (const item of items) counts[item.workType] += 1;
  return counts;
}

/** OPEN and HOLD fault calls of one ATM; maintenance orders are never counted. */
export function countActiveFaultCalls(
  workOrders: readonly { workType: WorkType; status: WorkOrderStatus }[],
): Record<ActiveStatus, number> {
  const faultCalls = workOrders.filter((w) => w.workType === "FAULT_CALL");
  const counts = countByStatus(faultCalls);
  return { OPEN: counts.OPEN, HOLD: counts.HOLD };
}
