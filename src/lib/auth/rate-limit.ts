import "server-only";

// Simple in-memory limit on failed login attempts per client address.
// Sufficient for a single-instance prototype; it resets on restart.

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
// Bounds memory use if a client rotates spoofed addresses.
const MAX_TRACKED_CLIENTS = 10_000;

type Entry = { failures: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  tsiLoginFailures?: Map<string, Entry>;
};
const failures = (globalForRateLimit.tsiLoginFailures ??= new Map());

/** Returns the number of milliseconds the client must wait, or 0 if allowed. */
export function loginRetryAfterMs(clientKey: string, now = Date.now()): number {
  const entry = failures.get(clientKey);
  if (!entry || entry.resetAt <= now) return 0;
  return entry.failures >= MAX_FAILURES ? entry.resetAt - now : 0;
}

export function recordLoginFailure(clientKey: string, now = Date.now()): void {
  for (const [key, entry] of failures) {
    if (entry.resetAt <= now) failures.delete(key);
  }
  const entry = failures.get(clientKey);
  if (entry && entry.resetAt > now) {
    entry.failures += 1;
  } else {
    failures.delete(clientKey);
    if (failures.size >= MAX_TRACKED_CLIENTS) {
      // Maps iterate in insertion order, so this evicts the oldest entry.
      const oldestKey = failures.keys().next().value;
      if (oldestKey !== undefined) failures.delete(oldestKey);
    }
    failures.set(clientKey, { failures: 1, resetAt: now + WINDOW_MS });
  }
}

export function clearLoginFailures(clientKey: string): void {
  failures.delete(clientKey);
}
