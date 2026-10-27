// URL builders for the Rikketeated workspace. Only known, non-empty
// parameters are included, always in the same order.

import type { ActiveStatus } from "@/lib/domain/filters";

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

/** "/rikketeated/<id>?q=…&staatus=…" — keeps the list state while a call is selected. */
export function faultCallDetailHref(id: string, params: FaultCallListParams = {}): string {
  return withListParams(`/rikketeated/${encodeURIComponent(id)}`, params);
}
