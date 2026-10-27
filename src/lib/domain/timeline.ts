// Pure helpers for presenting work-order history as a timeline.

import { ANALYSIS_PERIOD, ANALYSIS_TIME_ZONE } from "./analysis";
import type { AnalysisPeriod } from "./types";

/** Calendar month ("YYYY-MM") of an instant in the given time zone. */
export function monthKeyInZone(date: Date, timeZone: string = ANALYSIS_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${value("year")}-${value("month")}`;
}

export type MonthGroup<T> = { monthKey: string; items: T[] };

/**
 * Groups items into consecutive calendar months (Estonian time) while keeping
 * the input order. Items are expected to be sorted already (newest first).
 */
export function groupByMonth<T extends { registeredAt: Date }>(
  items: readonly T[],
  timeZone: string = ANALYSIS_TIME_ZONE,
): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const item of items) {
    const monthKey = monthKeyInZone(item.registeredAt, timeZone);
    const last = groups.at(-1);
    if (last && last.monthKey === monthKey) last.items.push(item);
    else groups.push({ monthKey, items: [item] });
  }
  return groups;
}

/**
 * Position of the analysis-period start in a newest-first list: the index of
 * the first item registered before the period starts, or null when no item is
 * older than the period (no boundary marker is needed then).
 */
export function periodStartIndex(
  itemsNewestFirst: readonly { registeredAt: Date }[],
  period: AnalysisPeriod = ANALYSIS_PERIOD,
): number | null {
  const index = itemsNewestFirst.findIndex((item) => item.registeredAt < period.start);
  return index === -1 ? null : index;
}
