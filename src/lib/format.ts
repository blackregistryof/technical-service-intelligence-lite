import type { CompletenessKey, CompletenessState } from "@/lib/domain/completeness";
import type { WorkOrderStatus, WorkType } from "@/lib/domain/types";

// Timestamps are stored in UTC and shown in Estonian time.
const TIME_ZONE = "Europe/Tallinn";

const dateTimeFormat = new Intl.DateTimeFormat("et-EE", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormat = new Intl.DateTimeFormat("et-EE", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** "25.10.2026 09:35" (Intl inserts a comma between date and time for et-EE). */
export function formatDateTime(date: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateTimeFormat.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("day")}.${part("month")}.${part("year")} ${part("hour")}:${part("minute")}`;
}
export const formatDate = (date: Date) => dateFormat.format(date);

/** For <time dateTime> attributes. */
export const isoDateTime = (date: Date) => date.toISOString();

/** "2026-10-25" → "25.10.2026" without time-zone conversion. */
export function formatIsoDay(isoDay: string): string {
  const [year, month, day] = isoDay.split("-");
  return `${day}.${month}.${year}`;
}

/** "25.10" in Estonian time (timeline date column). */
export function formatDayMonth(date: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateTimeFormat.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("day")}.${part("month")}`;
}

/** "09:35" in Estonian time. */
export function formatTime(date: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateTimeFormat.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")}`;
}

/** "1 töökäsk", "6 töökäsku". Work orders, not visits. */
export function countWorkOrders(count: number): string {
  return `${count} ${count === 1 ? "töökäsk" : "töökäsku"}`;
}

/** "1 tehnikukülastus", "7 tehnikukülastust". */
export function countVisits(count: number): string {
  return `${count} ${count === 1 ? "tehnikukülastus" : "tehnikukülastust"}`;
}

/** "1 rikketeade", "3 rikketeadet", "0 rikketeadet". */
export function countFaultCalls(count: number): string {
  return `${count} ${count === 1 ? "rikketeade" : "rikketeadet"}`;
}

/**
 * Result line of the fault-call list, e.g. "Kuvatakse 4 ootel rikketeadet."
 * or "Kuvatakse 1 aktiivne rikketeade otsingule „ATM-0103“."
 */
export function describeFaultCallResult(
  count: number,
  status: WorkOrderStatus | null,
  query: string,
): string {
  const singular = count === 1;
  // "avatud" and "ootel" do not inflect; "aktiivne" does.
  const adjective = status
    ? STATUS_LABELS[status].toLowerCase()
    : singular
      ? "aktiivne"
      : "aktiivset";
  const noun = singular ? "rikketeade" : "rikketeadet";
  const suffix = query ? ` otsingule „${query}“` : "";
  return `Kuvatakse ${count} ${adjective} ${noun}${suffix}.`;
}

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: "Avatud",
  HOLD: "Ootel",
  CLOSED: "Suletud",
};

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  FAULT_CALL: "Rikketeade",
  MAINTENANCE: "Hooldustöö",
};

/** Plural labels for work-type filters. */
export const WORK_TYPE_FILTER_LABELS: Record<WorkType, string> = {
  FAULT_CALL: "Rikketeated",
  MAINTENANCE: "Hooldustööd",
};

export const ALL_FILTER_LABEL = "Kõik";

export const COMPLETENESS_LABELS: Record<CompletenessKey, string> = {
  faultCode: "Rikkekood",
  description: "Algne kirjeldus",
  visit: "Tehnikukülastus",
  visitComment: "Viimase külastuse kommentaar",
};

export const COMPLETENESS_STATE_LABELS: Record<CompletenessState, string> = {
  present: "olemas",
  missing: "puudub",
  notApplicable: "ei kohaldu",
};

const MONTH_FORMAT = new Intl.DateTimeFormat("et-EE", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

/** "2026-10" → "Oktoober 2026". The key is already a local calendar month. */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const label = MONTH_FORMAT.format(new Date(Date.UTC(year, month - 1, 15)));
  return label.charAt(0).toLocaleUpperCase("et-EE") + label.slice(1);
}
