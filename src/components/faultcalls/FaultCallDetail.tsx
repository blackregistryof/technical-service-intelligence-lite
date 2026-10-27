import Link from "next/link";
import { StatusBadge, WorkTypeBadge } from "@/components/Badges";
import { CodeChip } from "@/components/ui/CodeChip";
import { CompletenessChips } from "@/components/ui/CompletenessChips";
import { CommentIcon, MaintenanceIcon } from "@/components/ui/icons";
import { MissingValue } from "@/components/ui/MissingValue";
import { VisitItem } from "@/components/ui/VisitItem";
import { latestTechnicianComment } from "@/lib/domain/analysis";
import { describeCompleteness } from "@/lib/domain/completeness";
import type { LatestTechnicianComment, WorkOrder } from "@/lib/domain/types";
import { formatDateTime, isoDateTime } from "@/lib/format";

const linkClass =
  "rounded-sm text-blue-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/** HOLD callout: comment, missing comment or no visits — never filled in. */
function HoldComment({ comment }: { comment: LatestTechnicianComment }) {
  return (
    <section
      aria-labelledby="ootel-pealkiri"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4"
    >
      <h2
        id="ootel-pealkiri"
        className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-950"
      >
        <CommentIcon className="h-4 w-4" />
        Ootel – viimane tehniku kommentaar
      </h2>
      {comment.kind === "no-visits" ? (
        <MissingValue>Tehnikukülastusi ei ole registreeritud, seega kommentaar puudub.</MissingValue>
      ) : (
        <div className="space-y-1 text-sm">
          {comment.kind === "comment" ? (
            <blockquote className="whitespace-pre-line text-base text-slate-900">
              {comment.text}
            </blockquote>
          ) : (
            <MissingValue>Viimase tehnikukülastuse kommentaar puudub lähteandmetes.</MissingValue>
          )}
          <p className="text-slate-700">
            Viimane tehnikukülastus:{" "}
            <time dateTime={isoDateTime(comment.visitedAt)}>{formatDateTime(comment.visitedAt)}</time>
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * Full fault-call detail: identification, status, the HOLD comment callout,
 * the verbatim original description, every technician visit and the source
 * record. Presentation only; all values come from the repository.
 */
export function FaultCallDetail({
  workOrder,
  isActive,
}: {
  workOrder: WorkOrder;
  /** False for closed calls opened from device history. */
  isActive: boolean;
}) {
  const historyHref = `/seadmed/${workOrder.atm.atmNumber}#${workOrder.id}`;
  return (
    <article aria-labelledby="rikketeade-pealkiri" className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id="rikketeade-pealkiri" className="text-2xl font-semibold text-slate-900">
              Rikketeade {workOrder.externalId}
            </h1>
            <StatusBadge status={workOrder.status} showIcon />
            <WorkTypeBadge workType={workOrder.workType} showIcon />
          </div>
          <p className="text-sm text-slate-700">
            Registreeritud{" "}
            <time dateTime={isoDateTime(workOrder.registeredAt)} className="font-medium">
              {formatDateTime(workOrder.registeredAt)}
            </time>
          </p>
        </div>
        <Link
          href={`/seadmed/${workOrder.atm.atmNumber}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <MaintenanceIcon className="h-4 w-4" />
          {workOrder.atm.atmNumber} teenindusajalugu
        </Link>
      </header>

      {!isActive ? (
        <p role="note" className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          See rikketeade on suletud ega kuulu aktiivsete rikketeadete nimekirja.
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-sm sm:grid-cols-4">
        {[
          {
            label: "Automaat",
            value: (
              <Link href={`/seadmed/${workOrder.atm.atmNumber}`} className={`font-semibold ${linkClass}`}>
                {workOrder.atm.atmNumber}
              </Link>
            ),
          },
          { label: "Mudel", value: workOrder.atm.model },
          { label: "Rikkekood", value: <CodeChip code={workOrder.faultCode} showDescription={false} /> },
          { label: "Tehnikukülastusi", value: workOrder.visits.length },
        ].map(({ label, value }) => (
          <div key={label} className="min-w-0 bg-white px-3 py-2">
            <dt className="text-xs text-slate-600">{label}</dt>
            <dd className="mt-0.5 font-medium break-words text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      {workOrder.status === "HOLD" ? (
        <HoldComment comment={latestTechnicianComment(workOrder.visits)} />
      ) : null}

      <section aria-labelledby="kirjeldus-pealkiri" className="space-y-1">
        <h2 id="kirjeldus-pealkiri" className="text-sm font-semibold text-slate-700">
          Rike ja algne kirjeldus
        </h2>
        <p className="text-sm">
          <CodeChip code={workOrder.faultCode} />
        </p>
        <p className="whitespace-pre-line break-words text-base text-slate-900">
          {workOrder.originalDescription}
        </p>
      </section>

      <section
        aria-labelledby="kylastused-pealkiri"
        className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
      >
        <h2 id="kylastused-pealkiri" className="text-base font-semibold text-slate-900">
          Tehnikukülastused ({workOrder.visits.length})
        </h2>
        {workOrder.visits.length === 0 ? (
          <MissingValue>Tehnikukülastusi ei ole registreeritud.</MissingValue>
        ) : (
          <ol className="space-y-2">
            {workOrder.visits.map((visit, index) => (
              <li key={visit.id}>
                <VisitItem
                  visit={visit}
                  position={index + 1}
                  total={workOrder.visits.length}
                  isLatest={index === workOrder.visits.length - 1 && workOrder.visits.length > 1}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="info-pealkiri" className="space-y-2">
        <h2 id="info-pealkiri" className="text-sm font-semibold text-slate-700">
          Registreeritud ja puuduv info
        </h2>
        <CompletenessChips items={describeCompleteness(workOrder)} />
      </section>

      <p className="text-sm text-slate-700">
        Lähtekirje <span className="font-mono">{workOrder.externalId}</span> · allikas{" "}
        <span className="font-mono">{workOrder.sourceSystem}</span> ·{" "}
        <Link href={historyHref} className={linkClass}>
          Vaata seda rikketeadet automaadi {workOrder.atm.atmNumber} tööde ajaloos
        </Link>
      </p>
    </article>
  );
}
