// Data source selection (DATA_SOURCE):
// - "postgres": the PostgreSQL (Prisma) adapter. It is the only value accepted
//   in production. The adapter is NOT implemented yet, so selecting it fails
//   closed in getRepository() instead of serving another source.
// - "synthetic": TEMPORARY in-memory synthetic dataset (read-only). Development
//   and test only; rejected unconditionally in production.
// - unset or empty: synthetic in development and test; rejected in production.
// There is deliberately no override that allows synthetic data in production.
//
// Error messages never echo the configured value: a misplaced secret (e.g. a
// connection string pasted into DATA_SOURCE) must not end up in logs.

export type DataSource = "synthetic" | "postgres";

export class DataSourceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataSourceConfigError";
  }
}

export function resolveDataSource(
  env: { DATA_SOURCE?: string; NODE_ENV?: string } = process.env,
): DataSource {
  const configured = env.DATA_SOURCE?.trim() ?? "";
  const production = env.NODE_ENV === "production";

  if (configured === "postgres") return "postgres";
  if (configured === "synthetic") {
    if (production) {
      throw new DataSourceConfigError(
        "DATA_SOURCE=synthetic is not allowed in production; set DATA_SOURCE=postgres.",
      );
    }
    return "synthetic";
  }
  if (configured) {
    throw new DataSourceConfigError(
      'Unsupported DATA_SOURCE value; expected "postgres" or (outside production) "synthetic".',
    );
  }
  if (production) {
    throw new DataSourceConfigError("DATA_SOURCE is not set; production requires DATA_SOURCE=postgres.");
  }
  return "synthetic";
}

/**
 * The one-line server startup log for the selected data source (see
 * src/instrumentation.ts). Names only the source type or the configuration
 * problem; never connection strings, passwords or other environment values.
 */
export function dataSourceStartupLog(
  env: { DATA_SOURCE?: string; NODE_ENV?: string } = process.env,
): { level: "info" | "warn" | "error"; message: string } {
  try {
    if (resolveDataSource(env) === "postgres") {
      return {
        level: "error",
        message:
          "[data] Data source: postgres. The PostgreSQL adapter is not implemented yet; data pages will fail closed.",
      };
    }
    return {
      level: "warn",
      message: "[data] Data source: synthetic (TEMPORARY read-only in-memory dataset, not PostgreSQL).",
    };
  } catch (error) {
    if (!(error instanceof DataSourceConfigError)) throw error;
    return {
      level: "error",
      message: `[data] Data source configuration error: ${error.message} Data pages will fail closed.`,
    };
  }
}
