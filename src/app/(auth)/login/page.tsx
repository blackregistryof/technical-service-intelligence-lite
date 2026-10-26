import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthConfigError, getAuthConfig, logAuthConfigError } from "@/lib/auth/config";
import { getSession, HOME_PATH } from "@/lib/auth/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sisselogimine",
};

function isAuthConfigured(): boolean {
  try {
    getAuthConfig();
    return true;
  } catch (error) {
    if (error instanceof AuthConfigError) {
      logAuthConfigError(error);
      return false;
    }
    throw error;
  }
}

export default async function LoginPage() {
  // Evaluate the environment at request time, not at build time.
  await connection();

  if (await getSession()) {
    redirect(HOME_PATH);
  }

  return (
    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-xl font-semibold text-slate-900">TSI Lite</h1>
      <p className="mt-1 text-sm text-slate-600">
        Logi sisse ühise juurdepääsuparooliga.
      </p>
      <div className="mt-6">
        {isAuthConfigured() ? (
          <LoginForm />
        ) : (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            Sisselogimine ei ole praegu võimalik, sest rakenduse autentimine ei
            ole seadistatud. Palun teavita rakenduse haldajat.
          </p>
        )}
      </div>
    </div>
  );
}
