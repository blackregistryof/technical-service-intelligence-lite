// Where the selected fault call stands relative to the visible list.

import { isActiveFaultCall } from "./analysis";
import type { WorkOrderStatus, WorkType } from "./types";

/**
 * - "none": nothing is selected.
 * - "inList": the selected call is shown in the current list.
 * - "filteredOut": it is active but hidden by the current search or filter.
 * - "notActive": it is not an OPEN/HOLD fault call (e.g. a closed call
 *   opened from device history), so it never appears in the active list.
 */
export type SelectionState = "none" | "inList" | "filteredOut" | "notActive";

export function selectionState(
  selected: { id: string; workType: WorkType; status: WorkOrderStatus } | null,
  visibleItems: readonly { id: string }[],
): SelectionState {
  if (selected === null) return "none";
  if (!isActiveFaultCall(selected)) return "notActive";
  return visibleItems.some((item) => item.id === selected.id) ? "inList" : "filteredOut";
}
