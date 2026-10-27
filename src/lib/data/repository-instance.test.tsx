import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DeviceWorkspace } from "@/components/devices/DeviceWorkspace";
import { getRepository } from "@/lib/data/repository-instance";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// Shape returned by searchAtms() before UI Step 5 (no activeByStatus / faultCallsInPeriod).
const staleRepository = {
  searchAtms: async () => [
    { id: "syn-atm-atm-0101", atmNumber: "ATM-0101", model: "Kassaline K5", activeFaultCallCount: 2 },
  ],
};

describe("getRepository (the data path of the Seadmed pages)", () => {
  it("ignores a stale repository instance left on globalThis by an older module version", async () => {
    // A long-running `next dev` keeps globalThis across hot reloads; the old cache lived there.
    (globalThis as Record<string, unknown>).tsiRepository = staleRepository;
    try {
      const repository = getRepository();
      assert.notEqual(repository, staleRepository);
      const [first] = await repository.searchAtms();
      assert.deepEqual(first.activeByStatus, { OPEN: 1, HOLD: 1 });
    } finally {
      delete (globalThis as Record<string, unknown>).tsiRepository;
    }
  });

  it("reuses one instance within the module", () => {
    assert.equal(getRepository(), getRepository());
  });

  it("returns the full AtmListItem contract for all seven ATMs", async () => {
    const atms = await getRepository().searchAtms("");
    assert.equal(atms.length, 7);
    for (const atm of atms) {
      assert.deepEqual(
        Object.keys(atm).sort(),
        ["activeByStatus", "activeFaultCallCount", "atmNumber", "faultCallsInPeriod", "id", "model"],
        atm.atmNumber,
      );
      assert.equal(typeof atm.activeByStatus.OPEN, "number", atm.atmNumber);
      assert.equal(typeof atm.activeByStatus.HOLD, "number", atm.atmNumber);
    }
  });

  it("renders /seadmed with all seven ATMs exactly like SeadmedPage", async () => {
    // SeadmedPage: <DeviceWorkspace atms={await repository.searchAtms(query)} query={query} />
    const atms = await getRepository().searchAtms("");
    const content = text(renderToStaticMarkup(<DeviceWorkspace atms={atms} query="" />));
    assert.ok(content.includes("Automaate kokku: 7."));
    for (const expected of [
      "ATM-0101 Kassaline K5 1 avatud 1 ootel 3 / 30 p",
      "ATM-0102 Kassaline K5 1 avatud 1 ootel 3 / 30 p",
      "ATM-0103 Kassaline K7 1 ootel 2 / 30 p",
      "ATM-0104 Numera DX-200 1 avatud 2 / 30 p",
      "ATM-0105 Numera DX-200 1 ootel 2 / 30 p",
      "ATM-0106 Kassaline K7 2 avatud 2 / 30 p",
      "ATM-0107 Numera DX-300 Aktiivseid rikketeateid pole 1 / 30 p",
    ]) {
      assert.ok(content.includes(expected), expected);
    }
  });

  it("renders /seadmed/ATM-0101 exactly like AtmHistoryPage", async () => {
    const repository = getRepository();
    const history = await repository.getAtmHistory("ATM-0101");
    assert.ok(history);
    const content = text(
      renderToStaticMarkup(
        <DeviceWorkspace atms={await repository.searchAtms("")} query="" history={history} workType={null} />,
      ),
    );
    assert.ok(content.includes("Automaat ATM-0101"));
    assert.ok(content.includes("Tööde ajalugu (6 töökäsku)"));
    assert.ok(content.includes("3 rikketeadet"));
  });
});
