import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/actions/auth";
import { NavLinks, NavLinksFallback } from "@/components/NavLinks";

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link
          href="/rikketeated"
          className="text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          TSI Lite
          <span className="ml-2 hidden text-sm font-normal text-slate-500 md:inline">
            Tehnilise hoolduse ülevaade
          </span>
        </Link>
        {/* usePathname suspends on routes with unknown dynamic params when cacheComponents is enabled. */}
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Logi välja
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
