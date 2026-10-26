import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSyntheticDataset } from "../../../prisma/synthetic/dataset";
import { latestTechnicianComment } from "../domain/analysis";
import { createSyntheticRepository } from "./synthetic-repository";

const repository = createSyntheticRepository();
const dataset = buildSyntheticDataset();

describe("listActiveFaultCalls", () => {
  it("returns only OPEN and HOLD fault calls", async () => {
    const calls = await repository.listActiveFaultCalls();
    assert.equal(calls.length, 9);
    for (const call of calls) {
      const source = dataset.workOrders.find((w) => w.id === call.id)!;
      assert.equal(source.workType, "FAULT_CALL", call.externalId);
      assert.ok(["OPEN", "HOLD"].includes(call.status), call.externalId);
    }
  });

  it("excludes maintenance orders (including the open one) and closed fault calls", async () => {
    const ids = new Set((await repository.listActiveFaultCalls()).map((c) => c.externalId));
    assert.equal(ids.has("WO-27610"), false); // open maintenance order
    assert.equal(ids.has("WO-27015"), false); // closed fault call
    assert.equal(ids.has("WO-25390"), false); // closed maintenance order
  });

  it("sorts by registration time, newest first", async () => {
    const calls = await repository.listActiveFaultCalls();
    assert.deepEqual(
      calls.map((c) => c.externalId),
      [
        "WO-27602",
        "WO-27590",
        "WO-27570",
        "WO-27540",
        "WO-27520",
        "WO-27480",
        "WO-27495",
        "WO-27455",
        "WO-27410",
      ],
    );
  });

  it("searches by work-order identifier", async () => {
    const calls = await repository.listActiveFaultCalls("wo-27480");
    assert.deepEqual(calls.map((c) => c.externalId), ["WO-27480"]);
    assert.deepEqual(
      (await repository.listActiveFaultCalls("274")).map((c) => c.externalId),
      ["WO-27480", "WO-27495", "WO-27455", "WO-27410"],
    );
  });

  it("searches by ATM number", async () => {
    const calls = await repository.listActiveFaultCalls(" ATM-0106 ");
    assert.deepEqual(calls.map((c) => c.externalId), ["WO-27540", "WO-27410"]);
  });

  it("does not return closed fault calls even when searched for directly", async () => {
    assert.deepEqual(await repository.listActiveFaultCalls("WO-27015"), []);
    assert.deepEqual(await repository.listActiveFaultCalls("ATM-0107"), []);
  });

  it("returns ATM details and the fault-code description", async () => {
    const [call] = await repository.listActiveFaultCalls("WO-27480");
    assert.deepEqual(call.atm, { id: "syn-atm-atm-0101", atmNumber: "ATM-0101", model: "Kassaline K5" });
    assert.deepEqual(call.faultCode, {
      code: "F-DISP-01",
      description: "Sularaha väljastusmooduli tõrge",
    });
  });
});

describe("getWorkOrder", () => {
  it("returns a work order with its ATM and all visits in chronological order", async () => {
    const wo = await repository.getWorkOrder("syn-wo-wo-27015");
    assert.ok(wo);
    assert.equal(wo.atm.atmNumber, "ATM-0101");
    assert.equal(wo.visits.length, 3);
    const times = wo.visits.map((v) => v.visitedAt.getTime());
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
    assert.equal(wo.visits.at(-1)?.resolution?.code, "R-PART");
    assert.equal(wo.visits.at(-1)?.resolution?.description, "Varuosa vahetus");
  });

  it("returns null for an unknown ID", async () => {
    assert.equal(await repository.getWorkOrder("syn-wo-unknown"), null);
  });

  it("exposes the latest technician comment of a HOLD call", async () => {
    const wo = (await repository.getWorkOrder("syn-wo-wo-27455"))!;
    const latest = latestTechnicianComment(wo.visits);
    assert.equal(latest.kind, "comment");
    assert.match(latest.kind === "comment" ? latest.text : "", /^Püsivara uuendus ei aidanud/);
  });

  it("reports the missing comment of HOLD call WO-27520 without inventing text", async () => {
    const wo = (await repository.getWorkOrder("syn-wo-wo-27520"))!;
    assert.equal(wo.status, "HOLD");
    assert.equal(wo.visits.length, 1);
    assert.equal(wo.visits[0].originalComment, null);
    assert.deepEqual(latestTechnicianComment(wo.visits), {
      kind: "missing",
      visitedAt: new Date("2026-10-22T15:30:00Z"),
    });
  });

  it("returns independent copies that cannot alter the data source", async () => {
    const first = (await repository.getWorkOrder("syn-wo-wo-27480"))!;
    first.registeredAt.setUTCFullYear(2000);
    first.visits.length = 0;
    const second = (await repository.getWorkOrder("syn-wo-wo-27480"))!;
    assert.equal(second.registeredAt.toISOString(), "2026-10-21T08:50:00.000Z");
    assert.equal(second.visits.length, 1);
  });
});

describe("searchAtms", () => {
  it("lists all ATMs ordered by number for an empty query", async () => {
    const atms = await repository.searchAtms("");
    assert.deepEqual(
      atms.map((a) => a.atmNumber),
      ["ATM-0101", "ATM-0102", "ATM-0103", "ATM-0104", "ATM-0105", "ATM-0106", "ATM-0107"],
    );
  });

  it("searches by ATM identifier, case-insensitively", async () => {
    assert.deepEqual((await repository.searchAtms("atm-0105")).map((a) => a.atmNumber), ["ATM-0105"]);
    assert.deepEqual((await repository.searchAtms("0107")).map((a) => a.atmNumber), ["ATM-0107"]);
    assert.deepEqual(await repository.searchAtms("ATM-9999"), []);
  });

  it("counts active fault calls per ATM, excluding maintenance", async () => {
    const counts = Object.fromEntries(
      (await repository.searchAtms()).map((a) => [a.atmNumber, a.activeFaultCallCount]),
    );
    assert.deepEqual(counts, {
      "ATM-0101": 2,
      "ATM-0102": 2,
      "ATM-0103": 1,
      "ATM-0104": 1,
      "ATM-0105": 1, // its open maintenance order is not counted
      "ATM-0106": 2,
      "ATM-0107": 0,
    });
  });
});

describe("getAtmHistory", () => {
  it("returns all work orders of the ATM, including closed work and maintenance", async () => {
    const history = (await repository.getAtmHistory("ATM-0101"))!;
    assert.equal(history.atm.model, "Kassaline K5");
    assert.equal(history.workOrders.length, 6);
    assert.ok(history.workOrders.every((w) => w.atm.atmNumber === "ATM-0101"));
    assert.ok(history.workOrders.some((w) => w.workType === "MAINTENANCE"));
    assert.ok(history.workOrders.some((w) => w.workType === "FAULT_CALL" && w.status === "CLOSED"));
  });

  it("orders history newest first", async () => {
    const history = (await repository.getAtmHistory("ATM-0101"))!;
    assert.deepEqual(
      history.workOrders.map((w) => w.externalId),
      ["WO-27602", "WO-27480", "WO-27015", "WO-26102", "WO-25390", "WO-24811"],
    );
  });

  it("nests every visit under its own parent work order", async () => {
    for (const { atmNumber } of await repository.searchAtms()) {
      const history = (await repository.getAtmHistory(atmNumber))!;
      for (const wo of history.workOrders) {
        const expected = dataset.technicianVisits
          .filter((v) => v.workOrderId === wo.id)
          .map((v) => v.id)
          .sort();
        assert.deepEqual(wo.visits.map((v) => v.id).sort(), expected, wo.externalId);
      }
    }
  });

  it("calculates the 30-day fault-call count and latest work date per ATM", async () => {
    const expected: Record<string, [number, string, string]> = {
      "ATM-0101": [3, "WO-27602", "2026-10-25T07:35:00.000Z"],
      "ATM-0102": [3, "WO-27590", "2026-10-24T18:20:00.000Z"],
      "ATM-0103": [2, "WO-27520", "2026-10-22T10:10:00.000Z"],
      "ATM-0104": [2, "WO-27570", "2026-10-23T12:45:00.000Z"],
      "ATM-0105": [2, "WO-27610", "2026-10-25T06:30:00.000Z"], // latest work is maintenance
      "ATM-0106": [2, "WO-27540", "2026-10-23T08:05:00.000Z"],
      "ATM-0107": [1, "WO-27050", "2026-09-28T15:10:00.000Z"],
    };
    for (const [atmNumber, [count, latestId, latestAt]] of Object.entries(expected)) {
      const { summary } = (await repository.getAtmHistory(atmNumber))!;
      assert.equal(summary.faultCallsInPeriod, count, atmNumber);
      assert.equal(summary.latestWorkOrder?.externalId, latestId, atmNumber);
      assert.equal(summary.latestWorkOrder?.registeredAt.toISOString(), latestAt, atmNumber);
    }
  });

  it("lists exactly the counted fault calls per ATM, newest first", async () => {
    const expected: Record<string, string[]> = {
      "ATM-0101": ["WO-27602", "WO-27480", "WO-27015"],
      "ATM-0102": ["WO-27590", "WO-27455", "WO-27210"],
      "ATM-0103": ["WO-27520", "WO-27350"],
      "ATM-0104": ["WO-27570", "WO-27100"],
      "ATM-0105": ["WO-27495", "WO-27280"],
      "ATM-0106": ["WO-27540", "WO-27410"],
      "ATM-0107": ["WO-27050"],
    };
    for (const [atmNumber, ids] of Object.entries(expected)) {
      const { summary, workOrders } = (await repository.getAtmHistory(atmNumber))!;
      assert.deepEqual(summary.periodFaultCalls.map((w) => w.externalId), ids, atmNumber);
      assert.equal(summary.faultCallsInPeriod, ids.length, atmNumber);
      // Every summary reference points to an existing record of this ATM.
      const historyIds = new Set(workOrders.map((w) => w.id));
      for (const ref of [...summary.periodFaultCalls, summary.latestWorkOrder!]) {
        assert.ok(historyIds.has(ref.id), `${atmNumber}: ${ref.id}`);
      }
    }
  });

  it("excludes maintenance and pre-period closed calls from the count", async () => {
    // ATM-0103: WO-26990 (maintenance, 23.09) and WO-26420 (closed fault, 05.08) are outside.
    const { summary } = (await repository.getAtmHistory("ATM-0103"))!;
    const ids = summary.periodFaultCalls.map((w) => w.externalId);
    assert.ok(!ids.includes("WO-26990"));
    assert.ok(!ids.includes("WO-26420"));
    // ATM-0104: WO-27380 is maintenance inside the period and is not counted.
    const atm0104 = (await repository.getAtmHistory("ATM-0104"))!.summary;
    assert.ok(!atm0104.periodFaultCalls.some((w) => w.externalId === "WO-27380"));
  });

  it("counts a fault call with several visits only once", async () => {
    // ATM-0101: WO-27015 has three visits inside the period but is one fault call.
    const history = (await repository.getAtmHistory("ATM-0101"))!;
    const wo27015 = history.workOrders.find((w) => w.externalId === "WO-27015")!;
    assert.equal(wo27015.visits.length, 3);
    assert.ok(wo27015.visits.every((v) => v.visitedAt >= new Date("2026-09-25T21:00:00Z")));
    assert.equal(history.summary.faultCallsInPeriod, 3);
    assert.equal(
      history.summary.periodFaultCalls.filter((w) => w.externalId === "WO-27015").length,
      1,
    );
  });

  it("summarizes a device without any history", async () => {
    const custom = buildSyntheticDataset();
    custom.atms.push({ id: "syn-atm-test-empty", atmNumber: "ATM-9001", model: "Testmudel" });
    const history = (await createSyntheticRepository(custom).getAtmHistory("ATM-9001"))!;
    assert.deepEqual(history.workOrders, []);
    assert.equal(history.summary.faultCallsInPeriod, 0);
    assert.deepEqual(history.summary.periodFaultCalls, []);
    assert.equal(history.summary.latestWorkOrder, null);
  });

  it("summarizes a device with maintenance only", async () => {
    const custom = buildSyntheticDataset();
    custom.atms.push({ id: "syn-atm-test-maint", atmNumber: "ATM-9002", model: "Testmudel" });
    custom.workOrders.push({
      id: "syn-wo-test-maint",
      atmId: "syn-atm-test-maint",
      externalId: "WO-90001",
      sourceSystem: "TSI-SYNTH",
      workType: "MAINTENANCE",
      status: "CLOSED",
      registeredAt: new Date("2026-10-12T07:00:00Z"),
      faultCode: null,
      originalDescription: "Plaaniline hooldus.",
    });
    const { summary } = (await createSyntheticRepository(custom).getAtmHistory("ATM-9002"))!;
    assert.equal(summary.faultCallsInPeriod, 0);
    assert.equal(summary.latestWorkOrder?.externalId, "WO-90001");
    assert.equal(summary.latestWorkOrder?.workType, "MAINTENANCE");
  });

  it("totals 15 fault calls in the period across all ATMs", async () => {
    let total = 0;
    for (const { atmNumber } of await repository.searchAtms()) {
      total += (await repository.getAtmHistory(atmNumber))!.summary.faultCallsInPeriod;
    }
    assert.equal(total, 15);
  });

  it("accepts the ATM number case-insensitively and returns null for unknown ATMs", async () => {
    assert.equal((await repository.getAtmHistory("atm-0107"))?.atm.atmNumber, "ATM-0107");
    assert.equal(await repository.getAtmHistory("ATM-9999"), null);
  });
});
