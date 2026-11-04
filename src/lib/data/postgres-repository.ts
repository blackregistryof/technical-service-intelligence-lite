// Read-only PostgreSQL adapter (Prisma). Selected with DATA_SOURCE=postgres.
// Must only be reached through the server-only data access layer
// (src/lib/dal.ts); the Prisma client is injected by src/lib/data/index.ts.
//
// Filtering, ordering and counting run in the database; only the rows a page
// needs are loaded. The factual rules (30-day period, latest work, latest
// technician comment) reuse the same domain functions as the synthetic adapter.

import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import {
  ANALYSIS_PERIOD,
  latestTechnicianComment,
  normalizeQuery,
  summarizeAtm,
} from "../domain/analysis";
import { ACTIVE_STATUSES } from "../domain/filters";
import type {
  AtmListItem,
  AtmSummary,
  CodeRef,
  FaultCallListItem,
  TechnicianVisit,
  WorkOrder,
} from "../domain/types";
import type { ServiceRepository } from "./repository";

/** The parts of the Prisma client the adapter uses. */
export type PostgresRepositoryClient = Pick<PrismaClient, "atm" | "workOrder" | "codeDictionary">;

export class DataSourceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataSourceUnavailableError";
  }
}

/**
 * Prisma compiles `contains` and case-insensitive `equals` to ILIKE without
 * escaping the value, so `%` and `_` would act as wildcards. They are escaped
 * here (PostgreSQL's default LIKE escape character is the backslash), which
 * keeps search text literal, as in the synthetic adapter.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Removes connection strings and password parameters from an error message. */
export function redactConnectionDetails(message: string): string {
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, "postgresql://[redacted]")
    .replace(/password=[^\s&'"`]+/gi, "password=[redacted]");
}

const atmSelect = { id: true, atmNumber: true, model: true } as const;

const visitSelect = {
  id: true,
  visitedAt: true,
  actions: true,
  originalComment: true,
  resolutionCode: true,
  outcome: true,
} as const;

// Ties on a timestamp are ordered by ID so results are deterministic.
const visitOrder: Prisma.TechnicianVisitOrderByWithRelationInput[] = [{ visitedAt: "asc" }, { id: "asc" }];
const workOrderOrder: Prisma.WorkOrderOrderByWithRelationInput[] = [{ registeredAt: "desc" }, { id: "asc" }];

const workOrderSelect = {
  id: true,
  externalId: true,
  sourceSystem: true,
  workType: true,
  status: true,
  registeredAt: true,
  faultCode: true,
  originalDescription: true,
  atm: { select: atmSelect },
  visits: { select: visitSelect, orderBy: visitOrder },
} as const satisfies Prisma.WorkOrderSelect;

type CodeType = "FAULT" | "RESOLUTION";
type CodeDescriptions = Map<string, string>;

const codeKey = (codeType: CodeType, code: string) => `${codeType}:${code}`;

function codeRef(descriptions: CodeDescriptions, codeType: CodeType, code: string | null): CodeRef | null {
  return code === null ? null : { code, description: descriptions.get(codeKey(codeType, code)) ?? null };
}

/** Descriptions for exactly the codes on the loaded records (one query, none if no codes). */
async function loadCodeDescriptions(
  db: PostgresRepositoryClient,
  codes: { FAULT?: (string | null)[]; RESOLUTION?: (string | null)[] },
): Promise<CodeDescriptions> {
  const wanted = (Object.entries(codes) as [CodeType, (string | null)[]][])
    .map(([codeType, values]) => ({
      codeType,
      code: { in: [...new Set(values.filter((v): v is string => v !== null))].sort() },
    }))
    .filter((condition) => condition.code.in.length > 0);
  if (wanted.length === 0) return new Map();

  const rows = await db.codeDictionary.findMany({
    where: { OR: wanted },
    select: { codeType: true, code: true, description: true },
  });
  return new Map(rows.map((r) => [codeKey(r.codeType as CodeType, r.code), r.description]));
}

type WorkOrderRow = {
  id: string;
  externalId: string;
  sourceSystem: string;
  workType: WorkOrder["workType"];
  status: WorkOrder["status"];
  registeredAt: Date;
  faultCode: string | null;
  originalDescription: string;
  atm: AtmSummary;
  visits: {
    id: string;
    visitedAt: Date;
    actions: string;
    originalComment: string | null;
    resolutionCode: string | null;
    outcome: string | null;
  }[];
};

function toWorkOrder(row: WorkOrderRow, descriptions: CodeDescriptions): WorkOrder {
  return {
    id: row.id,
    externalId: row.externalId,
    sourceSystem: row.sourceSystem,
    workType: row.workType,
    status: row.status,
    registeredAt: row.registeredAt,
    faultCode: codeRef(descriptions, "FAULT", row.faultCode),
    originalDescription: row.originalDescription,
    atm: { id: row.atm.id, atmNumber: row.atm.atmNumber, model: row.atm.model },
    visits: row.visits.map(
      (v): TechnicianVisit => ({
        id: v.id,
        visitedAt: v.visitedAt,
        actions: v.actions,
        originalComment: v.originalComment,
        resolution: codeRef(descriptions, "RESOLUTION", v.resolutionCode),
        outcome: v.outcome,
      }),
    ),
  };
}

const codesOf = (rows: WorkOrderRow[]) => ({
  FAULT: rows.map((r) => r.faultCode),
  RESOLUTION: rows.flatMap((r) => r.visits.map((v) => v.resolutionCode)),
});

/** Reports failures without connection strings or passwords; never falls back to other data. */
async function guarded<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    const detail = error instanceof Error ? redactConnectionDetails(error.message) : "unknown error";
    throw new DataSourceUnavailableError(
      `PostgreSQL ${operation} failed${typeof code === "string" ? ` (${code})` : ""}: ${detail}`,
    );
  }
}

export function createPostgresRepository(db: PostgresRepositoryClient): ServiceRepository {
  return {
    listActiveFaultCalls(query) {
      return guarded("listActiveFaultCalls", async () => {
        const q = normalizeQuery(query);
        const pattern = q === null ? null : escapeLikePattern(q);
        const rows = await db.workOrder.findMany({
          where: {
            workType: "FAULT_CALL",
            status: { in: [...ACTIVE_STATUSES] },
            ...(pattern === null
              ? {}
              : {
                  OR: [
                    { externalId: { contains: pattern, mode: "insensitive" } },
                    { atm: { atmNumber: { contains: pattern, mode: "insensitive" } } },
                  ],
                }),
          },
          orderBy: workOrderOrder,
          select: {
            id: true,
            externalId: true,
            registeredAt: true,
            faultCode: true,
            originalDescription: true,
            status: true,
            atm: { select: atmSelect },
            visits: { select: { visitedAt: true, originalComment: true }, orderBy: visitOrder },
          },
        });
        const descriptions = await loadCodeDescriptions(db, { FAULT: rows.map((r) => r.faultCode) });

        return rows.map(
          (row): FaultCallListItem => ({
            id: row.id,
            externalId: row.externalId,
            atm: { id: row.atm.id, atmNumber: row.atm.atmNumber, model: row.atm.model },
            registeredAt: row.registeredAt,
            faultCode: codeRef(descriptions, "FAULT", row.faultCode),
            originalDescription: row.originalDescription,
            status: row.status,
            visitCount: row.visits.length,
            latestComment: latestTechnicianComment(row.visits),
          }),
        );
      });
    },

    getWorkOrder(id) {
      return guarded("getWorkOrder", async () => {
        const row = await db.workOrder.findUnique({ where: { id }, select: workOrderSelect });
        if (!row) return null;
        return toWorkOrder(row, await loadCodeDescriptions(db, codesOf([row])));
      });
    },

    searchAtms(query) {
      return guarded("searchAtms", async () => {
        const q = normalizeQuery(query);
        const atms = await db.atm.findMany({
          where: q === null ? {} : { atmNumber: { contains: escapeLikePattern(q), mode: "insensitive" } },
          orderBy: [{ atmNumber: "asc" }, { id: "asc" }],
          select: atmSelect,
        });
        if (atms.length === 0) return [];

        const atmIds = atms.map((a) => a.id);
        const [activeGroups, periodGroups] = await Promise.all([
          db.workOrder.groupBy({
            by: ["atmId", "status"],
            where: { atmId: { in: atmIds }, workType: "FAULT_CALL", status: { in: [...ACTIVE_STATUSES] } },
            _count: { _all: true },
          }),
          db.workOrder.groupBy({
            by: ["atmId"],
            where: {
              atmId: { in: atmIds },
              workType: "FAULT_CALL",
              registeredAt: { gte: ANALYSIS_PERIOD.start, lte: ANALYSIS_PERIOD.end },
            },
            _count: { _all: true },
          }),
        ]);

        const active = (atmId: string, status: "OPEN" | "HOLD") =>
          activeGroups.find((g) => g.atmId === atmId && g.status === status)?._count._all ?? 0;
        const inPeriod = (atmId: string) => periodGroups.find((g) => g.atmId === atmId)?._count._all ?? 0;

        // Same ordering rule as the synthetic adapter (the database collation may differ).
        return [...atms]
          .sort((a, b) => a.atmNumber.localeCompare(b.atmNumber))
          .map((atm): AtmListItem => {
            const activeByStatus = { OPEN: active(atm.id, "OPEN"), HOLD: active(atm.id, "HOLD") };
            return {
              id: atm.id,
              atmNumber: atm.atmNumber,
              model: atm.model,
              activeFaultCallCount: activeByStatus.OPEN + activeByStatus.HOLD,
              activeByStatus,
              faultCallsInPeriod: inPeriod(atm.id),
            };
          });
      });
    },

    getAtmHistory(atmNumber) {
      return guarded("getAtmHistory", async () => {
        // Case-insensitive exact match (escaped, so `%` and `_` stay literal).
        const atm = await db.atm.findFirst({
          where: { atmNumber: { equals: escapeLikePattern(atmNumber.trim()), mode: "insensitive" } },
          orderBy: [{ atmNumber: "asc" }, { id: "asc" }],
          select: atmSelect,
        });
        if (!atm) return null;

        const rows = await db.workOrder.findMany({
          where: { atmId: atm.id },
          orderBy: workOrderOrder,
          select: workOrderSelect,
        });
        const descriptions = await loadCodeDescriptions(db, codesOf(rows));
        const workOrders = rows.map((row) => toWorkOrder(row, descriptions));
        return {
          atm: { id: atm.id, atmNumber: atm.atmNumber, model: atm.model },
          summary: summarizeAtm(workOrders),
          workOrders,
        };
      });
    },
  };
}
