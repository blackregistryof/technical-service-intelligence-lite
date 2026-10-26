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
};

export type AtmListItem = AtmSummary & {
  activeFaultCallCount: number;
};

/** The latest technician comment for a work order, without filling in gaps. */
export type LatestTechnicianComment =
  | { kind: "comment"; text: string; visitedAt: Date }
  | { kind: "missing"; visitedAt: Date }
  | { kind: "no-visits" };

export type AnalysisPeriod = {
  days: number;
  /** Inclusive start. */
  start: Date;
  /** Inclusive end. */
  end: Date;
};

export type AtmFactSummary = {
  referenceDate: string;
  period: AnalysisPeriod;
  /** Registered fault-call work orders in the period (visits are not counted). */
  faultCallsInPeriod: number;
  /** Latest registered work order of any type up to the reference date. */
  latestWorkOrder: { id: string; externalId: string; workType: WorkType; registeredAt: Date } | null;
};

export type AtmHistory = {
  atm: AtmSummary;
  summary: AtmFactSummary;
  /** All work orders, newest registration first, each with its visits. */
  workOrders: WorkOrder[];
};
