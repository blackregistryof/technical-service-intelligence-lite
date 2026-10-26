import "server-only";
import type { ServiceRepository } from "./repository";
import { resolveDataSource } from "./source";
import { createSyntheticRepository } from "./synthetic-repository";

const globalForRepository = globalThis as unknown as {
  tsiRepository?: ServiceRepository;
  tsiSyntheticWarningLogged?: boolean;
};

/** Use getServiceRepository() from "@/lib/dal" instead; it checks the session first. */
export function getRepository(): ServiceRepository {
  // Throws DataSourceConfigError (fail closed) when the source is not configured.
  resolveDataSource();
  if (!globalForRepository.tsiSyntheticWarningLogged) {
    globalForRepository.tsiSyntheticWarningLogged = true;
    console.warn("[data] Using the TEMPORARY synthetic data source (read-only, not PostgreSQL).");
  }
  globalForRepository.tsiRepository ??= createSyntheticRepository();
  return globalForRepository.tsiRepository;
}
