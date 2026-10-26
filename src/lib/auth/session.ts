// Signed, stateless session tokens shared by proxy.ts and server code.
// Intentionally free of `next/headers` and `server-only` so the proxy can use it.

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { AuthConfig } from "@/lib/auth/config";

export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const TOKEN_VERSION = 1;

type SessionPayload = {
  v: number;
  sid: string;
  iat: number;
  exp: number;
};

export type Session = {
  sessionId: string;
  expiresAt: Date;
};

const useSecureCookie = process.env.NODE_ENV === "production";

// The __Host- prefix requires Secure, Path=/ and no Domain, which pins the
// cookie to this exact host. Plain HTTP development cannot use it.
export const SESSION_COOKIE_NAME = useSecureCookie
  ? "__Host-tsi_session"
  : "tsi_session";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: useSecureCookie,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;

/**
 * The signing key depends on both the session secret and the access password,
 * so rotating either one invalidates every existing session.
 */
function signingKey(config: AuthConfig): Buffer {
  return createHmac("sha256", config.sessionSecret)
    .update(`tsi-session-v${TOKEN_VERSION}:${config.accessPassword}`)
    .digest();
}

function sign(data: string, config: AuthConfig): string {
  return createHmac("sha256", signingKey(config)).update(data).digest("base64url");
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Constant-time comparison of a submitted password with the configured one. */
export function passwordMatches(candidate: string, config: AuthConfig): boolean {
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return safeEqual(digest(candidate), digest(config.accessPassword));
}

export function createSessionToken(config: AuthConfig, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = {
    v: TOKEN_VERSION,
    sid: randomUUID(),
    iat,
    exp: iat + SESSION_MAX_AGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, config)}`;
}

/** Returns the session if the token is authentic, unexpired and not revoked. */
export function verifySessionToken(
  token: string | undefined,
  config: AuthConfig,
  now = Date.now(),
): Session | null {
  if (!token || token.length > 1024) return null;

  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length > 0) return null;

  const expected = Buffer.from(sign(encoded, config), "base64url");
  if (!safeEqual(Buffer.from(signature, "base64url"), expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const nowSeconds = Math.floor(now / 1000);
  if (
    payload.v !== TOKEN_VERSION ||
    typeof payload.sid !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    payload.exp <= nowSeconds ||
    payload.iat > nowSeconds + 60 ||
    isRevoked(payload.sid, nowSeconds)
  ) {
    return null;
  }

  return { sessionId: payload.sid, expiresAt: new Date(payload.exp * 1000) };
}

// Logout revocation list. Without a database this lives in process memory:
// it is lost on restart and not shared between instances. The cookie is also
// deleted on logout, and every token expires after SESSION_MAX_AGE_SECONDS.
const globalForRevocation = globalThis as unknown as {
  tsiRevokedSessions?: Map<string, number>;
};
const revokedSessions = (globalForRevocation.tsiRevokedSessions ??= new Map());

function isRevoked(sessionId: string, nowSeconds: number): boolean {
  const expiresAt = revokedSessions.get(sessionId);
  return expiresAt !== undefined && expiresAt > nowSeconds;
}

export function revokeSession(session: Session, now = Date.now()): void {
  const nowSeconds = Math.floor(now / 1000);
  for (const [sessionId, expiresAt] of revokedSessions) {
    if (expiresAt <= nowSeconds) revokedSessions.delete(sessionId);
  }
  revokedSessions.set(session.sessionId, Math.floor(session.expiresAt.getTime() / 1000));
}
