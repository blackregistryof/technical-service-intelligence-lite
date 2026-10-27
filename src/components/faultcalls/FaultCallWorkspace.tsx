import Link from "next/link";
import { FaultCallContextPanel } from "@/components/faultcalls/FaultCallContextPanel";
import { FaultCallDetail } from "@/components/faultcalls/FaultCallDetail";
import { FaultCallList } from "@/components/faultcalls/FaultCallList";
import { StatusFilter } from "@/components/faultcalls/StatusFilter";
import { SearchForm } from "@/components/SearchForm";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FaultCallContext } from "@/lib/domain/context";
import type { ActiveStatus, StatusCounts } from "@/lib/domain/filters";
import { selectionState } from "@/lib/domain/selection";
import type { FaultCallListItem, WorkOrder } from "@/lib/domain/types";
import { describeFaultCallResult } from "@/lib/format";
import { faultCallDetailHref, faultCallListHref, withListParams } from "@/lib/links";

const linkClass =
  "rounded-sm font-medium text-blue-800 underline underline-offset-2 hover:text-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/**
 * Rikketeated master-detail workspace (server component).
 * - ≥1280 px: list | detail | ATM context
 * - 1024–1279 px: list | detail, with the context below the detail
 * - <1024 px: list and detail are separate URLs (/rikketeated, /rikketeated/[id])
 * The page scrolls as a whole; there are no nested scroll areas.
 */
export function FaultCallWorkspace({
  items,
  counts,
  query,
  status,
  selected = null,
  context = null,
}: {
  /** Active fault calls after search and status filter, newest first. */
  items: FaultCallListItem[];
  /** Counts of the search result before the status filter. */
  counts: StatusCounts;
  query: string;
  status: ActiveStatus | null;
  selected?: WorkOrder | null;
  context?: FaultCallContext | null;
}) {
  const listParams = { query, status };
  const basePath = selected ? `/rikketeated/${encodeURIComponent(selected.id)}` : "/rikketeated";
  const selection = selectionState(selected, items);
  const hasSelection = selected !== null;

  return (
    <div className="space-y-4">
      <header className={`space-y-1 ${hasSelection ? "hidden lg:block" : ""}`}>
        {hasSelection ? (
          <p className="text-2xl font-semibold text-slate-900">Rikketeated</p>
        ) : (
          <h1 id="rikketeated-pealkiri" className="text-2xl font-semibold text-slate-900">
            Rikketeated
          </h1>
        )}
        <p className="text-sm text-slate-600">
          Avatud ja ootel rikketeated, uusimad eespool. Suletud rikketeated ja hooldustööd on
          nähtavad seadme ajaloos.
        </p>
      </header>

      {hasSelection ? (
        <nav aria-label="Asukoht" className="text-sm lg:hidden">
          <Link href={faultCallListHref(listParams)} className={linkClass}>
            ← Rikketeated
          </Link>
        </nav>
      ) : null}

      <div className="gap-4 lg:grid lg:grid-cols-[minmax(18rem,21rem)_minmax(0,1fr)] lg:items-start">
        <section
          aria-labelledby="nimekiri-pealkiri"
          className={`min-w-0 space-y-3 ${hasSelection ? "hidden lg:block" : ""}`}
        >
          <h2 id="nimekiri-pealkiri" className="sr-only">
            Aktiivsed rikketeated
          </h2>
          <SearchForm
            action={basePath}
            label="Otsi töökäsu või automaadi numbri järgi"
            placeholder="WO-27480 või ATM-0101"
            defaultValue={query}
            hiddenFields={status ? { staatus: status } : {}}
            clearHref={withListParams(basePath, { status })}
          />
          <StatusFilter counts={counts} selected={status} query={query} basePath={basePath} />
          <p className="text-sm text-slate-700" aria-live="polite">
            {describeFaultCallResult(items.length, status, query)}
          </p>

          {selected && selection === "filteredOut" ? (
            <p role="note" className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Valitud rikketeade {selected.externalId} ei vasta praegusele otsingule või filtrile.{" "}
              <Link href={faultCallDetailHref(selected.id)} className={linkClass}>
                Näita kõiki aktiivseid
              </Link>
            </p>
          ) : null}
          {selected && selection === "notActive" ? (
            <p role="note" className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Valitud rikketeade {selected.externalId} on suletud ega kuulu aktiivsesse nimekirja.
            </p>
          ) : null}

          {items.length === 0 ? (
            <EmptyState
              title={
                query || status
                  ? "Valikule vastavaid rikketeateid ei leitud."
                  : "Avatud või ootel rikketeateid ei ole."
              }
            >
              {query || status ? (
                <Link href={withListParams(basePath)} className={linkClass}>
                  Tühjenda otsing ja filter
                </Link>
              ) : null}
            </EmptyState>
          ) : (
            <FaultCallList items={items} selectedId={selected?.id ?? null} listParams={listParams} />
          )}
        </section>

        <div
          className={`min-w-0 space-y-4 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(16rem,19rem)] xl:items-start xl:gap-4 xl:space-y-0 ${
            hasSelection ? "" : "hidden lg:block"
          }`}
        >
          {selected ? (
            <>
              <FaultCallDetail workOrder={selected} isActive={selection !== "notActive"} />
              {context ? (
                <FaultCallContextPanel
                  context={context}
                  currentWorkOrderId={selected.id}
                  listParams={listParams}
                />
              ) : null}
            </>
          ) : (
            <div className="xl:col-span-2">
              <EmptyState title="Vali rikketeade nimekirjast">
                <p>
                  Valitud rikketeate algne kirjeldus, tehnikukülastused ja automaadi kontekst
                  kuvatakse siin.
                </p>
                <p className="mt-1">
                  Nimekiri on järjestatud registreerimisaja järgi, uusimad eespool; järjekord ei
                  tähista prioriteeti.
                </p>
              </EmptyState>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
