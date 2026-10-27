import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { HoldIcon, OpenIcon } from "@/components/ui/icons";
import { ANALYSIS_PERIOD } from "@/lib/domain/analysis";
import type { AtmListItem, WorkType } from "@/lib/domain/types";
import { formatIsoDay } from "@/lib/format";
import { deviceHref } from "@/lib/links";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

function ActiveBadges({ atm }: { atm: AtmListItem }) {
  const { OPEN, HOLD } = atm.activeByStatus;
  if (OPEN === 0 && HOLD === 0) {
    return <span className="text-xs text-slate-600">Aktiivseid rikketeateid pole</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {OPEN > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-800">
          <OpenIcon className="h-3 w-3" />
          {OPEN} avatud
        </span>
      ) : null}
      {HOLD > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-900">
          <HoldIcon className="h-3 w-3" />
          {HOLD} ootel
        </span>
      ) : null}
    </span>
  );
}

/**
 * Searchable ATM list. On a device page the search and the links keep the
 * selected device and the history's work-type filter.
 */
export function DeviceSidebar({
  atms,
  query,
  selectedAtmNumber = null,
  workType = null,
}: {
  atms: AtmListItem[];
  query: string;
  selectedAtmNumber?: string | null;
  workType?: WorkType | null;
}) {
  const basePath = deviceHref(selectedAtmNumber);
  const selectedHidden =
    selectedAtmNumber !== null && !atms.some((a) => a.atmNumber === selectedAtmNumber);
  const period = ANALYSIS_PERIOD;

  return (
    <section aria-labelledby="seadmed-nimekiri" className="min-w-0 space-y-3">
      <h2 id="seadmed-nimekiri" className="sr-only">
        Automaadid
      </h2>
      <SearchForm
        action={basePath}
        label="Otsi automaadi numbri järgi"
        placeholder="ATM-0101 või 0101"
        defaultValue={query}
        hiddenFields={workType ? { liik: workType } : {}}
        clearHref={deviceHref(selectedAtmNumber, { workType })}
      />
      <p className="text-sm text-slate-700" aria-live="polite">
        {query
          ? `Otsingule „${query}“ vastab ${atms.length} automaati.`
          : `Automaate kokku: ${atms.length}.`}
      </p>

      {selectedHidden ? (
        <p role="note" className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Valitud automaat {selectedAtmNumber} ei vasta otsingule.{" "}
          <Link
            href={deviceHref(selectedAtmNumber, { workType })}
            className={`rounded-sm font-medium text-blue-800 underline underline-offset-2 ${focusRing}`}
          >
            Näita kõiki automaate
          </Link>
        </p>
      ) : null}

      {atms.length === 0 ? (
        <EmptyState title="Otsingule vastavaid automaate ei leitud." />
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {atms.map((atm) => {
            const isSelected = atm.atmNumber === selectedAtmNumber;
            return (
              <li key={atm.id}>
                <Link
                  href={deviceHref(atm.atmNumber, { query, workType })}
                  aria-current={isSelected ? "page" : undefined}
                  className={`block border-l-4 px-3 py-2.5 text-sm ${focusRing} focus-visible:-outline-offset-2 ${
                    isSelected
                      ? "border-l-blue-700 bg-blue-50"
                      : "border-l-transparent hover:bg-slate-50"
                  }`}
                >
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="font-semibold text-blue-800">{atm.atmNumber}</span>
                    {isSelected ? (
                      <span className="rounded bg-blue-700 px-1.5 py-0.5 text-xs font-semibold text-white">
                        Valitud
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-slate-700">{atm.model}</span>
                  <span className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <ActiveBadges atm={atm} />
                    <span className="text-xs whitespace-nowrap text-slate-700">
                      {atm.faultCallsInPeriod} / 30 p
                      <span className="sr-only"> registreeritud rikketeadet analüüsiperioodil</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-slate-600">
        „/ 30 p“ = registreeritud rikketeateid analüüsiperioodil {formatIsoDay(period.startDay)}–
        {formatIsoDay(period.endDay)}. Märgid näitavad avatud ja ootel rikketeateid.
      </p>
    </section>
  );
}
