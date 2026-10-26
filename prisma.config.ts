import "./prisma/load-env";
import { defineConfig } from "prisma/config";

// The datasource URL is optional so that `prisma generate` (and therefore the
// production build) works without a database. Migration commands require it.
// No `migrations.seed` is configured on purpose: seeding only ever runs
// explicitly through `npm run db:seed`.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
