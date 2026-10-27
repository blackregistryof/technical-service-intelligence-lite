import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSyntheticRepository } from "../data/synthetic-repository";
import {
  countActiveFaultCalls,
  countByStatus,
  countByWorkType,
  filterByStatus,
  filterByWorkType,
  parseStatusFilter,
  parseWorkTypeFilter,
} from "./filters";

const repository = createSyntheticRepository();

describe("parseStatusFilter", () => {
  it("accepts OPEN and HOLD, case-insensitively and trimmed", () => {
    assert.equal(parseStatusFilter("OPEN"), "OPEN");
    assert.equal(parseStatusFilter(" hold "), "HOLD");
    assert.equal(parseStatusFilter(["Hold", "OPEN"]), "HOLD");
  });

  it("treats missing, empty, unknown and CLOSED values as no filter", () => {
    for (const value of [undefined, "", "  ", "CLOSED", "ootel", "OPEN;DROP", []]) {
      assert.equal(parseStatusFilter(value as string | string[] | undefined), null, String(value));
    }
  });
});

describe("parseWorkTypeFilter", () => {
  it("accepts FAULT_CALL and MAINTENANCE only", () => {
    assert.equal(parseWorkTypeFilter("fault_call"), "FAULT_CALL");
    assert.equal(parseWorkTypeFilter("MAINTENANCE"), "MAINTENANCE");
    assert.equal(parseWorkTypeFilter("VISIT"), null);
    assert.equal(parseWorkTypeFilter(undefined), null);
  });
});

describe("filterByStatus on the active fault-call list", () => {
  it("keeps all 9 calls without a filter and does not mutate the input", async () => {
    const calls = await repository.listActiveFaultCalls();
    const result = filterByStatus(calls, null);
    assert.equal(result.length, 9);
    assert.notEqual(result, calls);
  });

  it("returns the 4 HOLD and 5 OPEN calls, preserving newest-first order", async () => {
    const calls = await repository.listActiveFaultCalls();
    assert.deepEqual(
      filterByStatus(calls, "HOLD").map((c) => c.externalId),
      ["WO-27520", "WO-27480", "WO-27495", "WO-27455"],
    );
    assert.deepEqual(
      filterByStatus(calls, "OPEN").map((c) => c.externalId),
      ["WO-27602", "WO-27590", "WO-27570", "WO-27540", "WO-27410"],
    );
  });

  it("combines with search without reordering", async () => {
    const calls = await repository.listActiveFaultCalls("ATM-0101");
    assert.deepEqual(filterByStatus(calls, "OPEN").map((c) => c.externalId), ["WO-27602"]);
    assert.deepEqual(filterByStatus(calls, "HOLD").map((c) => c.externalId), ["WO-27480"]);
  });
});

describe("countByStatus", () => {
  it("counts the active list exactly (9 = 5 OPEN + 4 HOLD)", async () => {
    assert.deepEqual(countByStatus(await repository.listActiveFaultCalls()), {
      total: 9,
      OPEN: 5,
      HOLD: 4,
      CLOSED: 0,
    });
  });

  it("returns zeros for an empty list", () => {
    assert.deepEqual(countByStatus([]), { total: 0, OPEN: 0, HOLD: 0, CLOSED: 0 });
  });
});

describe("work-type filter and counts on ATM history", () => {
  it("splits ATM-0101 history into 5 fault calls and 1 maintenance order", async () => {
    const { workOrders } = (await repository.getAtmHistory("ATM-0101"))!;
    assert.deepEqual(countByWorkType(workOrders), { total: 6, FAULT_CALL: 5, MAINTENANCE: 1 });
    assert.deepEqual(
      filterByWorkType(workOrders, "MAINTENANCE").map((w) => w.externalId),
      ["WO-25390"],
    );
    assert.deepEqual(
      filterByWorkType(workOrders, "FAULT_CALL").map((w) => w.externalId),
      ["WO-27602", "WO-27480", "WO-27015", "WO-26102", "WO-24811"],
    );
  });
});

describe("countActiveFaultCalls per ATM", () => {
  it("matches the dataset and never counts maintenance orders", async () => {
    const expected: Record<string, { OPEN: number; HOLD: number }> = {
      "ATM-0101": { OPEN: 1, HOLD: 1 },
      "ATM-0102": { OPEN: 1, HOLD: 1 },
      "ATM-0103": { OPEN: 0, HOLD: 1 },
      "ATM-0104": { OPEN: 1, HOLD: 0 },
      "ATM-0105": { OPEN: 0, HOLD: 1 }, // its OPEN maintenance order WO-27610 is excluded
      "ATM-0106": { OPEN: 2, HOLD: 0 },
      "ATM-0107": { OPEN: 0, HOLD: 0 },
    };
    for (const [atmNumber, counts] of Object.entries(expected)) {
      const { workOrders } = (await repository.getAtmHistory(atmNumber))!;
      assert.deepEqual(countActiveFaultCalls(workOrders), counts, atmNumber);
    }
  });

  it("agrees with the repository's active fault-call count", async () => {
    for (const atm of await repository.searchAtms()) {
      const { workOrders } = (await repository.getAtmHistory(atm.atmNumber))!;
      const counts = countActiveFaultCalls(workOrders);
      assert.equal(counts.OPEN + counts.HOLD, atm.activeFaultCallCount, atm.atmNumber);
    }
  });
});
