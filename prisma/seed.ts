// Idempotent seed: writes the deterministic synthetic dataset to PostgreSQL.
// Run explicitly with `npm run db:seed`; it never runs on install, build,
// deploy or start. See README "Seeding the database".
//
// Safety rules:
// - Only records whose ID starts with "syn-" are created or updated, matched
//   by that ID, so reruns update instead of duplicating.
// - Nothing is ever deleted. Synthetic records that are no longer part of the
//   dataset are only reported.
// - Before writing, the seed aborts if any natural key it needs (ATM number,
//   source-system work order ID, dictionary code) is already used by a record
//   that is not synthetic, so imported or other data is never modified.

import "./load-env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import {
  buildSyntheticDataset,
  SOURCE_SYSTEM,
  validateSyntheticDataset,
  type SyntheticDataset,
} from "./synthetic/dataset";

const SYNTHETIC_ID_PREFIX = "syn-";
const notSynthetic = { NOT: { id: { startsWith: SYNTHETIC_ID_PREFIX } } };

type Db = Prisma.TransactionClient;

/** Natural-key collisions with records that do not belong to the synthetic dataset. */
async function findConflicts(db: Db, dataset: SyntheticDataset): Promise<string[]> {
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
async function findObsolete(db: Db, dataset: SyntheticDataset): Promise<string[]> {
  const prefix = { startsWith: SYNTHETIC_ID_PREFIX };
  const [atms, workOrders, visits, codes] = await Promise.all([
    db.atm.findMany({ where: { id: { ...prefix, notIn: dataset.atms.map((r) => r.id) } }, select: { id: true } }),
    db.workOrder.findMany({ where: { id: { ...prefix, notIn: dataset.workOrders.map((r) => r.id) } }, select: { id: true } }),
    db.technicianVisit.findMany({ where: { id: { ...prefix, notIn: dataset.technicianVisits.map((r) => r.id) } }, select: { id: true } }),
    db.codeDictionary.findMany({ where: { id: { ...prefix, notIn: dataset.codes.map((r) => r.id) } }, select: { id: true } }),
  ]);
  return [...atms, ...workOrders, ...visits, ...codes].map((r) => r.id);
}

async function seed(db: Db, dataset: SyntheticDataset) {
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

  return findObsolete(db, dataset);
}

/** Host and database name only, for confirmation output; never credentials. */
function describeTarget(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const dataset = buildSyntheticDataset();
  const errors = validateSyntheticDataset(dataset);
  if (errors.length > 0) {
    throw new Error(`Synthetic dataset is invalid:\n- ${errors.join("\n- ")}`);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Configure it in .env.local or the environment.");
  }

  console.log(`Seeding synthetic dataset into ${describeTarget(connectionString)} …`);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const obsolete = await prisma.$transaction((tx) => seed(tx, dataset), {
      timeout: 60_000,
    });

    const [atms, workOrders, visits, codes] = await Promise.all([
      prisma.atm.count({ where: { id: { startsWith: SYNTHETIC_ID_PREFIX } } }),
      prisma.workOrder.count({ where: { id: { startsWith: SYNTHETIC_ID_PREFIX } } }),
      prisma.technicianVisit.count({ where: { id: { startsWith: SYNTHETIC_ID_PREFIX } } }),
      prisma.codeDictionary.count({ where: { id: { startsWith: SYNTHETIC_ID_PREFIX } } }),
    ]);
    console.log(
      `Seed complete (reference date ${dataset.referenceDate}): ` +
        `${atms} ATMs, ${workOrders} work orders, ${visits} technician visits, ${codes} codes.`,
    );
    if (obsolete.length > 0) {
      console.warn(
        `Note: ${obsolete.length} synthetic record(s) are no longer in the dataset and were left unchanged:\n- ` +
          obsolete.join("\n- "),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Report the message only; never print connection details.
  console.error(`Seed failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
