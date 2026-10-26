import type { WorkOrderStatus, WorkType } from "@/lib/domain/types";
import { STATUS_LABELS, WORK_TYPE_LABELS } from "@/lib/format";

const badgeBase =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  OPEN: "border-red-200 bg-red-50 text-red-800",
  HOLD: "border-amber-200 bg-amber-50 text-amber-900",
  CLOSED: "border-slate-200 bg-slate-100 text-slate-700",
};

const WORK_TYPE_STYLES: Record<WorkType, string> = {
  FAULT_CALL: "border-blue-200 bg-blue-50 text-blue-800",
  MAINTENANCE: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={`${badgeBase} ${STATUS_STYLES[status]}`}>
      <span className="sr-only">Staatus: </span>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function WorkTypeBadge({ workType }: { workType: WorkType }) {
  return (
    <span className={`${badgeBase} ${WORK_TYPE_STYLES[workType]}`}>
      <span className="sr-only">Töö liik: </span>
      {WORK_TYPE_LABELS[workType]}
    </span>
  );
}
