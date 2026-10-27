import Link from "next/link";
import { StatusBadge, WorkTypeBadge } from "@/components/Badges";
import { CodeChip } from "@/components/ui/CodeChip";
import { VisitIcon, WorkTypeIcon } from "@/components/ui/icons";
import { recordLink } from "@/components/ui/styles";
import { MissingValue } from "@/components/ui/MissingValue";
import { VisitItem } from "@/components/ui/VisitItem";
import { groupByMonth, periodStartIndex } from "@/lib/domain/timeline";
import type { AnalysisPeriod, WorkOrder } from "@/lib/domain/types";
import { formatDayMonth, formatIsoDay, formatMonthKey, formatTime, isoDateTime } from "@/lib/format";

const TYPE_STYLES = {
  FAULT_CALL: { marker: "border-blue-300 bg-blue-50 text-blue-800", card: "bg-white" },
  MAINTENANCE: { marker: "border-emerald-300 bg-emerald-50 text-emerald-800", card: "bg-emerald-50/40" },
} as const;

function PeriodMarker({ period, position }: { period: AnalysisPeriod; position: "before" | "none-older" }) {
  return (
    <li role="presentation" className="py-1">
      <p
        role="note"
        className="flex items-center gap-2 text-meta font-medium text-slate-700 before:h-px before:flex-1 before:border-t before:border-dashed before:border-slate-400 after:h-px after:flex-1 after:border-t after:border-dashed after:border-slate-400"
      >
        {position === "before"
          ? `Analüüsiperioodi algus ${formatIsoDay(period.startDay)} – varasemad tööd ei kuulu ${period.days} päeva rikketeadete loendusse`
          : `Kõik kuvatud tööd on registreeritud analüüsiperioodil (alates ${formatIsoDay(period.startDay)})`}
      </p>
    </li>
  );
}

function TimelineEntry({ workOrder }: { workOrder: WorkOrder }) {
  const styles = TYPE_STYLES[workOrder.workType];
  const visits = workOrder.visits;
  return (
    <li id={workOrder.id} className="grid scroll-mt-4 grid-cols-[3rem_1.75rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[3.5rem_2rem_minmax(0,1fr)]">
      <time dateTime={isoDateTime(workOrder.registeredAt)} className="pt-2.5 text-right leading-tight">
        <span className="block text-sm font-semibold text-slate-900">{formatDayMonth(workOrder.registeredAt)}</span>
        <span className="block text-meta text-slate-600">{formatTime(workOrder.registeredAt)}</span>
      </time>
      <span className="relative flex justify-center pt-2 before:absolute before:top-0 before:bottom-[-0.75rem] before:w-px before:bg-slate-300">
        <span className={`relative flex h-7 w-7 items-center justify-center rounded-full border ${styles.marker}`}>
          <WorkTypeIcon workType={workOrder.workType} className="h-3.5 w-3.5" />
        </span>
      </span>
      <article
        aria-label={`${workOrder.workType === "FAULT_CALL" ? "Rikketeade" : "Hooldustöö"} ${workOrder.externalId}`}
        className={`min-w-0 rounded-lg border border-slate-200 p-3 shadow-sm ${styles.card}`}
      >
        {/* 1: identification and status, 2: fault code, 3: the original description (primary text). */}
        <header className="space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-base font-semibold text-slate-900">
              {workOrder.workType === "FAULT_CALL" ? (
                <Link href={`/rikketeated/${workOrder.id}`} className={recordLink}>
                  {workOrder.externalId}
                </Link>
              ) : (
                workOrder.externalId
              )}
            </h4>
            <StatusBadge status={workOrder.status} showIcon />
            <WorkTypeBadge workType={workOrder.workType} showIcon />
          </div>
          {workOrder.workType === "FAULT_CALL" ? (
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm text-slate-700">
              <span className="sr-only">Rikkekood: </span>
              <CodeChip code={workOrder.faultCode} showDescription={false} />
              {workOrder.faultCode?.description ? <span>{workOrder.faultCode.description}</span> : null}
            </p>
          ) : null}
        </header>
        <p className="mt-1.5 text-[0.9375rem] leading-6 whitespace-pre-line break-words text-slate-900">
          <span className="sr-only">Kirjeldus: </span>
          {workOrder.originalDescription}
        </p>

        <div className="mt-2.5 border-l-2 border-slate-200 pl-3">
          <h5 className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <VisitIcon className="h-3.5 w-3.5 text-slate-500" />
            Tehnikukülastused ({visits.length})
          </h5>
          {visits.length === 0 ? (
            <MissingValue>Tehnikukülastusi ei ole registreeritud</MissingValue>
          ) : (
            <ol className="space-y-2">
              {visits.map((visit, index) => (
                <li key={visit.id}>
                  <VisitItem
                    visit={visit}
                    position={index + 1}
                    total={visits.length}
                    isLatest={index === visits.length - 1 && visits.length > 1}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>
      </article>
    </li>
  );
}

/**
 * Chronological service history, newest first, grouped by calendar month in
 * Estonian time. Technician visits are shown under their parent work order,
 * never as separate timeline entries. A marker shows where the 30-day
 * analysis period starts.
 */
export function ServiceTimeline({
  workOrders,
  period,
}: {
  /** Work orders newest first (already filtered by work type if needed). */
  workOrders: WorkOrder[];
  period: AnalysisPeriod;
}) {
  const boundary = periodStartIndex(workOrders, period);
  // Position of each work order in the flat newest-first list (for the marker).
  const position = new Map(workOrders.map((w, i) => [w.id, i]));

  return (
    <div className="space-y-4">
      {groupByMonth(workOrders).map((group) => {
        const isBoundary = (w: WorkOrder) => boundary !== null && position.get(w.id) === boundary;
        // When the period starts with a new month, show the marker between the months.
        const markerBeforeMonth = isBoundary(group.items[0]);
        return (
          <section key={group.monthKey} aria-labelledby={`kuu-${group.monthKey}`}>
            {markerBeforeMonth ? (
              <ol className="mb-3">
                <PeriodMarker period={period} position="before" />
              </ol>
            ) : null}
            <h3 id={`kuu-${group.monthKey}`} className="mb-2 text-sm font-semibold text-slate-700">
              {formatMonthKey(group.monthKey)}
            </h3>
            <ol className="space-y-3">
              {group.items.map((workOrder, i) => [
                i > 0 && isBoundary(workOrder) ? (
                  <PeriodMarker key={`marker-${workOrder.id}`} period={period} position="before" />
                ) : null,
                <TimelineEntry key={workOrder.id} workOrder={workOrder} />,
              ])}
            </ol>
          </section>
        );
      })}
      {boundary === null && workOrders.length > 0 ? (
        <ol>
          <PeriodMarker period={period} position="none-older" />
        </ol>
      ) : null}
    </div>
  );
}
