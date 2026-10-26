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

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: "Avatud",
  HOLD: "Ootel",
  CLOSED: "Suletud",
};

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  FAULT_CALL: "Rikketeade",
  MAINTENANCE: "Hooldustöö",
};
