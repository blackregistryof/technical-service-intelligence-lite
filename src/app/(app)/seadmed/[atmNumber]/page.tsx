import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge, WorkTypeBadge } from "@/components/Badges";
import { FactSummary } from "@/components/FactSummary";
import { FaultCode } from "@/components/FaultCode";
import { VisitList } from "@/components/VisitList";
import { getServiceRepository } from "@/lib/dal";
import { formatDateTime, isoDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Seadme ajalugu",
};

export default async function AtmHistoryPage(props: PageProps<"/seadmed/[atmNumber]">) {
  const repository = await getServiceRepository();
  const { atmNumber } = await props.params;
  const history = await repository.getAtmHistory(atmNumber);
  if (!history) {
    notFound();
  }
  const { atm, summary, workOrders } = history;

  return (
    <article aria-labelledby="seade-pealkiri" className="space-y-6">
      <nav aria-label="Asukoht" className="text-sm">
        <Link href="/seadmed" className="text-blue-800 underline-offset-2 hover:underline">
          ← Seadmed
        </Link>
      </nav>

      <header className="space-y-1">
        <h1 id="seade-pealkiri" className="text-2xl font-semibold text-slate-900">
          Automaat {atm.atmNumber}
        </h1>
        <p className="text-sm text-slate-700">Mudel: {atm.model}</p>
      </header>

      <FactSummary summary={summary} />

      <section aria-labelledby="ajalugu-pealkiri" className="space-y-3">
        <div>
          <h2 id="ajalugu-pealkiri" className="text-base font-semibold text-slate-900">
            Tööde ajalugu ({workOrders.length} töökäsku)
          </h2>
          <p className="text-sm text-slate-600">
            Rikketeated ja hooldustööd, sh suletud tööd; uusimad eespool. Tehnikukülastused on
            näidatud nende töökäsu all.
          </p>
        </div>

        {workOrders.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            Selle automaadi kohta ei ole registreeritud töid.
          </p>
        ) : (
          <ol className="space-y-4">
            {workOrders.map((workOrder) => (
              <li key={workOrder.id} id={workOrder.id} className="scroll-mt-4">
                <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-base font-semibold text-slate-900">
                      {workOrder.workType === "FAULT_CALL" ? (
                        <Link
                          href={`/rikketeated/${workOrder.id}`}
                          className="text-blue-800 underline-offset-2 hover:underline"
                        >
                          {workOrder.externalId}
                        </Link>
                      ) : (
                        workOrder.externalId
                      )}
                    </h3>
                    <WorkTypeBadge workType={workOrder.workType} />
                    <StatusBadge status={workOrder.status} />
                    <time
                      dateTime={isoDateTime(workOrder.registeredAt)}
                      className="text-sm text-slate-600"
                    >
                      {formatDateTime(workOrder.registeredAt)}
                    </time>
                  </div>
                  <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
                    {workOrder.workType === "FAULT_CALL" ? (
                      <>
                        <dt className="text-slate-600">Rikkekood</dt>
                        <dd>
                          <FaultCode code={workOrder.faultCode} />
                        </dd>
                      </>
                    ) : null}
                    <dt className="text-slate-600">Kirjeldus</dt>
                    <dd className="whitespace-pre-line text-slate-900">
                      {workOrder.originalDescription}
                    </dd>
                  </dl>
                  <div className="mt-3 space-y-2">
                    <h4 className="text-sm font-medium text-slate-800">
                      Tehnikukülastused ({workOrder.visits.length})
                    </h4>
                    <VisitList visits={workOrder.visits} />
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}
