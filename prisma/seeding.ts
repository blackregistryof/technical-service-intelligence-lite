// Seeding logic for the synthetic dataset, separated from the command-line
// entry point (prisma/seed.ts) so that every safety rule can be tested offline
// against an in-memory fake: this module never creates a database client and
// never reads DATABASE_URL.
//
// Safety rules:
// - Opt-in (enforced by prisma/seed.ts): without `--apply` the seed only prints
//   its plan and never connects. It refuses to run when npm_lifecycle_event
//   names another npm script. This guards against accidental execution only;
//   it is not a security boundary (a nested `npm run db:seed -- --apply`, a run
//   outside npm, or a direct call to seedDatabase() is not stopped).
// - Only records whose ID starts with "syn-" are created or updated, matched
//   by that ID, so reruns update instead of duplicating. A rerun overwrites the
//   dataset fields of existing synthetic records; createdAt and updatedAt are
//   never supplied (updatedAt is managed by Prisma's @updatedAt).
// - Nothing is ever deleted. Synthetic records that are no longer part of the
//   dataset are only reported.
// - Before writing, the seed aborts if any natural key it needs (ATM number,
//   source-system work order ID, dictionary code) is already used by a record
//   that is not synthetic, so imported or other data is never modified.
// - All reads and writes run in one interactive transaction, parents before
//   children, so either the whole dataset is written or nothing is.

import type { Prisma } from "../src/generated/prisma/client";
import { SOURCE_SYSTEM, validateSyntheticDataset, type SyntheticDataset } from "./synthetic/dataset";

export const SYNTHETIC_ID_PREFIX = "syn-";
export const SEED_SCRIPT = "db:seed";
export const SEED_TRANSACTION_TIMEOUT_MS = 60_000;

/** The models the seed may touch, inside its transaction. */
export type SeedTx = Pick<Prisma.TransactionClient, "atm" | "workOrder" | "technicianVisit" | "codeDictionary">;

/** The only client capability the seed uses outside the transaction: starting it. */
export interface SeedClient {
  $transaction<R>(fn: (tx: SeedTx) => Promise<R>, options?: { timeout?: number }): Promise<R>;
}

export class SeedRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedRefusedError";
  }
}

export type SeedMode = "plan" | "apply";

/**
 * Explicit opt-in. `--apply` is required to write; anything else only prints
 * the plan. Refuses when started by an npm script other than `db:seed` (e.g. a
 * build, start, postinstall or deploy script that calls the seed).
 */
export function resolveSeedMode(
  argv: readonly string[],
  env: Record<string, string | undefined> = process.env,
): SeedMode {
  const lifecycle = env.npm_lifecycle_event;
  if (lifecycle && lifecycle !== SEED_SCRIPT) {
    throw new SeedRefusedError(
      `Refusing to seed from the npm script "${lifecycle}". Run it explicitly with \`npm run ${SEED_SCRIPT} -- --apply\`.`,
    );
  }
  const unknown = argv.filter((arg) => arg !== "--apply");
  if (unknown.length > 0) {
    throw new SeedRefusedError(`Unknown argument(s): ${unknown.join(" ")}. The only option is --apply.`);
  }
  return argv.includes("--apply") ? "apply" : "plan";
}

export type SeedCounts = { codes: number; atms: number; workOrders: number; technicianVisits: number };

/**
 * Offline checks and the write plan: the dataset must be valid, every ID must
 * be reserved synthetic, and every reference must point to a record written
 * earlier in the plan. Throws instead of returning a partial plan.
 */
export function planSeed(dataset: SyntheticDataset): SeedCounts {
  const errors = validateSyntheticDataset(dataset);
  const records = [...dataset.codes, ...dataset.atms, ...dataset.workOrders, ...dataset.technicianVisits];
  for (const { id } of records) {
    if (!id.startsWith(SYNTHETIC_ID_PREFIX)) errors.push(`${id}: ID is not reserved synthetic ("${SYNTHETIC_ID_PREFIX}")`);
  }
  for (const wo of dataset.workOrders) {
    if (wo.sourceSystem !== SOURCE_SYSTEM) errors.push(`${wo.id}: source system is not ${SOURCE_SYSTEM}`);
  }
  if (errors.length > 0) {
    throw new Error(`Synthetic dataset is invalid:\n- ${errors.join("\n- ")}`);
  }
  return {
    codes: dataset.codes.length,
    atms: dataset.atms.length,
    workOrders: dataset.workOrders.length,
    technicianVisits: dataset.technicianVisits.length,
  };
}

const notSynthetic = { NOT: { id: { startsWith: SYNTHETIC_ID_PREFIX } } };
const synthetic = { id: { startsWith: SYNTHETIC_ID_PREFIX } };

/** Natural-key collisions with records that do not belong to the synthetic dataset. */
export async function findConflicts(db: SeedTx, dataset: SyntheticDataset): Promise<string[]> {
  const [atms, workOrders, codes] = await Promise.all([
    db.atm.findMany({
      where: { ...notSynthetic, atmNumber: { in: dataset.atms.map((a) => a.atmNumber) } },
      select: { atmNumber: true },
    }),
    db.workOrder.findMany({
      where: {
        ...notSynthetic,
        sourceSystem: SOURCE_SYSTEM,
        externalId: { in: dataset.workOrders.map((w) => w.externalId) },
      },
      select: { externalId: true },
    }),
    db.codeDictionary.findMany({
      where: {
        ...notSynthetic,
        OR: dataset.codes.map(({ codeType, code }) => ({ codeType, code })),
      },
      select: { codeType: true, code: true },
    }),
  ]);

  return [
    ...atms.map((a) => `ATM number ${a.atmNumber}`),
    ...workOrders.map((w) => `work order ${SOURCE_SYSTEM}:${w.externalId}`),
    ...codes.map((c) => `code ${c.codeType}:${c.code}`),
  ];
}

/** Synthetic records in the database that are no longer in the dataset (reported, never deleted). */
async function findObsolete(db: SeedTx, dataset: SyntheticDataset): Promise<string[]> {
  const prefix = { startsWith: SYNTHETIC_ID_PREFIX };
  const [atms, workOrders, visits, codes] = await Promise.all([
    db.atm.findMany({ where: { id: { ...prefix, notIn: dataset.atms.map((r) => r.id) } }, select: { id: true } }),
    db.workOrder.findMany({ where: { id: { ...prefix, notIn: dataset.workOrders.map((r) => r.id) } }, select: { id: true } }),
    db.technicianVisit.findMany({ where: { id: { ...prefix, notIn: dataset.technicianVisits.map((r) => r.id) } }, select: { id: true } }),
    db.codeDictionary.findMany({ where: { id: { ...prefix, notIn: dataset.codes.map((r) => r.id) } }, select: { id: true } }),
  ]);
  return [...atms, ...workOrders, ...visits, ...codes].map((r) => r.id);
}

export type SeedResult = { stored: SeedCounts; obsolete: string[] };

/** The seed's work inside the transaction: conflict check, upserts (parents first), report. */
export async function runSeed(db: SeedTx, dataset: SyntheticDataset): Promise<SeedResult> {
  const conflicts = await findConflicts(db, dataset);
  if (conflicts.length > 0) {
    throw new Error(
      "Aborted without changes: these keys already belong to non-synthetic records:\n- " +
        conflicts.join("\n- "),
    );
  }

  for (const { id, ...data } of dataset.codes) {
    await db.codeDictionary.upsert({
      where: { id },
      create: { id, ...data } satisfies Prisma.CodeDictionaryUncheckedCreateInput,
      update: data,
    });
  }
  for (const { id, ...data } of dataset.atms) {
    await db.atm.upsert({
      where: { id },
      create: { id, ...data } satisfies Prisma.AtmUncheckedCreateInput,
      update: data,
    });
  }
  for (const { id, ...data } of dataset.workOrders) {
    await db.workOrder.upsert({
      where: { id },
      create: { id, ...data } satisfies Prisma.WorkOrderUncheckedCreateInput,
      update: data,
    });
  }
  for (const { id, ...data } of dataset.technicianVisits) {
    await db.technicianVisit.upsert({
      where: { id },
      create: { id, ...data } satisfies Prisma.TechnicianVisitUncheckedCreateInput,
      update: data,
    });
  }

  const [codes, atms, workOrders, technicianVisits] = await Promise.all([
    db.codeDictionary.count({ where: synthetic }),
    db.atm.count({ where: synthetic }),
    db.workOrder.count({ where: synthetic }),
    db.technicianVisit.count({ where: synthetic }),
  ]);
  return { stored: { codes, atms, workOrders, technicianVisits }, obsolete: await findObsolete(db, dataset) };
}

/** Plans offline, then runs the whole seed in a single transaction. */
export async function seedDatabase(client: SeedClient, dataset: SyntheticDataset): Promise<SeedResult> {
  planSeed(dataset);
  return client.$transaction((tx) => runSeed(tx, dataset), { timeout: SEED_TRANSACTION_TIMEOUT_MS });
}

/** Host, port and database name only, for confirmation output; never credentials or parameters. */
export function describeTarget(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}
