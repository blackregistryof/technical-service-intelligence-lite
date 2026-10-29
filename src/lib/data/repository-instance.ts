import type { ServiceRepository } from "./repository";
import { DataSourceConfigError, resolveDataSource } from "./source";
import { createSyntheticRepository } from "./synthetic-repository";

// The repository is cached in module scope, NOT on globalThis. In `next dev`
// globalThis survives hot reloads, so an instance stored there keeps the code
// it was created with: after the repository contract gained new fields, a
// long-running dev server kept returning the old shape (e.g. ATM list items
// without `activeByStatus`). A module-scoped cache is recreated whenever this
// module or the repository code it imports is reloaded. In production the
// module is evaluated once per process, so behaviour there is unchanged.
let repository: ServiceRepository | undefined;

/** Use getServiceRepository() from "@/lib/dal" instead; it checks the session first. */
export function getRepository(): ServiceRepository {
  // Resolved on every call and never cached: an invalid configuration (e.g.
  // DATA_SOURCE=synthetic in production) throws DataSourceConfigError and
  // fails closed, without falling back to another source.
  const source = resolveDataSource();
  if (source === "postgres") {
    throw new DataSourceConfigError(
      "DATA_SOURCE=postgres is selected, but the PostgreSQL adapter is not implemented yet.",
    );
  }
  repository ??= createSyntheticRepository();
  return repository;
}
