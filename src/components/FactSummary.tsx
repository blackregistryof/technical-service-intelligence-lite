import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import type { AtmFactSummary, WorkOrderRef } from "@/lib/domain/types";
import {
  countFaultCalls,
  formatDateTime,
  formatIsoDay,
  isoDateTime,
  WORK_TYPE_LABELS,
} from "@/lib/format";

const linkClass =
  "text-blue-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/** Links to the record's own page for fault calls, otherwise to its entry in the history below. */
function WorkOrderLink({ workOrder }: { workOrder: WorkOrderRef }) {
  const href =
    workOrder.workType === "FAULT_CALL" ? `/rikketeated/${workOrder.id}` : `#${workOrder.id}`;
  return (
    <Link href={href} className={`font-medium ${linkClass}`}>
      {workOrder.externalId}
    </Link>
  );
}

/**
 * Factual, rule-based summary of one ATM's records. Pure presentation of the
 * domain summary; all values are calculated in src/lib/domain/analysis.ts.
 */
export function FactSummary({ summary }: { summary: AtmFactSummary }) {
  const { period, periodFaultCalls, latestWorkOrder: latest } = summary;
  const periodText = `${formatIsoDay(period.startDay)} 00:00 – ${formatIsoDay(period.endDay)} 23:59`;

  return (
    <section
      aria-labelledby="kokkuvote-pealkiri"
      className="rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <h2 id="kokkuvote-pealkiri" className="text-base font-semibold text-slate-900">
        Faktiline kokkuvõte
      </h2>

      <p
        role="note"
        className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      >
        <strong>Sünteetilised demoandmed.</strong> Kokkuvõte on reeglipõhine loendus salvestatud
        kirjetest. See ei ole tehisintellekti diagnoos ega rikke põhjuse hinnang.
      </p>

      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[11rem_1fr]">
        <dt className="text-slate-600">Võrdluskuupäev</dt>
        <dd className="font-semibold text-slate-900">
          <time dateTime={summary.referenceDate}>{formatIsoDay(summary.referenceDate)}</time>{" "}
          <span className="font-normal text-slate-600">(fikseeritud)</span>
        </dd>
        <dt className="text-slate-600">Analüüsiperiood</dt>
        <dd className="text-slate-900">
          <span className="font-semibold">{periodText}</span>{" "}
          <span className="text-slate-600">
            ({period.days} kalendripäeva, võrdluskuupäev kaasa arvatud; Eesti aeg)
          </span>
        </dd>
      </dl>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <section aria-labelledby="perioodi-rikked" className="rounded-md bg-white p-3">
          <h3 id="perioodi-rikked" className="text-sm text-slate-600">
            Registreeritud rikketeated perioodil
          </h3>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {countFaultCalls(summary.faultCallsInPeriod)}
          </p>
          {periodFaultCalls.length === 0 ? (
            <p className="mt-1 text-sm text-slate-700">
              Analüüsiperioodil ei registreeritud selle automaadi kohta ühtegi rikketeadet.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm" aria-label="Loendatud rikketeated">
              {periodFaultCalls.map((call) => (
                <li key={call.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <WorkOrderLink workOrder={call} />
                  <time dateTime={isoDateTime(call.registeredAt)} className="text-slate-600">
                    {formatDateTime(call.registeredAt)}
                  </time>
                  <StatusBadge status={call.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="viimane-too" className="rounded-md bg-white p-3">
          <h3 id="viimane-too" className="text-sm text-slate-600">
            Viimane registreeritud töö (kuni võrdluskuupäevani)
          </h3>
          {latest ? (
            <>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                <time dateTime={isoDateTime(latest.registeredAt)}>
                  {formatDateTime(latest.registeredAt)}
                </time>
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
                <span>{WORK_TYPE_LABELS[latest.workType]}</span>
                <WorkOrderLink workOrder={latest} />
                <StatusBadge status={latest.status} />
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-700">
              Selle automaadi kohta ei ole registreeritud ühtegi tööd.
            </p>
          )}
        </section>
      </div>

      <p className="mt-3 text-xs text-slate-600">
        Loendatakse rikketeateid (töökäske) nende registreerimise aja järgi, olenemata staatusest.
        Hooldustöid ja tehnikukülastusi ei loendata; mitu külastust ühe rikketeate juures loetakse
        üheks rikketeateks. Viimane registreeritud töö võib olla ka hooldustöö.
      </p>
    </section>
  );
}
