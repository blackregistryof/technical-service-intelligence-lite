import { createPostgresRepository, redactConnectionDetails, type PostgresRepositoryClient } from "./postgres-repository";
import type { ServiceRepository } from "./repository";
import { DataSourceConfigError, resolveDataSource, type DataSource } from "./source";
import { createSyntheticRepository } from "./synthetic-repository";

// The repository is cached in module scope, NOT on globalThis. In `next dev`
// globalThis survives hot reloads, so an instance stored there keeps the code
// it was created with: after the repository contract gained new fields, a
// long-running dev server kept returning the old shape (e.g. ATM list items
// without `activeByStatus`). A module-scoped cache is recreated whenever this
// module or the repository code it imports is reloaded. In production the
// module is evaluated once per process, so behaviour there is unchanged.
let cached: { source: DataSource; repository: ServiceRepository } | undefined;

/**
 * Use getServiceRepository() from "@/lib/dal" instead; it checks the session
 * first. `getPostgresClient` is supplied by the server-only entry point
 * (src/lib/data/index.ts), which keeps this module free of the Prisma client
 * setup so that it can be tested offline.
 */
export function getRepository(getPostgresClient?: () => PostgresRepositoryClient): ServiceRepository {
  // Resolved on every call: an invalid configuration (e.g. DATA_SOURCE=synthetic
  // in production) throws DataSourceConfigError and fails closed, without
  // falling back to another source.
  const source = resolveDataSource();
  if (cached?.source === source) return cached.repository;

  let repository: ServiceRepository;
  if (source === "postgres") {
    if (!getPostgresClient) {
      throw new DataSourceConfigError("DATA_SOURCE=postgres is selected, but no PostgreSQL client is available.");
    }
    let client: PostgresRepositoryClient;
    try {
      client = getPostgresClient();
    } catch (error) {
      const detail = error instanceof Error ? redactConnectionDetails(error.message) : "unknown error";
      throw new DataSourceConfigError(`DATA_SOURCE=postgres is selected, but the PostgreSQL client could not be created: ${detail}`);
    }
    repository = createPostgresRepository(client);
  } else {
    repository = createSyntheticRepository();
  }
  cached = { source, repository };
  return repository;
}
