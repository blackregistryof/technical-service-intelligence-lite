import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSyntheticRepository } from "../data/synthetic-repository";
import { describeCompleteness, type CompletenessState } from "./completeness";

const repository = createSyntheticRepository();

async function states(id: string): Promise<Record<string, CompletenessState>> {
  const workOrder = (await repository.getWorkOrder(id))!;
  return Object.fromEntries(describeCompleteness(workOrder).map((i) => [i.key, i.state]));
}

describe("describeCompleteness", () => {
  it("reports everything present for HOLD call WO-27480", async () => {
    assert.deepEqual(await states("syn-wo-wo-27480"), {
      faultCode: "present",
      description: "present",
      visit: "present",
      visitComment: "present",
    });
  });

  it("reports the missing latest comment of HOLD call WO-27520", async () => {
    assert.deepEqual(await states("syn-wo-wo-27520"), {
      faultCode: "present",
      description: "present",
      visit: "present",
      visitComment: "missing",
    });
  });

  it("reports no visits for OPEN call WO-27602; the comment is not applicable", async () => {
    assert.deepEqual(await states("syn-wo-wo-27602"), {
      faultCode: "present",
      description: "present",
      visit: "missing",
      visitComment: "notApplicable",
    });
  });

  it("does not expect a fault code on maintenance orders", async () => {
    assert.equal((await states("syn-wo-wo-25390")).faultCode, "notApplicable");
    assert.equal((await states("syn-wo-wo-27610")).visit, "missing"); // open maintenance
  });

  it("checks the latest visit only (WO-27455 has two commented visits)", async () => {
    assert.equal((await states("syn-wo-wo-27455")).visitComment, "present");
  });

  it("returns the four checks in a fixed order", async () => {
    const workOrder = (await repository.getWorkOrder("syn-wo-wo-27015"))!;
    assert.deepEqual(
      describeCompleteness(workOrder).map((i) => i.key),
      ["faultCode", "description", "visit", "visitComment"],
    );
  });

  it("detects missing values in constructed records", () => {
    const result = describeCompleteness({
      workType: "FAULT_CALL",
      faultCode: null,
      originalDescription: "   ",
      visits: [],
    });
    assert.deepEqual(
      result.map((i) => i.state),
      ["missing", "missing", "missing", "notApplicable"],
    );
  });

  it("never reports an item missing for any fault call unless the source field is absent", async () => {
    for (const call of await repository.listActiveFaultCalls()) {
      const workOrder = (await repository.getWorkOrder(call.id))!;
      const result = Object.fromEntries(describeCompleteness(workOrder).map((i) => [i.key, i.state]));
      assert.equal(result.faultCode === "present", workOrder.faultCode !== null, call.externalId);
      assert.equal(result.visit === "present", workOrder.visits.length > 0, call.externalId);
    }
  });
});
