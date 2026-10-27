import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { DeviceSidebar } from "@/components/devices/DeviceSidebar";
import { ServiceTimeline } from "@/components/devices/ServiceTimeline";
import { WorkTypeFilter } from "@/components/devices/WorkTypeFilter";
import { FactSummary } from "@/components/FactSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { isActiveFaultCall } from "@/lib/domain/analysis";
import { countByWorkType, filterByWorkType } from "@/lib/domain/filters";
import type { AtmHistory, AtmListItem, WorkType } from "@/lib/domain/types";
import { countVisits, countWorkOrders, WORK_TYPE_FILTER_LABELS } from "@/lib/format";
import { deviceHref } from "@/lib/links";
import { recordLink, textLink } from "@/components/ui/styles";


function DeviceDetail({
  history,
  workType,
  query,
}: {
  history: AtmHistory;
  workType: WorkType | null;
  query: string;
}) {
  const { atm, summary, workOrders } = history;
  const activeCalls = workOrders.filter(isActiveFaultCall);
  const shown = filterByWorkType(workOrders, workType);
  const totalVisits = workOrders.reduce((sum, w) => sum + w.visits.length, 0);
  const shownVisits = shown.reduce((sum, w) => sum + w.visits.length, 0);

  return (
    <article aria-labelledby="seade-pealkiri" className="min-w-0 space-y-3 sm:space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 id="seade-pealkiri" className="text-2xl font-semibold text-slate-900">
            Automaat {atm.atmNumber}
          </h1>
          <p className="text-sm text-slate-700">Mudel: {atm.model}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Aktiivsed rikketeated:</span>
          {activeCalls.length === 0 ? (
            <span className="text-slate-700">puuduvad</span>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {activeCalls.map((call) => (
                <li
                  key={call.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1"
                >
                  <Link href={`/rikketeated/${call.id}`} className={recordLink}>
                    {call.externalId}
                  </Link>
                  <StatusBadge status={call.status} showIcon />
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="space-y-3 sm:space-y-4 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(17rem,19rem)] xl:items-start xl:gap-5 xl:space-y-0">
        <div className="xl:sticky xl:top-4 xl:col-start-2 xl:row-start-1">
          <FactSummary summary={summary} atmNumber={atm.atmNumber} />
        </div>

        <section aria-labelledby="ajalugu-pealkiri" className="min-w-0 space-y-3 xl:col-start-1 xl:row-start-1">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="ajalugu-pealkiri" className="text-base font-semibold text-slate-900">
                Tööde ajalugu ({countWorkOrders(workOrders.length)})
              </h2>
              <p className="text-sm text-slate-600">
                {countWorkOrders(workOrders.length)} · {countVisits(totalVisits)}. Uusimad eespool;
                tehnikukülastused on näidatud oma töökäsu all.
              </p>
            </div>
            <WorkTypeFilter
              atmNumber={atm.atmNumber}
              counts={countByWorkType(workOrders)}
              selected={workType}
              query={query}
            />
          </div>
          {workType ? (
            <p className="text-sm text-slate-700" aria-live="polite">
              Kuvatakse {countWorkOrders(shown.length)} ({WORK_TYPE_FILTER_LABELS[workType].toLowerCase()}
              ) ja {countVisits(shownVisits)}.{" "}
              <Link href={deviceHref(atm.atmNumber, { query })} className={textLink}>
                Näita kõiki töid
              </Link>
            </p>
          ) : null}

          {shown.length === 0 ? (
            <EmptyState
              title={
                workOrders.length === 0
                  ? "Selle automaadi kohta ei ole registreeritud töid."
                  : "Valitud liiki töid selle automaadi kohta ei ole."
              }
            />
          ) : (
            <ServiceTimeline workOrders={shown} period={summary.period} />
          )}
        </section>
      </div>
    </article>
  );
}

/**
 * Seadmed master-detail workspace (server component).
 * - ≥1280 px: ATM list | timeline | factual summary (sticky)
 * - 1024–1279 px: ATM list | summary above the timeline
 * - <1024 px: ATM list (/seadmed) and device page (/seadmed/[atmNumber]) are separate
 */
export function DeviceWorkspace({
  atms,
  query,
  history = null,
  workType = null,
}: {
  atms: AtmListItem[];
  query: string;
  history?: AtmHistory | null;
  workType?: WorkType | null;
}) {
  const selected = history?.atm.atmNumber ?? null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className={`space-y-1 ${selected ? "hidden lg:block" : ""}`}>
        {selected ? (
          <p className="text-2xl font-semibold text-slate-900">Seadmed</p>
        ) : (
          <h1 id="seadmed-pealkiri" className="text-2xl font-semibold text-slate-900">
            Seadmed
          </h1>
        )}
        <p className="text-sm text-slate-600">
          Sularahaautomaatide otsing ning rikketeadete, hooldustööde ja tehnikukülastuste ajalugu.
        </p>
      </header>

      {selected ? (
        <nav aria-label="Asukoht" className="text-sm lg:hidden">
          <Link href={deviceHref(null, { query })} className={textLink}>
            ← Seadmed
          </Link>
        </nav>
      ) : null}

      <div className="gap-4 lg:grid lg:grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)] lg:items-start">
        <div className={selected ? "hidden lg:block" : ""}>
          <DeviceSidebar atms={atms} query={query} selectedAtmNumber={selected} workType={workType} />
        </div>
        <div className={`min-w-0 ${selected ? "" : "hidden lg:block"}`}>
          {history ? (
            <DeviceDetail history={history} workType={workType} query={query} />
          ) : (
            <EmptyState title="Vali automaat nimekirjast">
              <p>
                Valitud automaadi faktiline kokkuvõte ning rikketeadete ja hooldustööde ajalugu
                kuvatakse siin.
              </p>
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  );
}
