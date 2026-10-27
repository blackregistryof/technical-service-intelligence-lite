import { CommentIcon } from "@/components/ui/icons";
import { MissingValue } from "@/components/ui/MissingValue";
import type { LatestTechnicianComment, WorkOrderStatus } from "@/lib/domain/types";
import { formatDateTime, isoDateTime } from "@/lib/format";

/**
 * Latest technician comment in the fault-call list. For HOLD calls it
 * distinguishes an existing comment, a missing comment and no recorded
 * visit. Long comments are shortened here; the detail page shows them in full.
 * For OPEN calls only the factual number of visits is shown.
 */
export function LatestCommentPreview({
  status,
  latestComment,
  visitCount,
}: {
  status: WorkOrderStatus;
  latestComment: LatestTechnicianComment;
  visitCount: number;
}) {
  if (status !== "HOLD") {
    return (
      <p className="text-xs text-slate-600">
        {visitCount === 0
          ? "Tehnikukülastusi pole registreeritud"
          : `${visitCount} ${visitCount === 1 ? "tehnikukülastus" : "tehnikukülastust"}`}
      </p>
    );
  }

  if (latestComment.kind === "no-visits") {
    return <MissingValue>Tehnikukülastusi pole registreeritud</MissingValue>;
  }

  const visitTime = (
    <time dateTime={isoDateTime(latestComment.visitedAt)} className="text-xs text-slate-600">
      {formatDateTime(latestComment.visitedAt)}
    </time>
  );

  if (latestComment.kind === "missing") {
    return (
      <div className="space-y-1">
        <MissingValue>Viimase külastuse kommentaar puudub</MissingValue>
        <p>{visitTime}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <CommentIcon className="mt-0.5 h-3.5 w-3.5 text-amber-800" />
      <div className="min-w-0">
        <p className="line-clamp-3 text-sm text-slate-900">{latestComment.text}</p>
        <p>{visitTime}</p>
      </div>
    </div>
  );
}
