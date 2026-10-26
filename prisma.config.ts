import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env automatically, hence the dotenv import above.
// The datasource URL is optional so that `prisma generate` (and therefore the
// production build) works without a database. Migration commands require it.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
