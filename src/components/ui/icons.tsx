// Small inline SVG icons (no icon library). Decorative only: every icon is
// paired with visible or screen-reader text, so they are hidden from assistive tech.

import type { WorkOrderStatus, WorkType } from "@/lib/domain/types";

type IconProps = { className?: string };

function Svg({ className = "h-3.5 w-3.5", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

/** Open: circle with an exclamation mark. */
export function OpenIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 4.75v3.75M8 11h.01" />
    </Svg>
  );
}

/** Hold: circle with a pause sign. */
export function HoldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="M6.5 5.75v4.5M9.5 5.75v4.5" />
    </Svg>
  );
}

/** Closed: circle with a check mark. */
export function ClosedIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.25" />
      <path d="m5.5 8.25 1.75 1.75 3.25-3.5" />
    </Svg>
  );
}

/** Fault call: warning triangle. */
export function FaultCallIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 2.25 14.25 13.5H1.75Z" />
      <path d="M8 6.5v3M8 11.5h.01" />
    </Svg>
  );
}

/** Maintenance order: wrench. */
export function MaintenanceIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.5 2.25a3.25 3.25 0 0 0-3.1 4.25L2.5 11.4a1.4 1.4 0 0 0 2 2l4.9-4.9a3.25 3.25 0 0 0 4.25-3.1l-1.9 1.9-1.75-.4-.4-1.75Z" />
    </Svg>
  );
}

/** Technician visit: person. */
export function VisitIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="5" r="2.75" />
      <path d="M2.75 14c.6-2.75 2.7-4.25 5.25-4.25s4.65 1.5 5.25 4.25" />
    </Svg>
  );
}

/** Technician comment: speech bubble. */
export function CommentIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.25 3.25h11.5v7.5H8l-3.25 2.5v-2.5h-2.5Z" />
      <path d="M5 6h6M5 8.25h4" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m3.5 8.5 3 3 6-6.5" />
    </Svg>
  );
}

/** Missing value: dashed circle. */
export function MissingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="6.25" strokeDasharray="2.5 2" />
    </Svg>
  );
}

export function StatusIcon({ status, ...props }: IconProps & { status: WorkOrderStatus }) {
  if (status === "OPEN") return <OpenIcon {...props} />;
  if (status === "HOLD") return <HoldIcon {...props} />;
  return <ClosedIcon {...props} />;
}

export function WorkTypeIcon({ workType, ...props }: IconProps & { workType: WorkType }) {
  return workType === "FAULT_CALL" ? <FaultCallIcon {...props} /> : <MaintenanceIcon {...props} />;
}
