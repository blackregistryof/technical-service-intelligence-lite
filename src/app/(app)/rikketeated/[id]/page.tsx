import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge, WorkTypeBadge } from "@/components/Badges";
import { FaultCode } from "@/components/FaultCode";
import { VisitList } from "@/components/VisitList";
import { getServiceRepository } from "@/lib/dal";
import { latestTechnicianComment } from "@/lib/domain/analysis";
import type { LatestTechnicianComment } from "@/lib/domain/types";
import { formatDateTime, isoDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Rikketeade",
};

function LatestComment({ comment }: { comment: LatestTechnicianComment }) {
  if (comment.kind === "no-visits") {
    return (
      <p className="text-sm text-slate-700">
        Tehnikukülastusi ei ole registreeritud, seega tehniku kommentaar puudub.
      </p>
    );
  }
  return (
    <div className="space-y-1 text-sm">
      <p className="text-slate-600">
        Viimane tehnikukülastus:{" "}
        <time dateTime={isoDateTime(comment.visitedAt)}>{formatDateTime(comment.visitedAt)}</time>
      </p>
      {comment.kind === "comment" ? (
        <blockquote className="border-l-4 border-amber-400 pl-3 whitespace-pre-line text-slate-900">
          {comment.text}
        </blockquote>
      ) : (
        <p className="font-medium text-slate-800">
          Viimase tehnikukülastuse kommentaar puudub lähteandmetes.
        </p>
      )}
    </div>
  );
}

export default async function FaultCallDetailPage(props: PageProps<"/rikketeated/[id]">) {
  const repository = await getServiceRepository();
  const { id } = await props.params;
  const workOrder = await repository.getWorkOrder(id);
  if (!workOrder || workOrder.workType !== "FAULT_CALL") {
    notFound();
  }

  return (
    <article aria-labelledby="rikketeade-pealkiri" className="space-y-6">
      <nav aria-label="Asukoht" className="text-sm">
        <Link href="/rikketeated" className="text-blue-800 underline-offset-2 hover:underline">
          ← Rikketeated
        </Link>
      </nav>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 id="rikketeade-pealkiri" className="text-2xl font-semibold text-slate-900">
            Rikketeade {workOrder.externalId}
          </h1>
          <WorkTypeBadge workType={workOrder.workType} />
          <StatusBadge status={workOrder.status} />
        </div>
      </header>

      {workOrder.status === "HOLD" ? (
        <section
          aria-labelledby="ootel-pealkiri"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <h2 id="ootel-pealkiri" className="mb-2 text-base font-semibold text-amber-950">
            Ootel – viimane tehniku kommentaar
          </h2>
          <LatestComment comment={latestTechnicianComment(workOrder.visits)} />
        </section>
      ) : null}

      <section
        aria-labelledby="andmed-pealkiri"
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 id="andmed-pealkiri" className="mb-3 text-base font-semibold text-slate-900">
          Rikketeate andmed
        </h2>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
          <dt className="text-slate-600">Automaat</dt>
          <dd>
            <Link
              href={`/seadmed/${workOrder.atm.atmNumber}`}
              className="text-blue-800 underline-offset-2 hover:underline"
            >
              {workOrder.atm.atmNumber}
            </Link>{" "}
            <span className="text-slate-600">· mudel {workOrder.atm.model}</span>
          </dd>
          <dt className="text-slate-600">Registreeritud</dt>
          <dd>
            <time dateTime={isoDateTime(workOrder.registeredAt)}>
              {formatDateTime(workOrder.registeredAt)}
            </time>
          </dd>
          <dt className="text-slate-600">Staatus</dt>
          <dd>
            <StatusBadge status={workOrder.status} />
          </dd>
          <dt className="text-slate-600">Rikkekood</dt>
          <dd>
            <FaultCode code={workOrder.faultCode} />
          </dd>
          <dt className="text-slate-600">Algne kirjeldus</dt>
          <dd className="whitespace-pre-line text-slate-900">{workOrder.originalDescription}</dd>
          <dt className="text-slate-600">Lähtekirje</dt>
          <dd className="text-slate-700">
            <span className="font-mono">{workOrder.externalId}</span> · allikas{" "}
            <span className="font-mono">{workOrder.sourceSystem}</span>
          </dd>
        </dl>
      </section>

      <section aria-labelledby="kylastused-pealkiri" className="space-y-3">
        <h2 id="kylastused-pealkiri" className="text-base font-semibold text-slate-900">
          Tehnikukülastused ({workOrder.visits.length})
        </h2>
        <VisitList visits={workOrder.visits} />
      </section>

      <p className="text-sm">
        <Link
          href={`/seadmed/${workOrder.atm.atmNumber}#${workOrder.id}`}
          className="text-blue-800 underline-offset-2 hover:underline"
        >
          Vaata seda rikketeadet automaadi {workOrder.atm.atmNumber} tööde ajaloos
        </Link>
      </p>
    </article>
  );
}
