import type { ServiceRepository } from "./repository";
import { resolveDataSource } from "./source";
import { createSyntheticRepository } from "./synthetic-repository";

// The repository is cached in module scope, NOT on globalThis. In `next dev`
// globalThis survives hot reloads, so an instance stored there keeps the code
// it was created with: after the repository contract gained new fields, a
// long-running dev server kept returning the old shape (e.g. ATM list items
// without `activeByStatus`). A module-scoped cache is recreated whenever this
// module or the repository code it imports is reloaded. In production the
// module is evaluated once per process, so behaviour there is unchanged.
let repository: ServiceRepository | undefined;

const globalForWarning = globalThis as unknown as { tsiSyntheticWarningLogged?: boolean };

/** Use getServiceRepository() from "@/lib/dal" instead; it checks the session first. */
export function getRepository(): ServiceRepository {
  // Throws DataSourceConfigError (fail closed) when the source is not configured.
  resolveDataSource();
  // Only the one-time log message is process-wide; the instance itself is not.
  if (!globalForWarning.tsiSyntheticWarningLogged) {
    globalForWarning.tsiSyntheticWarningLogged = true;
    console.warn("[data] Using the TEMPORARY synthetic data source (read-only, not PostgreSQL).");
  }
  repository ??= createSyntheticRepository();
  return repository;
}
