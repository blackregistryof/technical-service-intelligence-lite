import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ANALYSIS_PERIOD,
  ANALYSIS_TIME_ZONE,
  isActiveFaultCall,
  latestTechnicianComment,
  matchesQuery,
  normalizeQuery,
  periodEndingOn,
  REFERENCE_DATE,
  startOfDayInZone,
  summarizeAtm,
} from "./analysis";
import type { TechnicianVisit, WorkOrderStatus, WorkType } from "./types";

const HOUR_MS = 60 * 60 * 1000;

const visit = (visitedAt: string, originalComment: string | null): TechnicianVisit => ({
  id: `v-${visitedAt}`,
  visitedAt: new Date(visitedAt),
  actions: "Kontroll",
  originalComment,
  resolution: null,
  outcome: null,
});

const workOrder = (
  externalId: string,
  workType: WorkType,
  registeredAt: string,
  status: WorkOrderStatus = "CLOSED",
) => ({
  id: `wo-${externalId}`,
  externalId,
  workType,
  status,
  registeredAt: new Date(registeredAt),
});

describe("reference date and analysis period", () => {
  it("is fixed to 2026-10-25 and covers 30 calendar days in Estonian time", () => {
    assert.equal(REFERENCE_DATE, "2026-10-25");
    assert.equal(ANALYSIS_TIME_ZONE, "Europe/Tallinn");
    assert.deepEqual(ANALYSIS_PERIOD, {
      days: 30,
      timeZone: "Europe/Tallinn",
      startDay: "2026-09-26",
      endDay: "2026-10-25",
      start: new Date("2026-09-25T21:00:00.000Z"), // 26.09.2026 00:00 EEST (UTC+3)
      end: new Date("2026-10-25T21:59:59.999Z"), // 25.10.2026 23:59:59.999 EET (UTC+2)
    });
  });

  it("is derived from the reference date, not from the current clock", (t) => {
    t.mock.method(Date, "now", () => {
      throw new Error("Date.now() must not be used");
    });
    assert.deepEqual(periodEndingOn(REFERENCE_DATE, 30), ANALYSIS_PERIOD);
  });

  it("spans exactly 30 days plus the extra DST hour of 25.10.2026", () => {
    const length = ANALYSIS_PERIOD.end.getTime() + 1 - ANALYSIS_PERIOD.start.getTime();
    assert.equal(length, 30 * 24 * HOUR_MS + HOUR_MS);
  });
});

describe("startOfDayInZone (Europe/Tallinn)", () => {
  it("uses UTC+3 in summer and UTC+2 in winter", () => {
    assert.equal(startOfDayInZone("2026-09-26").toISOString(), "2026-09-25T21:00:00.000Z");
    assert.equal(startOfDayInZone("2026-10-26").toISOString(), "2026-10-25T22:00:00.000Z");
    assert.equal(startOfDayInZone("2026-01-15").toISOString(), "2026-01-14T22:00:00.000Z");
  });

  it("handles the 25-hour autumn day and the 23-hour spring day", () => {
    const dayLength = (day: string, next: string) =>
      startOfDayInZone(next).getTime() - startOfDayInZone(day).getTime();
    assert.equal(dayLength("2026-10-25", "2026-10-26"), 25 * HOUR_MS);
    assert.equal(dayLength("2026-03-29", "2026-03-30"), 23 * HOUR_MS);
    assert.equal(dayLength("2026-10-24", "2026-10-25"), 24 * HOUR_MS);
  });

  it("supports other time zones", () => {
    assert.equal(startOfDayInZone("2026-10-25", "UTC").toISOString(), "2026-10-25T00:00:00.000Z");
  });

  it("builds inclusive periods of any length", () => {
    const oneDay = periodEndingOn("2026-10-25", 1);
    assert.equal(oneDay.startDay, "2026-10-25");
    assert.equal(oneDay.start.toISOString(), "2026-10-24T21:00:00.000Z");
    assert.equal(oneDay.end.toISOString(), "2026-10-25T21:59:59.999Z");
    assert.equal(periodEndingOn("2026-03-01", 30).startDay, "2026-01-31");
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
  it("counts fault calls exactly at the period boundaries (Estonian time)", () => {
    const summary = summarizeAtm([
      workOrder("before", "FAULT_CALL", "2026-09-25T20:59:59.999Z"), // 25.09 23:59:59.999 EEST
      workOrder("first", "FAULT_CALL", "2026-09-25T21:00:00.000Z"), // 26.09 00:00 EEST
      workOrder("last", "FAULT_CALL", "2026-10-25T21:59:59.999Z"), // 25.10 23:59:59.999 EET
      workOrder("after", "FAULT_CALL", "2026-10-25T22:00:00.000Z"), // 26.10 00:00 EET
    ]);
    assert.deepEqual(summary.periodFaultCalls.map((w) => w.externalId), ["last", "first"]);
    assert.equal(summary.faultCallsInPeriod, 2);
    assert.equal(summary.referenceDate, "2026-10-25");
  });

  it("uses local calendar days rather than UTC days", () => {
    const summary = summarizeAtm([
      // 25.09.2026 22:30 UTC is already 26.09 01:30 in Tallinn → inside.
      workOrder("late-utc", "FAULT_CALL", "2026-09-25T22:30:00Z"),
      // 25.10.2026 22:30 UTC is 26.10 00:30 in Tallinn → after the reference day.
      workOrder("next-local-day", "FAULT_CALL", "2026-10-25T22:30:00Z"),
      // 25.10.2026 21:30 UTC is still 25.10 23:30 in Tallinn → inside.
      workOrder("reference-evening", "FAULT_CALL", "2026-10-25T21:30:00Z"),
    ]);
    assert.deepEqual(summary.periodFaultCalls.map((w) => w.externalId), [
      "reference-evening",
      "late-utc",
    ]);
  });

  it("counts fault calls of every status but never maintenance orders", () => {
    const summary = summarizeAtm([
      workOrder("open", "FAULT_CALL", "2026-10-20T10:00:00Z", "OPEN"),
      workOrder("hold", "FAULT_CALL", "2026-10-15T10:00:00Z", "HOLD"),
      workOrder("closed", "FAULT_CALL", "2026-10-01T10:00:00Z", "CLOSED"),
      workOrder("maint-open", "MAINTENANCE", "2026-10-24T07:00:00Z", "OPEN"),
      workOrder("maint-closed", "MAINTENANCE", "2026-10-05T07:00:00Z", "CLOSED"),
    ]);
    assert.equal(summary.faultCallsInPeriod, 3);
    assert.deepEqual(
      summary.periodFaultCalls.map((w) => [w.externalId, w.status]),
      [
        ["open", "OPEN"],
        ["hold", "HOLD"],
        ["closed", "CLOSED"],
      ],
    );
  });

  it("counts a work order once even if the source returns it once per visit", () => {
    const call = workOrder("multi-visit", "FAULT_CALL", "2026-10-10T10:00:00Z");
    const summary = summarizeAtm([call, { ...call }, { ...call }]);
    assert.equal(summary.faultCallsInPeriod, 1);
  });

  it("uses the latest registered work order of any type, ignoring dates after the reference date", () => {
    const summary = summarizeAtm([
      workOrder("fault", "FAULT_CALL", "2026-10-20T10:00:00Z"),
      workOrder("maintenance", "MAINTENANCE", "2026-10-24T07:00:00Z", "OPEN"),
      workOrder("future", "FAULT_CALL", "2026-11-02T07:00:00Z"),
    ]);
    assert.deepEqual(summary.latestWorkOrder, {
      id: "wo-maintenance",
      externalId: "maintenance",
      workType: "MAINTENANCE",
      status: "OPEN",
      registeredAt: new Date("2026-10-24T07:00:00Z"),
    });
  });

  it("reports the latest work even when it is older than the period", () => {
    const summary = summarizeAtm([workOrder("old", "FAULT_CALL", "2026-03-14T09:20:00Z")]);
    assert.equal(summary.faultCallsInPeriod, 0);
    assert.deepEqual(summary.periodFaultCalls, []);
    assert.equal(summary.latestWorkOrder?.externalId, "old");
  });

  it("handles a device without work orders", () => {
    const summary = summarizeAtm([]);
    assert.equal(summary.faultCallsInPeriod, 0);
    assert.deepEqual(summary.periodFaultCalls, []);
    assert.equal(summary.latestWorkOrder, null);
  });

  it("handles a device with maintenance only", () => {
    const summary = summarizeAtm([workOrder("m", "MAINTENANCE", "2026-10-15T07:00:00Z")]);
    assert.equal(summary.faultCallsInPeriod, 0);
    assert.equal(summary.latestWorkOrder?.workType, "MAINTENANCE");
  });

  it("returns only reference fields, not descriptions or visits", () => {
    // A full work order (with description and visits) is accepted as input.
    const fullWorkOrder = {
      ...workOrder("x", "FAULT_CALL", "2026-10-10T10:00:00Z"),
      originalDescription: "…",
      visits: [],
    };
    const summary = summarizeAtm([fullWorkOrder]);
    assert.deepEqual(Object.keys(summary.periodFaultCalls[0]).sort(), [
      "externalId",
      "id",
      "registeredAt",
      "status",
      "workType",
    ]);
  });
});
