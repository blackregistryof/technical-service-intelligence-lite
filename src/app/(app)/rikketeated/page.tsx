import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { FaultCode } from "@/components/FaultCode";
import { SearchForm } from "@/components/SearchForm";
import { getServiceRepository } from "@/lib/dal";
import { formatDateTime, isoDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Rikketeated",
};

export default async function RikketeatedPage(props: PageProps<"/rikketeated">) {
  const repository = await getServiceRepository();
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const faultCalls = await repository.listActiveFaultCalls(query);

  return (
    <section aria-labelledby="rikketeated-pealkiri" className="space-y-5">
      <header className="space-y-1">
        <h1 id="rikketeated-pealkiri" className="text-2xl font-semibold text-slate-900">
          Rikketeated
        </h1>
        <p className="text-sm text-slate-600">
          Avatud ja ootel rikketeated, uusimad eespool. Suletud rikketeated ja hooldustööd on
          nähtavad seadme ajaloos.
        </p>
      </header>

      <SearchForm
        action="/rikketeated"
        label="Otsi töökäsu või automaadi numbri järgi"
        placeholder="nt WO-27480 või ATM-0101"
        defaultValue={query}
      />

      <p className="text-sm text-slate-700" aria-live="polite">
        {query
          ? `Otsingule „${query}“ vastab ${faultCalls.length} aktiivset rikketeadet.`
          : `Aktiivseid rikketeateid: ${faultCalls.length}.`}
      </p>

      {faultCalls.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {query
            ? "Otsingule vastavaid avatud või ootel rikketeateid ei leitud."
            : "Avatud või ootel rikketeateid ei ole."}
        </p>
      ) : (
        <ul className="space-y-3">
          {faultCalls.map((call) => (
            <li key={call.id}>
              <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="text-base font-semibold">
                    <Link
                      href={`/rikketeated/${call.id}`}
                      className="text-blue-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      {call.externalId}
                    </Link>
                  </h2>
                  <StatusBadge status={call.status} />
                  <time
                    dateTime={isoDateTime(call.registeredAt)}
                    className="text-sm text-slate-600"
                  >
                    {formatDateTime(call.registeredAt)}
                  </time>
                </div>
                <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
                  <dt className="text-slate-600">Automaat</dt>
                  <dd>
                    <Link
                      href={`/seadmed/${call.atm.atmNumber}`}
                      className="text-blue-800 underline-offset-2 hover:underline"
                    >
                      {call.atm.atmNumber}
                    </Link>{" "}
                    <span className="text-slate-600">({call.atm.model})</span>
                  </dd>
                  <dt className="text-slate-600">Rikkekood</dt>
                  <dd className="text-slate-900">
                    <FaultCode code={call.faultCode} />
                  </dd>
                  <dt className="text-slate-600">Kirjeldus</dt>
                  <dd className="line-clamp-2 text-slate-900">{call.originalDescription}</dd>
                </dl>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
