import type { TechnicianVisit } from "@/lib/domain/types";
import { formatDateTime, isoDateTime } from "@/lib/format";

/** Technician visits of one work order, oldest first. Missing values are labelled, not filled in. */
export function VisitList({ visits }: { visits: TechnicianVisit[] }) {
  if (visits.length === 0) {
    return <p className="text-sm text-slate-600">Tehnikukülastusi ei ole registreeritud.</p>;
  }

  return (
    <ol className="space-y-3">
      {visits.map((visit, index) => (
        <li
          key={visit.id}
          id={visit.id}
          className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"
        >
          <p className="font-medium text-slate-900">
            Tehnikukülastus {index + 1}/{visits.length} ·{" "}
            <time dateTime={isoDateTime(visit.visitedAt)}>{formatDateTime(visit.visitedAt)}</time>
          </p>
          <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[10rem_1fr]">
            <dt className="text-slate-600">Tehtud tööd</dt>
            <dd className="text-slate-900">{visit.actions}</dd>
            <dt className="text-slate-600">Tehniku kommentaar</dt>
            <dd className="whitespace-pre-line text-slate-900">
              {visit.originalComment ?? (
                <span className="italic text-slate-500">Kommentaar puudub</span>
              )}
            </dd>
            <dt className="text-slate-600">Tulemus</dt>
            <dd className="text-slate-900">
              {visit.outcome ?? <span className="italic text-slate-500">Märkimata</span>}
            </dd>
            <dt className="text-slate-600">Lahenduskood</dt>
            <dd className="text-slate-900">
              {visit.resolution ? (
                <>
                  <span className="font-mono">{visit.resolution.code}</span>
                  {visit.resolution.description ? ` – ${visit.resolution.description}` : null}
                </>
              ) : (
                <span className="italic text-slate-500">Puudub</span>
              )}
            </dd>
          </dl>
        </li>
      ))}
    </ol>
  );
}
