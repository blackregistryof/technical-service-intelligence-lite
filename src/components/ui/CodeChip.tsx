import { MissingValue } from "@/components/ui/MissingValue";
import type { CodeRef } from "@/lib/domain/types";

/**
 * Fault or resolution code as a compact monospace chip, optionally followed by
 * its dictionary description. Unknown descriptions are simply not shown.
 */
export function CodeChip({
  code,
  showDescription = true,
  missingLabel = "Kood puudub",
}: {
  code: CodeRef | null;
  showDescription?: boolean;
  missingLabel?: string;
}) {
  if (!code) return <MissingValue>{missingLabel}</MissingValue>;
  return (
    <span className="inline-flex min-w-0 items-baseline gap-1.5">
      <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs whitespace-nowrap text-slate-800">
        {code.code}
      </code>
      {showDescription && code.description ? (
        <span className="truncate text-slate-900">{code.description}</span>
      ) : null}
    </span>
  );
}
