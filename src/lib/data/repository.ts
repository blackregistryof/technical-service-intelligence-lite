// Read-only data access contract used by the UI. Implementations: the
// temporary synthetic adapter now, a Prisma/PostgreSQL adapter later.

import type {
  AtmHistory,
  AtmListItem,
  FaultCallListItem,
  WorkOrder,
} from "../domain/types";

export interface ServiceRepository {
  /**
   * OPEN and HOLD fault calls only, newest registration first, each with its
   * visit count and latest technician comment state.
   */
  listActiveFaultCalls(query?: string | null): Promise<FaultCallListItem[]>;
  /** Any work order by its stable ID, with ATM and visits; null if unknown. */
  getWorkOrder(id: string): Promise<WorkOrder | null>;
  /** ATMs matching the ATM number query, ordered by ATM number. */
  searchAtms(query?: string | null): Promise<AtmListItem[]>;
  /** Full work-order history and factual summary for one ATM; null if unknown. */
  getAtmHistory(atmNumber: string): Promise<AtmHistory | null>;
}
