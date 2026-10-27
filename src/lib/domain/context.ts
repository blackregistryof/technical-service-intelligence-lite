// ATM context shown next to a single fault call, derived from the ATM history
// that the repository already provides. Pure: no I/O, no clock.

import { byRegisteredAtDesc, isActiveFaultCall } from "./analysis";
import type { AtmFactSummary, AtmHistory, AtmSummary, WorkOrderRef } from "./types";

export const DEFAULT_RECENT_WORK_LIMIT = 5;

export type FaultCallContext = {
  atm: AtmSummary;
  /** The ATM's factual summary (30-day count, latest work) for the reference date. */
  summary: AtmFactSummary;
  /** Other OPEN/HOLD fault calls on the same ATM, newest first (the current one excluded). */
  otherActiveFaultCalls: WorkOrderRef[];
  /** Most recent work orders of any type, newest first; may include the current one. */
  recentWorkOrders: WorkOrderRef[];
  /** Total number of work orders in the ATM history. */
  totalWorkOrders: number;
};

const toRef = (w: WorkOrderRef): WorkOrderRef => ({
  id: w.id,
  externalId: w.externalId,
  workType: w.workType,
  status: w.status,
  registeredAt: w.registeredAt,
});

export function buildFaultCallContext(
  history: AtmHistory,
  currentWorkOrderId: string,
  recentLimit: number = DEFAULT_RECENT_WORK_LIMIT,
): FaultCallContext {
  const newestFirst = [...history.workOrders].sort(byRegisteredAtDesc);
  return {
    atm: history.atm,
    summary: history.summary,
    otherActiveFaultCalls: newestFirst
      .filter((w) => w.id !== currentWorkOrderId && isActiveFaultCall(w))
      .map(toRef),
    recentWorkOrders: newestFirst.slice(0, Math.max(0, recentLimit)).map(toRef),
    totalWorkOrders: newestFirst.length,
  };
}
