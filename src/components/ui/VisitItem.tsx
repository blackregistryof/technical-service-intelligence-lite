import { CodeChip } from "@/components/ui/CodeChip";
import { VisitIcon } from "@/components/ui/icons";
import { MissingValue } from "@/components/ui/MissingValue";
import type { TechnicianVisit } from "@/lib/domain/types";
import { formatDateTime, isoDateTime } from "@/lib/format";

/**
 * One technician visit, visually distinct from a work order (person icon and
 * the "Tehnikukülastus" label). Shows only stored fields; the technician
 * comment is rendered verbatim and a missing value is labelled, never filled in.
 */
export function VisitItem({
  visit,
  position,
  total,
  isLatest = false,
}: {
  visit: TechnicianVisit;
  /** 1-based position in chronological order. */
  position: number;
  total: number;
  isLatest?: boolean;
}) {
  return (
    <article
      id={visit.id}
      aria-label={`Tehnikukülastus ${position}/${total}`}
      className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <VisitIcon className="h-4 w-4 text-slate-500" />
        <span className="font-medium text-slate-900">
          Tehnikukülastus {position}/{total}
        </span>
        <time dateTime={isoDateTime(visit.visitedAt)} className="text-slate-700">
          {formatDateTime(visit.visitedAt)}
        </time>
        {isLatest ? (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
            Viimane külastus
          </span>
        ) : null}
      </header>
      <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
        <dt className="text-slate-600">Tehtud tööd</dt>
        <dd className="text-slate-900">{visit.actions}</dd>
        <dt className="text-slate-600">Tehniku kommentaar</dt>
        <dd className="whitespace-pre-line text-slate-900">
          {visit.originalComment ?? <MissingValue>Kommentaar puudub</MissingValue>}
        </dd>
        <dt className="text-slate-600">Tulemus</dt>
        <dd className="text-slate-900">
          {visit.outcome ?? <MissingValue>Märkimata</MissingValue>}
        </dd>
        <dt className="text-slate-600">Lahenduskood</dt>
        <dd>
          <CodeChip code={visit.resolution} missingLabel="Puudub" />
        </dd>
      </dl>
    </article>
  );
}
