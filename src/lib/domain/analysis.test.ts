import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANALYSIS_PERIOD,
  isActiveFaultCall,
  latestTechnicianComment,
  matchesQuery,
  normalizeQuery,
  REFERENCE_DATE,
  summarizeAtm,
} from "./analysis";
import type { TechnicianVisit, WorkType } from "./types";

const visit = (visitedAt: string, originalComment: string | null): TechnicianVisit => ({
  id: `v-${visitedAt}`,
  visitedAt: new Date(visitedAt),
  actions: "Kontroll",
  originalComment,
  resolution: null,
  outcome: null,
});

const workOrder = (externalId: string, workType: WorkType, registeredAt: string) => ({
  id: `wo-${externalId}`,
  externalId,
  workType,
  registeredAt: new Date(registeredAt),
});

describe("reference date and analysis period", () => {
  it("is fixed to 2026-10-25 and covers 30 calendar days in Estonian time", () => {
    assert.equal(REFERENCE_DATE, "2026-10-25");
    assert.equal(ANALYSIS_PERIOD.days, 30);
    assert.equal(ANALYSIS_PERIOD.start.toISOString(), "2026-09-25T21:00:00.000Z");
    assert.equal(ANALYSIS_PERIOD.end.toISOString(), "2026-10-25T21:59:59.999Z");
  });
});

describe("isActiveFaultCall", () => {
  it("accepts only OPEN and HOLD fault calls", () => {
    assert.equal(isActiveFaultCall({ workType: "FAULT_CALL", status: "OPEN" }), true);
    assert.equal(isActiveFaultCall({ workType: "FAULT_CALL", status: "HOLD" }), true);
    assert.equal(isActiveFaultCall({ workType: "FAULT_CALL", status: "CLOSED" }), false);
    assert.equal(isActiveFaultCall({ workType: "MAINTENANCE", status: "OPEN" }), false);
    assert.equal(isActiveFaultCall({ workType: "MAINTENANCE", status: "HOLD" }), false);
  });
});

describe("search query helpers", () => {
  it("normalizes whitespace, case and empty input", () => {
    assert.equal(normalizeQuery("  atm-0101 "), "ATM-0101");
    assert.equal(normalizeQuery("   "), null);
    assert.equal(normalizeQuery(undefined), null);
    assert.equal(normalizeQuery("x".repeat(80))!.length, 50);
  });

  it("matches substrings case-insensitively and everything for an empty query", () => {
    assert.equal(matchesQuery(["WO-27480", "ATM-0101"], normalizeQuery("27480")), true);
    assert.equal(matchesQuery(["WO-27480", "ATM-0101"], normalizeQuery("atm-0101")), true);
    assert.equal(matchesQuery(["WO-27480", "ATM-0101"], normalizeQuery("ATM-0102")), false);
    assert.equal(matchesQuery(["WO-27480"], null), true);
  });
});

describe("latestTechnicianComment", () => {
  it("reports when there are no visits", () => {
    assert.deepEqual(latestTechnicianComment([]), { kind: "no-visits" });
  });

  it("returns the comment of the most recent visit regardless of input order", () => {
    const result = latestTechnicianComment([
      visit("2026-10-22T09:00:00Z", "Uuem kommentaar"),
      visit("2026-10-19T09:00:00Z", "Vanem kommentaar"),
    ]);
    assert.equal(result.kind, "comment");
    assert.equal(result.kind === "comment" && result.text, "Uuem kommentaar");
  });

  it("reports a missing comment and never substitutes an older one", () => {
    const result = latestTechnicianComment([
      visit("2026-10-19T09:00:00Z", "Vanem kommentaar"),
      visit("2026-10-22T09:00:00Z", null),
    ]);
    assert.deepEqual(result, { kind: "missing", visitedAt: new Date("2026-10-22T09:00:00Z") });
  });

  it("treats a whitespace-only comment as missing", () => {
    assert.equal(latestTechnicianComment([visit("2026-10-22T09:00:00Z", "   ")]).kind, "missing");
  });
});

describe("summarizeAtm", () => {
  it("counts fault calls inside the period boundaries only", () => {
    const summary = summarizeAtm([
      workOrder("before", "FAULT_CALL", "2026-09-25T20:59:59.999Z"), // 25.09 23:59 Tallinn
      workOrder("first", "FAULT_CALL", "2026-09-25T21:00:00.000Z"), // 26.09 00:00 Tallinn
      workOrder("last", "FAULT_CALL", "2026-10-25T21:59:59.999Z"), // 25.10 23:59 Tallinn
      workOrder("after", "FAULT_CALL", "2026-10-25T22:00:00.000Z"), // 26.10 00:00 Tallinn
      workOrder("maintenance", "MAINTENANCE", "2026-10-10T07:00:00Z"),
    ]);
    assert.equal(summary.faultCallsInPeriod, 2);
    assert.equal(summary.referenceDate, "2026-10-25");
  });

  it("uses the latest registered work order of any type, ignoring dates after the reference date", () => {
    const summary = summarizeAtm([
      workOrder("fault", "FAULT_CALL", "2026-10-20T10:00:00Z"),
      workOrder("maintenance", "MAINTENANCE", "2026-10-24T07:00:00Z"),
      workOrder("future", "FAULT_CALL", "2026-11-02T07:00:00Z"),
    ]);
    assert.equal(summary.latestWorkOrder?.externalId, "maintenance");
    assert.equal(summary.latestWorkOrder?.workType, "MAINTENANCE");
  });

  it("handles a device without work orders", () => {
    const summary = summarizeAtm([]);
    assert.equal(summary.faultCallsInPeriod, 0);
    assert.equal(summary.latestWorkOrder, null);
  });
});
