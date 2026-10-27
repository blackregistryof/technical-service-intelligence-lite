// Factual "what is recorded / what is missing" check for one work order.
// It only reports whether stored fields exist; it never fills in values.

import { latestTechnicianComment } from "./analysis";
import type { WorkOrder } from "./types";

export const COMPLETENESS_KEYS = ["faultCode", "description", "visit", "visitComment"] as const;
export type CompletenessKey = (typeof COMPLETENESS_KEYS)[number];

/** "notApplicable": the field does not apply (e.g. no fault code on maintenance). */
export type CompletenessState = "present" | "missing" | "notApplicable";

export type CompletenessItem = { key: CompletenessKey; state: CompletenessState };

export function describeCompleteness(
  workOrder: Pick<WorkOrder, "workType" | "faultCode" | "originalDescription" | "visits">,
): CompletenessItem[] {
  const latestComment = latestTechnicianComment(workOrder.visits);
  return [
    {
      key: "faultCode",
      state:
        workOrder.workType !== "FAULT_CALL"
          ? "notApplicable"
          : workOrder.faultCode
            ? "present"
            : "missing",
    },
    {
      key: "description",
      state: workOrder.originalDescription.trim() ? "present" : "missing",
    },
    {
      key: "visit",
      state: workOrder.visits.length > 0 ? "present" : "missing",
    },
    {
      // Refers to the most recent visit; without visits there is nothing to comment on.
      key: "visitComment",
      state:
        latestComment.kind === "no-visits"
          ? "notApplicable"
          : latestComment.kind === "comment"
            ? "present"
            : "missing",
    },
  ];
}
