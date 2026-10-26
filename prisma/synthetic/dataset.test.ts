import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  buildSyntheticDataset,
  REFERENCE_DATE,
  REFERENCE_END,
  SOURCE_SYSTEM,
  validateSyntheticDataset,
  WORK_ORDER_STATUSES,
  WORK_TYPES,
  type SyntheticDataset,
} from "./dataset";

// Fingerprint of the complete dataset. Changing the data intentionally
// requires updating this value (and reviewing the expected counts below).
const EXPECTED_FINGERPRINT =
  "849e37c6145f094a23ec399f913d3580c3415582c68879c29b8ab3d09f573dc1";

const fingerprint = (dataset: SyntheticDataset) =>
  createHash("sha256").update(JSON.stringify(dataset)).digest("hex");

const dataset = buildSyntheticDataset();
const faultCalls = dataset.workOrders.filter((w) => w.workType === "FAULT_CALL");
const visitsFor = (workOrderId: string) =>
  dataset.technicianVisits
    .filter((v) => v.workOrderId === workOrderId)
    .sort((a, b) => a.visitedAt.getTime() - b.visitedAt.getTime());

describe("synthetic dataset", () => {
  it("passes validation", () => {
    assert.deepEqual(validateSyntheticDataset(dataset), []);
  });

  it("uses the fixed reference date", () => {
    assert.equal(dataset.referenceDate, "2026-10-25");
    assert.equal(REFERENCE_DATE, "2026-10-25");
    assert.equal(REFERENCE_END.toISOString(), "2026-10-25T23:59:59.999Z");
  });

  describe("stable record counts", () => {
    it("has 7 ATMs, 38 work orders, 37 technician visits and 12 codes", () => {
      assert.equal(dataset.atms.length, 7);
      assert.equal(dataset.workOrders.length, 38);
      assert.equal(dataset.technicianVisits.length, 37);
      assert.equal(dataset.codes.length, 12);
    });

    it("stays within the V0.1 size limits", () => {
      assert.ok(dataset.atms.length >= 5 && dataset.atms.length <= 8);
      assert.ok(dataset.workOrders.length >= 30 && dataset.workOrders.length <= 50);
    });

    it("splits work orders into 26 fault calls and 12 maintenance orders", () => {
      assert.equal(faultCalls.length, 26);
      assert.equal(dataset.workOrders.filter((w) => w.workType === "MAINTENANCE").length, 12);
    });

    it("has 5 open, 4 hold and 17 closed fault calls", () => {
      const byStatus = (status: string) => faultCalls.filter((w) => w.status === status).length;
      assert.equal(byStatus("OPEN"), 5);
      assert.equal(byStatus("HOLD"), 4);
      assert.equal(byStatus("CLOSED"), 17);
    });
  });

  describe("record relationships", () => {
    it("links every work order to an existing ATM", () => {
      const atmIds = new Set(dataset.atms.map((a) => a.id));
      for (const wo of dataset.workOrders) assert.ok(atmIds.has(wo.atmId), wo.id);
    });

    it("links every technician visit to exactly one existing work order", () => {
      const workOrderIds = new Set(dataset.workOrders.map((w) => w.id));
      for (const visit of dataset.technicianVisits) {
        assert.ok(workOrderIds.has(visit.workOrderId), visit.id);
      }
    });

    it("gives every ATM at least one work order", () => {
      for (const atm of dataset.atms) {
        assert.ok(dataset.workOrders.some((w) => w.atmId === atm.id), atm.atmNumber);
      }
    });

    it("never records a visit before registration or after the reference date", () => {
      const byId = new Map(dataset.workOrders.map((w) => [w.id, w]));
      for (const visit of dataset.technicianVisits) {
        const wo = byId.get(visit.workOrderId)!;
        assert.ok(visit.visitedAt >= wo.registeredAt, visit.id);
        assert.ok(visit.visitedAt <= REFERENCE_END, visit.id);
      }
      for (const wo of dataset.workOrders) assert.ok(wo.registeredAt <= REFERENCE_END, wo.id);
    });

    it("counts fault calls by work order, not by technician visit", () => {
      const visitsOnFaultCalls = dataset.technicianVisits.filter((v) =>
        faultCalls.some((w) => w.id === v.workOrderId),
      );
      const distinctFaultCallsVisited = new Set(visitsOnFaultCalls.map((v) => v.workOrderId));
      // More visits than visited fault calls: multiple visits belong to one call.
      assert.ok(visitsOnFaultCalls.length > distinctFaultCallsVisited.size);
      // Fault calls registered in the 30 days up to the reference date.
      const windowStart = new Date("2026-09-25T00:00:00Z");
      const recent = faultCalls.filter(
        (w) => w.registeredAt >= windowStart && w.registeredAt <= REFERENCE_END,
      );
      assert.equal(recent.length, 15);
    });
  });

  describe("valid work types, statuses and codes", () => {
    it("uses only known work types and statuses", () => {
      for (const wo of dataset.workOrders) {
        assert.ok(WORK_TYPES.includes(wo.workType), wo.id);
        assert.ok(WORK_ORDER_STATUSES.includes(wo.status), wo.id);
        assert.equal(wo.sourceSystem, SOURCE_SYSTEM);
      }
    });

    it("gives fault calls a dictionary fault code and maintenance orders none", () => {
      const faultCodes = new Set(
        dataset.codes.filter((c) => c.codeType === "FAULT").map((c) => c.code),
      );
      for (const wo of dataset.workOrders) {
        if (wo.workType === "FAULT_CALL") assert.ok(faultCodes.has(wo.faultCode!), wo.id);
        else assert.equal(wo.faultCode, null, wo.id);
      }
    });

    it("has a resolution code on the last visit of every closed fault call", () => {
      for (const wo of faultCalls.filter((w) => w.status === "CLOSED")) {
        const visits = visitsFor(wo.id);
        assert.ok(visits.length > 0, wo.id);
        assert.ok(visits.at(-1)!.resolutionCode, wo.id);
      }
    });

    it("gives every hold fault call at least one visit and no resolution code", () => {
      for (const wo of faultCalls.filter((w) => w.status === "HOLD")) {
        const visits = visitsFor(wo.id);
        assert.ok(visits.length > 0, wo.id);
        assert.ok(visits.every((v) => v.resolutionCode === null), wo.id);
      }
    });
  });

  describe("required scenarios", () => {
    it("includes a hold fault call whose latest visit has a technician comment", () => {
      const withComment = faultCalls.filter(
        (w) => w.status === "HOLD" && visitsFor(w.id).at(-1)?.originalComment,
      );
      assert.ok(withComment.length >= 1);
    });

    it("includes a hold fault call whose latest visit has no comment (missing data)", () => {
      const withoutComment = faultCalls.filter(
        (w) => w.status === "HOLD" && visitsFor(w.id).at(-1)?.originalComment === null,
      );
      assert.equal(withoutComment.length, 1);
    });

    it("includes closed historical fault calls older than 30 days", () => {
      const old = faultCalls.filter(
        (w) => w.status === "CLOSED" && w.registeredAt < new Date("2026-09-25T00:00:00Z"),
      );
      assert.ok(old.length >= 1);
    });

    it("includes maintenance orders with technician visits", () => {
      const maintenance = dataset.workOrders.filter((w) => w.workType === "MAINTENANCE");
      assert.ok(maintenance.some((w) => visitsFor(w.id).length > 0));
    });

    it("includes work orders with multiple technician visits", () => {
      const multi = dataset.workOrders.filter((w) => visitsFor(w.id).length > 1);
      assert.deepEqual(
        multi.map((w) => [w.externalId, visitsFor(w.id).length]),
        [
          ["WO-27015", 3],
          ["WO-27455", 2],
          ["WO-27280", 2],
        ],
      );
    });

    it("includes a device with limited fault history", () => {
      const faultCountsPerAtm = dataset.atms.map(
        (a) => faultCalls.filter((w) => w.atmId === a.id).length,
      );
      assert.ok(Math.min(...faultCountsPerAtm) <= 1);
    });

    it("includes an open maintenance order that is not a fault call", () => {
      assert.ok(
        dataset.workOrders.some((w) => w.workType === "MAINTENANCE" && w.status === "OPEN"),
      );
    });
  });

  describe("determinism", () => {
    it("produces identical output on every build", () => {
      assert.deepEqual(buildSyntheticDataset(), buildSyntheticDataset());
      assert.equal(fingerprint(buildSyntheticDataset()), fingerprint(buildSyntheticDataset()));
    });

    it("matches the recorded fingerprint", () => {
      assert.equal(fingerprint(dataset), EXPECTED_FINGERPRINT);
    });

    it("does not depend on the current clock or randomness", (t) => {
      t.mock.method(Date, "now", () => {
        throw new Error("Date.now() must not be used");
      });
      t.mock.method(Math, "random", () => {
        throw new Error("Math.random() must not be used");
      });
      assert.equal(fingerprint(buildSyntheticDataset()), EXPECTED_FINGERPRINT);
    });

    it("returns independent copies", () => {
      const first = buildSyntheticDataset();
      first.atms[0].model = "changed";
      first.workOrders[0].registeredAt.setUTCFullYear(2000);
      assert.equal(fingerprint(buildSyntheticDataset()), EXPECTED_FINGERPRINT);
    });
  });

  describe("validation", () => {
    it("detects broken relationships and invalid values", () => {
      const broken = buildSyntheticDataset();
      broken.technicianVisits[0].workOrderId = "missing";
      broken.workOrders[1].faultCode = "F-DISP-01"; // a maintenance order
      broken.atms.push({ ...broken.atms[0] });
      const errors = validateSyntheticDataset(broken);
      assert.ok(errors.some((e) => e.includes("unknown work order")));
      assert.ok(errors.some((e) => e.includes("maintenance order must not have a fault code")));
      assert.ok(errors.some((e) => e.includes("Duplicate ATM id")));
    });
  });
});
