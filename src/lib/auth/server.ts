import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  AuthConfigError,
  getAuthConfig,
  logAuthConfigError,
  type AuthConfig,
} from "@/lib/auth/config";
import {
  createSessionToken,
  revokeSession,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  verifySessionToken,
  type Session,
} from "@/lib/auth/session";

export const LOGIN_PATH = "/login";
export const HOME_PATH = "/rikketeated";

/** Returns the valid session for this request, or null. Fails closed on misconfiguration. */
export async function getSession(): Promise<Session | null> {
  // Mark the caller as request-time before anything else, so neither the
  // environment lookup nor the expiry check (current time) is ever prerendered.
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  await connection();

  let config: AuthConfig;
  try {
    config = getAuthConfig();
  } catch (error) {
    if (error instanceof AuthConfigError) {
      logAuthConfigError(error);
      return null;
    }
    throw error;
  }

  return verifySessionToken(token, config);
}

/**
 * Server-side authorization check. Call it in every protected page, Server
 * Action, Route Handler and data-access function; never rely on the proxy alone.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect(LOGIN_PATH);
  }
  return session;
}

export async function startSession(config: AuthConfig): Promise<void> {
  (await cookies()).set(
    SESSION_COOKIE_NAME,
    createSessionToken(config),
    sessionCookieOptions,
  );
}

export async function endSession(): Promise<void> {
  const session = await getSession();
  if (session) {
    revokeSession(session);
  }
  (await cookies()).delete({
    name: SESSION_COOKIE_NAME,
    path: sessionCookieOptions.path,
    secure: sessionCookieOptions.secure,
    httpOnly: true,
    sameSite: sessionCookieOptions.sameSite,
  });
}
