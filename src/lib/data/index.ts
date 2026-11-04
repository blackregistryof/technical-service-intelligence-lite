import "server-only";
import { getPrisma } from "@/lib/prisma";
import type { ServiceRepository } from "./repository";
import { getRepository as getRepositoryFor } from "./repository-instance";

// Server-only entry point for data access; see repository-instance.ts for why
// the repository is cached in module scope rather than on globalThis. The
// Prisma client is created lazily on first use (never on import or during the
// build) and only when DATA_SOURCE=postgres.
export function getRepository(): ServiceRepository {
  return getRepositoryFor(getPrisma);
}
