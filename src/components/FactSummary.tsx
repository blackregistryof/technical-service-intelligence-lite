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
import { deviceHref } from "@/lib/links";
import { focusRing, recordLink } from "@/components/ui/styles";

/**
 * Links to the record's own page for fault calls, otherwise to its entry in
 * the unfiltered device history (so it also works while a filter hides it).
 */
function WorkOrderLink({ workOrder, atmNumber }: { workOrder: WorkOrderRef; atmNumber: string }) {
  const href =
    workOrder.workType === "FAULT_CALL"
      ? `/rikketeated/${workOrder.id}`
      : deviceHref(atmNumber, {}, workOrder.id);
  return (
    <Link href={href} className={recordLink}>
      {workOrder.externalId}
    </Link>
  );
}

/**
 * Factual, rule-based summary of one ATM's records. Pure presentation of the
 * domain summary; all values are calculated in src/lib/domain/analysis.ts.
 */
export function FactSummary({
  summary,
  atmNumber,
}: {
  summary: AtmFactSummary;
  atmNumber: string;
}) {
  const { period, periodFaultCalls, latestWorkOrder: latest } = summary;
  const periodText = `${formatIsoDay(period.startDay)} 00:00 – ${formatIsoDay(period.endDay)} 23:59`;

  return (
    <section
      aria-labelledby="kokkuvote-pealkiri"
      className="@container rounded-lg border border-blue-200 bg-blue-50 p-3 @md:p-4"
    >
      <h2 id="kokkuvote-pealkiri" className="text-base font-semibold text-slate-900">
        Faktiline kokkuvõte
      </h2>

      <p
        role="note"
        className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-meta text-amber-950"
      >
        <strong>Sünteetilised demoandmed.</strong> Kokkuvõte on reeglipõhine loendus salvestatud
        kirjetest. See ei ole tehisintellekti diagnoos ega rikke põhjuse hinnang.
      </p>

      <dl className="mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
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

      <div className="mt-2 grid gap-2 @lg:grid-cols-2">
        <section aria-labelledby="perioodi-rikked" className="rounded-md bg-white px-3 py-2">
          <h3 id="perioodi-rikked" className="text-meta text-slate-600">
            Registreeritud rikketeated perioodil
          </h3>
          <p className="text-xl font-semibold text-slate-900">
            {countFaultCalls(summary.faultCallsInPeriod)}
          </p>
          {periodFaultCalls.length === 0 ? (
            <p className="text-sm text-slate-700">
              Analüüsiperioodil ei registreeritud selle automaadi kohta ühtegi rikketeadet.
            </p>
          ) : (
            <ul className="mt-1 space-y-0.5 text-sm" aria-label="Loendatud rikketeated">
              {periodFaultCalls.map((call) => (
                <li key={call.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <WorkOrderLink workOrder={call} atmNumber={atmNumber} />
                  <time dateTime={isoDateTime(call.registeredAt)} className="text-slate-700">
                    {formatDateTime(call.registeredAt)}
                  </time>
                  <StatusBadge status={call.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="viimane-too" className="rounded-md bg-white px-3 py-2">
          <h3 id="viimane-too" className="text-meta text-slate-600">
            Viimane registreeritud töö (kuni võrdluskuupäevani)
          </h3>
          {latest ? (
            <>
              <p className="text-lg font-semibold text-slate-900">
                <time dateTime={isoDateTime(latest.registeredAt)}>
                  {formatDateTime(latest.registeredAt)}
                </time>
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-700">
                <span>{WORK_TYPE_LABELS[latest.workType]}</span>
                <WorkOrderLink workOrder={latest} atmNumber={atmNumber} />
                <StatusBadge status={latest.status} />
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-700">
              Selle automaadi kohta ei ole registreeritud ühtegi tööd.
            </p>
          )}
        </section>
      </div>

      {/* Native disclosure: no JavaScript, the text stays in the HTML for search and assistive tech. */}
      <details className="mt-2 text-meta text-slate-700">
        <summary className={`cursor-pointer rounded-sm font-medium text-slate-800 ${focusRing}`}>
          Kuidas loendatakse?
        </summary>
        <p className="mt-1">
          Loendatakse rikketeateid (töökäske) nende registreerimise aja järgi, olenemata
          staatusest. Hooldustöid ja tehnikukülastusi ei loendata; mitu külastust ühe rikketeate
          juures loetakse üheks rikketeateks. Viimane registreeritud töö võib olla ka hooldustöö.
        </p>
      </details>
    </section>
  );
}
