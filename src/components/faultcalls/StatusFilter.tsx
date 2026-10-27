import Link from "next/link";
import { StatusIcon } from "@/components/ui/icons";
import type { ActiveStatus, StatusCounts } from "@/lib/domain/filters";
import { ALL_FILTER_LABEL, STATUS_LABELS } from "@/lib/format";
import { faultCallListHref } from "@/lib/links";

const OPTIONS: { status: ActiveStatus | null; label: string }[] = [
  { status: null, label: ALL_FILTER_LABEL },
  { status: "OPEN", label: STATUS_LABELS.OPEN },
  { status: "HOLD", label: STATUS_LABELS.HOLD },
];

/**
 * Status filter as plain links (works without JavaScript). Counts are
 * calculated from the current search result, not from the selected filter.
 */
export function StatusFilter({
  counts,
  selected,
  query,
}: {
  counts: StatusCounts;
  selected: ActiveStatus | null;
  query: string;
}) {
  return (
    <nav aria-label="Staatuse filter">
      <ul className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
        {OPTIONS.map(({ status, label }) => {
          const isSelected = status === selected;
          const count = status === null ? counts.total : counts[status];
          return (
            <li key={label}>
              <Link
                href={faultCallListHref({ query, status })}
                aria-current={isSelected ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-300"
                    : "text-slate-700 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                {status ? <StatusIcon status={status} /> : null}
                <span>{label}</span>
                <span
                  className={`rounded px-1.5 text-xs tabular-nums ${
                    isSelected ? "bg-slate-200 text-slate-900" : "bg-slate-200/70 text-slate-700"
                  }`}
                >
                  <span className="sr-only">: </span>
                  {count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
