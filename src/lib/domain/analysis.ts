// Factual rules shared by all data sources. Pure functions: no clock, no I/O.

import type {
  AnalysisPeriod,
  AtmFactSummary,
  LatestTechnicianComment,
  TechnicianVisit,
  WorkOrder,
  WorkOrderRef,
} from "./types";

/** Fixed synthetic reference date for V0.1. The current clock is never used. */
export const REFERENCE_DATE = "2026-10-25";
/** Calendar days are counted in Estonian time. */
export const ANALYSIS_TIME_ZONE = "Europe/Tallinn";
export const ANALYSIS_PERIOD_DAYS = 30;

/** Offset of the time zone from UTC at the given instant, in milliseconds. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const value = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return asUtc - (instant - (instant % 1000));
}

/** First instant (00:00:00.000) of a calendar day ("YYYY-MM-DD") in the time zone. */
export function startOfDayInZone(isoDay: string, timeZone: string = ANALYSIS_TIME_ZONE): Date {
  const [year, month, day] = isoDay.split("-").map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day);
  // Two passes handle days on which the offset changes (daylight-saving time).
  let instant = utcMidnight - zoneOffsetMs(utcMidnight, timeZone);
  instant = utcMidnight - zoneOffsetMs(instant, timeZone);
  return new Date(instant);
}

function addDays(isoDay: string, days: number): string {
  const [year, month, day] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * The `days` calendar days ending on (and including) the reference day, from
 * 00:00:00.000 on the first day to 23:59:59.999 on the reference day, local time.
 */
export function periodEndingOn(
  referenceDate: string,
  days: number,
  timeZone: string = ANALYSIS_TIME_ZONE,
): AnalysisPeriod {
  return {
    days,
    timeZone,
    startDay: addDays(referenceDate, -(days - 1)),
    endDay: referenceDate,
    start: startOfDayInZone(addDays(referenceDate, -(days - 1)), timeZone),
    end: new Date(startOfDayInZone(addDays(referenceDate, 1), timeZone).getTime() - 1),
  };
}

/**
 * The 30 calendar days ending on the reference date in Estonian time:
 * 26.09.2026 00:00 (EEST, UTC+3) – 25.10.2026 23:59:59.999 (EET, UTC+2; the
 * daylight-saving change happens on the reference day itself).
 */
export const ANALYSIS_PERIOD: AnalysisPeriod = periodEndingOn(REFERENCE_DATE, ANALYSIS_PERIOD_DAYS);

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

const toRef = (w: WorkOrderRef): WorkOrderRef => ({
  id: w.id,
  externalId: w.externalId,
  workType: w.workType,
  status: w.status,
  registeredAt: w.registeredAt,
});

/**
 * Factual summary for one ATM. Counts registered fault-call work orders (any
 * status) in the period; maintenance orders and technician visits are never
 * counted. Work orders are de-duplicated by ID, so a source that returns one
 * row per visit still counts each work order once.
 */
export function summarizeAtm(
  workOrders: WorkOrderRef[],
  period: AnalysisPeriod = ANALYSIS_PERIOD,
  referenceDate: string = REFERENCE_DATE,
): AtmFactSummary {
  const unique = [...new Map(workOrders.map((w) => [w.id, w])).values()];
  const upToReference = unique.filter((w) => w.registeredAt <= period.end);
  const periodFaultCalls = upToReference
    .filter((w) => w.workType === "FAULT_CALL" && isWithinPeriod(w.registeredAt, period))
    .sort(byRegisteredAtDesc)
    .map(toRef);
  const latest = [...upToReference].sort(byRegisteredAtDesc)[0];

  return {
    referenceDate,
    period,
    faultCallsInPeriod: periodFaultCalls.length,
    periodFaultCalls,
    latestWorkOrder: latest ? toRef(latest) : null,
  };
}
