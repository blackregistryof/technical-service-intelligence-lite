import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSyntheticRepository } from "../data/synthetic-repository";
import { periodEndingOn } from "./analysis";
import { groupByMonth, monthKeyInZone, periodStartIndex } from "./timeline";

const repository = createSyntheticRepository();
const at = (iso: string) => ({ registeredAt: new Date(iso) });

describe("monthKeyInZone (Europe/Tallinn)", () => {
  it("uses the Estonian calendar month, not the UTC month", () => {
    assert.equal(monthKeyInZone(new Date("2026-09-30T20:59:00Z")), "2026-09"); // 30.09 23:59 EEST
    assert.equal(monthKeyInZone(new Date("2026-09-30T21:00:00Z")), "2026-10"); // 01.10 00:00 EEST
    assert.equal(monthKeyInZone(new Date("2026-09-30T22:30:00Z")), "2026-10");
  });

  it("handles winter time and the spring daylight-saving change", () => {
    assert.equal(monthKeyInZone(new Date("2026-10-31T21:59:00Z")), "2026-10"); // 31.10 23:59 EET
    assert.equal(monthKeyInZone(new Date("2026-10-31T22:00:00Z")), "2026-11"); // 01.11 00:00 EET
    assert.equal(monthKeyInZone(new Date("2026-03-31T21:30:00Z")), "2026-04"); // 01.04 00:30 EEST
    assert.equal(monthKeyInZone(new Date("2026-12-31T22:30:00Z")), "2027-01"); // year change
  });

  it("supports other time zones", () => {
    assert.equal(monthKeyInZone(new Date("2026-09-30T22:30:00Z"), "UTC"), "2026-09");
  });
});

describe("groupByMonth", () => {
  it("groups ATM-0101 history into months without reordering", async () => {
    const { workOrders } = (await repository.getAtmHistory("ATM-0101"))!;
    assert.deepEqual(
      groupByMonth(workOrders).map((g) => [g.monthKey, g.items.map((w) => w.externalId)]),
      [
        ["2026-10", ["WO-27602", "WO-27480"]],
        ["2026-09", ["WO-27015"]],
        ["2026-07", ["WO-26102"]],
        ["2026-05", ["WO-25390"]],
        ["2026-03", ["WO-24811"]],
      ],
    );
  });

  it("keeps every item exactly once", async () => {
    for (const atm of await repository.searchAtms()) {
      const { workOrders } = (await repository.getAtmHistory(atm.atmNumber))!;
      const flattened = groupByMonth(workOrders).flatMap((g) => g.items);
      assert.deepEqual(flattened, workOrders, atm.atmNumber);
    }
  });

  it("returns no groups for an empty history", () => {
    assert.deepEqual(groupByMonth([]), []);
  });

  it("puts a record at 30.09 22:30 UTC into October (Estonian time)", () => {
    const groups = groupByMonth([at("2026-10-02T10:00:00Z"), at("2026-09-30T22:30:00Z")]);
    assert.deepEqual(groups.map((g) => [g.monthKey, g.items.length]), [["2026-10", 2]]);
  });
});

describe("periodStartIndex", () => {
  it("places the 26.09.2026 boundary between WO-27015 and WO-26102 for ATM-0101", async () => {
    const { workOrders } = (await repository.getAtmHistory("ATM-0101"))!;
    const index = periodStartIndex(workOrders);
    assert.equal(index, 3);
    assert.equal(workOrders[index! - 1].externalId, "WO-27015");
    assert.equal(workOrders[index!].externalId, "WO-26102");
  });

  it("is consistent with the summary count for every ATM", async () => {
    for (const atm of await repository.searchAtms()) {
      const { workOrders, summary } = (await repository.getAtmHistory(atm.atmNumber))!;
      const index = periodStartIndex(workOrders) ?? workOrders.length;
      const faultCallsBeforeBoundary = workOrders
        .slice(0, index)
        .filter((w) => w.workType === "FAULT_CALL").length;
      assert.equal(faultCallsBeforeBoundary, summary.faultCallsInPeriod, atm.atmNumber);
    }
  });

  it("uses the exact local boundary instant", () => {
    const items = [at("2026-09-25T21:00:00.000Z"), at("2026-09-25T20:59:59.999Z")];
    assert.equal(periodStartIndex(items), 1);
  });

  it("returns 0 when everything is older and null when nothing is older", () => {
    assert.equal(periodStartIndex([at("2026-08-01T10:00:00Z")]), 0);
    assert.equal(periodStartIndex([at("2026-10-01T10:00:00Z")]), null);
    assert.equal(periodStartIndex([]), null);
  });

  it("accepts other periods", () => {
    const oneDay = periodEndingOn("2026-10-25", 1);
    const items = [at("2026-10-25T07:35:00Z"), at("2026-10-24T18:20:00Z")];
    assert.equal(periodStartIndex(items, oneDay), 1);
  });
});
