import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { LatestCommentPreview } from "@/components/faultcalls/LatestCommentPreview";
import { CodeChip } from "@/components/ui/CodeChip";
import type { FaultCallListItem } from "@/lib/domain/types";
import { formatDateTime, isoDateTime } from "@/lib/format";

// One markup for all widths: a compact five-column table from 1024 px (lg),
// stacked rows with visible field labels below that. No horizontal scrolling.
const COLUMNS =
  "lg:grid lg:grid-cols-[9rem_9.5rem_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.2fr)] lg:gap-x-4";

const linkClass =
  "rounded-sm text-blue-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/** Field label: visible on narrow screens, announced to screen readers on wide ones. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-0.5 block text-xs font-medium text-slate-500 lg:sr-only">{children}</span>
  );
}

export function FaultCallList({ items }: { items: FaultCallListItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div
        aria-hidden="true"
        className={`hidden border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 ${COLUMNS}`}
      >
        <span>Rikketeade</span>
        <span>Automaat</span>
        <span>Rikkekood</span>
        <span>Kirjeldus</span>
        <span>Viimane tehniku kommentaar</span>
      </div>
      <ul className="divide-y divide-slate-200">
        {items.map((call) => (
          <li key={call.id}>
            <article
              aria-label={`Rikketeade ${call.externalId}`}
              className={`space-y-2 px-4 py-3 text-sm lg:space-y-0 ${COLUMNS}`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 lg:flex-col lg:items-start">
                <h2 className="text-base font-semibold leading-tight">
                  <Link href={`/rikketeated/${call.id}`} className={linkClass}>
                    {call.externalId}
                  </Link>
                </h2>
                <StatusBadge status={call.status} showIcon />
                <time dateTime={isoDateTime(call.registeredAt)} className="text-slate-700">
                  <span className="sr-only">Registreeritud </span>
                  {formatDateTime(call.registeredAt)}
                </time>
              </div>

              <div className="min-w-0">
                <FieldLabel>Automaat</FieldLabel>
                <Link href={`/seadmed/${call.atm.atmNumber}`} className={`font-medium ${linkClass}`}>
                  {call.atm.atmNumber}
                </Link>{" "}
                <span className="text-slate-600 lg:block">{call.atm.model}</span>
              </div>

              <div className="min-w-0">
                <FieldLabel>Rikkekood</FieldLabel>
                <CodeChip code={call.faultCode} showDescription={false} />
                {call.faultCode?.description ? (
                  <span className="ml-1.5 text-slate-800 lg:ml-0 lg:mt-0.5 lg:block">
                    {call.faultCode.description}
                  </span>
                ) : null}
              </div>

              <div className="min-w-0">
                <FieldLabel>Kirjeldus</FieldLabel>
                <p className="line-clamp-2 break-words text-slate-900 lg:line-clamp-3">
                  {call.originalDescription}
                </p>
              </div>

              <div className="min-w-0">
                <FieldLabel>Viimane tehniku kommentaar</FieldLabel>
                <LatestCommentPreview
                  status={call.status}
                  latestComment={call.latestComment}
                  visitCount={call.visitCount}
                />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
