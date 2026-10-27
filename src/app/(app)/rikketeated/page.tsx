import type { Metadata } from "next";
import Link from "next/link";
import { FaultCallList } from "@/components/faultcalls/FaultCallList";
import { StatusFilter } from "@/components/faultcalls/StatusFilter";
import { SearchForm } from "@/components/SearchForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { getServiceRepository } from "@/lib/dal";
import { countByStatus, filterByStatus, parseStatusFilter } from "@/lib/domain/filters";
import { describeFaultCallResult } from "@/lib/format";
import { faultCallListHref } from "@/lib/links";

export const metadata: Metadata = {
  title: "Rikketeated",
};

export default async function RikketeatedPage(props: PageProps<"/rikketeated">) {
  const repository = await getServiceRepository();
  const { q, staatus } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const status = parseStatusFilter(staatus);

  // Search and filtering happen on the server; the list stays newest first.
  const searchResult = await repository.listActiveFaultCalls(query);
  const counts = countByStatus(searchResult);
  const faultCalls = filterByStatus(searchResult, status);

  return (
    <section aria-labelledby="rikketeated-pealkiri" className="space-y-4">
      <header className="space-y-1">
        <h1 id="rikketeated-pealkiri" className="text-2xl font-semibold text-slate-900">
          Rikketeated
        </h1>
        <p className="text-sm text-slate-600">
          Avatud ja ootel rikketeated, uusimad eespool. Suletud rikketeated ja hooldustööd on
          nähtavad seadme ajaloos.
        </p>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 lg:max-w-xl lg:flex-1">
          <SearchForm
            action="/rikketeated"
            label="Otsi töökäsu või automaadi numbri järgi"
            placeholder="nt WO-27480 või ATM-0101"
            defaultValue={query}
            hiddenFields={status ? { staatus: status } : {}}
            clearHref={faultCallListHref({ status })}
          />
        </div>
        <StatusFilter counts={counts} selected={status} query={query} />
      </div>

      <p className="text-sm text-slate-700" aria-live="polite">
        {describeFaultCallResult(faultCalls.length, status, query)}
      </p>

      {faultCalls.length === 0 ? (
        <EmptyState
          title={
            query || status
              ? "Valikule vastavaid rikketeateid ei leitud."
              : "Avatud või ootel rikketeateid ei ole."
          }
        >
          {query || status ? (
            <Link
              href="/rikketeated"
              className="font-medium text-blue-800 underline underline-offset-2 hover:text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Tühjenda otsing ja filter
            </Link>
          ) : null}
        </EmptyState>
      ) : (
        <FaultCallList items={faultCalls} />
      )}
    </section>
  );
}
