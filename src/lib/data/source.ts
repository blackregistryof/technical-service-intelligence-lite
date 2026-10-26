// Data source selection (DATA_SOURCE):
// - "synthetic": temporary in-memory synthetic dataset (read-only).
// - unset or empty: synthetic in development only. In production the data
//   source must be chosen explicitly, so the synthetic adapter can never be
//   served by accident (e.g. on Railway).
// The PostgreSQL (Prisma) adapter is not implemented yet.

export type DataSource = "synthetic";

export class DataSourceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataSourceConfigError";
  }
}

export function resolveDataSource(
  env: { DATA_SOURCE?: string; NODE_ENV?: string } = process.env,
): DataSource {
  const configured = env.DATA_SOURCE?.trim();
  if (configured === "synthetic") return "synthetic";
  if (configured) {
    throw new DataSourceConfigError(`Unsupported DATA_SOURCE "${configured}".`);
  }
  if (env.NODE_ENV !== "production") return "synthetic";
  throw new DataSourceConfigError("DATA_SOURCE is not set.");
}
