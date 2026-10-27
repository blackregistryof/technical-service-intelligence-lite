// URL builders for the Rikketeated workspace. Only known, non-empty
// parameters are included, always in the same order.

import type { ActiveStatus } from "@/lib/domain/filters";
import type { WorkType } from "@/lib/domain/types";

export type FaultCallListParams = {
  query?: string | null;
  status?: ActiveStatus | null;
};

/** Appends the list's search and status filter to a path. */
export function withListParams(path: string, { query, status }: FaultCallListParams = {}): string {
  const params = new URLSearchParams();
  const q = query?.trim();
  if (q) params.set("q", q);
  if (status) params.set("staatus", status);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

/** "/rikketeated?q=ATM-0101&staatus=HOLD" */
export function faultCallListHref(params: FaultCallListParams = {}): string {
  return withListParams("/rikketeated", params);
}

export type DeviceListParams = {
  /** ATM search text in the sidebar. */
  query?: string | null;
  /** Work-type filter of the history. */
  workType?: WorkType | null;
};

/**
 * "/seadmed" or "/seadmed/ATM-0101?q=…&liik=…". Keeps the sidebar search and
 * the work-type filter; an optional hash points at a record in the history.
 */
export function deviceHref(
  atmNumber: string | null,
  { query, workType }: DeviceListParams = {},
  hash?: string,
): string {
  const params = new URLSearchParams();
  const q = query?.trim();
  if (q) params.set("q", q);
  if (workType) params.set("liik", workType);
  const search = params.toString();
  const path = atmNumber ? `/seadmed/${encodeURIComponent(atmNumber)}` : "/seadmed";
  return `${path}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
}

/** "/rikketeated/<id>?q=…&staatus=…" — keeps the list state while a call is selected. */
export function faultCallDetailHref(id: string, params: FaultCallListParams = {}): string {
  return withListParams(`/rikketeated/${encodeURIComponent(id)}`, params);
}
