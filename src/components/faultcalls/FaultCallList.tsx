import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { LatestCommentPreview } from "@/components/faultcalls/LatestCommentPreview";
import { CodeChip } from "@/components/ui/CodeChip";
import type { FaultCallListItem } from "@/lib/domain/types";
import { formatDateTime, isoDateTime } from "@/lib/format";
import { faultCallDetailHref, type FaultCallListParams } from "@/lib/links";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/**
 * Compact active fault-call list for the master-detail workspace. Each row
 * opens the call's detail; the whole row is clickable through the ID link
 * (stretched), while the ATM link stays separately reachable. The selected
 * call is marked with aria-current, a bar, a background and a "Valitud" label.
 */
export function FaultCallList({
  items,
  selectedId = null,
  listParams = {},
}: {
  items: FaultCallListItem[];
  selectedId?: string | null;
  listParams?: FaultCallListParams;
}) {
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {items.map((call) => {
        const isSelected = call.id === selectedId;
        return (
          <li
            key={call.id}
            className={`relative border-l-4 px-3 py-2.5 text-sm has-[a.peer:focus-visible]:bg-blue-50 ${
              isSelected ? "border-l-blue-700 bg-blue-50" : "border-l-transparent hover:bg-slate-50"
            }`}
          >
            <article aria-label={`Rikketeade ${call.externalId}`} className="space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="text-base font-semibold leading-tight">
                  <Link
                    href={faultCallDetailHref(call.id, listParams)}
                    aria-current={isSelected ? "page" : undefined}
                    className={`peer rounded-sm text-blue-800 underline-offset-2 after:absolute after:inset-0 hover:underline ${focusRing}`}
                  >
                    {call.externalId}
                  </Link>
                </h3>
                <StatusBadge status={call.status} showIcon />
                {isSelected ? (
                  <span className="rounded bg-blue-700 px-1.5 py-0.5 text-xs font-semibold text-white">
                    Valitud
                  </span>
                ) : null}
                <time
                  dateTime={isoDateTime(call.registeredAt)}
                  className="ml-auto text-xs whitespace-nowrap text-slate-600"
                >
                  <span className="sr-only">Registreeritud </span>
                  {formatDateTime(call.registeredAt)}
                </time>
              </div>

              <p className="min-w-0 text-slate-700">
                <Link
                  href={`/seadmed/${call.atm.atmNumber}`}
                  className={`relative z-10 rounded-sm font-medium text-blue-800 underline-offset-2 hover:underline ${focusRing}`}
                >
                  {call.atm.atmNumber}
                </Link>{" "}
                {call.atm.model}
              </p>

              <p className="flex min-w-0 items-baseline gap-1.5">
                <span className="sr-only">Rikkekood: </span>
                <CodeChip code={call.faultCode} showDescription={false} />
                {call.faultCode?.description ? (
                  <span className="truncate text-slate-700">{call.faultCode.description}</span>
                ) : null}
              </p>

              <p className="line-clamp-2 break-words text-slate-900">
                <span className="sr-only">Kirjeldus: </span>
                {call.originalDescription}
              </p>

              <div className={call.status === "HOLD" ? "rounded-md bg-amber-50 px-2 py-1.5" : ""}>
                <span className="sr-only">Viimane tehniku kommentaar: </span>
                <LatestCommentPreview
                  status={call.status}
                  latestComment={call.latestComment}
                  visitCount={call.visitCount}
                />
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
