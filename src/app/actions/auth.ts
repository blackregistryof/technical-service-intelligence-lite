"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AuthConfigError,
  getAuthConfig,
  logAuthConfigError,
  type AuthConfig,
} from "@/lib/auth/config";
import {
  clearLoginFailures,
  loginRetryAfterMs,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { endSession, HOME_PATH, LOGIN_PATH, startSession } from "@/lib/auth/server";
import { passwordMatches } from "@/lib/auth/session";

export type LoginState = {
  error?: string;
};

const MAX_PASSWORD_LENGTH = 256;

async function clientKey(): Promise<string> {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
}

// The submitted password is never logged, returned or stored.
export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { error: "Sisesta parool." };
  }

  let config: AuthConfig;
  try {
    config = getAuthConfig();
  } catch (error) {
    if (error instanceof AuthConfigError) {
      logAuthConfigError(error);
      return {
        error:
          "Sisselogimine ei ole praegu võimalik, sest rakenduse autentimine ei ole seadistatud. Palun teavita rakenduse haldajat.",
      };
    }
    throw error;
  }

  const key = await clientKey();
  const retryAfterMs = loginRetryAfterMs(key);
  if (retryAfterMs > 0) {
    const minutes = Math.ceil(retryAfterMs / 60_000);
    return {
      error: `Liiga palju ebaõnnestunud katseid. Proovi uuesti ${minutes} minuti pärast.`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH || !passwordMatches(password, config)) {
    recordLoginFailure(key);
    return { error: "Vale parool. Proovi uuesti." };
  }

  clearLoginFailures(key);
  await startSession(config);
  redirect(HOME_PATH);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect(LOGIN_PATH);
}
