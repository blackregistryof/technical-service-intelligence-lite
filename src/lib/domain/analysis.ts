// Factual rules shared by all data sources. Pure functions: no clock, no I/O.

import type {
  AnalysisPeriod,
  AtmFactSummary,
  LatestTechnicianComment,
  TechnicianVisit,
  WorkOrder,
} from "./types";

/** Fixed synthetic reference date for V0.1. The current clock is never used. */
export const REFERENCE_DATE = "2026-10-25";

/**
 * The 30 calendar days ending on the reference date, in Estonian time
 * (Europe/Tallinn): 26.09.2026 00:00 (EEST, UTC+3) to 25.10.2026 23:59:59.999
 * (EET, UTC+2, after the daylight-saving change on 25.10.2026).
 */
export const ANALYSIS_PERIOD: AnalysisPeriod = {
  days: 30,
  start: new Date("2026-09-26T00:00:00.000+03:00"),
  end: new Date("2026-10-25T23:59:59.999+02:00"),
};

export const MAX_QUERY_LENGTH = 50;

export function isActiveFaultCall(workOrder: Pick<WorkOrder, "workType" | "status">): boolean {
  return (
    workOrder.workType === "FAULT_CALL" &&
    (workOrder.status === "OPEN" || workOrder.status === "HOLD")
  );
}

export function isWithinPeriod(date: Date, period: AnalysisPeriod = ANALYSIS_PERIOD): boolean {
  return date >= period.start && date <= period.end;
}

/** Trimmed, upper-cased search text, or null for an empty query. */
export function normalizeQuery(query: string | null | undefined): string | null {
  const normalized = (query ?? "").trim().slice(0, MAX_QUERY_LENGTH).toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function matchesQuery(values: string[], normalizedQuery: string | null): boolean {
  if (normalizedQuery === null) return true;
  return values.some((value) => value.toUpperCase().includes(normalizedQuery));
}

export function byRegisteredAtDesc(a: { registeredAt: Date }, b: { registeredAt: Date }): number {
  return b.registeredAt.getTime() - a.registeredAt.getTime();
}

/**
 * Comment of the most recent visit. If that visit has no comment, it is
 * reported as missing; older comments are deliberately not substituted.
 */
export function latestTechnicianComment(visits: TechnicianVisit[]): LatestTechnicianComment {
  const latest = visits.reduce<TechnicianVisit | null>(
    (current, visit) => (current === null || visit.visitedAt > current.visitedAt ? visit : current),
    null,
  );
  if (latest === null) return { kind: "no-visits" };
  const text = latest.originalComment?.trim();
  return text
    ? { kind: "comment", text: latest.originalComment!, visitedAt: latest.visitedAt }
    : { kind: "missing", visitedAt: latest.visitedAt };
}

/** Counts work orders, never technician visits. */
export function summarizeAtm(
  workOrders: Pick<WorkOrder, "id" | "externalId" | "workType" | "registeredAt">[],
  period: AnalysisPeriod = ANALYSIS_PERIOD,
): AtmFactSummary {
  const upToReference = workOrders.filter((w) => w.registeredAt <= period.end);
  const faultCallsInPeriod = upToReference.filter(
    (w) => w.workType === "FAULT_CALL" && isWithinPeriod(w.registeredAt, period),
  ).length;
  const latest = [...upToReference].sort(byRegisteredAtDesc)[0];

  return {
    referenceDate: REFERENCE_DATE,
    period,
    faultCallsInPeriod,
    latestWorkOrder: latest
      ? {
          id: latest.id,
          externalId: latest.externalId,
          workType: latest.workType,
          registeredAt: latest.registeredAt,
        }
      : null,
  };
}
