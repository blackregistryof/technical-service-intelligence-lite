import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { NavLinks, type NavSection } from "@/components/NavLinks";
import { focusRing } from "@/components/ui/styles";
import { REFERENCE_DATE } from "@/lib/domain/analysis";
import { formatIsoDay } from "@/lib/format";

export function AppHeader({ current }: { current: NavSection }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/rikketeated"
            className={`rounded-sm text-lg font-semibold tracking-tight text-slate-900 ${focusRing}`}
          >
            TSI Lite
            <span className="ml-2 hidden text-sm font-normal text-slate-600 md:inline">
              Tehnilise hoolduse ülevaade
            </span>
          </Link>
          <p className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
            Võrdluskuupäev{" "}
            <time dateTime={REFERENCE_DATE}>{formatIsoDay(REFERENCE_DATE)}</time> · sünteetilised
            andmed
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <NavLinks current={current} />
          <form action={logout}>
            <button
              type="submit"
              className={`rounded-md border border-slate-300 px-3 py-2 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
            >
              Logi välja
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
