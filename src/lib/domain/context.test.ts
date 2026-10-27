import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSyntheticRepository } from "../data/synthetic-repository";
import { buildFaultCallContext } from "./context";

const repository = createSyntheticRepository();
const history = async (atmNumber: string) => (await repository.getAtmHistory(atmNumber))!;

describe("buildFaultCallContext", () => {
  it("builds the ATM-0101 context for HOLD call WO-27480", async () => {
    const context = buildFaultCallContext(await history("ATM-0101"), "syn-wo-wo-27480");
    assert.equal(context.atm.atmNumber, "ATM-0101");
    assert.equal(context.atm.model, "Kassaline K5");
    assert.deepEqual(context.otherActiveFaultCalls.map((w) => w.externalId), ["WO-27602"]);
    assert.deepEqual(
      context.recentWorkOrders.map((w) => w.externalId),
      ["WO-27602", "WO-27480", "WO-27015", "WO-26102", "WO-25390"],
    );
    assert.equal(context.totalWorkOrders, 6);
    assert.equal(context.summary.faultCallsInPeriod, 3);
  });

  it("excludes the current call but lists all other active calls for a closed call", async () => {
    const context = buildFaultCallContext(await history("ATM-0101"), "syn-wo-wo-27015");
    assert.deepEqual(
      context.otherActiveFaultCalls.map((w) => [w.externalId, w.status]),
      [
        ["WO-27602", "OPEN"],
        ["WO-27480", "HOLD"],
      ],
    );
  });

  it("never lists maintenance orders as active fault calls (ATM-0105, WO-27610)", async () => {
    const context = buildFaultCallContext(await history("ATM-0105"), "syn-wo-wo-27495");
    assert.deepEqual(context.otherActiveFaultCalls, []);
    // The open maintenance order is still the most recent work.
    assert.equal(context.recentWorkOrders[0].externalId, "WO-27610");
    assert.equal(context.recentWorkOrders[0].workType, "MAINTENANCE");
  });

  it("returns an empty list when the ATM has no other active calls", async () => {
    const context = buildFaultCallContext(await history("ATM-0107"), "syn-wo-wo-27050");
    assert.deepEqual(context.otherActiveFaultCalls, []);
    assert.deepEqual(context.recentWorkOrders.map((w) => w.externalId), ["WO-27050", "WO-26200"]);
    assert.equal(context.totalWorkOrders, 2);
  });

  it("respects the recent-work limit", async () => {
    const atm = await history("ATM-0102");
    assert.equal(buildFaultCallContext(atm, "x", 2).recentWorkOrders.length, 2);
    assert.equal(buildFaultCallContext(atm, "x", 0).recentWorkOrders.length, 0);
    assert.equal(buildFaultCallContext(atm, "x", 99).recentWorkOrders.length, 6);
  });

  it("only references existing records of the same ATM", async () => {
    for (const atm of await repository.searchAtms()) {
      const atmHistory = await history(atm.atmNumber);
      const ids = new Set(atmHistory.workOrders.map((w) => w.id));
      for (const workOrder of atmHistory.workOrders) {
        const context = buildFaultCallContext(atmHistory, workOrder.id);
        for (const ref of [...context.otherActiveFaultCalls, ...context.recentWorkOrders]) {
          assert.ok(ids.has(ref.id), `${atm.atmNumber}: ${ref.id}`);
        }
        assert.ok(!context.otherActiveFaultCalls.some((w) => w.id === workOrder.id));
      }
    }
  });

  it("does not depend on the input order and does not mutate it", async () => {
    const atmHistory = await history("ATM-0101");
    const shuffled = { ...atmHistory, workOrders: [...atmHistory.workOrders].reverse() };
    const before = shuffled.workOrders.map((w) => w.id);
    const context = buildFaultCallContext(shuffled, "syn-wo-wo-27480");
    assert.equal(context.recentWorkOrders[0].externalId, "WO-27602");
    assert.deepEqual(shuffled.workOrders.map((w) => w.id), before);
  });

  it("returns reference fields only", async () => {
    const context = buildFaultCallContext(await history("ATM-0101"), "syn-wo-wo-27480");
    assert.deepEqual(Object.keys(context.recentWorkOrders[0]).sort(), [
      "externalId",
      "id",
      "registeredAt",
      "status",
      "workType",
    ]);
  });
});
