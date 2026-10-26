import Link from "next/link";
import { Suspense } from "react";
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
        <Suspense fallback={<NavLinksFallback />}>
          <NavLinks />
        </Suspense>
      </div>
    </header>
  );
}
