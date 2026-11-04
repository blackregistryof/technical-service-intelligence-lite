// Offline tests for the PostgreSQL adapter. Nothing here connects to a
// database or the network. Three layers:
//
// 1. Compiled SQL: the real Prisma client and query compiler, with a recording
//    driver adapter that captures each SQL statement and returns no rows.
//    This pins the generated filters, ordering and LIKE escaping, but cannot
//    show what PostgreSQL returns.
// 2. Parity: an in-memory fake of the Prisma calls the adapter makes, backed
//    by the synthetic dataset, with PostgreSQL ILIKE semantics. The adapter's
//    results are compared with the synthetic adapter's. The fake is our model
//    of Prisma and PostgreSQL, not the real thing.
// 3. Failures: errors are reported without connection details and never
//    replaced by other data.
//
// Behaviour against a real PostgreSQL database is listed in the README as
// pending integration testing.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PrismaClient } from "../../generated/prisma/client";
import { buildSyntheticDataset } from "../../../prisma/synthetic/dataset";
import {
  createPostgresRepository,
  DataSourceUnavailableError,
  escapeLikePattern,
  redactConnectionDetails,
  type PostgresRepositoryClient,
} from "./postgres-repository";
import { createSyntheticRepository } from "./synthetic-repository";

// ---------------------------------------------------------------------------
// 1. Compiled SQL via a recording driver adapter (no database).

function createRecordingClient() {
  const statements: { sql: string; args: unknown[] }[] = [];
  const queryable = {
    provider: "postgres" as const,
    adapterName: "tsi-recording-adapter",
    async queryRaw(query: { sql: string; args: unknown[] }) {
      statements.push({ sql: query.sql, args: query.args });
      return { columnNames: [], columnTypes: [], rows: [] };
    },
    async executeRaw(query: { sql: string; args: unknown[] }) {
      statements.push({ sql: query.sql, args: query.args });
      return 0;
    },
  };
  const adapter = {
    provider: "postgres" as const,
    adapterName: "tsi-recording-adapter",
    async connect() {
      return {
        ...queryable,
        async executeScript() {
          throw new Error("not used");
        },
        async startTransaction() {
          throw new Error("not used");
        },
        async dispose() {},
      };
    },
  };
  const client = new PrismaClient({ adapter: adapter as never });
  return { client, statements };
}

describe("compiled SQL (real Prisma query compiler, recording adapter, no database)", () => {
  it("lists active fault calls with database-side filters, escaped search and stable ordering", async () => {
    const { client, statements } = createRecordingClient();
    const result = await createPostgresRepository(client).listActiveFaultCalls("  50%_x\\ ");
    assert.deepEqual(result, []);

    const [list] = statements;
    assert.match(list.sql, /"workType" = CAST\(\$\d+::text AS "public"\."WorkType"\)|"workType" = \$\d+/);
    assert.match(list.sql, /"status" IN/);
    assert.match(list.sql, /"externalId" ILIKE \('%' \|\| \$\d+ \|\| '%'\)/);
    assert.match(list.sql, /"atmNumber" ILIKE \('%' \|\| \$\d+ \|\| '%'\)/);
    assert.match(list.sql, /ORDER BY [\s\S]*"registeredAt" DESC[\s\S]*"id" ASC/);
    // normalizeQuery trims and upper-cases; %, _ and \ are escaped so they stay literal.
    assert.ok(list.args.includes("50\\%\\_X\\\\"), JSON.stringify(list.args));
    assert.ok(!list.args.includes("50%_X\\"), "the unescaped pattern must never reach ILIKE");
  });

  it("finds an ATM by exact, case-insensitive number with LIKE wildcards neutralised", async () => {
    const { client, statements } = createRecordingClient();
    assert.equal(await createPostgresRepository(client).getAtmHistory(" atm-01%_ "), null);
    assert.equal(statements.length, 1, "no work orders are loaded for an unknown ATM");
    assert.match(statements[0].sql, /"atmNumber" ILIKE \$\d+/);
    assert.doesNotMatch(statements[0].sql, /'%'/, "exact match: no surrounding wildcards");
    assert.ok(statements[0].args.includes("atm-01\\%\\_"), JSON.stringify(statements[0].args));
  });

  it("looks up a work order by ID and returns null when it does not exist", async () => {
    const { client, statements } = createRecordingClient();
    assert.equal(await createPostgresRepository(client).getWorkOrder("syn-wo-missing"), null);
    assert.equal(statements.length, 1);
    assert.match(statements[0].sql, /"id" = \$\d+/);
    assert.ok(statements[0].args.includes("syn-wo-missing"));
  });

  it("searches ATMs without a filter when the query is empty, and stops when nothing matches", async () => {
    const { client, statements } = createRecordingClient();
    assert.deepEqual(await createPostgresRepository(client).searchAtms("   "), []);
    assert.equal(statements.length, 1, "no counts are queried for an empty ATM list");
    // Prisma renders an empty filter as `WHERE 1=1`; no condition restricts the ATMs.
    assert.doesNotMatch(statements[0].sql, /ILIKE/);
    assert.match(statements[0].sql, /FROM "public"\."atms"( WHERE 1=1)? ORDER BY/);
    assert.match(statements[0].sql, /ORDER BY [\s\S]*"atmNumber" ASC/);
  });

  it("only ever reads", async () => {
    const { client, statements } = createRecordingClient();
    const repository = createPostgresRepository(client);
    await repository.listActiveFaultCalls();
    await repository.listActiveFaultCalls("0101");
    await repository.getWorkOrder("syn-wo-wo-27480");
    await repository.searchAtms();
    await repository.getAtmHistory("ATM-0101");
    assert.ok(statements.length >= 5);
    for (const { sql } of statements) assert.match(sql, /^SELECT /, sql);
  });
});

// ---------------------------------------------------------------------------
// 2. Parity with the synthetic adapter, through an in-memory fake client.

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

/** PostgreSQL (I)LIKE with the default backslash escape character. */
function likeToRegExp(pattern: string, caseInsensitive: boolean): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "\\" && i + 1 < pattern.length) source += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else if (char === "%") source += "[\\s\\S]*";
    else if (char === "_") source += "[\\s\\S]";
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`, caseInsensitive ? "i" : "");
}

function matchesValue(value: unknown, condition: unknown): boolean {
  if (condition === null || typeof condition !== "object" || condition instanceof Date) {
    return value instanceof Date && condition instanceof Date ? value.getTime() === condition.getTime() : value === condition;
  }
  const c = condition as { in?: unknown[]; contains?: string; equals?: string; mode?: string; gte?: Date; lte?: Date };
  const insensitive = c.mode === "insensitive";
  if (c.in && !c.in.includes(value)) return false;
  if (c.contains !== undefined && !likeToRegExp(`%${c.contains}%`, insensitive).test(String(value))) return false;
  if (c.equals !== undefined) {
    if (insensitive ? !likeToRegExp(c.equals, true).test(String(value)) : value !== c.equals) return false;
  }
  if (c.gte && !((value as Date) >= c.gte)) return false;
  if (c.lte && !((value as Date) <= c.lte)) return false;
  return true;
}

function createFakeClient() {
  const dataset = buildSyntheticDataset();
  const tables: Record<string, Row[]> = {
    atm: dataset.atms,
    workOrder: dataset.workOrders,
    technicianVisit: dataset.technicianVisits,
    codeDictionary: dataset.codes,
  };
  const relations: Record<string, Record<string, (row: Row) => Row | Row[]>> = {
    workOrder: {
      atm: (wo) => tables.atm.find((a) => a.id === wo.atmId)!,
      visits: (wo) => tables.technicianVisit.filter((v) => v.workOrderId === wo.id),
    },
  };
  const calls: { model: string; method: string; args: Row }[] = [];

  const matches = (model: string, row: Row, where: Where = {}): boolean =>
    Object.entries(where).every(([key, condition]) => {
      if (key === "OR") return (condition as Where[]).some((c) => matches(model, row, c));
      const relation = relations[model]?.[key];
      if (relation) return matches(key, relation(row) as Row, condition as Where);
      return matchesValue(row[key], condition);
    });

  const order = (rows: Row[], orderBy: Row[] | undefined) =>
    orderBy
      ? [...rows].sort((a, b) => {
          for (const term of orderBy) {
            const [[field, direction]] = Object.entries(term);
            const x = a[field] as string | Date;
            const y = b[field] as string | Date;
            const diff = x < y ? -1 : x > y ? 1 : 0;
            if (diff !== 0) return direction === "desc" ? -diff : diff;
          }
          return 0;
        })
      : rows;

  const project = (model: string, row: Row, select: Row): Row =>
    Object.fromEntries(
      Object.entries(select).map(([key, spec]) => {
        const relation = relations[model]?.[key];
        if (!relation) return [key, row[key]];
        const nested = spec as { select: Row; orderBy?: Row[] };
        const related = relation(row);
        const relatedModel = key === "visits" ? "technicianVisit" : key;
        return [
          key,
          Array.isArray(related)
            ? order(related, nested.orderBy).map((r) => project(relatedModel, r, nested.select))
            : project(relatedModel, related, nested.select),
        ];
      }),
    );

  const delegate = (model: string) => ({
    async findMany(args: { where?: Where; orderBy?: Row[]; select: Row }) {
      calls.push({ model, method: "findMany", args });
      return order(tables[model].filter((r) => matches(model, r, args.where)), args.orderBy).map((r) =>
        project(model, r, args.select),
      );
    },
    async findFirst(args: { where?: Where; orderBy?: Row[]; select: Row }) {
      calls.push({ model, method: "findFirst", args });
      return (await this.findMany(args))[0] ?? null;
    },
    async findUnique(args: { where: { id: string }; select: Row }) {
      calls.push({ model, method: "findUnique", args });
      const row = tables[model].find((r) => r.id === args.where.id);
      return row ? project(model, row, args.select) : null;
    },
    async groupBy(args: { by: string[]; where?: Where }) {
      calls.push({ model, method: "groupBy", args });
      const groups = new Map<string, Row>();
      for (const row of tables[model].filter((r) => matches(model, r, args.where))) {
        const key = args.by.map((f) => String(row[f])).join("|");
        const group = groups.get(key) ?? { ...Object.fromEntries(args.by.map((f) => [f, row[f]])), _count: { _all: 0 } };
        (group._count as { _all: number })._all += 1;
        groups.set(key, group);
      }
      return [...groups.values()];
    },
  });

  const client = { atm: delegate("atm"), workOrder: delegate("workOrder"), codeDictionary: delegate("codeDictionary") };
  return { client: client as unknown as PostgresRepositoryClient, calls, dataset };
}

describe("parity with the synthetic adapter (in-memory fake client)", () => {
  const synthetic = createSyntheticRepository();
  const { client, calls, dataset } = createFakeClient();
  const postgres = createPostgresRepository(client);

  const queries = [undefined, null, "", "   ", "atm-0101", "ATM-0106", "wo-274", "27480", "0", "01", "x", "%", "_", "\\", "zzz"];

  it("listActiveFaultCalls returns the same items in the same order", async () => {
    for (const query of queries) {
      assert.deepEqual(await postgres.listActiveFaultCalls(query), await synthetic.listActiveFaultCalls(query), String(query));
    }
    assert.equal((await postgres.listActiveFaultCalls()).length, 9);
  });

  it("getWorkOrder returns the same record for every work order, and null for unknown IDs", async () => {
    for (const { id } of dataset.workOrders) {
      assert.deepEqual(await postgres.getWorkOrder(id), await synthetic.getWorkOrder(id), id);
    }
    for (const id of ["syn-wo-missing", "", "%"]) assert.equal(await postgres.getWorkOrder(id), null, id);
  });

  it("searchAtms returns the same ATMs, counts and order", async () => {
    for (const query of queries) {
      assert.deepEqual(await postgres.searchAtms(query), await synthetic.searchAtms(query), String(query));
    }
  });

  it("getAtmHistory returns the same history and summary, and null for unknown or wildcard input", async () => {
    for (const { atmNumber } of dataset.atms) {
      for (const input of [atmNumber, atmNumber.toLowerCase(), `  ${atmNumber} `]) {
        assert.deepEqual(await postgres.getAtmHistory(input), await synthetic.getAtmHistory(input), input);
      }
    }
    for (const input of ["ATM-9999", "%", "ATM-010_", "ATM-01%", ""]) {
      assert.equal(await synthetic.getAtmHistory(input), null, input);
      assert.equal(await postgres.getAtmHistory(input), null, input);
    }
  });

  it("filters and counts in the database instead of loading whole tables", async () => {
    calls.length = 0;
    await postgres.searchAtms("0101");
    assert.deepEqual(
      calls.map((c) => `${c.model}.${c.method}`),
      ["atm.findMany", "workOrder.groupBy", "workOrder.groupBy"],
      "ATM counts come from grouped counts, not from loading work orders",
    );

    calls.length = 0;
    await postgres.listActiveFaultCalls();
    const list = calls.find((c) => c.method === "findMany" && c.model === "workOrder")!;
    assert.deepEqual((list.args.where as Where).status, { in: ["OPEN", "HOLD"] });
    assert.equal((list.args.where as Where).workType, "FAULT_CALL");

    calls.length = 0;
    await postgres.getAtmHistory("ATM-0101");
    const history = calls.find((c) => c.method === "findMany" && c.model === "workOrder")!;
    assert.deepEqual(Object.keys(history.args.where as Where), ["atmId"], "only the requested ATM's work orders");
  });

  it("loads code descriptions only for codes on the loaded records", async () => {
    calls.length = 0;
    await postgres.getWorkOrder("syn-wo-wo-27480");
    const lookup = calls.find((c) => c.model === "codeDictionary")!;
    const wanted = (lookup.args.where as { OR: { codeType: string; code: { in: string[] } }[] }).OR;
    assert.ok(wanted.every((w) => w.code.in.length <= 3), JSON.stringify(wanted));
  });
});

// ---------------------------------------------------------------------------
// 3. Failures.

describe("failures", () => {
  const failingClient = (message: string, code?: string) => {
    const fail = async () => {
      throw Object.assign(new Error(message), code ? { code } : {});
    };
    const delegate = { findMany: fail, findFirst: fail, findUnique: fail, groupBy: fail };
    return { atm: delegate, workOrder: delegate, codeDictionary: delegate } as unknown as PostgresRepositoryClient;
  };

  it("reports a failed query clearly, without connection strings or passwords", async () => {
    const repository = createPostgresRepository(
      failingClient("Can't reach database server at postgresql://tsi:s3cret@db.example.invalid:5432/tsi?password=s3cret", "P1001"),
    );
    for (const run of [
      () => repository.listActiveFaultCalls(),
      () => repository.getWorkOrder("syn-wo-wo-27480"),
      () => repository.searchAtms(),
      () => repository.getAtmHistory("ATM-0101"),
    ]) {
      await assert.rejects(run(), (error: Error) => {
        assert.ok(error instanceof DataSourceUnavailableError);
        assert.match(error.message, /^PostgreSQL \w+ failed \(P1001\): Can't reach database server/);
        assert.doesNotMatch(error.message, /s3cret|tsi:/);
        return true;
      });
    }
  });

  it("redacts connection strings and password parameters", () => {
    assert.equal(
      redactConnectionDetails("at postgres://u:p@h:5432/db and password=abc&x=1"),
      "at postgresql://[redacted] and password=[redacted]&x=1",
    );
  });

  it("escapes LIKE wildcards and the escape character itself", () => {
    assert.equal(escapeLikePattern("ATM-0101"), "ATM-0101");
    assert.equal(escapeLikePattern("a%b_c\\d"), "a\\%b\\_c\\\\d");
  });
});
