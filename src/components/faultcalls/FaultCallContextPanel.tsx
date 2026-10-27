import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { WorkTypeIcon } from "@/components/ui/icons";
import type { FaultCallContext } from "@/lib/domain/context";
import type { WorkOrderRef } from "@/lib/domain/types";
import {
  countFaultCalls,
  formatDate,
  formatDateTime,
  formatIsoDay,
  isoDateTime,
  WORK_TYPE_LABELS,
} from "@/lib/format";
import { faultCallDetailHref, type FaultCallListParams } from "@/lib/links";
import { recordLink } from "@/components/ui/styles";

const linkClass = recordLink;

/** Fault calls open in the workspace (keeping the list state); maintenance links to the history entry. */
function hrefFor(item: WorkOrderRef, atmNumber: string, listParams: FaultCallListParams) {
  return item.workType === "FAULT_CALL"
    ? faultCallDetailHref(item.id, listParams)
    : `/seadmed/${atmNumber}#${item.id}`;
}

function RefRow({
  item,
  atmNumber,
  listParams,
  isCurrent,
  showType = false,
  dateOnly = false,
}: {
  item: WorkOrderRef;
  atmNumber: string;
  listParams: FaultCallListParams;
  isCurrent: boolean;
  showType?: boolean;
  dateOnly?: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      {showType ? (
        <span className="inline-flex items-center gap-1 text-meta text-slate-600">
          <WorkTypeIcon workType={item.workType} />
          <span className="sr-only">{WORK_TYPE_LABELS[item.workType]}</span>
        </span>
      ) : null}
      <Link
        href={hrefFor(item, atmNumber, listParams)}
        aria-current={isCurrent ? "page" : undefined}
        className={linkClass}
      >
        {item.externalId}
      </Link>
      {isCurrent ? <span className="text-meta font-semibold text-slate-700">(valitud)</span> : null}
      <StatusBadge status={item.status} showIcon />
      <time dateTime={isoDateTime(item.registeredAt)} className="ml-auto text-meta text-slate-600">
        {dateOnly ? formatDate(item.registeredAt) : formatDateTime(item.registeredAt)}
      </time>
    </li>
  );
}

/**
 * ATM context for the selected fault call, built with buildFaultCallContext.
 * Factual references to existing records only; no rankings or diagnoses.
 */
export function FaultCallContextPanel({
  context,
  currentWorkOrderId,
  listParams = {},
}: {
  context: FaultCallContext;
  currentWorkOrderId: string;
  listParams?: FaultCallListParams;
}) {
  const { atm, summary, otherActiveFaultCalls, recentWorkOrders, totalWorkOrders } = context;
  const { period } = summary;

  return (
    <aside
      aria-labelledby="kontekst-pealkiri"
      className="min-w-0 space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <header>
        <h2 id="kontekst-pealkiri" className="text-meta font-semibold text-slate-700">
          Automaadi kontekst
        </h2>
        <p className="mt-0.5 text-lg font-semibold text-slate-900">
          {atm.atmNumber} <span className="text-base font-normal text-slate-700">{atm.model}</span>
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Võrdluskuupäev {formatIsoDay(summary.referenceDate)} · sünteetilised demoandmed ·
          faktiline loendus, mitte diagnoos
        </p>
      </header>

      <section aria-labelledby="kontekst-perioodil" className="rounded-md bg-slate-50 p-3">
        <h3 id="kontekst-perioodil" className="text-meta text-slate-600">
          Rikketeated {formatIsoDay(period.startDay)}–{formatIsoDay(period.endDay)} ({period.days}{" "}
          päeva)
        </h3>
        <p className="text-xl font-semibold text-slate-900">
          {countFaultCalls(summary.faultCallsInPeriod)}
        </p>
        {summary.periodFaultCalls.length === 0 ? (
          <p className="text-sm text-slate-700">Perioodil ei registreeritud ühtegi rikketeadet.</p>
        ) : (
          <ul className="mt-1 space-y-1" aria-label="Perioodil loendatud rikketeated">
            {summary.periodFaultCalls.map((item) => (
              <RefRow
                key={item.id}
                item={item}
                atmNumber={atm.atmNumber}
                listParams={listParams}
                isCurrent={item.id === currentWorkOrderId}
                dateOnly
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="kontekst-aktiivsed" className="space-y-1">
        <h3 id="kontekst-aktiivsed" className="text-sm font-semibold text-slate-800">
          Teised aktiivsed rikketeated sellel automaadil
        </h3>
        {otherActiveFaultCalls.length === 0 ? (
          <p className="text-sm text-slate-700">Teisi avatud või ootel rikketeateid ei ole.</p>
        ) : (
          <ul className="space-y-1">
            {otherActiveFaultCalls.map((item) => (
              <RefRow
                key={item.id}
                item={item}
                atmNumber={atm.atmNumber}
                listParams={listParams}
                isCurrent={false}
                dateOnly
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="kontekst-viimased" className="space-y-1">
        <h3 id="kontekst-viimased" className="text-sm font-semibold text-slate-800">
          Viimased tööd
        </h3>
        <ul className="space-y-1">
          {recentWorkOrders.map((item) => (
            <RefRow
              key={item.id}
              item={item}
              atmNumber={atm.atmNumber}
              listParams={listParams}
              isCurrent={item.id === currentWorkOrderId}
              showType
              dateOnly
            />
          ))}
        </ul>
      </section>

      <Link
        href={`/seadmed/${atm.atmNumber}`}
        className="block rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm font-semibold text-blue-900 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Automaadi {atm.atmNumber} kogu ajalugu ({totalWorkOrders} töökäsku)
      </Link>
    </aside>
  );
}
