// Authentication configuration read from the environment.
// There is deliberately no fallback password or secret: if a value is missing
// or too weak, every authentication check fails closed.

export const MIN_SESSION_SECRET_LENGTH = 32;

export type AuthConfig = {
  accessPassword: string;
  sessionSecret: string;
};

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

export function getAuthConfig(): AuthConfig {
  const accessPassword = process.env.APP_ACCESS_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  // Error messages name the variables but never include their values.
  if (!accessPassword) {
    throw new AuthConfigError("APP_ACCESS_PASSWORD is not set.");
  }
  if (!sessionSecret) {
    throw new AuthConfigError("SESSION_SECRET is not set.");
  }
  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new AuthConfigError(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters long.`,
    );
  }

  return { accessPassword, sessionSecret };
}

let lastLoggedConfigError: string | undefined;

/** Logs a configuration problem once per distinct message to avoid log noise. */
export function logAuthConfigError(error: AuthConfigError): void {
  if (lastLoggedConfigError === error.message) return;
  lastLoggedConfigError = error.message;
  console.error(`[auth] Configuration error: ${error.message}`);
}
