import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DeviceWorkspace } from "@/components/devices/DeviceWorkspace";
import { getRepository } from "@/lib/data/repository-instance";
import { DataSourceConfigError } from "@/lib/data/source";

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

  it("fails closed for invalid production configuration and unavailable PostgreSQL, never falling back", async () => {
    const saved = { DATA_SOURCE: process.env.DATA_SOURCE, NODE_ENV: process.env.NODE_ENV };
    const env = process.env as Record<string, string | undefined>;
    const setEnv = (DATA_SOURCE: string | undefined, NODE_ENV: string) => {
      if (DATA_SOURCE === undefined) delete env.DATA_SOURCE;
      else env.DATA_SOURCE = DATA_SOURCE;
      env.NODE_ENV = NODE_ENV;
    };
    const unusedClient = () => {
      throw new Error("must not be created");
    };
    const missingUrl = () => {
      throw new Error("DATABASE_URL is not set.");
    };
    const leakyFailure = () => {
      throw new Error("bad url postgresql://tsi:s3cret@db.example.invalid:5432/tsi");
    };
    const cases: [string | undefined, string, (() => never) | undefined, RegExp][] = [
      ["synthetic", "production", unusedClient, /not allowed in production/],
      [undefined, "production", unusedClient, /not set/],
      ["unknown", "production", unusedClient, /Unsupported DATA_SOURCE value/],
      ["postgres", "production", undefined, /no PostgreSQL client is available/],
      ["postgres", "development", undefined, /no PostgreSQL client is available/],
      ["postgres", "production", missingUrl, /could not be created: DATABASE_URL is not set\./],
      ["postgres", "production", leakyFailure, /could not be created: bad url postgresql:\/\/\[redacted\]$/],
    ];
    try {
      // The synthetic instance is already cached by the tests above; it must not be returned.
      assert.ok(getRepository());
      for (const [DATA_SOURCE, NODE_ENV, client, message] of cases) {
        setEnv(DATA_SOURCE, NODE_ENV);
        assert.throws(
          () => getRepository(client),
          (error) => error instanceof DataSourceConfigError && message.test(error.message) && !error.message.includes("s3cret"),
          `${DATA_SOURCE} / ${NODE_ENV}`,
        );
      }

      // A working PostgreSQL selection uses the PostgreSQL adapter, not the synthetic data.
      setEnv("postgres", "production");
      let created = 0;
      const emptyDelegate = { findMany: async () => [], findFirst: async () => null, findUnique: async () => null, groupBy: async () => [] };
      const repository = getRepository(() => {
        created++;
        return { atm: emptyDelegate, workOrder: emptyDelegate, codeDictionary: emptyDelegate } as never;
      });
      assert.deepEqual(await repository.searchAtms(""), []);
      assert.deepEqual(await repository.listActiveFaultCalls(), []);
      assert.equal(created, 1);
      assert.equal(getRepository(unusedClient), repository, "the PostgreSQL repository is reused");
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete env[key];
        else env[key] = value;
      }
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
