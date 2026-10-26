// TEMPORARY read-only adapter that serves the deterministic synthetic dataset
// from server memory while PostgreSQL is unavailable. Replace it with the
// Prisma adapter (or disable it) before the production Railway deployment.
// Must only be reached through the server-only data access layer (src/lib/dal.ts).

import {
  buildSyntheticDataset,
  type SyntheticDataset,
} from "../../../prisma/synthetic/dataset";
import {
  byRegisteredAtDesc,
  isActiveFaultCall,
  matchesQuery,
  normalizeQuery,
  summarizeAtm,
} from "../domain/analysis";
import type {
  AtmSummary,
  CodeRef,
  FaultCallListItem,
  TechnicianVisit,
  WorkOrder,
} from "../domain/types";
import type { ServiceRepository } from "./repository";

export function createSyntheticRepository(
  dataset: SyntheticDataset = buildSyntheticDataset(),
): ServiceRepository {
  const codeDescriptions = new Map(
    dataset.codes.map((c) => [`${c.codeType}:${c.code}`, c.description]),
  );
  const codeRef = (codeType: "FAULT" | "RESOLUTION", code: string | null): CodeRef | null =>
    code === null ? null : { code, description: codeDescriptions.get(`${codeType}:${code}`) ?? null };

  const atmsById = new Map(dataset.atms.map((a) => [a.id, a]));
  const atmSummary = (atmId: string): AtmSummary => {
    const atm = atmsById.get(atmId);
    if (!atm) throw new Error(`Synthetic dataset is inconsistent: unknown ATM ${atmId}`);
    return { id: atm.id, atmNumber: atm.atmNumber, model: atm.model };
  };

  const visitsFor = (workOrderId: string): TechnicianVisit[] =>
    dataset.technicianVisits
      .filter((v) => v.workOrderId === workOrderId)
      .sort((a, b) => a.visitedAt.getTime() - b.visitedAt.getTime())
      .map((v) => ({
        id: v.id,
        visitedAt: new Date(v.visitedAt),
        actions: v.actions,
        originalComment: v.originalComment,
        resolution: codeRef("RESOLUTION", v.resolutionCode),
        outcome: v.outcome,
      }));

  const toWorkOrder = (w: SyntheticDataset["workOrders"][number]): WorkOrder => ({
    id: w.id,
    externalId: w.externalId,
    sourceSystem: w.sourceSystem,
    workType: w.workType,
    status: w.status,
    registeredAt: new Date(w.registeredAt),
    faultCode: codeRef("FAULT", w.faultCode),
    originalDescription: w.originalDescription,
    atm: atmSummary(w.atmId),
    visits: visitsFor(w.id),
  });

  return {
    async listActiveFaultCalls(query) {
      const q = normalizeQuery(query);
      return dataset.workOrders
        .filter(isActiveFaultCall)
        .map(
          (w): FaultCallListItem => ({
            id: w.id,
            externalId: w.externalId,
            atm: atmSummary(w.atmId),
            registeredAt: new Date(w.registeredAt),
            faultCode: codeRef("FAULT", w.faultCode),
            originalDescription: w.originalDescription,
            status: w.status,
          }),
        )
        .filter((item) => matchesQuery([item.externalId, item.atm.atmNumber], q))
        .sort(byRegisteredAtDesc);
    },

    async getWorkOrder(id) {
      const workOrder = dataset.workOrders.find((w) => w.id === id);
      return workOrder ? toWorkOrder(workOrder) : null;
    },

    async searchAtms(query) {
      const q = normalizeQuery(query);
      return dataset.atms
        .filter((a) => matchesQuery([a.atmNumber], q))
        .sort((a, b) => a.atmNumber.localeCompare(b.atmNumber))
        .map((a) => ({
          id: a.id,
          atmNumber: a.atmNumber,
          model: a.model,
          activeFaultCallCount: dataset.workOrders.filter(
            (w) => w.atmId === a.id && isActiveFaultCall(w),
          ).length,
        }));
    },

    async getAtmHistory(atmNumber) {
      const atm = dataset.atms.find(
        (a) => a.atmNumber.toUpperCase() === atmNumber.trim().toUpperCase(),
      );
      if (!atm) return null;
      const workOrders = dataset.workOrders
        .filter((w) => w.atmId === atm.id)
        .map(toWorkOrder)
        .sort(byRegisteredAtDesc);
      return {
        atm: atmSummary(atm.id),
        summary: summarizeAtm(workOrders),
        workOrders,
      };
    },
  };
}
