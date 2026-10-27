// Domain types used by the UI. Independent of the data source (synthetic
// dataset now, Prisma/PostgreSQL later).

export type WorkType = "FAULT_CALL" | "MAINTENANCE";
export type WorkOrderStatus = "OPEN" | "HOLD" | "CLOSED";

export type CodeRef = {
  code: string;
  /** Null when the code is not found in the code dictionary. */
  description: string | null;
};

export type AtmSummary = {
  id: string;
  atmNumber: string;
  model: string;
};

export type TechnicianVisit = {
  id: string;
  visitedAt: Date;
  actions: string;
  /** Preserved verbatim; null when missing in the source. */
  originalComment: string | null;
  resolution: CodeRef | null;
  outcome: string | null;
};

export type WorkOrder = {
  id: string;
  externalId: string;
  sourceSystem: string;
  workType: WorkType;
  status: WorkOrderStatus;
  registeredAt: Date;
  faultCode: CodeRef | null;
  originalDescription: string;
  atm: AtmSummary;
  /** Ordered chronologically (oldest first). */
  visits: TechnicianVisit[];
};

export type FaultCallListItem = {
  id: string;
  externalId: string;
  atm: AtmSummary;
  registeredAt: Date;
  faultCode: CodeRef | null;
  originalDescription: string;
  status: WorkOrderStatus;
  /** Number of recorded technician visits (visits are never counted as fault calls). */
  visitCount: number;
  /** Comment state of the most recent visit, without substituting older comments. */
  latestComment: LatestTechnicianComment;
};

export type AtmListItem = AtmSummary & {
  activeFaultCallCount: number;
  /** OPEN and HOLD fault calls (maintenance orders are never counted). */
  activeByStatus: { OPEN: number; HOLD: number };
  /** Registered fault calls in the fixed 30-day analysis period. */
  faultCallsInPeriod: number;
};

/** The latest technician comment for a work order, without filling in gaps. */
export type LatestTechnicianComment =
  | { kind: "comment"; text: string; visitedAt: Date }
  | { kind: "missing"; visitedAt: Date }
  | { kind: "no-visits" };

export type AnalysisPeriod = {
  days: number;
  /** IANA time zone in which calendar days are counted. */
  timeZone: string;
  /** First and last calendar day ("YYYY-MM-DD"), both inclusive. */
  startDay: string;
  endDay: string;
  /** Inclusive start instant (00:00:00.000 local time on startDay). */
  start: Date;
  /** Inclusive end instant (23:59:59.999 local time on endDay). */
  end: Date;
};

/** Reference to an existing work-order record. */
export type WorkOrderRef = {
  id: string;
  externalId: string;
  workType: WorkType;
  status: WorkOrderStatus;
  registeredAt: Date;
};

export type AtmFactSummary = {
  referenceDate: string;
  period: AnalysisPeriod;
  /** Number of registered fault-call work orders in the period (visits are not counted). */
  faultCallsInPeriod: number;
  /** The counted fault calls themselves, newest first. */
  periodFaultCalls: WorkOrderRef[];
  /** Latest registered work order of any type up to the reference date. */
  latestWorkOrder: WorkOrderRef | null;
};

export type AtmHistory = {
  atm: AtmSummary;
  summary: AtmFactSummary;
  /** All work orders, newest registration first, each with its visits. */
  workOrders: WorkOrder[];
};
