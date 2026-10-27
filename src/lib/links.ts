// URL builders for list views. Only known, non-empty parameters are included.

import type { ActiveStatus } from "@/lib/domain/filters";

export type FaultCallListParams = {
  query?: string | null;
  status?: ActiveStatus | null;
};

/** "/rikketeated?q=ATM-0101&staatus=HOLD"; parameters in a fixed order. */
export function faultCallListHref({ query, status }: FaultCallListParams = {}): string {
  const params = new URLSearchParams();
  const q = query?.trim();
  if (q) params.set("q", q);
  if (status) params.set("staatus", status);
  const search = params.toString();
  return search ? `/rikketeated?${search}` : "/rikketeated";
}
