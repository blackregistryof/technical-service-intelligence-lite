import "server-only";
import { requireSession } from "@/lib/auth/server";
import { getRepository } from "@/lib/data";
import type { ServiceRepository } from "@/lib/data/repository";

/**
 * Data Access Layer entry point. All data reads must go through this so that
 * the session is verified on the server next to the data, regardless of which
 * page, Server Action or Route Handler triggered the read.
 */
export async function getServiceRepository(): Promise<ServiceRepository> {
  await requireSession();
  return getRepository();
}
