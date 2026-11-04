// Offline tests for the seed's safety rules. They run against an in-memory
// fake of the four Prisma models; no database client is created and no
// network connection is made. What the fake cannot prove (real PostgreSQL
// rollback, constraint and timestamp behaviour) is listed in the README.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildSyntheticDataset, type SyntheticDataset } from "./synthetic/dataset";
import {
  describeTarget,
  planSeed,
  resolveSeedMode,
  SEED_TRANSACTION_TIMEOUT_MS,
  seedDatabase,
  SeedRefusedError,
  type SeedClient,
} from "./seeding";

type Row = Record<string, unknown> & { id: string };
type Model = "codeDictionary" | "atm" | "workOrder" | "technicianVisit";
const MODELS: Model[] = ["codeDictionary", "atm", "workOrder", "technicianVisit"];

// Natural keys and parent references, as in prisma/schema.prisma.
const UNIQUE: Record<Model, string[][]> = {
  codeDictionary: [["codeType", "code"]],
  atm: [["atmNumber"]],
  workOrder: [["sourceSystem", "externalId"]],
  technicianVisit: [],
};
const PARENT: Partial<Record<Model, [string, Model]>> = {
  workOrder: ["atmId", "atm"],
  technicianVisit: ["workOrderId", "workOrder"],
};

function matches(row: Row, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "NOT") return !matches(row, condition as Record<string, unknown>);
    if (key === "OR") return (condition as Record<string, unknown>[]).some((c) => matches(row, c));
    const value = row[key];
    if (condition !== null && typeof condition === "object" && !(condition instanceof Date)) {
      const c = condition as { startsWith?: string; in?: unknown[]; notIn?: unknown[] };
      if (c.startsWith !== undefined && !String(value).startsWith(c.startsWith)) return false;
      if (c.in !== undefined && !c.in.includes(value)) return false;
      if (c.notIn !== undefined && c.notIn.includes(value)) return false;
      return true;
    }
    return value === condition;
  });
}

/** In-memory stand-in for the database, with an operation log and simulated rollback. */
function createFakeDatabase(options: { failOn?: (model: Model, id: string) => boolean } = {}) {
  let tables: Record<Model, Map<string, Row>> = {
    codeDictionary: new Map(),
    atm: new Map(),
    workOrder: new Map(),
    technicianVisit: new Map(),
  };
  const log: { model: Model; op: string; id?: string; inTransaction: boolean }[] = [];
  const transactions: { timeout?: number }[] = [];
  let inTransaction = false;

  const snapshot = () =>
    Object.fromEntries(MODELS.map((m) => [m, new Map([...tables[m]].map(([id, r]) => [id, { ...r }]))])) as typeof tables;

  const checkConstraints = (model: Model, row: Row) => {
    const parent = PARENT[model];
    if (parent && !tables[parent[1]].has(row[parent[0]] as string)) {
      throw new Error(`foreign key violation: ${model} ${row.id} → ${parent[1]} ${String(row[parent[0]])}`);
    }
    for (const fields of UNIQUE[model]) {
      for (const other of tables[model].values()) {
        if (other.id !== row.id && fields.every((f) => other[f] === row[f])) {
          throw new Error(`unique violation: ${model}(${fields.join(", ")})`);
        }
      }
    }
  };

  const delegate = (model: Model) => {
    const allowed = {
      async findMany({ where }: { where?: Record<string, unknown> }) {
        log.push({ model, op: "findMany", inTransaction });
        return [...tables[model].values()].filter((r) => matches(r, where)).map((r) => ({ ...r }));
      },
      async count({ where }: { where?: Record<string, unknown> }) {
        log.push({ model, op: "count", inTransaction });
        return [...tables[model].values()].filter((r) => matches(r, where)).length;
      },
      async upsert({ where, create, update }: { where: { id: string }; create: Row; update: Record<string, unknown> }) {
        log.push({ model, op: "upsert", id: where.id, inTransaction });
        if (options.failOn?.(model, where.id)) throw new Error(`simulated failure writing ${where.id}`);
        const existing = tables[model].get(where.id);
        const row = existing ? { ...existing, ...update } : { ...create };
        checkConstraints(model, row as Row);
        tables[model].set(where.id, row as Row);
        return row;
      },
    };
    // Any other method (delete, deleteMany, updateMany, createMany, …) is a test failure.
    return new Proxy(allowed, {
      get(target, property) {
        if (property in target) return target[property as keyof typeof target];
        throw new Error(`seed called forbidden method ${model}.${String(property)}`);
      },
    });
  };

  const tx = Object.fromEntries(MODELS.map((m) => [m, delegate(m)]));
  const client = new Proxy(
    {
      ...tx,
      async $transaction<R>(fn: (t: never) => Promise<R>, opts?: { timeout?: number }) {
        transactions.push({ ...opts });
        const before = snapshot();
        inTransaction = true;
        try {
          return await fn(tx as never);
        } catch (error) {
          tables = before; // what PostgreSQL does when the interactive transaction fails
          throw error;
        } finally {
          inTransaction = false;
        }
      },
    },
    {
      get(target, property) {
        if (property in target) return target[property as keyof typeof target];
        throw new Error(`seed called forbidden client method ${String(property)}`);
      },
    },
  );

  return {
    client: client as unknown as SeedClient,
    log,
    transactions,
    rows: (model: Model) => [...tables[model].values()],
    snapshot,
    insert(model: Model, row: Row) {
      tables[model].set(row.id, row);
    },
  };
}

// Records that are not part of the synthetic dataset and must never be touched.
function insertUnrelated(db: ReturnType<typeof createFakeDatabase>) {
  db.insert("codeDictionary", { id: "imp-code-1", codeType: "FAULT", code: "X-900", description: "Imported code" });
  db.insert("atm", { id: "imp-atm-1", atmNumber: "ATM-9001", model: "Imported model" });
  db.insert("workOrder", {
    id: "imp-wo-1", atmId: "imp-atm-1", externalId: "AX-1", sourceSystem: "AX", workType: "FAULT_CALL",
    status: "OPEN", registeredAt: new Date("2026-10-01T08:00:00Z"), faultCode: "X-900", originalDescription: "Imported",
  });
  db.insert("technicianVisit", {
    id: "imp-visit-1", workOrderId: "imp-wo-1", visitedAt: new Date("2026-10-02T08:00:00Z"),
    actions: "Imported", originalComment: null, resolutionCode: null, outcome: null,
  });
}

const EXPECTED = { codes: 12, atms: 7, workOrders: 38, technicianVisits: 37 };

describe("seed opt-in", () => {
  it("only plans without --apply, and writes only with it", () => {
    assert.equal(resolveSeedMode([], {}), "plan");
    assert.equal(resolveSeedMode(["--apply"], {}), "apply");
    assert.equal(resolveSeedMode(["--apply"], { npm_lifecycle_event: "db:seed" }), "apply");
    assert.equal(resolveSeedMode([], { npm_lifecycle_event: "db:seed" }), "plan");
  });

  it("refuses to run from any other npm script, even with --apply", () => {
    for (const script of ["build", "prebuild", "postbuild", "start", "dev", "install", "postinstall", "db:migrate:deploy", "predeploy"]) {
      assert.throws(() => resolveSeedMode(["--apply"], { npm_lifecycle_event: script }), SeedRefusedError, script);
    }
  });

  it("rejects unknown arguments instead of guessing", () => {
    for (const argv of [["--force"], ["apply"], ["--apply", "--yes"], ["-a"]]) {
      assert.throws(() => resolveSeedMode(argv, {}), SeedRefusedError, argv.join(" "));
    }
  });

  it("is not wired into install, build, start or migration deployment", () => {
    const { scripts } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      scripts: Record<string, string>;
    };
    for (const [name, command] of Object.entries(scripts)) {
      if (name !== "db:seed") assert.doesNotMatch(command, /seed/, `script "${name}" must not run the seed`);
    }
    assert.equal(scripts["db:seed"], "tsx prisma/seed.ts");
    // Prisma runs a configured seed automatically after some migrate commands; none is configured.
    assert.doesNotMatch(readFileSync(new URL("../prisma.config.ts", import.meta.url), "utf8"), /seed\s*:/);
    // The migrations only create structure; they insert no data.
    assert.doesNotMatch(
      readFileSync(new URL("./migrations/20261104085337_init/migration.sql", import.meta.url), "utf8"),
      /\b(INSERT|COPY)\b/i,
    );
  });

  it("keeps the seeding logic free of database clients and connection settings", () => {
    const source = readFileSync(new URL("./seeding.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /new PrismaClient|@prisma\/adapter-pg|process\.env\.DATABASE_URL|from "pg"/);
    assert.match(source, /^import type \{ Prisma \} from "\.\.\/src\/generated\/prisma\/client";$/m);
  });
});

describe("seed plan (offline)", () => {
  it("covers the complete synthetic dataset", () => {
    assert.deepEqual(planSeed(buildSyntheticDataset()), EXPECTED);
  });

  it("refuses records outside the reserved synthetic ID space or source system", () => {
    const foreignId = buildSyntheticDataset();
    foreignId.atms[0] = { ...foreignId.atms[0], id: "atm-real-1" };
    assert.throws(() => planSeed(foreignId), /not reserved synthetic/);

    const foreignSource = buildSyntheticDataset();
    foreignSource.workOrders[0] = { ...foreignSource.workOrders[0], sourceSystem: "AX" };
    assert.throws(() => planSeed(foreignSource), /source system is not TSI-SYNTH/);
  });

  it("refuses broken relationships before anything is written", async () => {
    const dataset = buildSyntheticDataset();
    dataset.technicianVisits[0] = { ...dataset.technicianVisits[0], workOrderId: "syn-wo-missing" };
    const db = createFakeDatabase();
    await assert.rejects(seedDatabase(db.client, dataset), /Synthetic dataset is invalid/);
    assert.equal(db.transactions.length, 0);
    assert.equal(db.log.length, 0);
  });
});

describe("seedDatabase against an in-memory fake", () => {
  it("writes the dataset in one transaction, parents before children, with nothing outside it", async () => {
    const db = createFakeDatabase();
    const result = await seedDatabase(db.client, buildSyntheticDataset());

    assert.deepEqual(result, { stored: EXPECTED, obsolete: [] });
    assert.deepEqual(db.transactions, [{ timeout: SEED_TRANSACTION_TIMEOUT_MS }]);
    assert.ok(db.log.every((entry) => entry.inTransaction), "every read and write runs inside the transaction");

    const upsertOrder = db.log.filter((e) => e.op === "upsert").map((e) => e.model);
    const firstIndex = (m: Model) => upsertOrder.indexOf(m);
    const lastIndex = (m: Model) => upsertOrder.lastIndexOf(m);
    assert.ok(lastIndex("codeDictionary") < firstIndex("atm"));
    assert.ok(lastIndex("atm") < firstIndex("workOrder"));
    assert.ok(lastIndex("workOrder") < firstIndex("technicianVisit"));
  });

  it("stores the records exactly as defined, keeping IDs and relationships", async () => {
    const dataset: SyntheticDataset = buildSyntheticDataset();
    const db = createFakeDatabase();
    await seedDatabase(db.client, dataset);
    assert.deepEqual(db.rows("atm"), dataset.atms);
    assert.deepEqual(db.rows("workOrder"), dataset.workOrders);
    assert.deepEqual(db.rows("technicianVisit"), dataset.technicianVisits);
    assert.deepEqual(db.rows("codeDictionary"), dataset.codes);
  });

  it("is idempotent: a second run creates no duplicates and changes nothing", async () => {
    const db = createFakeDatabase();
    await seedDatabase(db.client, buildSyntheticDataset());
    const afterFirst = db.snapshot();
    const second = await seedDatabase(db.client, buildSyntheticDataset());
    assert.deepEqual(second.stored, EXPECTED);
    assert.deepEqual(db.snapshot(), afterFirst);
  });

  it("leaves unrelated records untouched and never deletes", async () => {
    const db = createFakeDatabase();
    insertUnrelated(db);
    const unrelatedBefore = MODELS.map((m) => db.rows(m).filter((r) => r.id.startsWith("imp-")));

    await seedDatabase(db.client, buildSyntheticDataset());
    await seedDatabase(db.client, buildSyntheticDataset());

    assert.deepEqual(MODELS.map((m) => db.rows(m).filter((r) => r.id.startsWith("imp-"))), unrelatedBefore);
    assert.ok(db.log.filter((e) => e.op === "upsert").every((e) => e.id?.startsWith("syn-")), "only syn- IDs are written");
    assert.deepEqual([...new Set(db.log.map((e) => e.op))].sort(), ["count", "findMany", "upsert"]);
  });

  it("aborts without any write when a natural key belongs to a non-synthetic record", async () => {
    const db = createFakeDatabase();
    db.insert("atm", { id: "imp-atm-2", atmNumber: "ATM-0101", model: "Imported model" });
    db.insert("codeDictionary", { id: "imp-code-2", codeType: "FAULT", code: buildSyntheticDataset().codes[0].code, description: "Imported" });
    const before = db.snapshot();

    await assert.rejects(seedDatabase(db.client, buildSyntheticDataset()), (error: Error) => {
      assert.match(error.message, /^Aborted without changes/);
      assert.match(error.message, /ATM number ATM-0101/);
      assert.match(error.message, /code FAULT:/);
      return true;
    });
    assert.equal(db.log.filter((e) => e.op === "upsert").length, 0);
    assert.deepEqual(db.snapshot(), before);
  });

  it("propagates a mid-seed failure out of the transaction, so nothing is kept", async () => {
    const db = createFakeDatabase({ failOn: (model, id) => model === "workOrder" && id === buildSyntheticDataset().workOrders[20].id });
    insertUnrelated(db);
    const before = db.snapshot();

    await assert.rejects(seedDatabase(db.client, buildSyntheticDataset()), /simulated failure/);
    // Earlier upserts happened inside the same transaction, so its rollback covers them.
    assert.ok(db.log.filter((e) => e.op === "upsert").length > 20);
    assert.ok(db.log.every((e) => e.inTransaction));
    assert.deepEqual(db.snapshot(), before);
  });

  it("reports synthetic records that left the dataset and keeps them", async () => {
    const db = createFakeDatabase();
    await seedDatabase(db.client, buildSyntheticDataset());
    db.insert("codeDictionary", { id: "syn-code-retired", codeType: "FAULT", code: "OLD-1", description: "Retired" });

    const result = await seedDatabase(db.client, buildSyntheticDataset());
    assert.deepEqual(result.obsolete, ["syn-code-retired"]);
    assert.ok(db.rows("codeDictionary").some((r) => r.id === "syn-code-retired"));
  });
});

describe("describeTarget", () => {
  it("shows host, port and database only, never credentials or parameters", () => {
    const target = describeTarget("postgresql://user:pa55word@db.example.invalid:5432/tsi?sslmode=require&password=x");
    assert.equal(target, "db.example.invalid:5432/tsi");
    assert.equal(describeTarget("not a url"), "(unparseable DATABASE_URL)");
  });
});
