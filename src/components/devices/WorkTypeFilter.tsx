import Link from "next/link";
import { WorkTypeIcon } from "@/components/ui/icons";
import type { WorkTypeCounts } from "@/lib/domain/filters";
import type { WorkType } from "@/lib/domain/types";
import { ALL_FILTER_LABEL, WORK_TYPE_FILTER_LABELS } from "@/lib/format";
import { deviceHref } from "@/lib/links";

const OPTIONS: { workType: WorkType | null; label: string }[] = [
  { workType: null, label: ALL_FILTER_LABEL },
  { workType: "FAULT_CALL", label: WORK_TYPE_FILTER_LABELS.FAULT_CALL },
  { workType: "MAINTENANCE", label: WORK_TYPE_FILTER_LABELS.MAINTENANCE },
];

/** History filter (all work / fault calls / maintenance) as plain links; keeps the selected ATM. */
export function WorkTypeFilter({
  atmNumber,
  counts,
  selected,
  query,
}: {
  atmNumber: string;
  counts: WorkTypeCounts;
  selected: WorkType | null;
  query: string;
}) {
  return (
    <nav aria-label="Töö liigi filter">
      <ul className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
        {OPTIONS.map(({ workType, label }) => {
          const isSelected = workType === selected;
          const count = workType === null ? counts.total : counts[workType];
          return (
            <li key={label}>
              <Link
                href={deviceHref(atmNumber, { query, workType })}
                aria-current={isSelected ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-300"
                    : "text-slate-700 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                {workType ? <WorkTypeIcon workType={workType} /> : null}
                <span>{label}</span>
                <span className="rounded bg-slate-200 px-1.5 text-xs tabular-nums text-slate-800">
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
