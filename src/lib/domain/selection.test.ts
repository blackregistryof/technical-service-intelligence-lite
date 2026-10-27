import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSyntheticRepository } from "../data/synthetic-repository";
import { filterByStatus } from "./filters";
import { selectionState } from "./selection";

const repository = createSyntheticRepository();

describe("selectionState", () => {
  it("is 'none' without a selection", async () => {
    assert.equal(selectionState(null, await repository.listActiveFaultCalls()), "none");
  });

  it("is 'inList' when the selected active call is visible", async () => {
    const selected = (await repository.getWorkOrder("syn-wo-wo-27480"))!;
    assert.equal(selectionState(selected, await repository.listActiveFaultCalls()), "inList");
  });

  it("is 'filteredOut' when the status filter hides the selected call", async () => {
    const selected = (await repository.getWorkOrder("syn-wo-wo-27480"))!; // HOLD
    const openOnly = filterByStatus(await repository.listActiveFaultCalls(), "OPEN");
    assert.equal(selectionState(selected, openOnly), "filteredOut");
  });

  it("is 'filteredOut' when the search hides the selected call", async () => {
    const selected = (await repository.getWorkOrder("syn-wo-wo-27480"))!; // ATM-0101
    assert.equal(selectionState(selected, await repository.listActiveFaultCalls("ATM-0102")), "filteredOut");
  });

  it("is 'notActive' for a closed call, whatever the list shows", async () => {
    const closed = (await repository.getWorkOrder("syn-wo-wo-27015"))!;
    assert.equal(selectionState(closed, await repository.listActiveFaultCalls()), "notActive");
    assert.equal(selectionState(closed, []), "notActive");
  });

  it("treats maintenance orders as not active fault calls", async () => {
    const maintenance = (await repository.getWorkOrder("syn-wo-wo-27610"))!; // OPEN maintenance
    assert.equal(selectionState(maintenance, await repository.listActiveFaultCalls()), "notActive");
  });
});
