// Command-line entry point for the synthetic seed. All seeding rules live in
// ./seeding.ts and are tested offline; this file only resolves the opt-in,
// creates the database client and prints the outcome.
//
//   npm run db:seed              print the plan only; no database connection
//   npm run db:seed -- --apply   write to the database in DATABASE_URL
//
// It never runs on install, build, deploy or start. See README "Seeding the database".

import "./load-env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildSyntheticDataset } from "./synthetic/dataset";
import { describeTarget, planSeed, resolveSeedMode, seedDatabase } from "./seeding";

async function main() {
  const mode = resolveSeedMode(process.argv.slice(2));
  const dataset = buildSyntheticDataset();
  const plan = planSeed(dataset);
  const planned =
    `${plan.atms} ATMs, ${plan.workOrders} work orders, ` +
    `${plan.technicianVisits} technician visits, ${plan.codes} codes`;

  if (mode === "plan") {
    console.log(
      `Seed plan (reference date ${dataset.referenceDate}): upsert ${planned}; delete nothing.\n` +
        "No database was contacted. To write, run: npm run db:seed -- --apply",
    );
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Configure it in .env.local or the environment.");
  }

  console.log(`Seeding synthetic dataset (${planned}) into ${describeTarget(connectionString)} …`);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const { stored, obsolete } = await seedDatabase(prisma, dataset);
    console.log(
      `Seed complete (reference date ${dataset.referenceDate}): ` +
        `${stored.atms} ATMs, ${stored.workOrders} work orders, ` +
        `${stored.technicianVisits} technician visits, ${stored.codes} codes.`,
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
