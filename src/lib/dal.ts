import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { requireSession } from "@/lib/auth/server";
import { getPrisma } from "@/lib/prisma";

/**
 * Data Access Layer entry point. All database reads must go through this so
 * that the session is verified on the server next to the data, regardless of
 * which page, Server Action or Route Handler triggered the read.
 */
export async function getAuthorizedDb(): Promise<PrismaClient> {
  await requireSession();
  return getPrisma();
}
